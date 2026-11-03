import {BANK_DAY,BANK_RATE_PPM} from './bank-model.mjs';
const fmt=n=>Math.floor(n||0).toLocaleString('ko-KR');
// 2026-11-04 다음 이자 표시를 실제 이율(BANK_RATE_PPM)로 계산 — 예전엔 0.3%로 고정돼 약 7배 크게 보였음.
const BANK_MIN_GOLD=Math.ceil(1000000/BANK_RATE_PPM);
export function bankView(s,now=Date.now()){
 const b=s.bank||{},lots=b.lots||[],total=lots.reduce((n,l)=>n+l.gold,0),due=lots.map(l=>({l,at:l.at+(Math.floor(Math.max(0,now-l.at)/BANK_DAY)+1)*BANK_DAY})),next=due.length?Math.min(...due.map(d=>d.at)):0,
  // 다음 이자 금액 = 다음 시각에 실제로 이자가 붙는 입금분만 (입금 시각이 다르면 붙는 시각도 다름)
  gain=due.filter(d=>d.at===next).reduce((n,d)=>n+Math.floor(d.l.gold*BANK_RATE_PPM/1000000),0),hourly=lots.reduce((n,l)=>n+Math.floor(l.gold*BANK_RATE_PPM/1000000),0);
 return `<div class="bank-panel"><img class="bank-hero" src="ui/bank-v1.webp" alt="황금 은행"><p class="bank-rate">1시간마다 이자 <b>0.0415%</b> · 자동 복리 (하루 약 1% · 10억 맡기면 하루 약 1,000만 G)</p><div class="bank-balance"><small>은행 예금</small><strong>${fmt(total)} G</strong></div><div class="bank-summary"><span>보유 골드 <b>${fmt(s.gold)} G</b></span><span>다음 이자 금액 <b>${fmt(gain)} G</b></span><span>1시간 이자 합계 <b>${fmt(hourly)} G</b></span><span>누적 받은 이자 <b>${fmt(b.interest)} G</b></span>${next?`<span>다음 이자 시각 <b>${new Date(next).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}</b></span>`:''}</div><label class="bank-input-label" for="bank-amount">입출금 금액</label><input id="bank-amount" type="text" inputmode="numeric" autocomplete="off" placeholder="골드 금액 입력"><div class="bank-actions"><button data-action="bankDeposit">입금</button><button data-action="bankWithdraw">출금</button><button data-action="bankDeposit" data-arg="all">전액 입금</button><button data-action="bankWithdraw" data-arg="all">전액 출금</button></div><p class="bank-notice">각 입금액은 입금 시점부터 1시간마다 이자가 붙어요. 접속하지 않은 동안의 이자도 다음 접속 때 자동 반영돼요. 출금은 최근 입금액부터 처리해요. 이자는 골드 정수 단위로 계산하며 ${fmt(BANK_MIN_GOLD)}G 미만 예치금에는 이자가 없어요.</p></div>`;
}
