import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {BOSSES,weekKey} from './data.mjs';
import {initialState,execute} from './engine.mjs';
import {towerStep} from './tower-model.mjs';
const boss=BOSSES[31];
assert.equal(boss.hp,BOSSES[30].hp);assert.equal(boss.hp,110000000);
assert.equal(boss.weekly,true);assert.equal(boss.dropChance*boss.gearRateScale,.05);
function start(roll){const ctx={now:Date.parse('2026-10-18T13:00:00+09:00'),random:()=>roll,uuid:randomUUID};let s=initialState('warrior','주간보스검증',ctx);s.hunting=false;s=execute(s,'boss',{id:31},ctx).state;return {ctx,s};}
for(const [roll,expected] of [[.049999,1],[.05,0]]){
 let {ctx,s}=start(roll);assert.equal(s.battle.encounter.weeklyPattern,'eclipse-sovereign');assert.equal(s.battle.encounter.artFrames,1);assert.equal(s.battle.enemyHp,boss.hp);
 s.battle.chest={...s.battle.player};s.battle.won=true;s.battle.ended=true;
 s=execute(s,'towerOpen',{runId:s.battle.runId},ctx).state;
 assert.equal(s.lastReward.items.length,expected);assert.equal(s.bossClaims[31],weekKey(ctx.now));
 if(expected){const item=s.items.find(x=>x.id===s.lastReward.items[0]);assert.equal(item.level,200);assert.equal(item.boss,true);}
 assert.throws(()=>execute(s,'boss',{id:31},ctx),/BOSS_LIMIT/);
 const practice=execute(s,'boss',{id:31,practice:true},ctx).state;
 practice.battle.chest={...practice.battle.player};practice.battle.won=true;practice.battle.ended=true;
 const result=execute(practice,'towerOpen',{runId:practice.battle.runId},ctx).state;
 assert.equal(result.lastReward.items.length,0);assert.equal(result.lastReward.gold,0);
}
for(const enraged of [false,true]){
 const {s}=start(.7),b=s.battle;b.power.hp=1e10;b.hp=1e10;
 if(enraged)b.enemyHp=boss.hp*.34;
 b.nextPattern=1;
 for(let i=0;i<150;i++){towerStep(b,[0,0,0]);for(const h of b.hazards){assert.ok(Number.isFinite(h.at));assert.ok(h.end>h.at);}}
 assert.ok(b.phase>=4);assert.ok(!b.ended);assert.ok(b.hazards.length<30);
}
console.log('PASS weekly 200 HP, visible patterns, enrage, 5% actual rewards, weekly claim and practice');
