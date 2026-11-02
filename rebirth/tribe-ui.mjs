// 종족 뽑기 화면: 슬롯머신 릴이 빠르게 돌다가 천천히 멈추며 결과를 보여주고, 이전/이후 중 하나를 고른다.
// 그림은 tribes/<id>.webp (없으면 이름만 보임), 상단 버튼은 ui/top-buttons/tribe-v1.webp.
import {TRIBES,TRIBE_BY_ID,TRIBE_GRADE_BY_ID,tribeOf,tribeEffectText,tribeChance} from './tribe-data.mjs?v=tribe-half-20261102';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Math.floor(Number(n)||0).toLocaleString('ko-KR');
const pct=x=>{const v=x*100;return (v>=1?+v.toFixed(2):+v.toFixed(3))+'%';};
export const TRIBE_TICKET_COST=100,TRIBE_TICKET_DAILY=5;
const img=(id,cls='tribe-art')=>`<img class="${cls}" src="tribes/polished-v1/${id}.webp" alt="" decoding="async" onerror="this.remove()">`;
// 이름표: 종족마다 다른 색 · 등급이 높을수록 강하게 빛남(전설은 반짝임, 신화는 무지개 흐름).
export function tribeName(id,extra=''){const t=TRIBE_BY_ID[id]||TRIBE_BY_ID.human;return `<span class="tribe-name tribe-g-${t.grade} ${extra}" style="--tc:${t.color}">${esc(t.name)}</span>`;}
// 다른 유저 종족: 랭킹 조회 결과(rebirth_rankings의 tribe)를 기억해 두고 멀티 방 참가자 이름 앞에 쓴다.
const knownTribes=new Map();
export function rememberTribes(rows){for(const r of rows||[])if(r?.id&&TRIBE_BY_ID[r.tribe])knownTribes.set(r.id,r.tribe);}
export const rememberTribe=(id,tribe)=>{if(id&&TRIBE_BY_ID[tribe])knownTribes.set(id,tribe);};
export const memberTribe=m=>TRIBE_BY_ID[m?.tribe]?m.tribe:knownTribes.get(m?.id)||null;
export const knownTribeCount=()=>knownTribes.size;
export function tribeTag(id){const t=TRIBE_BY_ID[id]||TRIBE_BY_ID.human;return `<span class="tribe-tag tribe-g-${t.grade}" style="--tc:${t.color}">${esc(t.name)}</span>`;}
export const tribeHeaderButton=s=>{const g=s?.tribeGacha||{},ready=(g.tickets||0)+(g.pending?1:0);return `<button class="fantasy-bank-entry fantasy-tribe-entry" data-action="tribeOpen" aria-label="종족 뽑기${g.tickets?' · 종족 주사위 '+g.tickets+'개':''}"><i class="tribe-entry-glyph" aria-hidden="true">族</i><img class="header-button-image" src="ui/top-buttons/tribe-v1.webp" alt="" onerror="this.remove()"><span>종족</span>${ready?`<b class="fantasy-mail-count">${g.pending?'!':ready}</b>`:''}</button>`;};

function card(id,label,cls=''){const t=TRIBE_BY_ID[id]||TRIBE_BY_ID.human,g=TRIBE_GRADE_BY_ID[t.grade];return `<article class="tribe-card tribe-g-${t.grade} ${cls}" style="--tc:${t.color}"><small class="tribe-card-label">${label}</small><div class="tribe-card-art">${img(t.id)}</div><span class="tribe-grade-chip">${g.name}</span>${tribeName(t.id,'big')}<p>${tribeEffectText(t)}</p></article>`;}
// 릴 칸 하나.
const cell=t=>`<div class="tribe-reel-cell tribe-g-${t.grade}" style="--tc:${t.color}">${img(t.id,'tribe-reel-art')}<span class="tribe-grade-chip">${TRIBE_GRADE_BY_ID[t.grade].name}</span>${tribeName(t.id)}</div>`;
export function tribeReel(id){const pool=TRIBES.filter(t=>t.grade!=='start'),side=k=>pool[(TRIBES.findIndex(t=>t.id===id)+k*7+pool.length)%pool.length];return `<div class="tribe-reel" data-tribe-reel><div class="tribe-reel-strip">${cell(side(-1))}${cell(TRIBE_BY_ID[id]||TRIBE_BY_ID.human)}${cell(side(1))}</div><i class="tribe-reel-line" aria-hidden="true"></i></div>`;}

