import {handleStoryRequest} from '../../lib/story-service.js';
export async function handler(event){
 const result=await handleStoryRequest({method:event.httpMethod,headers:event.headers,body:event.isBase64Encoded?Buffer.from(event.body||'','base64').toString('utf8'):event.body||'',clientIP:event.headers?.['x-nf-client-connection-ip']||event.headers?.['client-ip']||'unknown'});
 return {statusCode:result.status,headers:result.headers,body:result.body};
}
