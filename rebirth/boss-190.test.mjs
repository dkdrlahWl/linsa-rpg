import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {BOSSES,equipmentLevelRange} from './data.mjs';
import {initialState,execute} from './engine.mjs';
const daily=BOSSES[28],weekly=BOSSES[29];
assert.equal(daily.hp,6710000);assert.equal(daily.attack,2447);
assert.equal(daily.seconds,90);assert.equal(daily.dropChance,.05);
assert.equal(weekly.level,190);assert.equal(weekly.gearLevel,190);
assert.deepEqual(equipmentLevelRange(weekly.gearLevel),{min:190,max:190});
for(const roll of [0,.04,.10]){
 const ctx={now:Date.parse('2026-10-03T11:00:00+09:00'),random:()=>roll,uuid:randomUUID};
 let s=initialState('warrior','190보상검증',ctx);s.hunting=false;
 s=execute(s,'boss',{id:29},ctx).state;
 assert.equal(s.battle.encounter.level,190);assert.equal(s.battle.encounter.hp,weekly.hp);
 s.battle.chest={...s.battle.player};s.battle.won=true;s.battle.ended=true;
 s=execute(s,'towerOpen',{runId:s.battle.runId},ctx).state;
 assert.equal(s.lastReward.items.length,1);
 const item=s.items.find(it=>it.id===s.lastReward.items[0]);
 assert.equal(item.level,190);assert.equal(item.boss,true);
 assert.equal(s.lastReward.gold,weekly.gold);assert.equal(s.lastReward.cube,weekly.cubes);
}
console.log('PASS daily difficulty, weekly level, encounter level and actual 190 boss chest equipment');
