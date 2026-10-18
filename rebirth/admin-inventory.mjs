import {gearName,gearAttributes,SLOTS,OPTIONS,optionUnit,MATERIALS,RARITIES} from './data.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>Number(v||0).toLocaleString('ko-KR');
export function adminInventoryView(u,art){
 const items=u.items||[],equipped=new Set(Object.values(u.equipped||{}));
 const card=(it,stored=false)=>{const a=gearAttributes(it);return `<article class="admin-gear-card">${art(it)}<div><strong>${esc(/^\d+레벨/.test(gearName(it))?gearName(it):it.level+'레벨 '+gearName(it))}</strong><small>${esc(SLOTS[it.slot])} · ${it.boss?'보스':'일반'} · ${fmt(it.stars)}성 · ${it.broken?'파괴됨':equipped.has(it.id)?'장착 중':stored?'보관함':'가방'}${it.locked?' · 잠금':''}</small><p>공격 ${fmt(a.attack)} · 주스탯 ${fmt(a.stat)} · HP ${fmt(a.hp)} · 방어 ${fmt(a.defense)}</p><span>${esc(RARITIES[it.grade]||'잠재 미개방')}</span>${(it.lines||[]).map(l=>`<div>${esc(OPTIONS[l.key]||l.key)} +${esc(l.value)}${esc(optionUnit(l.key))}</div>`).join('')||'<div>잠재 미개방</div>'}</div></article>`;};
 const resource=(label,value)=>`<div class="admin-resource"><span>${esc(label)}</span><b>${fmt(value)}</b></div>`;
 const group=(title,list)=>`<h3>${title} · ${list.length}개</h3><div class="admin-gear-list">${list.map(i=>card(i)).join('')||'<p class="note">없음</p>'}</div>`;
 return `<p class="note">Lv.${fmt(u.level)} · 저장 갱신 ${new Date(u.updatedAt).toLocaleTimeString('ko-KR')} · 3초마다 자동 조회</p><section class="admin-resource-grid">${resource('골드',u.gold)}${resource('다이아',u.diamonds)}${Object.entries(u.materials||{}).map(([k,v])=>resource(MATERIALS[k]||k,v)).join('')}${Object.entries(u.bossMaterials||{}).map(([k,v])=>resource('보스 재료 · '+k,v)).join('')}</section>${group('장착 장비',items.filter(i=>equipped.has(i.id)))}${group('가방 장비',items.filter(i=>!equipped.has(i.id)))}<h3>보관함</h3>${(u.mailbox||[]).map(m=>m.item?`<small>수량 ${fmt(m.quantity)}</small>${card(m.item,true)}`:'').join('')||'<p class="note">없음</p>'}`;
}
export async function showAdminInventory({open,modal,allowed,fetchData,art}){
 if(!allowed())return;
 open('유저 장비 · 재화 조회','<div class="admin-inventory-body"><p>불러오는 중…</p></div>');
 const root=modal.querySelector('.admin-inventory-body');let selected='',loading=false,timer,users=[];
 const refresh=async()=>{
  if(!root.isConnected||!modal.open||!allowed()){clearInterval(timer);root.replaceChildren();return;}
  if(loading||document.hidden)return;loading=true;
  try{
   const list=await fetchData(null);users=list.users||[];
   if(!selected&&users.length)selected=users[0].id;
   const target=selected;
   const data=target?await fetchData(target):null;
   if(selected!==target)return;
   if(!root.isConnected||!modal.open||!allowed())return;
   if(!root.querySelector('select'))root.innerHTML='<label>유저 선택 <select class="admin-user-select"></select></label><div class="admin-inventory-stamp"></div><div class="admin-inventory-detail"></div>';
   const select=root.querySelector('select');const options=users.map(u=>`<option value="${esc(u.id)}">${esc(u.name)} · Lv.${fmt(u.level)}</option>`).join('');
   if(select.innerHTML!==options)select.innerHTML=options;select.value=selected;
   const detail=root.querySelector('.admin-inventory-detail');const revision=data?.user?.revision;
   if(detail.dataset.user!==selected||detail.dataset.revision!==String(revision)){detail.innerHTML=data?.user?adminInventoryView(data.user,art):'<p>유저 없음</p>';detail.dataset.user=selected;detail.dataset.revision=revision;}
   root.querySelector('.admin-inventory-stamp').textContent='조회 '+new Date(list.serverNow).toLocaleTimeString('ko-KR')+' · 관리자 전용';
  }catch(e){if(root.isConnected){const status=root.querySelector('.admin-inventory-stamp');if(status)status.textContent=e.message==='ADMIN_ONLY'?'관리자만 조회할 수 있습니다.':'갱신 지연 · 재시도 중';else root.textContent='조회 실패 · 다시 열어 주세요.';}if(e.message==='ADMIN_ONLY'){clearInterval(timer);root.replaceChildren();}}
  finally{loading=false;}
 };
 root.addEventListener('change',e=>{if(e.target.matches('.admin-user-select')){selected=e.target.value;root.querySelector('.admin-inventory-detail').textContent='불러오는 중…';void refresh();}});
 timer=setInterval(refresh,3000);modal.addEventListener('close',()=>{clearInterval(timer);root.replaceChildren();},{once:true});await refresh();
}
