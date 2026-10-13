import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {BOSSES} from './data.mjs';
import {initialState,execute,halfWeaponSlot} from './engine.mjs';
const boss=BOSSES[30];
assert.equal(boss.level,200);assert.equal(boss.gearLevel,200);assert.equal(boss.weekly,false);
assert.equal(boss.dropChance,.015);assert.equal(boss.gearRateScale,1);
assert.equal(boss.hp,90000000);assert.equal(boss.seconds,90);
const now=Date.parse('2026-10-13T15:00:00+09:00');
for(const [roll,drops] of [[0,1],[.014999,1],[.015,0],[.02,0]]){
 const ctx={now,uuid:randomUUID,random:()=>roll};let s=initialState('warrior','보상검증',ctx);s.hunting=false;
 s=execute(s,'boss',{id:30},ctx).state;s.battle.enemyHp=0;
 s=execute(s,'sync',{},ctx).state;assert.equal(s.lastReward.items.length,drops);
 if(drops){const it=s.items.find(x=>x.id===s.lastReward.items[0]);assert.equal(it.level,200);assert.equal(it.boss,true);}
 assert.throws(()=>execute(s,'boss',{id:30},ctx),/BOSS_LIMIT/);
 const p=execute(s,'boss',{id:30,practice:true},ctx).state;p.battle.enemyHp=0;
 assert.equal(execute(p,'sync',{},ctx).state.lastReward.items.length,0);
}
const counts=Array(9).fill(0);for(let i=0;i<17000;i++)counts[halfWeaponSlot(()=> (i+.5)/17000)]++;
assert.deepEqual(counts,[1000,...Array(8).fill(2000)]);
console.log('PASS 200 daily boss: exact 1.5% drop boundary, 200 gear, 1:2 weapon weights, claim protection and practice');
