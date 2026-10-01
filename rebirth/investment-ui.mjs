import {newsUnreadBadge} from './investment-notifications.mjs?v=invest-unread-6';
const names=['도현코인','링구코인','원재코인','민정코인','지원코인','민지코인','성민코인','예찬코인'];
export let selectedCoin=0,investmentAmount='10';
export const selectCoin=id=>{selectedCoin=Math.max(0,Math.min(7,Number(id)||0));};
export const setInvestmentAmount=v=>{investmentAmount=/^\d*$/.test(String(v))?String(v).slice(0,16):'';};
export const resetInvestment=()=>{chartViews.clear();selectedCoin=0;investmentAmount='10';};
const fmt=n=>Math.floor(Number(n)||0).toLocaleString('ko-KR');
const price=n=>Number(n).toLocaleString('ko-KR',{maximumFractionDigits:2});
const signed=n=>(n>=0?'+':'−')+Math.abs(n).toFixed(2)+'%';
const tone=n=>n>=0?'positive':'negative';
const icon=id=>`<span class="invest-coin-art ${id===1?'invest-ringu-owl':''}" style="--cx:${id%4*100/3}%;--cy:${Math.floor(id/4)*100}%" aria-hidden="true"></span>`;
export function positionValue(p,c){return Math.max(0,(p.quantity??p.amount/p.entry)*c.price);}
const chartViews=new Map();
function chartState(c){let v=chartViews.get(c.id);if(!v){v={offset:0,shift:0};chartViews.set(c.id,v);}v.offset=Math.max(0,Math.min(v.offset,Math.max(0,(c.candles?.length||0)-20)));return v;}
export function chartSVG(c){
 const rows=c.candles||[],v=chartState(c);
 if(!rows.length)return '<div class="invest-chart-empty">첫 30분봉은 다음 00분·30분에 생성됩니다.<br>시작 가격 10,000 G</div>';
 const end=rows.length-Math.round(v.offset),data=rows.slice(Math.max(0,end-20),end),vals=data.flatMap(r=>[Number(r.open),Number(r.close)]);
 let lo=Math.min(...vals),hi=Math.max(...vals);const gap=Math.max((hi-lo)*.15,Number(c.price)*.005);lo-=gap;hi+=gap;const range=hi-lo;lo+=v.shift*range;hi+=v.shift*range;
 const W=340,H=125,left=4,right=286,top=8,bottom=103,step=(right-left)/20,y=n=>top+(hi-Number(n))/(hi-lo)*(bottom-top);
 let svg=`<div class="invest-chart-wrap" data-chart-coin="${c.id}"><svg class="invest-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${c.name} 30분봉, 최근 20개 기본 표시, 드래그로 이동"><title>초록 상승, 빨강 하락. 좌우·위아래로 드래그하세요.</title><defs><clipPath id="coin-chart-clip"><rect x="4" y="8" width="282" height="95"/></clipPath></defs>`;
 for(let i=0;i<4;i++){const value=lo+range*i/3,Y=y(value);svg+=`<path d="M4 ${Y}H286" stroke="#29404d" stroke-width=".5"/><text x="290" y="${Y+3}" fill="#a8b7c4" font-size="8">${price(value)}</text>`;}
 svg+='<g clip-path="url(#coin-chart-clip)">';
 data.forEach((r,i)=>{const Y=Math.min(y(r.open),y(r.close)),height=Math.max(1,Math.abs(y(r.open)-y(r.close)));svg+=`<rect class="invest-candle" data-at="${r.at}" x="${left+i*step+.3}" y="${Y}" width="${step-.6}" height="${height}" fill="${r.close>=r.open?'#35da76':'#ee5260'}"/>`;});
 svg+=`<path d="M4 ${y(c.price)}H286" stroke="#e5dfca" stroke-dasharray="3 3" stroke-width=".7"/></g>`;
 data.forEach((r,i)=>{if(i%5===0){const t=new Date(r.at).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false});svg+=`<text x="${left+i*step}" y="119" fill="#a8b7c4" font-size="7">${t}</text>`;}});
 return svg+'</svg></div>';
}
let drag=null;
if(typeof document!=='undefined'){
 document.addEventListener('pointerdown',e=>{const el=e.target.closest?.('.invest-chart-wrap');if(!el||e.button>0)return;const c=chartCoins.get(Number(el.dataset.chartCoin));if(!c)return;const v=chartState(c),box=el.getBoundingClientRect();drag={id:e.pointerId,c,x:e.clientX,y:e.clientY,offset:v.offset,shift:v.shift,width:box.width,height:box.height};e.preventDefault();});
 document.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const v=chartState(drag.c);v.offset=Math.max(0,Math.min(Math.max(0,drag.c.candles.length-20),drag.offset+(e.clientX-drag.x)/drag.width*340/282*20));v.shift=drag.shift+(e.clientY-drag.y)/drag.height*125/95;redrawChart(drag.c);e.preventDefault();},{passive:false});
 const stop=()=>{drag=null;};document.addEventListener('pointerup',stop);document.addEventListener('pointercancel',stop);
 document.addEventListener('click',e=>{if(!e.target.closest?.('[data-chart-latest]'))return;const c=chartCoins.get(selectedCoin);if(c){chartViews.set(c.id,{offset:0,shift:0});redrawChart(c);}});
}
const chartCoins=new Map();
function redrawChart(c){const el=document.querySelector(`.invest-chart-wrap[data-chart-coin="${c.id}"]`);if(el)el.outerHTML=chartSVG(c);}
const escapeHTML=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const koreaDay=v=>new Date(v).toLocaleDateString('sv-SE',{timeZone:'Asia/Seoul'});
const activityTime=v=>new Date(v).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
export function investmentNewsItem(n,now=Date.now()){
 return `<article class="invest-news-item ${n.kind==='good'?'good':'bad'}"><header><b>${n.kind==='good'?'호재':'악재'}</b><time datetime="${escapeHTML(n.publishedAt)}">${activityTime(n.publishedAt)}</time><small>${Date.parse(n.expiresAt)>now?'반영 중':'종료'}</small></header><p>${escapeHTML(names[n.coin])}, ${escapeHTML(n.headline)}</p></article>`;
}
export function investmentNewsView(m){
 const rows=m?.news||[];
 return `<section class="invest-news-feed"><p class="invest-news-intro">대륙 경제 속보 · 한국 시간 기준</p><div class="invest-activity-list">${rows.length?rows.map(n=>investmentNewsItem(n,Date.parse(m.serverNow))).join(''):'<div class="invest-news-empty"><b>아직 발표된 속보가 없습니다</b><p>새로운 소식이 도착하면 여기에 표시됩니다.</p></div>'}<div class="invest-activity-more"></div></div><p class="invest-news-disclaimer">기사 발표 즉시 가격 반영 · 효과 24시간 · 아래로 내려 이전 기사 확인</p></section>`;
}
export function investmentTradeItem(p){
 const profit=Number(p.payout)-Number(p.amount),rate=profit/Number(p.amount)*100,label=profit>0?'수익':profit<0?'손실':'본전',refund=p.reason==='reset'||p.reason==='short_removed';
 return `<article class="invest-trade-item ${tone(profit)}">${icon(p.coin)}<div><strong>${names[p.coin]}</strong><time>${activityTime(p.closedAt)}${refund?' · 환급':''}</time></div><div class="invest-trade-result"><b>${label} ${signed(rate)}</b><span>${label} ${profit>=0?'+':'−'}${fmt(Math.abs(profit))} G</span></div></article>`;
}
export function investmentHistoryView(rows,totals={profit:0,loss:0,pnl:0}){return `<section class="invest-trade-feed"><div class="invest-pnl-summary"><div><small>총 수익</small><strong class="positive">${fmt(totals.profit)} G</strong></div><div><small>총 손실</small><strong class="negative">${fmt(totals.loss)} G</strong></div><div><small>총 PnL</small><strong class="${tone(Number(totals.pnl))}">${Number(totals.pnl)>=0?'+':'−'}${fmt(Math.abs(Number(totals.pnl)))} G</strong></div></div><p class="invest-news-intro">판매 수수료를 뺀 실제 수익·손실</p><div class="invest-activity-list">${rows.length?rows.map(investmentTradeItem).join(''):'<div class="invest-news-empty"><b>거래내역이 없습니다</b><p>판매한 코인의 수익·손실이 여기에 표시됩니다.</p></div>'}<div class="invest-activity-more"></div></div><p class="invest-news-disclaimer">한국 시간 기준 · 아래로 내려 이전 거래 확인</p></section>`;}
export function investmentView(s,m){
 const ready=!!m,coins=m?.coins||names.map((name,id)=>({id,name,price:10000,dayBase:10000,candles:[]})),c=coins[selectedCoin],change=(c.price/c.dayBase-1)*100,blocked=!ready||!!(s.battle||s.coopRoom||s.partyRoom),positions=m?.positions||[];
 coins.forEach(x=>chartCoins.set(x.id,x));
 return `<section class="investment-screen" data-currency-label><h1>코인 거래소</h1><div class="invest-rules invest-news-toolbar"><span>30분마다 · ±30% · 수수료 1%</span><div class="invest-toolbar-actions"><button class="invest-history-button" data-action="investHistory" data-illustrated="1">거래내역</button><button class="invest-news-button" data-action="investNews" data-illustrated="1" aria-label="코인 속보 보기">속보${newsUnreadBadge()}</button></div></div><div class="invest-coins">${coins.map(x=>{const d=(x.price/x.dayBase-1)*100;return `<button data-action="investCoin" data-arg="${x.id}" data-illustrated="1" aria-pressed="${x.id===selectedCoin}" class="invest-coin ${x.id===selectedCoin?'selected':''}">${icon(x.id)}<span><strong>${x.name}</strong><b>${price(x.price)} G</b></span><em title="한국 00시 기준 오늘 등락률" class="${tone(d)}">${signed(d)}${x.price>=Math.floor(x.dayBase*1.3)?'<small>상한가</small>':x.price<=Math.ceil(x.dayBase*.7)?'<small>하한가</small>':''}</em></button>`;}).join('')}</div><div class="invest-trading-panel"><section class="invest-chart-panel"><header>${icon(c.id)}<div><h2>${c.name}</h2><strong>${price(c.price)} G <em class="${tone(change)}">${signed(change)}</em></strong></div><aside><b>30분봉</b><small>다음 갱신 <span id="invest-countdown">—</span></small></aside></header>${chartSVG(c)}<div class="invest-chart-tools"><span>좌우·위아래 드래그 · 최근 20개</span><button type="button" data-chart-latest data-illustrated="1">최신</button></div><div class="invest-day-range">오늘 기준 ${price(c.dayBase)} G · ${c.price>=Math.floor(c.dayBase*1.3)?'상한가 · 00시 해제':c.price<=Math.ceil(c.dayBase*.7)?'하한가 · 00시 해제':'한국 00시 등락률 초기화'}</div></section><section class="invest-order"><div class="invest-amount-row"><label for="invest-amount">구매 수량</label><input id="invest-amount" inputmode="numeric" pattern="[0-9]*" autocomplete="off" value="${investmentAmount}" aria-label="정수 코인 수량"><span>개</span></div><div class="invest-quick">${[25,50,100].map(n=>`<button data-action="investPercent" data-arg="${n}" data-illustrated="1">${n===100?'전액':n+'%'}</button>`).join('')}<small>1개 ${price(c.price)} G · 정수 수량만 거래</small></div><div class="invest-order-buttons"><button class="invest-long" data-action="investBuy" data-arg="long" data-write data-illustrated="1" ${blocked?'disabled':''}>코인 구매</button></div><p class="invest-help">예상 투자 ${fmt(Number(investmentAmount)*c.price)} G · 1배 · 진입 수수료 없음${s.battle||s.coopRoom||s.partyRoom?' · 전투 종료 후 거래 가능':''}</p></section></div><section class="invest-portfolio"><header><h2>내 투자 <small>${positions.length}건</small></h2><small>판매 시 정산액의 1% 차감</small></header>${!ready?'<p class="invest-empty">거래소를 불러오는 중…</p>':positions.length?positions.map(p=>{const x=coins[p.coin],value=positionValue(p,x),profit=value-p.amount,payout=Math.max(0,Math.floor(value-Math.ceil(value*.01)));return `<article>${icon(p.coin)}<div><strong>${x.name}</strong><small>${fmt(p.quantity??p.amount/p.entry)}개 · 투자 ${fmt(p.amount)} G · 평단가 ${price(p.entry)} G</small><small>판매 수령 ${fmt(payout)} G</small></div><b class="${tone(profit)}">${profit>=0?'+':'−'}${fmt(Math.abs(profit))} G<small class="${tone(profit)}">${signed(profit/p.amount*100)}</small></b><button data-action="investSell" data-arg="${p.id}" data-write data-illustrated="1" ${blocked?'disabled':''}>판매</button></article>`;}).join(''):'<p class="invest-empty">보유한 투자가 없습니다. 코인을 선택해 투자하세요.</p>'}</section><details class="invest-history"><summary>판매 내역 · 거래 안내</summary><p>수익과 손실은 구매 가격 대비 현재 가격으로 계산합니다. 오늘 등락률은 한국 시간 00시 기준 가격 대비입니다. ±30% 한도에 닿으면 자정까지 가격을 고정합니다. 00시에는 가격을 유지하고 오늘 등락률을 0%로 초기화하며, 00시 30분부터 30분당 최대 ±5%로 다시 움직입니다. 속보는 발표 즉시 해당 방향으로 3~11% 변동하며, 반대 속보가 나오면 이전 방향의 확률 효과를 없애고 새 효과를 적용합니다.</p>${(m?.history||[]).map(p=>`<p>${names[p.coin]} · ${p.reason==='short_removed'?'숏 종료 환급':p.reason==='reset'?'초기화 환급':p.status==='liquidated'?'청산':'판매'} · 수령 ${fmt(p.payout)} G / 수수료 ${fmt(p.fee)} G</p>`).join('')}</details></section>`;
}
export function updateInvestmentClock(m,loadedAt){const el=document.querySelector('#invest-countdown');if(!el||!m)return;const server=Date.parse(m.serverNow)+(Date.now()-loadedAt),seconds=Math.max(0,Math.ceil((Date.parse(m.nextAt)-server)/1000));el.textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');}
