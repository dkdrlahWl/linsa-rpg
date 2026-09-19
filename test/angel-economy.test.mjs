import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execute,initialState,balance,itemAttack,options} from '../supabase/functions/_shared/economy.mjs';
import {cubeType,rollOption} from '../supabase/functions/_shared/cubes.mjs';
const A=globalThis.RinguAngelData,now=Date.now();let id=800000;
const ctx=(randomInt=n=>n-1)=>({now,random:()=>.999999,randomInt,itemIds:Array.from({length:100},()=>++id),uuid:()=>crypto.randomUUID()});
const state=()=>({...initialState(now),autoBattle:false,world2Unlocked:true,monsterUnlockStep:60,gold:1e12,transcendStone:1000,essence:1000});
test('one canonical angel per each of seven slots, safe finite stats and sun cube support',()=>{
 assert.equal(A.gear.length,7);assert.equal(new Set(A.gear.map(x=>x.slot)).size,7);
 for(const gear of A.gear){const it={...gear,enhance:15,transcend:3,optionRolls:[.8,.8]};assert.ok(Number.isSafeInteger(itemAttack(it)));assert.ok(options(it).every(x=>Number.isFinite(x[1])));assert.equal(cubeType(it),'sun');rollOption(it,()=>.999);assert.ok(options(it).every(x=>Number.isFinite(x[1])));}
});
test('all 18 levels and all summon groups exclude angels even at the top RNG boundary',()=>{
 for(let level=1;level<=18;level++)for(const group of ['weapon','armor','accessory']){
  const s=state();s.world2Unlocked=level>=16;
  s.summons[group]={level,world2Version:1,exp:level<=15?balance.levelReq[level-1]:balance.levelReq[14]+(level===16?0:level===17?10000:30000)};
  const result=execute(s,'summon',{group,count:50},ctx());assert.ok(result.state.inventory.every(x=>x.rarity<=6));
 }
 assert.equal(A.rates,undefined);
});
test('existing angels persist, equip, enhance, transcend, cube and dismantle',()=>{
 for(const group of ['weapon','armor','accessory']){
  const s=state();s.summons[group]={level:18,exp:balance.levelReq[14]+30000,world2Version:1};
  const it={...A.gear[group==='weapon'?0:group==='armor'?1:5],id:++id,enhance:0,transcend:0,optionRolls:[.8,.8]};s.inventory=[it];const r={state:s};
  let saved=execute(r.state,'sync',{},ctx()).state;assert.equal(saved.inventory[0].rarity,7);
  saved=execute(saved,'equip',{id:it.id},ctx()).state;assert.equal(saved.equipped[it.slot],it.id);assert.ok(Number.isFinite(saved.remodelProfile.power));
  saved=execute(saved,'enhance',{id:it.id}, {...ctx(),random:()=>0}).state;assert.equal(saved.inventory[0].enhance,1);
  saved.inventory[0].enhance=15;saved=execute(saved,'transcend',{id:it.id},{...ctx(),random:()=>0}).state;assert.equal(saved.inventory[0].transcend,1);
  saved.sunCube=1;saved=execute(saved,'cubeRoll',{id:it.id,type:'sun'},ctx()).state;assert.equal(saved.sunCube,0);
  saved=execute(saved,'unequip',{slot:it.slot},ctx()).state;saved=execute(saved,'dismantle',{ids:[it.id]},ctx(()=>0)).state;assert.equal(saved.inventory.length,0);assert.equal(saved.essence,1008);
 }
});
test('lower summon levels never create angels and forged celestial names are rejected',()=>{
 const s=state();s.world2Unlocked=false;s.summons.weapon={exp:balance.levelReq[14],level:15,world2Version:1};assert.ok(execute(s,'summon',{group:'weapon',count:50},ctx()).state.inventory.every(x=>x.rarity<7));
 s.inventory=[{...A.gear[0],name:'forged',id:3}];assert.throws(()=>execute(s,'sync',{},ctx()),/UNKNOWN_EQUIPMENT/);
});

test('trusted admin-only angel roll is exactly one of 100 outcomes and cannot be forged',()=>{
 for(const group of ['weapon','armor','accessory']){let angels=0;
  for(let outcome=0;outcome<100;outcome++){
   const s=state();s.summons[group]={level:15,exp:balance.levelReq[14],world2Version:1};
   const r=execute(s,'summon',{group,count:1},{...ctx(n=>n===100?outcome:n-1),adminFloor:1});
   if(r.events[0].items?.[0]?.rarity===7)angels++;
   assert.ok(execute({...s,adminFloor:1,isAdmin:true},'summon',{group,count:1},ctx(()=>0)).state.inventory.every(x=>x.rarity<7));
  }assert.equal(angels,1);
 }
 assert.throws(()=>execute(state(),'summon',{group:'weapon',count:1,adminFloor:1},ctx()),/INVALID_ARGUMENTS/);
 const s=state();s.inventory=[{...A.gear[0],id:42,enhance:0,optionRolls:[.8,.8]}];
 const r=execute(s,'summon',{group:'weapon',count:1},{...ctx(()=>0),adminFloor:1});assert.equal(r.events[0].items[0].rarity,7);assert.equal(r.events[0].items[0].isNew,false);
});
