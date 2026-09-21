import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import * as E from './engine.mjs';
import * as D from './data.mjs';
const ctx=(random=()=>.5,now=0)=>({random,now,uuid:randomUUID});
const state=()=>{const s=E.initialState('mage','테스트',ctx());s.hunting=false;s.gold=1e8;s.materials.cube=100;s.materials.highCube=100;s.materials.expand=10;s.items[0].lines=[{key:'INT',value:1,grade:0},{key:'flatINT',value:17,grade:4},{key:'boss',value:18,grade:5}];return s;};
for(const high of [false,true])for(const apply of [false,true]){
 let s=state(),before=structuredClone(s.items[0].lines),seq=[0,0,.999];
 s=E.execute(s,'cube',{id:s.items[0].id,high},ctx(()=>seq.length?seq.shift():.5)).state;
 assert.deepEqual(s.items[0].lines.map(l=>l.grade),[1,5,5]);assert.ok(s.pendingCube);
 assert.deepEqual(s.items[0].lines.map(l=>[l.key,l.value]),before.map(l=>[l.key,l.value]));
 assert.throws(()=>E.execute(s,'cube',{id:s.items[0].id},ctx()),/ITEM_CUBE_PENDING/);
 s=E.execute(s,'cubeChoose',{apply},ctx()).state;assert.deepEqual(s.items[0].lines.map(l=>l.grade),[1,5,5]);
 if(!apply)assert.deepEqual(s.items[0].lines.map(l=>[l.key,l.value]),before.map(l=>[l.key,l.value]));
 s=E.execute(s,'cube',{id:s.items[0].id,high},ctx(()=>.999)).state;
 assert.deepEqual(s.pendingCube.lines.map(l=>l.grade),[1,5,5]);
}
for(const high of [false,true])for(let grade=0;grade<6;grade++)for(const success of [false,true]){
 let s=state();s.items[0].lines=[{key:'INT',value:1,grade}];const p=(high?D.HIGH_CUBE_UP:D.CUBE_UP)[grade];let first=true;
 s=E.execute(s,'cube',{id:s.items[0].id,high},ctx(()=>{if(first){first=false;return success?Math.max(0,p-1e-12):p;}return .5;})).state;
 assert.equal(s.pendingCube.lines[0].grade,grade+(success&&grade<5?1:0));
}
assert.equal(Object.values(D.OPTION_WEIGHTS).reduce((a,b)=>a+b),100);
// Every newly rolled option improves strictly across adjacent ranks.
for (const key of Object.keys(D.OPTIONS)) {
 for(let grade=1;grade<6;grade++)assert.ok(D.optionRange(key,grade).min>D.optionRange(key,grade-1).max,`${key}: overlapping ranks ${grade-1}/${grade}`);
 if(!key.startsWith('flat')&&!['goldGain','xpGain'].includes(key))assert.equal(D.optionRange(key,5).max,12);
}
assert.equal(D.OPTION_WEIGHTS.INT+D.OPTION_WEIGHTS.attack+D.OPTION_WEIGHTS.boss,7);
let cumulative=0;for(const [key,weight] of Object.entries(D.OPTION_WEIGHTS)){
 assert.equal(D.rollOptionKey(()=> (cumulative+.001)/100),key);assert.equal(D.rollOptionKey(()=> (cumulative+weight-.001)/100),key);cumulative+=weight;
 for(let grade=0;grade<6;grade++) {const {min,max,step}=D.optionRange(key,grade),n=Math.round((max-min)/step)+1;for(let i=0;i<n;i++)assert.equal(D.optionValue(key,grade,()=> (i+.5)/n),Math.round((min+i*step)*10)/10);}
}
for(let grade=0;grade<4;grade++) {const s=state();delete s.items[0].potentialVersion;s.items[0].grade=grade;s.items[0].lines=[{key:'INT',value:9}];s.mailbox=[{item:structuredClone(s.items[0]),quantity:2}];let m=E.execute(s,'sync',{},ctx()).state;assert.equal(m.items[0].lines[0].grade,grade+2);assert.equal(m.mailbox[0].item.lines[0].grade,grade+2);assert.deepEqual(E.execute(m,'sync',{},ctx()).state,m);}
let s=state();s.items[0].lines=[{key:'INT',value:18,grade:5}];s=E.execute(s,'expand',{id:s.items[0].id},ctx()).state;assert.deepEqual(s.items[0].lines.map(l=>l.grade),[5,0]);
s=state();s.items[0].lines=[];const p=E.power(s);s.items[0].lines=[{key:'flatINT',value:17,grade:4}];assert.equal(E.power(s).primary,p.primary+17);
s.items[0].lines=[{key:'goldGain',value:1,grade:5},{key:'xpGain',value:1,grade:5}];s.hunting=true;const boosted=E.execute(s,'sync',{},ctx(()=>.5,120000)).state;let frequent=s;for(let now=1000;now<=120000;now+=1000)frequent=E.execute(frequent,'sync',{},ctx(()=>.5,now)).state;assert.equal(frequent.gold,boosted.gold);assert.equal(frequent.xp,boosted.xp);assert.equal(frequent.level,boosted.level);
console.log('PASS: per-line permanent ranks, both cube choices, all upgrade boundaries, all option weights and every value, legacy migration, expansion, flat stats, offline gain consistency.');
