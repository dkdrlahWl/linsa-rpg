/* LINSA SHOP LS1. Confirmation UI only: all purchases still use server receipts. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id),fmt=n=>Number(n).toLocaleString('ko-KR');
 let epoch=0,gesture=null,keyboard=null,active=null,dialog=null,timer=null;
 const stop=e=>{e.preventDefault();e.stopImmediatePropagation();};
 function resetInput(){epoch++;gesture=null;keyboard=null;}
 function targetOf(target){
  const button=target?.closest?.('button');
  const surface=button?.closest('#auraShopModal,#costumePreview,#shopPurchaseConfirm,#blackMarketModal');
  if(!surface)return null;
  const visible=surface.tagName==='DIALOG'?surface.open:surface.classList.contains('show');
  const key=button.id||button.getAttribute('onclick')||JSON.stringify(Object.entries(button.dataset))+'|'+button.textContent;
  return {button,surface,key,visible};
 }
 // Use native click activation only. Never open a new surface on pointerup.
 // Logical action keys survive a server-driven rerender; moving hitboxes and
 // mismatched legacy click pointer IDs must not reject legitimate taps.
 const pointer=typeof window.PointerEvent==='function';
 const id=e=>pointer?e.pointerId:0;
 window.addEventListener(pointer?'pointerdown':'mousedown',e=>{
  gesture=null;keyboard=null;const t=targetOf(e.target);
  if(!t?.visible||t.button.disabled||e.button!==0||e.isPrimary===false)return;
  gesture={...t,epoch,id:id(e),x:e.clientX,y:e.clientY,moved:false,released:false};
 },true);
 window.addEventListener(pointer?'pointermove':'mousemove',e=>{
  if(gesture&&!gesture.released&&id(e)===gesture.id&&Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)>20)gesture.moved=true;
 },true);
 window.addEventListener(pointer?'pointerup':'mouseup',e=>{
  if(!gesture||id(e)!==gesture.id)return;
  const t=targetOf(e.target);
  if(t?.surface!==gesture.surface||t.key!==gesture.key)gesture.moved=true;
  gesture.released=true;gesture.at=performance.now();
 },true);
 if(pointer)window.addEventListener('pointercancel',()=>{gesture=null;},true);
 window.addEventListener('blur',resetInput);
 document.addEventListener('scroll',e=>{if(gesture&&e.target?.contains?.(gesture.button))gesture=null;},true);
 window.addEventListener('keydown',e=>{
  const t=targetOf(e.target);
  if(!t?.visible||!['Enter',' '].includes(e.key))return;
  if(e.repeat){stop(e);return;}
  gesture=null;keyboard={...t,epoch};
 },true);
 window.addEventListener('click',e=>{
  const t=targetOf(e.target);if(!t)return;
  const g=gesture,k=keyboard;gesture=null;keyboard=null;
  const nonPointer=e.detail===0&&!e.pointerType;
  const accessible=nonPointer&&(e.isTrusted||(k?.surface===t.surface&&k.key===t.key&&k.epoch===epoch));
  const fresh=g&&g.epoch===epoch&&g.surface===t.surface&&g.key===t.key&&g.released&&!g.moved&&performance.now()-g.at<1200;
  if(!t.visible||t.button.disabled||!(accessible||fresh))stop(e);
 },true);
 const style=document.createElement('style');
 style.textContent=`
 #auraShopModal button,#costumePreview button,#shopPurchaseConfirm button{transform:none!important;translate:none!important;scale:none!important;touch-action:manipulation}
 #shopPurchaseConfirm{box-sizing:border-box;width:min(420px,calc(100vw - 24px));max-height:calc(100dvh - 28px);margin:auto;padding:22px;border:1px solid #907750;border-radius:14px;background:#141923;color:#ede8df;font:14px/1.65 system-ui,sans-serif;overflow:auto;overscroll-behavior:contain;box-shadow:0 22px 85px #000b}
 #shopPurchaseConfirm::backdrop{background:#03060cc9}
 #shopPurchaseConfirm *{box-sizing:border-box}
 #shopPurchaseConfirm header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px}
 #shopPurchaseConfirm h3{font-size:20px;margin:0;color:#ebd09b}
 #shopPurchaseConfirm button{min-height:44px;padding:10px 14px;font:inherit;border:1px solid #907750;border-radius:8px;background:#283141;color:#eee;cursor:pointer}
 #shopPurchaseConfirm button:disabled{opacity:.45;cursor:not-allowed}
 #shopPurchaseConfirm button:focus-visible{outline:3px solid #9bd7ff;outline-offset:3px}
 #shopPurchaseConfirm [data-product]{display:flex;gap:14px;align-items:center;background:#0c1019;padding:16px;border:1px solid #424555;border-radius:10px}
 #shopPurchaseIcon{display:grid;place-items:center;width:44px;height:44px;flex:none;font-size:32px;color:#d9bd87}
 #shopPurchaseName{overflow-wrap:anywhere;font-size:16px}
 #shopPurchaseDescription{display:block;color:#b1b8c5;font-size:12px;margin-top:3px}
 #shopPurchaseConfirm dl{margin:20px 0;display:grid;gap:12px}
 #shopPurchaseConfirm dl div{display:flex;justify-content:space-between;gap:16px}
 #shopPurchaseConfirm dt{color:#b1b8c5}
 #shopPurchaseConfirm dd{margin:0;text-align:right;font-variant-numeric:tabular-nums;font-weight:700}
 #shopPurchaseConfirm dl div:last-child{border-top:1px solid #424555;padding-top:12px;color:#a4d7ff}
 #shopPurchaseConfirm [data-actions]{display:grid;grid-template-columns:1fr 1.3fr;gap:10px}
 #shopPurchaseAccept{background:#d9bd87!important;color:#17130e!important;font-weight:800!important}
 #shopPurchasePrompt{text-align:center;margin:18px 0 6px}
 #shopPurchaseStatus{color:#ffc08c;min-height:24px;margin:6px 0 16px;overflow-wrap:anywhere;text-align:center}
 #shopBuildVersion{display:block;text-align:center;margin:8px 0 0;font-size:10px;color:#8996a9}
 `;
 document.head.append(style);
 function ensureDialog(){
  if(dialog)return;
  dialog=document.createElement('dialog');dialog.id='shopPurchaseConfirm';
  dialog.setAttribute('aria-labelledby','shopPurchaseTitle');dialog.setAttribute('aria-describedby','shopPurchasePrompt');
  dialog.innerHTML='<header><h3 id="shopPurchaseTitle">구매 확인</h3><button type="button" id="shopPurchaseClose" aria-label="구매 취소하고 닫기">×</button></header><div data-product><span id="shopPurchaseIcon" aria-hidden="true"></span><div><strong id="shopPurchaseName"></strong><small id="shopPurchaseDescription"></small></div></div><dl><div><dt>구매 가격</dt><dd id="shopPurchasePrice"></dd></div><div><dt>현재 보유</dt><dd id="shopPurchaseBalance"></dd></div><div><dt>구매 후 잔액</dt><dd id="shopPurchaseAfter"></dd></div></dl><p id="shopPurchasePrompt">해당 상품을 구매하시겠습니까?</p><p id="shopPurchaseStatus" role="status" aria-live="polite"></p><div data-actions><button type="button" id="shopPurchaseCancel">취소</button><button type="button" id="shopPurchaseAccept">구매 확인</button></div>';
  document.body.append(dialog);
  $('shopPurchaseCancel').onclick=cancel;$('shopPurchaseClose').onclick=cancel;$('shopPurchaseAccept').onclick=confirmPurchase;
  dialog.addEventListener('cancel',e=>{e.preventDefault();cancel();});
  dialog.addEventListener('close',()=>{if(!dialog.open&&active)finish(false);});
  ['keydown','keyup'].forEach(type=>dialog.addEventListener(type,e=>e.stopPropagation()));
 }
 function read(p){try{return p.read();}catch{return null;}}
 function account(){return window.RinguSession?.account?.id;}
 function valid(product){return product&&typeof product.name==='string'&&Number.isSafeInteger(product.price)&&product.price>=0;}
 function quote(product){
  $('shopPurchaseName').textContent=product.name;$('shopPurchaseDescription').textContent=product.description||'';
  $('shopPurchaseIcon').textContent=product.icon||'✦';$('shopPurchasePrice').textContent='정수 '+fmt(product.price)+'개';
 }
 function refresh(){
  const p=active;if(!p||!dialog.open)return;
  const product=read(p),balance=Number(window.RinguCore?.state?.essence);
  const changed=p.account!==account();const bad=!valid(product)||!Number.isFinite(balance)||balance<0;
  const ended=!window.RinguSession?.active;const owned=!!product?.owned;
  const insufficient=!bad&&balance<p.price;
  $('shopPurchaseBalance').textContent=Number.isFinite(balance)?'정수 '+fmt(balance)+'개':'확인 불가';
  $('shopPurchaseAfter').textContent=!bad&&balance>=p.price?'정수 '+fmt(balance-p.price)+'개':'정수 부족';
  let message=p.notice||'';
  if(p.busy)message='서버에서 구매 결과를 확인하는 중…';
  else if(changed||ended)message='로그인 상태를 확인해 주세요.';
  else if(bad||product.available===false)message='지금은 구매할 수 없는 상품입니다.';
  else if(owned)message='이미 보유한 상품입니다.';
  else if(insufficient)message='정수가 '+fmt(p.price-balance)+'개 부족합니다.';
  $('shopPurchaseStatus').textContent=message;
  $('shopPurchaseAccept').disabled=p.busy||p.uncertain||changed||ended||bad||product?.available===false||owned||insufficient;
  $('shopPurchaseAccept').textContent=p.busy?'구매 중…':'구매 확인';
  $('shopPurchaseCancel').disabled=p.busy;$('shopPurchaseClose').disabled=p.busy;
  dialog.setAttribute('aria-busy',String(p.busy));
 }
 function finish(result){
  const p=active;active=null;clearInterval(timer);timer=null;resetInput();
  if(dialog?.open)dialog.close();
  if(p){if(p.focus?.isConnected&&window.RinguSession?.active)p.focus.focus({preventScroll:true});p.resolve(result);}
 }
 function cancel(){if(active&&!active.busy)finish(false);}
 async function confirmPurchase(){
  const p=active;if(!p||p.busy||p.uncertain)return;
  const product=read(p);refresh();
  if(!valid(product)||p.account!==account()||!window.RinguSession?.active||product.owned||product.available===false)return;
  if(product.price!==p.price){p.price=product.price;p.notice='가격이 변경되었습니다. 새 가격을 확인하고 다시 눌러 주세요.';quote(product);resetInput();refresh();return;}
  if(Number(window.RinguCore.state.essence)<p.price)return;
  p.busy=true;refresh();
  try{
   const result=await p.execute();if(active!==p)return;
   if(result===false||result==null){p.busy=false;p.notice='구매가 완료되지 않았습니다. 잔액과 서버 안내를 확인해 주세요.';refresh();return;}
   finish(result);window.RinguCore.fn.toast('구매가 완료되었습니다.');
  }catch(error){
   if(active!==p)return;p.busy=false;
   const known={BLACK_MARKET_REFRESHED:'진열이 갱신되었습니다. 취소 후 새 상품을 확인해 주세요.',BLACK_MARKET_PURCHASED:'이번 진열에서 이미 구매한 상품입니다.',BLACK_MARKET_NOT_READY:'암시장 서버를 준비 중입니다.',INSUFFICIENT_ESSENCE:'정수가 부족합니다.',ALREADY_OWNED:'이미 보유한 상품입니다.',COSTUME_RELEASE_NOT_READY:'상점 업데이트 중입니다. 잠시 후 다시 열어 주세요.'};
   p.notice=known[error.message]||'구매 결과를 확인하지 못했습니다. 서버 기록을 확인한 뒤 다시 이용해 주세요.';
   p.uncertain=!known[error.message];refresh();
  }
 }
 function request(readProduct,execute){
  if(active)return Promise.resolve(false);
  ensureDialog();const product=read({read:readProduct});
  if(!valid(product)||typeof execute!=='function'||typeof dialog.showModal!=='function'){
   window.RinguCore?.fn.toast('상품 정보를 불러오지 못했습니다. 새로고침 후 다시 확인해 주세요.');return Promise.resolve(false);
  }
  return new Promise(resolve=>{
   active={read:readProduct,execute,resolve,account:account(),price:product.price,busy:false,uncertain:false,notice:'',focus:document.activeElement};
   quote(product);resetInput();
   try{dialog.showModal();}catch{finish(false);return;}
   refresh();$('shopPurchaseCancel').focus({preventScroll:true});timer=setInterval(refresh,200);
  });
 }
 function labelBuild(){const modal=$('auraShopModal');if(modal&&!$('shopBuildVersion')){const el=document.createElement('small');el.id='shopBuildVersion';el.textContent='상점 수정 2026.09.10 · LS1';modal.querySelector('.modal').append(el);}}
 window.addEventListener('ringu:session-ended',()=>finish(false));
 window.addEventListener('ringu-ready',labelBuild);labelBuild();
 window.RinguShop={request,resetInput,cancel,version:'LS1'};
})();
