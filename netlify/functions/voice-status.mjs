import {speechConfigured} from '../../lib/speech-service.js';
export async function handler(){return {statusCode:200,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify({configured:speechConfigured(),provider:'openai'})};}
