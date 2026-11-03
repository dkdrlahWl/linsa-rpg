// node rebirth/boss-220.test.mjs — 2026-11-03 Lv.220 일일(10억)·주간(15억) 보스, 220제 보스장비 확정 레벨
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {initialState,execute} from './engine.mjs';
import {BOSSES} from './data.mjs';
const now=Date.UTC(2026,10,3,6),daily=BOSSES[33],weekly=BOSSES[34];
assert.equal(daily.hp,1e9);assert.equal(daily.weekly,false);assert.equal(daily.gearLevel,220);assert.equal(daily.dropChance,.015);assert.ok(daily.exactHalfWeapon);
assert.equal(weekly.hp,1.5e9);assert.equal(weekly.weekly,true);assert.equal(weekly.gearLevel,220);assert.equal(weekly.dropChance,.05);assert.ok(weekly.exactHalfWeapon);
const base=()=>{const s=initialState('warrior','이백이십',{now,random:Math.random,uuid:randomUUID});s.hunting=false;return s;};
// 일일: 승리 시 골드·큐브·블랙·에디셔널, random 0 → 220제 보스장비
{
 const ctx={now,random:()=>0,uuid:randomUUID};let s=execute(base(),'boss',{id:33},ctx).state;s.battle.enemyHp=0;s.battle.won=true;
 const r=execute(s,'sync',{},{...ctx,now:now+1000}),rw=r.events.find(e=>e.type==='boss');
 assert.equal(rw.gold,10_000_000);assert.equal(rw.highCube,10);assert.equal(rw.addCube,3);assert.equal(rw.items.length,1);
 const it=r.state.items.find(i=>i.id===rw.items[0]);assert.equal(it.level,220);assert.equal(it.boss,true);
 assert.equal(r.state.materials.addCube,3);
}
// 주간: 상자 개봉 시 블랙 30(기본 2 대신)·에디셔널 10·잠금석 2, 220제
{
 const ctx={now,random:()=>0,uuid:randomUUID};let s=execute(base(),'boss',{id:34},ctx).state;
 assert.equal(s.battle.enemyHp,1.5e9);s.battle.chest={...s.battle.player};s.battle.won=true;s.battle.ended=true;
 s=execute(s,'towerOpen',{runId:s.battle.runId},ctx).state;const rw=s.lastReward;
 assert.equal(rw.gold,50_000_000);assert.equal(rw.highCube,30);assert.equal(rw.addCube,10);assert.equal(rw.potentialLock,2);
 assert.equal(s.materials.highCube,30);assert.equal(rw.items.length,1);assert.equal(s.items.find(i=>i.id===rw.items[0]).level,220);
}
// 무기 비중: exactHalfWeapon(위에서 확인) → halfWeaponSlot
// 기존 200 주간 보스는 그대로 블랙 큐브 2
{
 const ctx={now,random:()=>.99,uuid:randomUUID};let s=execute(base(),'boss',{id:31},ctx).state;s.battle.chest={...s.battle.player};s.battle.won=true;s.battle.ended=true;
 s=execute(s,'towerOpen',{runId:s.battle.runId},ctx).state;assert.equal(s.lastReward.highCube,2);assert.equal(s.lastReward.addCube,undefined);
}
console.log('PASS Lv.220 bosses: 10억/15억, 220제 1.5%/5%, weapon half, extra materials');
