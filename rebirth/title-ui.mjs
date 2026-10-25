// 칭호 UI: badge next to names, collection panel, earned popup.
import {TITLES,TITLE_BY_ID,TITLE_GRADES,TITLE_CRIT_DAMAGE} from './titles-data.mjs';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const newTitleArt=new Set(['look3','look6jobs','look9','look18']);
export const titleArt=id=>'titles/'+id+'.svg?v='+(newTitleArt.has(id)?'skill-collection-20261025':'tower30-20261013');
const gradeName=g=>TITLE_GRADES.find(x=>x.id===g)?.name||'';

// Compact badge for ranking rows, lobbies and the player strip.
export function titleBadge(id,size='sm'){
 const t=TITLE_BY_ID[id];if(!t)return '';
 return `<span class="title-plate title-${size} g-${t.grade}" title="${esc(t.name+' · '+gradeName(t.grade)+' 칭호 · '+t.condition)}"><img src="${titleArt(t.id)}" alt="${esc(t.name)}" loading="lazy" decoding="async"></span>`;
}

let filter='all',detail=null;
export function setTitleFilter(f){filter=['all','owned','locked','common','rare','epic','legend','myth'].includes(f)?f:'all';detail=null;}
export function setTitleDetail(id){detail=TITLE_BY_ID[id]?id:null;}
const date=ms=>{const d=new Date(ms);return `${d.getFullYear()}.${d.getMonth()+1}.${d.getDate()}`;};
function detailView(s,t){
 const has=!!(s.titles||{})[t.id],on=s.title===t.id;
 return `<section class="title-panel title-detail g-${t.grade}">
  <button data-illustrated="1" class="title-back" data-action="titleDetail" data-arg="">← 목록</button>
  <div class="title-detail-art ${has?'':'locked'}"><img src="${titleArt(t.id)}" alt="${esc(t.name)}"></div>
  <div class="title-detail-info"><span class="title-card-grade">${gradeName(t.grade)} · ${esc(t.category)}</span><strong>${esc(t.name)}</strong><p>${esc(t.condition)}</p><p class="title-bonus">보유 효과 · 치명타 피해 +0.5%</p>
  ${has?(on?'<em class="title-on">장착 중</em> <button data-illustrated="1" class="title-unequip" data-action="titleEquip" data-arg="">해제</button>':`<button data-illustrated="1" class="title-equip" data-action="titleEquip" data-arg="${t.id}">장착하기</button><span class="title-date">${date(s.titles[t.id])} 획득</span>`):'<em class="title-lock">아직 얻지 못한 칭호예요</em>'}</div>
 </section>`;
}
export function titlePanelView(s){
 if(detail&&TITLE_BY_ID[detail])return detailView(s,TITLE_BY_ID[detail]);
 const owned=s.titles||{},count=TITLES.filter(t=>owned[t.id]).length;
 const list=TITLES.filter(t=>filter==='all'||(filter==='owned'?owned[t.id]:filter==='locked'?!owned[t.id]:t.grade===filter))
  .sort((a,b)=>(!!owned[b.id]-!!owned[a.id])||(b.rank-a.rank)||(a.order-b.order));
 const per=g=>TITLES.filter(t=>t.grade===g&&owned[t.id]).length+'/'+TITLES.filter(t=>t.grade===g).length;
 const tabs=[['all','전체',count+'/'+TITLES.length],['owned','보유',''],['locked','미보유',''],...TITLE_GRADES.map(g=>[g.id,g.name,per(g.id)])];
 return `<section class="title-panel">
  <div class="title-panel-head"><div><small>TITLE COLLECTION</small><strong>${count} / ${TITLES.length}</strong><span class="title-bonus">보유 효과 · 치명타 피해 +${(count*TITLE_CRIT_DAMAGE*100).toFixed(1)}%</span></div>
   <div class="title-current">${s.title?`<span>장착 중</span>${titleBadge(s.title,'md')}<button data-illustrated="1" class="title-unequip" data-action="titleEquip" data-arg="">해제</button>`:'<span>장착한 칭호가 없어요</span>'}</div></div>
  <nav class="title-tabs">${tabs.map(([k,l,c])=>`<button data-illustrated="1" class="${filter===k?'active':''} ${['common','rare','epic','legend','myth'].includes(k)?'g-'+k:''}" data-action="titleFilter" data-arg="${k}">${l}${c?`<small>${c}</small>`:''}</button>`).join('')}</nav>
  <div class="title-grid">${list.map(t=>{const has=!!owned[t.id],on=s.title===t.id;return `<button data-illustrated="1" class="title-tile g-${t.grade} ${has?'owned':'locked'} ${on?'equipped':''}" data-action="titleDetail" data-arg="${t.id}" aria-label="${esc(t.name)}"><img src="${titleArt(t.id)}" alt="" loading="lazy" decoding="async">${on?'<em>장착</em>':has?'':'<i aria-hidden="true">🔒</i>'}</button>`;}).join('')}</div>
  <p class="note">칭호 하나를 얻을 때마다 치명타 피해가 0.5%씩 올라요 (장착하지 않아도 적용). 칭호를 누르면 조건과 장착 버튼이 나오고, 장착한 칭호는 랭킹·협동 로비에서 이름 옆에 표시돼요.</p>
 </section>`;
}
export function titleEarnedView(e){
 const t=TITLE_BY_ID[e.id];if(!t)return '';
 return `<div class="title-earned g-${t.grade}"><span>${gradeName(t.grade)} 칭호 획득</span><div class="title-earned-art"><img src="${titleArt(t.id)}" alt="${esc(t.name)}"></div><p>${esc(t.condition)}</p></div>`;
}
