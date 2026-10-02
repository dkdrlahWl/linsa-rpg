import assert from 'node:assert/strict';
import {initialState,execute,power} from '../rebirth/engine.mjs';
import {COSTUMES,COSTUME_PRICE,equippedCostume,normalizeCostumes} from '../rebirth/costumes.mjs';
import {shopView} from '../rebirth/shop-ui.mjs';
import * as D from '../rebirth/data.mjs';
const ctx={now:Date.UTC(2026,9,2),random:()=>.5,uuid:()=>crypto.randomUUID(),admin:false};
for(const c of COSTUMES){
 let s=initialState(c.classId,'테스트',ctx);s.hunting=false;s.gold=COSTUME_PRICE;
 assert.throws(()=>execute(s,'costumeEquip',{id:c.id},ctx),/COSTUME_NOT_OWNED/);
 const poor={...s,gold:COSTUME_PRICE-1};assert.throws(()=>execute(poor,'costumeBuy',{id:c.id},ctx),/INSUFFICIENT_GOLD/);
 assert.equal(poor.gold,COSTUME_PRICE-1);
 s=execute(s,'costumeBuy',{id:c.id},ctx).state;assert.equal(s.gold,0);assert.deepEqual(s.costumes,[c.id]);
 assert.throws(()=>execute(s,'costumeBuy',{id:c.id},ctx),/COSTUME_OWNED/);
 const before=power(s);s=execute(s,'costumeEquip',{id:c.id},ctx).state;const after=power(s);
 assert.equal(after.costumeId,c.id);delete before.costumeId;delete after.costumeId;assert.deepEqual(after,before);
 const reloaded=execute(JSON.parse(JSON.stringify(s)),'sync',{},ctx).state;assert.equal(equippedCostume(reloaded).id,c.id);
 const battle={...s,battle:{kind:'boss'}};assert.throws(()=>execute(battle,'costumeUnequip',{},ctx),/BATTLE_IN_PROGRESS/);
 assert.throws(()=>execute({...s,coopRoom:'test'},'costumeUnequip',{},ctx),/BATTLE_IN_PROGRESS/);
 const foreign=COSTUMES.find(x=>x.classId!==c.classId);assert.throws(()=>execute({...s,costumes:[c.id,foreign.id]},'costumeEquip',{id:foreign.id},ctx),/COSTUME_CLASS_MISMATCH/);
 const changed=execute(s,'changeClass',{classId:foreign.classId},ctx).state;assert.equal(changed.equippedCostume,null);assert.ok(changed.costumes.includes(c.id));
 s=execute(s,'costumeUnequip',{},ctx).state;assert.equal(power(s).costumeId,null);
 assert.match(shopView(s,D,()=>''),/코스튬 상점/);
}
assert.equal(normalizeCostumes({classId:'warrior',costumes:['fake'],equippedCostume:'fake'}).equippedCostume,null);
assert.throws(()=>execute({...initialState('warrior','테스트',ctx),hunting:false},'costumeBuy',{id:'fake'},ctx),/INVALID_COSTUME/);
console.log('6 classes: purchase, duplicate, insufficient gold, ownership, equip, reload, class switch, battle restrictions and unchanged combat stats passed.');
