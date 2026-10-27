import {COMPANION_BY_ID,COMPANION_PASSIVES,COMPANION_SLOTS,COMPANION_BAG,COMPANION_MAX_STAR,COMPANION_CAP_MS,COMPANION_SELL,COMPANION_GRADES,companionRate,companionMaxRate,companionQuality,slotAccrued} from './companion-model.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Math.floor((n||0)+1e-7).toLocaleString('ko-KR');
const GRADE_ORDER=Object.fromEntries(COMPANION_GRADES.map((g,i)=>[g,i]));
const PASSIVE_ICON={gold:'◈',growth:'❧',jackpot:'✤'};
// 화면 상태(서버에 저장하지 않음)
const ui={selected:null,sort:'grade'};
let timer=null;

const data=s=>{const c=s.companions||{};return {tickets:c.tickets||0,cards:Array.isArray(c.cards)?c.cards:[],slots:Array.from({length:COMPANION_SLOTS},(_,i)=>c.slots?.[i]||null)};};
const def=card=>COMPANION_BY_ID[card.c];
const placedAt=(d,id)=>d.slots.findIndex(x=>x&&x.card===id);
// 글자·등급·별은 실제 UI로 표시하고, 제작한 인간 캐릭터 초상화 위에 등급 액자를 겹친다.
const stars=n=>'<span class="cp-stars" aria-label="'+n+'성">★'+n+'</span>';
const portrait=card=>{const d=def(card);return `<span class="cp-portrait"><img class="cp-art" src="companions/${d.id}-human-v1.webp" alt="${esc(d.name)}" loading="lazy" decoding="async"><img class="cp-frame" src="companions/frame-${d.grade.toLowerCase()}-v1.webp" alt="" aria-hidden="true"></span>`;};
const passiveChip=(card,full=false)=>{const p=COMPANION_PASSIVES[card.t];return `<span class="cp-passive cp-${card.t}" title="${esc(p.text(card.v))}"><i aria-hidden="true">${PASSIVE_ICON[card.t]}</i> ${p.name}${full?' '+(card.t==='jackpot'?card.v+'%':'+'+card.v+'%'):''}</span>`;};
const hhmm=ms=>{const m=Math.floor(Math.max(0,ms)/60e3);return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');};

function slotView(d,card,slot,i,now){
 if(!card)return `<div class="cp-slot cp-empty"><b>빈 자리</b><small>아래 가방에서 카드를 고르고<br>배치를 눌러주세요</small></div>`;
 const g=def(card).grade,elapsed=Math.min(COMPANION_CAP_MS,now-slot.claimedAt),gold=slotAccrued(card,slot,now),full=elapsed>=COMPANION_CAP_MS;
 return `<div class="cp-slot cp-g-${g} ${ui.selected===card.i?'selected':''}" data-slot="${i}">
  <button class="cp-slot-card" data-action="companionSelect" data-arg="${card.i}"><span class="cp-grade">${g}</span>${portrait(card)}<span class="cp-name">${esc(def(card).name)} ${stars(card.s)}</span></button>
  <p class="cp-rate"><span class="cp-coin"></span><b data-cp-rate="${i}">${fmt(companionRate(card,now-slot.placedAt))}</b> G / 분</p>
  ${passiveChip(card,true)}
  <small class="cp-label">누적 골드</small>
  <strong class="cp-accrued" data-cp-gold="${i}">${fmt(gold)} G</strong>
  <span class="cp-bar"><i data-cp-bar="${i}" style="width:${elapsed/COMPANION_CAP_MS*100}%"></i></span>
  <small class="cp-time ${full?'full':''}" data-cp-time="${i}">${hhmm(elapsed)} / 08:00</small>
  <button class="cp-claim" data-action="companionClaim" data-arg="${i}" ${gold>0?'':'disabled'}>수령</button>
 </div>`;
}
function cardView(d,card){
 const g=def(card).grade,at=placedAt(d,card.i);
 return `<button class="cp-card cp-g-${g} ${ui.selected===card.i?'selected':''}" data-action="companionSelect" data-arg="${card.i}">
  <span class="cp-grade">${g}</span>${at>=0?'<span class="cp-placed">배치중</span>':''}${portrait(card)}
  <span class="cp-name">${esc(def(card).name)} ${stars(card.s)}</span>
  <span class="cp-rate"><span class="cp-coin"></span>${fmt(companionMaxRate(card))} G / 분</span>
  ${passiveChip(card,true)}
  <small class="cp-quality">최대치 ${companionQuality(card)}%</small>
 </button>`;
}
function sorted(cards){
 const list=[...cards];
 if(ui.sort==='rate')list.sort((a,b)=>companionMaxRate(b)-companionMaxRate(a));
 else list.sort((a,b)=>GRADE_ORDER[def(a).grade]-GRADE_ORDER[def(b).grade]||b.s-a.s||companionMaxRate(b)-companionMaxRate(a));
 return list;
}
function selectedBar(d){
 const card=d.cards.find(x=>x.i===ui.selected);
 if(!card)return `<section class="cp-panel cp-selected-bar cp-hint"><p>카드를 터치하면 상세 정보를 볼 수 있어요.</p></section>`;
 const at=placedAt(d,card.i),p=COMPANION_PASSIVES[card.t],dd=def(card);
 return `<section class="cp-panel cp-selected-bar cp-g-${dd.grade}">
  <span class="cp-thumb">${portrait(card)}</span>
  <div class="cp-detail"><strong>${esc(dd.name)} ${stars(card.s)}</strong><small>${fmt(companionMaxRate(card))} G/분 · ${p.name} ${card.t==='jackpot'?'':'+'}${card.v}%</small><small>최대치 ${companionQuality(card)}%</small></div>
  <div class="cp-actions">
   <button class="cp-btn gold" data-action="${at>=0?'companionUnplace':'companionPlace'}" data-arg="${at>=0?at:card.i}">${at>=0?'해제':'배치'}</button>
   <button class="cp-btn blue" data-action="companionMerge" data-arg="${card.i}" ${card.s>=COMPANION_MAX_STAR?'disabled':''}>합성</button>
   <button class="cp-btn" data-action="companionSell" data-arg="${card.i}" ${at>=0?'disabled':''}>판매</button>
  </div>
 </section>`;
}
export function companionView(s){
 const d=data(s),now=Date.now();
 if(ui.selected!==null&&!d.cards.some(x=>x.i===ui.selected))ui.selected=null;
 if(ui.selected===null)ui.selected=d.slots.find(Boolean)?.card??sorted(d.cards)[0]?.i??null;
 const byId=id=>d.cards.find(x=>x.i===id);
 const placed=d.slots.filter(Boolean).length;
 return `<section class="cp-screen">
  <div class="cp-title"><h1>동료 카드</h1><span>배치한 동료가 골드를 모아요 · 최대 8시간</span></div>
  <section class="cp-panel cp-slots-panel">
   <div class="cp-head"><h2>배치 동료 <b>${placed} / ${COMPANION_SLOTS}</b></h2><small>최대 8시간 누적</small></div>
   <div class="cp-slots">${d.slots.map((slot,i)=>slotView(d,slot&&byId(slot.card),slot,i,now)).join('')}</div>
  </section>
  <section class="cp-panel cp-summon">
   <div class="cp-ticket"><span class="cp-ticket-icon"></span><span>소환권</span><b>${fmt(d.tickets)}장</b></div>
   <button class="cp-summon-btn one" data-action="companionSummon" data-arg="1"><b>1회 소환</b><small><span class="cp-ticket-mini"></span>1</small></button>
   <button class="cp-summon-btn ten" data-action="companionSummon" data-arg="10"><b>10회 소환</b><small><span class="cp-ticket-mini"></span>10</small></button>
  </section>
  <section class="cp-panel cp-bag">
   <div class="cp-head"><h2>동료 가방 <b>${d.cards.length} / ${COMPANION_BAG}</b></h2>
    <div class="cp-tools"><button class="${ui.sort==='grade'?'active':''}" data-action="companionSort" data-arg="grade">등급순</button><button class="${ui.sort==='rate'?'active':''}" data-action="companionSort" data-arg="rate">분당 골드순</button><button data-action="companionBulkSell">일괄 판매</button></div></div>
   ${d.cards.length?`<div class="cp-grid">${sorted(d.cards).map(c=>cardView(d,c)).join('')}</div>`:'<p class="cp-empty-bag">아직 동료가 없어요. 소환권으로 첫 동료를 만나보세요!</p>'}
  </section>
  ${selectedBar(d)}
 </section>`;
}
// 1초마다 누적 골드·시간만 갱신 (화면 전체를 다시 그리지 않음)
// 배치·소환·가방·선택 바가 폰 한 화면에 들어오게 높이를 맞춘다. 가방만 안에서 스크롤.
function fitScreen(){
 const el=document.querySelector('.cp-screen');if(!el)return;
 el.style.height='';el.classList.remove('cp-fit');
 const dock=document.querySelector('.fantasy-dock'),dockH=dock?dock.getBoundingClientRect().height:0;
 const h=Math.floor((window.visualViewport?.height||window.innerHeight)-(el.getBoundingClientRect().top)-dockH-2);
 el.style.height=h+'px';el.classList.add('cp-fit');
 // 너무 작은 화면이면 원래대로 페이지 스크롤.
 if(el.scrollHeight>el.clientHeight+1){el.style.height='';el.classList.remove('cp-fit');}
}
if(typeof window!=='undefined'){window.addEventListener('resize',fitScreen);window.visualViewport?.addEventListener('resize',fitScreen);}
export function updateCompanionTimers(s,root){
 clearInterval(timer);timer=null;
 if(!root?.querySelector('.cp-screen'))return;
 fitScreen();
 const tick=()=>{
  if(!root.isConnected||!root.querySelector('.cp-screen')){clearInterval(timer);timer=null;return;}
  const d=data(s),now=Date.now();
  d.slots.forEach((slot,i)=>{
   const card=slot&&d.cards.find(x=>x.i===slot.card);if(!card)return;
   const elapsed=Math.min(COMPANION_CAP_MS,now-slot.claimedAt),gold=slotAccrued(card,slot,now);
   const set=(k,v)=>{const el=root.querySelector(`[data-cp-${k}="${i}"]`);if(el)el.textContent=v;};
   set('gold',fmt(gold)+' G');set('time',hhmm(elapsed)+' / 08:00');set('rate',fmt(companionRate(card,now-slot.placedAt)));
   const bar=root.querySelector(`[data-cp-bar="${i}"]`);if(bar)bar.style.width=elapsed/COMPANION_CAP_MS*100+'%';
   const btn=root.querySelector(`[data-action="companionClaim"][data-arg="${i}"]`);if(btn)btn.disabled=!(gold>0);
  });
 };
 timer=setInterval(tick,1000);
}

const resultCard=card=>{const g=def(card).grade;return `<div class="cp-card cp-g-${g} cp-reveal"><span class="cp-grade">${g}</span>${portrait(card)}<span class="cp-name">${esc(def(card).name)} ${stars(card.s)}</span><span class="cp-rate"><span class="cp-coin"></span>${fmt(companionMaxRate(card))} G / 분</span>${passiveChip(card,true)}<small class="cp-quality">최대치 ${companionQuality(card)}%</small></div>`;};
const ev=(r,type)=>r?.result?.events?.find(e=>e.type===type);
const claimText=c=>c&&c.gold>0?(c.jackpot?'🍀 대박! ':'')+fmt(c.gold)+' G 수령':'';

// api: {state, command, open, close, toast, render}
export async function companionAction(action,arg,api){
 const s=api.state(),d=data(s);
 if(action==='companionSelect'){ui.selected=Number(arg);return api.render();}
 if(action==='companionSort'){ui.sort=arg==='rate'?'rate':'grade';return api.render();}
 if(action==='companionSummon'){
  const count=arg==='10'?10:1;
  if(!s.isAdmin&&d.tickets<count)return api.toast(`소환권이 부족해요. (보유 ${d.tickets}장)`);
  if(d.cards.length+count>COMPANION_BAG)return api.toast('동료 가방이 가득 찼어요. 카드를 판매하거나 합성해 주세요.');
  const r=await api.command('companionSummon',{count});const e=ev(r,'companionSummon');if(!e)return;
  const best=Math.min(...e.cards.map(c=>GRADE_ORDER[def(c).grade]));
  api.open(count===10?'10회 소환 결과':'소환 결과',`<div class="cp-result ${best<=1?'rare':''}">${e.cards.map(resultCard).join('')}</div><button class="cp-btn gold cp-wide" data-action="close">확인</button>`,true,'companion-dialog');
  return;
 }
 if(action==='companionClaim'){const r=await api.command('companionClaim',{slot:Number(arg)});const e=ev(r,'companionClaim');if(e?.gold>0)api.toast(claimText(e));return;}
 if(action==='companionUnplace'){const r=await api.command('companionUnplace',{slot:Number(arg)});const e=ev(r,'companionUnplace');api.toast(['배치를 해제했어요.',claimText(e?.claim)].filter(Boolean).join(' '));return;}
 if(action==='companionPlace'||action==='companionPlaceAt'){
  const [idText,slotText]=String(arg).split(':'),id=Number(idText);
  let slot=slotText!==undefined?Number(slotText):d.slots.findIndex(x=>!x);
  if(slot<0){
   // 3칸이 다 찼으면 바꿀 칸을 고른다. 빠지는 카드의 골드는 자동 수령.
   api.open('바꿀 자리 선택',`<p class="note">빠지는 동료가 모은 골드는 자동으로 수령돼요.</p><div class="cp-swap">${d.slots.map((x,i)=>{const c=d.cards.find(y=>y.i===x.card);return `<button class="cp-card cp-g-${def(c).grade}" data-action="companionPlaceAt" data-arg="${id}:${i}"><span class="cp-grade">${def(c).grade}</span>${portrait(c)}<span class="cp-name">${esc(def(c).name)}</span><span class="cp-rate">${fmt(companionMaxRate(c))} G / 분</span></button>`;}).join('')}</div>`,true,'companion-dialog');
   return;
  }
  api.close();
  const r=await api.command('companionPlace',{slot,id});const e=ev(r,'companionPlace');if(e)api.toast(['배치했어요.',claimText(e.claim)].filter(Boolean).join(' '));return;
 }
 if(action==='companionMerge'||action==='companionMergeConfirm'){
  const main=d.cards.find(x=>x.i===Number(arg));if(!main)return;
  if(main.s>=COMPANION_MAX_STAR)return api.toast('이미 최대 ★5예요.');
  const need=main.s;
  // 재료는 같은 캐릭터 중 배치 안 된 카드에서, 옵션이 낮은 것부터 자동으로 고른다.
  const mats=d.cards.filter(x=>x.c===main.c&&x.i!==main.i&&placedAt(d,x.i)<0).sort((a,b)=>a.s-b.s||companionQuality(a)-companionQuality(b)).slice(0,need);
  if(mats.length<need)return api.toast(`★${main.s}→★${main.s+1} 합성에는 같은 ${def(main).name} 카드 ${need}장이 필요해요. (보유 ${mats.length}장)`);
  if(action==='companionMerge'){
   api.open('합성',`<p class="cp-merge-line"><b>${esc(def(main).name)}</b> ★${main.s} → <b class="up">★${main.s+1}</b> · 분당 골드 +15%</p><p class="note">아래 카드 ${need}장이 재료로 사라져요. (옵션이 낮은 카드부터 자동 선택)</p><div class="cp-result">${mats.map(resultCard).join('')}</div><button class="cp-btn blue cp-wide" data-action="companionMergeConfirm" data-arg="${main.i}">합성하기</button>`,true,'companion-dialog');
   return;
  }
  api.close();
  const r=await api.command('companionMerge',{id:main.i,materials:mats.map(x=>x.i)});const e=ev(r,'companionMerge');if(e)api.toast(`합성 성공! ${def(main).name} ★${e.star}`);return;
 }
 if(action==='companionSell'||action==='companionSellConfirm'){
  const card=d.cards.find(x=>x.i===Number(arg));if(!card)return;
  const price=COMPANION_SELL[def(card).grade]*card.s;
  if(action==='companionSell'){api.open('동료 판매',`<p><b>${esc(def(card).name)}</b> ★${card.s} (${def(card).grade}급)을 ${fmt(price)} G에 판매할까요?</p><button class="cp-btn cp-wide" data-action="companionSellConfirm" data-arg="${card.i}">판매하기</button>`,true,'companion-dialog');return;}
  api.close();ui.selected=null;
  const r=await api.command('companionSell',{ids:[card.i]});const e=ev(r,'companionSell');if(e)api.toast(fmt(e.gold)+' G에 판매했어요.');return;
 }
 if(action==='companionBulkSell'){
  const counts=Object.fromEntries(COMPANION_GRADES.map(g=>[g,d.cards.filter(x=>def(x).grade===g&&placedAt(d,x.i)<0).length]));
  api.open('일괄 판매',`<p class="note">선택한 등급의 카드를 한 번에 판매해요. 배치 중인 카드는 빠져요.</p><div class="cp-bulk">${[...COMPANION_GRADES].reverse().map(g=>`<button class="cp-g-${g}" data-action="companionBulkGrade" data-arg="${g}" ${counts[g]?'':'disabled'}><span class="cp-grade">${g}</span><b>${counts[g]}장</b><small>장당 ${fmt(COMPANION_SELL[g])} G~</small></button>`).join('')}</div>`,true,'companion-dialog');
  return;
 }
 if(action==='companionBulkGrade'||action==='companionBulkConfirm'){
  const g=arg,list=d.cards.filter(x=>def(x).grade===g&&placedAt(d,x.i)<0);if(!list.length)return;
  const gold=list.reduce((n,x)=>n+COMPANION_SELL[g]*x.s,0);
  if(action==='companionBulkGrade'){api.open('일괄 판매 확인',`<p>${g}급 카드 <b>${list.length}장</b>을 <b>${fmt(gold)} G</b>에 판매할까요?</p><button class="cp-btn cp-wide" data-action="companionBulkConfirm" data-arg="${g}">판매하기</button>`,true,'companion-dialog');return;}
  api.close();
  const r=await api.command('companionSell',{ids:list.map(x=>x.i)});const e=ev(r,'companionSell');if(e)api.toast(`${e.count}장을 ${fmt(e.gold)} G에 판매했어요.`);return;
 }
}
