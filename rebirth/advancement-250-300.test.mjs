import assert from 'node:assert/strict';
import {ADVANCEMENT_BOSSES,trialHp,advancementStatBonus} from './advancement.mjs';
import {newTowerBattle,towerStep} from './tower-model.mjs';
// 6·7차 보스: 2인이면 체력 2배, 1~5차는 그대로.
const [c,a]=[ADVANCEMENT_BOSSES[5],ADVANCEMENT_BOSSES[6]];
assert.equal(c.level,250);assert.equal(a.level,300);assert.equal(c.hp,360000000);
assert.equal(trialHp(c,1),c.hp);assert.equal(trialHp(c,2),c.hp*2);assert.equal(trialHp(ADVANCEMENT_BOSSES[4],2),ADVANCEMENT_BOSSES[4].hp);
assert.deepEqual(advancementStatBonus({advancement:4}),{});
assert.deepEqual(advancementStatBonus({advancement:5}),{attack:12,boss:20,hp:12});
assert.deepEqual(advancementStatBonus({advancement:6}),{attack:27,boss:50,hp:27,crit:10});
// 모든 위험 지역은 최소 1.4초 전에 예고되고, 두 보스 모두 4가지 패턴을 순환한다.
for(const t of [c,a]){
 const p={attack:1e3,hp:2e5,defense:3000,crit:.5,critDamage:2,boss:2,cadence:1,speed:1,level:t.level,advancement:t.stage-1};
 const b=newTowerBattle(t.floor,'warrior',p,0,'t'+t.stage,1,true);Object.assign(b,{encounter:t,enemyHp:t.hp,advancementStage:t.stage});
 const seen=new Set();
 for(let i=0;i<600&&!b.ended;i++){const before=new Set(b.hazards.map(h=>h.id));towerStep(b,[0,0,0]);for(const h of b.hazards)if(!before.has(h.id)){assert.ok(h.at-b.tick>=14,`${t.name} warning ${h.at-b.tick}`);}seen.add(b.phase);}
 assert.ok(seen.size>=4,t.name+' patterns');
}
console.log('PASS 250·300 전직: 체력 2배(2인), 잠재형 보너스, 패턴 예고 시간');
