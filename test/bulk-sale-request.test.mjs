// SG1: execute the actual Edge HTTP handler; remote Auth/RPCs are synthetic.
import {test} from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {initialState,balance} from '../supabase/functions/_shared/economy.mjs';
import {readEconomyRequest,MAX_SELL_REQUEST_BYTES} from '../supabase/functions/_shared/request-body.mjs';
let handler,state,revision,commits,snapshots,failResponse=false;const receipts=new Map(),user=randomUUID(),sid=randomUUID();
const seed=n=>{state=initialState(Date.now());state.autoBattle=false;state.gold=100000;state.inventory=Array.from({length:n},(_,i)=>({...balance.gear[0],id:Number.MAX_SAFE_INTEGER-i,enhance:i%16,transcend:0,optionRolls:[1,1]}));revision=1;commits=0;snapshots=0;receipts.clear();return state.inventory.map(it=>it.id);};
globalThis.Deno={env:{get:k=>({SUPABASE_URL:'https://sg1.invalid',SUPABASE_ANON_KEY:'fixture-public',SUPABASE_SERVICE_ROLE_KEY:'fixture-secret'})[k]},serve:f=>handler=f};
globalThis.fetch=async(url,init)=>{
 if(url.endsWith('/auth/v1/user'))return Response.json({id:user});
 const args=JSON.parse(init.body),name=url.split('/').at(-1);
 if(name==='ringu_economy_snapshot'){snapshots++;return Response.json({state,revision,now:Date.now(),ready:true,enrolled:true,accountId:user,sessionId:sid,itemIds:[],adminFloor:0,costumePercent:0,receipt:receipts.get(args.p_request_id)?.result});}
 if(name==='ringu_daily_boss')return Response.json({now:Date.now(),remaining:3,total:0,ranking:[]});
 if(name==='ringu_economy_commit'){
  const old=receipts.get(args.p_request_id);if(old){assert.deepEqual(args.p_fingerprint,old.fingerprint);return Response.json({result:old.result});}
  assert.equal(args.p_revision,revision);assert.equal(init.headers.apikey,'fixture-secret');state=args.p_state;revision++;commits++;receipts.set(args.p_request_id,{fingerprint:args.p_fingerprint,result:args.p_result});
  if(failResponse){failResponse=false;throw Error('simulated lost response after commit');}return Response.json({result:args.p_result});
 }
 throw Error('Unexpected RPC');
};
await import('../supabase/functions/ringu-economy/index.ts');
const req=(args,command='dismantle',requestId=randomUUID(),tail='')=>new Request('https://sg1.invalid',{method:'POST',headers:{Authorization:'Bearer fixture',Origin:'https://dkdrlahwl.github.io'},body:JSON.stringify({command,args,requestId})+tail});
test('1,137 and 10,000 long IDs exceed old 16k cap but now dismantle atomically without gold',async()=>{
 for(const n of [1137,10000]){const ids=seed(n),gain=state.inventory.reduce((sum,it)=>sum+balance.sellPrices[it.rarity][it.enhance],0);const r=req({ids});assert.ok((await r.clone().text()).length>16000);const response=await handler(r);assert.equal(response.status,200);const result=await response.json();assert.equal(result.state.inventory.length,0);assert.equal(result.state.gold,100000);assert.equal(commits,1);assert.equal(result.result.events.find(e=>e.type==='dismantle').count,n);}
});
test('locked/equipped/foreign/duplicate/unsafe IDs reject without selling any item',async()=>{
 for(const mode of ['locked','equipped','foreign','duplicate','unsafe']){let ids=seed(1137);if(mode==='locked')state.inventory[1000].locked=true;if(mode==='equipped')state.equipped['무기']=ids[1000];if(mode==='foreign')ids[1000]=123;if(mode==='duplicate')ids[1000]=ids[0];if(mode==='unsafe')ids[1000]=Number.MAX_SAFE_INTEGER+1;const before=structuredClone(state),r=await handler(req({ids}));assert.equal(r.status,400,mode);assert.equal(commits,0);assert.deepEqual(state,before);}
});
test('retry with same receipt after lost post-commit response cannot duplicate payout',async()=>{
 const ids=seed(1137),id=randomUUID();failResponse=true;assert.equal((await handler(req({ids},'sell',id))).status,503);const paid=structuredClone(state);assert.equal((await handler(req({ids},'sell',id))).status,200);assert.deepEqual(state,paid);assert.equal(commits,1);
});
test('non-sale body limit, 10,000-item cap, malformed body and total byte cap remain enforced',async()=>{
 seed(1);assert.equal((await handler(req({},'sync',randomUUID(),' '.repeat(16000)))).status,413);
 assert.equal((await handler(req({ids:Array(10001).fill(1)}))).status,400);
 assert.equal((await handler(req({ids:[1]},'sell',randomUUID(),' '.repeat(MAX_SELL_REQUEST_BYTES)))).status,413);
 assert.equal(snapshots,0);assert.equal(commits,0);
 const bad=new Request('https://sg1.invalid',{method:'POST',body:'null'});assert.equal((await readEconomyRequest(bad)).status,400);
 let canceled=false;const stream=new ReadableStream({pull(c){c.enqueue(new Uint8Array(70000));},cancel(){canceled=true;}});
 const huge=new Request('https://sg1.invalid',{method:'POST',body:stream,duplex:'half'});assert.equal((await readEconomyRequest(huge)).status,413);assert.ok(canceled);
});
test('authentication and origin restrictions remain before all economic writes',async()=>{
 seed(1);const noAuth=new Request('https://sg1.invalid',{method:'POST',body:'{}'});assert.equal((await handler(noAuth)).status,401);const foreign=req({ids:[1]});foreign.headers.set('Origin','https://other.invalid');assert.equal((await handler(foreign)).status,403);assert.equal(commits,0);assert.equal(snapshots,0);
});
