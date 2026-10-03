import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newTrainingBattle,towerStep,trainingDps} from '../rebirth/tower-model.mjs';

const power={attack:100,boss:1.5,crit:0,critDamage:1.6,cadence:1,hp:1000,defense:0,advancement:0,firstJob:false};
function run(mode,frames=600){
 const battle=newTrainingBattle(mode,'warrior',power,0,mode,false);
 for(let tick=0;tick<frames;tick++)towerStep(battle,[0,tick<3?-1:0,1]);
 return battle;
}

test('both dummies take actual combat damage without dying or attacking',()=>{
 const normal=run('normal'),boss=run('boss');
 for(const battle of [normal,boss]){
  assert.equal(battle.tick,600);
  assert.equal(battle.ended,true);
  assert.equal(battle.hp,power.hp);
  assert.equal(battle.enemyHp,1);
  assert.ok(battle.dummyTotalDamage>0);
  assert.equal(trainingDps(battle).average,Math.round(battle.dummyTotalDamage/60));
 }
 assert.equal(boss.dummyTotalDamage,normal.dummyTotalDamage*power.boss);
});

test('recent DPS uses only the last five seconds and resets for each attempt',()=>{
 const battle=run('normal',100);
 const before=trainingDps(battle);
 assert.ok(before.recent>0);
 for(let tick=0;tick<60;tick++)towerStep(battle,[0,0,0]);
 assert.equal(trainingDps(battle).recent,0);
 assert.ok(trainingDps(battle).average>0);
 const retry=newTrainingBattle('normal','warrior',power,0,'retry',false);
 assert.equal(trainingDps(retry).average,0);
 assert.equal(retry.dummyTotalDamage,0);
});
