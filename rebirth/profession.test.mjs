// node rebirth/profession.test.mjs — 2026-11-04 전문 직업
import assert from 'node:assert/strict';
import {PROFESSIONS,professionCommand,professionGather,professionCostMultiplier,professionBonusChance,recipeCost,normalizeProfession,PROFESSION_CHANGE_COST,PROFESSION_OPEN,JOB_MATERIALS,rollJobMaterials} from './profession-model.mjs';
import {transcendChance,TRANSCEND_PITY} from './equipment.mjs';
import {TOKEN_SHOP} from './token-content.mjs';
import {REWARD_RATES} from './fishing-data.mjs';
import {consumableCommand,SHOP_DAILY_LIMITS} from './consumables.mjs';
const t0=Date.UTC(2026,10,4,5);
const seq=(...v)=>{let i=0;return()=>v[i++%v.length];};
// 선택 · 비용 배율 · 추가 제작
// 잠금: 일반 유저는 선택·제작 불가
if(!PROFESSION_OPEN)assert.throws(()=>professionCommand({gold:1,materials:{}},'professionChoose',{id:'alchemist'},t0,Math.random),/PROFESSION_LOCKED/);
// 직업 재료 드랍: 4종 랜덤, 총 개수 보존
{const m=rollJobMaterials(40,seq(0.1,0.3,0.6,0.9));assert.deepEqual(m,{essence:10,mapPiece:10,pearl:10,ore:10});}
const s={gold:100000000,isAdmin:true,materials:{fragment:100,cube:50,highCube:20,essence:30,mapPiece:5,ore:9},fishing:{diamonds:30},companions:{tickets:0,pickupTickets:0},treasure:{tickets:0}};
assert.throws(()=>professionCommand(s,'professionCraft',{recipe:'primeCube',count:1},t0,Math.random),/PROFESSION_REQUIRED/);
professionCommand(s,'professionChoose',{id:'alchemist'},t0,Math.random);assert.equal(s.gold,100000000,'first choice free');
assert.equal(professionCostMultiplier(1),1);assert.equal(professionCostMultiplier(10),1);assert.equal(professionBonusChance(10),0);
const r=PROFESSIONS[0].recipes[0];assert.deepEqual(recipeCost(r,1,2,'alchemist'),{materials:{essence:2,highCube:2,cube:4},gold:1400000});
let e=professionCommand(s,'professionCraft',{recipe:'primeCube',count:2},t0,seq(0.5,0.01));
assert.equal(e.bonus,0);assert.equal(s.materials.primeCube,2);assert.equal(s.materials.highCube,18);assert.equal(s.gold,98600000);assert.equal(s.materials.essence,28,'직업 재료 1개/회');
assert.throws(()=>professionCommand(s,'professionCraft',{recipe:'dungeonKey',count:1},t0,Math.random),/INVALID_RECIPE/);
// 숙련도: Lv.1→2 는 10회
for(let i=0;i<8;i++)professionCommand(s,'professionCraft',{recipe:'addCube',count:1},t0,()=>.9);
assert.equal(normalizeProfession(s).level,2);assert.equal(s.materials.essence,20);
// max count (레드 큐브 또는 정수 중 먼저 바닥나는 쪽)
e=professionCommand(s,'professionCraft',{recipe:'addCube',count:'max'},t0,()=>.9);assert.ok(e.count>=1&&(s.materials.cube<2||s.materials.essence<1));
assert.throws(()=>professionCommand({...s,materials:{...s.materials,cube:100,essence:0}},'professionCraft',{recipe:'addCube',count:1},t0,()=>.9),/INSUFFICIENT_MATERIAL/);
// 변경: 쿨타임 · 비용
assert.throws(()=>professionCommand(s,'professionChoose',{id:'miner'},t0+1000,Math.random),/PROFESSION_COOLDOWN/);
s.gold=PROFESSION_CHANGE_COST+5;professionCommand(s,'professionChoose',{id:'miner'},t0+8*86400000,Math.random);
assert.equal(s.gold,5);assert.equal(normalizeProfession(s).level,1);assert.equal(normalizeProfession(s).id,'miner');
// 채집 보너스: Lv.1 50% of listed, 비직업 1
assert.equal(professionGather(s,'fragment'),2.25);assert.equal(professionGather(s,'cube'),1);assert.equal(professionGather({},'fragment'),1);
// 어부 다이아 경로 · 픽업 경로
const f={gold:4200000,isAdmin:true,materials:{cube:10,pearl:2},fishing:{diamonds:20},companions:{tickets:0,pickupTickets:0}};
professionCommand(f,'professionChoose',{id:'fisher'},t0,Math.random);
professionCommand(f,'professionCraft',{recipe:'pickupTicket',count:1},t0,()=>.9);assert.equal(f.companions.pickupTickets,1);assert.equal(f.fishing.diamonds,12);assert.equal(f.gold,0);assert.equal(f.materials.pearl,1);
// 초월 확률 · 천장
assert.deepEqual([0,1,2,3].map(t=>transcendChance({slot:0,bossTier:t,level:220,boss:true})),[1,.7,.5,.3]);
assert.deepEqual([0,1].map(t=>transcendChance({slot:3,bossTier:t,level:220,boss:true})),[1,.6]);assert.equal(TRANSCEND_PITY,3);
// 공급 조정
assert.equal(TOKEN_SHOP.find(o=>o.id==='companionTicket').weekly,20);assert.equal(TOKEN_SHOP.find(o=>o.id==='pickupTicket').weekly,10);assert.equal(TOKEN_SHOP.find(o=>o.id==='dungeonKey'),undefined);
assert.equal(REWARD_RATES.find(r=>r.id==='dungeonKey').chance,.0025);assert.ok(Math.abs(REWARD_RATES.reduce((n,r)=>n+r.chance,0)-1)<1e-9);
assert.deepEqual(SHOP_DAILY_LIMITS,{cube:50,addCube:20});
const sh={gold:1e12,materials:{cube:0,addCube:0}};consumableCommand(sh,'consumableBuy','cube',t0,50);
assert.throws(()=>consumableCommand(sh,'consumableBuy','cube',t0,1),/SHOP_DAILY_LIMIT/);
consumableCommand(sh,'consumableBuy','cube',t0+86400000,1);assert.equal(sh.materials.cube,51);
console.log('PASS profession: choose/craft/bonus/xp/change, gather, transcend odds, supply changes');
// 초월 확률·천장·실패 처리 (engine)
{const {initialState,makeItem,execute,addItem}=await import('./engine.mjs');const {rollBaseStats,bossTier}=await import('./data.mjs');
 let n=0;const C=(rnd)=>({now:Date.UTC(2026,10,4,6),random:rnd,uuid:()=>'p'+(++n),admin:false});
 let st=initialState('warrior','초월',C(()=>0));st.level=250;st.materials.transcendStone=100;
 const w=makeItem(220,'warrior',0,true,C(Math.random));w.baseStats=rollBaseStats(w,Math.random);w.stars=25;addItem(st,w);const W=()=>st.items.find(x=>x.id===w.id);
 st=execute(st,'transcend',{id:w.id},C(()=>0)).state;assert.equal(bossTier(W()),1);W().stars=25; // 1차 100%
 for(let i=0;i<3;i++){const r=execute(st,'transcend',{id:w.id},C(()=>0.99));st=r.state;const e=r.events.find(e=>e.type==='transcend');assert.equal(e.success,false);assert.equal(bossTier(W()),1);assert.equal(W().stars,25);}
 assert.equal(W().transcendFails,3);assert.equal(st.materials.transcendStone,100-2-4*3);
 const r=execute(st,'transcend',{id:w.id},C(()=>0.99));st=r.state;const e=r.events.find(e=>e.type==='transcend');assert.equal(e.pity,true);assert.equal(e.success,true);assert.equal(bossTier(W()),2);assert.equal(W().transcendFails,undefined);
 console.log('PASS transcend odds: fail keeps gear, pity after 3');}
