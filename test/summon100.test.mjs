import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialState,execute,balance} from '../supabase/functions/_shared/tower-hp-restored.mjs';
const now=Date.now();const context=()=>({now,random:()=>.1,randomInt:n=>n-1,uuid:()=>crypto.randomUUID(),itemIds:Array.from({length:100},(_,i)=>90000+i)});
for(const group of ['weapon','armor','accessory'])test('100 summons are atomic and unique: '+group,()=>{
 const s={...initialState(now),gold:100000,autoBattle:false};const r=execute(s,'summon',{group,count:100},context());
 assert.equal(r.state.inventory.length,100);assert.equal(new Set(r.state.inventory.map(x=>x.id)).size,100);assert.equal(r.state.gold,75000);assert.equal(r.state.summons[group].exp,100);assert.equal(r.events.find(x=>x.type==='summon').items.length,100);
 assert.ok(r.state.inventory.every(x=>group==='weapon'?x.slot==='무기':group==='armor'?['투구','갑옷','바지','신발'].includes(x.slot):['반지','귀걸이'].includes(x.slot)));
 const poor={...s,gold:24999};assert.throws(()=>execute(poor,'summon',{group,count:100},context()),/INSUFFICIENT_GOLD/);assert.equal(poor.inventory.length,0);
});
test('100 summons reject injected counts and keep angel excluded at level 18',()=>{
 const s={...initialState(now),autoBattle:false,gold:1e9,world2Unlocked:true,monsterUnlockStep:60};s.summons.weapon={level:18,exp:balance.levelReq[14]+30000,world2Version:1};
 const r=execute(s,'summon',{group:'weapon',count:100},context());assert.equal(r.state.gold,985000000);assert.ok(r.state.inventory.every(x=>x.rarity===6));
 for(const count of [99,101,-1,1.5,'100',null])assert.throws(()=>execute(s,'summon',{group:'weapon',count},context()),/INVALID_ARGUMENTS/);
});
