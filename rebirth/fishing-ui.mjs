import {FISH,SPOTS,RARITIES,BAITS,FISHING_QUESTS,REWARD_RATES,fishPrice,fishYield,fishWeight,rodGoldCost,rodDiamondCost,resourceName} from './fishing-data.mjs';
import {mountFishingScene} from './fishing-motion.mjs?v=fishing-line-180';
import {normalizeFishing,aquariumBank,fishingMeter,fishingStep,fishingTarget} from './fishing-model.mjs';
import {fantasyHeader,fantasyFooter} from './fantasy-ui.mjs';
import {currencyIconURL} from './currency-icons.mjs';
const fmt=n=>Math.floor(n||0).toLocaleString('ko-KR');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const fishingUI={spot:'brook',bait:'worm',panel:'fish',collectionSpot:'brook'};
const url=id=>new URL('./fishing/'+id+'.webp',import.meta.url).href;
export const fishingArt=id=>['cube','scroll','highCube','primeCube'].includes(id)?currencyIconURL(id):url(id);
const image=(id,cls='',alt='')=>`<img class="${cls}" src="${fishingArt(id)}" alt="${esc(alt)}" loading="lazy" decoding="async">`;
const MENU_ART={fish:'fish',tank:'tank',rod:'rod',shop:'shop',quests:'quests',collection:'collection'};
const ACTION_ART={fishCast:'cast',fishHook:'cast',fishCancel:'cancel',fishBaitBuy:'shop',fishTrain:'upgrade',fishUpgrade:'upgrade',fishSell:'sell',fishSellAll:'sell',fishSellAllConfirm:'sell',fishAquariumAdd:'tank',fishAquariumRemove:'tank',fishAquariumClaim:'sell',fishAquariumExpand:'upgrade',fishQuestClaim:'quests',fishCollectionSpot:'map'};
const menuIcon=id=>`<img class="fishing-button-art" src="${url('menu-'+id)}" alt="" width="28" height="28" decoding="async">`;
const button=(text,action,arg='',disabled=false,cls='')=>{const icon=action==='fishPanel'?MENU_ART[arg]:action==='eventPage'?(arg==='lotto'?'lotto':'cast'):ACTION_ART[action]||'map',write=action.startsWith('fish')&&!['fishPanel','fishCollectionSpot','fishSpot','fishSellAll'].includes(action);return `<button class="${cls}" data-illustrated="1" data-action="${action}" data-arg="${arg}" ${write?'data-fish-write data-write="1"':''} ${disabled?'disabled data-unavailable':''}>${menuIcon(icon)}<span>${text}</span></button>`;};
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
 if(s.isAdmin!==true)return `<section class="fishing-screen" data-currency-label>${fantasyHeader(s,'event')}<div class="fishing-scroll"><section class="panel pad" aria-label="낚시 이용 제한"><h2>관리자 전용 낚시</h2><p>현재 낚시는 관리자 계정만 이용할 수 있어요.</p>${button('주간 로또','eventPage','lotto')}</section></div>${fantasyFooter('event')}</section>`;
 const f=normalizeFishing({fishing:s.fishing?structuredClone(s.fishing):undefined},Date.now());
 const spot=SPOTS.find(x=>x.id===(f.cast?.spot||fishingUI.spot))||SPOTS[0],cast=f.cast;
 if(!BAITS.some(x=>x.id===fishingUI.bait&&x.level<=f.rod))fishingUI.bait='worm';
 const caught=!cast?f.lastCatch:null,d=caught?.won&&caught.reward==='fish'?FISH.find(x=>x.id===caught.species):null;
 const phase=cast?(cast.hookAt?'reeling':Date.now()<cast.started+900?'casting':Date.now()<cast.biteAt?'waiting':'bite'):caught?'caught':'idle';
 const phaseText=cast?'찌를 바라보며 입질을 기다려요':caught?caught.won?(d?d.name+' · '+fishWeight(caught.weight):resourceName(caught.reward)+(caught.diamonds?' · 다이아 '+caught.diamonds+'개':' 획득')):'아쉽게 놓쳤어요. 다시 도전해 보세요.':'미끼를 고르고 물가에 찌를 던져요';
 return `<section class="fishing-screen" data-currency-label style="--site-accent:${spot.accent}" aria-label="판타지 낚시">${fantasyHeader(s,'event')}<div class="fishing-scroll"><nav class="fishing-event-switch">${button('낚시 여행','eventPage','fishing',false,'active')}${button('주간 로또','eventPage','lotto')}</nav><section class="fishing-play" aria-label="낚시 장면과 조작"><div class="fishing-scene" data-site="${spot.id}" data-phase="${phase}"><img class="fishing-scene-art" src="${url('scene-'+spot.id)}" alt="${spot.name}의 아름다운 풍경" fetchpriority="high" decoding="async"><div class="fishing-water" style="background-image:url('${url('scene-'+spot.id)}')"></div><div class="fishing-water-light"></div><div class="fishing-scene-shade"></div><header class="fishing-title"><small>${spot.subtitle}</small><h1>${spot.name}</h1></header><span class="fishing-rod-chip">낚싯대 Lv.${f.rod}</span><div class="fishing-angler" aria-label="낚시 중인 모험가" data-pose="${phase==='reeling'?4:phase==='caught'&&caught?.won?5:0}"></div><svg class="fishing-line" aria-hidden="true"><path fill="none" stroke="#fff3cf" stroke-opacity=".8" stroke-width=".7" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg><div class="fishing-ripple"></div><div class="fishing-bobber"></div><div class="fishing-splash"></div><div class="fishing-bite-alert" role="status">입질!<small>지금 챔질하세요</small></div>${d?`<img class="fishing-result-fish" src="${url(d.id)}" alt="잡은 ${d.name}">`:''}<div class="fishing-catch-notice" data-fish-notice aria-live="polite">${phaseText}</div></div><section class="fishing-console"><div class="fishing-console-top"><strong data-fish-status>${phaseText}</strong><span>미끼 ${fmt(f.bait[fishingUI.bait])}개</span></div><div class="fishing-meter idle" aria-label="낚시 안전 구간"><div class="fishing-safe" data-fish-safe></div><i data-fish-cursor></i><span>초록 구간을 따라가세요</span></div><div class="fishing-progress"><span>포획 <b data-fish-progress>0%</b></span><progress data-fish-progressbar value="0" max="1"></progress><span>줄 손상 <b data-fish-strain>0%</b></span></div><div class="fishing-controls"><label class="fishing-bait-select"><select id="fishing-bait" aria-label="미끼" ${cast?'disabled':''}>${BAITS.filter(x=>x.level<=f.rod).map(x=>`<option value="${x.id}" ${x.id===fishingUI.bait?'selected':''}>${x.name} (${fmt(f.bait[x.id])})</option>`).join('')}</select></label>${cast?`<button class="fishing-pull fishing-gold" data-fish-pull data-illustrated="1" type="button">${menuIcon('cast')}<span data-fish-pull-label>${cast.hookAt?'꾹 눌러 당기기':'입질 기다리기'}</span></button>${button('그만두기','fishCancel',cast.id,false,'fishing-cancel')}`:button(f.rod<spot.level?'Lv.'+spot.level+' 필요':'낚싯대 던지기','fishCast','',f.rod<spot.level||!(f.bait[fishingUI.bait]>0)||f.fish.length>=150,'fishing-gold')}</div><div class="fishing-transaction" data-fish-transaction role="status" aria-live="polite"></div></section></section><nav class="fishing-sites" aria-label="낚시터 선택">${SPOTS.map(x=>`<button data-action="fishSpot" data-arg="${x.id}" data-illustrated="1" class="${x.id===spot.id?'active':''}" ${cast?'disabled':''}><img src="${url('scene-'+x.id+'-thumb')}" alt="" loading="lazy" decoding="async"><span>${x.name}<small>Lv.${x.level}${f.rod<x.level?' · 잠김':''}</small></span></button>`).join('')}</nav><nav class="fishing-panels" aria-label="낚시 메뉴">${[['fish','물고기'],['tank','수족관'],['rod','낚싯대'],['shop','상점'],['quests','일일퀘스트'],['collection','도감']].map(([id,name])=>button(name,'fishPanel',id,false,fishingUI.panel===id?'active':'')).join('')}</nav><section class="fishing-panel">${panelBody(s,f)}</section><section class="fishing-loot"><h2>물결 속 작은 보물</h2><div>${['diamondChest','cube','scroll','potentialLock','dungeonKey'].map(id=>`<article>${image(id,'',resourceName(id))}<span>${resourceName(id)}</span><small>${id==='diamondChest'?'다이아 '+fmt(f.diamonds)+'개':'보유 '+fmt(s.materials?.[id])+'개'}</small></article>`).join('')}</div></section></div>${fantasyFooter('event')}</section>`;
}
export function showFishingPending(root,action){
 if(!root)return;root.setAttribute('aria-busy','true');
 root.querySelectorAll('[data-fish-write]').forEach(b=>{b.disabled=true;});
 const labels={fishTrain:'골드로 경험치를 채우는 중…',fishUpgrade:'낚싯대 강화 중…',fishCast:'낚싯대를 던지는 중…',fishHook:'챔질! 줄을 거는 중…',fishFinish:'잡은 보상을 받는 중…'};
 const status=root.querySelector('[data-fish-transaction]');if(status)status.textContent=labels[action]||'처리 중…';
 root.querySelectorAll(`[data-action="${action}"]`).forEach(b=>b.classList.add('fishing-pending'));
 if(action==='fishCast'){
  const scene=root.querySelector('.fishing-scene');if(!scene)return;scene.dataset.phase='casting';
  const angler=scene.querySelector('.fishing-angler');angler.dataset.pose='1';
  pendingCastStarted=Date.now();sceneController?.dispose();sceneController=mountFishingScene(scene,pendingCastStarted);
  setTimeout(()=>{if(scene.isConnected&&scene.dataset.phase==='casting')angler.dataset.pose='2';},220);
  setTimeout(()=>{if(scene.isConnected&&scene.dataset.phase==='casting'){angler.dataset.pose='0';scene.dataset.phase='waiting';}},900);
 }
}
let controller=null,localCast=null,sceneController=null,pendingCastStarted=null;
export function stopFishing(){controller?.dispose();controller=null;sceneController?.dispose();sceneController=null;}
export function mountFishing(root,state,send){
 stopFishing();if(state.isAdmin!==true){localCast=null;return;}const cast=state.fishing?.cast;if(!root||!cast){if(!cast){localCast=null;pendingCastStarted=null;}return;}
 if(!localCast||localCast.id!==cast.id)localCast={id:cast.id,visualStarted:Math.min(cast.started,pendingCastStarted||cast.started),frames:[],meter:fishingMeter(),hooked:!!cast.hookAt,hooking:false,next:Date.now()+100,sending:false,error:false,retryAt:0};
 const c=localCast;pendingCastStarted=null;
 if(cast.hookAt&&!c.hooked){c.hooked=true;c.hooking=false;c.next=Date.now()+100;}
 const els={scene:root.querySelector('.fishing-scene'),angler:root.querySelector('.fishing-angler'),notice:root.querySelector('[data-fish-notice]'),status:root.querySelector('[data-fish-status]'),safe:root.querySelector('[data-fish-safe]'),cursor:root.querySelector('[data-fish-cursor]'),progress:root.querySelector('[data-fish-progress]'),bar:root.querySelector('[data-fish-progressbar]'),strain:root.querySelector('[data-fish-strain]'),pull:root.querySelector('[data-fish-pull]'),label:root.querySelector('[data-fish-pull-label]'),meter:root.querySelector('.fishing-meter')};
 let held=false,raf=0,disposed=false;
 const phase=(name,pose,text,label)=>{els.scene.dataset.phase=name;els.angler.dataset.pose=String(pose);els.status.textContent=text;if(label)els.label.textContent=label;};
 const hook=async()=>{
  if(c.hooked||c.hooking||Date.now()<cast.biteAt||Date.now()>(cast.hookDeadline||cast.biteAt+8000))return;
  c.hooking=true;phase('hooking',3,'챔질! 줄을 거는 중…','챔질 중…');els.pull.disabled=true;
  try{const result=await send('fishHook',{id:cast.id});if(!result)c.hooking=false;}catch{c.hooking=false;}
 };
 const setHeld=value=>{held=value;els.pull?.classList.toggle('held',value);};
 const down=e=>{if(e.button!==undefined&&e.button!==0)return;e.preventDefault();if(!c.hooked){hook();return;}els.pull.setPointerCapture?.(e.pointerId);setHeld(true);};
 const up=()=>setHeld(false);
 const keydown=e=>{if(e.code==='Space'&&e.target===els.pull){e.preventDefault();if(!c.hooked)hook();else setHeld(true);}};
 const keyup=e=>{if(e.code==='Space')up();};
 const transmit=async()=>{
  if(c.sending)return;c.sending=true;c.error=false;phase('landing',5,'포획 결과를 확인하는 중…','건져 올리는 중…');
  try{const result=await send('fishFinish',{id:cast.id,frames:c.frames});if(!result){c.sending=false;c.retryAt=Date.now()+750;}}
  catch{c.sending=false;c.error=true;if(els.status)els.status.textContent='연결을 확인한 뒤 다시 결과를 받으세요.';els.label.textContent='결과 다시 받기';els.pull.disabled=false;}
 };
 const click=()=>{if(c.error)transmit();else if(!c.hooked)hook();};
 function frame(){
  if(disposed||document.hidden)return;
  const now=Date.now();
  if(now>=cast.expires){phase('missed',0,'입질을 놓쳤어요. 다시 던져주세요.','입질 종료');els.pull.disabled=true;return;}
  if(!c.hooked){
   els.meter.classList.add('idle');
   if(c.hooking){phase('hooking',3,'챔질! 줄을 거는 중…','챔질 중…');els.pull.disabled=true;}
   else if(now<c.visualStarted+900){phase('casting',now-c.visualStarted<220?1:2,'낚싯대를 던지는 중…','던지는 중…');els.pull.disabled=true;}
   else if(now<cast.biteAt){phase('waiting',0,'찌를 바라보며 입질을 기다려요','입질 기다리기');els.pull.disabled=true;}
   else{phase('bite',3,'입질! 지금 챔질하세요','지금 챔질하기');els.notice.textContent='찌가 잠겼어요! 버튼을 눌러 챔질하세요';els.pull.disabled=false;}
  }else{
   els.meter.classList.remove('idle');
   if(!c.meter.finished){els.pull.disabled=false;let budget=5;while(now>=c.next&&!c.meter.finished&&budget--){c.frames.push(held?1:0);fishingStep(cast,held?1:0,c.meter);c.next+=100;}phase('reeling',4,'누르면 오른쪽 · 놓으면 왼쪽','꾹 눌러 당기기');els.notice.textContent='물고기가 버텨요! 초록 구간을 따라가세요';}
   const target=fishingTarget(cast,c.meter.tick),pct=Math.min(100,c.meter.progress/cast.required*100);
   els.safe.style.left=(target-cast.band)*100+'%';els.safe.style.width=cast.band*200+'%';els.cursor.style.left=c.meter.cursor*100+'%';
   els.progress.textContent=Math.round(pct)+'%';els.bar.value=pct/100;els.strain.textContent=Math.min(100,Math.round(c.meter.strain/cast.strainLimit*100))+'%';
   if(c.meter.finished&&!c.sending&&!c.error&&now>=c.retryAt){els.pull.disabled=true;transmit();}
  }
  raf=requestAnimationFrame(frame);
 }
 const visibility=()=>{up();if(!document.hidden){c.next=Math.max(c.next,Date.now()+100);raf=requestAnimationFrame(frame);}else cancelAnimationFrame(raf);};
 els.pull.addEventListener('pointerdown',down);els.pull.addEventListener('pointerup',up);els.pull.addEventListener('pointercancel',up);els.pull.addEventListener('lostpointercapture',up);els.pull.addEventListener('click',click);
 window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);window.addEventListener('blur',up);document.addEventListener('visibilitychange',visibility);
 controller={dispose(){disposed=true;cancelAnimationFrame(raf);els.pull.removeEventListener('pointerdown',down);els.pull.removeEventListener('pointerup',up);els.pull.removeEventListener('pointercancel',up);els.pull.removeEventListener('lostpointercapture',up);els.pull.removeEventListener('click',click);window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',up);document.removeEventListener('visibilitychange',visibility);}};
 raf=requestAnimationFrame(frame);
 // Update the pose before the scene RAF computes the rod tip for that frame.
 sceneController=mountFishingScene(els.scene,c.visualStarted);
}
