import assert from 'node:assert/strict';
import {autoSkillBits,nextAutoSkill} from './auto-skills.mjs';
import {newTowerBattle,towerStep} from './tower-model.mjs?v=crit-restore-57';
import {startCoop,predictCoopStep} from './coop-model.mjs?v=crit-restore-57';
for(const stage of [-1,0,1,2,3]){
 const p={attack:1,hp:1000000,defense:1000,boss:1,crit:0,critDamage:1.5,cadence:1,advancement:Math.max(0,stage),firstJob:stage>=0};
 const b=newTowerBattle(1,'mage',p,0,'auto',1,stage>=1);
 const expected=stage<0?0:stage===0?8:stage===1?10:stage===2?26:58;
 assert.equal(autoSkillBits(b,1),expected);
 towerStep(b,[0,0,autoSkillBits(b,1)]);
 assert.equal(autoSkillBits(b,2),0,'on cooldown');
 assert.equal(!!b.firstCast,stage>=0);assert.equal(!!b.secondCast,stage>=1);assert.equal(!!b.thirdCast,stage>=2);assert.equal(!!b.fourthCast,stage>=3);
 assert.equal(autoSkillBits({...b,hp:0},1000),0);assert.equal(autoSkillBits({...b,chest:{}},1000),0);assert.equal(autoSkillBits(b,1000,false),0);
 let w=startCoop({id:'auto',tier:0,status:'waiting',members:[{id:'me',classId:'mage',power:p,advanced:stage>=1}]},0);
 w.members[0].x=1600;w.members[0].y=1700;
 w=predictCoopStep(w,'me',[0,0,autoSkillBits(w.members[0],0)]);
 assert.equal(autoSkillBits(w.members[0],1),0);
}
const state={firstAdvancement:true,advancement:3,battle:{kind:'boss',hp:100,skillReady:100,secondReady:200,thirdReadyAt:300,fourthReadyAt:400}};
assert.equal(nextAutoSkill(state,99),null);assert.equal(nextAutoSkill(state,100),1);
state.battle.skillReady=1000;assert.equal(nextAutoSkill(state,200),2);state.battle.secondReady=1000;assert.equal(nextAutoSkill(state,300),3);state.battle.thirdReadyAt=1000;assert.equal(nextAutoSkill(state,400),4);
state.battle.kind='tower';assert.equal(nextAutoSkill(state,2000),null);
console.log('PASS automatic unlocked skill bits, solo/co-op cast and cooldowns, dead/finished suppression, daily boss slot scheduling.');
