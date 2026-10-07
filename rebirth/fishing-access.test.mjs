// Exercise the real HTTP handler without credentials or network writes.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {fishingView} from './fishing-ui.mjs';
import {lottoView} from './lotto-ui.mjs';
let handler,user,calls=[],fingerprint;
globalThis.Deno={env:{get:()=> 'local-test'},serve:fn=>{handler=fn;}};
const originalFetch=globalThis.fetch;
globalThis.fetch=async(url,options)=>{
 calls.push(String(url));
 if(String(url).endsWith('/auth/v1/user'))return user?Response.json(user):Response.json({error:'invalid token'},{status:401});
 assert.ok(String(url).endsWith('/rebirth_snapshot'));
 return Response.json({user:'test',session:'local',state:{isAdmin:true},revision:1,receipt:{fingerprint,result:{events:[]}}});
};
try{
 await import('./edge.ts');
 const commands=['fishCast','fishHook','fishFinish','fishCancel','fishBaitBuy','fishTrain','fishUpgrade','fishSell','fishAquariumAdd','fishAquariumRemove','fishAquariumClaim','fishAquariumExpand','fishQuestClaim'];
 for(const command of commands){
  for(const flag of [false,undefined,'true',1,true]){
   user={id:'test',app_metadata:{ringu_admin:flag}};calls=[];
   fingerprint={command,args:{protocol:3}};
   const response=await handler(new Request('http://local',{method:'POST',headers:{Authorization:'Bearer local'},body:JSON.stringify({...fingerprint,requestId:randomUUID()})}));
   assert.equal(response.status,200);assert.equal(calls.length,2);
  }
 }
 user=null;calls=[];
 const denied=await handler(new Request('http://local',{method:'POST',headers:{Authorization:'Bearer invalid'},body:JSON.stringify({command:'fishCast',args:{protocol:3},requestId:randomUUID()})}));
 assert.equal(denied.status,401);assert.deepEqual(await denied.json(),{error:'LOGIN_REQUIRED'});assert.equal(calls.length,1);
 const open=fishingView({isAdmin:false,gold:0});assert.doesNotMatch(open,/관리자 전용 낚시/);assert.match(open,/data-action="fishCast"/);assert.match(open,/fishing-scene-art/);
 assert.match(lottoView({isAdmin:false,gold:0},null),/data-arg="fishing"/);
 console.log('PASS HTTP access: regular and admin accounts allowed, invalid login rejected before snapshot, fishing and lottery navigation open');
}finally{globalThis.fetch=originalFetch;delete globalThis.Deno;}
