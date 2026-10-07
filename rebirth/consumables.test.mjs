import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {initialState,execute,grantRaidChest,grantCoopChest} from './engine.mjs';
import {LUCK_POTION,rewardChance,potionCount,luckStatus} from './consumables.mjs';
import {BOSSES} from './data.mjs';
import {rollRaidReward} from './raid-rewards.mjs';
const now=Date.parse('2026-10-06T12:00:00Z');
const ctx=(roll=.5,time=now)=>({now:time,random:()=>roll,uuid:randomUUID});
function player(){const s=initialState('warrior','물약검증',ctx());s.hunting=false;s.gold=10000000;return s;}
let s=execute(player(),'consumableBuy',{id:'luckPotion',price:0,duration:99999999},ctx()).state;
assert.equal(s.gold,5000000);assert.equal(potionCount(s),1);
s=execute(s,'consumableBuy',{id:'luckPotion'},ctx()).state;
assert.equal(s.gold,0);assert.equal(potionCount(s),2);
assert.throws(()=>execute(s,'consumableBuy',{id:'luckPotion'},ctx()),/INSUFFICIENT_GOLD/);
assert.throws(()=>execute(player(),'consumableBuy',{id:'fake'},ctx()),/INVALID_CONSUMABLE/);
s=execute(s,'consumableUse',{id:'luckPotion',until:Infinity},ctx()).state;
assert.equal(potionCount(s),1);assert.equal(s.buffs.luckUntil,now+300000);assert.equal(s.consumableReady.luckPotion,now+300000);
assert.throws(()=>execute(s,'consumableUse',{id:'luckPotion'},ctx(.5,now+299999)),/ITEM_CONSUMABLE_COOLDOWN/);
assert.equal(luckStatus(JSON.parse(JSON.stringify(s)),now+150000).remaining,150000);
assert.ok(Math.abs(rewardChance(.2,s,now+299999)-.3)<1e-12);
assert.equal(rewardChance(.8,s,now),1);assert.equal(rewardChance(.2,s,now+300000),.2);
assert.equal(potionCount(execute(s,'consumableUse',{id:'luckPotion'},ctx(.5,now+300000)).state),0);
assert.throws(()=>execute(player(),'consumableUse',{id:'luckPotion'},ctx()),/INSUFFICIENT_CONSUMABLE/);
for(const weekly of [false,true]){
 const boss=BOSSES.find(b=>b.weekly===weekly||!weekly&&!b.weekly),roll=boss.dropChance*1.25;
 function claim(boost){let p=player();if(boost)p.buffs={luckUntil:now+300000};p=execute(p,'boss',{id:boss.id},ctx()).state;
  if(weekly){p.battle.chest={...p.battle.player};p.battle.won=true;p.battle.ended=true;return execute(p,'towerOpen',{runId:p.battle.runId},ctx(roll)).state;}
  p.battle.enemyHp=0;return execute(p,'sync',{},ctx(roll)).state;
 }
 assert.equal(claim(false).lastReward.items.length,0);assert.equal(claim(true).lastReward.items.length,1);
}
const boosted=player();boosted.buffs={luckUntil:now+300000};
assert.equal(grantRaidChest(player(),0,ctx(.75)).reward.items.length,0);
assert.equal(grantRaidChest(boosted,0,ctx(.75)).reward.items.length,1);
assert.equal(grantRaidChest(boosted,0,ctx(.75,now+300000)).reward.items.length,0);
assert.equal(rollRaidReward(0,()=>.6,player(),now).highCube,0);
assert.equal(rollRaidReward(0,()=>.6,boosted,now).highCube,2);
assert.equal(rollRaidReward(2,()=>.999,boosted,now).highCube,5);
assert.equal(grantRaidChest(boosted,3,ctx(.125)).reward.items.length,1);
const practice={...boosted,raidWeekly:{week:grantRaidChest(boosted,0,ctx()).state.raidWeekly.week,count:3}};
assert.equal(grantRaidChest(practice,0,ctx(0)).reward.items.length,0);
assert.deepEqual(grantCoopChest(player(),0,ctx(.7)).reward,grantCoopChest(boosted,0,ctx(.7)).reward);
const blocked=player();blocked.battle={kind:'tower'};
assert.throws(()=>execute(blocked,'consumableUse',{id:'luckPotion'},ctx()),/BATTLE_IN_PROGRESS/);
console.log('PASS fixed purchase price, owned count, 5-minute duration/cooldown, reconnect persistence, expiration, daily/weekly/raid RNG, 100% cap, no rift/practice buff');

for(const [id,price] of [['cube',200000],['highCube',500000]]){
 const source=player(),before=source.materials[id]||0;source.gold=price;
 const bought=execute(source,'consumableBuy',{id,price:0,quantity:1000},ctx());
 assert.equal(bought.state.gold,0);assert.equal(bought.state.materials[id],before+1);assert.equal(bought.events.find(e=>e.type==='consumableBuy').gold,price);
 assert.throws(()=>execute(bought.state,'consumableBuy',{id},ctx()),/INSUFFICIENT_GOLD/);
 assert.throws(()=>execute(bought.state,'consumableUse',{id},ctx()),/INVALID_CONSUMABLE/);
 const full=player();full.materials[id]=1000000;assert.throws(()=>execute(full,'consumableBuy',{id},ctx()),/INVENTORY_CONSUMABLE_LIMIT/);
}
console.log('PASS cube purchases: exact server prices, one item added to existing materials, insufficient gold, forged args, inventory cap, potion-only use');
