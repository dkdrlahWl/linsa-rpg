// node rebirth/mileage.test.mjs — 2026-11-03 셀리아 마일리지
import assert from 'node:assert/strict';
import {initialState,execute,makeItem,addItem} from './engine.mjs';
import {MILEAGE_SHOP} from './mileage.mjs';
let n=0;const ctx=()=>({now:Date.UTC(2026,10,3,7),random:Math.random,uuid:()=>'m'+(++n)});
let s=initialState('warrior','마일리지',ctx());s.hunting=false;s.gold=1_000_000_000;s.items=[];s.equipped={};
// 소모품 구매 1% 적립
let r=execute(s,'consumableBuy',{id:'cube',quantity:10},ctx());s=r.state;
assert.equal(r.events[0].mileage,20000);assert.equal(s.mileage,20000);
// 소모품 판매 1% 적립 (레드 큐브 개당 5만)
r=execute(s,'consumableSell',{id:'cube',quantity:4},ctx());s=r.state;assert.equal(r.events[0].mileage,2000);assert.equal(s.mileage,22000);
// 보스장비 판매 1% 적립 (200제 무기 4억 → 400만)
const w=makeItem(200,'warrior',0,true,ctx());s.items.push(w);
r=execute(s,'shopSell',{id:w.id},ctx());s=r.state;assert.equal(r.events.find(e=>e.type==='shopSell').mileage,4000000);assert.equal(s.mileage,4022000);
// 마일리지 상점 구매: 재료·동료 소환권·종족 주사위
assert.throws(()=>execute(s,'mileageBuy',{id:'primeCube',quantity:1},ctx()),/INVALID_MILEAGE_ITEM/,'프라임 큐브는 상점 판매 안 함');assert.throws(()=>execute(s,'mileageBuy',{id:'ringuHair',quantity:1},ctx()),/INSUFFICIENT_MILEAGE/);
let t;s.mileage=100_000_000;const before=s.materials.highCube||0;
t=execute(s,'mileageBuy',{id:'highCube',quantity:10},ctx()).state;assert.equal(t.materials.highCube,before+10);assert.equal(t.mileage,97_500_000);
t=execute(t,'mileageBuy',{id:'companionTicket'},ctx()).state;assert.equal(t.companions.tickets>=1,true);assert.equal(t.mileage,87_500_000);
t=execute(t,'mileageBuy',{id:'tribeTicket'},ctx()).state;assert.equal(t.tribeGacha.tickets>=1,true);assert.equal(t.mileage,72_500_000);
assert.throws(()=>execute(t,'mileageBuy',{id:'gold'},ctx()),/INVALID_MILEAGE_ITEM/);
assert.throws(()=>execute(t,'mileageBuy',{id:'cube',quantity:0},ctx()),/INVALID_MILEAGE_QUANTITY/);
// 행운 물약 사용은 적립 없음(골드 거래 아님)
assert.ok(MILEAGE_SHOP.every(o=>o.cost>0));
console.log('PASS mileage: 1% on consumable buy/sell & boss gear sale, mileage shop purchases');
// VIP: 누적 거래액으로 등급, 등급별 마일리지 적립률, 등급 칭호
import {vipTier,mileageRate} from './mileage.mjs';
import {newlyEarnedTitles,TITLE_BY_ID} from './titles-data.mjs';
{
 let v=initialState('warrior','브이아이피',ctx());v.hunting=false;v.gold=10_000_000_000;v.items=[];v.equipped={};
 assert.equal(vipTier(v).level,0);
 v=execute(v,'consumableBuy',{id:'rerollStone',quantity:5},ctx()).state;// 5억 거래
 assert.equal(v.celiaVolume,500_000_000);assert.equal(vipTier(v).level,2);
 assert.equal(mileageRate(v),.02);const m0=v.mileage;v=execute(v,'consumableBuy',{id:'rerollStone',quantity:1},ctx()).state;assert.equal(v.mileage-m0,2_000_000,'VIP 2 → 2% 적립');
 const earned=newlyEarnedTitles({...v,titles:{}},()=>0);assert.ok(earned.includes('vip1')&&earned.includes('vip2')&&!earned.includes('vip3'));
 for(const id of ['vip1','vip2','vip3','vip4','vip5','vip6'])assert.ok(TITLE_BY_ID[id]);
 console.log('PASS VIP tiers, mileage rate, titles');
}
