import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {EXPLORATIONS,explorationStats,explorationPrevious,explorationKeys,explorationScale} from './exploration-data.mjs';
import {EXPLORATION_REWARDS} from './exploration-reward-data.mjs';
import {grantExplorationChest} from './exploration-rewards.mjs';
import {explorationUnlocked} from './exploration-ui.mjs';
import {execute,initialState} from './engine.mjs';
import {ATTENDANCE_REWARDS} from './data.mjs';
import {REWARD_RATES} from './fishing-data.mjs';

// Tiers 4~6 skip id 3 (Dark Citadel) and scale boss HP linearly with party size.
assert.deepEqual(EXPLORATIONS.map(t=>t.id).filter(x=>x!==undefined),[0,1,2,4,5,6]);assert.equal(EXPLORATIONS[3],undefined);
assert.deepEqual([4,5,6].map(explorationPrevious),[2,4,5]);assert.deepEqual([0,2,4,5,6].map(explorationKeys),[1,1,1,2,3]);
for(const [tier,solo] of [[4,2.5e8],[5,3.5e8],[6,5e8]]){
 for(const n of [1,2,3,4]){const hp=explorationStats(tier,5,n,true).hp;assert.ok(Math.abs(hp-solo*n)/(solo*n)<.01,tier+' '+n+' '+hp);}
 assert.equal(explorationScale(tier,4).hp,4);
}
assert.ok(Math.abs(explorationStats(2,5,4,true).hp/explorationStats(2,5,1,true).hp-1.9)<1e-9,'tiers 0~2 keep the 1.3x step');
assert.ok(explorationStats(4,5,1,true).attack<=explorationStats(2,5,1,true).attack,'tier 4 boss hits no harder than tier 3');
assert.ok(explorationUnlocked({exploration:{cleared:[0,1,2]}},4));assert.ok(!explorationUnlocked({exploration:{cleared:[0,1]}},4));
assert.ok(!explorationUnlocked({exploration:{cleared:[0,1,2]}},5));assert.ok(!explorationUnlocked({exploration:{cleared:[0,1,2,4,5,6]}},3));

// Rewards: every key rolls independently; gear stays in the tier's level band.
let seq=0;const always=()=>{seq++;return 0;};
for(const tier of [4,5,6]){
 const r=EXPLORATION_REWARDS[tier],room={tier,status:'won',cleared:5,tick:900};
 const out=grantExplorationChest({gold:0,materials:{},items:[],collection:[]},room,{random:()=>0,uuid:randomUUID,now:1});
 assert.equal(out.reward.gold,r.gold);assert.equal(out.state.materials.addCube,r.counts.addCube);assert.equal(out.state.materials.bonusFlame,1);
 assert.equal(out.state.materials.highCube,r.counts.highCube);assert.equal(out.reward.items.length,1);assert.equal(out.reward.items[0].level,r.gear[0][0]);
 const none=grantExplorationChest({gold:0,materials:{},items:[],collection:[]},room,{random:()=>.999,uuid:randomUUID,now:1});
 assert.equal(none.reward.addCube,0);assert.equal(none.reward.items.length,0);
 const levels=new Set();for(let i=0;i<400;i++){const x=grantExplorationChest({gold:0,materials:{},items:[],collection:[]},room,{random:(()=>{let k=0;return()=>(k++===5?0:Math.random());})(),uuid:randomUUID,now:1});for(const it of x.reward.items)levels.add(it.level);}
 for(const l of levels)assert.ok(l>=r.gear[0][0]&&l<=(tier===6?200:190),tier+' level '+l);
}

// Attendance: new 7-day table, every key lands (fishing diamonds into state.fishing).
assert.equal(ATTENDANCE_REWARDS.length,7);assert.equal(ATTENDANCE_REWARDS[6].fishDiamond,30);
let now=Date.parse('2026-10-26T01:00:00Z');let s=initialState('warrior','출석',{now,random:Math.random,uuid:randomUUID});s.attendance={day:0,lastClaim:null};s.hunting=false;
const before=structuredClone(s);
for(let d=0;d<7;d++){s=execute(s,'attendanceClaim',{},{now,random:Math.random,uuid:randomUUID}).state;now+=86400000;}
const total={};for(const r of ATTENDANCE_REWARDS)for(const [k,v] of Object.entries(r))total[k]=(total[k]||0)+v;
assert.ok(s.gold-before.gold>=total.gold,'gold');for(const k of ['cube','highCube','fragment','dungeonKey','addCube','scroll','primeCube','bonusFlame'])assert.equal((s.materials[k]||0)-(before.materials[k]||0),total[k],k);
assert.equal(s.fishing.diamonds-(before.fishing?.diamonds||0),30);
// Fishing loot halved.
assert.deepEqual(REWARD_RATES.map(r=>r.chance),[.9925,.005,.0025]);
console.log('PASS exploration tiers 4~6 (linear HP, keys 1/2/3, rewards), attendance table, fishing chest/key odds');