export function tribeView(s,{spinning=false,shop}={}){
 const g=s.tribeGacha||{},cur=tribeOf(s),pending=g.pending&&!spinning?g.pending:null,tokens=Math.floor(s.tokens||0);
 const bought=shop?.bought||0,canBuy=bought<TRIBE_TICKET_DAILY&&tokens>=TRIBE_TICKET_COST;
 const top=`<section class="tribe-now tribe-g-${cur.grade}" style="--tc:${cur.color}"><div class="tribe-now-art">${img(cur.id)}</div><div><small>현재 종족 · ${TRIBE_GRADE_BY_ID[cur.grade].name}</small>${tribeName(cur.id,'big')}<p>${tribeEffectText(cur)}</p></div></section>`;
 const machine=`<section class="tribe-machine${spinning?' spinning':''}"><div class="tribe-machine-lights" aria-hidden="true">${'<i></i>'.repeat(12)}</div>${tribeReel(pending?pending.id:g.last?.id||cur.id)}<div class="tribe-machine-info"><span><img class="tribe-ticket-icon" src="tribes/polished-v1/ticket.webp" alt=""> 종족 주사위 <b>${fmt(g.tickets)}</b>개</span><span>매회 독립 추첨</span></div></section>`;
 const choose=pending?`<section class="tribe-choose"><h3>어느 쪽으로 할까요?</h3><div class="tribe-choose-cards">${card(pending.prev,'이전 · 지금 종족')}${card(pending.id,'이후 · 새 종족','new')}</div><div class="tribe-choose-actions"><button class="tribe-art-button tribe-keep" data-illustrated="1" data-action="tribeChoose" data-arg="keep" data-write>이전 유지</button><button class="gold tribe-art-button tribe-take" data-illustrated="1" data-action="tribeChoose" data-arg="take" data-write>이걸로 변경</button></div></section>`:'';
 const actions=pending||spinning?'':`<div class="tribe-actions"><button class="gold tribe-spin tribe-art-button" data-illustrated="1" data-action="tribeRoll" data-write ${!s.isAdmin&&!(g.tickets>0)?'disabled data-unavailable':''}>뽑기 <small>종족 주사위 1개</small></button><button class="tribe-art-button tribe-buy" data-illustrated="1" data-action="tribeBuy" data-write ${canBuy?'':'disabled data-unavailable'}>종족 주사위 사기 <small>${TRIBE_TICKET_COST}토큰 · 오늘 ${Math.max(0,TRIBE_TICKET_DAILY-bought)}/${TRIBE_TICKET_DAILY}</small></button></div>`;
 const grades=['myth','legend','epic','rare','common'].map(gid=>{const gr=TRIBE_GRADE_BY_ID[gid],list=TRIBES.filter(t=>t.grade===gid);return `<div class="tribe-odds-group tribe-g-${gid}"><h4>${gr.name} <small>${pct(gr.chance)} · 각 ${pct(tribeChance(list[0]))}</small></h4>${list.map(t=>`<div class="tribe-odds-row">${img(t.id,'tribe-odds-face')}${tribeName(t.id)}</div>`).join('')}</div>`;}).join('');
 return `<div class="tribe-screen" data-tribe-screen><section class="tribe-sanctum"><div><span>종족 소환</span><h3>잠든 혈통을 깨우세요</h3><p>당신에게 깃들 새로운 가능성</p></div></section>${top}${machine}${choose}${actions}<details class="tribe-odds"><summary>종족 목록 · 확률</summary><p class="note">외형은 그대로, 능력치만 바뀌어요. 효과는 잠재처럼 더해져요. 뽑으면 이전/이후 중 하나를 골라요. 매번 아래 기본 확률로 독립 추첨해요. 종족 주사위는 토큰 교환소에서 하루 ${TRIBE_TICKET_DAILY}개까지 살 수 있어요.</p>${grades}</details></div>`;
}

