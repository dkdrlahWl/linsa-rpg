import {PICKUP_COMPANION,PICKUP_RATE,PICKUP_PITY,companionPassiveDef,companionPassiveValueChance,COMPANIONS,COMPANION_GRADE_RATES,companionSummonChance,COMPANION_BY_ID,COMPANION_PASSIVES,COMPANION_SLOTS,COMPANION_BAG,COMPANION_MAX_STAR,COMPANION_CAP_MS,COMPANION_SELL,COMPANION_GRADES,companionRate,companionMaxRate,companionQuality,slotAccrued} from './companion-model.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Math.floor((n||0)+1e-7).toLocaleString('ko-KR');
const GRADE_ORDER=Object.fromEntries(COMPANION_GRADES.map((g,i)=>[g,i]));
const PASSIVE_ICON={gold:'◈',growth:'❧',jackpot:'✤'};
// 화면 상태(서버에 저장하지 않음)
const ui={selected:null,sort:'grade',banner:'normal'};
let timer=null;

const data=s=>{const c=s.companions||{};return {pickupPity:c.pickupPity||0,pickupTickets:c.pickupTickets||0,tickets:c.tickets||0,cards:Array.isArray(c.cards)?c.cards:[],slots:Array.from({length:COMPANION_SLOTS},(_,i)=>c.slots?.[i]||null)};};
const def=card=>COMPANION_BY_ID[card.c];
const placedAt=(d,id)=>d.slots.findIndex(x=>x&&x.card===id);
// 글자·등급·별은 실제 UI로 표시하고, 제작한 인간 캐릭터 초상화 위에 등급 액자를 겹친다.
const stars=n=>'<span class="cp-stars" aria-label="'+n+'성">★'+n+'</span>';
const portrait=card=>{const d=def(card);return `<span class="cp-portrait"><img class="cp-art" src="companions/${d.id}-human-v1.webp" alt="${esc(d.name)}" loading="lazy" decoding="async"><img class="cp-frame" src="companions/frame-${d.grade.toLowerCase()}-v1.webp" alt="" aria-hidden="true"></span>`;};
const passiveChip=(card,full=false)=>{const p=companionPassiveDef(card);return `<span class="cp-passive cp-${card.t}" title="${esc(p.text(card.v).replace('+10%',def(card).pickup?'+20%':'+10%'))}"><i aria-hidden="true">${PASSIVE_ICON[card.t]}</i> ${p.name}${full?' '+(card.t==='jackpot'?card.v+'%':'+'+card.v+'%'):''}</span>`;};
const hhmm=ms=>{const m=Math.floor(Math.max(0,ms)/60e3);return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');};

function slotView(d,card,slot,i,now){
 if(!card)return `<div class="cp-slot cp-empty"><b>빈 자리</b><small>아래 가방에서 카드를 고르고<br>배치를 눌러주세요</small></div>`;
 const g=def(card).grade,elapsed=Math.min(COMPANION_CAP_MS,now-slot.claimedAt),gold=slotAccrued(card,slot,now),full=elapsed>=COMPANION_CAP_MS;
 return `<div class="cp-slot cp-g-${g} ${ui.selected===card.i?'selected':''}" data-slot="${i}">
  <button data-illustrated="1" class="cp-slot-card" data-action="companionSelect" data-arg="${card.i}"><span class="cp-grade">${g}</span>${portrait(card)}<span class="cp-name">${esc(def(card).name)} ${stars(card.s)}</span></button>
  <p class="cp-rate"><span class="cp-coin"></span><b data-cp-rate="${i}">${fmt(companionRate(card,now-slot.placedAt))}</b> G / 분</p>
  ${passiveChip(card,true)}
  <small class="cp-label">누적 골드</small>
  <strong class="cp-accrued" data-cp-gold="${i}">${fmt(gold)} G</strong>
  <span class="cp-bar"><i data-cp-bar="${i}" style="width:${elapsed/COMPANION_CAP_MS*100}%"></i></span>
  <small class="cp-time ${full?'full':''}" data-cp-time="${i}">${hhmm(elapsed)} / 08:00</small>
  <button data-illustrated="1" class="cp-claim" data-action="companionClaim" data-arg="${i}" ${gold>0?'':'disabled'}>수령</button>
 </div>`;
}
function cardView(d,card){
 const g=def(card).grade,at=placedAt(d,card.i);
 return `<button data-illustrated="1" class="cp-card cp-g-${g} ${ui.selected===card.i?'selected':''}" data-action="companionSelect" data-arg="${card.i}">
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
 const at=placedAt(d,card.i),p=companionPassiveDef(card),dd=def(card);
 return `<section class="cp-panel cp-selected-bar cp-g-${dd.grade}">
  <span class="cp-thumb">${portrait(card)}</span>
  <div class="cp-detail"><strong>${esc(dd.name)} ${stars(card.s)}</strong><small>${fmt(companionMaxRate(card))} G/분 · ${p.name} ${card.t==='jackpot'?'':'+'}${card.v}%</small><small>최대치 ${companionQuality(card)}%</small></div>
  <div class="cp-actions">
   <button data-illustrated="1" class="cp-btn gold" data-action="${at>=0?'companionUnplace':'companionPlace'}" data-arg="${at>=0?at:card.i}">${at>=0?'해제':'배치'}</button>
   <button data-illustrated="1" class="cp-btn blue" data-action="companionMerge" data-arg="${card.i}" ${card.s>=COMPANION_MAX_STAR?'disabled':''}>합성</button>
   <button data-illustrated="1" class="cp-btn" data-action="companionSell" data-arg="${card.i}" ${at>=0?'disabled':''}>판매</button>
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
   <button data-illustrated="1" class="cp-ticket cp-help-button" data-action="companionHelp" aria-label="효과·확률 안내"><span>효과·확률 안내</span><b>소환권 ${fmt(d.tickets)}장</b></button>
   <button data-illustrated="1" class="cp-summon-btn cp-open-summon" data-action="companionSummonOpen"><b>소환</b><small>일반 · 픽업 소환</small></button>
   <button data-illustrated="1" class="cp-summon-btn cp-auto-equip" data-action="companionAutoEquip" ${d.cards.length?'':'disabled'} title="별·패시브와 현재 성장 상태를 반영한 8시간 기대 골드 기준"><b>최적 장착</b><small>패시브 반영</small></button>
  </section>
  <section class="cp-panel cp-bag">
   <div class="cp-head"><h2>동료 가방 <b>${d.cards.length} / ${COMPANION_BAG}</b></h2>
    <div class="cp-tools"><button data-illustrated="1" class="${ui.sort==='grade'?'active':''}" data-action="companionSort" data-arg="grade">등급순</button><button data-illustrated="1" class="${ui.sort==='rate'?'active':''}" data-action="companionSort" data-arg="rate">분당 골드순</button><button data-illustrated="1" data-action="companionBulkSell">일괄 판매</button></div></div>
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

let pending=false,revealSession=null;
async function sendCompanion(api,command,args){
 pending=true;
 document.querySelectorAll('[data-action^="companion"]').forEach(b=>{if(b.tagName==='BUTTON')b.disabled=true;});
 document.querySelector('.cp-screen')?.setAttribute('aria-busy','true');
 try{return await api.command(command,args);}finally{pending=false;api.render();}
}
function showSummon(cards,api){
 const session={index:0,timer:null,root:null};revealSession=session;
 api.open(cards.length===5?'5회 소환 결과':'소환 결과',`<div class="cp-summon-reveal"><p class="cp-reveal-status" aria-live="polite">동료를 만나보세요</p><div class="cp-result ${cards.length===1?'cp-single':''}">${cards.map(c=>resultCard(c).replace('cp-reveal','cp-reveal cp-veiled')).join('')}</div><div class="cp-reveal-actions"><button data-illustrated="1" class="cp-btn" data-action="companionRevealAll">모두 보기</button><button data-illustrated="1" class="cp-btn gold" data-action="companionSummonReturn" disabled>확인</button></div></div>`,true,'companion-dialog');
 session.root=document.querySelector('.cp-summon-reveal');
 const next=()=>{
  if(revealSession!==session||!session.root?.isConnected)return;
  const nodes=session.root.querySelectorAll('.cp-reveal');
  if(session.index>=cards.length){session.root.querySelector('[data-action="companionSummonReturn"]').disabled=false;session.root.querySelector('[data-action="companionRevealAll"]').hidden=true;session.root.querySelector('.cp-reveal-status').textContent='동료를 가방에 보관했어요';return;}
  const i=session.index++,g=def(cards[i]).grade;
  nodes[i].classList.remove('cp-veiled');nodes[i].classList.add('cp-unveiled');
  session.root.classList.remove('cp-flash-A','cp-flash-S');void session.root.offsetWidth;
  if(g==='A'||g==='S')session.root.classList.add('cp-flash-'+g);
  session.root.querySelector('.cp-reveal-status').textContent=`${i+1} / ${cards.length} · ${g}등급 ${def(cards[i]).name}`;
  session.timer=setTimeout(next,matchMedia('(prefers-reduced-motion: reduce)').matches?30:g==='S'?850:g==='A'?650:280);
 };
 session.finish=()=>{clearTimeout(session.timer);session.root.querySelectorAll('.cp-reveal').forEach(n=>{n.classList.remove('cp-veiled');n.classList.add('cp-unveiled');});session.index=cards.length;next();};
 session.timer=setTimeout(next,180);
}

function summonWindow(s){
 const d=data(s),pickup=ui.banner==='pickup',dd=pickup?PICKUP_COMPANION:COMPANION_BY_ID.s1;
 return `<div class="cp-sanctum ${pickup?'cp-pickup':''}">
  <div class="cp-banner-tabs" role="tablist" aria-label="소환 종류">${['normal','pickup'].map(b=>`<button data-illustrated="1" role="tab" aria-selected="${ui.banner===b}" class="cp-banner-tab ${ui.banner===b?'active':''}" data-action="companionBanner" data-arg="${b}">${b==='normal'?'일반 소환':'픽업 소환'}</button>`).join('')}</div>
  <div class="cp-banner-hero"><img class="cp-banner-art" src="companions/${dd.id}-human-v1.webp" alt="${dd.name}"><div class="cp-banner-copy"><small>${pickup?'S · PICK UP':'COMPANION SUMMON'}</small><h2>${pickup?'별의 여왕 아스트리아':'별빛에 이끌린 인연'}</h2></div></div>
  ${pickup?`<div class="cp-pickup-overview"><div class="cp-pickup-stats"><strong>S급 아스트리아 <em>0.5%</em></strong><span>기본 골드 <b>${fmt(dd.min)}~${fmt(dd.max)} G/분</b></span><span>골드형 <b>+40~80%</b></span><span>성장형 <b>시간당 +20% · 최대 +60~100%</b></span><span>대박형 <b>발동 40~80% · 골드 2배</b></span><small>패시브 3종 중 1개 · 높은 수치일수록 희귀</small></div><div class="cp-pickup-card cp-g-S"><span class="cp-grade">S</span><img src="companions/pickup-astria-human-v1.webp" alt="아스트리아 카드 미리보기"><b>아스트리아 ★1</b><small>8,000~10,000 G/분</small></div></div><div class="cp-banner-pity">픽업 확정까지 <b>${PICKUP_PITY-d.pickupPity}회</b> 남음 <small>80회째 확정 · 등장 시 초기화</small></div><p class="cp-pickup-odds">S급 전체 1% · 픽업 0.5% / 기존 S급 0.5% · A~F는 일반과 동일</p>`:`<div class="cp-normal-info">S급 1% · A급 5% <small>기존 소환권 사용 · 탐험 개인 상자에서 25% 확률로 획득</small></div>`}
  <div class="cp-banner-wallet"><img src="companions/${pickup?'pickup-ticket-v1':'summon-ticket-v1'}.webp" alt="">${pickup?'픽업 소환권':'소환권'} <b>${fmt(pickup?d.pickupTickets:d.tickets)}장</b></div>
  <div class="cp-banner-pulls">${[1,5].map(n=>`<button data-illustrated="1" class="cp-banner-tab active" data-action="companionSummon" data-arg="${n}"><b>${n}회 소환</b><small>${pickup?'픽업 소환권':'소환권'} ${n}장</small></button>`).join('')}</div>
  <p class="cp-banner-note">1회·5회 같은 확률 · 가방 ${d.cards.length}/${COMPANION_BAG}</p>
 </div>`;
}
function openSummon(api){api.open('동료 소환',summonWindow(api.state()),true,'companion-dialog');}

const percent=n=>Number((n*100).toFixed(4)).toLocaleString('ko-KR',{maximumFractionDigits:4})+'%';
function companionHelp(){
 const p=COMPANION_PASSIVES;
 return `<div class="cp-help-content" tabindex="-1" autofocus>
 <h3>픽업 소환</h3><p>픽업 소환권만 사용해요. S급 전체 1% 중 아스트리아 0.5%, 기존 S급 합계 0.5%예요. 픽업 80회째 확정이며 픽업 등장 시 횟수가 초기화돼요. 엘리시아 0.175%, 카이로스 0.325%이며 A~F는 일반 소환과 같아요. 아스트리아의 기본 골드·패시브 수치·성장 속도는 기존 최고 S급 범위의 2배예요. 일반 소환에서는 나오지 않아요. 아래 표는 일반 소환 기준이에요.</p><h3>패시브 효과 · 수치 범위</h3><p>카드마다 패시브 1개가 붙어요. 등급·캐릭터와 관계없이 각 종류의 확률은 <b>1/3 (약 33.3333%)</b>로 같아요.</p>
 <dl><dt>◈ ${p.gold.name} · +${p.gold.min}~${p.gold.max}%</dt><dd>배치 즉시 해당 카드의 분당 골드가 증가해요. 배치를 바꿔도 옵션은 유지돼요.</dd>
 <dt>❧ ${p.growth.name} · 최대 +${p.growth.min}~${p.growth.max}%</dt><dd>배치 후 1시간이 지날 때마다 +10%씩 증가해요. 카드에 정해진 최대치에 도달하면 더 늘지 않아요. 골드 수령 시 성장은 유지되고, 배치를 해제하면 초기화돼요. 최대치 +30%는 3시간, +50%는 5시간에 도달해요.</dd>
 <dt>✤ ${p.jackpot.name} · 발동 확률 ${p.jackpot.min}~${p.jackpot.max}%</dt><dd>그 카드의 골드를 수령할 때 표시된 확률로 수령 골드가 2배가 돼요. 배치 해제로 자동 수령할 때도 판정해요. 카드마다 따로 판정하며, 분당 골드 표기에는 대박 기대값을 더하지 않아요.</dd></dl>
 <p>패시브 종류는 각 1/3로 같지만, <b>종류 안에서는 높은 수치일수록 드물어요.</b> 최저 수치의 추첨 가중치는 21, 다음은 20으로 줄어 최고 수치는 1이에요. 기존 카드의 수치는 유지돼요.</p>
 <table><thead><tr><th>골드 / 대박</th><th>성장 최대</th><th>종류 내 확률</th><th>전체 소환</th></tr></thead><tbody>${Array.from({length:21},(_,i)=>`<tr><td>${20+i}%</td><td>+${30+i}%</td><td>${percent(companionPassiveValueChance('gold',20+i))}</td><td>${percent(companionPassiveValueChance('gold',20+i)/3)}</td></tr>`).join('')}</tbody></table><p>전체 소환 열은 <b>특정 패시브 1종과 해당 수치</b>가 함께 나올 확률이에요. 예: 골드형 +40%는 약 0.1443%예요. 기본 분당 골드의 범위 내 정수는 동일 확률이에요.</p>
 <h3>세 패시브 효율 비교</h3><p>같은 기본 골드·별 기준, 새로 뽑아 8시간 배치했을 때 평균 보너스는 골드형 <b>+26.67%</b>, 대박형 기대값 <b>+26.67%</b>, 성장형 <b>+25.71%</b>예요. 성장형은 초반에 낮지만 계속 배치하면 최대치에 도달해 장기적으로 유리해져요. 골드를 수령해도 성장 단계는 유지돼요.</p>
 <h3>골드 계산 · 최적 장착</h3><p>분당 골드 = 기본 골드 × (1 + 별 보너스) × (1 + 현재 패시브 증가율). ★마다 +15%, ★5는 +60%예요. 성장형은 시간에 따라 달라지고, 대박형은 수령할 때 별도로 판정해요.</p><p>슬롯마다 최대 8시간 누적돼요. 최적 장착은 <b>앞으로 8시간의 기대 골드</b>를 비교해 3명을 골라요. 별·성장 단계·대박 확률을 반영하며 유지된 카드의 성장 시간은 보존돼요. 대박형 기대 보너스는 발동 확률과 같고, 실제 결과는 달라질 수 있어요.</p>
 <h3>등급별 소환 확률</h3><table><thead><tr><th>등급</th><th>확률</th></tr></thead><tbody>${COMPANION_GRADES.map(g=>`<tr><td>${g}</td><td>${percent(COMPANION_GRADE_RATES[g])}</td></tr>`).join('')}</tbody></table>
 <h3>캐릭터별 확률 · 기본 골드</h3><p>아래 확률은 전체 소환 기준이에요. 같은 등급에서도 기본 수입이 높은 캐릭터일수록 드물게 나와요. 기본 골드는 각 범위의 정수 중 동일 확률로 결정돼요.</p><table><thead><tr><th>등급 · 이름</th><th>기본 G/분</th><th>확률</th></tr></thead><tbody>${COMPANIONS.map(c=>`<tr><td>${c.grade} · ${esc(c.name)}</td><td>${fmt(c.min)}~${fmt(c.max)}</td><td>${percent(companionSummonChance(c.id))}</td></tr>`).join('')}</tbody></table>
 <h3>소환권 얻는 곳</h3><p>링구의 탐험 클리어(개인 상자) 시 <b>25%</b> 확률로 소환권 1장 · 모든 테마 동일</p><p>소환권 1장당 카드 1장, 5회 소환은 소환권 5장이 필요해요. 1회·5회 모두 카드마다 같은 확률로 독립 추첨하며, 확정 등급 보장·천장은 없어요. 동료 효과는 전투·아레나에 적용되지 않아요.</p>
 </div><button data-illustrated="1" class="cp-btn gold cp-wide" data-action="close">확인</button>`;
}

// api: {state, command, open, close, toast, render}
export async function companionAction(action,arg,api){
 if(action==='companionSummonReturn'){clearTimeout(revealSession?.timer);revealSession=null;openSummon(api);return;}
 if(action==='companionSummonOpen'){ui.banner='normal';openSummon(api);return;}
 if(action==='companionBanner'){if(pending)return;ui.banner=arg==='pickup'?'pickup':'normal';openSummon(api);return;}
 if(action==='companionHelp'){api.open('동료 효과·확률 안내',companionHelp(),true,'companion-dialog');return;}
 if(action==='companionRevealAll'){revealSession?.finish();return;}
 if(pending)return;
 const s=api.state(),d=data(s);
 if(action==='companionSelect'){ui.selected=Number(arg);return api.render();}
 if(action==='companionSort'){ui.sort=arg==='rate'?'rate':'grade';return api.render();}
 if(action==='companionSummon'){
  const count=arg==='5'?5:1;
  const pickup=ui.banner==='pickup',tickets=pickup?d.pickupTickets:d.tickets;
  if(!s.isAdmin&&tickets<count)return api.toast(`${pickup?'픽업 소환권':'소환권'}이 부족해요. (보유 ${tickets}장)`);
  if(d.cards.length+count>COMPANION_BAG)return api.toast('동료 가방이 가득 찼어요. 카드를 판매하거나 합성해 주세요.');
  api.open('동료 소환',`<div class="cp-summon-loading" role="status"><span class="cp-ticket-icon"></span><b>동료를 부르고 있어요…</b></div>`,false,'companion-dialog');
  try{const r=await sendCompanion(api,'companionSummon',{count,banner:ui.banner});const e=ev(r,'companionSummon');if(e)showSummon(e.cards,api);else api.close();}catch(error){api.close();throw error;}
  return;
 }
 if(action==='companionAutoEquip'){
  if(!d.cards.length)return api.toast('먼저 동료 카드를 소환해 주세요.');
  const r=await sendCompanion(api,'companionAutoEquip',{}),e=ev(r,'companionAutoEquip');if(!e)return;
  ui.selected=e.ids[0]??null;api.render();
  const gold=(e.claims||[]).reduce((sum,c)=>sum+c.gold,0);
  api.toast((e.changed?'패시브를 반영해 최적 장착했어요.':'이미 가장 효율 좋은 조합이에요.')+(gold?' 교체 보상 '+fmt(gold)+' G 수령':''));return;
 }
 if(action==='companionClaim'){const r=await sendCompanion(api,'companionClaim',{slot:Number(arg)});const e=ev(r,'companionClaim');if(e?.gold>0)api.toast(claimText(e));return;}
 if(action==='companionUnplace'){const r=await sendCompanion(api,'companionUnplace',{slot:Number(arg)});const e=ev(r,'companionUnplace');api.toast(['배치를 해제했어요.',claimText(e?.claim)].filter(Boolean).join(' '));return;}
 if(action==='companionPlace'||action==='companionPlaceAt'){
  const [idText,slotText]=String(arg).split(':'),id=Number(idText);
  let slot=slotText!==undefined?Number(slotText):d.slots.findIndex(x=>!x);
  if(slot<0){
   // 3칸이 다 찼으면 바꿀 칸을 고른다. 빠지는 카드의 골드는 자동 수령.
   api.open('바꿀 자리 선택',`<p class="note">빠지는 동료가 모은 골드는 자동으로 수령돼요.</p><div class="cp-swap">${d.slots.map((x,i)=>{const c=d.cards.find(y=>y.i===x.card);return `<button data-illustrated="1" class="cp-card cp-g-${def(c).grade}" data-action="companionPlaceAt" data-arg="${id}:${i}"><span class="cp-grade">${def(c).grade}</span>${portrait(c)}<span class="cp-name">${esc(def(c).name)}</span><span class="cp-rate">${fmt(companionMaxRate(c))} G / 분</span></button>`;}).join('')}</div>`,true,'companion-dialog');
   return;
  }
  api.close();
  const r=await sendCompanion(api,'companionPlace',{slot,id});const e=ev(r,'companionPlace');if(e)api.toast(['배치했어요.',claimText(e.claim)].filter(Boolean).join(' '));return;
 }
 if(action==='companionMerge'||action==='companionMergeConfirm'){
  const main=d.cards.find(x=>x.i===Number(arg));if(!main)return;
  if(main.s>=COMPANION_MAX_STAR)return api.toast('이미 최대 ★5예요.');
  const need=main.s;
  // 재료는 같은 캐릭터 중 배치 안 된 카드에서, 옵션이 낮은 것부터 자동으로 고른다.
  const mats=d.cards.filter(x=>x.c===main.c&&x.i!==main.i&&placedAt(d,x.i)<0).sort((a,b)=>a.s-b.s||companionQuality(a)-companionQuality(b)).slice(0,need);
  if(mats.length<need)return api.toast(`★${main.s}→★${main.s+1} 합성에는 같은 ${def(main).name} 카드 ${need}장이 필요해요. (보유 ${mats.length}장)`);
  if(action==='companionMerge'){
   // 메인(지금 고른 카드)은 분당 골드·패시브 수치를 그대로 두고 별만 오른다.
   const better=mats.some(x=>companionQuality(x)>companionQuality(main));
   api.open('합성',`<p class="cp-merge-line"><b>${esc(def(main).name)}</b> ★${main.s} → <b class="up">★${main.s+1}</b> · 분당 골드 +15%</p><p class="cp-merge-label">메인 · 수치 그대로 유지</p><div class="cp-result cp-merge-main">${resultCard(main)}</div><p class="cp-merge-label">재료 ${need}장 · 사라짐 (옵션 낮은 카드부터 자동 선택)</p>${better?'<p class="note cp-merge-warn">재료 중에 메인보다 옵션이 좋은 카드가 있어요. 그 카드를 메인으로 고르고 합성하는 게 이득이에요.</p>':''}<div class="cp-result">${mats.map(resultCard).join('')}</div><button data-illustrated="1" class="cp-btn blue cp-wide" data-action="companionMergeConfirm" data-arg="${main.i}">합성하기</button>`,true,'companion-dialog');
   return;
  }
  api.close();
  const r=await sendCompanion(api,'companionMerge',{id:main.i,materials:mats.map(x=>x.i)});const e=ev(r,'companionMerge');if(e)api.toast(`합성 성공! ${def(main).name} ★${e.star}`);return;
 }
 if(action==='companionSell'||action==='companionSellConfirm'){
  const card=d.cards.find(x=>x.i===Number(arg));if(!card)return;
  const price=COMPANION_SELL[def(card).grade]*card.s;
  if(action==='companionSell'){api.open('동료 판매',`<p><b>${esc(def(card).name)}</b> ★${card.s} (${def(card).grade}급)을 ${fmt(price)} G에 판매할까요?</p><button data-illustrated="1" class="cp-btn cp-wide" data-action="companionSellConfirm" data-arg="${card.i}">판매하기</button>`,true,'companion-dialog');return;}
  api.close();ui.selected=null;
  const r=await sendCompanion(api,'companionSell',{ids:[card.i]});const e=ev(r,'companionSell');if(e)api.toast(fmt(e.gold)+' G에 판매했어요.');return;
 }
 if(action==='companionBulkSell'){
  const counts=Object.fromEntries(COMPANION_GRADES.map(g=>[g,d.cards.filter(x=>def(x).grade===g&&placedAt(d,x.i)<0).length]));
  api.open('일괄 판매',`<p class="note">선택한 등급의 카드를 한 번에 판매해요. 배치 중인 카드는 빠져요.</p><div class="cp-bulk">${[...COMPANION_GRADES].reverse().map(g=>`<button data-illustrated="1" class="cp-g-${g}" data-action="companionBulkGrade" data-arg="${g}" ${counts[g]?'':'disabled'}><span class="cp-grade">${g}</span><b>${counts[g]}장</b><small>장당 ${fmt(COMPANION_SELL[g])} G~</small></button>`).join('')}</div>`,true,'companion-dialog');
  return;
 }
 if(action==='companionBulkGrade'||action==='companionBulkConfirm'){
  const g=arg,list=d.cards.filter(x=>def(x).grade===g&&placedAt(d,x.i)<0);if(!list.length)return;
  const gold=list.reduce((n,x)=>n+COMPANION_SELL[g]*x.s,0);
  if(action==='companionBulkGrade'){api.open('일괄 판매 확인',`<p>${g}급 카드 <b>${list.length}장</b>을 <b>${fmt(gold)} G</b>에 판매할까요?</p><button data-illustrated="1" class="cp-btn cp-wide" data-action="companionBulkConfirm" data-arg="${g}">판매하기</button>`,true,'companion-dialog');return;}
  api.close();
  const r=await sendCompanion(api,'companionSell',{ids:list.map(x=>x.i)});const e=ev(r,'companionSell');if(e)api.toast(`${e.count}장을 ${fmt(e.gold)} G에 판매했어요.`);return;
 }
}
