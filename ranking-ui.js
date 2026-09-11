/* RK1: live ranking presentation only. No score, reward, account or DB changes.
   Decorative icons: Font Awesome Free (CC BY 4.0); see art/RANKING-ICONS.md. */
(() => {
 'use strict';
 const ICONS={compass:[512,512,'M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zm50.7-186.9L162.4 380.6c-19.4 7.5-38.5-11.6-31-31l55.5-144.3c3.3-8.5 9.9-15.1 18.4-18.4l144.3-55.5c19.4-7.5 38.5 11.6 31 31L325.1 306.7c-3.2 8.5-9.9 15.1-18.4 18.4zM288 256a32 32 0 1 0 -64 0 32 32 0 1 0 64 0z'],crown:[576,512,'M309 106c11.4-7 19-19.7 19-34c0-22.1-17.9-40-40-40s-40 17.9-40 40c0 14.4 7.6 27 19 34L209.7 220.6c-9.1 18.2-32.7 23.4-48.6 10.7L72 160c5-6.7 8-15 8-24c0-22.1-17.9-40-40-40S0 113.9 0 136s17.9 40 40 40c.2 0 .5 0 .7 0L86.4 427.4c5.5 30.4 32 52.6 63 52.6l277.2 0c30.9 0 57.4-22.1 63-52.6L535.3 176c.2 0 .5 0 .7 0c22.1 0 40-17.9 40-40s-17.9-40-40-40s-40 17.9-40 40c0 9 3 17.3 8 24l-89.1 71.3c-15.9 12.7-39.5 7.5-48.6-10.7L309 106z'],dragon:[640,512,'M352 124.5l-51.9-13c-6.5-1.6-11.3-7.1-12-13.8s2.8-13.1 8.7-16.1l40.8-20.4L294.4 28.8c-5.5-4.1-7.8-11.3-5.6-17.9S297.1 0 304 0L416 0l32 0 16 0c30.2 0 58.7 14.2 76.8 38.4l57.6 76.8c6.2 8.3 9.6 18.4 9.6 28.8c0 26.5-21.5 48-48 48l-21.5 0c-17 0-33.3-6.7-45.3-18.7L480 160l-32 0 0 21.5c0 24.8 12.8 47.9 33.8 61.1l106.6 66.6c32.1 20.1 51.6 55.2 51.6 93.1C640 462.9 590.9 512 530.2 512L496 512l-64 0L32.3 512c-3.3 0-6.6-.4-9.6-1.4C13.5 507.8 6 501 2.4 492.1C1 488.7 .2 485.2 0 481.4c-.2-3.7 .3-7.3 1.3-10.7c2.8-9.2 9.6-16.7 18.6-20.4c3-1.2 6.2-2 9.5-2.2L433.3 412c8.3-.7 14.7-7.7 14.7-16.1c0-4.3-1.7-8.4-4.7-11.4l-44.4-44.4c-30-30-46.9-70.7-46.9-113.1l0-45.5 0-57zM512 72.3c0-.1 0-.2 0-.3s0-.2 0-.3l0 .6zm-1.3 7.4L464.3 68.1c-.2 1.3-.3 2.6-.3 3.9c0 13.3 10.7 24 24 24c10.6 0 19.5-6.8 22.7-16.3zM130.9 116.5c16.3-14.5 40.4-16.2 58.5-4.1l130.6 87 0 27.5c0 32.8 8.4 64.8 24 93l-232 0c-6.7 0-12.7-4.2-15-10.4s-.5-13.3 4.6-17.7L171 232.3 18.4 255.8c-7 1.1-13.9-2.6-16.9-9s-1.5-14.1 3.8-18.8L130.9 116.5z'],tower:[448,512,'M32 192L32 48c0-8.8 7.2-16 16-16l64 0c8.8 0 16 7.2 16 16l0 40c0 4.4 3.6 8 8 8l32 0c4.4 0 8-3.6 8-8l0-40c0-8.8 7.2-16 16-16l64 0c8.8 0 16 7.2 16 16l0 40c0 4.4 3.6 8 8 8l32 0c4.4 0 8-3.6 8-8l0-40c0-8.8 7.2-16 16-16l64 0c8.8 0 16 7.2 16 16l0 144c0 10.1-4.7 19.6-12.8 25.6L352 256l16 144L80 400 96 256 44.8 217.6C36.7 211.6 32 202.1 32 192zm176 96l32 0c8.8 0 16-7.2 16-16l0-48c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 48c0 8.8 7.2 16 16 16zM22.6 473.4L64 432l320 0 41.4 41.4c4.2 4.2 6.6 10 6.6 16c0 12.5-10.1 22.6-22.6 22.6L38.6 512C26.1 512 16 501.9 16 489.4c0-6 2.4-11.8 6.6-16z']};
 const svg=(name,cls='')=>{const [w,h,path]=ICONS[name];return `<svg class="rk-icon ${cls}" viewBox="0 0 ${w} ${h}" aria-hidden="true" focusable="false"><path fill="currentColor" d="${path}"/></svg>`;};
 const swords='<svg class="rk-icon" viewBox="0 0 40 40" aria-hidden="true" focusable="false"><g fill="currentColor"><path d="M5 2 14 7 32 28 28 32 7 14Z"/><path d="m35 2-9 5L8 28l4 4 21-18Z"/><path d="m6 23 11 11-3 3L3 26Zm17 11 11-11 3 3-11 11ZM4 32l4 4-3 3-4-4Zm28 4 4-4 3 3-4 4Z"/></g></svg>';
 const laurel='<svg class="rk-laurel" viewBox="0 0 72 68" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.2"><path d="M28 62C9 52 7 30 18 15M44 62c19-10 21-32 10-47"/></g><g fill="currentColor"><path d="M20 57C9 54 7 48 7 44c8 3 11 7 13 13ZM15 46C5 41 4 34 6 31c6 4 8 9 9 15ZM13 33C6 26 8 19 11 16c3 6 4 11 2 17ZM16 22c-2-8 1-13 6-17 0 8-3 13-6 17ZM24 61c-5-6-5-10-4-14 6 4 7 9 4 14Z"/><path transform="translate(72 0) scale(-1 1)" d="M20 57C9 54 7 48 7 44c8 3 11 7 13 13ZM15 46C5 41 4 34 6 31c6 4 8 9 9 15ZM13 33C6 26 8 19 11 16c3 6 4 11 2 17ZM16 22c-2-8 1-13 6-17 0 8-3 13-6 17ZM24 61c-5-6-5-10-4-14 6 4 7 9 4 14Z"/></g></svg>';
 const node=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
 const number=v=>Number.isFinite(Number(v))?Math.max(0,Math.floor(Number(v))):0;
 const fmt=v=>number(v).toLocaleString('ko-KR');
 function install(){
  const g=window.RinguCore,f=g?.fn,modal=document.getElementById('profileModal');
  if(!g?.state||!f||!modal||!window.RinguEconomy||!document.body.hasAttribute('data-remodel')||window.RinguRanking)return;
  const $=id=>document.getElementById(id),shell=modal.querySelector('.modal');
  const title=$('rankingTitle'),form=modal.querySelector('.profile-form'),uid=modal.querySelector('.uid-line'),tabs=modal.querySelector('.ranking-tabs'),status=$('rankStatus'),list=$('rankList'),note=$('rankingNote'),actions=modal.querySelector('.modal-actions');
  if([shell,title,form,uid,tabs,status,list,note,actions].some(x=>!x))return;
  let mode='power',pending=null,lastFocus=null;
  modal.classList.add('rk-ready');shell.classList.add('rk-shell');modal.setAttribute('aria-labelledby','rankingTitle');
  const header=node('header','rk-header'),brand=node('div','rk-brand');
  brand.innerHTML=svg('compass','rk-brand-sigil')+'<span>RINGU</span><small>R E F O R G E D</small>';brand.setAttribute('aria-hidden','true');title.classList.add('rk-title');
  const heading=node('div','rk-title-wrap');heading.append(title);
  const ornament=node('div','rk-rule');ornament.innerHTML='<span>✧</span>';ornament.setAttribute('aria-hidden','true');
  const close=node('button','rk-close-x','×');close.type='button';close.setAttribute('aria-label','랭킹 닫기');close.addEventListener('click',()=>f.closeProfile());
  $('nicknameInput').setAttribute('aria-label','랭킹 닉네임');$('nicknameInput').setAttribute('autocomplete','off');
  const save=form.querySelector('button');save.type='button';save.classList.add('rk-save-name');
  form.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing&&e.target===$('nicknameInput')){e.preventDefault();f.setNickname();}});
  const copy=node('button','rk-copy');copy.type='button';copy.setAttribute('aria-label','내 UID 복사');
  copy.innerHTML='<svg class="rk-icon" viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.5"><rect x="8" y="7" width="12" height="14" rx="1"/><path d="M15 4V2H3v15h2"/></g></svg>';
  copy.addEventListener('click',async()=>{const value=String(g.state.playerUid||'');if(!value)return;try{if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(value);else{const range=document.createRange();range.selectNodeContents($('profileUid'));const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);if(!document.execCommand('copy'))throw Error('copy');selection.removeAllRanges();}f.toast('UID를 복사했습니다.');}catch{f.toast('UID를 길게 눌러 복사해 주세요.');}});uid.append(copy);
  const power=$('powerRankTab'),tower=$('towerRankTab');power.innerHTML=swords+'<span>공격력 랭킹</span>';tower.innerHTML=svg('tower')+'<span>시련의 탑</span>';tabs.setAttribute('aria-label','랭킹 종류');
  for(const b of [power,tower]){b.type='button';b.setAttribute('aria-controls','rankList');}
  status.setAttribute('role','status');status.setAttribute('aria-live','polite');list.classList.add('rk-list');list.setAttribute('role','region');list.setAttribute('aria-label','공격력 순위 목록');list.tabIndex=0;
  const footer=node('footer','rk-footer'),myRank=node('button','rk-my-rank');myRank.type='button';myRank.id='rkMyRank';
  myRank.addEventListener('click',()=>{const mine=list.querySelector('.rk-me');if(mine){mine.scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});mine.focus({preventScroll:true});}});
  actions.classList.add('rk-actions');actions.querySelector('button').classList.add('rk-close');
  header.append(brand,close,heading,ornament,form,uid,tabs,status);footer.append(myRank,note,actions);shell.replaceChildren(header,list,footer);
  const isMe=p=>!!(p.id&&p.id===window.RinguSession.account?.id)||!!(p.uid&&p.uid===g.state.playerUid);
  function render(){
   const source=Array.isArray(g.rankingProfiles)?g.rankingProfiles:[];
   const rows=source.map((p,index)=>({p,index})).filter(({p})=>!p.rankingHidden&&(mode!=='tower'||number(p.tower)>=1));
   rows.sort((a,b)=>mode==='tower'?number(b.p.tower)-number(a.p.tower)||number(b.p.power)-number(a.p.power)||a.index-b.index:number(b.p.power)-number(a.p.power)||a.index-b.index);
   title.textContent=mode==='tower'?'시련의 탑 랭킹':'전체 공격력 랭킹';shell.dataset.rankingMode=mode;
   power.classList.toggle('on',mode==='power');tower.classList.toggle('on',mode==='tower');power.setAttribute('aria-pressed',String(mode==='power'));tower.setAttribute('aria-pressed',String(mode==='tower'));
   note.textContent=mode==='tower'?'최고 클리어 층 기준 · 1층 이상부터 등록':'접속 시 자동 등록 · 서버 기록 자동 갱신';list.setAttribute('aria-label',mode==='tower'?'시련의 탑 순위 목록':'공격력 순위 목록');
   const previousFocus=list.contains(document.activeElement)?document.activeElement?.dataset.rkProfile:null;
   const fragment=document.createDocumentFragment();let myIndex=-1;
   for(const [{p,index},i] of rows.map((r,i)=>[r,i])){
    const mine=isMe(p),rank=i+1,row=node('button','rk-row '+(i<3?'rk-medal-'+rank:'rk-regular')+(mine?' rk-me':''));row.type='button';row.dataset.rkProfile=String(p.id||p.uid||index);row.dataset.rkSource=String(index);
    row.setAttribute('aria-label',`${rank}위 ${String(p.name||'모험가')}, ${mode==='tower'?'최고 '+fmt(p.tower)+'층':'공격력 '+fmt(p.power)}${mine?', 내 캐릭터':''}, 캐릭터 정보 보기`);
    const badge=node('span','rk-badge');badge.setAttribute('aria-hidden','true');if(i<3)badge.innerHTML=laurel+svg('crown','rk-crown');badge.append(node('span','rk-rank',String(rank).padStart(2,'0')));
    const identity=node('span','rk-player'),name=node('strong','rk-name',p.name||'모험가');identity.append(name);if(mine){identity.append(node('small','rk-you','나'));myIndex=i;}
    const score=node('span','rk-score');score.innerHTML=mode==='tower'?svg('tower'):swords;score.append(node('bdi','rk-value',fmt(mode==='tower'?p.tower:p.power)));if(mode==='tower')score.append(node('small','rk-unit','층'));
    const watermark=node('span','rk-watermark');watermark.innerHTML=svg(i<3?'dragon':mode==='tower'?'tower':'compass');row.append(watermark,badge,identity,score);
    // Use the source profile identity, NOT the displayed tower index.
    row.addEventListener('click',()=>{const current=g.rankingProfiles||[],exact=current.indexOf(p),matched=exact>=0?exact:current.findIndex(x=>(p.id&&x.id===p.id)||(p.uid&&x.uid===p.uid));if(matched>=0)f.openRankingCharacter(matched);});fragment.append(row);
   }
   if(!rows.length){const empty=node('div','rk-empty');empty.innerHTML=svg(mode==='tower'?'tower':'crown');empty.append(node('strong','',mode==='tower'?'첫 번째 도전자를 기다립니다':'아직 등록된 기록이 없습니다'),node('p','',mode==='tower'?'시련의 탑 1층을 클리어하면 이름이 기록됩니다.':'잠시 후 다시 열어 확인해 주세요.'));fragment.append(empty);}
   const top=list.scrollTop;list.replaceChildren(fragment);list.scrollTop=top;
   if(previousFocus){const target=[...list.querySelectorAll('.rk-row')].find(r=>r.dataset.rkProfile===previousFocus);target?.focus({preventScroll:true});}
   const mine=myIndex>=0?rows[myIndex].p:null;myRank.disabled=!mine;myRank.replaceChildren(node('span','rk-my-label',mine?'내 순위':g.state.rankingHidden?'랭킹 제외 계정':'내 기록'),node('strong','',mine?String(myIndex+1).padStart(2,'0')+'위':mode==='tower'?'1층 클리어 후 등록':'등록 대기'),node('span','rk-my-score',mine?(mode==='tower'?fmt(mine.tower)+'층':'⚔ '+fmt(mine.power)):'—'));
  }
  window.switchRanking=category=>{mode=category==='tower'?'tower':'power';list.scrollTop=0;render();return false;};
  // Preserve existing authenticated read and refresh cadence; no new polling loop.
  const sync=f.syncRanking;
  f.syncRanking=function(...args){if(pending)return pending;const top=list.scrollTop,startedMode=mode;list.setAttribute('aria-busy','true');status.textContent='랭킹 기록을 불러오는 중…';pending=(async()=>{try{return await sync.apply(this,args);}finally{if(status.textContent==='랭킹 기록을 불러오는 중…')status.textContent='랭킹 연결을 확인해 주세요. 이전 기록을 표시합니다.';status.classList.toggle('error',/연결/.test(status.textContent));render();if(startedMode===mode)list.scrollTop=top;list.setAttribute('aria-busy','false');pending=null;}})();return pending;};
  const open=f.openProfile,closeProfile=f.closeProfile;
  f.openProfile=function(...args){lastFocus=document.activeElement;const result=open.apply(this,args);list.scrollTop=0;render();close.focus({preventScroll:true});return result;};
  f.closeProfile=function(...args){const result=closeProfile.apply(this,args);if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});return result;};
  window.RinguRanking=Object.freeze({version:'RK1',render,get mode(){return mode;}});render();
 }
 window.addEventListener('ringu-ready',()=>queueMicrotask(install),{once:true});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
