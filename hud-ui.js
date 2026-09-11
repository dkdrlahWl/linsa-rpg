/* HUD1: premium fantasy top HUD + shared essence price mark. Presentation only. */
(()=>{'use strict';
 const $=id=>document.getElementById(id);
 const svg={
  gold:'<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="18"/><path d="M24 12l4 7 8 1-6 6 2 9-8-4-8 4 2-9-6-6 8-1z"/></svg>',
  essence:'<svg viewBox="0 0 48 48"><path d="M24 5c8 9 14 15 14 23 0 8-6 14-14 14S10 36 10 28c0-8 6-14 14-23z"/><path d="M24 15c4 5 7 9 7 13a7 7 0 1 1-14 0c0-4 3-8 7-13z"/><path d="M24 9v30M14 29c5-2 8-6 10-13 2 7 5 11 10 13"/></svg>',
  stone:'<svg viewBox="0 0 48 48"><path d="M24 5 38 18 31 42H17L10 18z"/><path d="M24 5v37M10 18h28M17 42l7-24 7 24"/></svg>',
  pet:'<svg viewBox="0 0 48 48"><ellipse cx="24" cy="31" rx="11" ry="9"/><circle cx="13" cy="20" r="5"/><circle cx="23" cy="16" r="5"/><circle cx="35" cy="20" r="5"/><circle cx="38" cy="30" r="4"/></svg>',
  power:'<svg viewBox="0 0 48 48"><path d="M8 7l13 12-5 5L4 11zM40 7 27 19l5 5 12-13zM14 28l6 6-8 8-6-6zM34 28l-6 6 8 8 6-6z"/></svg>',
  summon:'<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="15"/><path d="M24 5l4 14 15 5-15 5-4 14-4-14-15-5 15-5z"/></svg>',
  rank:'<svg viewBox="0 0 48 48"><path d="M15 7h18v8c0 8-4 13-9 13s-9-5-9-13z"/><path d="M15 11H8c0 9 4 13 10 13M33 11h7c0 9-4 13-10 13M24 28v8M16 41h16"/></svg>',
  mail:'<svg viewBox="0 0 48 48"><path d="M6 13h36v24H6z"/><path d="M7 14l17 13 17-13"/><circle cx="24" cy="26" r="4"/></svg>',
  settings:'<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="8"/><path d="M24 5v7M24 36v7M5 24h7M36 24h7M11 11l5 5M32 32l5 5M37 11l-5 5M16 32l-5 5"/></svg>'
 };
 const icon=(name,cls='')=>'<span class="hud-icon '+cls+' hud-'+name+'" aria-hidden="true">'+svg[name]+'</span>';
 const priceHTML=n=>'<span class="essence-price">'+icon('essence','essence-mini')+'<b>'+Number(n).toLocaleString('ko-KR')+'</b></span>';
 function decoratePriceNode(el){
  if(!el||el.dataset.essenceDecorated==='1')return;
  const t=el.textContent.trim(),m=t.match(/^정수\s+([\d,]+)개$/);if(m){el.innerHTML=priceHTML(Number(m[1].replaceAll(',','')));el.dataset.essenceDecorated='1';}
 }
 function scan(root=document){root.querySelectorAll?.('#auraShopGrid button,#shopPurchasePrice,#shopPurchaseBalance,#shopPurchaseAfter,#blackMarketItems [data-bm-slot] b,#blackMarketRatesBody small').forEach(decoratePriceNode);}
 function install(){
  const top=document.querySelector('.topbar');if(!top||top.dataset.hud1)return;top.dataset.hud1='1';
  const brand=top.querySelector('.brand');if(brand)brand.innerHTML='<strong>RINGU</strong><small>R E F O R G E D</small>';
  const rank=top.querySelector('.profile-button');if(rank){const name=$('playerNameTop')?.textContent||'';rank.innerHTML=icon('rank')+'<b>랭킹</b><span id="playerNameTop">'+name+'</span>';}
  const mail=top.querySelector('.mail-button');if(mail){const badge=$('mailBadge')?.textContent||'0';mail.innerHTML=icon('mail')+'<b>우편</b><i class="mail-badge" id="mailBadge">'+badge+'</i>';}
  const settings=top.querySelector('.settings-button');if(settings)settings.innerHTML=icon('settings')+'<b>설정</b>';
  const stats=top.querySelector('.stats');if(stats){
   if(!$('petStone')){const power=$('power')?.closest('.stat');const d=document.createElement('div');d.className='stat petstone';d.innerHTML='<span class="stat-label">펫스톤</span><span class="stat-value" id="petStone">'+Number(window.RinguCore?.state?.petStone||0).toLocaleString('ko-KR')+'</span>';power?.before(d);}
   const defs=[['gold','gold','골드'],['essence','essence','정수'],['transcendStone','stone','초월석'],['petStone','pet','펫스톤'],['power','power','공격력'],['summonTop','summon','소환']];
   for(const [id,key,label] of defs){const value=$(id),box=value?.closest('.stat');if(!box)continue;box.classList.add('hud-stat','hud-stat-'+key);box.querySelector('.stat-label').textContent=label;if(!box.querySelector('.hud-icon'))box.insertAdjacentHTML('afterbegin',icon(key));}
  }
  scan();const mo=new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes)if(n.nodeType===1)scan(n);});mo.observe(document.body,{childList:true,subtree:true});
  window.addEventListener('ringu:economy-state',()=>{if($('petStone'))$('petStone').textContent=Number(window.RinguCore?.state?.petStone||0).toLocaleString('ko-KR');scan();});
  window.RinguHUD=Object.freeze({version:'HUD1',icon,priceHTML,scan});
 }
 window.addEventListener('ringu-ready',install,{once:true});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>queueMicrotask(install),{once:true});else queueMicrotask(install);
})();
