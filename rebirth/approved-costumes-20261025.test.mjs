import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {initialState,execute} from './engine.mjs';
import {COSTUMES,costumeById,equippedCostume,normalizeCostumes} from './costumes.mjs';
import {COSTUMES as SERVER_COSTUMES} from './edge-dist/costumes.mjs';
import {costumeShop} from './costume-ui.mjs';
import {costumeMotionFrame} from './costume-motion.mjs';

const newIds=['storm-lion-valkyrie','glacier-crystal-librarian','autumn-fox-archer','raven-masquerade','abyssal-pearl-corsair','golden-sun-oracle'];
const oldIds=['sunrose-empress','astral-tea-mage','aurora-huntress','moonjewel-bladedancer','scarlet-sky-pilot','opal-dream-priest'];
const ctx={now:0,random:()=>.5,uuid:randomUUID};
assert.equal(COSTUMES.length,30);
assert.deepEqual(COSTUMES,SERVER_COSTUMES,'client and deployed server graph must share exact catalog');
assert.equal(new Set(newIds.map(id=>costumeById(id).classId)).size,6);
for(const id of [...oldIds,...newIds]){
 const c=costumeById(id);
 assert.equal(c.price,newIds.includes(id)?20000000:10000000);
 assert.equal(c.attackBonus,1);assert.equal(c.approvedIdle,true);
 assert.match(c.portrait,/-portrait-approved-20261025\.webp$/);
 await access(new URL(c.portrait,import.meta.url));await access(new URL(c.atlas,import.meta.url));
}
for(const id of newIds){
 const c=costumeById(id);let s=initialState(c.classId,'코스튬검증',ctx);s.hunting=false;s.gold=c.price;
 s=execute(s,'costumeBuy',{id},ctx).state;assert.equal(s.gold,0);assert.ok(s.costumes.includes(id));
 assert.throws(()=>execute(s,'costumeBuy',{id},ctx),/COSTUME_OWNED/);
 s=execute(s,'costumeEquip',{id},ctx).state;
 assert.equal(equippedCostume(JSON.parse(JSON.stringify(s))).id,id);
 assert.throws(()=>execute({...s,classId:c.classId==='warrior'?'mage':'warrior'},'costumeEquip',{id},ctx),/COSTUME_CLASS_MISMATCH/);
 const poor=initialState(c.classId,'금액검증',ctx);poor.hunting=false;poor.gold=c.price-1;
 assert.throws(()=>execute(poor,'costumeBuy',{id},ctx),/INSUFFICIENT_GOLD/);
 const stages=new Set(Array.from({length:8},(_,i)=>costumeMotionFrame(c.classId,2,false,true,i/9,0,c.motionLayout).frame.y));
 assert.equal(stages.size,2,'each new costume uses authored preparation and release');
 assert.ok(costumeShop({...s,gold:20000000}).includes(c.name));
}
const existing=normalizeCostumes({classId:'warrior',costumes:oldIds,equippedCostume:oldIds[0]});
assert.deepEqual(existing.costumes,oldIds);assert.equal(equippedCostume(existing).id,oldIds[0]);
const page=await readFile(new URL('index.html',import.meta.url),'utf8');assert.match(page,/approved-costumes-20261025/);
console.log('PASS six new jobs at 20M, six existing at 10M, exact prices, duplicate/poor/wrong-job protection, saved ownership, two attack phases, paths and client/server catalog parity');
