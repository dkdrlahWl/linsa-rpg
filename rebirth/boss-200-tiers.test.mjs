import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import * as D from './data.mjs';
import {initialState,execute,makeItem,power,huntingRate} from './engine.mjs';
import {inventoryGroups} from './inventory-order.mjs';
const legacyRange=item=>{const base={attack:(5+200**1.28)*(item.slot===0?.9:.11),stat:2+200*.5,hp:200*4,defense:200*.2},low=2.8+2*.45,high=low+.16;return Object.fromEntries(Object.entries(base).map(([k,v])=>[k,{min:Math.floor(v*low),max:Math.ceil(v*high)}]));};
for(const slot of [0,1,2,3,4,5,6,7,8]){
 const count=slot===0?5:3,old=legacyRange({slot});
 const tiers=Array.from({length:count},(_,t)=>D.gearStatRanges(D.designItem(200,'mage',slot,true,2,t)));
 for(const key of Object.keys(old)){
  assert.equal(tiers[0][key].min,old[key].min,'lowest tier keeps the old minimum');
  assert.equal(tiers.at(-1)[key].max,Math.ceil(old[key].max*1.3),'highest tier max = old max x1.3');
  for(let t=1;t<count;t++){assert.equal(tiers[t][key].min,tiers[t-1][key].max+1,'tiers are contiguous and never overlap');assert.ok(tiers[t][key].max>tiers[t][key].min);}
  assert.ok(old[key].max<=tiers[0][key].max,'pre-remake rolls stay inside the lowest tier');
 }
}
// Drops roll a tier with the published weights; stats stay inside that tier.
for(const slot of [0,4]){const counts=Array(slot?3:5).fill(0);let r=1;const random=()=>{r=(r*16807)%2147483647;return r/2147483647;};
 for(let i=0;i<40000;i++){const it={id:'x',level:200,classId:'rogue',slot,boss:true,...D.selectDesign(200,'rogue',slot,true,random)};it.baseStats=D.rollBaseStats(it,random);counts[it.bossTier]++;const range=D.gearStatRanges(it);for(const [k,v] of Object.entries(it.baseStats))assert.ok(v>=range[k].min&&v<=range[k].max);}
 const weights=slot?D.BOSS_ARMOR_TIER_WEIGHTS:D.BOSS_WEAPON_TIER_WEIGHTS,total=weights.reduce((a,b)=>a+b,0);counts.forEach((n,i)=>assert.ok(Math.abs(n/40000-weights[i]/total)<.01,`tier ${i} rate`));}
