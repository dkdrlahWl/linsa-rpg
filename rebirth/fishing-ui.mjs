import {FISHING_DAILY_CASTS,ROD_MAX,fishingQuestsReady,FISH,SPOTS,RARITIES,BAITS,FISHING_QUESTS,REWARD_RATES,fishPrice,fishYield,fishWeight,rodGoldCost,rodDiamondCost,resourceName,aquariumExpandCost,DIAMOND_EXCHANGE,DIAMOND_EXCHANGE_DAILY,CONTEST_REWARDS,CONTEST_START,contestWeek,contestWeekEnd,contestTarget} from './fishing-data.mjs';
import {mountFishingScene} from './fishing-motion.mjs?v=fishing-line-180';
import {normalizeFishing,aquariumBank} from './fishing-model.mjs';
import {fantasyHeader,fantasyFooter} from './fantasy-ui.mjs';
import {currencyIconURL} from './currency-icons.mjs';
import {replacePreservingDetails} from './disclosure-state.mjs';
const fmt=n=>Math.floor(n||0).toLocaleString('ko-KR');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const fishingUI={spot:'brook',bait:'worm',panel:'fish',collectionSpot:'brook',auto:false,notify:null};
const NEW_FISHING_ART=/^(?:fish-(?:5[1-9]|[67]\d|80)|scene-(?:palace|volcano|origin)(?:-thumb)?|rod-(?:50|60|70))$/;
const url=id=>new URL('./fishing/'+id+'.webp'+(NEW_FISHING_ART.test(id)?'?v=fishing-expansion-art-20261025':''),import.meta.url).href;
export const fishingRodArt=level=>level>=70?'rod-70':level>=60?'rod-60':level>=50?'rod-50':'rod';
export const fishingArt=id=>['cube','scroll','highCube','primeCube','addCube'].includes(id)?currencyIconURL(id):url(id);
const image=(id,cls='',alt='')=>`<img class="${cls}" src="${fishingArt(id)}" alt="${esc(alt)}" loading="lazy" decoding="async">`;
const MENU_ART={fish:'fish',tank:'tank',rod:'rod',shop:'shop',quests:'quests',collection:'collection',contest:'collection',exchange:'shop'};
const ACTION_ART={fishAquariumAuto:'tank',fishAuto:'cast',fishCast:'cast',fishHook:'cast',fishCancel:'cancel',fishBaitBuy:'shop',fishTrain:'upgrade',fishUpgrade:'upgrade',fishSell:'sell',fishSellAll:'sell',fishSellAllConfirm:'sell',fishAquariumAdd:'tank',fishAquariumRemove:'tank',fishAquariumClaim:'sell',fishAquariumExpand:'upgrade',fishQuestClaim:'quests',fishExchange:'shop',fishContestClaim:'quests',fishCollectionSpot:'map'};
const menuIcon=id=>`<img class="fishing-button-art" src="${url('menu-'+id)}" alt="" width="28" height="28" decoding="async">`;
const button=(text,action,arg='',disabled=false,cls='')=>{const icon=action==='fishPanel'?MENU_ART[arg]:action==='eventPage'?(arg==='lotto'?'lotto':arg==='treasure'?'treasure':'cast'):ACTION_ART[action]||'map',write=action.startsWith('fish')&&!['fishPanel','fishCollectionSpot','fishSpot','fishSellAll','fishAuto'].includes(action);return `<button class="${cls}" data-illustrated="1" data-action="${action}" data-arg="${arg}" ${write?'data-fish-write data-write="1"':''} ${disabled?'disabled data-unavailable':''}>${menuIcon(icon)}<span>${text}</span></button>`;};
function fishCard(fish,place='bag'){
 const d=FISH.find(x=>x.id===fish.species),r=RARITIES[d.rarity];
 return `<article class="fish-card" style="--rarity:${r.color}"><div class="fish-portrait">${image(d.id,'',d.name)}<span>${r.name}</span></div><strong>${d.name}</strong><small>${fishWeight(fish.weight)}</small><b>${place==='tank'?fmt(fishYield(fish))+' G / 시간':fmt(fishPrice(fish))+' G'}</b><div>${place==='tank'?button('꺼내기','fishAquariumRemove',fish.id):button('판매','fishSell',fish.id)+button('수족관','fishAquariumAdd',fish.id)}</div></article>`;
}
// 대어 대회 보상 중 아직 안 받은 주(서버 순위 기준).
export const contestRewardsReady=f=>(fishingUI.contest?.rewards||[]).filter(r=>!(f?.contestClaims||[]).includes(r.week)).length;
const leftText=ms=>{const h=Math.max(0,Math.floor(ms/3600000));return h>=24?Math.floor(h/24)+'일 '+(h%24)+'시간':h+'시간 '+Math.max(0,Math.floor(ms%3600000/60000))+'분';};
function contestPanel(f){
 const now=Date.now(),current=contestWeek(now),week=current<CONTEST_START?CONTEST_START:current,target=contestTarget(week),d=FISH.find(x=>x.id===target.species),spot=SPOTS.find(x=>x.id===target.spot),r=RARITIES[d.rarity],board=fishingUI.contest,started=current>=CONTEST_START;
 const mine=f.contest?.[week],pending=(board?.rewards||[]).filter(x=>!(f.contestClaims||[]).includes(x.week));
 const name=id=>FISH.find(x=>x.id===id)?.name||'';
 const rows=(list,me=true)=>list.length?list.map(x=>`<li class="${x.isMe?'me':''}"><b>${x.rank}위</b><span>${esc(x.name)}</span><em>${fishWeight(x.weight)}</em></li>`).join(''):'<li class="empty">아직 기록이 없어요.</li>';
 return `<div class="fishing-panel-title"><div><h2>주간 대어 대회</h2><small>${started?'종료까지 '+leftText(contestWeekEnd(week)-now)+' · 월요일 0시 초기화':'10월 26일(월) 0시 시작'} · 참가 ${fmt(board?.total)}명</small></div></div>
 <article class="fishing-contest-target" style="--rarity:${r.color}">${image(d.id,'',d.name)}<div><small>이번 주 대상 · ${spot.name} (낚싯대 Lv.${Math.max(spot.level,d.level)})</small><strong>${d.name} <em>${r.name}</em></strong><span>가장 무거운 한 마리로 순위 · 최대 ${fishWeight(d.max)}</span><span>내 기록 <b>${mine?fishWeight(mine.weight):'없음'}</b></span></div></article>
 ${pending.map(x=>`<article class="fishing-quest">${image('diamond')}<div><strong>${x.week.slice(5).replace('-','/')} 주 대어 대회 ${x.rank}위!</strong><small>${(c=>'다이아 '+c.diamonds+'개 · 에디셔널 큐브 '+c.addCube+'개')(CONTEST_REWARDS.find(c=>c.rank===x.rank))}</small></div>${button('보상 받기','fishContestClaim',x.week)}</article>`).join('')}
 <div class="fishing-contest-rewards">${CONTEST_REWARDS.filter((c,i)=>i<2).map(c=>`<span><b>${c.rank===1?'1위':'2~3위'}</b> 다이아 ${c.diamonds} · 에디셔널 큐브 ${c.addCube}</span>`).join('')}<span><b>4위~</b> 보상 없음</span></div>
 <div class="fishing-contest-board"><h3>이번 주 순위</h3><ol>${board?rows(board.top):'<li class="empty">순위를 불러오는 중…</li>'}</ol>${board?.last?.length?`<h3>지난주 1~3위 · ${name(board.last[0].species)}</h3><ol>${rows(board.last)}</ol>`:''}</div>
 <p class="fishing-note">보상은 대회가 끝난 뒤 4주 안에 여기서 받을 수 있어요.</p>`;
}
function exchangePanel(f){
 const used=f.daily?.exchanged||0,left=Math.max(0,DIAMOND_EXCHANGE_DAILY-used);
 return `<div class="fishing-panel-title"><div><h2>다이아 교환소</h2><small>보유 다이아 ${fmt(f.diamonds)}개 · 오늘 ${used}/${DIAMOND_EXCHANGE_DAILY}개 교환 · 자정 초기화</small></div></div><div class="fishing-exchange" data-no-currency-art>${DIAMOND_EXCHANGE.map(x=>{const most=Math.min(left,Math.floor((f.diamonds||0)/x.diamonds));const b=(label,n)=>`<button data-illustrated="none" data-action="fishExchange" data-arg="${x.id}:${n}" data-fish-write data-write="1" ${most<n||n<1?'disabled data-unavailable':''}>${label}</button>`;return `<article>${image(x.id,'',x.name)}<div><h3>${x.name}</h3><small>다이아 ${x.diamonds}개 → 1개 · 최대 ${most}개</small></div><div class="fishing-exchange-buttons">${b('1개',1)}${b('5개',5)}${b(`최대 ${most}`,most)}</div></article>`;}).join('')}</div>`;
}
function panelBody(s,f){
 if(fishingUI.panel==='contest')return contestPanel(f);
 if(fishingUI.panel==='exchange')return exchangePanel(f);
 if(fishingUI.panel==='fish')return `<div class="fishing-panel-title"><div><h2>오늘의 물고기</h2><small>같은 종도 무거울수록 비싸요 · ${f.fish.length}/150마리</small></div><div class="fishing-title-actions">${button('수족관 최적 배치','fishAquariumAuto','',!f.fish.length)}${button('가방 전부 판매','fishSellAll','',!f.fish.length)}</div></div><div class="fish-grid">${f.fish.length?f.fish.slice().reverse().map(x=>fishCard(x)).join(''):'<div class="fishing-empty"><strong>첫 물고기를 만나볼까요?</strong><p>미끼를 고르고 낚싯대를 던져 주세요.<br>기본 미끼 20개가 준비되어 있어요.</p></div>'}</div>`;
 if(fishingUI.panel==='tank')return `<div class="fishing-panel-title"><div><h2>나의 작은 수족관</h2><small>${f.aquarium.length}/${f.slots}마리 · 시간당 ${fmt(f.aquarium.reduce((n,x)=>n+fishYield(x),0))} G</small></div>${button('최적 배치','fishAquariumAuto','',!f.fish.length)}</div><div class="fishing-bank">${image('diamondChest')}<div><small>쌓인 골드 · 최대 12시간</small><strong>${fmt(aquariumBank(f,Date.now()))} G</strong><span>수족관에 넣은 물고기는 꺼낸 뒤 판매할 수 있어요.</span></div>${button('골드 받기','fishAquariumClaim','',aquariumBank(f,Date.now())<1,'fishing-gold')}</div><div class="fish-grid">${f.aquarium.length?f.aquarium.map(x=>fishCard(x,'tank')).join(''):'<div class="fishing-empty"><strong>물고기를 넣어 나만의 수족관을 꾸며요</strong><p>물고기 가방에서 ‘수족관’을 눌러주세요.</p></div>'}</div>${f.slots<10?button('수족관 확장 · '+fmt(aquariumExpandCost(f.slots))+' G','fishAquariumExpand','',s.gold<aquariumExpandCost(f.slots)):'<p class="fishing-note">최대 10칸 수족관이에요.</p>'}`;
 if(fishingUI.panel==='rod'){
  const max=f.rod>=ROD_MAX,cost=rodGoldCost(f.rod),remaining=Math.max(0,cost-f.xp);
  return `<div class="rod-showcase">${image(fishingRodArt(f.rod),'', '낚싯대')}<div><small>별을 낚는 여행</small><h2>낚싯대 Lv.${f.rod} <em>/ ${ROD_MAX}</em></h2><p>높은 레벨에서 더 깊은 낚시터와 희귀한 물고기가 열립니다.</p></div></div>${max?'<div class="fishing-empty"><strong>최고 레벨에 도달했어요!</strong></div>':`<div class="rod-training"><div><span>다음 레벨 경험치</span><b>${fmt(f.xp)} / ${fmt(cost)}</b></div><progress value="${f.xp}" max="${cost}"></progress><p>골드 1 G → 경험치 1 · 경험치를 가득 채운 뒤 다이아로 레벨업</p><div class="fishing-actions">${button('경험치 25% 채우기 · '+fmt(Math.min(remaining,Math.ceil(cost/4)))+' G','fishTrain',Math.min(remaining,Math.ceil(cost/4)),!remaining||s.gold<Math.min(remaining,Math.ceil(cost/4)))}${button('경험치 전부 채우기 · '+fmt(remaining)+' G','fishTrain',remaining,!remaining||s.gold<remaining)}</div>${button('Lv.'+(f.rod+1)+' 레벨업 · 다이아 '+rodDiamondCost(f.rod),'fishUpgrade','',remaining>0||f.diamonds<rodDiamondCost(f.rod),'fishing-gold')}</div>`}<div class="rod-milestones">${SPOTS.map(x=>`<span class="${f.rod>=x.level?'unlocked':''}">Lv.${x.level} ${x.name}</span>`).join('')}<span class="${f.rod>=35?'unlocked':''}">Lv.35 전설 출현</span><span class="${f.rod>=45?'unlocked':''}">Lv.45 신화 출현</span></div>`;
 }
 if(fishingUI.panel==='shop')return `<div class="fishing-panel-title"><div><h2>물가의 낚시 상점</h2><small>좋은 미끼일수록 높은 등급 물고기 확률 상승 · 입질이 오면 100% 낚아요</small></div></div><div class="bait-shop">${BAITS.map(x=>`<article>${image(x.id,'',x.name)}<div><h3>${x.name}</h3><small>낚싯대 Lv.${x.level} · 높은 등급 1단계마다 ${(1+x.luck).toFixed(1)}배 · 보유 ${fmt(f.bait[x.id])}개</small><b>${x.pack}개 · ${x.gold?fmt(x.gold)+' G':'다이아 '+x.diamonds+'개'}</b></div>${button(x.pack+'개 구매','fishBaitBuy',x.id,f.rod<x.level||(x.gold?s.gold<x.gold:f.diamonds<x.diamonds))}</article>`).join('')}</div><p class="fishing-note">던전 열쇠는 링구의 탐험을 시작할 때 방장이 사용해요.</p>`;
 if(fishingUI.panel==='quests')return `<div class="fishing-panel-title"><div><h2>매일의 낚시 여행</h2><small>한국 시간 자정 초기화 · 하루 다이아 ${FISHING_QUESTS.reduce((n,q)=>n+q.diamonds,0)}개</small></div></div>${FISHING_QUESTS.map(q=>`<article class="fishing-quest">${image('diamond')}<div><strong>${q.name}</strong><small>${Math.min(q.goal,f.daily[q.id]||0)} / ${q.goal} · 다이아 ${q.diamonds}개</small><progress value="${f.daily[q.id]||0}" max="${q.goal}"></progress></div>${button(f.daily.claimed.includes(q.id)?'완료':'받기','fishQuestClaim',q.id,(f.daily[q.id]||0)<q.goal||f.daily.claimed.includes(q.id))}</article>`).join('')}`;
 const spot=SPOTS.find(x=>x.id===fishingUI.collectionSpot);
 return `<div class="fishing-panel-title"><div><h2>물고기 도감</h2><small>${FISH.length}종 · 전설 ${FISH.filter(x=>x.rarity===4).length}종 · 신화 ${FISH.filter(x=>x.rarity===5).length}종 · 태고 ${FISH.filter(x=>x.rarity===6).length}종 · 발견 ${Object.keys(f.collection).filter(id=>FISH.some(x=>x.id===id)).length}/${FISH.length}</small></div></div><div class="fishing-site-filter">${SPOTS.map(x=>button(x.name,'fishCollectionSpot',x.id,false,x.id===spot.id?'active':'')).join('')}</div><div class="fish-grid collection">${FISH.filter(x=>x.spot===spot.id).map(d=>{const weight=f.collection[d.id],r=RARITIES[d.rarity];return `<article class="fish-card ${weight?'discovered':'undiscovered'}" style="--rarity:${r.color}"><div class="fish-portrait">${image(d.id,'',d.name)}<span>${r.name}</span></div><strong>${d.name}</strong><small>출현 Lv.${d.level} · ${fmt(fishPrice({species:d.id,weight:d.min}))}~${fmt(fishPrice({species:d.id,weight:d.max}))} G</small><b>${weight?'최대 '+fishWeight(weight):'아직 만나지 못했어요'}</b><small>${fishWeight(d.min)} ~ ${fishWeight(d.max)}</small></article>`;}).join('')}</div>`;
}
export function fishingView(s){
 const f=normalizeFishing({fishing:s.fishing?structuredClone(s.fishing):undefined},Date.now());
 // 낚시 화면에 들어올 때마다 갈 수 있는 가장 높은 낚시터로 바로 이동.
 if(!fishingUI.entered){fishingUI.entered=true;const best=SPOTS.filter(x=>x.level<=f.rod).sort((a,b)=>b.level-a.level)[0];if(best)fishingUI.spot=best.id;}
 const spot=SPOTS.find(x=>x.id===(f.cast?.spot||fishingUI.spot))||SPOTS[0],cast=f.cast;
 if(!BAITS.some(x=>x.id===fishingUI.bait&&x.level<=f.rod))fishingUI.bait='worm';
 const caught=!cast?f.lastCatch:null,d=caught?.won&&caught.reward==='fish'?FISH.find(x=>x.id===caught.species):null;
 const phase=cast?(cast.hookAt?'reeling':Date.now()<cast.started+900?'casting':Date.now()<cast.biteAt?'waiting':'bite'):caught?'caught':'idle';
 const phaseText=cast?'찌를 바라보며 입질을 기다려요':caught?caught.won?(d?d.name+' · '+fishWeight(caught.weight):resourceName(caught.reward)+(caught.diamonds?' · 다이아 '+caught.diamonds+'개':' 획득'))+(caught.treasureTicket?' · 🎫 보물 찾기 티켓 +1':''):'다시 던져 보세요.':(f.daily?.casts||0)>=FISHING_DAILY_CASTS?'오늘 낚시 횟수를 모두 썼어요 · 자정에 초기화':'미끼를 고르고 물가에 찌를 던져요 · 오늘 '+(f.daily?.casts||0)+'/'+FISHING_DAILY_CASTS+'회';
 return `<section class="fishing-screen" data-currency-label style="--site-accent:${spot.accent}" aria-label="판타지 낚시">${fantasyHeader(s,'event')}<div class="fishing-scroll"><nav class="fishing-event-switch">${button('낚시 여행','eventPage','fishing',false,'active').replace(/<\/button>$/,fishingQuestsReady(s)?`<b class="fantasy-mail-count">${fishingQuestsReady(s)}</b></button>`:'</button>')}${button('주간 로또','eventPage','lotto')}${button('보물 찾기','eventPage','treasure')}</nav><section class="fishing-play" aria-label="낚시 장면과 조작"><div class="fishing-scene" data-site="${spot.id}" data-phase="${phase}"><img class="fishing-scene-art" src="${url('scene-'+spot.id)}" alt="${spot.name}의 아름다운 풍경" fetchpriority="high" decoding="async"><div class="fishing-water" style="background-image:url('${url('scene-'+spot.id)}')"></div><div class="fishing-water-light"></div><div class="fishing-scene-shade"></div><header class="fishing-title"><small>${spot.subtitle}</small><h1>${spot.name}</h1></header><span class="fishing-rod-chip">${image(fishingRodArt(f.rod),'fishing-rod-mini','낚싯대')}낚싯대 Lv.${f.rod} · 오늘 ${(f.daily?.casts||0)}/${FISHING_DAILY_CASTS}</span><div class="fishing-angler" aria-label="낚시 중인 모험가" data-pose="${phase==='reeling'?4:phase==='caught'&&caught?.won?5:0}"></div><svg class="fishing-line" aria-hidden="true"><path fill="none" stroke="#fff3cf" stroke-opacity=".8" stroke-width=".7" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg><div class="fishing-ripple"></div><div class="fishing-bobber"></div><div class="fishing-splash"></div><div class="fishing-bite-alert" role="status">입질!<small>바로 낚아올려요</small></div>${d?`<img class="fishing-result-fish" src="${url(d.id)}" alt="잡은 ${d.name}">`:''}<div class="fishing-catch-notice" data-fish-notice aria-live="polite">${phaseText}</div></div><section class="fishing-console"><div class="fishing-console-top"><strong data-fish-status>${phaseText}</strong><span>미끼 ${fmt(f.bait[fishingUI.bait])}개</span></div><p class="fishing-instant-note">입질이 오면 자동으로 100% 낚아요 · 던진 뒤 5~9초 · <b class="fishing-daily-count${(f.daily?.casts||0)>=FISHING_DAILY_CASTS?' is-full':''}">오늘 ${(f.daily?.casts||0)}/${FISHING_DAILY_CASTS}회</b> (하루 ${FISHING_DAILY_CASTS}번 · 자정 초기화)</p><div class="fishing-controls"><label class="fishing-bait-select"><select id="fishing-bait" aria-label="미끼" ${cast?'disabled':''}>${BAITS.filter(x=>x.level<=f.rod).map(x=>`<option value="${x.id}" ${x.id===fishingUI.bait?'selected':''}>${x.name} (${fmt(f.bait[x.id])})</option>`).join('')}</select></label>${cast?`<button class="fishing-pull fishing-gold" data-fish-pull data-illustrated="1" type="button">${menuIcon('cast')}<span data-fish-pull-label>입질 기다리기</span></button>${button('그만두기','fishCancel',cast.id,false,'fishing-cancel')}`:button(f.rod<spot.level?'Lv.'+spot.level+' 필요':'낚싯대 던지기','fishCast','',f.rod<spot.level||!(f.bait[fishingUI.bait]>0)||f.fish.length>=150,'fishing-gold')}${button(fishingUI.auto?'오토 ON':'오토 OFF','fishAuto','',false,'fishing-auto'+(fishingUI.auto?' active':''))}</div><div class="fishing-transaction" data-fish-transaction role="status" aria-live="polite"></div></section></section><nav class="fishing-sites" aria-label="낚시터 선택">${SPOTS.map(x=>`<button data-action="fishSpot" data-arg="${x.id}" data-illustrated="1" class="${x.id===spot.id?'active':''}" ${cast?'disabled':''}><img src="${url('scene-'+x.id+'-thumb')}" alt="" loading="lazy" decoding="async"><span>${x.name}<small>Lv.${x.level}${f.rod<x.level?' · 잠김':''}</small></span></button>`).join('')}</nav><nav class="fishing-panels" aria-label="낚시 메뉴">${[['fish','물고기'],['tank','수족관'],['rod','낚싯대'],['shop','상점'],['quests','일일퀘스트'],['collection','도감'],['contest','대어 대회'],['exchange','교환소']].map(([id,name])=>{const badge=id==='quests'?fishingQuestsReady(s):id==='contest'?contestRewardsReady(f):0;return button(name,'fishPanel',id,false,fishingUI.panel===id?'active':'').replace(/<\/button>$/,badge?`<b class="fantasy-mail-count">${badge}</b></button>`:'</button>');}).join('')}</nav><section class="fishing-panel">${panelBody(s,f)}</section><section class="fishing-loot"><h2>물결 속 작은 보물</h2><div>${['diamondChest','dungeonKey'].map(id=>`<article>${image(id,'',resourceName(id))}<span>${resourceName(id)}</span><small>${id==='diamondChest'?'다이아 '+fmt(f.diamonds)+'개':'보유 '+fmt(s.materials?.[id])+'개'}</small></article>`).join('')}<article>${image('treasureTicket','','보물 찾기 티켓')}<span>보물 찾기 티켓</span><small>보유 ${fmt(s.treasure?.tickets||0)}장</small></article></div></section></div>${fantasyFooter('event')}</section>`;
}
// Keep the scene and pointer target alive while menus or server acknowledgements update.
const viewCache=new WeakMap();
export function updateFishingView(app,html,castId){
 const template=document.createElement('template');template.innerHTML=html;
 const fresh=template.content.querySelector('.fishing-screen'),old=app.querySelector('.fishing-screen');
 const selectors=['.fantasy-header','.fantasy-dock','.fishing-event-switch','.fishing-sites','.fishing-panels','.fishing-panel','.fishing-loot'];
 const next={root:old,castId,scene:fresh.querySelector('.fishing-scene').outerHTML,console:fresh.querySelector('.fishing-console').outerHTML,parts:Object.fromEntries(selectors.map(key=>[key,fresh.querySelector(key)?.innerHTML]))};
 const previous=viewCache.get(app);
 if(!old||previous?.root!==old){app.innerHTML=html;next.root=app.querySelector('.fishing-screen');}
 else{
  old.style.cssText=fresh.style.cssText;
  for(const key of selectors){
   if(previous.parts[key]===next.parts[key])continue;
   const target=old.querySelector(key),source=fresh.querySelector(key);if(!target||!source)continue;
   if(key==='.fishing-panel')replacePreservingDetails(target,'fishing-'+fishingUI.panel,source.innerHTML);
   else target.innerHTML=source.innerHTML;
  }
  if(!castId||previous.castId!==castId){
   const oldScene=old.querySelector('.fishing-scene'),newScene=fresh.querySelector('.fishing-scene');
   // A pending cast already has its own animation, even before the server returns its ID.
   if((!castId&&fishingUI.pending!=='fishCast'&&previous.scene!==next.scene)||oldScene.dataset.site!==newScene.dataset.site)oldScene.replaceWith(newScene);
   if(previous.console!==next.console)old.querySelector('.fishing-console').replaceWith(fresh.querySelector('.fishing-console'));
  }
 }
 viewCache.set(app,next);
}
export function showFishingPending(root,action,{animate=true}={}){
 if(!root)return;root.setAttribute('aria-busy','true');
 root.querySelectorAll('[data-fish-write]').forEach(b=>{b.disabled=true;});
 const labels={fishTrain:'골드로 경험치를 채우는 중…',fishUpgrade:'낚싯대 강화 중…',fishCast:'낚싯대를 던지는 중…',fishHook:'낚아올리는 중…',fishFinish:'잡은 보상을 받는 중…'};
 const status=root.querySelector('[data-fish-transaction]');if(status)status.textContent=labels[action]||'처리 중…';
 root.querySelectorAll(`[data-action="${action}"]`).forEach(b=>b.classList.add('fishing-pending'));
 if(action==='fishCast')root.querySelectorAll('.fishing-sites button').forEach(b=>{b.disabled=true;});
 if(action==='fishCast'&&animate){
  const scene=root.querySelector('.fishing-scene');if(!scene)return;scene.dataset.phase='casting';
  scene.querySelector('.fishing-result-fish')?.remove();
  scene.querySelector('[data-fish-notice]').textContent='낚싯대를 던지는 중…';
  const angler=scene.querySelector('.fishing-angler');angler.dataset.pose='1';
  pendingCastStarted=Date.now();sceneController?.dispose();sceneController=mountFishingScene(scene,pendingCastStarted);
  setTimeout(()=>{if(scene.isConnected&&scene.dataset.phase==='casting')angler.dataset.pose='2';},220);
  setTimeout(()=>{if(scene.isConnected&&scene.dataset.phase==='casting'){angler.dataset.pose='0';scene.dataset.phase='waiting';}},900);
 }
}
let controller=null,localCast=null,sceneController=null,pendingCastStarted=null;
// Auto fishing: after each catch, cast again with the selected spot/bait while the toggle stays on.
let autoTimer=0,autoState=null,autoSend=null;
export function stopAutoFishing(reason){fishingUI.auto=false;clearTimeout(autoTimer);autoTimer=0;const b=document.querySelector('.fishing-screen [data-action="fishAuto"]');if(b){b.classList.remove('active');const t=b.querySelector('span');if(t)t.textContent='오토 OFF';}if(reason)fishingUI.notify?.(reason);}
function autoBlocker(s){
 const f=s?.fishing;if(!f)return '낚시 정보를 불러오지 못했어요.';
 const spot=SPOTS.find(x=>x.id===fishingUI.spot),bait=document.querySelector('#fishing-bait')?.value||fishingUI.bait;
 if(!spot||(f.rod||1)<spot.level)return '이 낚시터는 낚싯대 레벨이 부족해요.';
 if(!((f.bait?.[bait]||0)>0))return '미끼가 떨어져서 오토 낚시를 멈췄어요.';
 if((f.fish?.length||0)>=150)return '가방이 가득 차서 오토 낚시를 멈췄어요.';
 if((f.daily?.casts||0)>=FISHING_DAILY_CASTS)return '오늘 낚시 횟수를 다 써서 오토 낚시를 멈췄어요.';
 return '';
}
export function scheduleAutoFishing(delay=1200){
 if(!fishingUI.auto||autoTimer)return;
 autoTimer=setTimeout(async()=>{
  autoTimer=0;if(!fishingUI.auto)return;
  if(!document.querySelector('.fishing-screen'))return stopAutoFishing();
  // Wait for the previous request, a hidden tab or an active cast instead of spending bait.
  if(fishingUI.pending||document.hidden||autoState?.fishing?.cast)return scheduleAutoFishing(700);
  const blocked=autoBlocker(autoState);if(blocked)return stopAutoFishing(blocked);
  fishingUI.bait=document.querySelector('#fishing-bait')?.value||fishingUI.bait;
  try{const result=await autoSend?.('fishCast',{spot:fishingUI.spot,bait:fishingUI.bait,protocol:4});if(!result&&fishingUI.auto)scheduleAutoFishing(1500);}
  catch{stopAutoFishing('낚시 요청이 실패해서 오토 낚시를 멈췄어요.');}
 },delay);
}
export function stopFishing(){controller?.dispose();controller=null;sceneController?.dispose();sceneController=null;}
// Instant catch: the bite automatically lands the fish once. Manual tap only retries.
export function mountFishing(root,state,send){
 let cast=state.fishing?.cast;autoState=state;autoSend=send;if(!cast)scheduleAutoFishing();
 if(controller?.root===root&&controller?.castId===cast?.id&&controller?.pull.isConnected){controller.accept(cast);return;}
 if(!cast&&fishingUI.pending==='fishCast')return;
 stopFishing();if(!root||!cast){if(!cast){localCast=null;pendingCastStarted=null;}return;}
 // Server clock offset from the cast receipt; the bite time is in server time.
 if(!localCast||localCast.id!==cast.id)localCast={id:cast.id,visualStarted:Math.min(cast.started,pendingCastStarted||cast.started),offset:Date.now()-cast.started<2500&&Date.now()-cast.started>-60000?cast.started-Date.now():0,hooking:false,error:false,retryAt:0,failures:0};
 const c=localCast;pendingCastStarted=null;
 const els={scene:root.querySelector('.fishing-scene'),angler:root.querySelector('.fishing-angler'),notice:root.querySelector('[data-fish-notice]'),status:root.querySelector('[data-fish-status]'),pull:root.querySelector('[data-fish-pull]'),label:root.querySelector('[data-fish-pull-label]')};
 let raf=0,disposed=false;
 const setText=(el,text)=>{if(el&&el.textContent!==text)el.textContent=text;};
 const phase=(name,pose,text,label)=>{if(els.scene.dataset.phase!==name)els.scene.dataset.phase=name;if(els.angler.dataset.pose!==String(pose))els.angler.dataset.pose=String(pose);setText(els.status,text);if(label)setText(els.label,label);};
 const hook=async()=>{
  const serverNow=Date.now()+c.offset;if(c.hooking||serverNow<cast.biteAt+150||serverNow>cast.expires)return;
  c.hooking=true;c.error=false;phase('landing',5,'낚아올리는 중…','낚아올리는 중…');els.pull.disabled=true;
  try{const result=await send('fishHook',{id:cast.id});if(!result){c.hooking=false;c.retryAt=Date.now()+750;}}
  catch{c.hooking=false;c.failures++;if(c.failures<6){c.offset-=400;c.retryAt=Date.now()+600;return;}c.error=true;setText(els.status,'연결을 확인한 뒤 다시 받기를 눌러주세요.');setText(els.label,'결과 다시 받기');els.pull.disabled=false;}
 };
 const click=()=>{if(!c.hooking&&Date.now()+c.offset>=cast.biteAt)hook();};
 function frame(){
  if(disposed||document.hidden)return;
  const now=Date.now()+c.offset;
  if(now>=cast.expires&&!c.hooking){phase('missed',0,'시간이 지나 미끼가 풀렸어요. 다시 던져주세요.','다시 던지기');els.pull.disabled=true;raf=requestAnimationFrame(frame);return;}
  if(c.hooking){phase('landing',5,'낚아올리는 중…','낚아올리는 중…');els.pull.disabled=true;}
  else if(now<c.visualStarted+900){phase('casting',now-c.visualStarted<220?1:2,'낚싯대를 던지는 중…','던지는 중…');els.pull.disabled=true;}
  else if(now<cast.biteAt){phase('waiting',0,'찌를 바라보며 입질을 기다려요','입질 기다리기');setText(els.notice,'찌를 바라보며 입질을 기다려요');els.pull.disabled=true;}
  else if(!c.error&&Date.now()>=c.retryAt){phase('bite',3,'입질! 바로 낚아올려요','낚아올리는 중…');setText(els.notice,'찌가 잠겼어요! 바로 낚아올려요');hook();}
  raf=requestAnimationFrame(frame);
 }
 const visibility=()=>{if(!document.hidden)raf=requestAnimationFrame(frame);else cancelAnimationFrame(raf);};
 els.pull.addEventListener('click',click);document.addEventListener('visibilitychange',visibility);
 controller={root,castId:cast.id,pull:els.pull,accept(latest){cast=latest;},dispose(){disposed=true;cancelAnimationFrame(raf);els.pull.removeEventListener('click',click);document.removeEventListener('visibilitychange',visibility);}};
 raf=requestAnimationFrame(frame);
 sceneController=mountFishingScene(els.scene,c.visualStarted);
}
