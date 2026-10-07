// Exercise the real HTTP handler without credentials or network writes.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {fishingView} from './fishing-ui.mjs';
import {lottoView} from './lotto-ui.mjs';
let handler,user,calls=[];
globalThis.Deno={env:{get:()=> 'local-test'},serve:fn=>{handler=fn;}};
const originalFetch=globalThis.fetch;
globalThis.fetch=async(url,options)=>{
 calls.push(String(url));
 if(String(url).endsWith('/auth/v1/user'))return Response.json(user);
 assert.ok(String(url).endsWith('/rebirth_snapshot'));
 return Response.json({user:'test',session:'local',state:{isAdmin:true},revision:1,receipt:{fingerprint:{command:'fishCast',args:{}},result:{events:[]}}});
};
try{
 await import('./edge.ts');
 const commands=['fishCast','fishFinish','fishCancel','fishBaitBuy','fishTrain','fishUpgrade','fishSell','fishAquariumAdd','fishAquariumRemove','fishAquariumClaim','fishAquariumExpand','fishQuestClaim'];
 for(const command of commands){
  for(const flag of [false,undefined,'true',1]){
   user={id:'test',app_metadata:{ringu_admin:flag},user_metadata:{ringu_admin:true}};calls=[];
   const response=await handler(new Request('http://local',{method:'POST',headers:{Authorization:'Bearer local'},body:JSON.stringify({command,args:{isAdmin:true,admin:true},requestId:randomUUID()})}));
   assert.equal(response.status,403);assert.deepEqual(await response.json(),{error:'FISHING_ADMIN_ONLY'});
   assert.equal(calls.length,1);assert.ok(calls[0].endsWith('/auth/v1/user'));
  }
 }
 user={id:'test',app_metadata:{ringu_admin:true}};calls=[];
 const allowed=await handler(new Request('http://local',{method:'POST',headers:{Authorization:'Bearer local'},body:JSON.stringify({command:'fishCast',args:{},requestId:randomUUID()})}));
 assert.equal(allowed.status,200);assert.equal(calls.length,2);
 const locked=fishingView({isAdmin:false,gold:0});assert.match(locked,/관리자 전용 낚시/);assert.doesNotMatch(locked,/data-action="fishCast"|fishing-scene-art/);assert.match(locked,/주간 로또/);
 assert.doesNotMatch(lottoView({isAdmin:false,gold:0},null),/data-arg="fishing"/);
 assert.match(lottoView({isAdmin:true,gold:0},null),/data-arg="fishing"/);
 console.log('PASS HTTP authorization: all fishing commands denied before snapshots/receipts; app metadata required; admin allowed; regular UI locked and lottery available');
}finally{globalThis.fetch=originalFetch;delete globalThis.Deno;}
