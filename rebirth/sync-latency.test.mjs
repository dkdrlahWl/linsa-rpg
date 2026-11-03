// node rebirth/sync-latency.test.mjs — 2026-11-03 연결 지연 개선
// 1) commit이 우리 결과를 저장하면 상태를 다시 읽지 않는다(스냅샷 1번 → RPC 2번).
// 2) sync도 _compact면 바뀐 부분만 보낸다.
// 3) commit이 다른 결과(재전송 영수증)를 돌려주면 예전처럼 스냅샷을 다시 읽는다.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {initialState} from './engine.mjs';
import {applyFishingPatch} from './fishing-sync.mjs';
let handler,calls=[],state,committed=null,replay=null;
globalThis.Deno={env:{get:()=> 'local-test'},serve:fn=>{handler=fn;}};
globalThis.fetch=async(url,options)=>{
 const u=String(url);calls.push(u.split('/').pop());
 if(u.endsWith('/auth/v1/user'))return Response.json({id:'test',app_metadata:{}});
 if(u.endsWith('/rebirth_commit')){committed=JSON.parse(options.body);return Response.json(replay||committed.p_result);}
 if(u.endsWith('/rebirth_snapshot'))return Response.json({user:'test',session:'local',epoch:'local',now:Date.now(),state:committed?.p_state||state,revision:committed?8:7});
 throw new Error('unexpected '+u);
};
await import('./edge.ts');
const post=async body=>{calls=[];const r=await handler(new Request('http://local',{method:'POST',headers:{Authorization:'Bearer local'},body:JSON.stringify({...body,requestId:randomUUID()})}));assert.equal(r.status,200);return r.json();};
state=initialState('warrior','동기화',{now:Date.now()-60000,uuid:randomUUID,random:()=>.5});state.lastAt=Date.now()-60000;
// 일반 sync: 스냅샷 1 + 커밋 1, 전체 상태
let res=await post({command:'sync',args:{}});
assert.deepEqual(calls,['user','rebirth_snapshot','rebirth_commit']);assert.equal(res.revision,8);assert.deepEqual(res.state,committed.p_state);
// compact sync: 바뀐 부분만
committed=null;const before=structuredClone(state);
res=await post({command:'sync',args:{_compact:true,_stateRevision:7}});
assert.deepEqual(calls,['user','rebirth_snapshot','rebirth_commit']);assert.ok(res.statePatch&&!res.state);
assert.deepEqual(applyFishingPatch(before,7,res.statePatch),committed.p_state);assert.equal(res.revision,8);
assert.ok(JSON.stringify(res).length<JSON.stringify(committed.p_state).length,'patch smaller than full state');
// 재전송 영수증(다른 결과)이면 스냅샷을 다시 읽음
committed=null;replay={events:[{type:'old'}]};
res=await post({command:'lock',args:{id:state.items[0].id}});
assert.deepEqual(calls,['user','rebirth_snapshot','rebirth_commit','rebirth_snapshot']);assert.equal(res.result.events[0].type,'old');
console.log('PASS sync latency: no post-commit snapshot, compact sync, replay fallback');
