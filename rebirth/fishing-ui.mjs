import {FISH,SPOTS,RARITIES,BAITS,FISHING_QUESTS,REWARD_RATES,fishPrice,fishYield,fishWeight,rodGoldCost,rodDiamondCost,resourceName} from './fishing-data.mjs';
import {normalizeFishing,aquariumBank,fishingMeter,fishingStep,fishingTarget} from './fishing-model.mjs';
import {fantasyHeader,fantasyFooter} from './fantasy-ui.mjs';
import {currencyIconURL} from './currency-icons.mjs';
const fmt=n=>Math.floor(n||0).toLocaleString('ko-KR');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const fishingUI={spot:'brook',bait:'worm',panel:'fish',collectionSpot:'brook'};
const url=id=>new URL('./fishing/'+id+'.webp',import.meta.url).href;
export const fishingArt=id=>['cube','scroll','highCube','primeCube'].includes(id)?currencyIconURL(id):url(id);
const image=(id,cls='',alt='')=>`<img class="${cls}" src="${fishingArt(id)}" alt="${esc(alt)}" loading="lazy" decoding="async">`;
const button=(text,action,arg='',disabled=false,cls='')=>`<button class="${cls}" data-action="${action}" data-arg="${arg}" ${disabled?'disabled':''}>${text}</button>`;
function fishCard(fish,place='bag'){
 const d=FISH.find(x=>x.id===fish.species),r=RARITIES[d.rarity];
 return `<article class="fish-card" style="--rarity:${r.color}"><div class="fish-portrait">${image(d.id,'',d.name)}<span>${r.name}</span></div><strong>${d.name}</strong><small>${fishWeight(fish.weight)}</small><b>${place==='tank'?fmt(fishYield(fish))+' G / 시간':fmt(fishPrice(fish))+' G'}</b><div>${place==='tank'?button('꺼내기','fishAquariumRemove',fish.id):button('판매','fishSell',fish.id)+button('수족관','fishAquariumAdd',fish.id)}</div></article>`;
}
function panelBody(s,f){
 if(fishingUI.panel==='fish')return `<div class="fishing-panel-title"><div><h2>오늘의 물고기</h2><small>같은 종도 무거울수록 비싸요 · ${f.fish.length}/150마리</small></div>${button('가방 전부 판매','fishSellAll','',!f.fish.length)}</div><div class="fish-grid">${f.fish.length?f.fish.slice().reverse().map(x=>fishCard(x)).join(''):'<div class="fishing-empty"><strong>첫 물고기를 만나볼까요?</strong><p>미끼를 고르고 낚싯대를 던져 주세요.<br>기본 미끼 20개가 준비되어 있어요.</p></div>'}</div>`;
 if(fishingUI.panel==='tank')return `<div class="fishing-panel-title"><div><h2>나의 작은 수족관</h2><small>${f.aquarium.length}/${f.slots}마리 · 시간당 ${fmt(f.aquarium.reduce((n,x)=>n+fishYield(x),0))} G</small></div></div><div class="fishing-bank">${image('diamondChest')}<div><small>쌓인 골드 · 최대 12시간</small><strong>${fmt(aquariumBank(f,Date.now()))} G</strong><span>수족관에 넣은 물고기는 꺼낸 뒤 판매할 수 있어요.</span></div>${button('골드 받기','fishAquariumClaim','',aquariumBank(f,Date.now())<1,'fishing-gold')}</div><div class="fish-grid">${f.aquarium.length?f.aquarium.map(x=>fishCard(x,'tank')).join(''):'<div class="fishing-empty"><strong>물고기를 넣어 나만의 수족관을 꾸며요</strong><p>물고기 가방에서 ‘수족관’을 눌러주세요.</p></div>'}</div>${f.slots<10?button('수족관 확장 · '+fmt(100000*3**(f.slots-3))+' G','fishAquariumExpand','',s.gold<100000*3**(f.slots-3)):'<p class="fishing-note">최대 10칸 수족관이에요.</p>'}`;
 if(fishingUI.panel==='rod'){
  const max=f.rod>=50,cost=rodGoldCost(f.rod),remaining=Math.max(0,cost-f.xp);
  return `<div class="rod-showcase">${image('rod','', '낚싯대')}<div><small>별을 낚는 여행</small><h2>낚싯대 Lv.${f.rod} <em>/ 50</em></h2><p>높은 레벨에서 더 깊은 낚시터와 희귀한 물고기가 열립니다.</p></div></div>${max?'<div class="fishing-empty"><strong>최고 레벨에 도달했어요!</strong></div>':`<div class="rod-training"><div><span>다음 레벨 경험치</span><b>${fmt(f.xp)} / ${fmt(cost)}</b></div><progress value="${f.xp}" max="${cost}"></progress><p>골드 1 G → 경험치 1 · 경험치를 가득 채운 뒤 다이아로 레벨업</p><div class="fishing-actions">${button('경험치 25% 채우기 · '+fmt(Math.min(remaining,Math.ceil(cost/4)))+' G','fishTrain',Math.min(remaining,Math.ceil(cost/4)),!remaining||s.gold<Math.min(remaining,Math.ceil(cost/4)))}${button('경험치 전부 채우기 · '+fmt(remaining)+' G','fishTrain',remaining,!remaining||s.gold<remaining)}</div>${button('Lv.'+(f.rod+1)+' 레벨업 · 다이아 '+rodDiamondCost(f.rod),'fishUpgrade','',remaining>0||f.diamonds<rodDiamondCost(f.rod),'fishing-gold')}</div>`}<div class="rod-milestones">${SPOTS.map(x=>`<span class="${f.rod>=x.level?'unlocked':''}">Lv.${x.level} ${x.name}</span>`).join('')}<span class="${f.rod>=45?'unlocked':''}">Lv.45 신화 물고기</span></div>`;
 }
 if(fishingUI.panel==='shop')return `<div class="fishing-panel-title"><div><h2>물가의 낚시 상점</h2><small>좋은 미끼일수록 높은 등급 확률 상승 · 낚싯대 제한은 유지</small></div></div><div class="bait-shop">${BAITS.map(x=>`<article>${image(x.id,'',x.name)}<div><h3>${x.name}</h3><small>낚싯대 Lv.${x.level} · 보유 ${fmt(f.bait[x.id])}개</small><b>1개 ${fmt(x.cost)} G</b></div>${button('10개 구매','fishBaitBuy',x.id,f.rod<x.level||s.gold<x.cost*10)}</article>`).join('')}</div><details class="fishing-odds"><summary>낚시 보상 확률</summary>${REWARD_RATES.map(x=>`<p><span>${x.name}</span><b>${(x.chance*100).toFixed(1)}%</b></p>`).join('')}<small>포획 성공 시 위 보상 중 1종을 받습니다. 다이아 상자는 즉시 열려 다이아 3~8개를 줍니다. 물고기 등급 확률은 낚시터·낚싯대·미끼에 따라 달라집니다.</small></details><p class="fishing-note">던전 열쇠는 보관할 수 있어요. 열쇠를 사용하는 던전은 추후 열립니다.</p>`;
 if(fishingUI.panel==='quests')return `<div class="fishing-panel-title"><div><h2>매일의 낚시 여행</h2><small>한국 시간 자정 초기화 · 하루 다이아 7개</small></div></div>${FISHING_QUESTS.map(q=>`<article class="fishing-quest">${image('diamond')}<div><strong>${q.name}</strong><small>${Math.min(q.goal,f.daily[q.id]||0)} / ${q.goal} · 다이아 ${q.diamonds}개</small><progress value="${f.daily[q.id]||0}" max="${q.goal}"></progress></div>${button(f.daily.claimed.includes(q.id)?'완료':'받기','fishQuestClaim',q.id,(f.daily[q.id]||0)<q.goal||f.daily.claimed.includes(q.id))}</article>`).join('')}`;
 const spot=SPOTS.find(x=>x.id===fishingUI.collectionSpot);
 return `<div class="fishing-panel-title"><div><h2>물고기 도감</h2><small>50종 · 전설 5종 · 신화 2종 · 발견 ${Object.keys(f.collection).length}/50</small></div></div><div class="fishing-site-filter">${SPOTS.map(x=>button(x.name,'fishCollectionSpot',x.id,false,x.id===spot.id?'active':'')).join('')}</div><div class="fish-grid collection">${FISH.filter(x=>x.spot===spot.id).map(d=>{const weight=f.collection[d.id],r=RARITIES[d.rarity];return `<article class="fish-card ${weight?'discovered':'undiscovered'}" style="--rarity:${r.color}"><div class="fish-portrait">${image(d.id,'',d.name)}<span>${r.name}</span></div><strong>${d.name}</strong><small>낚싯대 Lv.${d.level}</small><b>${weight?'최대 '+fishWeight(weight):'아직 만나지 못했어요'}</b><small>${fishWeight(d.min)} ~ ${fishWeight(d.max)}</small></article>`;}).join('')}</div>`;
}
export function fishingView(s){
 const f=normalizeFishing({fishing:s.fishing?structuredClone(s.fishing):undefined},Date.now());
 const spot=SPOTS.find(x=>x.id===(f.cast?.spot||fishingUI.spot))||SPOTS[0];
 if(!BAITS.some(x=>x.id===fishingUI.bait&&x.level<=f.rod))fishingUI.bait='worm';
 const caught=f.lastCatch,d=caught?.won&&caught.reward==='fish'?FISH.find(x=>x.id===caught.species):null;
 return `<section class="fishing-screen" data-currency-label style="--site-accent:${spot.accent}" aria-label="판타지 낚시">${fantasyHeader(s,'event')}<div class="fishing-scroll"><nav class="fishing-event-switch">${button('낚시 여행','eventPage','fishing',false,'active')}${button('주간 로또','eventPage','lotto')}</nav><nav class="fishing-sites" aria-label="낚시터 선택">${SPOTS.map(x=>`<button data-action="fishSpot" data-arg="${x.id}" class="${x.id===spot.id?'active':''}" ${f.cast?'disabled':''}><img src="${url('scene-'+x.id+'-thumb')}" alt="" loading="lazy" decoding="async"><span>${x.name}<small>Lv.${x.level}${f.rod<x.level?' · 잠김':''}</small></span></button>`).join('')}</nav><div class="fishing-scene" data-site="${spot.id}"><img class="fishing-scene-art" src="${url('scene-'+spot.id)}" alt="${spot.name}의 아름다운 풍경" fetchpriority="high" decoding="async"><div class="fishing-scene-shade"></div><header class="fishing-title"><small>${spot.subtitle}</small><h1>${spot.name}</h1><span>낚싯대 Lv.${spot.level}부터 입장</span></header><div class="fishing-scene-wallet"><span>${image('diamond')} ${fmt(f.diamonds)}</span><span>낚싯대 <b>Lv.${f.rod}</b></span></div><img class="fishing-angler" src="${url('avatar')}" alt="낚시 중인 모험가" decoding="async"><div class="fishing-ripple"></div>${f.cast?`<img class="fishing-hooked-fish" src="${url(f.cast.species)}" alt="입질한 물고기" decoding="async">`:''}<div class="fishing-catch-notice" aria-live="polite">${caught?caught.won?`${d?d.name+' · '+fishWeight(caught.weight):resourceName(caught.reward)+(caught.diamonds?' · 다이아 '+caught.diamonds+'개':' 획득')}`:'아쉽게 놓쳤어요. 다시 도전해 보세요.':'고요한 물결 속, 어떤 물고기가 기다릴까요?'}</div></div><section class="fishing-console"><div class="fishing-console-top"><strong data-fish-status>${f.cast?'입질을 기다리는 중…':'찌를 던져 새로운 물고기를 만나요'}</strong><span>Lv.${f.rod} · 미끼 ${fmt(f.bait[fishingUI.bait])}개</span></div><div class="fishing-meter ${f.cast?'':'idle'}" aria-label="낚시 안전 구간"><div class="fishing-safe" data-fish-safe></div><i data-fish-cursor></i><span>초록 구간을 따라가세요</span></div><div class="fishing-progress"><span>포획 <b data-fish-progress>0%</b></span><progress data-fish-progressbar value="0" max="1"></progress><span>줄 손상 <b data-fish-strain>0%</b></span></div><div class="fishing-controls"><label>미끼<select id="fishing-bait" ${f.cast?'disabled':''}>${BAITS.filter(x=>x.level<=f.rod).map(x=>`<option value="${x.id}" ${x.id===fishingUI.bait?'selected':''}>${x.name} (${fmt(f.bait[x.id])})</option>`).join('')}</select></label>${f.cast?`<button class="fishing-pull fishing-gold" data-fish-pull type="button">꾹 눌러 당기기</button>${button('그만두기','fishCancel',f.cast.id,false,'fishing-cancel')}`:button(f.rod<spot.level?'낚싯대 Lv.'+spot.level+' 필요':'낚싯대 던지기','fishCast','',f.rod<spot.level||!(f.bait[fishingUI.bait]>0)||f.fish.length>=150,'fishing-gold')}</div><p class="fishing-note">${f.cast?'누르면 오른쪽, 놓으면 왼쪽으로 이동해요. 초록 구간을 따라가면 잡을 수 있어요.':'등급과 무게가 높을수록 안전 구간이 좁아지고 포획이 어려워져요.'}</p></section><nav class="fishing-panels" aria-label="낚시 메뉴">${[['fish','물고기'],['tank','수족관'],['rod','낚싯대'],['shop','상점'],['quests','일일퀘스트'],['collection','도감']].map(([id,name])=>button(name,'fishPanel',id,false,fishingUI.panel===id?'active':'')).join('')}</nav><section class="fishing-panel">${panelBody(s,f)}</section><section class="fishing-loot"><h2>물결 속 작은 보물</h2><div>${['diamondChest','cube','scroll','potentialLock','dungeonKey'].map(id=>`<article>${image(id,'',resourceName(id))}<span>${resourceName(id)}</span><small>${id==='diamondChest'?'다이아 '+fmt(f.diamonds)+'개':'보유 '+fmt(s.materials?.[id])+'개'}</small></article>`).join('')}</div></section></div>${fantasyFooter('event')}</section>`;
}
let controller=null,localCast=null;
export function stopFishing(){controller?.dispose();controller=null;}
export function mountFishing(root,state,send){
 stopFishing();const cast=state.fishing?.cast;if(!root||!cast){if(!cast)localCast=null;return;}
 if(!localCast||localCast.id!==cast.id)localCast={id:cast.id,frames:[],meter:fishingMeter(),next:Math.max(Date.now(),cast.biteAt)+100,sending:false,error:false,retryAt:0};
 const c=localCast,els={status:root.querySelector('[data-fish-status]'),safe:root.querySelector('[data-fish-safe]'),cursor:root.querySelector('[data-fish-cursor]'),progress:root.querySelector('[data-fish-progress]'),bar:root.querySelector('[data-fish-progressbar]'),strain:root.querySelector('[data-fish-strain]'),pull:root.querySelector('[data-fish-pull]')};
 let held=false,raf=0,disposed=false;
 const setHeld=value=>{held=value;els.pull?.classList.toggle('held',value);};
 const down=e=>{if(e.button!==undefined&&e.button!==0)return;e.preventDefault();els.pull.setPointerCapture?.(e.pointerId);setHeld(true);};
 const up=()=>setHeld(false);
 const keydown=e=>{if(e.code==='Space'&&e.target===els.pull){e.preventDefault();setHeld(true);}};
 const keyup=e=>{if(e.code==='Space')up();};
 const blur=()=>up();
 const transmit=async()=>{
  if(c.sending)return;c.sending=true;c.error=false;
  if(els.status)els.status.textContent='포획 결과를 확인하는 중…';
  try{const result=await send('fishFinish',{id:cast.id,frames:c.frames});if(!result){c.sending=false;c.retryAt=Date.now()+750;return;} }
  catch{c.sending=false;c.error=true;if(els.status)els.status.textContent='연결을 확인한 뒤 다시 결과를 받으세요.';if(els.pull){els.pull.textContent='결과 다시 받기';els.pull.disabled=false;}}
 };
 const retry=()=>{if(c.error)transmit();};
 function frame(){
  if(disposed||document.hidden)return;
  const now=Date.now();
  if(now>=cast.expires){els.status.textContent='입질 시간이 끝났어요. 그만두고 다시 던져주세요.';els.pull.disabled=true;return;}
  if(now<cast.biteAt){els.status.textContent='입질 대기 · '+Math.ceil((cast.biteAt-now)/1000)+'초';els.pull.disabled=true;}
  else{
   if(!c.meter.finished){els.pull.disabled=false;let budget=5;while(now>=c.next&&!c.meter.finished&&budget--){c.frames.push(held?1:0);fishingStep(cast,held?1:0,c.meter);c.next+=100;}els.status.textContent='입질! 안전 구간을 따라가세요';}
   const target=fishingTarget(cast,c.meter.tick),pct=Math.min(100,c.meter.progress/cast.required*100);
   els.safe.style.left=(target-cast.band)*100+'%';els.safe.style.width=cast.band*200+'%';els.cursor.style.left=c.meter.cursor*100+'%';
   els.progress.textContent=Math.round(pct)+'%';els.bar.value=pct/100;els.strain.textContent=Math.min(100,Math.round(c.meter.strain/cast.strainLimit*100))+'%';
   if(c.meter.finished&&!c.sending&&!c.error&&now>=c.retryAt){els.pull.disabled=true;transmit();}
  }
  raf=requestAnimationFrame(frame);
 }
 const visibility=()=>{up();if(!document.hidden){c.next=Math.max(c.next,Date.now()+100);raf=requestAnimationFrame(frame);}else cancelAnimationFrame(raf);};
 els.pull.addEventListener('pointerdown',down);els.pull.addEventListener('pointerup',up);els.pull.addEventListener('pointercancel',up);els.pull.addEventListener('lostpointercapture',up);els.pull.addEventListener('click',retry);
 window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);window.addEventListener('blur',blur);document.addEventListener('visibilitychange',visibility);
 controller={dispose(){disposed=true;cancelAnimationFrame(raf);els.pull.removeEventListener('pointerdown',down);els.pull.removeEventListener('pointerup',up);els.pull.removeEventListener('pointercancel',up);els.pull.removeEventListener('lostpointercapture',up);els.pull.removeEventListener('click',retry);window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',visibility);}};
 raf=requestAnimationFrame(frame);
}
