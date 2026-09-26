import assert from 'node:assert/strict';
import {FOURTH_SKILLS,beginFourth,stepFourth} from './fourth-job.mjs';
import {initialState,execute,power} from './engine.mjs';
import {newTowerBattle,towerStep} from './tower-model.mjs';
import {startCoop,predictCoopStep} from './coop-model.mjs';
import {randomUUID} from 'node:crypto';
for(const classId of Object.keys(FOURTH_SKILLS)){
 const a={classId,advancement:3,x:0,y:0},target={x:100,y:0};let total=0,count=0;
 assert.equal(beginFourth({...a,advancement:2},target,0),false);
 assert.equal(beginFourth(a,target,0),true);assert.equal(beginFourth(a,target,1),false);
 for(let tick=0;tick<300;tick++)stepFourth(a,target,tick,n=>{total+=n;count++;});
 assert.equal(count,FOURTH_SKILLS[classId].hits);assert.ok(Math.abs(total-18)<1e-9);
 assert.equal(beginFourth(a,target,299),false);assert.equal(beginFourth(a,target,300),true);
 let outside=0;stepFourth(a,{x:4000,y:4000},399,n=>outside+=n);assert.equal(outside,0);
 const p={attack:100,hp:1e6,defense:100,boss:1,crit:0,critDamage:1.6,cadence:1,firstJob:true,advancement:3};
 const b=newTowerBattle(10,classId,p,0,'fourth',1,true);towerStep(b,[0,0,32]);assert.ok(b.fourthCast);for(let i=0;i<80;i++)towerStep(b,[0,0,0]);assert.ok(!b.fourthCast);
 let room=startCoop({id:'fourth',me:'me',tier:9,status:'waiting',members:[{id:'me',classId,power:p,advanced:true}]},0);room=predictCoopStep(room,'me',[0,0,32]);assert.ok(room.members[0].fourthCast);
}
const ctx={now:1e6,uuid:randomUUID,random:()=>.5};let s=initialState('warrior','전직검증',ctx);Object.assign(s,{hunting:false,level:149,firstAdvancement:true,advancement:2});
assert.throws(()=>execute(s,'advancementStart',{stage:3},ctx),/LEVEL_REQUIRED/);s.level=150;const before=power(s);s=execute(s,'advancementStart',{stage:3},ctx).state;assert.equal(s.battle.encounter.seconds,120);
s.battle.won=true;s.battle.ended=true;s=execute(s,'sync',{},ctx).state;assert.equal(s.advancement,3);assert.ok(Math.abs(power(s).attack/before.attack-1.1)<.02);
s=execute(s,'advancementStart',{stage:3},ctx).state;assert.equal(s.battle.advancementPractice,true);
console.log('PASS five fourth-job skills: total 1800%, 30s cooldown, pulse counts and range, solo/co-op activation, level 150 gate, victory unlock, +10% stats, repeat practice');
