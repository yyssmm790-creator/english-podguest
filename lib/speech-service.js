import {VOICE_CATALOG} from '../public/voices.js';
const hits=new Map();
const json=(status,error)=>({status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify({error})});
export function speechConfigured(env=process.env){return Boolean(env.PODGUEST_AI_KEY);}
export async function handleSpeechRequest({method,headers={},body='',clientIP='unknown'},{env=process.env,fetchImpl=fetch,limit=true}={}){
 const h=Object.fromEntries(Object.entries(headers).map(([key,value])=>[key.toLowerCase(),value]));
 if(method!=='POST')return json(405,'method_not_allowed');
 const origin=h.origin,host=h['x-forwarded-host']||h.host;
 if(h['sec-fetch-site']==='cross-site' || (origin && origin!==`https://${host}` && origin!==`http://${host}`))return json(403,'origin_not_allowed');
 if(!speechConfigured(env))return json(503,'speech_not_configured');
 if(!h['content-type']?.startsWith('application/json'))return json(415,'json_required');
 if(Buffer.byteLength(body)>16000)return json(413,'too_large');
 let data;try{data=JSON.parse(body);}catch{return json(400,'invalid_json');}
 if(!data || typeof data.text!=='string' || !data.text.trim() || data.text.length>3000 || !VOICE_CATALOG.some(voice=>voice.id===data.voice))return json(400,'invalid_speech_request');
 if(limit){
  const now=Date.now();for(const [key,entry] of hits)if(entry.until<=now)hits.delete(key);
  const entry=hits.get(clientIP)||{count:0,until:now+600000};
  if(entry.count>=40 || (!hits.has(clientIP) && hits.size>=2000))return json(429,'speech_busy');
  entry.count++;hits.set(clientIP,entry);
 }
 try{
  const response=await fetchImpl('https://api.openai.com/v1/audio/speech',{
   method:'POST',signal:AbortSignal.timeout(25000),headers:{Authorization:`Bearer ${env.PODGUEST_AI_KEY}`,'Content-Type':'application/json'},
   body:JSON.stringify({model:'gpt-4o-mini-tts',voice:data.voice,input:data.text.trim(),response_format:'mp3',speed:.9,
    instructions:'Speak English clearly and warmly, like a calm supportive friend. Use a natural conversational voice and gentle pacing for an adult English beginner. Read only the supplied text; do not add words.'})
  });
  if(!response.ok)return json(response.status===429?429:502,response.status===429?'speech_busy':'speech_provider_failed');
  if(!response.headers.get('content-type')?.startsWith('audio/'))return json(502,'invalid_provider_audio');
  const bytes=Buffer.from(await response.arrayBuffer());
  if(!bytes.length || bytes.length>8000000)return json(502,'invalid_provider_audio');
  return {status:200,headers:{'Content-Type':'audio/mpeg','Cache-Control':'no-store'},body:bytes};
 }catch{return json(502,'speech_provider_unavailable');}
}
