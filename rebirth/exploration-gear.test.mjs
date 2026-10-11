import assert from 'node:assert/strict';
import {EXPLORATIONS} from './exploration-data.mjs';
import {EXPLORATION_REWARDS} from './exploration-reward-data.mjs';
import {grantExplorationChest} from './exploration-rewards.mjs';
import {halfWeaponSlot} from './engine.mjs';
assert.ok(EXPLORATION_REWARDS.every(x=>x.bossGear===.05));
const slots=Array(9).fill(0);for(let i=0;i<1700;i++)slots[halfWeaponSlot(()=>(i+.5)/1700)]++;
assert.deepEqual(slots,[100,200,200,200,200,200,200,200,200]);
for(const tier of [0,1,2])for(const [roll,expected] of [[.049999,1],[.05,0]]){
 let n=0;const ctx={now:0,uuid:()=> 'test-item',random:()=>++n===4?roll:.999};
 const {reward}=grantExplorationChest({gold:0,materials:{},items:[],collection:[]},{tier,status:'won',cleared:EXPLORATIONS[tier].floors,tick:100},ctx);
 assert.equal(reward.items.length,expected);
}
console.log('PASS exploration gear: 5% boundary in all open tiers; weapon half each other slot');
