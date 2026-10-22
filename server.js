import http from 'node:http';
import {handleStoryRequest} from './lib/story-service.js';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {handleSpeechRequest,speechConfigured} from './lib/speech-service.js';
const root = path.resolve('public');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mp3': 'audio/mpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
http.createServer(async (req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400); return res.end(); }
  const json = (status, body) => { res.writeHead(status, {'Content-Type':'application/json','Cache-Control':'no-store'}); res.end(JSON.stringify(body)); };
  if(pathname==='/api/story'){
    let body='';
    try{for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>16000)return json(413,{error:'too_large'});}}catch{return json(400,{error:'invalid_body'});}
    const result=await handleStoryRequest({method:req.method,headers:req.headers,body,clientIP:req.socket.remoteAddress});
    res.writeHead(result.status,result.headers);return res.end(result.body);
  }
  if(pathname==='/api/voice-status' && req.method==='GET')return json(200,{configured:speechConfigured(),provider:'openai'});
  if(pathname==='/api/speech'){
    let body='';
    try{for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>16000)return json(413,{error:'too_large'});}}catch{return json(400,{error:'invalid_body'});}
    const result=await handleSpeechRequest({method:req.method,headers:req.headers,body,clientIP:req.socket.remoteAddress});
    res.writeHead(result.status,result.headers);return res.end(result.body);
  }
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + '/')) { res.writeHead(403); return res.end(); }
  try { const data = await readFile(file); res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }); res.end(data); }
  catch { res.writeHead(404); res.end('Not found'); }
}).listen(Number(process.env.PORT || 3000), '0.0.0.0', () => console.log('Podguest studio listening on port ' + (process.env.PORT || 3000)));
