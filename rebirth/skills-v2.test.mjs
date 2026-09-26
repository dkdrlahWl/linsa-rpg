import assert from 'node:assert/strict';
import {CLASSES,CLASS_SKILLS,SECOND_SKILLS} from './data.mjs';
import {newTowerBattle,towerStep} from './tower-model.mjs';
import {ADVANCEMENT_BOSSES} from './advancement.mjs';
for(const c of CLASSES){
 const p={attack:1000,hp:1e8,defense:100,boss:1,crit:0,critDamage:1.5,cadence:1,advancement:1};
 const b=newTowerBattle(1,c.id,p,0,'skill',42,true);b.player.y=1650;b.enemyHp=1e8;
 towerStep(b,[0,0,8]);assert.equal(b.ultimateReady,1+CLASS_SKILLS[c.id].cooldown*10);
 towerStep(b,[0,0,2]);const ready=b.skillReady;assert.equal(ready,2+SECOND_SKILLS[c.id].cooldown*10);assert.ok(b.effects.some(e=>e.kind==='second'));
 for(let i=0;i<4;i++)towerStep(b,[0,0,2]);assert.equal(b.skillReady,ready);
 if(SECOND_SKILLS[c.id].type==='attack')assert.ok(b.enemyHp<1e8);else assert.ok(b.secondUntil>b.tick);
 const locked=newTowerBattle(1,c.id,{...p,advancement:0},0,'locked',42,false);towerStep(locked,[0,0,2]);assert.equal(locked.skillReady,0);
}
for(const trial of ADVANCEMENT_BOSSES){const b=newTowerBattle(trial.floor,'warrior',{attack:1,hp:1e9,defense:1e9,boss:1,crit:0,critDamage:1,cadence:1},0,'timeout',1);b.encounter=trial;b.enemyHp=trial.hp;b.advancementStage=trial.stage;for(let i=0;i<1199;i++)towerStep(b,[0,0,0]);assert.equal(b.ended,false);towerStep(b,[0,0,0]);assert.equal(b.tick,1200);assert.equal(b.ended,true);assert.equal(b.won,false);}
console.log('PASS five classes: first/second skills, independent cooldowns, damage/buff, unlock, 120-second advancement timeout');
