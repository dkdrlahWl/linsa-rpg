/* RU1: presentation only; preserve all game handlers and server transactions. */
(()=>{'use strict';
 const root='/linsa-rpg/art/ui-royal/';
 const measure=document.createElement('canvas').getContext('2d');
 const surfaces='#auraShopModal,#costumePreview,#shopPurchaseConfirm,#blackMarketModal,#ringuAuction';
 function currency(el){
  const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentElement.closest('script,style,textarea,option,.ru-currency')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});
  const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
  for(const n of nodes){const re=/(?:💎\s*)?정수\s*([\d,]+)\s*개?|(?:💎\s*)?([\d,]+)\s*정수/g;let m,last=0;const fragment=document.createDocumentFragment();while((m=re.exec(n.data))){fragment.append(n.data.slice(last,m.index));const span=document.createElement('span');span.className='ru-currency';const img=document.createElement('img');img.src=root+'essence.png';img.alt='정수';img.width=24;img.height=24;span.append(img,document.createTextNode(m[1]||m[2]));fragment.append(span);last=re.lastIndex;}if(last){fragment.append(n.data.slice(last));n.replaceWith(fragment);}}
 }
 function top(){
  const stats=document.querySelector('.topbar .stats');if(!stats)return;
  for(const [id,icon,label] of [['gold','gold','골드'],['essence','essence','정수'],['summonTop','summon','소환']]){const tile=document.getElementById(id)?.closest('.stat');if(!tile)continue;tile.classList.add('ru-'+icon);if(!tile.querySelector('.ru-stat-art')){const img=document.createElement('img');img.className='ru-stat-art';img.src=root+icon+'.png';img.alt='';tile.prepend(img);}const caption=tile.querySelector('.stat-label');if(caption&&caption.textContent!==label){caption.textContent=label;caption.dataset.ringuLabeled='1';}}
  for(const [selector,icon,label] of [['.profile-button','ranking','랭킹'],['.mail-button','mail','우편']]){const button=document.querySelector('.topbar '+selector);if(button&&!button.querySelector('.ru-action-art')){const img=document.createElement('img');img.className='ru-action-art';img.src=root+icon+'.png';img.alt='';button.prepend(img);button.setAttribute('aria-label',label);if(icon==='mail'){[...button.childNodes].filter(n=>n.nodeType===3).forEach(n=>n.remove());const caption=document.createElement('b');caption.textContent=label;button.append(caption);}}}
 }
 function fit(){document.querySelectorAll('.topbar .stat-value').forEach(el=>{const style=getComputedStyle(el);measure.font=style.font;const size=parseFloat(style.fontSize),width=measure.measureText(el.textContent).width;const fitted=Math.max(12,Math.min(innerWidth>=1100?21:17,Math.floor((el.clientWidth-1)/Math.max(1,width)*size)));el.style.setProperty('font-size',fitted+'px','important');});}
 function start(){top();fit();addEventListener('resize',()=>{top();fit();});document.querySelectorAll(surfaces).forEach(currency);const pending=new Set();let queued=false;new MutationObserver(records=>{for(const r of records){const el=r.target.nodeType===1?r.target:r.target.parentElement;const surface=el?.closest(surfaces);if(surface)pending.add(surface);if(el?.closest('.topbar'))pending.add('top');for(const n of r.addedNodes)if(n.nodeType===1){if(n.matches(surfaces))pending.add(n);n.querySelectorAll(surfaces).forEach(x=>pending.add(x));}}if(pending.size&&!queued){queued=true;queueMicrotask(()=>{queued=false;const batch=[...pending];pending.clear();for(const el of batch)el==='top'?(top(),fit()):currency(el);});}}).observe(document.body,{subtree:true,childList:true,characterData:true});}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
