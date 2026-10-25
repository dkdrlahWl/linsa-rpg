import {fishingQuestsReady} from './fishing-data.mjs';
import {currencyIconURL} from './currency-icons.mjs';
import {fantasyHeader,fantasyFooter} from './fantasy-ui.mjs?v=short-18';
import {TREASURE_CELLS,TREASURE_MINES,TREASURE_DAILY,TREASURE_TICKET_DAILY,TREASURE_TICKET_CHANCE,TREASURE_REWARDS,treasureReward} from './treasure-data.mjs';

const fmt=n=>Math.floor(Number(n)||0).toLocaleString('ko-KR');
const icon=id=>currencyIconURL(id==='bossGear'?'boss':id);
const pct=c=>+(c*100).toFixed(1)+'%';
const amountText=(r,n=r.amount)=>r.id==='gold'?fmt(n)+' G':r.id==='bossGear'?'1개':fmt(n)+'개';
const todayKey=now=>new Date(now+9*3600e3).toISOString().slice(0,10);

export function eventSwitch(s,active){
 const quests=fishingQuestsReady(s);
 return `<nav class="lotto-event-switch event-switch-3"><button class="${active==='fishing'?'active':''}" data-action="eventPage" data-arg="fishing" data-illustrated="1">낚시 여행${quests?`<b class="fantasy-mail-count">${quests}</b>`:''}</button><button class="${active==='lotto'?'active':''}" data-action="eventPage" data-arg="lotto" data-illustrated="1">주간 로또</button><button class="${active==='treasure'?'active':''}" data-action="eventPage" data-arg="treasure" data-illustrated="1">보물 찾기</button></nav>`;
}

function bagSummary(run){
 const total={};for(const o of run.opened)total[o.reward]=(total[o.reward]||0)+(treasureReward(o.reward)?.amount||0);
 const rows=TREASURE_REWARDS.filter(r=>total[r.id]).map(r=>`<li><img src="${icon(r.id)}" alt=""><span>${r.name}</span><b>${amountText(r,total[r.id])}</b></li>`).join('');
 return rows?`<ul class="treasure-bag-list">${rows}</ul>`:'<p class="treasure-empty">아직 연 칸이 없어요.</p>';
}

export function treasureView(s,now=Date.now()){
 const day=todayKey(now),t=s.treasure||{},tickets=Math.max(0,t.tickets||0),today=t.ticketDay===day?t.ticketsToday||0:0,plays=t.day===day?t.plays||0:0,left=Math.max(0,TREASURE_DAILY-plays),run=t.run;
 const digging=run?.status==='digging',ended=run&&!digging;
 const opened=new Map((run?.opened||[]).map(o=>[o.cell,o])),mines=new Set(ended?run.mines||[]:[]);
 const cells=Array.from({length:TREASURE_CELLS},(_,i)=>{
  const o=opened.get(i);
  if(o){const r=treasureReward(o.reward);return `<div class="treasure-cell open${r?.id==='bossGear'||r?.id==='primeCube'||r?.id==='bonusFlame'?' rare':''}" aria-label="${r?.name||''}"><img src="${icon(o.reward)}" alt=""><small>${r?amountText(r):''}</small></div>`;}
  if(mines.has(i))return `<div class="treasure-cell mine${run.boom===i?' boom':''}" aria-label="지뢰"><span>💣</span></div>`;
  if(digging)return `<button class="treasure-cell closed" data-illustrated="none" data-action="treasureDig" data-arg="${i}" aria-label="${i+1}번 칸 파기"></button>`;
  return `<div class="treasure-cell closed idle"></div>`;
 }).join('');
 const safeLeft=TREASURE_CELLS-TREASURE_MINES-(run?.opened?.length||0);
 const nextRisk=digging?TREASURE_MINES/(TREASURE_CELLS-run.opened.length):0;
 let status;
 if(digging)status=`<p class="treasure-status">열린 칸 <b>${run.opened.length}</b> · 다음 칸 지뢰 확률 <b>${Math.round(nextRisk*100)}%</b></p>`;
 else if(run?.status==='boom')status=`<p class="treasure-status bad">💥 지뢰를 밟았어요! 모은 보상 ${run.opened.length}칸을 모두 잃었어요.</p>`;
 else if(run?.status==='cashed'||run?.status==='cleared')status=`<p class="treasure-status good">${run.status==='cleared'?'🎉 안전한 칸 ${TREASURE_CELLS-TREASURE_MINES}개를 전부 찾았어요!':'보상을 챙겼어요!'} ${run.opened.length}칸 보상 획득</p>`;
 else status=`<p class="treasure-status">5×5 판에 지뢰 ${TREASURE_MINES}개가 숨어 있어요.</p>`;
 const actions=digging
  ?`<button class="treasure-main" data-action="treasureCash" ${run.opened.length?'':'disabled'}>그만하고 받기</button>`
  :`<button class="treasure-main" data-action="treasureStart" ${tickets&&left?'':'disabled'}>${!left?`오늘 ${TREASURE_DAILY}판 모두 완료`:tickets?(ended?'티켓 1장으로 다음 판':'티켓 1장으로 시작'):'티켓이 없어요 · 낚시로 얻기'}</button>`;
 const odds=TREASURE_REWARDS.map(r=>`<li><img src="${icon(r.id)}" alt=""><span>${r.name} ${r.id==='gold'?fmt(r.amount)+' G':r.id==='bossGear'?'':r.amount+'개'}</span><b>${pct(r.chance)}</b></li>`).join('');
 return `<section class="lotto-screen treasure-screen" data-currency-label>${fantasyHeader(s,'event')}<div class="lotto-scroll">${eventSwitch(s,'treasure')}<main class="treasure-scene">
<header class="treasure-heading"><h1>보물 찾기</h1><p>오늘 남은 판 <b>${left}/${TREASURE_DAILY}</b> · 🎫 보유 티켓 <b>${tickets}장</b></p><p class="treasure-ticket-note">오늘 낚시로 얻은 티켓 ${today}/${TREASURE_TICKET_DAILY} · 자정 초기화</p></header>
${status}
<div class="treasure-board${digging?' live':''}" data-no-currency-art>${cells}</div>
${actions}
${digging||ended?`<section class="treasure-bag"><h2>${digging?'모은 보상':run.status==='boom'?'잃은 보상':'받은 보상'}${digging&&safeLeft?` <small>안전한 칸 ${safeLeft}개 남음</small>`:''}</h2>${bagSummary(run)}</section>`:''}
<details class="treasure-rules"><summary>규칙 · 보상 확률</summary><p>티켓은 낚시로 얻어요. 한 번 낚을 때마다 ${+(TREASURE_TICKET_CHANCE*100).toFixed(1)}% 확률, 하루 최대 ${TREASURE_TICKET_DAILY}장 · 자정 초기화. 티켓 1장으로 한 판 도전하고, 하루 최대 ${TREASURE_DAILY}판까지 할 수 있어요.</p><p>칸을 열 때마다 보상이 하나씩 쌓여요. 지뢰를 밟으면 이번 판에 모은 보상을 <b>전부</b> 잃어요. 언제든 "그만하고 받기"로 챙길 수 있어요.</p><p>지뢰 ${TREASURE_MINES}개 · 연속 생존 확률 3칸 67% · 5칸 50% · 7칸 35% · 10칸 20%</p><ul class="treasure-odds">${odds}</ul></details>
</main></div>${fantasyFooter('event')}</section>`;
}
