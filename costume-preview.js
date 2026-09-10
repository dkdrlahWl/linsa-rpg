/* Character shop: receipt-backed purchases and owned-only equip. */
(() => {
 'use strict';
 function install(){
  const g=window.RinguCore,catalog=window.RinguCostumeCatalog,art=window.RinguCostumeArt;
  if(!g?.fn||!catalog||!art||document.getElementById('costumePreviewTab'))return;
  const tabs=document.querySelector('#auraShopModal .shop-tabs');if(!tabs)return;
  const button=document.createElement('button');button.id='costumePreviewTab';button.textContent='🌙 캐릭터';tabs.append(button);
  const panel=document.createElement('dialog');panel.id='costumePreview';panel.setAttribute('aria-label','월영의 방랑자 캐릭터 미리보기');
  panel.innerHTML='<section class="costume-preview-shell"><header><small>CHARACTER COLLECTION · 01</small><h2>월영의 방랑자</h2><button type="button" data-close aria-label="미리보기 닫기">✕</button></header><p class="costume-preview-status" role="status">캐릭터 보유 정보를 확인하는 중…</p><div class="costume-preview-choices"></div><canvas width="600" height="660" aria-label="선택한 캐릭터의 외형"></canvas><h3 data-name></h3><p data-description></p><div class="costume-preview-controls"><button data-pose="portrait">서 있는 모습</button><button data-pose="battle">전투 동작</button></div><p><span data-price></span><br><small>두 캐릭터 보유 시 합산 +10% · 장착하지 않아도 보유 효과 유지</small></p><div class="costume-preview-controls"><button data-buy disabled>확인 중…</button><button data-equip disabled>장착</button><button data-default>기본 캐릭터</button></div></section>';
  document.body.append(panel);
  let chosen=Object.keys(catalog.products)[0],battle=false,raf=null,last=0,request=0,busy=false;
  const canvas=panel.querySelector('canvas'),ctx=canvas.getContext('2d'),status=panel.querySelector('[role="status"]');
  function refreshButtons(){
   const s=window.RinguCostumes?.snapshot,p=catalog.products[chosen],owned=s?.owned.includes(chosen),product=s?.products?.find(p=>p.id===chosen);
   const buy=panel.querySelector('[data-buy]'),equip=panel.querySelector('[data-equip]'),reset=panel.querySelector('[data-default]');
   const price=product?.price??p.price;buy.textContent=owned?'보유 중':s?.ready?'💎 정수 '+price+'개 구매':'구매 준비 중';
   buy.disabled=busy||!s?.ready||owned||!product;equip.textContent=s?.equipped===chosen?'장착 중':'장착';equip.disabled=busy||!s?.ready||!owned||s.equipped===chosen;
   reset.disabled=busy||!s?.ready||!s.equipped;
   panel.querySelector('[data-price]').textContent='가격 💎 정수 '+price+'개 · 보유 효과 ⚔ 공격력 +'+p.attackPercent+'%';
  }
  async function transact(action,id){
   if(busy)return;
   const product=RinguCostumes.snapshot?.products?.find(p=>p.id===id);
   if(action==='buy'&&(!product||!window.RinguShop)){status.textContent='상품 정보를 확인하지 못했습니다. 새로고침 후 다시 확인해 주세요.';return;}
   busy=true;refreshButtons();status.textContent='서버에 저장하는 중…';
   try{const result=action==='buy'?await RinguShop.request(()=>{const s=RinguCostumes.snapshot,p=s?.products?.find(p=>p.id===id);return p?{name:catalog.products[id].name,price:p.price,owned:s.owned.includes(id),available:s.ready,description:'보유 효과: 공격력 +'+catalog.products[id].attackPercent+'%',icon:'☾'}:null;},()=>RinguCostumes.act(action,id)):await RinguCostumes.act(action,id);if(result===false){status.textContent='구매가 완료되지 않았습니다.';return;}status.textContent=action==='buy'?'구매 완료 · 보유 효과가 적용되었습니다.':id?'캐릭터 장착 완료':'기본 캐릭터로 변경했습니다.';window.RinguAudio?.effect(action==='buy'?'purchase':'equip');}
   catch(e){status.textContent=({INSUFFICIENT_ESSENCE:'정수가 부족합니다.',ALREADY_OWNED:'이미 보유한 캐릭터입니다.',COSTUME_NOT_OWNED:'먼저 캐릭터를 구매해 주세요.',COSTUME_RELEASE_NOT_READY:'상점 업데이트 중입니다. 잠시 후 다시 열어 주세요.',SAVE_CONFLICT:'저장 기록이 변경되었습니다. 새로고침해 주세요.'})[e.message]||e.message;}
   finally{busy=false;refreshButtons();}
  }
  panel.querySelector('[data-buy]').onclick=()=>void transact('buy',chosen);
  panel.querySelector('[data-equip]').onclick=()=>void transact('equip',chosen);
  panel.querySelector('[data-default]').onclick=()=>void transact('equip',null);
  panel.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
  window.addEventListener('ringu:costume-update',refreshButtons);
  function paint(t=0){
   ctx.clearRect(0,0,canvas.width,canvas.height);
   if(!art.isReady(chosen))return;
   const equipment=Object.fromEntries(g.slots.map(slot=>[slot,g.state.inventory.find(it=>String(it.id)===String(g.state.equipped[slot]))]));
   try{art.draw(ctx,chosen,{x:280,y:595,height:410,pose:battle?Math.floor(t/400)%6:null,equipment,indexOf:g.fn.itemIndex,time:t,state:{equippedAura:g.state.equippedAura,remodelFx:g.state.remodelFx}});}
   catch{status.textContent='외형을 표시하지 못했습니다. 다른 캐릭터를 선택하거나 다시 열어 주세요.';}
  }
  function loop(t){if(!panel.open){raf=null;return;}if(!document.hidden&&t-last>=33){last=t;paint(t);}raf=requestAnimationFrame(loop);}
  async function select(id){
   if(busy)return;chosen=id;const ticket=++request,p=catalog.products[id];
   panel.querySelector('[data-price]').textContent='가격 💎 정수 '+p.price.toLocaleString('ko-KR')+'개 · 보유 효과 ⚔ 공격력 +'+p.attackPercent+'%';
   panel.querySelector('[data-name]').textContent=p.name;panel.querySelector('[data-description]').textContent=p.description;
   panel.querySelectorAll('[data-costume]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.costume===id)));
   status.textContent='캐릭터 외형을 불러오는 중…';ctx.clearRect(0,0,canvas.width,canvas.height);
   try{await art.load(id);if(ticket!==request||!panel.open)return;status.textContent=RinguCostumes.snapshot?.ready?'원하는 캐릭터를 구매하거나 장착하세요.':'서버 연결 준비 중';refreshButtons();paint();}
   catch{if(ticket===request)status.textContent='이미지를 불러오지 못했습니다. 다시 선택해 주세요.';}
  }
  for(const [id,p] of Object.entries(catalog.products)){const b=document.createElement('button');b.type='button';b.dataset.costume=id;b.textContent=p.name.split(' · ').pop();b.onclick=()=>void select(id);panel.querySelector('.costume-preview-choices').append(b);}
  function close(){if(!busy||!RinguSession.active)panel.close();}
  panel.querySelector('[data-close]').onclick=close;
  panel.addEventListener('close',()=>{request++;if(raf!==null)cancelAnimationFrame(raf);raf=null;button.focus();});
  panel.querySelectorAll('[data-pose]').forEach(b=>b.onclick=()=>{battle=b.dataset.pose==='battle';panel.querySelectorAll('[data-pose]').forEach(other=>other.setAttribute('aria-pressed',String(other===b)));paint();});
  button.onclick=()=>{if(!panel.open){window.RinguShop?.resetInput();panel.showModal();}void select(chosen);refreshButtons();void RinguCostumes.refresh().then(()=>{refreshButtons();status.textContent='보유 정보 확인 완료';}).catch(e=>{status.textContent=e.message;});if(raf===null)raf=requestAnimationFrame(loop);};
  window.RinguSession.onEnded?.(()=>{if(panel.open)close();});
 }
 window.addEventListener('ringu-ready',install,{once:true});install();
})();
