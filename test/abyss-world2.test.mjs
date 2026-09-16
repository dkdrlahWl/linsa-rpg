import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execute,initialState,balance} from '../supabase/functions/_shared/tower-hp-restored.mjs';
const now=Date.UTC(2026,8,16),cap=balance.levelReq[14];
let itemId=1000;
const run=(s,command='sync',args={},time=now)=>execute(s,command,args,{now:time,random:()=>.5,itemIds:Array.from({length:50},()=>++itemId),uuid:()=>crypto.randomUUID(),costumePercent:0});
function state(){const s=initialState(now);s.autoBattle=false;s.gold=10000000;return s;}
function bossState(){const s=state();s.autoBattle=true;s.regionIndex=5;s.bossIndex=5;s.monsterUnlockStep=35;s.abyssBalanceVersion=1;s.serverCombat={hp:50,elapsed:0,lastTick:now};s.serverClock=now;return s;}
test('Abyss table and level16 rates, no world2 monsters',()=>{
 assert.equal(balance.bossRegions.length,6);assert.equal(balance.bossRegions.flatMap(r=>r.bosses).length,36);
 assert.deepEqual(balance.bossRegions[5].bosses.map(b=>[b.hp,b.reward]),[[125000,6875],[180000,10080],[245000,13965],[320000,18560],[405000,23895],[500000,30000]]);
 assert.deepEqual(balance.rates[15],[43.96,26,18,11,1,.04]);assert.ok(Math.abs(balance.rates[15].reduce((a,b)=>a+b,0)-100)<1e-9);
});
test('uncleared world stays capped15 and excess XP is discarded',()=>{
 const s=state();s.summons.weapon={exp:cap+99999,level:15};
 const r=run(s,'summon',{group:'weapon',count:10});assert.deepEqual(r.state.summons.weapon,{exp:cap,level:15});assert.equal(r.state.gold,s.gold-180000);assert.equal(r.state.world2Unlocked,false);
});
test('unlock requires actual final boss kill; promotes only maxed category and persists',()=>{
 const s=bossState();s.summons.weapon={exp:cap,level:15};s.summons.armor={exp:balance.levelReq[12],level:13};s.summons.accessory={exp:balance.levelReq[13],level:14};
 assert.equal(run(s).state.world2Unlocked,false);
 const r=run(s,'sync',{},now+1000);assert.equal(r.state.world2Unlocked,true);assert.equal(r.state.gold,s.gold+30000);assert.deepEqual(Object.values(r.state.summons).map(x=>x.level),[16,13,14]);assert.equal(r.events.filter(e=>e.type==='world2Unlocked').length,1);
 const reload=run(JSON.parse(JSON.stringify(r.state)),'sync',{},now+1000);assert.equal(reload.state.summons.weapon.level,16);assert.equal(reload.events.filter(e=>e.type==='world2Unlocked').length,0);
});
test('offline final boss kill also unlocks world2',()=>{
 const s=bossState();s.serverBackgroundAt=now;
 assert.equal(run(s,'sync',{},now+1000).state.world2Unlocked,true);
});
test('later reaching15 immediately promotes16 independently; cost is30000',()=>{
 for(const group of ['weapon','armor','accessory']){
  const s=state();s.world2Unlocked=true;s.summons[group]={exp:cap-1,level:14};
  const r=run(s,'summon',{group,count:1});assert.deepEqual(r.state.summons[group],{exp:cap,level:16});assert.equal(r.state.gold,s.gold-18000);
  const next=run(r.state,'summon',{group,count:10});assert.equal(next.state.gold,r.state.gold-300000);assert.equal(next.state.summons[group].level,16);assert.ok(next.state.inventory.every(it=>it.rarity<6));
  for(const other of ['weapon','armor','accessory'].filter(x=>x!==group))assert.equal(next.state.summons[other].level,1);
 }
});
test('rollout rescales existing Abyss combat once, does not grant a clear',()=>{
 const s=bossState();delete s.abyssBalanceVersion;s.serverCombat.hp=112806;
 const r=run(s);assert.equal(r.state.serverCombat.hp,250000);assert.equal(r.state.world2Unlocked,false);assert.equal(run(r.state).state.serverCombat.hp,250000);
});
test('earlier boss kill cannot unlock world2 and nonexistent region is rejected',()=>{
 const s=bossState();s.bossIndex=4;
 assert.equal(run(s,'sync',{},now+1000).state.world2Unlocked,false);
 assert.throws(()=>run(s,'select',{region:6,boss:0}),/INVALID_ARGUMENTS/);
});
