import {handleSpeechRequest} from '../../lib/speech-service.js';
export async function handler(event){
 const result=await handleSpeechRequest({method:event.httpMethod,headers:event.headers,
  body:event.isBase64Encoded?Buffer.from(event.body||'','base64').toString('utf8'):event.body||'',
  clientIP:event.headers?.['x-nf-client-connection-ip']||'unknown'});
 const binary=Buffer.isBuffer(result.body);
 return {statusCode:result.status,headers:result.headers,body:binary?result.body.toString('base64'):result.body,isBase64Encoded:binary};
}
