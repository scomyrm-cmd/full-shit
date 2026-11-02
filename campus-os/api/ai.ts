import type { IncomingMessage, ServerResponse } from 'node:http';
import { createCampusAIHandler } from '../server/handler';
const handler = createCampusAIHandler(process.env);
export async function handleCampusAI(request: Request): Promise<Response> { return handler(request); }
export default async function campusAI(req: IncomingMessage & { body?: unknown }, res: ServerResponse): Promise<void> {
  try {
    const method=(req.method||'GET').toUpperCase(); const headers=new Headers();
    for(const [key,value] of Object.entries(req.headers)){if(Array.isArray(value))value.forEach(v=>headers.append(key,v));else if(typeof value==='string')headers.set(key,value);}
    let body:string|undefined;
    if(!['GET','HEAD'].includes(method)){
      if(req.body!==undefined)body=typeof req.body==='string'?req.body:JSON.stringify(req.body);
      else {const chunks:Buffer[]=[];let size=0;for await(const chunk of req){const part=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);size+=part.byteLength;if(size>2097152){res.statusCode=413;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify({error:{code:'request_too_large'}}));return;}chunks.push(part);}body=Buffer.concat(chunks).toString('utf8');}
      if(body&&Buffer.byteLength(body,'utf8')>2097152){res.statusCode=413;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify({error:{code:'request_too_large'}}));return;}
    }
    const protocol=typeof req.headers['x-forwarded-proto']==='string'?req.headers['x-forwarded-proto']:'https';
    const host=typeof req.headers.host==='string'?req.headers.host:'localhost';
    const request=new Request(new URL(req.url||'/api/ai',`${protocol}://${host}`),{method,headers,...(body!==undefined?{body}:{})});
    const response=await handleCampusAI(request);res.statusCode=response.status;response.headers.forEach((v,k)=>res.setHeader(k,v));res.end(Buffer.from(await response.arrayBuffer()));
  } catch {res.statusCode=500;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify({error:{code:'server_error'}}));}
}
export const config={maxDuration:60};
