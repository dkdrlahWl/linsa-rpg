import assert from 'node:assert/strict';
import {EXPLORATION_REWARDS,EXPLORATION_REWARD_COUNTS,explorationGearLevel} from './exploration-reward-data.mjs';
import {grantExplorationChest} from './exploration-rewards.mjs';
import {adminExplorationFloor} from './exploration-admin.mjs';
import {startCoop} from './coop-model.mjs';
import {EXPLORATIONS} from './exploration-data.mjs';
import {explorationLobby} from './exploration-ui.mjs';
assert.deepEqual(EXPLORATION_REWARDS.map(r=>r.gold),[1000000,1400000,2000000,2600000,3400000,4400000,5600000,7000000,8600000,11000000]);
const boundaries=[0,25,45,60,72,82,89,94,97,99];
for(let i=0;i<10;i++){assert.equal(explorationGearLevel(()=>boundaries[i]/100),100+i*10);assert.equal(explorationGearLevel(()=>(boundaries[i]+.00001)/100),100+i*10);}
assert.equal(explorationGearLevel(()=>.999999),190);
for(let tier=0;tier<3;tier++){
 const room={tier,status:'won',cleared:EXPLORATIONS[tier].floors,tick:200},input={gold:1,materials:{scroll:2,highCube:3,potentialLock:4},items:[],collection:[]},rates=EXPLORATION_REWARDS[tier];
 const grant=values=>{let i=0;return grantExplorationChest(input,room,{random:()=>values[i++]??.5,uuid:()=>crypto.randomUUID()});};
 const none=grant([.999,.999,.999,.999]);assert.equal(none.state.gold,1+rates.gold);assert.deepEqual(none.state.materials,input.materials);assert.equal(none.reward.items.length,0);assert.equal(none.reward.cube,0);
 for(const [index,key] of ['scroll','highCube','potentialLock'].entries()){
  const rolls=[.999,.999,.999,.999];rolls[index]=rates[key]-.000001;const yes=grant(rolls);assert.equal(yes.reward[key],EXPLORATION_REWARD_COUNTS[key]);assert.equal(yes.state.materials[key],input.materials[key]+EXPLORATION_REWARD_COUNTS[key]);
  rolls[index]=rates[key];assert.equal(grant(rolls).reward[key],0);
 }
 const all=grant([0,0,0,0,.995,.999,.999]);assert.equal(all.reward.items[0].level,190);assert.equal(all.reward.items[0].boss,true);assert.equal(all.state.items.length,1);assert.deepEqual(['scroll','highCube','potentialLock'].map(k=>all.reward[k]),[3,5,2]);assert.equal(input.items.length,0);
 const jobs=new Set();for(const classRoll of [0,.2,.4,.6,.8,.999]){const gear=grant([.999,.999,.999,0,.5,classRoll,.5]);jobs.add(gear.reward.items[0].classId);}assert.equal(jobs.size,6);
 const full={...input,items:Array.from({length:300},(_,i)=>({id:String(i)}))};const overflow=grantExplorationChest(full,room,{random:()=>0,uuid:()=>crypto.randomUUID()});assert.equal(overflow.state.items.length,300);assert.equal(overflow.state.mailbox.length,1);assert.equal(overflow.reward.stored,1);
 assert.throws(()=>grantExplorationChest(input,{...room,status:'fighting'},{random:()=>0}),/NOT_READY/);
}
const power={hp:100000,attack:10000,defense:100,advancement:4,level:200};
const world=startCoop({id:'room',mode:'exploration',tier:2,status:'waiting',owner:'admin',members:[{id:'admin',classId:'warrior',power,ready:true,left:false,advanced:true}]},1000);world.entryWaiting=false;world._net={points:[],frames:[]};
assert.throws(()=>adminExplorationFloor(world,'admin',12,false),/BETA_DISABLED/);
assert.throws(()=>adminExplorationFloor(world,'stranger',12,true),/NOT_READY/);
for(const floor of [0,13,1.1,'12'])assert.throws(()=>adminExplorationFloor(world,'admin',floor,true),/INVALID_EXPLORATION_FLOOR/);
const final=adminExplorationFloor(world,'admin',12,true);assert.equal(final.floor,12);assert.ok(final.monsters.some(m=>m.boss));assert.equal(final._net,undefined);assert.equal(final.tick,world.tick);assert.equal(world.floor,1);
const first=adminExplorationFloor(final,'admin',1,true);assert.equal(first.floor,1);assert.ok(!first.monsters.some(m=>m.boss));
const lobby=explorationLobby({materials:{dungeonKey:1}});assert.ok(!lobby.includes('레드 큐브'));assert.ok(lobby.includes('100~190'));assert.ok(lobby.includes('1,000,000'));
console.log('PASS independent rewards, exact thresholds, weighted 100–190 gear, overflow mailbox, admin-only floor selection, floor rebuild and lobby');
