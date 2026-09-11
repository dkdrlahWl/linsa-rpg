(()=>{'use strict';
 const weights=[[8,10,14,19,22,27],[9,11,14,19,21,26],[11,12,15,18,20,24],[12,13,15,18,19,23],[14,14,15,17,19,21],[15,15,15,17,18,20],[17,16,16,16,17,18],[18,17,16,16,16,17]];
 const $=id=>document.getElementById(id),fmt=n=>Number(n||0).toLocaleString('ko-KR');
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let data=null,dialog,view='main',busy=false,frame=0,serverAt=0,receivedAt=0,signature='',previousFocus;
 const now=()=>serverAt+performance.now()-receivedAt;
 const num=n=>n>=1e8?(n/1e8).toFixed(2)+'억':n>=1e4?(n/1e4).toFixed(2)+'만':fmt(n);
 async function request(command,args={}){
  if(busy||!window.RinguEconomy)return false;busy=true;
  try{const value=await RinguEconomy.command(command,args);if(value?.result?.dailyBoss)accept(value.result.dailyBoss);return value;}
  finally{busy=false;if(dialog?.open)render();}
 }
 function accept(value){
  if(!value)return;data=value;serverAt=value.now;receivedAt=performance.now();
  if(value.active){view='battle';show();}
  else if(value.result){view='result';show();}
  else if(view==='battle'||view==='result')view='main';
  if(dialog?.open)render();
 }
 function show(){if(!dialog.open){previousFocus=document.activeElement;dialog.showModal();signature='';}}
 function close(){if(['battle','result'].includes(view)||busy)return;dialog.close();cancelAnimationFrame(frame);previousFocus?.focus();}
 function header(title,back=false){return '<header class="db-header"><div><small>DAILY BOSS</small><h2>'+title+'</h2></div>'+(!['battle','result'].includes(view)?'<button class="db-back" data-action="'+(back?'main':'close')+'" aria-label="'+(back?'일일보스로 돌아가기':'일일보스 닫기')+'">'+(back?'돌아가기':'닫기')+'</button>':'')+'</header>';}
 function art(){return '<div class="db-art"><img src="/linsa-rpg/art/daily-boss-morgas.png" alt="검을 든 황혼의 심판자 모르가스"><div class="db-identity"><small>황혼의 심판자</small><h3>모르가스</h3></div></div>';}
 function resultBody(){const r=data?.result;return header('일일보스 도전 완료')+'<div class="db-result"><div class="db-sigil" aria-hidden="true">✦</div><p>이번 도전 데미지</p><strong class="db-result-damage">'+fmt(r?.damage??data?.active?.damage)+'</strong><dl><div><dt>오늘 누적 데미지</dt><dd>'+ (r?fmt(r.total):'기록 확인 중…')+'</dd></div><div><dt>현재 데미지 순위</dt><dd>'+(r?.rank?r.rank+'위':data?.rankExcluded?'순위 제외':'확인 중…')+'</dd></div><div><dt>오늘 남은 도전</dt><dd>'+ (r?r.remaining+' / 3':'확인 중…')+'</dd></div></dl>'+(r?'<small>'+esc(r.day)+' · 시작일 기준 기록</small>':'<p role="status">공격이 종료되었습니다. 서버 기록을 확인하고 있습니다.</p>')+'<button class="db-primary" data-action="ack" '+(!r||busy?'disabled':'')+'>확인</button></div>';}
 function render(){
  const key=JSON.stringify([view,data?.day,data?.remaining,data?.total,data?.rank,data?.ranking,data?.active?.id,data?.result,busy]);
  if(signature===key)return;signature=key;cancelAnimationFrame(frame);
  if(view==='result')dialog.innerHTML=resultBody();
  else if(view==='battle'){
   dialog.innerHTML=header('일일보스 도전 중')+art()+'<section class="db-battle"><div class="db-clock"><span>남은 시간</span><b id="dbTimer">10.00</b><small>초</small></div><div class="db-hp"><i id="dbHp"></i></div><small>기준 HP 10,000,000,000 · 매 도전 새로 시작</small><p>이번 도전 데미지</p><strong id="dbDamage">0</strong><div id="dbHit" aria-live="off"></div><p class="db-note">10초 동안 자동 공격합니다.<br>접속이 끊겨도 도전 횟수와 기록은 유지됩니다.</p></section>';
   animate();
  }else if(view==='ranking'){
   dialog.innerHTML=header('데미지 순위',true)+'<p class="db-subtitle">'+esc(data?.day)+' · 오늘의 누적 데미지</p><ol class="db-ranking">'+Array.from({length:8},(_,i)=>{const r=data?.ranking?.[i];return '<li class="'+(r?.rank===data?.rank?'db-me':'')+'"><b>'+ (i+1)+'</b><span>'+esc(r?.nickname||'도전자 대기 중')+(r?.rank===data?.rank?'<em>나</em>':'')+'</span><strong>'+ (r?num(r.damage):'—')+'</strong></li>';}).join('')+'</ol><p class="db-note">최대 3회 데미지를 합산합니다.<br>동점이면 해당 누적 데미지에 먼저 도달한 순서입니다.</p>';
  }else if(view==='rates'){
   dialog.innerHTML=header('보상 확률',true)+'<p class="db-subtitle">일일 최종 순위별 정수 보상</p><table class="db-rates"><caption>정수 수량별 당첨 확률</caption><thead><tr><th>순위</th>'+[10,11,12,13,14,15].map(n=>'<th>'+n+'개</th>').join('')+'</tr></thead><tbody>'+weights.map((row,i)=>'<tr><th>'+(i+1)+'등</th>'+row.map(n=>'<td>'+n+'%</td>').join('')+'</tr>').join('')+'</tbody></table><div class="db-averages">'+weights.map((row,i)=>'<span>'+(i+1)+'등 평균 <b>'+(row.reduce((n,p,j)=>n+p*(j+10),0)/100).toFixed(2)+'개</b></span>').join('')+'</div><p class="db-note">각 행 합계 100% · 서버에서 독립적으로 1회 추첨<br>매일 00:00 KST에 전날 1~8위 보상을 우편함으로 지급합니다.</p>';
  }else{
   dialog.innerHTML=header('일일보스')+art()+'<section class="db-main"><div class="db-hp"><i></i></div><p class="db-hp-label">HP <b>10,000,000,000</b><span>100억</span></p><dl class="db-stats"><div><dt>오늘 남은 도전</dt><dd>'+(data?data.remaining+' <small>/ 3</small>':'—')+'</dd></div><div><dt>현재 예상 순위</dt><dd>'+(data?.rank?data.rank+'위':data?.rankExcluded?'순위 제외':'미참여')+'</dd></div><div class="db-total"><dt>나의 오늘 누적 데미지</dt><dd>'+fmt(data?.total)+'</dd></div></dl><button class="db-primary" data-action="start" '+(!data||data.remaining===0||busy?'disabled':'')+'>'+(busy?'확인 중…':data?.remaining===0?'오늘 도전 완료':'도전')+'<small>10초 · 시작 즉시 1회 사용</small></button><div class="db-actions"><button data-action="ranking">데미지 순위</button><button data-action="rates">보상 확률</button></div><p class="db-note">매일 00:00 KST 초기화 · 계정당 하루 3회<br>개인 데미지 측정 보스 · 다른 도전자의 HP와 무관</p></section>';
  }
 }
 function animate(){
  const run=data?.active;if(!run||!dialog.open)return;
  const elapsed=Math.max(0,Math.min(10000,now()-run.startedAt)),hits=run.hits.filter(h=>h.at<=elapsed),damage=hits.reduce((n,h)=>n+h.damage,0);
  $('dbTimer').textContent=(Math.max(0,10000-elapsed)/1000).toFixed(2);$('dbDamage').textContent=fmt(damage);$('dbHp').style.width=Math.max(0,100-damage/1e10*100)+'%';
  const hit=hits.at(-1);$('dbHit').textContent=hit?(hit.crit?'치명타 · ':'')+'−'+fmt(hit.damage):'공격 준비';
  if(elapsed>=10000){view='result';signature='';render();void request('dailyBossStatus');return;}
  frame=requestAnimationFrame(animate);
 }
 function install(){
  if(dialog||!window.RinguCore||!window.RinguEconomy)return;
  dialog=document.createElement('dialog');dialog.id='dailyBoss';dialog.className='db-dialog';dialog.setAttribute('aria-label','일일보스');document.body.append(dialog);
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  dialog.addEventListener('click',async e=>{
   const action=e.target.closest('[data-action]')?.dataset.action;if(!action||busy)return;
   if(action==='close')return close();
   if(action==='start'){await request('dailyBossStart');return;}
   if(action==='ack'){if(data?.result)await request('dailyBossAck',{id:data.result.id});return;}
   view=action;signature='';render();
  });
  const button=document.createElement('button');button.id='dailyBossMenu';button.className='db-menu';button.innerHTML='<span aria-hidden="true"></span>일일보스';button.onclick=()=>{view='main';show();render();void request('dailyBossStatus');};
  document.querySelector('.main-quick')?.append(button);
  window.RinguDailyBoss={open:button.onclick};
  window.addEventListener('ringu:economy-state',e=>accept(e.detail?.dailyBoss));
  // First sync also restores a running battle or its unacknowledged result.
  void request('dailyBossStatus');
 }
 window.addEventListener('ringu-ready',install);install();
 if(!dialog){const timer=setInterval(()=>{install();if(dialog)clearInterval(timer);},250);}
})();
