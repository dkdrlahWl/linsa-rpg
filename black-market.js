/* LINSA BM2. Rendering only. Shared offers, prices, refresh and purchase limits live in SQL. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id),fmt=n=>Number(n).toLocaleString('ko-KR');
 const errors={RESOURCE_BALANCE_LIMIT:'재료 보유 한도에 도달했습니다.',BLACK_MARKET_OFFER_INVALID:'상품 정보를 다시 불러와 주세요.',BLACK_MARKET_REFRESHED:'진열 상품이 갱신되었습니다. 새 상품을 확인해 주세요.',BLACK_MARKET_PURCHASED:'이번 진열에서 이미 구매한 상품입니다.',INSUFFICIENT_ESSENCE:'정수가 부족합니다.',BLACK_MARKET_NOT_READY:'암시장 서버를 준비 중입니다.',ECONOMY_NOT_READY:'서버 연결을 준비 중입니다.',REQUEST_ID_REUSED:'이전 구매 기록을 먼저 확인해 주세요.'};
 let g,modal,snapshot=null,fetching=null,generation=0,clockBase=0,clockAt=0,timer,returnFocus,stale=true,busy=false,lastPoll=0,signature='';
 const esc=x=>g.fn.escapeHtml(String(x??''));
 const serverNow=()=>clockBase+Math.max(0,performance.now()-clockAt);
 const ended=()=>!window.RinguSession?.active;
 const canBuy=()=>!!snapshot?.ready&&!stale&&serverNow()<snapshot.expiresAt&&!ended();
 const text=x=>{const el=document.createElement('div');el.innerHTML=x;return el.textContent||'';};
 const errorText=e=>errors[e.message]||(/ringu_black_market|PGRST202|지원하지 않는 요청/.test(e.message)?'암시장 서버를 준비 중입니다. 아직 정수는 사용되지 않습니다.':'상품 정보를 확인하지 못했습니다. 다시 불러오기를 눌러 주세요.');
 function status(message){$('blackMarketStatus').textContent=message;}
 function balance(){ $('blackMarketBalance').textContent='정수 '+fmt(g.state.essence||0)+'개'; }
 // Consumables never pass through equipment attack/option/icon calculations.
 const materials={transcendStone:{name:'초월석',icon:'◆',atlas:0,description:'장비 초월 시 사용하는 재료'},downgradeProtect:{name:'하락방지권',icon:'▣',atlas:1,description:'장비 강화 실패 시 강화 단계 하락 방지'}};
 function productView(it){
  if(it?.kind==='consumable'){
   const m=materials[it.resource];if(!m||it.quantity!==1)throw Error('INVALID_RESPONSE');
   return {name:m.name+' 1개',icon:m.icon,art:'<span class="rm-consumable-art bm-material-art" style="background-position:'+m.atlas*100+'% 0%" role="img" aria-label="'+m.name+'"></span>',info:'소모품 · 1개',options:esc(m.description),description:'소모품 · 1개 · '+m.description};
  }
  const info=g.rarityNames[it.rarity]+' · '+it.slot+' · 공격력 '+fmt(g.fn.itemAtk(it));
  return {name:it.name,icon:'⚔',art:g.fn.gearIcon(it),info,options:g.fn.optionText(it),description:info+' · '+text(g.fn.optionText(it))};
 }
 function render(){
  balance();const rows=snapshot?.ready?snapshot.items:[];
  const next=JSON.stringify([snapshot?.rotation,rows]);
  if(signature!==next){
   signature=next;
   $('blackMarketItems').innerHTML=rows.map(row=>{
    const it=row.item,v=productView(it);
    return '<article class="bm-offer '+(it.kind==='consumable'?'bm-consumable':'bm-r'+it.rarity)+'" data-offer="'+row.slot+'">'+v.art+
     '<div class="bm-item-info"><strong>'+esc(v.name)+'</strong><small>'+esc(v.info)+'</small><span class="bm-option">'+v.options+'</span></div>'+
     '<button type="button" data-bm-slot="'+row.slot+'" aria-label="'+esc(v.name)+' 정수 '+row.price+'개 구매" '+(row.purchased?'disabled':'')+'><b>정수 '+row.price+'개</b><span>'+(row.purchased?'구매 완료':'구매')+'</span></button></article>';
   }).join('');
  }
  modal.querySelectorAll('[data-bm-slot]').forEach(button=>{
   const row=rows.find(x=>x.slot===Number(button.dataset.bmSlot));
   button.disabled=busy||!canBuy()||!row||row.purchased;
  });
  $('blackMarketRetry').disabled=!!fetching||busy;
  $('blackMarketClose').disabled=busy;
  const rates=snapshot?.nextRates||snapshot?.rates||[49.1,15,4.9,1,15,15],names=[...g.rarityNames.slice(0,4),'초월석','하락방지권'],prices=['3','5','10','15','13~18','4~8'];
  $('blackMarketRatesBody').innerHTML=rates.map((n,i)=>'<div><span>'+esc(names[i])+'</span><b>'+n+'%</b><small>정수 '+prices[i]+'개</small></div>').join('');
  $('blackMarketRatesNotice').textContent=snapshot?.ratesApplyNextRotation?'새 확률과 소모품은 다음 진열부터 적용됩니다. 현재 상품과 구매 기록은 유지됩니다.':'각 진열칸에서 독립 추첨 · 소모품은 1개씩 · 가격은 진열 갱신 시 결정되어 모든 유저에게 동일합니다.';
 }
 async function refresh(){
  if(!modal?.open||fetching||busy||ended())return;
  const ticket=++generation,owner=RinguSession.account.id;
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
  fetching=controller;lastPoll=performance.now();render();
  try{
   const r=await fetch('/api/black-market',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'status'}),signal:controller.signal});
   const value=await r.json();if(!r.ok)throw Error(value.error||'SERVER_ERROR');
   if(ticket!==generation||!modal.open||owner!==RinguSession.account.id)return;
   if(value.ready&&(!Array.isArray(value.items)||value.items.length!==5||!Number.isFinite(value.serverNow)||!Number.isFinite(value.expiresAt)))throw Error('INVALID_RESPONSE');
   if(value.ready){
    const changed=snapshot?.rotation&&snapshot.rotation!==value.rotation;
    snapshot=value;clockBase=value.serverNow;clockAt=performance.now();stale=false;
    status(changed?'새로운 물건이 도착했습니다. 모든 유저에게 같은 상품이 진열됩니다.':'상품별 1회 구매 · 다른 유저가 구매해도 내 상품은 남습니다.');
   }else {snapshot=null;stale=true;status(errors[value.reason]||errors.BLACK_MARKET_NOT_READY);}
   tick();
  }catch(e){if(ticket===generation){stale=true;status(errorText(e));}}
  finally{clearTimeout(timeout);if(fetching===controller)fetching=null;if(ticket===generation)render();}
 }
 function tick(){
  if(!modal?.open)return;balance();
  if(snapshot?.ready){
   const remaining=Math.max(0,Math.ceil((snapshot.expiresAt-serverNow())/1000));
   const h=Math.floor(remaining/3600),m=Math.floor(remaining%3600/60),s=remaining%60;
   $('blackMarketCountdown').textContent=remaining?'다음 진열까지 '+[h,m,s].map(n=>String(n).padStart(2,'0')).join(':'):'상품 갱신 확인 중…';
   if(!remaining){stale=true;render();if(!fetching&&performance.now()-lastPoll>1500)void refresh();}
  }else $('blackMarketCountdown').textContent='매일 12:00 · 18:00 · 24:00(00:00) 갱신 (한국시간)';
  if(!document.hidden&&!fetching&&!busy&&performance.now()-lastPoll>30000)void refresh();
 }
 async function buy(slot){
  if(busy||!canBuy())return;
  const offer=snapshot.items.find(row=>row.slot===slot);if(!offer||offer.purchased)return;
  const rotation=snapshot.rotation,item=offer.item;
  if(!window.RinguShop||!RinguSession.blackMarketTransaction){status(errors.BLACK_MARKET_NOT_READY);return;}
  const v=productView(item);
  const product=()=>({name:v.name,price:offer.price,icon:v.icon,description:v.description,owned:snapshot?.rotation===rotation&&!!snapshot.items.find(row=>row.slot===slot)?.purchased,available:canBuy()&&snapshot.rotation===rotation});
  await RinguShop.request(product,async()=>{
   if(!canBuy()||snapshot.rotation!==rotation)throw Error('BLACK_MARKET_REFRESHED');
   busy=true;render();
   try{
    const result=await RinguSession.blackMarketTransaction(rotation,slot);
    if(!result?.ok)throw Error('SERVER_RESULT_UNCONFIRMED');
    if(snapshot?.rotation===rotation)offer.purchased=true;
    return result;
   }catch(e){status(errorText(e));if(errors[e.message]){stale=true;setTimeout(()=>void refresh(),0);}throw e;}
   finally{busy=false;render();}
  });
  void refresh();
 }
 function close(){
  if(busy)return;generation++;fetching?.abort();fetching=null;clearInterval(timer);
  RinguShop?.resetInput();if(modal.open)modal.close();if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});
 }
 function open(){
  if(modal.open)return;returnFocus=document.activeElement;snapshot=null;stale=true;signature='';
  window.RinguShop?.resetInput();status('성민의 물건을 확인하는 중…');render();modal.showModal();
  $('blackMarketClose').focus({preventScroll:true});void refresh();clearInterval(timer);timer=setInterval(tick,1000);
 }
 function install(){
  if($('blackMarketModal')||!window.RinguCore||!window.RinguShop)return;
  g=RinguCore;modal=document.createElement('dialog');modal.id='blackMarketModal';modal.setAttribute('aria-labelledby','blackMarketTitle');
  modal.innerHTML='<header class="bm-header"><div><small>아는 사람만 찾는 거래소</small><h2 id="blackMarketTitle">암시장</h2></div><button type="button" id="blackMarketClose" aria-label="암시장 닫기">닫기</button></header>'+
   '<section class="bm-merchant"><img src="/linsa-rpg/art/merchant-seongmin-BM1.webp" alt="테이블 너머에서 물건을 파는 여성 상인 성민" width="448" height="420"><div class="bm-merchant-copy"><span>암시장 상인</span><h3>성민</h3><p>몰래 파는거야<br>빨리 구매해</p></div></section>'+
   '<div class="bm-toolbar"><div><b id="blackMarketBalance"></b><small id="blackMarketCountdown"></small></div><button type="button" id="blackMarketRates" aria-expanded="false" aria-controls="blackMarketRatesPanel">확률 보기</button></div>'+
   '<section id="blackMarketRatesPanel" hidden><h3>상품별 진열 확률</h3><p id="blackMarketRatesNotice"></p><div id="blackMarketRatesBody"></div><p>각 진열칸에서 상품 종류를 위 확률로 추첨합니다. 장비 부위는 7종 중 동일 확률이며 같은 부위·등급 안에서 이미 진열한 동일 장비는 제외합니다. 소모품은 서로 다른 칸에 중복 등장할 수 있습니다. 초월석 가격은 13~18, 하락방지권 가격은 4~8 정수의 정수값을 균등 추첨하며, 진열 동안 변하지 않습니다. 정수는 확정된 상품 구매 시에만 사용됩니다.</p></section>'+
   '<p id="blackMarketStatus" role="status" aria-live="polite"></p><section id="blackMarketItems" aria-label="공통 진열 상품 5개"></section>'+
   '<footer class="bm-footer"><span>한국시간 12시 · 18시 · 24시(00시) 갱신<br>전 유저 동일 진열 · 상품별 각 1회</span><button type="button" id="blackMarketRetry">다시 불러오기</button></footer><small class="bm-version">암시장 BM4</small>';
  document.body.append(modal);
  $('blackMarketClose').onclick=close;
  modal.addEventListener('cancel',e=>{e.preventDefault();close();});
  modal.addEventListener('close',()=>{if(!modal.open){clearInterval(timer);generation++;fetching?.abort();fetching=null;}});
  $('blackMarketRates').onclick=()=>{const panel=$('blackMarketRatesPanel');panel.hidden=!panel.hidden;$('blackMarketRates').setAttribute('aria-expanded',String(!panel.hidden));};
  $('blackMarketRetry').onclick=()=>void refresh();
  modal.addEventListener('click',e=>{const b=e.target.closest('[data-bm-slot]');if(b)void buy(Number(b.dataset.bmSlot));});
  ['keydown','keyup','pointerdown','pointerup'].forEach(type=>modal.addEventListener(type,e=>e.stopPropagation()));
  function button(parent,id){if(!parent||$(id))return;const el=document.createElement('button');el.type='button';el.id=id;el.textContent='암시장';el.onclick=e=>{e.preventDefault();e.stopPropagation();open();};parent.append(el);}
  button(document.querySelector('#auraShopModal .shop-tabs'),'blackMarketShopButton');
  button(document.querySelector('#rmFeatureNav nav'),'blackMarketMenuButton');
  window.addEventListener('ringu:economy-state',()=>{if(modal.open){balance();}});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&modal.open){stale=true;render();void refresh();}});
  RinguSession.onEnded(()=>{busy=false;close();snapshot=null;stale=true;});
  window.RinguBlackMarket={open,version:'BM4'};
 }
 window.addEventListener('ringu-ready',install,{once:true});
 if(window.RinguCore?.state&&window.RinguSession?.active)install();
})();
