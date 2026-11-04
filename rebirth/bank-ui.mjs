import {bankTermsOpenFor,BANK_DAY,BANK_RATE_PPM,BANK_TERMS,BANK_DAY_MS,BANK_TERM_CANCEL_KEEP,bankTerm,bankTermPayout,bankTermUsed} from './bank-model.mjs';
const fmt=n=>Math.floor(n||0).toLocaleString('ko-KR');
// 2026-11-04 다음 이자 표시를 실제 이율(BANK_RATE_PPM)로 계산 — 예전엔 0.3%로 고정돼 약 7배 크게 보였음.
const BANK_MIN_GOLD=Math.ceil(1000000/BANK_RATE_PPM);
export function bankView(s,now=Date.now(),cancelArm=null){
 const b=s.bank||{},lots=b.lots||[],total=lots.reduce((n,l)=>n+l.gold,0),due=lots.map(l=>({l,at:l.at+(Math.floor(Math.max(0,now-l.at)/BANK_DAY)+1)*BANK_DAY})),next=due.length?Math.min(...due.map(d=>d.at)):0,
  // 다음 이자 금액 = 다음 시각에 실제로 이자가 붙는 입금분만 (입금 시각이 다르면 붙는 시각도 다름)
  gain=due.filter(d=>d.at===next).reduce((n,d)=>n+Math.floor(d.l.gold*BANK_RATE_PPM/1000000),0),hourly=lots.reduce((n,l)=>n+Math.floor(l.gold*BANK_RATE_PPM/1000000),0);
 return `<div class="bank-panel"><img class="bank-hero" src="ui/bank-v1.webp" alt="황금 은행"><p class="bank-rate">1시간마다 이자 <b>0.0415%</b> · 자동 복리 (하루 약 1% · 10억 맡기면 하루 약 1,000만 G)</p><div class="bank-balance"><small>은행 예금</small><strong>${fmt(total)} G</strong></div><div class="bank-summary"><span>보유 골드 <b>${fmt(s.gold)} G</b></span><span>다음 이자 금액 <b>${fmt(gain)} G</b></span><span>1시간 이자 합계 <b>${fmt(hourly)} G</b></span><span>누적 받은 이자 <b>${fmt(b.interest)} G</b></span>${next?`<span>다음 이자 시각 <b>${new Date(next).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}</b></span>`:''}</div><label class="bank-input-label" for="bank-amount">입출금 금액</label><input id="bank-amount" type="text" inputmode="numeric" autocomplete="off" placeholder="골드 금액 입력"><div class="bank-actions"><button data-action="bankDeposit">입금</button><button data-action="bankWithdraw">출금</button><button data-action="bankDeposit" data-arg="all">전액 입금</button><button data-action="bankWithdraw" data-arg="all">전액 출금</button></div><p class="bank-notice">각 입금액은 입금 시점부터 1시간마다 이자가 붙어요. 접속하지 않은 동안의 이자도 다음 접속 때 자동 반영돼요. 출금은 최근 입금액부터 처리해요. 이자는 골드 정수 단위로 계산하며 ${fmt(BANK_MIN_GOLD)}G 미만 예치금에는 이자가 없어요.</p>${termView(s,now,cancelArm)}</div>`;
}
const pct=ppm=>(ppm/10000).toLocaleString('ko-KR',{maximumFractionDigits:2});
const when=t=>new Date(t).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});
const left=ms=>{const m=Math.max(0,Math.ceil(ms/60000)),d=Math.floor(m/1440),h=Math.floor(m%1440/60),mm=m%60;return d?`${d}일 ${h}시간`:h?`${h}시간 ${mm}분`:`${mm}분`;};
// 2026-11-04 정기예금: 하루 복리, 만기에 원금+이자가 보유 골드로 자동 지급, 중도 해지는 이자 없이 원금의 95%.
function termView(s,now,cancelArm){
 if(!bankTermsOpenFor(s)&&!(s.bank?.terms||[]).length)return '';
 const b=s.bank||{},terms=(b.terms||[]).filter(t=>bankTerm(t.product)).sort((a,c)=>a.at+bankTerm(a.product).days*BANK_DAY_MS-(c.at+bankTerm(c.product).days*BANK_DAY_MS));
 const cards=BANK_TERMS.map(p=>{const used=bankTermUsed(b,p.id),room=Math.max(0,p.limit-used),gain=bankTermPayout(1000000000,p)/1000000000-1;
  return `<div class="bank-term-card"><div><b>${p.name}</b><small>하루 ${pct(p.ratePpm)}% 복리 · 만기 <em>+${(gain*100).toFixed(1)}%</em></small><small>남은 한도 ${fmt(room)} / ${fmt(p.limit)} G</small></div><div class="bank-term-buttons"><button data-action="bankTermOpen" data-arg="${p.id}" ${room?'':'disabled'}>가입</button><button data-action="bankTermOpen" data-arg="${p.id}:all" ${room&&s.gold?'':'disabled'}>최대</button></div></div>`;}).join('');
 const list=terms.length?terms.map(t=>{const p=bankTerm(t.product),end=t.at+p.days*BANK_DAY_MS,armed=cancelArm===t.id;
  return `<div class="bank-term-row"><div><b>${p.name}</b><small>원금 ${fmt(t.gold)} G → 만기 <em>${fmt(bankTermPayout(t.gold,p))} G</em></small><small>${now>=end?'만기 · 지급 대기 (보유 골드 한도 확인)':'만기 '+when(end)+' · '+left(end-now)+' 남음'}</small></div><button class="${armed?'danger':''}" data-action="bankTermCancel" data-arg="${t.id}">${armed?`정말 해지 (${fmt(Math.floor(t.gold*BANK_TERM_CANCEL_KEEP))} G 받음)`:'중도 해지'}</button></div>`;}).join(''):'<p class="bank-term-empty">가입한 정기예금이 없어요.</p>';
 return `<section class="bank-terms"><h3>정기예금</h3><p class="bank-term-lead">기간 동안 돈을 묶어두면 하루마다 복리로 이자가 붙어요. 만기가 되면 원금과 이자가 <b>보유 골드로 자동 지급</b>돼요.</p><label class="bank-input-label" for="bank-term-amount">가입 금액</label><input id="bank-term-amount" type="text" inputmode="numeric" autocomplete="off" placeholder="골드 금액 입력">${cards}<h4>가입 중 ${terms.length}건${b.termInterest?` · 누적 받은 이자 ${fmt(b.termInterest)} G`:''}</h4>${list}<p class="bank-notice">중도 해지하면 이자는 없고 원금의 ${Math.round((1-BANK_TERM_CANCEL_KEEP)*100)}%가 수수료로 빠져요. 한도는 상품별로 가입 중인 원금 합계 기준이에요.</p></section>`;
}
