import assert from 'node:assert/strict';
import {PET_EVENT,PET_ID,summonPet,petRates,petHealTick,equipPet,fieldPetDeath,fieldPetHP} from './pet-event.mjs';
import {initialState,execute,power} from './engine.mjs';
const ctx={now:PET_EVENT.start+1000,admin:true,random:()=>.5,uuid:()=>crypto.randomUUID()};
const state=()=>({gold:2000000,materials:{},pets:[]});
assert.equal(summonPet(state(),1,{...ctx,admin:false},()=>{}).rewards.length,1);
assert.throws(()=>summonPet(state(),1,{...ctx,now:PET_EVENT.end},()=>{}),/기간/);
let s=state();let sequence=[.5,0];let r=summonPet(s,5,{...ctx,random:()=>sequence.shift()??.5},()=>{});assert.equal(r.cost,100000);assert.equal(r.unused,0);assert.equal(s.gold,1900000);assert.deepEqual(s.pets,[PET_ID]);assert.equal(summonPet(s,1,ctx,()=>{}).rewards.length,1);assert.equal(petRates(s).find(r=>r.key==='pet').rate,0);
s=state();s.petEvents={[PET_EVENT.id]:{draws:199,counts:{}}};r=summonPet(s,5,ctx,()=>{});assert.equal(r.rewards[0].key,'pet');assert.equal(r.cost,100000);assert.equal(s.pets.length,1);assert.equal(r.rewards.length,5);
s=state();s.petEvents={[PET_EVENT.id]:{draws:30,counts:{gear:1,highCube:10,scroll:10}}};assert.equal(petRates(s).find(r=>r.key==='gold').rate,54.5);assert.equal(petRates(s).reduce((n,r)=>n+r.rate,0),100);
assert.throws(()=>equipPet(state(),PET_ID));s.pets=[PET_ID];equipPet(s,PET_ID);assert.equal(s.equippedPet,PET_ID);equipPet(s,null);assert.equal(s.equippedPet,null);
const actor={hp:1000,power:{hp:1000,pet:PET_ID}};
petHealTick([actor],0);assert.equal(actor.petReadyTick,undefined);
actor.hp=921;petHealTick([actor],1);assert.equal(actor.hp,921);assert.equal(actor.petReadyTick,undefined);
actor.hp=920;petHealTick([actor],2);assert.equal(actor.hp,1000);assert.equal(actor.petReadyTick,302);
actor.hp=500;petHealTick([actor],301);assert.equal(actor.hp,500);
petHealTick([actor],302);assert.equal(actor.hp,580);petHealTick([actor],302);assert.equal(actor.hp,580);
actor.hp=1000;petHealTick([actor],602);assert.equal(actor.petReadyTick,602);
actor.hp=990;petHealTick([actor],603);assert.equal(actor.hp,1000);assert.equal(actor.petReadyTick,903);
actor.hp=0;petHealTick([actor],903);assert.equal(actor.hp,0);
for(const max of [1,100,1000,9999])for(const d of [1,3,10,100,1000]){
 let hp=max,death=Infinity,ready=null;
 for(let hit=1;hit<=10000;hit++){
  hp=Math.max(0,hp-d);
  if(hp===0){death=hit*1.5;break;}
  if(ready===null?max-hp>=max*.08:hit>=ready){hp=Math.min(max,hp+Math.max(1,Math.round(max*.08)));ready=hit+20;}
  assert.equal(fieldPetHP(max,d,hit*1.5),hp,`HP ${max}/${d}/${hit}`);
 }
 assert.equal(fieldPetDeath(max,d),death,`Death ${max}/${d}`);
}
s=initialState('warrior','테스트',ctx);s=execute(s,'petSummon',{count:1},{...ctx,random:()=>0}).state;assert(s.pets.includes(PET_ID));s=execute(s,'petEquip',{id:PET_ID},ctx).state;assert.equal(power(s).pet,PET_ID);assert.equal(execute(s,'petSummon',{count:1},{...ctx,admin:false}).events.at(-1).type,'petSummon');
for(let i=0;i<25;i++)summonPet(s,5,ctx,()=>{});assert.equal(s.pets.filter(x=>x===PET_ID).length,1);
console.log('Pet continuing draws, one-pet cap, pity, permissions, equip and healing passed');
