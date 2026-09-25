import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {gearAttributes,normalizePotentialItem} from './data.mjs';
import {initialState,execute,makeLootItem} from './engine.mjs';
const ctx={now:0,random:()=>.5,uuid:randomUUID};
let checked=0;
for(let quality=0;quality<=100;quality++)for(const level of [1,10,100,200])for(const boss of [false,true])for(const stars of [0,10,25]){
 const old={level,quality,boss,stars,slot:0,lines:[],potentialVersion:3};
 const before=gearAttributes(old),migrated=normalizePotentialItem(structuredClone(old));
 assert.ok(!Object.hasOwn(migrated,'quality'));
 for(const k of Object.keys(before))assert.ok(Math.abs(before[k]-gearAttributes(migrated)[k])<1e-9);
 assert.deepEqual(normalizePotentialItem(structuredClone(migrated)),migrated);checked++;
}
const s=initialState('mage','품질검증',ctx);s.hunting=false;
assert.ok(!Object.hasOwn(s.items[0],'quality'));
assert.ok(!Object.hasOwn(makeLootItem(100,'mage',0,false,ctx),'quality'));
assert.throws(()=>execute(s,'qualityReroll',{id:s.items[0].id},ctx),/UNKNOWN_COMMAND/);
console.log('PASS: quality removed; '+checked+' legacy gear stats preserved; migration idempotent; removed command rejected.');
