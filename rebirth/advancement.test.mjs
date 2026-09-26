import assert from 'node:assert/strict';
import {initialState,execute,power} from './engine.mjs';
import {jobStage,firstJobUnlocked,ADVANCEMENT_BOSSES} from './advancement.mjs';
import {newTowerBattle,towerStep} from './tower-model.mjs';
import {startCoop,advanceCoop} from './coop-model.mjs';
let id=0;const ctx={now:1000000,random:()=>.5,uuid:()=>String(++id)};
let s=initialState('warrior','전직검사',ctx);s.hunting=false;s.level=29;
assert.throws(()=>execute(s,'advance',{},ctx),/LEVEL_REQUIRED/);
s.level=30;s=execute(s,'advance',{},ctx).state;assert.equal(s.battle.advancementStage,0);assert.equal(s.battle.encounter.seconds,60);
s.battle.ended=true;s.battle.won=false;s=execute(s,'sync',{},ctx).state;assert.equal(firstJobUnlocked(s),false);
const base=power(s);s=execute(s,'advance',{},ctx).state;s.battle.ended=true;s.battle.won=true;s=execute(s,'sync',{},ctx).state;
assert.equal(s.firstAdvancement,true);assert.equal(jobStage(s),1);assert.equal(s.advancement,0);assert.equal(s.lastReward.stage,0);assert.equal(s.tower?.cleared?.length||0,0);assert.equal(s.daily.tower,0);assert.ok(Math.abs(power(s).attack/base.attack-1.1)<.02);
for(const stage of [1,2]){const trial=ADVANCEMENT_BOSSES.find(t=>t.stage===stage);s.level=trial.level-1;assert.throws(()=>execute(s,'advance',{},ctx),/LEVEL_REQUIRED/);s.level=trial.level;s=execute(s,'advance',{},ctx).state;assert.equal(s.battle.advancementStage,stage);s.battle.ended=true;s.battle.won=true;s=execute(s,'sync',{},ctx).state;assert.equal(jobStage(s),stage+1);}
assert.throws(()=>execute(s,'advance',{},ctx),/ALREADY_ADVANCED/);
const novice={...s,firstAdvancement:false,advancement:0};assert.ok(Math.abs(power(s).attack/power(novice).attack-1.331)<.01);
assert.equal(firstJobUnlocked({advancement:1}),true);assert.equal(jobStage({advancement:2}),3);
for(const unlocked of [false,true]){const p={attack:10,hp:10000,defense:0,boss:1,crit:0,critDamage:1,cadence:1,advancement:0,firstJob:unlocked};const b=newTowerBattle(1,'warrior',p,0,'first',1,false);towerStep(b,[0,0,8]);assert.equal(b.ultimateReady>0,unlocked);let room=startCoop({tier:0,status:'waiting',members:[{id:'me',classId:'warrior',power:p,advanced:false}]},0);room=advanceCoop(room,'me',[0,0,8],0);room=advanceCoop(room,'me',[0,0,0],100);assert.equal((room.members[0].ultimateReady||0)>0,unlocked);}
console.log('PASS 30/60/100 gates, first-job victory only, legacy advancement, 10% each, solo/co-op first skill lock');
