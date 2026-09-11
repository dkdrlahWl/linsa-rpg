/* HU1: presentation-only premium HUD + shared essence price badge. */
(()=>{'use strict';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const icons={
  gold:'<circle cx="24" cy="24" r="18"/><path d="M24 10l4.3 8.7 9.7 1.4-7 6.8 1.7 9.6L24 32l-8.7 4.5 1.7-9.6-7-6.8 9.7-1.4z"/>',
  essence:'<path d="M27.2 4.5c1.8 7.7-3.8 10.7-7.2 15.4-3.2 4.3-4.8 8.6-2.3 13.2 1.4 2.6 3.8 4.5 6.7 5.1-6.6.8-12.9-4.3-12.9-11.5 0-7.7 6.9-13.4 15.7-22.2z"/><path d="M29.3 16.5c5.1 4 8.2 8.5 7.2 13.4-1 5.1-5.4 9-10.7 9.2 3.4-1.9 5.4-5.1 5.1-8.6-.2-3.5-2.6-5.7-5.8-7.8 1.8-1.7 3.2-3.7 4.2-6.2z"/><path d="M23.8 25.3c3.3 2.2 4.5 4.5 3.7 6.9-.7 2-2.5 3.5-4.8 3.7-2.4-1.3-3.6-3.5-3-5.8.5-1.9 2-3.4 4.1-4.8z"/>',
  stone:'<path d="M24 3l11 9-3.5 26L24 45l-7.5-7L13 12z"/><path d="M24 3v42M13 12l11 6 11-6M16.5 38L24 18l7.5 20"/>',
  pet:'<circle cx="15" cy="16" r="5"/><circle cx="24" cy="12" r="5"/><circle cx="33" cy="16" r="5"/><circle cx="10.5" cy="25" r="4.5"/><circle cx="37.5" cy="25" r="4.5"/><path d="M24 21c-8 0-13 6.2-13 12.5 0 5 4 8.5 8.3 6.1 2.8-1.6 6.6-1.6 9.4 0 4.3 2.4 8.3-1.1 8.3-6.1C37 27.2 32 21 24 21z"/>',
  attack:'<path d="M8 5l13 13-4 4L4 9zM40 5L27 18l4 4L44 9zM15 23l10 10-4 4-10-10zM33 23L23 33l4 4 10-10zM8 33l7 7-3 3-7-7zM40 33l-7 7 3 3 7-7z"/>',
  summon:'<circle cx="24" cy="24" r="17"/><path d="M24 6l4 13 13 5-13 4-4 14-4-14-13-4 13-5z"/><circle cx="24" cy="24" r="4"/>',
  rank:'<path d="M14 7h20v7c0 8-4 13-10 15-6-2-10-7-10-15z"/><path d="M14 10H8v5c0 5 3 8 8 8M34 10h6v5c0 5-3 8-8 8M20 29v6h8v-6M15 40h18"/>',
  mail:'<path d="M6 12h36v25H6z"/><path d="M7 14l17 13 17-13M7 36l12-11M41 36L29 25"/><circle cx="24" cy="28" r="5"/><path d="M24 24.5l1.1 2.2 2.4.4-1.7 1.7.4 2.4-2.2-1.2-2.2 1.2.4-2.4-1.7-1.7 2.4-.4z"/>',
  settings:'<path d="M24 7l3 5 6-1 2 5 6 2-1 6 4 4-4 4 1 6-6 2-2 5-6-1-3 5-3-5-6 1-2-5-6-2 1-6-4-4 4-4-1-6 6-2 2-5 6 1z"/><circle cx="24" cy="28" r="7"/>'
 };
 function iconHTML(name,extra=''){
  const stroke=['stone','attack','summon','rank','mail','settings'].includes(name);
  return `<svg class="hu-icon hu-icon-${name} ${esc(extra)}" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><g ${stroke?'fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"':'fill="currentColor"'}>${icons[name]||''}</g></svg>`;
 }
 const format=v=>typeof v==='number'?Math.floor(v).toLocaleString('ko-KR'):String(v??'');
 function essenceCostHTML(value){const text=format(value);return `<span class="hu-essence-cost" aria-label="정수 ${esc(text)}개">${iconHTML('essence','hu-cost-icon')}<b>${esc(text)}</b></span>`;}
 function setIcon(selector,name){const el=document.querySelector(selector);if(el){el.innerHTML=iconHTML(name);el.dataset.huIcon=name;}}
 function apply(){
  const header=document.getElementById('rmTopHeader');if(!header)return false;header.classList.add('hu-hud');
  const brand=header.querySelector('.brand')||header.firstElementChild;if(brand)brand.classList.add('hu-brand');
  setIcon('.rm-stat-gold .rm-stat-icon','gold');setIcon('.rm-stat-essence .rm-stat-icon','essence');setIcon('.rm-stat-stone .rm-stat-icon','stone');setIcon('.rm-stat-petstone .rm-stat-icon','pet');setIcon('.rm-stat-power .rm-stat-icon','attack');setIcon('.rm-stat-summon .rm-stat-icon','summon');
  const rank=document.querySelector('.profile-button'),mail=document.querySelector('.mail-button'),settings=document.querySelector('.settings-button');
  if(rank&&!rank.dataset.huReady){const nick=rank.querySelector('#headerNickname')?.textContent||'';rank.innerHTML=iconHTML('rank')+'<span class="hu-action-label">랭킹</span><small id="headerNickname">'+esc(nick)+'</small>';rank.dataset.huReady='1';}
  if(mail&&!mail.dataset.huReady){mail.innerHTML=iconHTML('mail')+'<span class="hu-action-label">우편</span>';mail.dataset.huReady='1';mail.setAttribute('aria-label','우편');}
  if(settings&&!settings.dataset.huReady){settings.innerHTML=iconHTML('settings')+'<span class="hu-action-label">설정</span>';settings.dataset.huReady='1';settings.setAttribute('aria-label','설정');}
  return true;
 }
 window.RinguHUD=Object.freeze({version:'HU1',iconHTML,essenceCostHTML,apply});
 let tries=0;function boot(){if(apply()||tries++>30)return;setTimeout(boot,100);}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
 window.addEventListener('ringu-ready',()=>{apply();setTimeout(apply,0);},{once:true});
})();
