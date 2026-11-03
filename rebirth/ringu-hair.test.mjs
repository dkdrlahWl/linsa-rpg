// node rebirth/ringu-hair.test.mjs — 2026-11-03 링구의 머리카락: 거래 불가 장비 → 거래 가능(1회)
import assert from 'node:assert/strict';
import {initialState,execute,makeItem,addItem} from './engine.mjs';
import {rollBaseStats,MATERIALS} from './data.mjs';
let n=0;const ctx=()=>({now:Date.UTC(2026,10,3,6),random:Math.random,uuid:()=>'h'+(++n)});
assert.equal(MATERIALS.ringuHair,'링구의 머리카락');
const s0=initialState('warrior','머리카락',ctx());s0.hunting=false;s0.gold=1e12;s0.materials.ringuHair=2;
const it=makeItem(220,'warrior',2,true,ctx());it.baseStats=rollBaseStats(it,Math.random);it.bound=true;addItem(s0,it);
// 바르면 거래 가능 + 1개 소모
let s=execute(s0,'hairApply',{id:it.id},ctx()).state;let x=s.items.find(i=>i.id===it.id);
assert.equal(x.bound,false);assert.equal(x.hairUnbound,true);assert.equal(s.materials.ringuHair,1);
// 이미 거래 가능한 장비에는 못 바름
assert.throws(()=>execute(s,'hairApply',{id:it.id},ctx()),/ITEM_NOT_BOUND/);
// 220제는 다시 강화하면 거래 불가로 돌아감
s=execute(s,'star',{id:it.id},ctx()).state;x=s.items.find(i=>i.id===it.id);assert.equal(x.bound,true);assert.equal(x.hairUnbound,undefined);
// 머리카락 없으면 실패
const p=structuredClone(s0);p.materials.ringuHair=0;assert.throws(()=>execute(p,'hairApply',{id:it.id},ctx()),/INSUFFICIENT_RINGUHAIR/);
// 시작 장비(Lv.1)는 대상 아님
const st=s0.items.find(i=>i.level===1&&i.bound);if(st)assert.throws(()=>execute(s0,'hairApply',{id:st.id},ctx()),/ITEM_NOT_TRADABLE/);
console.log('PASS ringu hair: unbind once, re-bind on 220 enhance, cost 1');
// 횟수 제한 없음: 강화로 다시 묶이면 또 바를 수 있다
{const t=structuredClone(s0);t.gold=1e12;let u=execute(t,'hairApply',{id:it.id},ctx()).state;u=execute(u,'star',{id:it.id},ctx()).state;u=execute(u,'hairApply',{id:it.id},ctx()).state;const y=u.items.find(i=>i.id===it.id);assert.equal(y.bound,false);assert.equal(u.materials.ringuHair,0);console.log('PASS no per-item limit');}
// 상점 소모품: 1억 G에 구매
{const t=structuredClone(s0);t.gold=250000000;t.materials.ringuHair=0;const u=execute(t,'consumableBuy',{id:'ringuHair',quantity:2},ctx()).state;assert.equal(u.materials.ringuHair,2);assert.equal(u.gold,50000000);console.log('PASS shop 1억');}
