// node rebirth/bank-term.test.mjs — 2026-11-04 정기예금
import assert from 'node:assert/strict';
import {BANK_TERMS_OPEN,bankCommand,settleBank,BANK_TERMS,bankTermPayout,BANK_DAY_MS} from './bank-model.mjs';
import {bankView} from './bank-ui.mjs';
const t0=Date.UTC(2026,10,4,4);
const p=id=>BANK_TERMS.find(x=>x.id===id);
// 만기 수익: 3일 +9.27%, 7일 +28.1%, 14일 +77.9%
assert.equal(bankTermPayout(1000000000,p('d3')),1092727000);
assert.ok(Math.abs(bankTermPayout(1000000000,p('d7'))/1e9-1.2809)<.001);
assert.ok(Math.abs(bankTermPayout(1000000000,p('d14'))/1e9-1.7789)<.001);
// 잠금: 일반 유저는 가입 불가, 화면에도 안 보임
if(!BANK_TERMS_OPEN){assert.throws(()=>bankCommand({gold:100,bank:{}},'bankTermOpen',{product:'d3',amount:10},t0),/INVALID_BANK_TERM_LOCKED/);assert.ok(!bankView({gold:100,bank:{}},t0).includes('정기예금'));}
const s={gold:100000000000,isAdmin:true,bank:{lots:[],interest:0}};
const e=bankCommand(s,'bankTermOpen',{product:'d14',amount:10000000000},t0);
assert.equal(s.gold,90000000000);assert.equal(s.bank.terms.length,1);
// 한도: 14일 200억
assert.throws(()=>bankCommand(s,'bankTermOpen',{product:'d14',amount:10000000001},t0),/INVALID_BANK_TERM_LIMIT/);
bankCommand(s,'bankTermOpen',{product:'d14',amount:'all'},t0);
assert.equal(s.bank.terms.reduce((n,t)=>n+t.gold,0),20000000000);
assert.throws(()=>bankCommand(s,'bankTermOpen',{product:'d14',amount:'all'},t0),/INVALID_BANK_TERM_LIMIT/);
assert.throws(()=>bankCommand(s,'bankTermOpen',{product:'d30',amount:1},t0),/INVALID_BANK_TERM/);
assert.throws(()=>bankCommand({gold:5,isAdmin:true,bank:{}},'bankTermOpen',{product:'d3',amount:6},t0),/INSUFFICIENT_GOLD/);
// 만기 전에는 그대로, 만기 후 자동 지급
settleBank(s,t0+14*BANK_DAY_MS-1);assert.equal(s.bank.terms.length,2);
const before=s.gold;settleBank(s,t0+14*BANK_DAY_MS);
assert.equal(s.bank.terms.length,0);assert.equal(s.gold,before+bankTermPayout(10000000000,p('d14'))*2);
assert.ok(s.bank.termInterest>15000000000);
// 중도 해지: 원금 95%, 이자 없음
const c={gold:1000,isAdmin:true,bank:{}};const o=bankCommand(c,'bankTermOpen',{product:'d7',amount:1000},t0);
bankCommand(c,'bankTermCancel',{id:o.id},t0+3*BANK_DAY_MS);assert.equal(c.gold,950);assert.equal(c.bank.terms.length,0);
assert.throws(()=>bankCommand(c,'bankTermCancel',{id:'nope'},t0),/INVALID_BANK_TERM/);
// 일반 예금은 그대로 동작
const d={gold:1000,bank:{}};bankCommand(d,'bankDeposit',{amount:500},t0);assert.equal(d.gold,500);
// 화면
const v={gold:5,isAdmin:true,bank:{lots:[],interest:0}};bankCommand({...v,gold:100},'bankTermOpen',{product:'d3',amount:10},t0);
const html=bankView({gold:100,isAdmin:true,bank:{lots:[],interest:0,terms:[{id:'x',product:'d7',gold:1000,at:t0}]}},t0,'x');
assert.ok(html.includes('정기예금')&&html.includes('정말 해지')&&html.includes('+28.1%')&&html.includes('+77.9%')&&!html.includes('30일'));
console.log('PASS bank terms: payout, limits, maturity auto-pay, early cancel 95%, view');
