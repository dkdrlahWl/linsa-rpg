import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {initialState,execute,power,makeLootItem,addItem} from './engine.mjs';
import {ADD_CUBE,additionalPool,rollAdditionalLines} from './additional-potential.mjs';
import {UNIVERSAL_POOLS} from './universal-cube-pools.mjs';
import {shopConsumable,consumableCommand} from './consumables.mjs';
import {MATERIALS} from './data.mjs';

// Values: one tenth of the main pool; flat options rounded to whole numbers; same weights.
for(const g of [2,3,4,5]){
 const main=UNIVERSAL_POOLS[g],add=additionalPool(g);assert.equal(add.length,main.length);
 add.forEach((row,i)=>{const m=main[i];assert.equal(row.key,m.key);assert.equal(row.weight,m.weight);
  assert.equal(row.value,m.key.startsWith('flat')?Math.max(1,Math.round(m.value/10)):Math.round(m.value*10)/100);
  if(m.key.startsWith('flat'))assert.ok(Number.isInteger(row.value));});
}
const leg=Object.fromEntries(additionalPool(5).map(r=>[r.key,r.value]));
assert.equal(leg.attack,1.2);assert.equal(leg.boss,3.5);assert.equal(leg.STR,1.2);assert.equal(leg.flatAttack,3);
assert.equal(Object.fromEntries(additionalPool(2).map(r=>[r.key,r.value])).flatSTR,1);
assert.deepEqual({...ADD_CUBE.up},{2:.03,3:.01,4:.005});
assert.equal(MATERIALS.addCube,'에디셔널 큐브');
assert.equal(shopConsumable('addCube').price,1000000);

const seq=values=>{let i=0;return ()=>values[i++%values.length];};
const ctx=(random=Math.random)=>({now:Date.now(),uuid:randomUUID,random,accountId:'t'});
let s=initialState('warrior','에디테스트',ctx());s.hunting=false;
const it=makeLootItem(200,'warrior',0,true,ctx(),undefined,true);it.lines=[0,1,2].map(()=>({key:'attack',value:12,grade:5}));it.grade=5;it.potentialUnlocked=true;it.potentialVersion=5;addItem(s,it);
s.equipped={0:it.id};s.materials.scroll=5;s.gold=5_000_000;

// Unlock: 10% chance, consumes a scroll either way.
assert.throws(()=>execute(s,'addCube',{id:it.id},ctx()),/POTENTIAL_ADDITIONAL_REQUIRED/);
let r=execute(s,'additionalUnlock',{id:it.id},ctx(()=>.5));assert.equal(r.state.materials.scroll,4);assert.ok(!r.state.items.find(x=>x.id===it.id).addLines);
r=execute(r.state,'additionalUnlock',{id:it.id},ctx(()=>.05));s=r.state;
const opened=s.items.find(x=>x.id===it.id);assert.equal(opened.addGrade,2);assert.equal(opened.addLines.length,3);assert.ok(opened.addLines.every(l=>l.additional&&l.grade===2));
assert.throws(()=>execute(s,'additionalUnlock',{id:it.id},ctx()),/POTENTIAL_ADDITIONAL_OPEN/);

// Shop: buy cubes for 1,000,000 G each.
s=execute(s,'consumableBuy',{id:'addCube',quantity:3},ctx()).state;assert.equal(s.materials.addCube,3);assert.equal(s.gold,2_000_000);

// Cube: rolls into a pending choice; keep or apply. Grade-up at exactly the boundary.
const before=JSON.stringify(opened.addLines);
s=execute(s,'addCube',{id:it.id},ctx(seq([.029,.3,.6,.9]))).state;assert.equal(s.materials.addCube,2);
assert.equal(s.pendingAddCube.grade,3);assert.equal(s.pendingAddCube.previousGrade,2);
assert.throws(()=>execute(s,'addCube',{id:it.id},ctx()),/ITEM_CUBE_PENDING/);
let kept=execute(s,'addCubeChoose',{apply:false},ctx()).state;assert.equal(JSON.stringify(kept.items.find(x=>x.id===it.id).addLines),before);assert.equal(kept.pendingAddCube,null);
s=execute(s,'addCubeChoose',{apply:true},ctx()).state;const applied=s.items.find(x=>x.id===it.id);assert.equal(applied.addGrade,3);assert.ok(applied.addLines.every(l=>l.grade===3));
s=execute(s,'addCube',{id:it.id},ctx(seq([.0101,.2,.4,.7]))).state;assert.equal(s.pendingAddCube.grade,3,'1% boundary not met');s=execute(s,'addCubeChoose',{apply:false},ctx()).state;

// Power counts additional lines.
const base=power(s).attack;
s.items.find(x=>x.id===it.id).addLines=[0,1,2].map(()=>({key:'attack',value:1.2,grade:5,additional:true}));
assert.ok(power(s).attack>base);

// Red/black cubes never touch additional lines.
s.materials.highCube=1;const add=JSON.stringify(s.items.find(x=>x.id===it.id).addLines);
s=execute(s,'cube',{id:it.id,kind:'highCube'},ctx()).state;assert.equal(JSON.stringify(s.items.find(x=>x.id===it.id).addLines),add);

// Distribution sanity: legendary lines follow the main legendary weights.
let boss=0;const n=200000,rnd=Math.random;for(let i=0;i<n/3;i++)for(const l of rollAdditionalLines(5,rnd))if(l.key==='boss')boss++;
const expected=UNIVERSAL_POOLS[5].filter(x=>x.key==='boss').reduce((a,x)=>a+x.weight,0)/UNIVERSAL_POOLS[5].reduce((a,x)=>a+x.weight,0);
assert.ok(Math.abs(boss/(Math.floor(n/3)*3)-expected)<.004);
console.log('PASS additional potential: 1/10 values (flat rounded), 10% scroll unlock, 3/1/0.5% grade-up, keep/apply choice, 1M G shop, power applies, other cubes untouched');
