import assert from 'node:assert/strict';
import {access} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {initialState,execute} from './engine.mjs';
import {COSTUMES,costumeById,equippedCostume,costumeAttackBonus,normalizeCostumes} from './costumes.mjs';
import {COSTUMES as SERVER_COSTUMES} from './edge-dist/costumes.mjs';
import {costumeMotionFrame} from './costume-motion.mjs';
import {costumeShop} from './costume-ui.mjs';

const ids=['swan-lake-knight','sapphire-night-mage','jade-peacock-ranger','crimson-butterfly-dancer','sugar-ribbon-captain','wisteria-sanctuary-priest'];
const ctx={now:0,random:()=>.5,uuid:randomUUID};
assert.equal(COSTUMES.filter(c=>c.price<=30000000).length,36);
assert.deepEqual(COSTUMES,SERVER_COSTUMES);
assert.equal(new Set(ids.map(id=>costumeById(id).classId)).size,6);
assert.ok(COSTUMES.slice(0,18).every(c=>c.price===5000000));
assert.ok(COSTUMES.slice(18,24).every(c=>c.price===10000000));
assert.ok(COSTUMES.slice(24,30).every(c=>c.price===20000000));
for(const id of ids){
 const c=costumeById(id);
 assert.equal(c.price,30000000);assert.equal(c.attackBonus,1);assert.equal(c.authoredWalk,true);
 await access(new URL(c.portrait,import.meta.url));await access(new URL(c.atlas,import.meta.url));
 let s=initialState(c.classId,'신규의상검수',ctx);s.hunting=false;s.gold=c.price;
 s=execute(s,'costumeBuy',{id},ctx).state;
 assert.equal(s.gold,0);assert.equal(costumeAttackBonus(s),1);
 assert.throws(()=>execute(s,'costumeBuy',{id},ctx),/COSTUME_OWNED/);
 s=execute(s,'costumeEquip',{id},ctx).state;
 assert.equal(equippedCostume(normalizeCostumes(JSON.parse(JSON.stringify(s)))).id,id);
 assert.throws(()=>execute({...s,classId:c.classId==='warrior'?'mage':'warrior'},'costumeEquip',{id},ctx),/COSTUME_CLASS_MISMATCH/);
 const poor=initialState(c.classId,'금액검수',ctx);poor.hunting=false;poor.gold=c.price-1;
 assert.throws(()=>execute(poor,'costumeBuy',{id},ctx),/INSUFFICIENT_GOLD/);
 for(const dir of [0,1,2,7,6]){
  const cells=acting=>new Set(Array.from({length:8},(_,phase)=>{
   const p=costumeMotionFrame(c.classId,dir,true,acting,phase/9,phase/1.05+.001,c.motionLayout);
   return p.frame.x+','+p.frame.y;
  }));
  assert.equal(cells(false).size,3,'idle and two opposite walking steps');
  assert.equal(cells(true).size,3,'wind-up, impact and recovery');
 }
 const html=costumeShop({...s,costumes:[]});assert.ok(html.includes(c.name));assert.ok(html.includes('30,000,000 G'));
}
console.log('PASS six 30M costumes: exact gold debit, ownership persistence, job protection, 1% bonuses, authored walk/attack directions, assets and server parity');
