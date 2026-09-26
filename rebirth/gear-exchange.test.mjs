import assert from 'node:assert/strict';
import {initialState,execute,huntingRate} from './engine.mjs';
import {CLASSES} from './data.mjs';
let id=0;const ctx={now:1e6,random:()=>.5,uuid:()=>String(++id)};
const fresh=()=>{const s=initialState('warrior','교환',ctx);s.hunting=false;s.materials.fragment=10000;return s;};
for(const c of CLASSES)for(let level=10;level<=180;level+=10){const s=fresh(),r=execute(s,'exchangeGear',{classId:c.id,level},ctx),e=r.events.find(e=>e.type==='exchangeGear');assert.equal(r.state.materials.fragment,10000-level);assert.equal(e.item.level,level);assert.equal(e.item.classId,c.id);assert.equal(e.item.boss,false);assert.ok(e.item.design<2);assert.equal(e.item.potentialUnlocked,false);assert.ok(r.state.items.some(it=>it.id===e.item.id));}
for(const level of [0,1,15,190,200,NaN,'10'])assert.throws(()=>execute(fresh(),'exchangeGear',{classId:'mage',level},ctx),/INVALID_GEAR_LEVEL/);
assert.throws(()=>execute(fresh(),'exchangeGear',{classId:'bad',level:10},ctx),/INVALID_CLASS/);
const poor=fresh();poor.materials.fragment=9;assert.throws(()=>execute(poor,'exchangeGear',{classId:'mage',level:10},ctx),/INSUFFICIENT_FRAGMENT/);assert.equal(poor.materials.fragment,9);
const full=fresh();full.items=Array.from({length:300},(_,i)=>({...full.items[0],id:'full'+i}));const r=execute(full,'exchangeGear',{classId:'pirate',level:180},ctx);assert.equal(r.state.items.length,300);assert.equal(r.state.mailbox.at(-1).item.level,180);assert.equal(r.events.find(e=>e.type==='exchangeGear').stored,true);
for(const c of CLASSES){const s=initialState(c.id,'시작',ctx);assert.equal(huntingRate(s).attackInterval,1);assert.equal(huntingRate(s).enemyInterval,1.5);assert.equal(huntingRate(s).survives,true);s.stage=2;assert.equal(huntingRate(s).survives,false);}
console.log('PASS 90 exchange choices, exact cost/class/level, no boss items, invalid/insufficient requests, mailbox overflow, 1s player / 1.5s monster field attacks and Lv1 vs Lv12 loss');
