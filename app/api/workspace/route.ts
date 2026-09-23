import { env } from 'cloudflare:workers';
import { initialState } from '@/lib/demo';
import { mutate, RequestError, visibleState } from '@/lib/operations';
import type { State } from '@/lib/model';
export const dynamic='force-dynamic';
function identity(request: Request) {
  const id=request.headers.get('oai-authenticated-user-id');
  const email=request.headers.get('oai-authenticated-user-email')?.trim().toLowerCase();
  if(!id||!email)throw new RequestError('Sign in to access your business workspace.',401);
  return email;
}
async function load(email: string) {
  if(!env.DB)throw new Error('Database unavailable');
  let row=await env.DB.prepare('SELECT payload, version FROM workspace WHERE id = 1').first<{payload:string;version:number}>();
  if(!row) {
    // First authenticated visitor provisions this initially owner-private site.
    await env.DB.prepare('INSERT OR IGNORE INTO workspace (id,payload,version) VALUES (1,?,0)').bind(JSON.stringify(initialState(email))).run();
    row=await env.DB.prepare('SELECT payload, version FROM workspace WHERE id = 1').first<{payload:string;version:number}>();
  }
  if(!row)throw new Error('Workspace unavailable');
  return {state:JSON.parse(row.payload) as State,version:row.version};
}
function failure(error: unknown) {
  if(error instanceof RequestError)return Response.json({error:error.message},{status:error.status});
  console.error('Workspace request failed',error);
  return Response.json({error:'The workspace is temporarily unavailable. Please try again.'},{status:503});
}
export async function GET(request: Request) {
  try{const email=identity(request);const {state}=await load(email);return Response.json(visibleState(state,email),{headers:{'Cache-Control':'no-store'}});}catch(error){return failure(error);}
}
export async function POST(request: Request) {
  try {
    const email=identity(request);
    const origin=request.headers.get('origin');
    if(!origin||origin!==new URL(request.url).origin)throw new RequestError('Invalid request origin.',403);
    if(Number(request.headers.get('content-length')||0)>16384)throw new RequestError('Request too large.',413);
    const raw=await request.text();if(raw.length>16384)throw new RequestError('Request too large.',413);
    let input;try{input=JSON.parse(raw);}catch{throw new RequestError('Invalid request.');}
    if(!input||typeof input!=='object'||Array.isArray(input))throw new RequestError('Invalid request.');
    const {state,version}=await load(email);
    mutate(state,email,input);
    // The entire decision and wallet entry commit atomically. A concurrent writer must retry.
    const result=await env.DB!.prepare('UPDATE workspace SET payload = ?, version = version + 1 WHERE id = 1 AND version = ?').bind(JSON.stringify(state),version).run();
    if(result.meta.changes!==1)throw new RequestError('The workspace changed. Refresh and try again.',409);
    return Response.json(visibleState(state,email),{headers:{'Cache-Control':'no-store'}});
  }catch(error){return failure(error);}
}
