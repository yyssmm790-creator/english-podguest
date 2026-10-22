import {test} from 'node:test';
import assert from 'node:assert/strict';
import {handleSpeechRequest,speechConfigured} from '../lib/speech-service.js';
import {VOICE_CATALOG} from '../public/voices.js';
import {handler as netlifySpeech} from '../netlify/functions/speech.mjs';
import {handler as voiceStatus} from '../netlify/functions/voice-status.mjs';
const env={PODGUEST_AI_KEY:'test-only-secret'};
const request=(data,extra={})=>({method:'POST',headers:{'content-type':'application/json',host:'studio.example',origin:'https://studio.example'},body:JSON.stringify(data),...extra});
const valid={voice:'nova',text:'How was your day?'};
test('common catalog is fixed across platforms and uses only supported OpenAI voice IDs',()=>{
 assert.deepEqual(VOICE_CATALOG.map(v=>v.id),['nova','shimmer','onyx','echo']);
 assert.equal(VOICE_CATALOG.filter(v=>v.gender==='female').length,2);assert.equal(VOICE_CATALOG.filter(v=>v.gender==='male').length,2);
});
test('validates configuration, origin, method, content and text before contacting provider',async()=>{
 let calls=0;const options={env,limit:false,fetchImpl:async()=>{calls++;throw new Error('unexpected');}};
 assert.equal(speechConfigured({}),false);
 assert.equal((await handleSpeechRequest(request(valid),{...options,env:{}})).status,503);
 assert.equal((await handleSpeechRequest(request(valid,{method:'GET'}),options)).status,405);
 assert.equal((await handleSpeechRequest(request(valid,{headers:{host:'studio.example',origin:'https://evil.example'}}),options)).status,403);
 assert.equal((await handleSpeechRequest(request(valid,{headers:{host:'studio.example','sec-fetch-site':'cross-site'}}),options)).status,403);
 assert.equal((await handleSpeechRequest(request(valid,{headers:{host:'studio.example','content-type':'text/plain'}}),options)).status,415);
 assert.equal((await handleSpeechRequest(request(valid,{body:'x'.repeat(16001)}),options)).status,413);
 for(const data of [null,{}, {voice:'device:Samantha',text:'hello'},{voice:'nova',text:''},{voice:'nova',text:'x'.repeat(3001)}])assert.equal((await handleSpeechRequest(request(data),options)).status,400);
 assert.equal((await handleSpeechRequest(request(valid,{body:'{' }),options)).status,400);
 assert.equal(calls,0);
});
test('forwards fixed model, voice, pacing and text; returns audio bytes without key',async()=>{
 for(const voice of VOICE_CATALOG){
  const result=await handleSpeechRequest(request({...valid,voice:voice.id}),{env,limit:false,fetchImpl:async(url,options)=>{
   assert.equal(url,'https://api.openai.com/v1/audio/speech');assert.equal(options.headers.Authorization,'Bearer '+env.PODGUEST_AI_KEY);
   const body=JSON.parse(options.body);assert.equal(body.model,'gpt-4o-mini-tts');assert.equal(body.voice,voice.id);assert.equal(body.input,valid.text);assert.equal(body.response_format,'mp3');assert.equal(body.speed,.9);assert.ok(body.instructions.includes('English beginner'));
   return new Response(new Uint8Array([73,68,51,1,2]),{headers:{'content-type':'audio/mpeg'}});
  }});
  assert.equal(result.status,200);assert.equal(result.headers['Content-Type'],'audio/mpeg');assert.deepEqual([...result.body],[73,68,51,1,2]);assert.ok(!result.body.toString().includes(env.PODGUEST_AI_KEY));
 }
});
test('contains provider failures, throttling, malformed/empty audio and timeouts',async()=>{
 for(const provider of [async()=>new Response('secret error',{status:401}),async()=>new Response('busy',{status:429}),async()=>new Response('not audio'),async()=>new Response(new Uint8Array(),{headers:{'content-type':'audio/mpeg'}}),async()=>{throw new Error('test-only-secret');}]){
  const result=await handleSpeechRequest(request(valid),{env,limit:false,fetchImpl:provider});assert.ok([429,502].includes(result.status));assert.ok(!result.body.includes('secret'));
 }
});
test('limits repeated requests before making more paid provider calls',async()=>{
 let calls=0;const options={env,fetchImpl:async()=>{calls++;return new Response('audio',{headers:{'content-type':'audio/mpeg'}});}};
 for(let i=0;i<40;i++)assert.equal((await handleSpeechRequest(request(valid,{clientIP:'rate-test'}),options)).status,200);
 assert.equal((await handleSpeechRequest(request(valid,{clientIP:'rate-test'}),options)).status,429);assert.equal(calls,40);
});
test('Netlify returns base64 audio intact and reports only configuration status',async()=>{
 const key=process.env.PODGUEST_AI_KEY,originalFetch=globalThis.fetch;
 try{
  delete process.env.PODGUEST_AI_KEY;assert.deepEqual(JSON.parse((await voiceStatus()).body),{configured:false,provider:'openai'});
  process.env.PODGUEST_AI_KEY='test-only-secret';
  globalThis.fetch=async()=>new Response(new Uint8Array([73,68,51,9]),{headers:{'content-type':'audio/mpeg'}});
  const result=await netlifySpeech({httpMethod:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(valid)});
  assert.equal(result.statusCode,200);assert.equal(result.isBase64Encoded,true);assert.deepEqual([...Buffer.from(result.body,'base64')],[73,68,51,9]);
  const rejected=await netlifySpeech({httpMethod:'POST',headers:{'content-type':'application/json'},body:'{}'});assert.equal(rejected.isBase64Encoded,false);assert.equal(rejected.statusCode,400);
  assert.deepEqual(JSON.parse((await voiceStatus()).body),{configured:true,provider:'openai'});
 }finally{globalThis.fetch=originalFetch;if(key===undefined)delete process.env.PODGUEST_AI_KEY;else process.env.PODGUEST_AI_KEY=key;}
});
