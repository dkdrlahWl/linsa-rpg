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
test('Lv16/17/18 authoritative rates preserve fallen and each sum exactly 100000',()=>{
 for(let i=0;i<3;i++){const w=globalThis.RinguWorld2Data.rateWeights[i].map(x=>x*5);w[0]-=i+1;w.push(i+1);assert.equal(w.reduce((a,b)=>a+b),100000);assert.equal(w[6],globalThis.RinguWorld2Data.rateWeights[i][6]*5);assert.equal(w[7]/1000,A.rates[i]);}
});
test('all groups can summon angel, persist, equip, enhance, transcend, cube and dismantle',()=>{
 for(const group of ['weapon','armor','accessory']){
  const s=state();s.summons[group]={level:18,exp:balance.levelReq[14]+30000,world2Version:1};
  const r=execute(s,'summon',{group,count:1},ctx());const it=r.state.inventory[0];assert.equal(it.rarity,7);assert.ok(A.gear.some(x=>x.name===it.name));
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
