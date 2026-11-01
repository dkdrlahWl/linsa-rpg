// 토큰 던전 · 교환소 · 경마 화면 (보스 탭 > 토큰 던전). 공개 전에는 관리자에게만 보인다.
import {TOKEN_CONTENT_OPEN,TOKEN_BOSS_STAGES,TOKEN_DAILY_TRIES,TOKEN_SHOP,RACE_BETS,RACE_MIN_BET,RACE_MAX_BET,RACE_DAILY,RACE_RTP,tokenCount,tokenTriesLeft,tokenStageOpen,tokenShopBought} from './token-content.mjs';

const fmt=n=>Math.floor(Number(n)||0).toLocaleString('ko-KR');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const big=n=>n>=1e8?(n/1e8).toFixed(n>=1e9?1:2).replace(/\.?0+$/,'')+'억':fmt(n);
const b=(label,action,arg='',cls='',disabled=false)=>`<button class="${cls}" data-action="${action}" data-arg="${esc(arg)}" data-write${disabled?' disabled data-unavailable':''}>${label}</button>`;
const todayKey=now=>new Date(now+9*3600e3).toISOString().slice(0,10);
export const tokenVisible=s=>TOKEN_CONTENT_OPEN||s?.isAdmin===true;

function tabs(page){
 return `<nav class="token-tabs">${[['dungeon','토큰 던전'],['shop','토큰 교환소'],['race','토큰 경마']].map(([k,l])=>`<button class="${page===k?'active':''}" data-action="tokenPage" data-arg="${k}">${l}</button>`).join('')}</nav>`;
}
function head(s){
 return `<header class="token-head"><div><p class="eyebrow">TOKEN</p><h2>토큰 콘텐츠</h2></div><div class="token-wallet"><span class="token-coin" aria-hidden="true">◆</span><b>${fmt(tokenCount(s))}</b><small>토큰</small></div></header>${TOKEN_CONTENT_OPEN?'':'<p class="token-locked-note">🔒 공개 전 · 관리자만 시험할 수 있어요. 다른 유저에게는 보이지 않습니다.</p>'}`;
}

function dungeon(s,now){
 const left=tokenTriesLeft(s,now),best=s.tokenBoss?.best||0;
 const cards=TOKEN_BOSS_STAGES.map(t=>{
  const open=tokenStageOpen(s,t.stage),cleared=best>=t.stage;
  return `<article class="panel token-stage${open?'':' locked'}${cleared?' cleared':''}"><div class="token-stage-no">${t.stage}<small>단계</small></div><div class="token-stage-body"><strong>${esc(t.name)}</strong><small>HP ${big(t.hp)} · 공격 ${big(t.attack)} · 60초</small><small class="token-target">${esc(t.target)}</small></div><div class="token-stage-side"><b class="token-reward">◆ ${t.tokens}</b>${b(open?'도전':'이전 단계 클리어 필요','tokenBossStart',t.stage,'gold',!open||!left||!!s.battle)}</div></article>`;
 }).join('');
 return `<section class="panel pad token-info"><p>매일 <b>${TOKEN_DAILY_TRIES}회</b> 도전 · 남은 도전 <b>${left}/${TOKEN_DAILY_TRIES}</b> · 최고 클리어 <b>${best||0}단계</b></p><p class="note">입장하면 도전 1회 차감(실패해도 차감) · 제한 60초 · 처치하면 그 단계 토큰 지급 · 한 단계를 깨면 다음 단계가 열려요 · 매일 00시 초기화</p></section><div class="token-stage-list">${cards}</div>`;
}

function shop(s,now){
 const rows=TOKEN_SHOP.map(o=>{
  const bought=o.weekly?tokenShopBought(s,o.id,now):0,soldOut=o.weekly&&bought>=o.weekly,afford=tokenCount(s)>=o.cost;
  const amount=o.kind==='gold'?'':o.amount>1?` ×${fmt(o.amount)}`:'';
  return `<article class="panel token-offer"><div><strong>${esc(o.name)}${amount}</strong><small>${o.weekly?`주 ${o.weekly}회 한정 · 이번 주 ${bought}/${o.weekly}`:'제한 없음'}</small></div><b class="token-price">◆ ${fmt(o.cost)}</b><div class="token-buy">${b('1개','tokenShopBuy',o.id+':1','gold',soldOut||!afford)}${o.weekly&&o.weekly<10?'':b('10개','tokenShopBuy',o.id+':10','',soldOut||tokenCount(s)<o.cost*10||(o.weekly&&bought+10>o.weekly))}</div></article>`;
 }).join('');
 return `<section class="panel pad token-info"><p>토큰으로 게임 안의 소모품·재화를 교환해요.</p><p class="note">기준: 토큰 1개 ≈ 20만 골드 · 희귀 품목은 주간 한도(월요일 00시 초기화)</p></section><div class="token-shop-list">${rows}</div>`;
}

