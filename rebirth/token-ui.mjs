// 토큰 던전 · 교환소 · 경마 화면 (보스 탭 > 토큰 던전). 공개 전에는 관리자에게만 보인다.
import {TOKEN_ART,tokenIcon} from './token-art.mjs';
import {currencyIconURL} from './currency-icons.mjs';
import {TOKEN_CONTENT_OPEN,TOKEN_BOSS_STAGES,TOKEN_DAILY_TRIES,TOKEN_SHOP,RACE_BETS,RACE_MIN_BET,RACE_MAX_BET,RACE_DAILY,RACE_RTP,tokenCount,tokenTriesLeft,tokenStageOpen,tokenShopBought} from './token-content.mjs?v=token-nofrag-20261102';

const fmt=n=>Math.floor(Number(n)||0).toLocaleString('ko-KR');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const big=n=>n>=1e8?(n/1e8).toFixed(n>=1e9?1:2).replace(/\.?0+$/,'')+'억':fmt(n);
const b=(label,action,arg='',cls='',disabled=false)=>`<button data-illustrated="1" class="tk ${cls}" data-action="${action}" data-arg="${esc(arg)}" data-write${disabled?' disabled data-unavailable':''}>${label}</button>`;
const todayKey=now=>new Date(now+9*3600e3).toISOString().slice(0,10);
export const tokenVisible=s=>TOKEN_CONTENT_OPEN||s?.isAdmin===true;

function sceneHero(key,title,subtitle){return `<section class="token-scene-hero"><img src="${TOKEN_ART[key]}" alt="${title}" decoding="async"><div><small>${subtitle}</small><h3>${title}</h3></div></section>`;}
function tabs(page){
 return `<nav class="token-tabs">${[['dungeon','토큰 던전'],['shop','토큰 교환소'],['race','토큰 경마']].map(([k,l])=>`<button data-illustrated="1" class="tk ${page===k?'active':''}" data-action="tokenPage" data-arg="${k}">${l}</button>`).join('')}</nav>`;
}
function head(s){
 return `<header class="token-head"><div><p class="eyebrow">TOKEN</p><h2>토큰 콘텐츠</h2></div><div class="token-wallet">${tokenIcon()}<b>${fmt(tokenCount(s))}</b><small>토큰</small></div></header>${TOKEN_CONTENT_OPEN?'':'<p class="token-locked-note">🔒 공개 전 · 관리자만 시험할 수 있어요. 다른 유저에게는 보이지 않습니다.</p>'}`;
}

function dungeon(s,now){
 const left=tokenTriesLeft(s,now),best=s.tokenBoss?.best||0;
 const cards=TOKEN_BOSS_STAGES.map(t=>{
  const open=tokenStageOpen(s,t.stage),cleared=best>=t.stage;
  return `<article class="token-stage${open?'':' locked'}${cleared?' cleared':''}"><div class="token-stage-no">${t.stage}<small>단계</small></div><div class="token-stage-body"><strong>HP ${big(t.hp)}${cleared?' <em class="token-clear">클리어</em>':''}</strong><small>공격 ${big(t.attack)}</small></div><div class="token-stage-side"><b class="token-reward">${tokenIcon()} ${t.tokens}</b>${b(open?'도전':'🔒','tokenBossStart',t.stage,open?'gold':'',!open||!left||!!s.battle)}</div></article>`;
 }).join('');
 return `<section class="token-boss-showcase"><img src="${TOKEN_ART.boss}" alt="황금 금고지기 마몬" decoding="async"><div><small>GOLDEN VAULT</small><h3>황금 금고지기 마몬</h3><p>황금 금고를 지키는 탐욕의 수호자</p></div></section><section class="token-dungeon-head"><div class="token-dungeon-boss"><strong>${esc(TOKEN_BOSS_STAGES[0].name)}</strong><small>제한 60초 · 처치하면 그 단계 토큰 지급</small></div><div class="token-tries"><small>남은 도전</small><b>${left}<i>/${TOKEN_DAILY_TRIES}</i></b></div></section><p class="token-subline">처치했을 때만 도전 1회 차감 · 실패하거나 나가면 차감 없음 · 한 단계를 깨면 다음 단계가 열려요 · 매일 00시 초기화 · 최고 클리어 <b>${best||0}단계</b></p><div class="token-stage-list">${cards}</div>`;
}

