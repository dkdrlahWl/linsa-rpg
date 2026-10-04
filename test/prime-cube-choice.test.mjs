import assert from 'node:assert/strict';
import {initialState,execute} from '../rebirth/engine.mjs';
import {CUBES} from '../rebirth/maple-cubes.mjs';
import {renderCubePanel,cubeGuide} from '../rebirth/cube-ui.mjs';
let serial=0;
const now=Date.parse('2026-10-04T15:30:00Z');
const context=random=>({now,random:()=>random,uuid:()=>`cube-fixture-${++serial}`,admin:false});
function fixture(classId,grade){
 const state=initialState(classId,'큐브검증',context(.25));
 state.hunting=false;state.materials.primeCube=3;state.materials.highCube=3;state.materials.cube=3;
 const item=state.items[0];item.grade=grade;item.potentialVersion=5;item.potentialUnlocked=true;
 item.lines=Array.from({length:3},()=>({key:'hp',value:3,grade}));
 return state;
}
assert(CUBES.primeCube.choose);
assert.deepEqual(CUBES.primeCube.up,[0,0,1,.105,.042,0]);
assert.deepEqual(CUBES.primeCube.pity,[0,0,0,42,107]);
for(const classId of ['warrior','mage','archer','rogue','pirate','priest']){
 for(const [grade,rng,resultGrade] of [[2,.99,3],[3,.99,3],[4,.99,4],[4,0,5],[5,.99,5]]){
  const original=fixture(classId,grade),id=original.items[0].id;
  const before=structuredClone(original.items[0]),gold=original.gold;
  const rolled=execute(original,'cube',{id,kind:'primeCube'},context(rng));
  const state=rolled.state,pending=structuredClone(state.pendingCube);
  assert.equal(state.materials.primeCube,2);assert.equal(state.gold,gold);
  assert.equal(pending.kind,'primeCube');assert.equal(pending.previousGrade,grade);assert.equal(pending.grade,resultGrade);
  assert.equal(state.items[0].grade,grade);assert.deepEqual(state.items[0].lines,before.lines);
  assert.equal(rolled.events.find(e=>e.type==='cube').high,true);
  assert.throws(()=>execute(state,'cube',{id,kind:'primeCube'},context(rng)),/ITEM_CUBE_PENDING/);
  const restored=execute(JSON.parse(JSON.stringify(state)),'sync',{},context(rng)).state;
  assert.deepEqual(restored.pendingCube,pending,'pending result survives reconnect');
  for(const apply of [false,true]){
   const chosen=execute(restored,'cubeChoose',{apply},context(rng)).state;
   assert.equal(chosen.pendingCube,null);assert.equal(chosen.materials.primeCube,2);
   assert.equal(chosen.items[0].grade,apply?resultGrade:grade);
   assert.deepEqual(chosen.items[0].lines,apply?pending.lines:before.lines);
   assert.throws(()=>execute(chosen,'cubeChoose',{apply},context(rng)),/NO_PENDING_CUBE/);
   const repeated=execute(chosen,'cube',{id,kind:'primeCube'},context(rng===.99?.01:.99)).state;
   assert.equal(repeated.pendingCube.kind,'primeCube');assert.equal(repeated.materials.primeCube,1);
   assert.equal(repeated.materials.highCube,3);
  }
 }
}
for(const kind of ['cube','highCube']){
 const state=fixture('warrior',3),id=state.items[0].id;
 const rolled=execute(state,'cube',{id,kind},context(.99)).state;
 assert.equal(!!rolled.pendingCube,kind==='highCube');
 assert.equal(rolled.materials[kind],2);
}
const state=fixture('warrior',4),html=renderCubePanel(state.items[0],state,'primeCube');
assert(html.includes('최소 에픽 · 이전 / 이후 선택'));assert(html.includes('등급과 옵션을 함께 선택'));
assert(!cubeGuide().includes('첫 줄 고정 없이 3줄 즉시 적용'));
console.log('PASS prime keep/apply, rank-up rejection/acceptance, one-cube cost, reconnect, repeat, six classes and unchanged red/black behavior.');
