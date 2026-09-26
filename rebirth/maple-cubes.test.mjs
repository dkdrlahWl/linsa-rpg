import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {initialState,execute,power} from './engine.mjs';
import {normalizePotentialItem,normalizePotentialState,gearAttributes,OPTIONS} from './data.mjs';
import {CUBES,cubeUpgrade,cubeTable,cubeLineRates,rerollCube,rollCubeLine} from './maple-cubes.mjs';
import {renderCubePanel} from './cube-ui.mjs';
let seed=1234567;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
const ctx=(rng=random)=>({now:0,random:rng,uuid:randomUUID});
function fixture(grade=2){const s=initialState('mage','큐브검증',ctx());s.hunting=false;s.gold=1e7;for(const k of Object.keys(CUBES))s.materials[k]=20;s.items[0].potentialUnlocked=true;s.items[0].level=200;s.items[0].grade=grade;s.items[0].lines=[{key:'INT',value:6,grade},{key:'STR',value:3,grade:grade-1},{key:'flatHP',value:100,grade:grade-1}];return s;}
for(const[k,c]of Object.entries(CUBES))for(let g=2;g<c.maxGrade;g++){
 if(c.prime)continue;assert.equal(cubeUpgrade({},k,g,()=>c.up[g]-1e-12),g+1);assert.equal(cubeUpgrade({},k,g,()=>c.up[g]),g);
 if(c.pity[g]){const s={cubePity:{[k+':'+g]:c.pity[g]-1}};assert.equal(cubeUpgrade(s,k,g,()=>.999),g);assert.equal(cubeUpgrade(s,k,g,()=>.999),g+1);assert.equal(s.cubePity[k+':'+g],0);}
}
for(const[k,c]of Object.entries(CUBES))for(let g=c.prime?5:2;g<=c.maxGrade;g++)for(let slot=0;slot<9;slot++)for(const level of [1,10,30,70,110,120,200]){
 const it={grade:g,slot,level,lines:fixture(g).items[0].lines};
 const {rows}=cubeTable(k,it);
 for(const pool of rows)for(const values of Object.values(pool)){assert.ok(Math.abs(values.reduce((n,r)=>n+r.weight,0)-1)<1e-10);for(const l of values){assert.ok(Object.hasOwn(OPTIONS,l.key));assert.ok(l.value>0);}}
 const lines=rerollCube(k,it,g,random);
 assert.equal(lines.length,3);assert.equal(lines[0].grade,g);
 for(const l of lines.slice(1))assert.ok(l.grade===g||l.grade===g-1);
 assert.ok(lines.every(l=>l.grade===g));
}
for(const [k,c]of Object.entries(CUBES)){
 let s=fixture(c.prime?5:2),before=structuredClone(s);
 const result=execute(s,'cube',{id:s.items[0].id,kind:k},ctx(()=>.5)).state;
 assert.deepEqual(s,before);assert.equal(result.materials[k],19);
 if(c.choose){assert.ok(result.pendingCube);assert.deepEqual(result.items[0].lines,s.items[0].lines);
  assert.throws(()=>execute(result,'cube',{id:s.items[0].id,kind:k},ctx()),/ITEM_CUBE_PENDING/);
  const kept=execute(result,'cubeChoose',{apply:false},ctx()).state;assert.deepEqual(kept.items[0].lines,s.items[0].lines);assert.equal(kept.items[0].grade,s.items[0].grade);
  const applied=execute(result,'cubeChoose',{apply:true},ctx()).state;assert.deepEqual(applied.items[0].lines,result.pendingCube.lines);assert.equal(applied.items[0].grade,result.pendingCube.grade);
  assert.equal(applied.materials[k],19);
  assert.deepEqual(execute(result,'sync',{},ctx()).state.pendingCube,result.pendingCube);
 }else assert.equal(result.pendingCube,null);
 assert.doesNotMatch(renderCubePanel(result.items[0],result,k,null),/undefined|NaN/);
}
// Whole-item upgrade: old black-cube result stays unchanged until accepted.
let s=fixture(2);let r=execute(s,'cube',{id:s.items[0].id,kind:'highCube'},ctx(()=>0)).state;
assert.equal(r.items[0].grade,2);assert.equal(r.pendingCube.grade,3);
assert.deepEqual(r.pendingCube.lines.map(l=>l.grade),[3,3,3]);
for(const flag of ['locked','broken']){let t=fixture();t.items[0][flag]=true;assert.throws(()=>execute(t,'cube',{id:t.items[0].id},ctx()),/ITEM_PROTECTED/);}
s=fixture();s.materials.cube=0;assert.throws(()=>execute(s,'cube',{id:s.items[0].id},ctx()),/INSUFFICIENT_CUBE/);
s=fixture(5);assert.throws(()=>execute(s,'cube',{id:s.items[0].id,kind:'strangeCube'},ctx()),/INVALID_CUBE/);
s=fixture(2);const prime=execute(s,'cube',{id:s.items[0].id,kind:'primeCube'},ctx()).state;assert.equal(prime.items[0].grade,3);assert.ok(prime.items[0].lines.every(l=>l.grade===3));
assert.throws(()=>execute(s,'cube',{id:s.items[0].id,kind:'__proto__'},ctx()),/INVALID_CUBE/);
assert.throws(()=>execute(s,'qualityReroll',{id:s.items[0].id},ctx()));
for(const q of [0,50,100])for(const boss of [false,true])for(const stars of [0,10,25]){
 const item={level:100,slot:0,boss,quality:q,stars,grade:4,potentialVersion:3,lines:[{key:'INT',value:9,grade:4}]};
 const before=gearAttributes(item),after=normalizePotentialItem(structuredClone(item));assert.ok(!Object.hasOwn(after,'quality'));
 const actual=gearAttributes(after);for(const k of Object.keys(actual))assert.ok(Math.abs(actual[k]-before[k])<1e-9,k);
 assert.deepEqual(normalizePotentialItem(structuredClone(after)),after);
}
s=fixture();s.items[0].potentialVersion=3;s.items[0].lines[1].grade=5;s.mailbox=[{item:structuredClone(s.items[0])}];normalizePotentialState(s);
assert.equal(s.items[0].grade,5);assert.equal(s.mailbox[0].item.grade,5);assert.deepEqual(normalizePotentialState(structuredClone(s)),s);
s=fixture();s.items[0].lines=[{key:'flatAttack',value:32,grade:5}];const boosted=power(s);s.items[0].lines=[];assert.ok(boosted.attack>power(s).attack);
console.log('PASS: all cube/grade/slot/level pools; rate boundaries; pity; choices; prime upgrade; migration; atomic failures; supported effects; UI output.');

