// Fragment exchange: 1% same-level boss gear with uniform class/slot; 99% normal selected-class gear.
import assert from 'node:assert/strict';
import {execute,initialState,FRAGMENT_BOSS_CHANCE} from './engine.mjs';
import {CLASSES,gearName} from './data.mjs';
assert.equal(FRAGMENT_BOSS_CHANCE,0.01);
let n=0;const uuid=()=>'u'+(++n);
function seq(seed){let x=seed>>>0;return ()=>((x=(Math.imul(x,1664525)+1013904223)>>>0)/4294967296);}
const random=seq(7),now=Date.UTC(2026,9,11,3);
let s=initialState('warrior','검증용',{now,random,uuid});
s.materials.fragment=1e9;s.hunting=false;
const levels=Array.from({length:18},(_,i)=>(i+1)*10);
let boss=0,total=0;const cls=new Map(),slots=new Map(),seen=new Set();
for(let i=0;i<60000;i++){
 const level=levels[i%18];
 if(s.items.length>250){s.items=s.items.filter(it=>Object.values(s.equipped).includes(it.id));s.mailbox=[];}
 const r=execute(s,'exchangeGear',{level,classId:'mage'},{now,random,uuid});s=r.state;
 const e=r.events.find(x=>x.type==='exchangeGear');total++;
 assert.equal(e.item.level,level);assert.equal(e.cost,level);
 assert.equal(!!e.boss,!!e.item.boss);
 if(e.boss){boss++;cls.set(e.item.classId,(cls.get(e.item.classId)||0)+1);slots.set(e.item.slot,(slots.get(e.item.slot)||0)+1);seen.add(level+':'+e.item.classId+':'+e.item.slot);}
 else assert.equal(e.item.classId,'mage');
 assert.ok(typeof gearName(e.item)==='string'&&gearName(e.item).length>0);
 assert.ok(e.item.baseStats&&Object.keys(e.item.baseStats).length>0);
}
const rate=boss/total;console.log('boss rate',rate.toFixed(4),'classes',Object.fromEntries(cls),'slots',Object.fromEntries(slots));
assert.ok(rate>0.008&&rate<0.012);
assert.equal(cls.size,CLASSES.length);assert.equal(slots.size,9);
// Every level x class x slot boss item is constructible and named.
import {selectDesign} from './data.mjs';
for(const level of levels)for(const c of CLASSES)for(let slot=0;slot<9;slot++){const d=selectDesign(level,c.id,slot,true,()=>.3);assert.ok(d,level+c.id+slot);assert.ok(gearName({level,classId:c.id,slot,boss:true,...d}));}
// Fragments are charged exactly the level; insufficient fragments rejected.
s.materials.fragment=5;assert.throws(()=>execute(s,'exchangeGear',{level:10,classId:'mage'},{now,random,uuid}),/INSUFFICIENT_FRAGMENT/);
console.log('PASS fragment exchange 1% boss gear');
