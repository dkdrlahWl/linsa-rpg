import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {CUBES,cubeUpgrade,cubeTable,rerollCube,rollCubeLine} from './maple-cubes.mjs';
import {initialState,execute} from './engine.mjs';
import {renderCubePanel,cubeOdds} from './cube-ui.mjs';
let seed=177;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32),ctx=(rng=random)=>({now:0,random:rng,uuid:randomUUID});
const fixture=(grade=2)=>{const s=initialState('warrior','공통큐브',ctx());s.hunting=false;for(const k of Object.keys(CUBES))s.materials[k]=100;const it=s.items[0];it.grade=grade;it.potentialVersion=5;it.potentialUnlocked=true;it.lines=[{key:'DEX',value:3,grade},{key:'INT',value:3,grade},{key:'LUK',value:3,grade}];return s;};
for(const kind of Object.keys(CUBES))for(let g=2;g<=5;g++){
 const ref=cubeTable(kind,{slot:0,level:200,grade:g});
 for(let slot=0;slot<9;slot++)for(const level of [1,10,20,30,40,60,100,150,200])for(const classId of ['warrior','mage','archer','rogue','pirate']){
  const it={slot,level,classId,grade:g,lines:fixture(g).items[0].lines};assert.deepEqual(cubeTable(kind,it),ref);
  for(let row=0;row<3;row++)assert.equal(rollCubeLine(kind,it,g,row,random).grade,g);
 }
 const expected=Math.max(kind==='primeCube'?3:2,g),it=fixture(g).items[0],lines=rerollCube(kind,it,expected,random);
 assert.ok(lines.every(l=>l.grade===expected));
 for(const pool of ref.rows)assert.ok(Math.abs(pool.current.reduce((n,o)=>n+o.weight,0)-1)<1e-12);
 assert.deepEqual(ref.rows[0].current,ref.rows[1].current);assert.deepEqual(ref.rows[1].current,ref.rows[2].current);
}
for(const [k,c]of Object.entries(CUBES))for(const g of [2,3,4]){
 if(k==='primeCube'&&g===2){assert.equal(cubeUpgrade({},k,g,()=>.999999),3);continue;}
 assert.equal(cubeUpgrade({},k,g,()=>c.up[g]-1e-10),g+1);assert.equal(cubeUpgrade({},k,g,()=>c.up[g]),g);
 const s={cubePity:{[k+':'+g]:c.pity[g]-1}};assert.equal(cubeUpgrade(s,k,g,()=>.99999),g);assert.equal(cubeUpgrade(s,k,g,()=>.99999),g+1);
}
for(const kind of Object.keys(CUBES)){
 let s=fixture(2),before=structuredClone(s);const next=execute(s,'cube',{id:s.items[0].id,kind},ctx(()=>0)).state;
 assert.deepEqual(s,before);assert.equal(next.materials[kind],99);
 if(kind==='highCube'){
  assert.deepEqual(next.items[0].lines,s.items[0].lines);assert.ok(next.pendingCube.lines.every(l=>l.grade===3));
  const kept=execute(next,'cubeChoose',{apply:false},ctx()).state;assert.deepEqual(kept.items[0].lines,s.items[0].lines);
  const applied=execute(next,'cubeChoose',{apply:true},ctx()).state;assert.ok(applied.items[0].lines.every(l=>l.grade===3));
 }else{assert.equal(next.items[0].grade,3);assert.ok(next.items[0].lines.every(l=>l.grade===3));}
 assert.doesNotMatch(renderCubePanel(next.items[0],next,kind,null),/undefined|NaN|첫 줄 고정/);
}
// Even level-one, non-weapon gear can roll STR 12% in every legendary line.
for(const kind of Object.keys(CUBES))for(const slot of [0,8]){
 const s=fixture(5),it=s.items[0];it.level=1;it.slot=slot;const r=execute(s,'cube',{id:it.id,kind},ctx(()=>0)).state;
 const lines=r.pendingCube?.lines??r.items[0].lines;assert.deepEqual(lines,Array.from({length:3},()=>({key:'STR',value:12,grade:5})));
}
const s=fixture(5);s.items[0].lines=Array.from({length:3},()=>({key:'STR',value:12,grade:5}));const before=structuredClone(s);
assert.throws(()=>execute(s,'cube',{id:s.items[0].id,kind:'primeCube'},ctx(()=>0)),/CUBE_RANDOM_RETRY/);assert.deepEqual(s,before);
assert.match(cubeOdds('primeCube',fixture(3).items[0]),/3줄 공통/);
console.log('PASS universal pools across level/job/slot, all three same-grade lines, prime Epic guarantee and Legendary upgrade boundaries/pity, triple STR12 on all equipment, black choices, unchanged input and failed-roll atomicity.');
