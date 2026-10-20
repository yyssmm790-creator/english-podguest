import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import net from 'node:net';
import { once } from 'node:events';
import { VOICE_CATALOG } from '../public/voices.js';

async function startServer(configured) {
 const socket=net.createServer().listen(0,'127.0.0.1');await once(socket,'listening');const port=socket.address().port;await new Promise(resolve=>socket.close(resolve));
 const stub = `globalThis.fetch=async(url, options)=>{ const text=options.body; if(text.includes('PROVIDER_FAIL'))return new Response('failure',{status:401}); if(text.includes('NOT_AUDIO'))return new Response('text',{headers:{'content-type':'text/plain'}}); return new Response(text,{headers:{'content-type':'audio/mpeg'}}); };`;
 const child=spawn(process.execPath,configured?['--import',`data:text/javascript,${encodeURIComponent(stub)}`,'server.js']:['server.js'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port),SPEECH_KEY:configured?'test-only-never-a-real-key':'',SPEECH_REGION:configured?'eastus':''},stdio:['ignore','pipe','pipe']});
 await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);child.once('exit',code=>reject(new Error(`server exited: ${code}`)));});
 return {url:`http://127.0.0.1:${port}`,close:()=>{const exited=once(child,'exit');child.kill();return exited;}};
}
test('catalog excludes unavailable Davis and retains five female and four male voices',()=>{
 assert.equal(VOICE_CATALOG.length,9);assert.equal(new Set(VOICE_CATALOG.map(v=>v.id)).size,9);
 assert.ok(!VOICE_CATALOG.some(v=>v.id==='en-US-DavisNeural'));
 assert.equal(VOICE_CATALOG.filter(v=>v.gender==='female').length,5);assert.equal(VOICE_CATALOG.filter(v=>v.gender==='male').length,4);
});
test('missing credentials report unavailable without exposing configuration',async()=>{
 const server=await startServer(false);
 try{assert.deepEqual(await (await fetch(server.url+'/api/voice-status')).json(),{configured:false});assert.equal((await fetch(server.url+'/api/speech',{method:'POST'})).status,503);}finally{await server.close();}
});
test('speech validates input, forwards selected voice, escapes SSML and contains provider failures',async()=>{
 const server=await startServer(true);
 const post=(data,extra={})=>fetch(server.url+'/api/speech',{method:'POST',headers:{'Content-Type':'application/json',...extra},body:JSON.stringify(data)});
 try{
  assert.deepEqual(await(await fetch(server.url+'/api/voice-status')).json(),{configured:true});
  for(const data of [null,{}, {voice:'en-US-DavisNeural',text:'hello'}, {voice:'unlisted',text:'hello'},{voice:VOICE_CATALOG[0].id,text:''},{voice:VOICE_CATALOG[0].id,text:'x'.repeat(3001)}])assert.equal((await post(data)).status,400);
  assert.equal((await post({voice:VOICE_CATALOG[0].id,text:'hello'},{Origin:'https://another.example'})).status,403);
  for(const voice of VOICE_CATALOG){const response=await post({voice:voice.id,text:'Hello <world> & friends'});assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'audio/mpeg');const ssml=await response.text();assert.ok(ssml.includes(`name="${voice.id}"`));assert.ok(ssml.includes('Hello &lt;world&gt; &amp; friends'));assert.ok(!ssml.includes('test-only-never-a-real-key'));}
  for(const text of ['PROVIDER_FAIL','NOT_AUDIO']){const response=await post({voice:VOICE_CATALOG[0].id,text});assert.equal(response.status,502);assert.ok(!(await response.text()).includes('test-only'));}
 }finally{await server.close();}
});
