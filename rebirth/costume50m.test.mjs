import assert from 'node:assert/strict';
import {access} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {initialState,execute} from './engine.mjs';
import {COSTUMES,equippedCostume,costumeAttackBonus,normalizeCostumes} from './costumes.mjs';
import {COSTUMES as SERVER} from './edge-dist/costumes.mjs';
import {costumeMotionFrame,costumeMotionScale} from './costume-motion.mjs';
import {costumeShop} from './costume-ui.mjs';
const added=COSTUMES.filter(c=>c.price===50000000);
assert.equal(COSTUMES.length,48);assert.equal(added.length,12);assert.deepEqual(COSTUMES,SERVER);
assert.equal(new Set(COSTUMES.map(c=>c.id)).size,48);
for(const cls of ['warrior','mage','archer','rogue','pirate','priest'])assert.equal(added.filter(c=>c.classId===cls).length,2);
const ctx={now:0,random:()=>.5,uuid:randomUUID};
for(const c of added){
 await access(new URL(c.atlas,import.meta.url));await access(new URL(c.portrait,import.meta.url));
 assert.equal(c.attackBonus,1);assert.ok(c.authoredWalk&&c.twoLegWalk);
 let s=initialState(c.classId,'신규의상검수',ctx);s.hunting=false;s.gold=50000001;
 s=execute(s,'costumeBuy',{id:c.id},ctx).state;assert.equal(s.gold,1);assert.equal(costumeAttackBonus(s),1);
 assert.throws(()=>execute(s,'costumeBuy',{id:c.id},ctx),/COSTUME_OWNED/);
 s=execute(s,'costumeEquip',{id:c.id},ctx).state;
 assert.equal(equippedCostume(normalizeCostumes(JSON.parse(JSON.stringify(s)))).id,c.id);
 assert.throws(()=>execute({...s,classId:c.classId==='mage'?'warrior':'mage'},'costumeEquip',{id:c.id},ctx),/COSTUME_CLASS_MISMATCH/);
 assert.throws(()=>execute({...s,costumes:[],gold:49999999},'costumeBuy',{id:c.id},ctx),/INSUFFICIENT_GOLD/);
 for(let dir=0;dir<8;dir++)for(const acting of [false,true]){
  const poses=Array.from({length:8},(_,phase)=>costumeMotionFrame(c.classId,dir,true,acting,phase/9,phase/1.05+.001,c.id));
  assert.equal(new Set(poses.map(p=>p.frame.x+','+p.frame.y)).size,3);
  for(const p of poses){assert.equal(p.layout.width,1600);assert.equal(p.layout.height,1600);assert.equal(p.layout.frames.length,80);assert.ok(p.frame.anchor>0&&p.frame.anchor<320);assert.ok(p.frame.foot>0&&p.frame.foot<=320);assert.ok(costumeMotionScale(p,180)>0);}
 }
 const shop=costumeShop({...s,costumes:[]});assert.ok(shop.includes(c.name));assert.ok(shop.includes('50,000,000 G'));
}
console.log('PASS 12 high-fantasy 50M costumes: two per job, exact debit, duplicate/poor/wrong-job guards, persistence, bonuses, 8-direction motion, client/server parity.');