// 교환소: 종류별로 묶은 타일 격자. 아이콘·수량·가격·한도를 한 칸에 모아 한눈에 비교한다.
const SHOP_GROUPS=[
 ['강화 재료',['cube','highCube','primeCube','addCube','scroll','potentialLock','bonusFlame']],
 ['재화 · 소모품',['gold','luckPotion','dungeonKey']],
 ['일일 한정',['treasureTicket','companionTicket','pickupTicket','rerollStone']],
];
const SHOP_ART={luckPotion:'consumables/luck-potion-v1.webp'};
const offerIcon=o=>`<img src="${SHOP_ART[o.id]||currencyIconURL(o.key||o.id)}" alt="" loading="lazy">`;
const offerName=o=>o.name.replace(/\s*\d[\d,]*\s*(만|개)?$/,'');
const offerAmount=o=>o.kind==='gold'?'100만 골드':o.amount>1?'×'+fmt(o.amount):'';
function shopTile(s,o,now){
 const have=tokenCount(s),bought=o.daily?tokenShopBought(s,o.id,now):0,left=o.daily?o.daily-bought:Infinity,soldOut=left<=0,afford=have>=o.cost;
 const ten=!o.daily||o.daily>=10;
 return `<article class="token-tile${soldOut?' sold-out':''}${!afford&&!soldOut?' poor':''}" data-no-currency-art>
  <div class="token-tile-art">${offerIcon(o)}${o.daily?`<span class="token-tile-limit">${soldOut?'품절':`오늘 ${left}/${o.daily}`}</span>`:''}</div>
  <strong>${esc(offerName(o))}</strong><small>${offerAmount(o)||'&nbsp;'}${o.daily?`<span class="m-only">${offerAmount(o)?' · ':''}${soldOut?'품절':`오늘 ${left}/${o.daily}`}</span>`:''}</small>
  <b class="token-tile-price">${tokenIcon()} ${fmt(o.cost)}</b>
  <div class="token-tile-buy">${b(soldOut?'품절':'1개','tokenShopBuy',o.id+':1','gold',soldOut||!afford)}${ten?b('10개','tokenShopBuy',o.id+':10','',soldOut||have<o.cost*10||left<10):''}</div>
 </article>`;
}
function shop(s,now){
 const byId=new Map(TOKEN_SHOP.map(o=>[o.id,o])),used=new Set();
 const groups=SHOP_GROUPS.map(([title,ids])=>{const list=ids.map(id=>byId.get(id)).filter(Boolean);list.forEach(o=>used.add(o.id));return [title,list];});
 const rest=TOKEN_SHOP.filter(o=>!used.has(o.id));if(rest.length)groups.push(['기타',rest]);
 return `${sceneHero('exchange','토큰 교환소','모험의 증표를 보물로')}<p class="token-subline">토큰 1개 ≈ 20만 골드 · 일일 한정은 매일 00시 초기화</p>${groups.filter(([,l])=>l.length).map(([title,list])=>`<section class="token-shop-group"><h3>${title}</h3><div class="token-tile-grid">${list.map(o=>shopTile(s,o,now)).join('')}</div></section>`).join('')}`;
}

