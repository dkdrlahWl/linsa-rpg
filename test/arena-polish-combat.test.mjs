import assert from 'node:assert/strict';
import {buildBot,simulateArena} from '../rebirth/arena-model.mjs';
import {ARENA_BOT_NAMES} from '../rebirth/arena-names.mjs';
import {initialState} from '../rebirth/engine.mjs';
assert.equal(new Set(ARENA_BOT_NAMES).size,2000);
for(const cls of ['warrior','mage','archer','rogue','pirate','priest']){
 const a=buildBot({id:1,classId:cls}),r=simulateArena(a,a,'check');
 assert.deepEqual(r,simulateArena(a,a,'check'));
 assert(r.frames.every(f=>f.leftHp>=0&&f.leftHp<=r.leftMaxHp&&f.rightHp>=0&&f.rightHp<=r.rightMaxHp));
 assert.deepEqual([...new Set(r.frames.filter(f=>f.type==='cast').map(f=>f.slot))].sort(),[1,2,3,4,5]);
 if(cls==='priest')assert(r.frames.some(f=>f.type==='support'&&f.heal>0)&&r.frames.some(f=>f.leftShield>0||f.rightShield>0));
}
const a=initialState('warrior','뉴비',{now:0,uuid:()=>crypto.randomUUID()}),r=simulateArena(a,a,'check');assert(!r.frames.some(f=>f.type==='cast'));
console.log('PASS 2,000 unique names, six classes, 1–5 skill gates, deterministic combat, HP bounds and priest support.');
