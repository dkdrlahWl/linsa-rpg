import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {execute,initialState} from './engine.mjs';
import {TREASURE_REWARDS} from './treasure-data.mjs';
assert.ok(Math.abs(TREASURE_REWARDS.reduce((n,r)=>n+r.chance,0)-1)<1e-9);
let now=Date.parse('2026-10-26T12:00:00+09:00');const ctx=()=>({now,random:Math.random,uuid:randomUUID});
let s=initialState('rogue','보물',ctx());s.hunting=false;
// 하루 3판, 진행 중엔 새 판 불가, 빈 가방 수령 불가.
for(let i=0;i<3;i++){s=execute(s,'treasureStart',{},ctx()).state;assert.throws(()=>execute(s,'treasureStart',{},ctx()),/TREASURE_RUN_ACTIVE/);assert.throws(()=>execute(s,'treasureCash',{},ctx()),/TREASURE_EMPTY_BAG/);
 // 안 터질 때까지 판다 → 같은 칸 재선택 거부.
 let cell=0;while(s.treasure.run.status==='digging'&&cell<25){s=execute(s,'treasureDig',{cell},ctx()).state;if(s.treasure.run.status==='digging')assert.throws(()=>execute(s,'treasureDig',{cell},ctx()),/TREASURE_CELL_OPEN/);cell++;}
 const r=s.treasure.run;assert.equal(r.mines.length,3);assert.ok(r.status==='boom'||r.status==='cleared');for(const m of r.mines)assert.ok(!r.opened.some(o=>o.cell===m));}
assert.throws(()=>execute(s,'treasureStart',{},ctx()),/TREASURE_DAILY_LIMIT/);
now+=86400000;s=execute(s,'treasureStart',{},ctx()).state;assert.equal(s.treasure.plays,1,'resets next day');
// 수령: 가방이 그대로 들어온다.
{let t=structuredClone(s);const before={gold:t.gold,...t.materials};let k=0;while(t.treasure.run.opened.length<2&&t.treasure.run.status==='digging')t=execute(t,'treasureDig',{cell:k++},ctx()).state;
 if(t.treasure.run.status==='digging'){t=execute(t,'treasureCash',{},ctx()).state;assert.equal(t.treasure.run.status,'cashed');assert.equal(t.treasure.run.mines.length,3);
  for(const [id,n] of Object.entries(t.treasure.run.got)){if(id==='gold')assert.equal(t.gold-before.gold,n);else if(id!=='bossGear')assert.equal(t.materials[id]-(before[id]||0),n);}}}
// 지뢰 확률: 첫 칸 3/25, 5칸 연속 생존 ≈ 49.6%.
let survive5=0,first=0;const N=40000;for(let i=0;i<N;i++){let t=initialState('rogue','보물',ctx());t.hunting=false;t=execute(t,'treasureStart',{},ctx()).state;for(let c=0;c<5;c++){t=execute(t,'treasureDig',{cell:c},ctx()).state;if(t.treasure.run.status!=='digging'){if(c===0)first++;break;}}if(t.treasure.run.status==='digging')survive5++;}
assert.ok(Math.abs(first/N-.12)<.01,first/N);assert.ok(Math.abs(survive5/N-.4957)<.012,survive5/N);
// 보스장비 상자 → 150~190 보스장비.
{let t=initialState('rogue','보물',ctx());t.hunting=false;t=execute(t,'treasureStart',{},ctx()).state;let n=0;const seq=[.99,.992];t=execute(t,'treasureDig',{cell:0},{...ctx(),random:()=>seq[n++]??.5}).state;assert.equal(t.treasure.run.opened[0].reward,'bossGear');const count=t.items.length;t=execute(t,'treasureCash',{},ctx()).state;assert.equal(t.items.length,count+1);const it=t.items.at(-1);assert.ok(it.boss&&it.level>=150&&it.level<=190);}
console.log('PASS treasure: 3/day, no restart mid-run, 3 mines (12% first cell, 50% survive 5), cash grants bag, boss gear box 150~190');
