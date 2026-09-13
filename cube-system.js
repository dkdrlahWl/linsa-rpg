import {CUBES,TIERS,cubeType,optionBands,optionTier,optionBase} from './supabase/functions/_shared/cubes.mjs?v=LIME1';
const $=id=>document.getElementById(id),art=type=>'/linsa-rpg/art/cube-'+type+'.png',fmt=n=>Number(n||0).toLocaleString('ko-KR');
function install(){
 const g=window.RinguCore,f=g?.fn;if(!g?.state||!window.RinguEconomy||window.RinguCubes)return;

 const badge=it=>{if(!it.optionRolls&&it.o?.length)it={...it,optionRolls:[Number(it.o[0][1])/optionBase(it)]};const tier=TIERS[optionTier(it)];return '<span class="option-tier-badge" style="--option-tier:'+tier.color+'" aria-label="부옵션 등급 '+tier.name+'">'+tier.name+'</span>';};
 const optionText=f.optionText;f.optionText=(it,...args)=>badge(it)+' '+optionText(it,...args);
 const inventory=f.renderInventory;
 function decorateInventory(){for(const card of document.querySelectorAll('#inventoryList [data-item-id].item')){const it=g.state.inventory.find(i=>String(i.id)===card.dataset.itemId),options=card.querySelector('.sub-options');if(it&&options&&!options.querySelector('.option-tier-badge'))options.insertAdjacentHTML('afterbegin',badge(it)+' ');}}
 f.renderInventory=(...args)=>{const r=inventory(...args);decorateInventory();return r;};decorateInventory();
 const bag=f.renderItemInventory;
 function counts(){
  let summary=$('cubeBagSummary');if(!summary){summary=document.createElement('div');summary.id='cubeBagSummary';document.querySelector('#inventoryPanel .inventory-tools')?.before(summary);}
  summary.innerHTML=Object.entries(CUBES).map(([type,def])=>'<span><img src="'+art(type)+'" alt="'+def.name+'"><b>'+def.name+'</b> '+fmt(g.state[def.key])+'개</span>').join('');
 }
 f.renderItemInventory=(...args)=>{const r=bag(...args);const grid=$('itemInventoryGrid');if(grid)for(const [type,def] of Object.entries(CUBES)){const card=document.createElement('div');card.className='utility-card cube-bag-card';card.innerHTML='<img src="'+art(type)+'" alt="'+def.name+'"><span><strong>'+def.name+'</strong><small>보유 '+fmt(g.state[def.key])+'개 · '+(type==='jade'?'에픽 이하':'전설·신화')+' 부옵션 재설정</small></span>';grid.append(card);}return r;};
 counts();window.addEventListener('ringu:economy-state',()=>{counts();if($('itemInventoryModal')?.classList.contains('show'))f.renderItemInventory();});
 if(!g.towerRewardVersion){for(const floor of g.towerFloors)if(floor.floor>=6)for(const field of ['gold','essence','stone','protect','petStone'])floor[field]=(floor[field]||0)*2;g.towerRewardVersion='TR2';}
 let busy=false,tab='forge',lastId=null,lastResult=null,audio;
 const current=()=>g.state.inventory.find(it=>String(it.id)===String(g.enhanceId));
 const modal=$('enhanceModal'),panel=modal.querySelector('.modal');modal.classList.add('cube-workshop');
 $('enhanceTitle').insertAdjacentHTML('afterend','<div class="cube-tabs" role="tablist" aria-label="장비 성장"><button id="forgeTab" role="tab" aria-selected="true">강화 · 초월</button><button id="cubeTab" role="tab" aria-selected="false">큐브 · 부옵션</button></div>');
 const forge=document.createElement('div');forge.id='cubeForgePanel';forge.setAttribute('role','tabpanel');
 for(const el of [panel.querySelector('.modal-stats'),$('protectToggle'),$('transcendBtn'),$('transcendInfo')])forge.append(el);
 panel.insertBefore(forge,panel.querySelector('.modal-actions'));
 const cube=document.createElement('section');cube.id='cubePanel';cube.setAttribute('role','tabpanel');cube.hidden=true;
 cube.innerHTML='<div class="cube-stock"><img id="cubeArt" alt=""><div><strong id="cubeName"></strong><small id="cubeStock"></small></div></div><div id="cubeReveal" class="cube-reveal" role="status" aria-live="polite"></div><div id="cubeBands" class="cube-bands"></div><p class="cube-note">부옵션 수치만 다시 정합니다. 결과는 즉시 적용되며, 이전보다 낮아질 수 있습니다.</p><button id="cubeRoll" class="primary">큐브 사용 · 1개</button><button id="cubeBuy">큐브 구매</button>';
 panel.insertBefore(cube,panel.querySelector('.modal-actions'));
 function sound(tier=-1){
  if(!g.state.sfxOn)return;
  try{audio??=new (window.AudioContext||window.webkitAudioContext)();void audio.resume();const now=audio.currentTime;
   const notes=tier<0?[260,330,440]:tier>=2?[523,659,784,1047]:[440,554,659];
   notes.forEach((hz,i)=>{const osc=audio.createOscillator(),gain=audio.createGain(),at=now+i*.11;osc.type='sine';osc.frequency.setValueAtTime(hz*(tier===3?1.25:1),at);gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(.07,at+.025);gain.gain.exponentialRampToValueAtTime(.001,at+.4);osc.connect(gain);gain.connect(audio.destination);osc.start(at);osc.stop(at+.45);});
  }catch{}
 }
 function showTab(next){if(busy||g.enhanceBusy)return;tab=next;render();}
 $('forgeTab').onclick=()=>showTab('forge');$('cubeTab').onclick=()=>showTab('cube');
 function render(){
  const it=current();if(!it)return;
  if(lastId!==it.id){lastId=it.id;lastResult=null;}
  forge.hidden=tab!=='forge';cube.hidden=tab!=='cube';$('enhanceBtn').hidden=tab==='cube';
  $('forgeTab').setAttribute('aria-selected',String(tab==='forge'));$('cubeTab').setAttribute('aria-selected',String(tab==='cube'));
  for(const id of ['forgeTab','cubeTab'])$(id).disabled=busy||g.enhanceBusy;
  modal.dataset.workshopTab=tab;
  const type=cubeType(it),def=CUBES[type],bands=optionBands(it),tier=TIERS[it.cubeTier||0];
  $('cubeArt').hidden=!def;if(def)$('cubeArt').src=art(type);
  $('cubeName').textContent=def?.name||'사용 가능한 큐브 없음';
  $('cubeStock').textContent=def?('보유 '+fmt(g.state[def.key])+'개 · '+(type==='jade'?'에픽 이하':'전설 · 신화')):'타락 장비는 큐브 대상이 아닙니다.';
  $('cubeBands').innerHTML=bands.map(b=>'<div style="--tier:'+b.color+'"><b>'+b.name+'</b><span>'+b.min+'~'+b.max+'%</span><small>'+b.chance+'%</small></div>').join('');
  $('cubeRoll').disabled=busy||g.enhanceBusy||!def||!g.state[def.key];$('cubeBuy').disabled=busy||!def;
  $('cubeRoll').textContent=busy?'부옵션 재설정 중…':'큐브 사용 · 1개';$('cubeBuy').textContent=def?def.name+' 구매 · 정수 '+def.price+'개':'사용 불가';
  if(!busy){const value=Number(((it.optionRolls?.[0]||.8)*({무기:20,투구:20,갑옷:50,바지:20,신발:50,반지:10,귀걸이:12}[it.slot])*[.1,.25,.5,.75,1,1.35,1.75][it.rarity]).toFixed(1));
   $('cubeReveal').style.setProperty('--tier',tier.color);
   $('cubeReveal').innerHTML='<small>'+tier.name+'</small><strong>'+(lastResult?lastResult.before+'% → ':'')+value+'%</strong><span>'+(lastResult?(value>lastResult.before?'수치 상승':value<lastResult.before?'수치 하락':'동일 수치'):'현재 부옵션')+'</span>';
  }
 }
 const oldRender=f.renderEnhance;f.renderEnhance=(...args)=>{const result=oldRender(...args);render();return result;};
 const oldClose=f.closeEnhance;f.closeEnhance=()=>busy?f.toast('큐브 결과를 확인한 뒤 닫으세요.'):oldClose();
 const oldOpen=f.openEnhance;f.openEnhance=id=>{if(busy||g.enhanceBusy)return;tab='forge';lastResult=null;oldOpen(id);};
 async function buy(type){
  const def=CUBES[type];if(!def||busy)return;
  if(!window.RinguShop)return f.toast('상점을 불러오는 중입니다.');
  return window.RinguShop.request(()=>({name:def.name,price:def.price,description:(type==='jade'?'일반~에픽':'전설·신화')+' 장비 부옵션 재설정 · 1개',icon:'✦'}),async()=>{const r=await RinguEconomy.command('cubeBuy',{type});if(r){f.toast(def.name+' 1개 구매 완료');render();shop();}return r;});
 }
 $('cubeBuy').onclick=()=>buy(cubeType(current()));
 $('cubeRoll').onclick=async()=>{
  if(busy||g.enhanceBusy||!current())return;
  const it=current(),type=cubeType(it);if(!type||!g.state[CUBES[type].key])return;
  busy=true;g.enhanceBusy=true;lastResult=null;render();sound();
  const reveal=$('cubeReveal');reveal.className='cube-reveal rolling';reveal.innerHTML='<small>큐브 공명 중</small><strong>✦ ✧ ✦</strong><span>새로운 힘을 불러옵니다…</span>';
  const start=performance.now();let result;
  try{result=await RinguEconomy.command('cubeRoll',{id:it.id,type});await new Promise(resolve=>setTimeout(resolve,Math.max(0,1250-(performance.now()-start))));}
  finally{busy=false;g.enhanceBusy=false;}
  const event=result?.result?.events?.find(e=>e.type==='cubeRoll'&&e.id===it.id);lastResult=event||null;
  f.renderEnhance();reveal.className='cube-reveal'+(event?' revealed tier-'+event.tier:'');
  if(event)sound(event.tier);else reveal.textContent='결과를 확인하지 못했습니다. 보유량과 현재 옵션을 확인해 주세요.';
 };
 function shop(){const grid=$('auraShopGrid');if(!grid?.querySelector('[data-consumable]'))return;
  for(const [type,def]of Object.entries(CUBES)){let card=grid.querySelector('[data-cube-shop="'+type+'"]');if(!card){card=document.createElement('div');card.className='shop-card cube-shop-card';card.dataset.cubeShop=type;card.innerHTML='<img src="'+art(type)+'" alt="'+def.name+'"><span><strong>'+def.name+'</strong><small>'+(type==='jade'?'일반~에픽':'전설·신화')+' 부옵션 재설정</small><small class="cube-owned"></small></span><button>정수 '+def.price+'개</button>';card.querySelector('button').onclick=()=>buy(type);grid.append(card);}const owned=card.querySelector('.cube-owned'),text='보유 '+fmt(g.state[def.key])+'개';if(owned.textContent!==text)owned.textContent=text;}
 }
 const grid=$('auraShopGrid');if(grid)new MutationObserver(shop).observe(grid,{childList:true});
 window.addEventListener('ringu:economy-state',()=>{if(!busy&&modal.classList.contains('show'))render();shop();});
 window.RinguCubes={render,buy,showTab,optionBadge:badge};shop();
}
window.addEventListener('ringu-ready',install);install();
