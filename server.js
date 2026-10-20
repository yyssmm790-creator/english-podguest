import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { VOICE_CATALOG } from './public/voices.js';
const root = path.resolve('public');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mp3': 'audio/mpeg' };
http.createServer(async (req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400); return res.end(); }
  const json = (status, body) => { res.writeHead(status, {'Content-Type':'application/json','Cache-Control':'no-store'}); res.end(JSON.stringify(body)); };
  const region = process.env.SPEECH_REGION || '';
  const configured = Boolean(process.env.SPEECH_KEY && /^[a-z0-9]+$/.test(region));
  if (pathname === '/api/voice-status' && req.method === 'GET') return json(200, {configured});
  if (pathname === '/api/speech') {
    if (req.method !== 'POST') return json(405,{error:'method_not_allowed'});
    if (req.headers['sec-fetch-site'] === 'cross-site' || (req.headers.origin && req.headers.origin !== `http://${req.headers.host}` && req.headers.origin !== `https://${req.headers.host}`)) return json(403,{error:'origin_not_allowed'});
    if (!configured) return json(503,{error:'speech_not_configured'});
    if (!req.headers['content-type']?.startsWith('application/json')) return json(415,{error:'json_required'});
    let body='';
    try { for await (const chunk of req) { body += chunk; if (Buffer.byteLength(body)>16000) return json(413,{error:'too_large'}); } }
    catch { return json(400,{error:'invalid_body'}); }
    let data; try { data=JSON.parse(body); } catch {return json(400,{error:'invalid_json'});}
    if (!data || typeof data !== 'object' || typeof data.text !== 'string' || !data.text.trim() || data.text.length>3000 || !VOICE_CATALOG.some(v=>v.id===data.voice)) return json(400,{error:'invalid_speech_request'});
    const escape = text=>text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
    try {
      const response=await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,{method:'POST',signal:AbortSignal.timeout(20000),headers:{'Ocp-Apim-Subscription-Key':process.env.SPEECH_KEY,'Content-Type':'application/ssml+xml','X-Microsoft-OutputFormat':'audio-24khz-48kbitrate-mono-mp3','User-Agent':'Podguest'},body:`<speak version="1.0" xml:lang="en-US"><voice name="${data.voice}"><prosody rate="-15%">${escape(data.text)}</prosody></voice></speak>`});
      if (!response.ok) return json(502,{error:'speech_provider_failed'});
      if (!response.headers.get('content-type')?.startsWith('audio/')) return json(502,{error:'invalid_provider_audio'});
      const audio=Buffer.from(await response.arrayBuffer());
      res.writeHead(200,{'Content-Type':'audio/mpeg','Cache-Control':'no-store'});return res.end(audio);
    }catch{return json(502,{error:'speech_provider_unavailable'});}
  }
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + '/')) { res.writeHead(403); return res.end(); }
  try { const data = await readFile(file); res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }); res.end(data); }
  catch { res.writeHead(404); res.end('Not found'); }
}).listen(Number(process.env.PORT || 3000), '0.0.0.0', () => console.log('Podguest studio listening on port ' + (process.env.PORT || 3000)));
