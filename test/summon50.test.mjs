import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {initialState,execute} from '../supabase/functions/_shared/tower-hp-restored.mjs';
const now=1800000000000,ctx={now,random:()=>.1,uuid:randomUUID,itemIds:Array.from({length:50},(_,i)=>10000+i),adminFloor:0,costumePercent:0,partyBusy:false};
for(const group of ['weapon','armor','accessory'])test('50 summons: '+group,()=>{
 const s={...initialState(now),gold:50000,autoBattle:false};
 const r=execute(s,'summon',{group,count:50},{...ctx,itemIds:Array.from({length:50},(_,i)=>10000+i)});
 assert.equal(r.state.inventory.length,50);assert.equal(new Set(r.state.inventory.map(i=>i.id)).size,50);
 assert.equal(r.state.gold,37500);assert.equal(r.state.summons[group].exp,50);assert.equal(r.events.find(e=>e.type==='summon').items.length,50);
});
test('reject invalid counts and insufficient gold without mutating input',()=>{
 for(const count of [0,49,51,99,101,1.5,'50'])assert.throws(()=>execute({...initialState(now),gold:50000,autoBattle:false},'summon',{group:'weapon',count},ctx),/INVALID_ARGUMENTS/);
 const s={...initialState(now),gold:12499,autoBattle:false},before=structuredClone(s);
 assert.throws(()=>execute(s,'summon',{group:'weapon',count:50},ctx),/INSUFFICIENT_GOLD/);assert.deepEqual(s,before);
});


