// Exercise the real HTTP handler without credentials or network writes.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {fishingView} from './fishing-ui.mjs';
import {lottoView} from './lotto-ui.mjs';
import {initialState} from './engine.mjs';
import {applyFishingPatch} from './fishing-sync.mjs';
let handler,user,calls=[],fingerprint,freshState=null,committed=null;
globalThis.Deno={env:{get:()=> 'local-test'},serve:fn=>{handler=fn;}};
const originalFetch=globalThis.fetch;
globalThis.fetch=async(url,options)=>{
 calls.push(String(url));
 if(String(url).endsWith('/auth/v1/user'))return user?Response.json(user):Response.json({error:'invalid token'},{status:401});
 if(freshState){
  if(String(url).endsWith('/rebirth_commit')){committed=JSON.parse(options.body);return Response.json(committed.p_result);}
  assert.ok(String(url).endsWith('/rebirth_snapshot'));
  return Response.json({user:'test',session:'local',epoch:'local',now:Date.now(),state:committed?.p_state||freshState,revision:committed?8:7});
 }
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
 user={id:'test',app_metadata:{ringu_admin:false}};
 freshState=initialState('warrior','낚시',{now:Date.now(),uuid:randomUUID,random:()=>.5});freshState.hunting=false;
 const before=structuredClone(freshState),body={command:'fishCast',args:{spot:'brook',bait:'worm',protocol:3,_compact:true,_stateRevision:7},requestId:randomUUID()};
 const compactResponse=await handler(new Request('http://local',{method:'POST',headers:{Authorization:'Bearer local'},body:JSON.stringify(body)}));
 assert.equal(compactResponse.status,200);const compact=await compactResponse.json();
 assert.deepEqual(applyFishingPatch(before,7,compact.statePatch),committed.p_state);assert.equal(compact.revision,8);assert.equal(compact.result.events[0].type,'fishCast');
 freshState=null;committed=null;
 user=null;calls=[];
 const denied=await handler(new Request('http://local',{method:'POST',headers:{Authorization:'Bearer invalid'},body:JSON.stringify({command:'fishCast',args:{protocol:3},requestId:randomUUID()})}));
 assert.equal(denied.status,401);assert.deepEqual(await denied.json(),{error:'LOGIN_REQUIRED'});assert.equal(calls.length,1);
 const open=fishingView({isAdmin:false,gold:0});assert.doesNotMatch(open,/관리자 전용 낚시/);assert.match(open,/data-action="fishCast"/);assert.match(open,/fishing-scene-art/);
 assert.match(lottoView({isAdmin:false,gold:0},null),/data-arg="fishing"/);
 console.log('PASS HTTP access: regular and admin accounts allowed, invalid login rejected before snapshot, fishing and lottery navigation open');
}finally{globalThis.fetch=originalFetch;delete globalThis.Deno;}
