// Execute the actual Edge HTTP handler with mocked platform bindings, not a
// reimplementation. Hosted Deno/runtime permissions still need staging QA.
import {test} from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {initialState} from '../supabase/functions/_shared/economy.mjs';
let handler;const user=randomUUID(),sid=randomUUID(),secret='test-server-secret';let mode='ok',commits=0;
globalThis.Deno={env:{get:key=>({SUPABASE_URL:'https://test.invalid',SUPABASE_ANON_KEY:'test-public',SUPABASE_SERVICE_ROLE_KEY:secret})[key]},serve:fn=>handler=fn};
globalThis.fetch=async(url,init)=>{
 if(url.endsWith('/auth/v1/user'))return Response.json({id:user},{status:mode==='unauthorized'?401:200});
 const body=JSON.parse(init.body),name=url.split('/').at(-1);
 if(name==='ringu_economy_snapshot')return Response.json({ready:mode!=='closed',accountId:user,sessionId:sid,state:initialState(Date.now()),revision:1,enrolled:true,now:Date.now(),itemIds:[],adminFloor:0,costumePercent:0});
 if(name==='ringu_economy_commit'){commits++;assert.equal(init.headers.apikey,secret);assert.equal(body.p_user,user);if(mode==='lost')throw Error('transport disconnected after commit');return Response.json({result:{events:[]}});}
 throw Error('Unexpected RPC '+name);
};
await import('../supabase/functions/ringu-economy/index.ts');
const request=(body={command:'sync',args:{},requestId:randomUUID()},headers={})=>new Request('https://test.invalid/functions/v1/ringu-economy',{method:'POST',headers:{authorization:'Bearer fixture',origin:'https://dkdrlahwl.github.io',...headers},body:typeof body==='string'?body:JSON.stringify(body)});
test('actual HTTP handler verifies origin/auth and only supplies service key to database',async()=>{mode='ok';let r=await handler(request());assert.equal(r.status,200);assert.ok(!(await r.text()).includes(secret));r=await handler(request(undefined,{origin:'https://evil.invalid'}));assert.equal(r.status,403);mode='unauthorized';r=await handler(request());assert.equal(r.status,401);});
test('closed release and uncertain post-commit transport failure are retryable',async()=>{mode='closed';assert.equal((await handler(request())).status,503);mode='lost';const r=await handler(request());assert.equal(r.status,503);assert.equal((await r.json()).error,'SERVER_RETRY_REQUIRED');});
test('malformed JSON and injected outcomes rejected before commit',async()=>{mode='ok';const before=commits;assert.equal((await handler(request('{'))).status,400);assert.equal((await handler(request('null'))).status,400);assert.equal((await handler(request({command:'sync',args:{gold:999},requestId:randomUUID()}))).status,400);assert.equal(commits,before);});
