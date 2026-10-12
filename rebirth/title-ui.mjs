// 칭호 UI: badge next to names, collection panel, earned popup.
import {TITLES,TITLE_BY_ID,TITLE_GRADES} from './titles-data.mjs';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const titleArt=id=>'titles/'+id+'.svg?v=t2';
const gradeName=g=>TITLE_GRADES.find(x=>x.id===g)?.name||'';

// Compact badge for ranking rows, lobbies and the player strip.
export function titleBadge(id,size='sm'){
 const t=TITLE_BY_ID[id];if(!t)return '';
 return `<span class="title-plate title-${size} g-${t.grade}" title="${esc(t.name+' · '+gradeName(t.grade)+' 칭호 · '+t.condition)}"><img src="${titleArt(t.id)}" alt="${esc(t.name)}" loading="lazy" decoding="async"></span>`;
}

let filter='all';
export function setTitleFilter(f){filter=['all','owned','locked','common','rare','epic','legend','myth'].includes(f)?f:'all';}
export function titlePanelView(s){
 const owned=s.titles||{},count=TITLES.filter(t=>owned[t.id]).length;
 const list=TITLES.filter(t=>filter==='all'||(filter==='owned'?owned[t.id]:filter==='locked'?!owned[t.id]:t.grade===filter))
  .sort((a,b)=>(!!owned[b.id]-!!owned[a.id])||(b.rank-a.rank)||(a.order-b.order));
 const tabs=[['all','전체'],['owned','보유'],['locked','미보유'],...TITLE_GRADES.map(g=>[g.id,g.name])];
 const date=ms=>{const d=new Date(ms);return `${d.getFullYear()}.${d.getMonth()+1}.${d.getDate()}`;};
 return `<section class="title-panel">
  <div class="title-panel-head"><div><small>TITLE COLLECTION</small><strong>${count} / ${TITLES.length}</strong></div>
   <div class="title-current">${s.title?`<span>장착 중</span>${titleBadge(s.title,'md')}<button data-illustrated="1" class="title-unequip" data-action="titleEquip" data-arg="">해제</button>`:'<span>장착한 칭호가 없어요</span>'}</div></div>
  <nav class="title-tabs">${tabs.map(([k,l])=>`<button data-illustrated="1" class="${filter===k?'active':''} ${['common','rare','epic','legend','myth'].includes(k)?'g-'+k:''}" data-action="titleFilter" data-arg="${k}">${l}</button>`).join('')}</nav>
  <div class="title-grid">${list.map(t=>{const has=!!owned[t.id],on=s.title===t.id;return `<article class="title-card g-${t.grade} ${has?'owned':'locked'} ${on?'equipped':''}">
   <div class="title-card-art"><img src="${titleArt(t.id)}" alt="${esc(t.name)}" loading="lazy" decoding="async"></div>
   <div class="title-card-body"><span class="title-card-grade">${gradeName(t.grade)} · ${esc(t.category)}</span><small>${esc(t.condition)}</small>
   ${has?(on?'<em class="title-on">장착 중</em>':`<button data-illustrated="1" class="title-equip" data-action="titleEquip" data-arg="${t.id}">장착</button><span class="title-date">${date(owned[t.id])} 획득</span>`):'<em class="title-lock">미획득</em>'}</div></article>`;}).join('')}</div>
  <p class="note">칭호는 외형 전용이에요. 조건을 달성하면 자동으로 얻고, 랭킹과 협동 로비에서 이름 옆에 표시돼요. 아레나·로또·거래소·투자 칭호는 칭호 창을 열 때 확인해요.</p>
 </section>`;
}
export function titleEarnedView(e){
 const t=TITLE_BY_ID[e.id];if(!t)return '';
 return `<div class="title-earned g-${t.grade}"><span>${gradeName(t.grade)} 칭호 획득</span><div class="title-earned-art"><img src="${titleArt(t.id)}" alt="${esc(t.name)}"></div><p>${esc(t.condition)}</p></div>`;
}