// 경마: 트랙 → 출전표(한 줄에 컨디션 막대·단승·연승) → 베팅 슬립 순서로 위에서 아래로 한 번에 읽힌다.
export const raceUI={lane:1,type:'win',bet:10,anim:null};
const LANE_COLORS=['#e8574d','#f2a33a','#e8d14a','#5bc46a','#4a9be8','#a87ce8'];
function race(s,now){
 const r=s.race,card=r?.card;
 if(!card)return `${sceneHero('race','왕실 경마장','여섯 마리의 질주, 승부의 순간')}<section class="panel pad token-info"><p>경주표를 불러오는 중…</p>${b('경주표 불러오기','raceCard')}</section>`;
 const played=r.day===todayKey(now)?r.played||0:0,anim=raceUI.anim,showCard=anim?anim.card:card,have=tokenCount(s);
 const rankOf=h=>anim?anim.order.indexOf(h.lane)+1:0;
 const track=`<div class="token-track${anim?' running':''}${anim?.go?' go':''}">${showCard.horses.map(h=>{const rank=rankOf(h);return `<div class="token-lane"><span class="token-runner${anim&&anim.lane===h.lane?' mine':''}" style="--rank:${rank};--t:${anim?(3.4+(rank-1)*.12).toFixed(2):0}s;--lc:${LANE_COLORS[(h.lane-1)%6]}"><img src="${TOKEN_ART.horse}" alt="" decoding="async"><i>${h.lane}</i></span></div>`;}).join('')}<div class="token-finish"></div></div>`;
 const rows=showCard.horses.map(h=>{
  const sel=!anim&&raceUI.lane===h.lane,mine=anim&&anim.lane===h.lane,rank=rankOf(h),showRank=rank&&anim.done;
  return `<button data-illustrated="1" class="tk token-runner-row${sel?' selected':''}${mine?' mine':''}" data-action="raceLane" data-arg="${h.lane}" ${anim?'disabled':''} style="--lc:${LANE_COLORS[(h.lane-1)%6]}">
   <span class="lane">${h.lane}</span>
   <span class="who"><b>${esc(h.name)}${showRank?` <em class="rank r${rank}">${rank}등</em>`:''}</b><span class="cond" title="컨디션 ${h.power.toFixed(1)}"><i style="width:${Math.max(4,Math.min(100,h.power*10))}%"></i></span><small>컨디션 ${h.power.toFixed(1)}</small></span>
   <span class="odd${raceUI.type==='win'?' on':''}">${h.win.toFixed(1)}<small>배</small></span>
   <span class="odd${raceUI.type==='place'?' on':''}">${h.place.toFixed(1)}<small>배</small></span>
  </button>`;
 }).join('');
 const table=`<div class="token-runner-table"><div class="token-runner-head"><span>번</span><span>말 · 컨디션</span><span>단승</span><span>연승</span></div>${rows}</div>`;
 let slip;
 if(anim){
  slip=`<div class="panel token-slip result${anim.done?(anim.hit?' hit':' miss'):''}"><p class="token-race-status">${anim.done?(anim.hit?`🎉 적중! ${tokenIcon()} ${fmt(anim.payout)} 획득 <small>(${anim.odds.toFixed(1)}배)</small>`:`아쉽게도 ${anim.rank}등 · ${tokenIcon()} ${fmt(anim.bet)} 잃음`):'달리는 중…'}</p>${anim.done?b('다음 경주','raceNext','','gold'):''}</div>`;
 }else{
  const horse=card.horses[raceUI.lane-1],odds=horse?.[raceUI.type]||0,bet=Math.min(raceUI.bet,have),limit=!s.isAdmin&&played>=RACE_DAILY;
  slip=`<div class="panel token-slip">
   <div class="token-slip-row"><span>방식</span><div class="seg">${Object.entries(RACE_BETS).map(([k,l])=>`<button data-illustrated="1" class="tk ${raceUI.type===k?'active':''}" data-action="raceType" data-arg="${k}">${l.split(' · ')[0]}<small>${l.split(' · ')[1]||''}</small></button>`).join('')}</div></div>
   <div class="token-slip-row"><span>금액</span><div class="seg">${[1,5,10,50,100].map(n=>`<button data-illustrated="1" class="tk ${raceUI.bet===n?'active':''}" data-action="raceAmount" data-arg="${n}" ${have<n?'data-short':''}>${tokenIcon()} ${n}</button>`).join('')}</div></div>
   <div class="token-slip-sum"><div><small>내 선택</small><b><i class="dot" style="--lc:${LANE_COLORS[(raceUI.lane-1)%6]}"></i>${raceUI.lane}번 ${esc(horse?.name||'')}</b></div><div><small>${RACE_BETS[raceUI.type].split(' · ')[0]} 배당</small><b>${odds.toFixed(1)}배</b></div><div><small>적중 시</small><b class="gain">${tokenIcon()} ${fmt(Math.floor(bet*odds))}</b></div></div>
   ${b(limit?'오늘 경주 끝':`${tokenIcon()} ${bet} 걸고 출발`,'raceBet','','gold token-go',bet<RACE_MIN_BET||limit)}
  </div>`;
 }
 return `${sceneHero('race','왕실 경마장','여섯 마리의 질주, 승부의 순간')}<p class="token-subline">오늘 경주 <b>${played}/${RACE_DAILY}</b> · 한 판 ${tokenIcon()} ${RACE_MIN_BET}~${RACE_MAX_BET} · 말을 눌러 고르세요</p>${track}${table}${slip}<details class="token-rules"><summary>경마 규칙 · 배당</summary><p>말 6마리가 달려요. 말마다 컨디션(1~10)이 있고, 컨디션이 높을수록 1등 할 확률이 높아요. 순위는 컨디션에 비례한 확률로 1등부터 차례로 정해집니다.</p><p>배당 = ${Math.round(RACE_RTP*100)}% ÷ 실제 확률 (소수 첫째 자리 내림, 최소 1.1배). 예) 1등 확률 30%인 말의 단승 배당은 3.0배. 오래 하면 건 토큰의 약 ${Math.round(RACE_RTP*100)}%가 돌아오고 나머지는 사라져요.</p><p>단승: 고른 말이 1등이면 적중 · 연승: 고른 말이 2등 안에 들면 적중(배당 낮음). 경주표는 베팅 전에 정해지고, 순위는 출발하는 순간 서버가 정합니다. 하루 ${RACE_DAILY}판.</p></details>`;
}

export function tokenView(s,page='dungeon',now=Date.now()){
 return `<section class="token-screen">${head(s)}${tabs(page)}${page==='shop'?shop(s,now):page==='race'?race(s,now):dungeon(s,now)}</section>`;
}
export function tokenBossResult(r){
 const t=TOKEN_BOSS_STAGES[r.stage-1];
 return `<div class="tower-result token-result"><img class="token-result-boss" src="${TOKEN_ART.boss}" alt="${esc(t.name)}"><h3>${esc(t.name)} · ${r.stage}단계</h3><p>${r.won?'처치 '+r.seconds.toFixed(1)+'초':r.reason==='timeout'?'60초가 끝났습니다.':r.reason==='leave'?'도전을 종료했습니다.':'쓰러졌습니다.'}</p><p class="token-reward-big">${r.won?`${tokenIcon()} 토큰 ${r.tokens}개 획득`:'토큰 없음'}</p><p class="note">보유 토큰 ${fmt(r.total)}개</p></div>`;
}