// 릴 연출: 랜덤 칸을 길게 이어 붙이고 마지막 칸에 결과를 둔 뒤, 빠르게 돌다가 천천히 멈춘다.
export function spinTribeReel(root,resultId,{duration=4800}={}){
 return new Promise(resolve=>{
  const reel=root?.querySelector('[data-tribe-reel]'),strip=reel?.querySelector('.tribe-reel-strip');
  if(!reel||!strip){resolve();return;}
  const reduce=matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  // 보여주기용 칸: 가끔 높은 등급이 스쳐 지나가게 등급 가중치를 실제보다 높인다(결과와 무관).
  const weights={common:6,rare:4,epic:2.4,legend:1.2,myth:.6},pool=TRIBES.filter(t=>t.grade!=='start');
  const pick=()=>{const total=pool.reduce((n,t)=>n+weights[t.grade],0);let r=Math.random()*total;for(const t of pool){r-=weights[t.grade];if(r<0)return t;}return pool[0];};
  const count=reduce?6:46,cells=Array.from({length:count},pick);
  // 결과 바로 아래 칸에 전설·신화를 두어 "아깝게 비껴간" 느낌을 준다.
  const res=TRIBE_BY_ID[resultId]||pool[0];cells.push(res);
  const nearMiss=pool.filter(t=>['legend','myth'].includes(t.grade));cells.push(nearMiss[Math.floor(Math.random()*nearMiss.length)]);
  strip.innerHTML=cells.map(cell).join('');
  const h=strip.firstElementChild.getBoundingClientRect().height||64,target=(count-1)*h;
  reel.classList.remove('landed','land-legend','land-myth','land-epic','land-rare','land-common');
  const ms=reduce?600:duration;let finished=false;
  const done=()=>{if(finished)return;finished=true;clearTimeout(timer);strip.style.transform=`translateY(${-target}px)`;reel.classList.add('landed','land-'+res.grade);resolve();};
  const timer=setTimeout(done,ms+500);
  try{const anim=strip.animate([{transform:'translateY(0)'},{transform:`translateY(${-target}px)`}],{duration:ms,easing:'cubic-bezier(.08,.6,.12,1)',fill:'forwards'});anim.finished.then(done,done);}catch{done();}
 });
}

// 이름 맞춤: [종족][이름]을 한 줄로 두고, 칸보다 길면 글자 크기를 줄여 생략 없이 가로로 다 보이게 한다.
export function fitNames(root=document){
 for(const el of root.querySelectorAll('[data-fit]')){
  el.style.fontSize='';
  const base=parseFloat(getComputedStyle(el).fontSize)||14;let size=base;
  for(let i=0;i<4&&el.scrollWidth>el.clientWidth+1&&el.clientWidth>0;i++){size=Math.max(6,size*el.clientWidth/el.scrollWidth-.2);el.style.fontSize=size+'px';}
 }
}
let fitQueued=false;
export function installNameFit(){
 if(typeof MutationObserver==='undefined'||installNameFit.done)return;installNameFit.done=true;
 const run=()=>{fitQueued=false;fitNames(document);};
 const queue=()=>{if(!fitQueued){fitQueued=true;requestAnimationFrame(run);}};
 new MutationObserver(muts=>{for(const m of muts)for(const n of m.addedNodes)if(n.nodeType===1&&(n.matches?.('[data-fit]')||n.querySelector?.('[data-fit]'))){queue();return;}}).observe(document.documentElement,{childList:true,subtree:true});
 addEventListener('resize',queue);queue();
}
