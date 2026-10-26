import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {execute,initialState} from './engine.mjs';
import {TREASURE_REWARDS} from './treasure-data.mjs';
import {treasureTicketDrop} from './treasure-model.mjs';
assert.ok(Math.abs(TREASURE_REWARDS.reduce((n,r)=>n+r.chance,0)-1)<1e-9);
let now=Date.parse('2026-10-26T12:00:00+09:00');const ctx=()=>({now,random:Math.random,uuid:randomUUID,accountId:'a'});
let s=initialState('rogue','보물',ctx());s.hunting=false;
s.treasure={tickets:4};
const finish=()=>{let cell=0;while(s.treasure.run.status==='digging'&&cell<25){s=execute(s,'treasureDig',{cell},ctx()).state;if(s.treasure.run.status==='digging')assert.throws(()=>execute(s,'treasureDig',{cell},ctx()),/TREASURE_CELL_OPEN/);cell++;}
 const r=s.treasure.run;assert.equal(r.mines.length,3);assert.ok(r.status==='boom'||r.status==='cleared');for(const m of r.mines)assert.ok(!r.opened.some(o=>o.cell===m));};
// 하루 3판 무료 (티켓 안 씀), 진행 중엔 새 판 불가, 빈 가방 수령 불가.
for(let i=0;i<3;i++){const ev=execute(s,'treasureStart',{},ctx());s=ev.state;assert.equal(ev.events.at(-1).free,true);assert.throws(()=>execute(s,'treasureStart',{},ctx()),/TREASURE_RUN_ACTIVE/);assert.throws(()=>execute(s,'treasureCash',{},ctx()),/TREASURE_EMPTY_BAG/);finish();}
assert.equal(s.treasure.tickets,4);assert.equal(s.treasure.plays,3);
// 무료 판 이후엔 티켓 1장당 1판, 하루 횟수 제한 없음.
for(let i=0;i<4;i++){const ev=execute(s,'treasureStart',{},ctx());s=ev.state;assert.equal(ev.events.at(-1).free,false);finish();}
assert.equal(s.treasure.tickets,0);assert.throws(()=>execute(s,'treasureStart',{},ctx()),/TREASURE_TICKET_REQUIRED/);
s.treasure.tickets=7;
now+=86400000;s=execute(s,'treasureStart',{},ctx()).state;assert.equal(s.treasure.plays,1,'resets next day');assert.equal(s.treasure.tickets,7,'free run keeps tickets');
{const z=initialState('rogue','보물',ctx());z.hunting=false;z.treasure={tickets:0};const e=execute(z,'treasureStart',{},ctx());assert.equal(e.events.at(-1).free,true,'no ticket needed for free runs');}
// 수령: 가방이 그대로 들어온다.
{let t=structuredClone(s);const before={gold:t.gold,...t.materials};let k=0;while(t.treasure.run.opened.length<2&&t.treasure.run.status==='digging')t=execute(t,'treasureDig',{cell:k++},ctx()).state;
 if(t.treasure.run.status==='digging'){t=execute(t,'treasureCash',{},ctx()).state;assert.equal(t.treasure.run.status,'cashed');assert.equal(t.treasure.run.mines.length,3);
  for(const [id,n] of Object.entries(t.treasure.run.got)){if(id==='gold')assert.equal(t.gold-before.gold,n);else if(id!=='bossGear')assert.equal(t.materials[id]-(before[id]||0),n);}}}
// 지뢰 확률: 첫 칸 3/25, 5칸 연속 생존 ≈ 49.6%.
let survive5=0,first=0;const N=40000;for(let i=0;i<N;i++){let t=initialState('rogue','보물',ctx());t.hunting=false;t.treasure={tickets:1};t=execute(t,'treasureStart',{},ctx()).state;for(let c=0;c<5;c++){t=execute(t,'treasureDig',{cell:c},ctx()).state;if(t.treasure.run.status!=='digging'){if(c===0)first++;break;}}if(t.treasure.run.status==='digging')survive5++;}
assert.ok(Math.abs(first/N-.12)<.01,first/N);assert.ok(Math.abs(survive5/N-.4957)<.012,survive5/N);
// 보스장비 상자 → 150~190 보스장비.
{let t=initialState('rogue','보물',ctx());t.hunting=false;t.treasure={tickets:1};t=execute(t,'treasureStart',{},ctx()).state;let n=0;const seq=[.99,.992];t=execute(t,'treasureDig',{cell:0},{...ctx(),random:()=>seq[n++]??.5}).state;assert.equal(t.treasure.run.opened[0].reward,'bossGear');const count=t.items.length;t=execute(t,'treasureCash',{},ctx()).state;assert.equal(t.items.length,count+1);const it=t.items.at(-1);assert.ok(it.boss&&it.level>=150&&it.level<=190);}
// 낚시 티켓: 낚을 때마다 0.92% (600번이면 평균 5.5장), 일일 상한 없음.
{const f={treasure:{}};let n=0;for(let i=0;i<20;i++)if(treasureTicketDrop(f,now,()=>0))n++;assert.equal(n,20);
 assert.equal(treasureTicketDrop({treasure:{}},now,()=>.0092),false);assert.equal(treasureTicketDrop({treasure:{}},now,()=>.0091),true);
 let total=0;const R=2000;for(let d=0;d<R;d++){const g={treasure:{}};for(let i=0;i<600;i++)if(treasureTicketDrop(g,now,Math.random))total++;}assert.ok(Math.abs(total/R-5.52)<.2,String(total/R));}
{let t=initialState('rogue','낚시티켓',ctx());t.hunting=false;t.level=200;t.fishing={version:1,rod:70,xp:0,diamonds:0,bait:{worm:5000},fish:[],aquarium:[],slots:3,bank:0,bankAt:now,collection:{},daily:{},cast:null,lastCatch:null};
 let got=0;for(let i=0;i<400;i++){t=execute(t,'fishCast',{spot:'brook',bait:'worm',protocol:4},ctx()).state;const c=t.fishing.cast;now=c.biteAt;t=execute(t,'fishHook',{id:c.id},ctx()).state;if(t.fishing.lastCatch.treasureTicket)got++;if(t.fishing.fish.length>100)t.fishing.fish=[];}
 assert.equal(got,t.treasure.ticketsToday);assert.equal(got,t.treasure.tickets);}
console.log('PASS treasure: tickets from fishing (0.92%/catch, ~5.5 per 600), 3 free runs/day then 1 ticket per run (no cap), no restart mid-run, 3 mines (12% first cell, 50% survive 5), cash grants bag, boss gear box 150~190');
