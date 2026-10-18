import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {initialState,execute} from './engine.mjs';
import {TowerController} from './tower-controller.mjs';
import {fishingStateReply,applyFishingPatch} from './fishing-sync.mjs';
const ctx={now:Date.parse('2026-10-18T13:00:00+09:00'),random:()=>.7,uuid:randomUUID};
let before=initialState('warrior','전투동기화',ctx);before.hunting=false;
before=execute(before,'towerStart',{floor:1},ctx).state;
before.items.push(...Array.from({length:800},(_,id)=>({...before.items[0],id:'large-inventory-'+id})));
const run=before.battle.runId;
let after=execute(before,'towerInput',{runId:run,from:0,frames:Array.from({length:5},()=>[1,0,0])},{...ctx,now:ctx.now+500});
const reply=fishingStateReply({state:before,revision:20},{state:after.state,revision:21},{events:after.events},20,true);
assert.deepEqual(applyFishingPatch(before,20,reply.statePatch),after.state);
assert.ok(!reply.statePatch.changes.items);
assert.ok(JSON.stringify(reply).length<JSON.stringify(after).length/10);
// A retransmission with the same from offset never duplicates movement or damage.
const replay=execute(after.state,'towerInput',{runId:run,from:0,frames:Array.from({length:5},()=>[1,0,0])},{...ctx,now:ctx.now+700});
assert.equal(replay.state.battle.tick,5);assert.deepEqual(replay.state.battle.player,after.state.battle.player);
// Final frames produce a result once; retry recovers the same durable state.
const ended=structuredClone(after.state);ended.battle.enemyHp=0;ended.battle.power.attack=1e9;ended.battle.player={...ended.battle.enemy};ended.battle.attackReady=0;
const final=execute(ended,'towerInput',{runId:run,from:5,frames:[[0,0,1]]},{...ctx,now:ctx.now+1000});
assert.equal(final.state.battle,null);assert.equal(final.state.lastReward.won,true);
const again=execute(final.state,'towerInput',{runId:run,from:5,frames:[[0,0,1]]},{...ctx,now:ctx.now+1100});
assert.equal(again.state.gold,final.state.gold);assert.deepEqual(again.events,[]);
// The controller releases its pending slot after a transport failure and resends its queue.
let calls=0;const controller={b:{runId:run,ended:false},frames:[[0,0,0]],serverTick:0,retryAfter:0,failures:0,send:async()=>{if(++calls===1)throw Error('timeout');return {state:{battle:null}}},accept(){}};
await TowerController.prototype.flush.call(controller,true);assert.equal(controller.pending,false);assert.equal(controller.frames.length,1);assert.equal(controller.failures,1);
controller.retryAfter=0;await TowerController.prototype.flush.call(controller,true);assert.equal(calls,2);assert.equal(controller.pending,false);assert.equal(controller.failures,0);
console.log('PASS tower compact state, >90% smaller large-inventory replies, duplicate inputs, terminal receipt, transport retry');