export const raceUI={lane:1,type:'win',bet:10,anim:null};
function race(s,now){
 const r=s.race,card=r?.card;
 if(!card)return `<section class="panel pad token-info"><p>경주표를 불러오는 중…</p>${b('경주표 불러오기','raceCard')}</section>`;
 const played=r.day===todayKey(now)?r.played||0:0,anim=raceUI.anim;
 const showCard=anim?anim.card:card;
 const horses=showCard.horses.map(h=>{
  const sel=!anim&&raceUI.lane===h.lane,rank=anim?anim.order.indexOf(h.lane)+1:0;
  return `<button class="token-horse${sel?' selected':''}${anim&&anim.lane===h.lane?' mine':''}" data-action="raceLane" data-arg="${h.lane}" ${anim?'disabled':''}><span class="lane">${h.lane}</span><span class="name">${esc(h.name)}</span><span class="cond">컨디션 ${h.power.toFixed(1)}</span><span class="odd">단승 <b>${h.win.toFixed(1)}배</b></span><span class="odd">연승 <b>${h.place.toFixed(1)}배</b></span>${rank?`<span class="rank r${rank}">${rank}등</span>`:''}</button>`;
 }).join('');
 const track=`<div class="token-track${anim?' running':''}${anim?.go?' go':''}">${showCard.horses.map(h=>{const rank=anim?anim.order.indexOf(h.lane)+1:0;return `<div class="token-lane"><span class="token-runner${anim&&anim.lane===h.lane?' mine':''}" style="--rank:${rank};--t:${anim?(3.4+rank*.35).toFixed(2):0}s">🐎<i>${h.lane}</i></span></div>`;}).join('')}<div class="token-finish"></div></div>`;
 const horse=card.horses[raceUI.lane-1],odds=horse?.[raceUI.type]||0,bet=Math.min(raceUI.bet,tokenCount(s));
 const controls=anim?`<p class="token-race-status">${anim.done?(anim.hit?`🎉 적중! ◆ ${fmt(anim.payout)} 획득 (${anim.odds.toFixed(1)}배)`:`아쉽게도 ${anim.rank}등 · ◆ ${fmt(anim.bet)} 잃음`):'달리는 중…'}</p>${anim.done?b('다음 경주','raceNext','','gold'):''}`
  :`<div class="token-bet"><div class="seg">${Object.entries(RACE_BETS).map(([k,l])=>`<button class="${raceUI.type===k?'active':''}" data-action="raceType" data-arg="${k}">${l}</button>`).join('')}</div><div class="seg">${[1,5,10,50,100].map(n=>`<button class="${raceUI.bet===n?'active':''}" data-action="raceAmount" data-arg="${n}">◆ ${n}</button>`).join('')}</div><p>${raceUI.lane}번 ${esc(horse?.name||'')} · ${RACE_BETS[raceUI.type].split(' · ')[0]} ${odds.toFixed(1)}배 · 적중 시 ◆ ${fmt(Math.floor(bet*odds))}</p>${b(`◆ ${bet} 걸고 출발`,'raceBet','','gold',bet<RACE_MIN_BET||(!s.isAdmin&&played>=RACE_DAILY))}</div>`;
 return `<section class="panel pad token-info"><p>오늘 경주 <b>${played}/${RACE_DAILY}</b> · 한 판 ◆ ${RACE_MIN_BET}~${RACE_MAX_BET}</p></section>${track}<div class="token-horses">${horses}</div>${controls}<details class="token-rules"><summary>경마 규칙 · 배당</summary><p>말 6마리가 달려요. 말마다 컨디션(1~10)이 있고, 컨디션이 높을수록 1등 할 확률이 높아요. 순위는 컨디션에 비례한 확률로 1등부터 차례로 정해집니다.</p><p>배당 = ${Math.round(RACE_RTP*100)}% ÷ 실제 확률 (소수 첫째 자리 내림, 최소 1.1배). 예) 1등 확률 30%인 말의 단승 배당은 3.0배. 오래 하면 건 토큰의 약 ${Math.round(RACE_RTP*100)}%가 돌아오고 나머지는 사라져요.</p><p>단승: 고른 말이 1등이면 적중 · 연승: 고른 말이 2등 안에 들면 적중(배당 낮음). 경주표는 베팅 전에 정해지고, 순위는 출발하는 순간 서버가 정합니다. 하루 ${RACE_DAILY}판.</p></details>`;
}

export function tokenView(s,page='dungeon',now=Date.now()){
 return `<section class="token-screen">${head(s)}${tabs(page)}${page==='shop'?shop(s,now):page==='race'?race(s,now):dungeon(s,now)}</section>`;
}
export function tokenBossResult(r){
 const t=TOKEN_BOSS_STAGES[r.stage-1];
 return `<div class="tower-result token-result"><div class="tower-portrait" style="background-image:url('tower/boss-${t.art}.webp')"></div><h3>${esc(t.name)} · ${r.stage}단계</h3><p>${r.won?'처치 '+r.seconds.toFixed(1)+'초':r.reason==='timeout'?'60초가 끝났습니다.':r.reason==='leave'?'도전을 종료했습니다.':'쓰러졌습니다.'}</p><p class="token-reward-big">${r.won?`◆ 토큰 ${r.tokens}개 획득`:'토큰 없음'}</p><p class="note">보유 토큰 ${fmt(r.total)}개</p></div>`;
}
