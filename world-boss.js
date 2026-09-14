/* WB1 scene. One cached Canvas board, static equipped heroes, bounded effects.
 * No attack/HP/reward values are accepted from the browser by the server.
 */
(()=>{'use strict';
 const M=window.RinguWorldBossModel;if(!M)return;
 let g,root,room=null,userId=null,remaining=3,unlockedAt=null,open=false,busy=false,flight=false,pending=null;
 let requestTail=Promise.resolve(),screenEpoch=0,busyAction='',lobbyPointer=null,deferredLobby=null;
 const actionButtons=new WeakMap(),actionLabels={create:'방 만드는 중…',join:'참가하는 중…',ready:'준비 변경 중…',start:'전투 시작 중…',list:'새로고침 중…',ack:'확인 중…',leave:'나가는 중…'};
 function actionUi(){
  if(!root)return;root.setAttribute('aria-busy',String(busy));
  for(const button of root.querySelectorAll('[data-action]')){if(busy){if(!actionButtons.has(button))actionButtons.set(button,{disabled:button.disabled,text:button.textContent});button.disabled=true;if(button.dataset.action===(busyAction==='leave'?'leave-confirm':busyAction==='list'?'refresh':busyAction)){button.textContent=actionLabels[busyAction];button.setAttribute('aria-busy','true');}}
   else{const saved=actionButtons.get(button);if(saved){button.disabled=saved.disabled;button.textContent=saved.text;actionButtons.delete(button);}button.removeAttribute('aria-busy');}}
  if(busy)$('wb-footer').textContent=actionLabels[busyAction]||'처리 중…';
 }
 function lobbyHtml(html){if(lobbyPointer!==null){deferredLobby=html;return;}const lobby=$('wb-lobby');if(lobby.dataset.rendered!==html){lobby.innerHTML=html;lobby.dataset.rendered=html;}actionUi();}
 function releaseLobbyPointer(e){if(e&&e.pointerId!==lobbyPointer)return;lobbyPointer=null;setTimeout(()=>{if(open&&lobbyPointer===null&&deferredLobby!==null){const html=deferredLobby;deferredLobby=null;lobbyHtml(html);}},0);}
 let origin={x:0,y:6},moves=[],seq=0,packet=0,serverOffset=0,bestRtt=Infinity,lastGood=0,frameId=0,lastFrame=0;
 let syncTimer,urgentTimer,unsubscribe,channelRoom=null,network='connecting',errorText='',lobbyRooms=[];
 let lastHurtSound=-Infinity;
 function hurtSound(){const t=now();if(t-lastHurtSound<180)return;lastHurtSound=t;window.RinguAudio?.effect('raid-hurt');}
 const seen=new Map(),reports=new Map(),resolved=new Set(),spriteCache=new Map(),remotePositions=new Map();
 let boardCache=null,boardSize=0,previousFocus=null,activePointers=new Map(),keys=new Set(),lastMove=-Infinity;
 let queuedKey=null,inputOrder=0;const held=new Map(),shots=[],hitSeen=new Map();
 function clearInput(){keys.clear();activePointers.clear();held.clear();queuedKey=null;root?.querySelectorAll(".wb-pressed").forEach(b=>b.classList.remove("wb-pressed"));}
 function press(source,key){held.delete(source);held.set(source,{key,order:++inputOrder});queuedKey=key;move(key);}
 function releaseInput(source){held.delete(source);}
 function pumpInput(){const key=queuedKey||[...held.values()].sort((a,b)=>b.order-a.order)[0]?.key;if(key)move(key);}

 const assetBase=new URL('art/world-boss/',document.currentScript.src).href;
 const assets={heroes:new Image(),arena:new Image(),fx:new Image(),tomb:new Image()};assets.heroes.onload=()=>spriteCache.clear();assets.arena.onload=()=>{boardCache=null;};
 const $=id=>document.getElementById(id),now=()=>Date.now()+serverOffset;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const number=n=>Math.floor(Number(n)||0).toLocaleString('ko-KR');
 const mine=()=>room?.members.find(m=>m.id===userId);
 const errors={WORLD_BOSS_LOCKED:'랭킹 공격력 합계 8,000 달성 시 해금됩니다.',ROOM_FULL:'방이 가득 찼습니다.',ROOM_NOT_WAITING:'이미 시작했거나 종료된 방입니다.',ROOM_FORBIDDEN:'참가 중인 방만 볼 수 있습니다.',HOST_ONLY:'방장만 시작할 수 있습니다.',MEMBERS_NOT_READY:'다른 참가자의 준비 완료를 기다려 주세요.',BATTLE_IN_PROGRESS:'진행 중인 전투를 먼저 종료해 주세요.',ROOM_LEFT:'방에서 퇴장했습니다. 다시 참가해 주세요.',INVALID_MOVE:'연결 지연으로 위치를 다시 맞추고 있습니다.'};
 const friendly=e=>errors[e.message]||(/SESSION_|LOGIN_REQUIRED/.test(e.message)?'로그인 세션이 종료되었습니다. 다시 로그인해 주세요.':'연결을 확인하고 다시 시도해 주세요.');
 function toast(text){errorText=text;if($('wb-footer'))$('wb-footer').textContent=text;if($('wb-overlay')&&!$('wb-overlay').hidden){let status=$('wb-action-status');if(!status){status=document.createElement('p');status.id='wb-action-status';status.setAttribute('role','status');$('wb-overlay').querySelector('.wb-dialog')?.append(status);}status.textContent=text;}}
 function request(action,args={},id=room?.id){
  const epoch=screenEpoch;
  const task=requestTail.then(async()=>{
   if(!open||epoch!==screenEpoch)throw new Error('WB_CLOSED');
   const started=Date.now();const res=await fetch('/api/world-boss',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,room:id||null,args}),signal:AbortSignal.timeout(7000)});
   const data=await res.json();if(!open||epoch!==screenEpoch)throw new Error('WB_CLOSED');if(!res.ok)throw Object.assign(new Error(data.error||'SERVER_ERROR'),{status:res.status});
   const rtt=Date.now()-started;if(rtt<bestRtt+100){serverOffset=data.serverNow-(started+rtt/2);bestRtt=Math.min(bestRtt,rtt);}
   lastGood=Date.now();errorText='';accept(data);actionUi();return data;
  });
  requestTail=task.catch(()=>{});return task;
 }
 function accept(data){
  if(!open)return;
  if(data.userId)userId=data.userId;if(data.remaining!==undefined)remaining=data.remaining;if(data.unlockedAt!==undefined)unlockedAt=data.unlockedAt;
  if(data.rooms)lobbyRooms=data.rooms;
  const next=data.room;
  if(next&&room?.id===next.id&&next.version<room.version)return;
  const previous=room;room=next||null;
  if(previous?.id===room?.id&&room){const old=previous.members.find(m=>m.id===userId),current=room.members.find(m=>m.id===userId);if(old&&current&&current.hp<old.hp&&!reports.size)hurtSound();}
  if(previous?.id!==room?.id){shots.length=0;hitSeen.clear();clearInput();}
  if(room&&previous?.id===room.id)for(const m of room.members){const h=m.lastHit;if(h&&h.id!==hitSeen.get(m.id)){hitSeen.set(m.id,h.id);if(h.damage>0&&now()-h.at<2500)shots.push({member:m.id,damage:h.damage,crit:!!h.crit,at:now()});}else if(!h){const old=previous.members.find(p=>p.id===m.id);const damage=m.damage-(old?.damage??m.damage);if(damage>0)shots.push({member:m.id,damage,crit:false,at:now()});}}
  if(shots.length>40)shots.splice(0,shots.length-40);
  if(room){
   const me=mine();
   if(!me){room=null;return render();}
   if(previous?.id!==room.id||previous.status==='waiting'&&room.status==='running'){
    origin={x:me.x,y:me.y};moves=[];seq=me.seq;packet=me.packet;pending=null;seen.clear();reports.clear();resolved.clear();lastMove=-Infinity;remotePositions.clear();
   }
   packet=Math.max(packet,me.packet);seq=Math.max(seq,me.seq);
   for(const m of room.members){const old=remotePositions.get(m.id);if(!old||old.x!==m.x||old.y!==m.y)remotePositions.set(m.id,{x:m.x,y:m.y,fromX:old?.x??m.x,fromY:old?.y??m.y,at:now()});}
   if(previous?.status!==room.status||previous?.id!==room.id)render();else if(room.status==='waiting')renderWaiting();else updateHud();
   if(room.status==='running'&&!frameId)frameId=requestAnimationFrame(paint);
   if(['won','lost','closed'].includes(room.status))showResult();
  }else if(previous||!$('wb-lobby').children.length)render();else renderLobby();
  if(channelRoom!==room?.id){unsubscribe?.();unsubscribe=null;channelRoom=room?.id||null;
   if(channelRoom)unsubscribe=window.RinguCloud?.subscribeWorldBoss(channelRoom,data=>{if(open&&data.room?.id===channelRoom)accept({...data,userId,remaining,unlockedAt});},state=>{network=state;if(state==='ended')closeLocal();});
  }
 }
 function shell(){
  if(root)return;
  root=document.createElement('section');root.id='wb-screen';root.hidden=true;root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','주간보스');
  const pad=side=>`<div class="wb-pad" aria-label="${side} 방향키">${[['w','▲','위'],['a','◀','왼쪽'],['d','▶','오른쪽'],['s','▼','아래']].map(([key,icon,label])=>`<button type="button" data-key="${key}" aria-label="${side} ${label} 한 칸 이동">${icon}</button>`).join('')}</div>`;
  root.innerHTML=`<div class="wb-shell"><header class="wb-header"><div><small>WEEKLY BOSS · 1단계</small><h2>멸겁룡 카르가론</h2></div><time id="wb-time">07:00</time><button id="wb-exit" type="button">나가기</button></header><div id="wb-lobby" class="wb-lobby"></div><div id="wb-battle" class="wb-battle" hidden><canvas id="wb-fx" aria-hidden="true"></canvas><div class="wb-boss"><div class="wb-bossbar" role="progressbar" aria-label="보스 체력"><i id="wb-boss-fill"></i><span id="wb-boss-hp"></span></div><div id="wb-party" class="wb-party" aria-label="참가자 체력"></div><div id="wb-contribution" class="wb-contribution"><span>내 기여도 <b id="wb-contribution-rate">0.0%</b></span><small id="wb-contribution-damage">누적 0</small></div><div id="wb-pattern" class="wb-pattern-label"></div></div><div class="wb-arena-wrap"><canvas id="wb-arena" class="wb-arena" aria-label="8 곱하기 8 전투 타일, WASD 또는 양쪽 방향키로 이동"></canvas><div id="wb-countdown" class="wb-countdown"></div></div><div class="wb-controls">${pad('왼손')}<div class="wb-control-copy"><strong>이동 중에도 자동공격</strong>초당 최대 1회 공격<br>꾹 누르면 연속 이동<br><br>PC · W A S D</div>${pad('오른손')}</div></div><footer id="wb-footer" class="wb-footer" role="status"></footer></div><div id="wb-overlay" class="wb-overlay" hidden></div>`;
  document.body.append(root);
  $('wb-exit').onclick=()=>{if(!busy)confirmExit();};
  root.addEventListener('pointerdown',e=>{if(e.target.closest('#wb-lobby [data-action]'))lobbyPointer=e.pointerId;},true);
  window.addEventListener('pointerup',releaseLobbyPointer);window.addEventListener('pointercancel',releaseLobbyPointer);window.addEventListener('blur',()=>releaseLobbyPointer());
  root.addEventListener('click',e=>{const button=e.target.closest('[data-action]');if(!button)return;const action=button.dataset.action;
   if(action==='create')doAction('create');else if(action==='join')doAction('join',{},button.dataset.room);else if(action==='ready')doAction('ready',{ready:!mine()?.ready});else if(action==='start')doAction('start');else if(action==='refresh')doAction('list',{},null);else if(action==='leave-confirm')leave();else if(action==='cancel')hideDialog();else if(action==='ack')ack();});
  root.addEventListener('pointerdown',e=>{const button=e.target.closest('[data-key]');if(!button)return;e.preventDefault();button.setPointerCapture?.(e.pointerId);activePointers.set(e.pointerId,button.dataset.key);button.classList.add('wb-pressed');press('p'+e.pointerId,button.dataset.key);});
  const release=e=>{activePointers.delete(e.pointerId);releaseInput('p'+e.pointerId);root.querySelectorAll('[data-key]').forEach(b=>b.classList.toggle('wb-pressed',[...activePointers.values()].includes(b.dataset.key)));};
  root.addEventListener('pointerup',release);root.addEventListener('pointercancel',e=>{release(e);queuedKey=null;});root.addEventListener('lostpointercapture',release);
  window.addEventListener('keydown',e=>{if(!open||room?.status!=='running'||e.target.closest?.('input,textarea,select,[contenteditable="true"]'))return;const key=e.key.toLowerCase();if(!M.directions[key])return;e.preventDefault();if(e.repeat||keys.has(key))return;keys.add(key);press('k'+key,key);});
  window.addEventListener('keyup',e=>{const key=e.key.toLowerCase();keys.delete(key);releaseInput('k'+key);});
  window.addEventListener('blur',clearInput);
  document.addEventListener('visibilitychange',()=>{if(!open)return;if(document.hidden){clearInput();cancelAnimationFrame(frameId);frameId=0;sync();}else{lastGood=0;sync();if(room?.status==='running'&&!frameId)frameId=requestAnimationFrame(paint);}});
  root.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();confirmExit();}if(e.key==='Tab'){const focus=[...root.querySelectorAll('button:not(:disabled)')].filter(b=>b.getClientRects().length);const first=focus[0],last=focus.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}});
 }
 function render(){
  const battle=room&&room.status!=='waiting';$('wb-lobby').hidden=!!battle;$('wb-battle').hidden=!battle;
  if(battle){$('wb-party').innerHTML=room.members.map(m=>`<div class="wb-party-row" data-id="${esc(m.id)}" data-me="${m.id===userId}"><span class="wb-party-name">${esc(m.id===userId?'나 · '+m.name:m.name)}</span><span class="wb-party-track"><i></i></span><span class="wb-party-percent"></span></div>`).join('');updateHud();}
  else if(room)renderWaiting();else renderLobby();
 }
 function renderLobby(){
  lobbyHtml(`<div class="wb-cover"><strong>카르가론 <small>· 1단계</small></strong></div><p class="wb-copy">거대한 보스를 마주한 8×8 전장. 이동하면서 공격하고, 보스의 공격을 피하세요.</p><div class="wb-quota">이번 주 보상 가능 <b>${remaining} / 3회</b> · 월요일 00:00 초기화 (한국 시간)<br><small>${remaining?'클리어 시 1회 차감 · 보상은 우편함으로 지급':'보상 없이 참가 가능 · 혼자서도 시작 가능'}</small></div>${unlockedAt?'':'<p class="wb-status">잠김 · 랭킹 플레이어 공격력 합계가 최초 8,000 이상이면 영구 해금됩니다.</p>'}<details class="wb-reward-guide"><summary>1단계 클리어 보상 · 비취큐브 2개 + 순위별 정수</summary><p>보상 대상 참가자 전원 비취큐브 2개 · 보상은 우편함으로 지급</p><div class="wb-reward-ranks">${Array.from({length:10},(_,i)=>`<span>${i+1}등 <b>정수 ${50-i*3}개</b></span>`).join('')}</div><small>동률은 같은 순위 · 예: 공동 1등 50개, 다음 3등 44개</small></details><div class="wb-actions"><button class="wb-primary" data-action="create" ${!unlockedAt?'disabled':''}>방 만들기</button><button data-action="refresh" >새로고침</button></div><div class="wb-room-list">${lobbyRooms.length?lobbyRooms.map(r=>`<div class="wb-room-row"><span>${esc(r.host)}의 방<br><small>${r.count} / 10명</small></span><button data-action="join" data-room="${esc(r.id)}" ${r.count>=10?'disabled':''}>${remaining?'참가':'보상 없이 참가'}</button></div>`).join(''):'<div class="wb-empty">대기 중인 방이 없습니다.<br>방을 만들고 혼자 시작할 수도 있어요.</div>'}</div><details><summary>전투 규칙</summary><ul class="wb-rule-list"><li>최대 체력 = 시작 시 공격력. 보스 피해는 고정 수치입니다.</li><li>이동 중에도 자동공격, 초당 최대 1회 공격. 꾹 누르면 연속 이동합니다.</li><li>PC W 위 · A 왼쪽 · S 아래 · D 오른쪽</li><li>묘비 위에서 3초 대기하면 체력 30%로 부활합니다. 부활 횟수 제한 없음.</li><li>부활 돕는 중에도 공격 가능. 맞아도 게이지는 유지됩니다.</li><li>7분 제한 · 전원 사망 시 실패 · 퇴장/실패 횟수 미차감</li><li>보상 가능 횟수 안에서 클리어한 참가자 전원에게 비취큐브 2개를 지급합니다. 사망·기여도 0도 지급 대상입니다.</li><li>정수는 기여도 1등 50개부터 순위마다 3개씩 감소합니다. 동률은 같은 순위입니다. 퇴장자는 제외되며 주 3회 보상 이후에는 보상 없이 참가합니다.</li></ul></details>`);
  $('wb-footer').textContent=(busy?actionLabels[busyAction]:'')||errorText||'1~10명 · 참가 공격력 제한 없음 · 보스 체력 4,200,000';
 }
 function renderWaiting(){
  const me=mine(),host=room.host===userId;const canStart=room.members.filter(m=>m.present&&m.id!==userId).every(m=>m.ready);
  lobbyHtml(`<div class="wb-cover"><strong>출정 준비</strong></div><div class="wb-quota">${remaining?`이번 주 보상 ${remaining}회 남음`:'보상 없이 참가 중'} · ${room.members.filter(m=>m.present).length}/10명</div><p class="wb-copy">${host?'모두 준비하면 시작할 수 있습니다. 혼자도 시작 가능합니다.':'준비 완료 후 방장의 시작을 기다려 주세요.'}<br>최대 체력과 외형은 시작 시 고정됩니다.</p><div>${room.members.filter(m=>m.present).map(m=>`<div class="wb-wait-member"><b>${esc(m.name)} ${m.id===room.host?'♛':''} ${m.id===userId?'(나)':''}</b><small>공격력 ${number(m.maxHp)}</small><span class="${m.ready?'wb-ready':'wb-not-ready'}">${m.ready?'준비 완료':'준비 중'}</span></div>`).join('')}</div><div class="wb-actions">${host?`<button class="wb-primary" data-action="start" ${!canStart?'disabled':''}>${room.members.filter(m=>m.present).length===1?'혼자 시작':'전투 시작'}</button>`:`<button class="wb-primary" data-action="ready" >${me.ready?'준비 취소':'준비 완료'}</button>`}</div>`);
  $('wb-footer').textContent=(busy?actionLabels[busyAction]:'')||errorText||'연결이 끊긴 방장은 먼저 참가한 플레이어에게 위임됩니다.';
 }
 function updateHud(){
  if(!room)return;const me=mine();const t=now();
  $('wb-contribution-rate').textContent=M.contribution(me,room).toFixed(1)+'%';$('wb-contribution-damage').textContent='누적 '+number(me?.damage);$('wb-contribution').classList.toggle('wb-stale',Date.now()-lastGood>2000);$('wb-contribution').title=Date.now()-lastGood>2000?'연결 복구 중 · 마지막 확인 기록':'전체 참가자 누적 데미지 중 내 비율';const rest=M.clamp(Math.ceil((room.startedAt+M.LIMIT_MS-t)/1000),0,420);
  $('wb-time').textContent=String(Math.floor(rest/60)).padStart(2,'0')+':'+String(rest%60).padStart(2,'0');
  $('wb-boss-fill').style.width=M.clamp(room.hp/room.maxHp*100,0,100)+'%';$('wb-boss-hp').textContent=number(room.hp)+' / '+number(room.maxHp);
  for(const row of $('wb-party').children){const m=room.members.find(m=>m.id===row.dataset.id);if(!m)continue;const pct=Math.ceil(m.hp/m.maxHp*100);row.dataset.dead=String(!m.hp);row.querySelector('i').style.width=pct+'%';row.querySelector('.wb-party-percent').textContent=!m.present?'퇴장':!m.hp?'†':pct+'%';}
  const p=M.patterns[(room.pattern||1)-1];$('wb-pattern').innerHTML=`<strong>${room.pattern||'–'} / 11 · ${p[0]}</strong><br>${p[2]} · 고정 피해 ${p[1]}`;
  $('wb-footer').textContent=(busy?actionLabels[busyAction]:'')||errorText||(Date.now()-lastGood>2000?'연결 복구 중 · 공격 중지':`이동 중에도 자동공격 · 초당 최대 1회 · 부활 횟수 제한 없음 · 기여도 ${M.contribution(me,room).toFixed(1)}%${network==='polling'?' · 연결 지연':''}`);
  $('wb-countdown').textContent=t<room.startedAt?Math.ceil((room.startedAt-t)/1000):'';
 }
 async function doAction(action,args={},id=room?.id){
  if(!open||busy)return;const epoch=screenEpoch;busy=true;busyAction=action;actionUi();clearInput();
  try{if(action==='create'||action==='join')await window.RinguSession?.flush();if(!open||epoch!==screenEpoch)return;await request(action,args,id);if(action==='ack'||action==='leave')closeLocal();}
  catch(e){if(open&&epoch===screenEpoch&&e.message!=='WB_CLOSED')toast(friendly(e));}
  finally{if(epoch===screenEpoch){busy=false;busyAction='';if(open){actionUi();if(!room)renderLobby();else if(room.status==='waiting')renderWaiting();else updateHud();}}}
 }
 function move(key){
  const me=mine(),t=now();if(!open||busy||!$('wb-overlay').hidden||room?.status!=='running'||!me?.hp||document.hidden||t<room.startedAt||Date.now()-lastGood>2000||t-lastMove<M.MOVE_MS)return;
  if(predictedHp()<=0){clearInput();return;}
  const p=moves.at(-1)||origin,d=M.destination(p.x,p.y,key);if(!d){queuedKey=null;return;}
  moves.push({...d,seq:++seq,at:t});queuedKey=null;lastMove=t;scheduleSync(40);
 }
 function scheduleSync(delay=120){if(urgentTimer)return;urgentTimer=setTimeout(()=>{urgentTimer=null;sync();},delay);}
 async function sync(){
  if(!open||flight||busy)return;
  if(!room){if(document.hidden)return;const epoch=screenEpoch;flight=true;try{await request('list',{},null);}catch(e){if(open&&epoch===screenEpoch&&e.message!=='WB_CLOSED')toast(friendly(e));}finally{if(epoch===screenEpoch)flight=false;}return;}
  if(!['waiting','running'].includes(room.status))return;
  flight=true;const epoch=screenEpoch;
  if(!pending)pending={packet:++packet,moves:moves.filter(m=>m.seq>(mine()?.seq||0)).map(m=>({...m})),events:[...reports.values()],background:document.hidden};
  const sent=pending,roomId=room.id;
  try{await request('sync',sent,roomId);
   if(room?.id===roomId){for(const e of sent.events){reports.delete(e.id);resolved.add(e.id);}pending=null;}
  }catch(e){if(!open||epoch!==screenEpoch||e.message==='WB_CLOSED')return;toast(friendly(e));
   if(e.message==='INVALID_MOVE'){moves=[];origin={x:mine()?.x||0,y:mine()?.y||0};seq=mine()?.seq||0;pending=null;lastMove=now();}
   if(e.message==='ROOM_LEFT'){room=null;pending=null;render();}
   if(e.status===401){closeLocal();g?.fn.toast?.(friendly(e));}
  }finally{if(epoch===screenEpoch)flight=false;}
 }
 function predictedHp(){const me=mine();if(!me)return 0;let hp=Number(me.hp);for(const r of reports.values())hp-=r.localDamage||0;return Math.max(0,hp);}
 function board(w){if(boardCache&&boardSize===w)return boardCache;boardSize=w;boardCache=document.createElement('canvas');boardCache.width=boardCache.height=w;const c=boardCache.getContext('2d'),s=w/8;c.fillStyle='#171615';c.fillRect(0,0,w,w);if(assets.arena.complete&&assets.arena.naturalWidth){c.drawImage(assets.arena,0,0,w,w);return boardCache;}
  for(let y=0;y<8;y++)for(let x=0;x<8;x++){const grad=c.createLinearGradient(x*s,y*s,(x+1)*s,(y+1)*s);grad.addColorStop(0,(x+y)%2?'#243443':'#2b3b49');grad.addColorStop(1,'#101d29');c.fillStyle=grad;c.fillRect(x*s+1,y*s+1,s-2,s-2);c.strokeStyle='#485969';c.lineWidth=1;c.strokeRect(x*s+1.5,y*s+1.5,s-3,s-3);c.strokeStyle='#ffffff08';c.beginPath();c.moveTo(x*s+s*.12,y*s+s*.2);c.lineTo(x*s+s*.6,y*s+s*.5);c.lineTo(x*s+s*.8,y*s+s*.9);c.stroke();}return boardCache;
 }
 function sprite(m,size,local){const index=m.costume==='kael'?2:m.costume==='serin'?3:m.gender==='female'?1:0,key=index+':'+size;if(spriteCache.has(key))return spriteCache.get(key);const im=assets.heroes;if(!im.complete||!im.naturalWidth)return null;const c=document.createElement('canvas');c.width=size;c.height=Math.round(size*1.5);c.getContext('2d').drawImage(im,index*im.width/4,0,im.width/4,im.height,0,0,c.width,c.height);spriteCache.set(key,c);return c;}
 function drawShots(c,t,s,target){
  const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
  for(let i=shots.length-1;i>=0;i--){const h=shots[i],age=t-h.at;if(age>1400){shots.splice(i,1);continue;}const m=room.members.find(m=>m.id===h.member);if(!m)continue;
   if(!h.start){const p=m.id===userId?M.interpolate(origin,moves,t):m;h.start={x:(p.x+.5)*s,y:(p.y+.4)*s};}
   if(m.id===userId&&!h.swingSound){h.swingSound=true;window.RinguAudio?.effect('raid-swing');}if(m.id===userId&&age>=360&&!h.hitSound){h.hitSound=true;window.RinguAudio?.effect(h.crit?'raid-critical':'raid-hit');}
   const hit=age-360,color=h.crit?'#ffc452':'#8feaff',local=m.id===userId;c.save();c.lineCap='round';
   if(hit<0){const q=M.clamp(age/360,0,1),x=h.start.x+(target.x-h.start.x)*q,y=h.start.y+(target.y-h.start.y)*q;c.translate(x,y);c.rotate(Math.atan2(target.y-h.start.y,target.x-h.start.x)+Math.PI/2);c.globalCompositeOperation='lighter';c.shadowColor=color;c.shadowBlur=18;c.fillStyle=color;c.beginPath();c.moveTo(-s*.48,s*.2);c.quadraticCurveTo(0,-s*.6,s*.48,s*.2);c.quadraticCurveTo(0,-s*.28,-s*.48,s*.2);c.fill();c.strokeStyle=color;c.lineWidth=h.crit?6:4;c.beginPath();c.moveTo(-s*.38,s*.16);c.quadraticCurveTo(0,-s*.52,s*.38,s*.16);c.stroke();c.shadowBlur=5;c.strokeStyle='#fff';c.lineWidth=2;c.stroke();c.globalAlpha=.3;c.beginPath();c.moveTo(-s*.25,s*.36);c.quadraticCurveTo(0,-s*.2,s*.25,s*.36);c.stroke();}
   else{const alpha=M.clamp(1-hit/1040,0,1);c.translate(target.x,target.y);if(hit<260&&!reduced){c.globalCompositeOperation='lighter';c.strokeStyle=color;c.lineWidth=h.crit?4:2;c.shadowColor=color;c.shadowBlur=16;for(let j=0;j<8;j++){const angle=j*Math.PI/4+.2;const r=s*(.15+hit/230);c.beginPath();c.moveTo(Math.cos(angle)*r*.2,Math.sin(angle)*r*.2);c.lineTo(Math.cos(angle)*r,Math.sin(angle)*r);c.stroke();}c.fillStyle='#fff';c.globalAlpha=(1-hit/260)*.75;c.beginPath();c.arc(0,0,s*.26,0,Math.PI*2);c.fill();}
    c.globalCompositeOperation='source-over';c.globalAlpha=alpha;const lane=room.members.indexOf(m);c.translate(local?0:(lane%5-2)*s*1.15,(local?-s*.5:Math.floor(lane/5)*s*.45)-Math.min(55,hit*.06));c.textAlign='center';c.font='900 '+Math.round(s*(local?(h.crit?.52:.4):(h.crit?.3:.26)))+'px system-ui';c.lineWidth=4;c.strokeStyle='#1b100b';const text=(h.crit?'CRITICAL! ':'')+number(h.damage);c.strokeText(text,0,0);c.fillStyle=h.crit?'#ffda69':'#fff7dc';c.fillText(text,0,0);
   }c.restore();
  }
 }
 function paint(time){
  frameId=0;if(!open||document.hidden||!room||room.status==='waiting')return;frameId=requestAnimationFrame(paint);
  const budget=matchMedia('(max-width:700px)').matches?33:16;if(time-lastFrame<budget)return;lastFrame=time;pumpInput();
  const canvas=$('wb-arena'),rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,1.5),w=Math.round(rect.width*dpr);if(!w)return;if(canvas.width!==w){canvas.width=canvas.height=w;boardCache=null;}
  let c=canvas.getContext('2d');c.clearRect(0,0,w,w);c.fillStyle='#171615';c.fillRect(0,0,w,w);c.drawImage(board(w),0,0);const s=w/8,t=now(),me=mine();
  for(const wave of room.waves||[]){
   if(t<wave.showAt)continue;if(!seen.has(wave.id))seen.set(wave.id,t);
   if(t>=wave.hitAt&&!resolved.has(wave.id)&&!reports.has(wave.id)&&me?.hp>0){const p=M.positionAt(origin,moves,wave.hitAt),seenAt=seen.get(wave.id);const localDamage=M.hitDamage(wave,p,seenAt);reports.set(wave.id,{id:wave.id,seenAt,localDamage});if(localDamage>0)hurtSound();scheduleSync(80);}
   const impact=t-wave.hitAt;if(impact>220)continue;
   const progress=M.clamp((t-wave.showAt)/(wave.hitAt-wave.showAt),0,1);
   for(const tile of wave.tiles){const x=(tile%8+.5)*s,y=(Math.floor(tile/8)+.5)*s;
    if(assets.fx.complete&&assets.fx.naturalWidth){c.save();c.globalCompositeOperation='screen';c.globalAlpha=impact>=0?Math.max(0,1-impact/240):.65+.35*progress;const col=impact>=0?1:0,row=impact>=0&&wave.damage>=900?1:0,im=assets.fx,sw=im.width/2,sh=im.height/2;c.drawImage(im,col*sw,row*sh,sw,sh,x-s*.5,y-s*.5,s,s);c.restore();}
    else{c.beginPath();c.arc(x,y,s*.43,0,Math.PI*2);c.fillStyle='#df283a38';c.fill();c.strokeStyle='#ff4a5d';c.lineWidth=1.5*dpr;c.stroke();}
   }
  }
  const fx=$('wb-fx'),fr=fx.getBoundingClientRect(),scale=w/rect.width;const fw=Math.round(fr.width*scale),fh=Math.round(fr.height*scale);if(fx.width!==fw||fx.height!==fh){fx.width=fw;fx.height=fh;}c=fx.getContext('2d');c.clearRect(0,0,fw,fh);c.save();c.translate((rect.left-fr.left)*scale,(rect.top-fr.top)*scale);const boss=root.querySelector('.wb-boss').getBoundingClientRect();const target={x:(boss.left+boss.width*.53-rect.left)*scale,y:(boss.top+boss.height*.56-rect.top)*scale};
  const occupied=new Map();for(const m of room.members.filter(m=>m.present)){const tile=m.x+8*m.y;occupied.set(tile,(occupied.get(tile)||0)+1);}const indexAt=new Map();
  for(const m of room.members.filter(m=>m.present)){
   const local=m.id===userId;let p=local?M.interpolate(origin,moves,t):{x:m.x,y:m.y};if(!local){const remote=remotePositions.get(m.id);if(remote){const a=M.clamp((t-remote.at)/140,0,1);p={x:remote.fromX+(remote.x-remote.fromX)*a,y:remote.fromY+(remote.y-remote.fromY)*a};}}
   const tile=m.x+8*m.y,n=occupied.get(tile),i=indexAt.get(tile)||0;indexAt.set(tile,i+1);const offset=n>1?(i-(n-1)/2)*Math.min(s*.13,s*.7/n):0,x=(p.x+.5)*s+offset,y=(p.y+.86)*s,hp=local?predictedHp():m.hp;
   if(hp<=0){if(assets.tomb.complete&&assets.tomb.naturalWidth){c.save();c.globalAlpha=1;c.drawImage(assets.tomb,x-s*.45,y-s*.9,s*.9,s*.9);c.restore();}else{c.fillStyle='#807b70';c.fillRect(x-s*.18,y-s*.5,s*.36,s*.5);}
    const progress=M.reviveProgress(m,room.members,t);if(progress>0){c.fillStyle='#071c25';c.fillRect(x-s*.42,y+2,s*.84,s*.09);c.fillStyle='#63d7ef';c.fillRect(x-s*.42,y+2,s*.84*progress,s*.09);c.fillStyle='#def9ff';c.font=`${Math.max(8,7*dpr)}px sans-serif`;c.textAlign='center';c.fillText((progress*3).toFixed(1)+'/3초',x,y-s*.6);}continue;
   }
   c.fillStyle=local?'#82e5c344':'#0008';c.beginPath();c.ellipse(x,y-s*.02,s*.27,s*.1,0,0,Math.PI*2);c.fill();
   const img=sprite(m,Math.round(s*.87),local);if(img)c.drawImage(img,x-img.width/2,y-img.height);else{c.fillStyle=local?'#61e18a':'#bac6cf';c.fillRect(x-s*.12,y-s*.7,s*.24,s*.65);}
   const hpY=y-s*1.3;c.fillStyle='#050b12';c.fillRect(x-s*.27,hpY,s*.54,s*.08);c.fillStyle=local?'#39f576':'#72b8ef';c.fillRect(x-s*.26,hpY+s*.01,s*.52*M.clamp(hp/m.maxHp,0,1),s*.06);
  }
  drawShots(c,t,s,target);c.restore();
  if(Math.floor(time/200)!==Math.floor((time-budget)/200))updateHud();
 }
 function dialog(html){clearInput();$('wb-overlay').innerHTML=`<div class="wb-dialog" role="alertdialog" aria-modal="true">${html}</div>`;$('wb-overlay').hidden=false;$('wb-overlay').querySelector('button')?.focus();actionUi();}
 function hideDialog(){$('wb-overlay').hidden=true;$('wb-overlay').innerHTML='';$('wb-exit').focus();}
 function confirmExit(){if(!room||!['waiting','running'].includes(room.status))return room?ack():closeLocal();dialog('<h3>전장에서 나갈까요?</h3><p>나가면 이 전투의 보상을 받지 못합니다.<br>남은 보상 횟수는 차감되지 않습니다.</p><div class="wb-actions"><button data-action="cancel">계속하기</button><button data-action="leave-confirm">나가기</button></div>');}
 function leave(){return doAction('leave');}
 async function ack(){if(!room){closeLocal();return;}await doAction('ack');if(!open)void window.RinguEconomy?.sync();}
 function showResult(){if(!room||$('wb-overlay').dataset.result===room.id)return;$('wb-overlay').dataset.result=room.id;const me=mine(),won=room.status==='won',reward=me?.rewardDetail;
  const rewardText=won?(reward?'<strong>기여도 '+reward.rank+'등 · 클리어 보상</strong><br>정수 <b>'+number(reward.essence)+'개</b> · 비취큐브 <b>'+number(reward.jadeCube)+'개</b><br><small>우편함에 도착했습니다. 우편함에서 받아 주세요.</small>':me?.reward==='pending'?'보상 우편 처리 중 · 기록은 보관되어 있습니다.':'이번 전투는 보상 없이 참가했습니다.'):'보상 횟수는 차감되지 않았습니다.';
  const rows=[...room.members].sort((a,b)=>b.damage-a.damage).map(m=>'<div><span>'+(m.rewardDetail?m.rewardDetail.rank+'등 · ':'')+esc(m.name)+(m.present?'':' (퇴장)')+'</span><span>'+number(m.damage)+' · '+M.contribution(m,room).toFixed(1)+'%'+(m.rewardDetail?'<small class="wb-earned">정수 '+number(m.rewardDetail.essence)+' · 비취큐브 '+number(m.rewardDetail.jadeCube)+'</small>':'')+'</span></div>').join('');
  dialog('<h3>'+(won?'토벌 성공':'토벌 실패')+'</h3><p>'+esc(room.reason||'전투 종료')+' · '+Math.max(0,Math.floor(((room.endedAt||now())-room.startedAt)/1000))+'초<br>보스 남은 체력 '+number(room.hp)+'</p><div class="wb-quota">'+rewardText+'</div><div class="wb-result-list">'+rows+'</div><div class="wb-actions"><button class="wb-primary" data-action="ack">'+(won&&(reward||me?.reward==='pending')?'보상 확인':'확인')+'</button></div>');
 }
 async function openWorldBoss(){if(open)return;if(!window.RinguSession?.active)return g?.fn.toast?.('로그인이 필요합니다.');if(g.activeDungeon||g.activeTower||g.state?.serverBattle)return g.fn.toast?.('진행 중인 전투를 먼저 종료해 주세요.');
  shell();if(!assets.heroes.src)assets.heroes.src=assetBase+'heroes-back-v3.png';if(!assets.arena.src)assets.arena.src=assetBase+'arena-v2.webp';if(!assets.fx.src)assets.fx.src=assetBase+'fx-v2.webp';if(!assets.tomb.src)assets.tomb.src=assetBase+'tomb-v2.webp';previousFocus=document.activeElement;screenEpoch++;busy=false;busyAction='';flight=false;deferredLobby=null;lobbyPointer=null;open=true;root.hidden=false;document.body.classList.add('wb-open');room=null;pending=null;bestRtt=Infinity;lastGood=0;hideDialog();renderLobby();await sync();if(!open)return;clearInterval(syncTimer);syncTimer=setInterval(sync,1000);$('wb-exit').focus();
 }
 function closeLocal(){open=false;screenEpoch++;busy=false;busyAction='';flight=false;lobbyPointer=null;deferredLobby=null;actionUi();clearInterval(syncTimer);clearTimeout(urgentTimer);urgentTimer=null;cancelAnimationFrame(frameId);frameId=0;unsubscribe?.();unsubscribe=null;channelRoom=null;room=null;pending=null;moves=[];reports.clear();seen.clear();resolved.clear();clearInput();shots.length=0;hitSeen.clear();if(root){root.hidden=true;$('wb-overlay').dataset.result='';}document.body.classList.remove('wb-open');window.RinguPortrait?.showPage('hunt');previousFocus?.focus();}
 function install(core){if(g)return;g=core;shell();const button=document.createElement('button');button.textContent='주간보스';button.dataset.uiIcon='🐲';button.id='worldBossQuick';button.type='button';button.onclick=openWorldBoss;(document.querySelector('#rmFeatureNav nav')||document.querySelector('.main-quick'))?.append(button);
  const old=core.fn.attack;core.fn.attack=(...a)=>open?false:old(...a);window.RinguSession?.onEnded(closeLocal);
 }
 window.RinguWorldBoss={open:openWorldBoss,get isBattleVisible(){return open;}};
 window.addEventListener('ringu-ready',()=>install(window.RinguCore),{once:true});if(window.RinguCore&&window.RinguSession?.active)install(window.RinguCore);
})();
