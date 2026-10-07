import assert from 'node:assert/strict';
import {fishingStateReply,applyFishingPatch} from './fishing-sync.mjs';
const before={revision:12,state:{gold:1000,materials:{cube:2},items:Array.from({length:1000},(_,id)=>({id,level:200,lines:[{stat:4}]})),fishing:{bait:{worm:50}},obsolete:true}};
const state={...before.state,gold:800,materials:{cube:3},fishing:{bait:{worm:49}}};delete state.obsolete;
const after={revision:13,state},result={events:[{type:'fishCast'}]};
const reply=fishingStateReply(before,after,result,12,true);
assert.deepEqual(applyFishingPatch(before.state,12,reply.statePatch),state);
assert.equal(reply.statePatch.changes.items,undefined);
assert.equal(reply.result,result);
assert.ok(JSON.stringify(reply).length<JSON.stringify({...after,result}).length/50);
for(const [base,compact,next] of [[11,true,after],[null,true,after],[12,false,after],[12,true,{...after,revision:14}],[12,true,{...after,revision:12}]]){
 const fallback=fishingStateReply(before,next,result,base,compact);assert.equal(fallback.state,next.state);assert.equal(fallback.statePatch,undefined);
}
assert.throws(()=>applyFishingPatch(before.state,11,reply.statePatch),/STATE_PATCH_MISMATCH/);
console.log('PASS fishing synchronization: complete reconstruction, deleted keys, stale/concurrent/duplicate fallback, >98% payload reduction with 1000 unchanged gear items');
