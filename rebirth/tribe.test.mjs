// node rebirth/tribe.test.mjs
import assert from 'node:assert/strict';
import {initialState,execute,power} from './engine.mjs';
import {TRIBES,TRIBE_GRADES,rollTribe,tribeChance} from './tribe-data.mjs';
let n=0;const ctx=(now,admin=false,random=Math.random)=>({now,random,uuid:()=>'t'+(++n),admin});
const t0=Date.UTC(2026,10,2,3);
const base=initialState('warrior','종족',ctx(t0));
// 확률 합 1, 인간은 뽑기에 없음, 21종
assert.ok(Math.abs(TRIBE_GRADES.reduce((a,g)=>a+g.chance,0)-1)<1e-12);
assert.equal(TRIBES.filter(t=>t.grade!=='start').length,21);
assert.ok(Math.abs(TRIBES.reduce((a,t)=>a+tribeChance(t),0)-1)<1e-12);
// 시작은 인간, 뽑기권 없으면 실패
let s=execute(base,'sync',{},ctx(t0)).state;assert.equal(s.tribe,'human');
assert.throws(()=>execute(s,'tribeRoll',{},ctx(t0)),/TRIBE_TICKET_REQUIRED/);
// 교환소에서 뽑기권 구매(100토큰, 하루 5장)
s.tokens=1000;s=execute(s,'tokenShopBuy',{id:'tribeTicket',quantity:3},ctx(t0)).state;assert.equal(s.tribeGacha.tickets,3);assert.equal(s.tokens,550);
assert.throws(()=>execute(s,'tokenShopBuy',{id:'tribeTicket'},ctx(t0)),/TOKEN_DAILY_LIMIT/);
// 뽑기 → 보류 → 다시 뽑기 불가 → 이후 선택하면 바뀜, 이전 선택하면 그대로
const p0=power(s);
let r=execute(s,'tribeRoll',{},ctx(t0,false,()=>0.999));s=r.state;const ev=r.events.find(e=>e.type==='tribeRoll');
assert.equal(ev.grade,'common');assert.equal(s.tribeGacha.tickets,2);assert.equal(s.tribe,'human');
assert.throws(()=>execute(s,'tribeRoll',{},ctx(t0)),/TRIBE_PENDING/);
s=execute(s,'tribeChoose',{take:true},ctx(t0)).state;assert.equal(s.tribe,ev.id);assert.equal(s.tribeGacha.pending,null);
s=execute(s,'tribeRoll',{},ctx(t0,false,()=>0.0001)).state;assert.equal(s.tribeGacha.pending.id.length>0,true);
const kept=s.tribe;s=execute(s,'tribeChoose',{take:false},ctx(t0)).state;assert.equal(s.tribe,kept);
// 능력치: 신족이면 공격력·HP·보스·치명 오름(합연산)
const div=structuredClone(s);div.tribe='divine';const pd=power(div),ph=power({...structuredClone(s),tribe:'human'});
assert.ok(pd.attack>ph.attack&&pd.hp>ph.hp&&pd.boss>ph.boss&&pd.crit>ph.crit);
assert.equal(Math.round((pd.bonuses.attack-ph.bonuses.attack)*100)/100,9);
// 마족: HP 감소
const dm=structuredClone(s);dm.tribe='demon';assert.ok(power(dm).hp<ph.hp);
// 확률: 희귀 10.5% · 영웅 2.4%
assert.equal(TRIBE_GRADES.find(g=>g.id==='rare').chance,.105);assert.equal(TRIBE_GRADES.find(g=>g.id==='epic').chance,.024);
// 몬테카를로 분포 + 엔진 천장 동작
const counts={};for(let i=0;i<400000;i++){const g=rollTribe(Math.random).tribe.grade;counts[g]=(counts[g]||0)+1;}
for(const g of TRIBE_GRADES.filter(g=>g.chance))assert.ok(Math.abs(counts[g.id]/400000-g.chance)<Math.max(.003,g.chance*.15),g.id+' '+counts[g.id]);
// 전투 중 불가
const b=structuredClone(s);b.battle={kind:'boss'};b.tribeGacha.tickets=1;assert.throws(()=>execute(b,'tribeRoll',{},ctx(t0)));
console.log('tribe ok',counts);
