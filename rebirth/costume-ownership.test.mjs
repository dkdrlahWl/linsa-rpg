import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {initialState,execute,power} from './engine.mjs';
import {COSTUMES,COSTUME_PRICE,costumeAttackBonus} from './costumes.mjs';
import {costumeShop,costumeWardrobe} from './costume-ui.mjs';

const ctx={now:0,random:()=>.5,uuid:randomUUID};
const ids=COSTUMES.map(c=>c.id);
for(const {classId} of COSTUMES){
 const s=initialState(classId,'보유효과검증',ctx);s.hunting=false;s.level=200;s.advancement=4;
 const base=power(s);
 for(const count of [1,3,6]){
  // Other-class costumes also apply without an equipped appearance.
  s.costumes=ids.slice(0,count);s.equippedCostume=null;
  const p=power(s),ratio=1+count/100;
  assert.equal(p.costumeAttackBonus,count);
  assert.ok(Math.abs(p.dps-base.dps*ratio)<1e-8,classId);
  assert.equal(p.hp,base.hp);assert.equal(p.defense,base.defense);
  assert.equal(p.primary,base.primary);assert.equal(p.crit,base.crit);
  assert.ok(p.combatPower>=base.combatPower);
 }
 s.costumes=[ids[0],ids[0],'unknown',null];
 assert.equal(costumeAttackBonus(s),1);
 assert.ok(Math.abs(power(s).dps-base.dps*1.01)<1e-8);
 for(const costumes of [undefined,null,{},'crimson-dragon']){
  assert.equal(costumeAttackBonus({...s,costumes}),0);
  assert.equal(power({...s,costumes}).attack,base.attack);
 }
}

let s=initialState('warrior','구매효과검증',ctx);s.hunting=false;s.gold=COSTUME_PRICE*6;
for(let i=0;i<ids.length;i++){
 s=execute(s,'costumeBuy',{id:ids[i]},ctx).state;
 assert.equal(power(s).costumeAttackBonus,i+1);
 assert.equal(s.gold,COSTUME_PRICE*(5-i));
}
assert.throws(()=>execute(s,'costumeBuy',{id:ids[0]},ctx),/COSTUME_OWNED/);
const owned=power(s);
s=execute(s,'costumeEquip',{id:ids[0]},ctx).state;
assert.equal(power(s).dps,owned.dps);
s=execute(s,'costumeUnequip',{},ctx).state;
assert.equal(power(s).dps,owned.dps);
assert.match(costumeShop(s),/보유 효과 합계: 공격력 \+6%/);
assert.match(costumeWardrobe(s),/공격력 \+6%/);
assert.equal((costumeShop(s).match(/보유 효과: 공격력 \+1%/g)||[]).length,6);
assert.doesNotMatch(costumeWardrobe(s),/외형만 변경/);
console.log('PASS: ownership attack across six jobs, stacking, duplicates, purchase, equip/unequip, and UI totals.');
