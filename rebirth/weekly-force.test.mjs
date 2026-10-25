import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {initialState,execute} from './engine.mjs';
// 운영자 지정 드롭: 시각 전엔 안 터지고, 이후 첫 주간보스(31) 클리어에서 무기 아닌 200제 확정, 한 번만.
const after=Date.parse('2026-10-26T00:00:00+09:00');
function clear(s,now){const ctx={now,random:()=>.9,uuid:randomUUID};s=execute(s,'boss',{id:31},ctx).state;s.battle.chest={...s.battle.player};s.battle.won=true;s.battle.ended=true;return execute(s,'towerOpen',{runId:s.battle.runId},ctx).state;}
const base=()=>{const ctx={now:after-3600e3,random:Math.random,uuid:randomUUID};const s=initialState('priest','강제드롭',ctx);s.hunting=false;s.adminNextBossGear={bossId:31,after};return s;};
let s=clear(base(),after-1000);assert.equal(s.lastReward.items.length,0);assert.ok(s.adminNextBossGear,'not consumed before the time');
for(let i=0;i<30;i++){let t=clear(base(),after+1000);assert.equal(t.lastReward.items.length,1);const it=t.items.find(x=>x.id===t.lastReward.items[0]);assert.equal(it.level,200);assert.equal(it.boss,true);assert.ok(it.slot>=1&&it.slot<=8,'slot '+it.slot);assert.equal(t.adminNextBossGear,undefined);}
console.log('PASS admin forced weekly 200 drop: waits for time, non-weapon 200 boss gear once');
