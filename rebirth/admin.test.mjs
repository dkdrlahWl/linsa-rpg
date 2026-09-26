import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {initialState,execute} from './engine.mjs';
import {BOSSES,dayKey,weekKey,MATERIALS} from './data.mjs';
const now=Date.UTC(2026,8,26,5),ctx={now,random:()=>.5,uuid:randomUUID},admin={...ctx,admin:true};
const base=()=>{const s=initialState('warrior','도현1',ctx);s.hunting=false;return s;};
const forged=base();forged.isAdmin=true;
for(const [cmd,args] of [['adminSkip',{hours:1}],['betaLevel',{level:200}],['betaBossReset',{kind:'all'}],['betaGrant',{key:'gold',amount:1}]])assert.throws(()=>execute(forged,cmd,args,{...ctx,betaTools:true}),/BETA_DISABLED/);
assert.equal(execute(forged,'sync',{},ctx).state.isAdmin,false);
const full=execute(base(),'sync',{},admin).state;
assert.equal(full.gold,8e12);for(const key of Object.keys(MATERIALS))assert.equal(full.materials[key],1e9);
const unlocked=execute(full,'potential',{id:full.items[0].id},admin).state;
assert.equal(unlocked.materials.scroll,1e9);
assert.equal(execute(full,'betaLevel',{level:200},admin).state.level,200);
for(const hours of [0,13,1.5,'1'])assert.throws(()=>execute(full,'adminSkip',{hours},admin),/INVALID_SKIP_HOURS/);
const skipped=execute(base(),'adminSkip',{hours:12},admin);
assert.equal(skipped.state.lastReward.seconds,43200);assert.ok(skipped.state.lastReward.kills>0);assert.ok(skipped.state.lastReward.xp>0);assert.equal(skipped.state.lastAt,now);assert.equal(skipped.state.hunting,false);
let manual=base();manual.hunting=true;manual.lastAt=now-43200000;
let total={kills:0,xp:0,gold:0,fragment:0,cube:0,drops:0};
for(let h=1;h<=12;h++){const result=execute(manual,'sync',{}, {...ctx,now:now-(12-h)*3600000});manual=result.state;const reward=result.events[0];for(const key of Object.keys(total))total[key]+=key==='drops'?reward.drops.length:reward[key];}
for(const key of Object.keys(total))assert.equal(key==='drops'?skipped.state.lastReward.drops.length:skipped.state.lastReward[key],total[key],key);
assert.equal(skipped.state.level,manual.level);assert.equal(skipped.state.xp,manual.xp);
assert.equal(execute(skipped.state,'sync',{},admin).events.length,0);
const normal=base();normal.hunting=true;normal.lastAt=now-86400000;assert.equal(execute(normal,'sync',{},ctx).events[0].seconds,21600);
for(const boss of [BOSSES.find(b=>!b.weekly),BOSSES.find(b=>b.weekly)]){const s=base();s.bossClaims[boss.id]=boss.weekly?weekKey(now):dayKey(now);s.bossAttempts={[boss.id]:dayKey(now)};assert.throws(()=>execute(s,'boss',{id:boss.id},ctx),/BOSS_LIMIT/);assert.ok(execute(s,'boss',{id:boss.id},admin).state.battle);}
console.log('PASS admin authorization, no name-based grants, infinite spend, level change, 12-hour real reward parity, no duplicate settlement, normal 6-hour cap, repeat daily/weekly entry.');
