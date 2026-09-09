/* Read-only release preview. No purchases, currency or save mutations. */
(() => {
 'use strict';
 function install(){
  const g=window.RinguCore,catalog=window.RinguCostumeCatalog,art=window.RinguCostumeArt;
  if(!g?.fn||!catalog||!art||document.getElementById('costumePreviewTab'))return;
  const tabs=document.querySelector('#auraShopModal .shop-tabs');if(!tabs)return;
  const button=document.createElement('button');button.id='costumePreviewTab';button.textContent='🌙 캐릭터';tabs.append(button);
  const panel=document.createElement('dialog');panel.id='costumePreview';panel.setAttribute('aria-label','월영의 방랑자 캐릭터 미리보기');
  panel.innerHTML='<section class="costume-preview-shell"><header><small>CHARACTER COLLECTION · 01</small><h2>월영의 방랑자</h2><button type="button" data-close aria-label="미리보기 닫기">✕</button></header><p class="costume-preview-status" role="status">출시 준비 중 · 미리보기만 가능하며 정수는 차감되지 않습니다.</p><div class="costume-preview-choices"></div><canvas width="600" height="660" aria-label="선택한 캐릭터의 외형"></canvas><h3 data-name></h3><p data-description></p><div class="costume-preview-controls"><button data-pose="portrait">서 있는 모습</button><button data-pose="battle">전투 동작</button></div><p>출시 예정 가격 💎 정수 300개 · 보유 효과 ⚔ 공격력 +5%<br><small>두 캐릭터 보유 시 합산 +10% · 현재 미리보기에는 효과가 적용되지 않습니다.</small></p><button disabled>구매 준비 중</button></section>';
  document.body.append(panel);
  let chosen=Object.keys(catalog.products)[0],battle=false,raf=null,last=0,request=0;
  const canvas=panel.querySelector('canvas'),ctx=canvas.getContext('2d'),status=panel.querySelector('[role="status"]');
  function paint(t=0){
   ctx.clearRect(0,0,canvas.width,canvas.height);
   if(!art.isReady(chosen))return;
   const equipment=Object.fromEntries(g.slots.map(slot=>[slot,g.state.inventory.find(it=>String(it.id)===String(g.state.equipped[slot]))]));
   try{art.draw(ctx,chosen,{x:280,y:595,height:410,pose:battle?Math.floor(t/400)%6:null,equipment,indexOf:g.fn.itemIndex,time:t,state:{equippedAura:g.state.equippedAura,remodelFx:g.state.remodelFx}});}
   catch{status.textContent='외형을 표시하지 못했습니다. 다른 캐릭터를 선택하거나 다시 열어 주세요.';}
  }
  function loop(t){if(!panel.open){raf=null;return;}if(!document.hidden&&t-last>=33){last=t;paint(t);}raf=requestAnimationFrame(loop);}
  async function select(id){
   chosen=id;const ticket=++request,p=catalog.products[id];
   panel.querySelector('[data-name]').textContent=p.name;panel.querySelector('[data-description]').textContent=p.description;
   panel.querySelectorAll('[data-costume]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.costume===id)));
   status.textContent='캐릭터 외형을 불러오는 중…';ctx.clearRect(0,0,canvas.width,canvas.height);
   try{await art.load(id);if(ticket!==request||!panel.open)return;status.textContent='출시 준비 중 · 미리보기만 가능하며 정수는 차감되지 않습니다.';paint();}
   catch{if(ticket===request)status.textContent='이미지를 불러오지 못했습니다. 다시 선택해 주세요.';}
  }
  for(const [id,p] of Object.entries(catalog.products)){const b=document.createElement('button');b.type='button';b.dataset.costume=id;b.textContent=p.name.split(' · ').pop();b.onclick=()=>void select(id);panel.querySelector('.costume-preview-choices').append(b);}
  function close(){panel.close();}
  panel.querySelector('[data-close]').onclick=close;
  panel.addEventListener('close',()=>{request++;if(raf!==null)cancelAnimationFrame(raf);raf=null;button.focus();});
  panel.querySelectorAll('[data-pose]').forEach(b=>b.onclick=()=>{battle=b.dataset.pose==='battle';panel.querySelectorAll('[data-pose]').forEach(other=>other.setAttribute('aria-pressed',String(other===b)));paint();});
  button.onclick=()=>{if(!panel.open)panel.showModal();void select(chosen);if(raf===null)raf=requestAnimationFrame(loop);};
  window.RinguSession.onEnded?.(()=>{if(panel.open)close();});
 }
 window.addEventListener('ringu-ready',install,{once:true});install();
})();
