import {positionValue} from './investment-ui.mjs?v=leverage-109';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n).toLocaleString('ko-KR',{maximumFractionDigits:2});
export function adminPositionsView(data){
 const users=data.users||[];
 return `<div class="admin-positions-status">${users.length}명 · ${users.reduce((n,u)=>n+u.positions.length,0)}개 포지션 · <time>${new Date(data.serverNow).toLocaleTimeString('ko-KR',{timeZone:'Asia/Seoul'})}</time></div>${users.map(u=>`<section class="admin-position-user"><h3>${esc(u.name)} <small>Lv.${Number(u.level)||1} · ${u.positions.length}개</small></h3>${u.positions.length?u.positions.map(p=>{const value=positionValue(p,{price:p.price}),pnl=value-p.amount,rate=pnl/p.amount*100,color=pnl>=0?'positive':'negative';return `<article><strong>${esc(p.name)} · <span class="${p.side==='short'?'negative':'positive'}">${p.side==='short'?'숏':'롱'} ${p.leverage||1}배</span></strong><div>${fmt(p.quantity)}개 · 투자 ${fmt(p.amount)} G</div><div>평단 ${fmt(p.entry)} G · 현재 ${fmt(p.price)} G</div><b class="${color}">${pnl>=0?'+':''}${fmt(pnl)} G (${rate>=0?'+':''}${rate.toFixed(2)}%)</b></article>`;}).join(''):'<p class="admin-no-position">보유 포지션 없음</p>'}</section>`).join('')}`;
}
export async function showAdminPositions({open,modal,fetchData,allowed}){
 if(!allowed())return;
 open('유저 포지션','<div class="admin-positions-body investment-screen">불러오는 중…</div>');
 modal.classList.add('admin-positions-dialog');
 const body=modal.querySelector('.admin-positions-body');
 let loading=false,timer;
 const refresh=async()=>{
  if(!modal.open||!body.isConnected||!allowed()){clearInterval(timer);body.replaceChildren();return;}
  if(loading||document.hidden)return;loading=true;
  try{const data=await fetchData();if(modal.open&&body.isConnected&&allowed())body.innerHTML=adminPositionsView(data);}
  catch(e){if(body.isConnected)body.textContent=e.message==='BETA_DISABLED'?'관리자만 조회할 수 있습니다.':'조회 실패 · 잠시 후 다시 시도합니다.';if(e.message==='BETA_DISABLED')clearInterval(timer);}
  finally{loading=false;}
 };
 timer=setInterval(refresh,3000);
 modal.addEventListener('close',()=>{clearInterval(timer);body.replaceChildren();},{once:true});
 await refresh();
}
