// node rebirth/sweep.test.mjs — 2026-11-03 소탕: 깬 적 있는 일보·주보·토큰·열쇠 던전, 개별/전체
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {initialState,execute} from './engine.mjs';
import {BOSSES} from './data.mjs';
import {sweepPlan} from './sweep.mjs';
import {TOKEN_BOSS_STAGES} from './token-content.mjs';
import {KEY_BOSS_STAGES} from './key-dungeon.mjs';
const now=Date.UTC(2026,10,3,6),ctx=(t=now,random=()=>.999)=>({now:t,random,uuid:randomUUID});
const base=()=>{const s=initialState('warrior','소탕',ctx());s.hunting=false;return s;};
// 깬 적 없으면 불가
{const s=base();assert.throws(()=>execute(s,'sweep',{kind:'boss',id:30},ctx()),/SWEEP_NOT_ALLOWED/);assert.throws(()=>execute(s,'sweep',{kind:'all'},ctx()),/SWEEP_NOTHING/);}
// 일보 개별 소탕: 보상 = 승리 보상, 하루 1회
{
 let s=base();s.cleared=[30,33];const gold=s.gold;
 let r=execute(s,'sweep',{kind:'boss',id:33},ctx());s=r.state;const e=r.events.find(x=>x.type==='sweep');
 assert.equal(e.count,1);assert.equal(e.gold,10_000_000);assert.equal(e.highCube,10);assert.equal(e.addCube,3);assert.equal(s.gold,gold+10_000_000);
 assert.equal(s.daily.boss,1);
 assert.throws(()=>execute(s,'sweep',{kind:'boss',id:33},ctx()),/SWEEP_NOT_ALLOWED/,'오늘 이미 받음');
 r=execute(s,'sweep',{kind:'boss',id:33},ctx(now+24*3600e3));assert.equal(r.events[0].count,1,'다음 날 다시');
 // 장비 확률(random 0 → 220제)
 const t=base();t.cleared=[33];const out=execute(t,'sweep',{kind:'boss',id:33},ctx(now,()=>0));assert.equal(out.events[0].items.length,1);assert.equal(out.state.items.find(i=>i.id===out.events[0].items[0]).level,220);
}
// 주보 소탕: 주 1회, 기본 블랙 2
{
 let s=base();s.cleared=[31];let r=execute(s,'sweep',{kind:'boss',id:31},ctx());assert.equal(r.events[0].highCube,2);
 assert.throws(()=>execute(r.state,'sweep',{kind:'boss',id:31},ctx(now+24*3600e3)),/SWEEP_NOT_ALLOWED/);
}
// 토큰·열쇠: 최고 단계 이하만, 하루 2회
{
 let s=base();s.keyBoss={best:5};s.tokenBoss={best:3};
 assert.throws(()=>execute(s,'sweep',{kind:'key',stage:6},ctx()),/SWEEP_NOT_ALLOWED/);
 let r=execute(s,'sweep',{kind:'key',stage:5},ctx());assert.equal(r.events[0].keys,KEY_BOSS_STAGES[4].keys);assert.equal(r.state.materials.dungeonKey,KEY_BOSS_STAGES[4].keys);
 r=execute(r.state,'sweep',{kind:'key',stage:4},ctx());assert.throws(()=>execute(r.state,'sweep',{kind:'key',stage:1},ctx()),/SWEEP_NOT_ALLOWED/,'2회 다 씀');
 assert.equal(r.state.keyBoss.best,5,'최고 기록 유지');
}
// 전체 소탕: 일보·주보만(토큰·열쇠 제외)
{
 let s=base();s.cleared=[0,5,30,31,33];s.bossClaims={0:'2026-11-03'};s.keyBoss={best:4};s.tokenBoss={best:2};
 const r=execute(s,'sweep',{kind:'all'},ctx()),e=r.events[0];
 assert.equal(e.count,4,'0번은 오늘 이미 받음');assert.ok(e.entries.every(x=>x.kind==='boss'));assert.equal(e.keys,0);assert.equal(e.tokens,0);
 assert.equal(e.gold,[5,30,31,33].reduce((n,id)=>n+BOSSES[id].gold,0));
 assert.throws(()=>execute(r.state,'sweep',{kind:'all'},ctx()),/SWEEP_NOTHING/);
 assert.equal(execute(r.state,'sweep',{kind:'key',stage:4},ctx()).events[0].keys,KEY_BOSS_STAGES[3].keys,'열쇠는 개별 소탕');
}
console.log('PASS sweep: cleared-only, daily/weekly limits, token/key best stage, all = bosses only');