// Legacy 200 boss gear becomes the lowest tier without changing stored stats.
const legacy={id:'old',level:200,classId:'warrior',slot:2,boss:true,design:2,stars:5,baseStats:{attack:370,stat:390,hp:3000,defense:150},lines:[],grade:0,potentialVersion:5,potentialUnlocked:false};
D.normalizePotentialItem(legacy);assert.equal(legacy.bossTier,0);assert.deepEqual(legacy.baseStats,{attack:370,stat:390,hp:3000,defense:150});
// Common armor: one name/art for every job; weapons stay job-specific.
for(const slot of [1,8])for(let t=0;t<3;t++){const names=new Set(D.CLASSES.map(c=>D.gearName(D.designItem(200,c.id,slot,true,2,t)))),arts=new Set(D.CLASSES.map(c=>D.gearArt(D.designItem(200,c.id,slot,true,2,t))));assert.equal(names.size,1);assert.equal(arts.size,1);assert.ok(existsSync(new URL([...arts][0],import.meta.url)));}
for(const c of D.CLASSES)for(let t=0;t<5;t++){const it=D.designItem(200,c.id,0,true,2,t);assert.ok(existsSync(new URL(D.gearArt(it),import.meta.url)));assert.ok(!D.isCommonBossGear(it));}
assert.equal(new Set(Array.from({length:5},(_,t)=>D.gearName(D.designItem(200,'archer',0,true,2,t)))).size,5);
for(const key of ['v5:200:common:3:2:t2','v5:200:priest:0:2:t4'])assert.equal(D.equipmentKey(D.equipmentFromKey(key)),key);
assert.equal(D.equipmentKey(D.equipmentFromKey('v5:200:priest:4:2')),'v5:200:common:4:2:t0','old collection keys migrate');
assert.equal(new Set(D.EQUIPMENT_CATALOG.map(D.equipmentKey)).size,D.EQUIPMENT_CATALOG.length);
// Any job can equip common armor; another job's weapon is still refused. Lower boss tiers are unaffected.
let id=0;const ctx={now:1e6,random:()=>.5,uuid:()=>'i'+(++id)};
let s=initialState('priest','공통',ctx);s.level=200;s.hunting=false;
const armor={...makeItem(200,'warrior',3,true,ctx,0),design:2,bossTier:2};armor.baseStats=D.rollBaseStats(armor,()=>.5);s.items.push(armor);
const weapon={...makeItem(200,'warrior',0,true,ctx,2),design:2,bossTier:4};weapon.baseStats=D.rollBaseStats(weapon,()=>.5);s.items.push(weapon);
const old190={...makeItem(190,'warrior',3,true,ctx,0),design:2};old190.baseStats=D.rollBaseStats(old190,()=>.5);s.items.push(old190);
s=execute(s,'equip',{id:armor.id},ctx).state;assert.equal(s.equipped[3],armor.id);
assert.throws(()=>execute(s,'equip',{id:weapon.id},ctx),/ITEM_REQUIREMENT/);
assert.throws(()=>execute(s,'equip',{id:old190.id},ctx),/ITEM_REQUIREMENT/);
assert.ok(!D.isTieredBossGear(old190)&&old190.bossTier===undefined);
// Priest remake: HP% lines become attack% once, only for accounts that are priests at migration time.
const priest=initialState('priest','변환',ctx);delete priest.priestRemake;Object.assign(priest.items[0],{potentialUnlocked:true,grade:5});priest.items[0].lines=[{key:'hp',value:12,grade:5},{key:'attack',value:9,grade:4},{key:'flatHP',value:120,grade:2}];
D.normalizePotentialState(priest);assert.deepEqual(priest.items[0].lines.slice(0,3).map(l=>[l.key,l.value]),[['attack',12],['attack',9],['flatHP',120]]);assert.equal(priest.priestRemake,1);
const other=initialState('priest','다른직업',ctx);delete other.priestRemake;const pirateGear={...other.items[0],id:'pirate-gear',classId:'pirate',potentialUnlocked:true,grade:5,lines:[{key:'hp',value:12,grade:5}]};other.items.push(pirateGear);Object.assign(other.items[0],{potentialUnlocked:true,grade:5,lines:[{key:'hp',value:12,grade:5}]});D.normalizePotentialState(other);
assert.equal(other.items[0].lines[0].key,'attack');assert.equal(other.items.find(i=>i.id==='pirate-gear').lines[0].key,'hp','other-job gear keeps HP%');
priest.items[0].lines[2]={key:'hp',value:6,grade:3};D.normalizePotentialState(priest);assert.equal(priest.items[0].lines[2].key,'hp','conversion runs only once');
const mage=initialState('mage','유지',ctx);delete mage.priestRemake;Object.assign(mage.items[0],{potentialUnlocked:true,grade:5});mage.items[0].lines=[{key:'hp',value:12,grade:5}];D.normalizePotentialState(mage);assert.equal(mage.items[0].lines[0].key,'hp');
mage.classId='priest';D.normalizePotentialState(mage);assert.equal(mage.items[0].lines[0].key,'hp','later class changes are not converted');
// Priest basic attack and combat power equal other jobs without class perks (archer crit perk does not touch attack).
assert.equal(huntingRate(initialState('priest','시작',ctx)).survives,true);assert.equal(power(initialState('priest','시작',ctx)).attack,power(initialState('archer','시작',ctx)).attack);
// Inventory: common armor dropped for another job is shown and filtered with the player's own job.
{const its=[{id:'a',classId:'warrior',slot:2,level:200,boss:true,stars:0,grade:0},{id:'b',classId:'warrior',slot:0,level:200,boss:true,stars:0,grade:0},{id:'c',classId:'priest',slot:1,level:150,boss:true,stars:0,grade:0}];
 const g=inventoryGroups(its,D.CLASSES,'priest',[]);assert.equal(g[0].classId,'priest');assert.deepEqual(g[0].slots.flatMap(x=>x.items.map(i=>i.id)),['c','a']);
 assert.deepEqual(inventoryGroups(its,D.CLASSES,'priest',[],'priest').flatMap(x=>x.slots.flatMap(y=>y.items.map(i=>i.id))),['c','a']);}
console.log('PASS 200 boss tiers: old min kept, max x1.3, 5 weapon/3 common armor tiers, weights, legacy tier 0, common equip, keys, art, priest HP%→attack% migration');
