/* WB1 scene. One cached Canvas board, static equipped heroes, bounded effects.
 * No attack/HP/reward values are accepted from the browser by the server.
 */
(()=>{'use strict';
 const M=window.RinguWorldBossModel;if(!M)return;
 let g,root,room=null,userId=null,remaining=3,unlockedAt=null,open=false,busy=false,flight=false,pending=null;
 let origin={x:0,y:6},moves=[],seq=0,packet=0,serverOffset=0,bestRtt=Infinity,lastGood=0,frameId=0,lastFrame=0;
 let syncTimer,urgentTimer,unsubscribe,channelRoom=null,network='connecting',errorText='',lobbyRooms=[];
 const seen=new Map(),reports=new Map(),resolved=new Set(),spriteCache=new Map(),remotePositions=new Map();
 let boardCache=null,boardSize=0,previousFocus=null,activePointers=new Map(),keys=new Set(),lastMove=-Infinity;
 const assetBase=new URL('art/world-boss/',document.currentScript.src).href;
 const assets={heroes:new Image()};assets.heroes.onload=()=>spriteCache.clear();
 const $=id=>document.getElementById(id),now=()=>Date.now()+serverOffset;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const number=n=>Math.floor(Number(n)||0).toLocaleString('ko-KR');
 const mine=()=>room?.members.find(m=>m.id===userId);
 const errors={WORLD_BOSS_LOCKED:'랭킹 공격력 합계 8,000 달성 시 해금됩니다.',ROOM_FULL:'방이 가득 찼습니다.',ROOM_NOT_WAITING:'이미 시작했거나 종료된 방입니다.',ROOM_FORBIDDEN:'참가 중인 방만 볼 수 있습니다.',HOST_ONLY:'방장만 시작할 수 있습니다.',MEMBERS_NOT_READY:'다른 참가자의 준비 완료를 기다려 주세요.',BATTLE_IN_PROGRESS:'진행 중인 전투를 먼저 종료해 주세요.',ROOM_LEFT:'방에서 퇴장했습니다. 다시 참가해 주세요.',INVALID_MOVE:'연결 지연으로 위치를 다시 맞추고 있습니다.'};
 const friendly=e=>errors[e.message]||(/SESSION_|LOGIN_REQUIRED/.test(e.message)?'로그인 세션이 종료되었습니다. 다시 로그인해 주세요.':'연결을 확인하고 다시 시도해 주세요.');
 function toast(text){errorText=text;if($('wb-footer'))$('wb-footer').textContent=text;}
 async function request(action,args={},id=room?.id){
  const started=Date.now();const res=await fetch('/api/world-boss',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,room:id||null,args}),signal:AbortSignal.timeout(7000)});
  const data=await res.json();if(!res.ok)throw Object.assign(new Error(data.error||'SERVER_ERROR'),{status:res.status});
  const rtt=Date.now()-started;if(rtt<bestRtt+100){serverOffset=data.serverNow-(started+rtt/2);bestRtt=Math.min(bestRtt,rtt);}
  lastGood=Date.now();errorText='';accept(data);return data;
 }
 function accept(data){
  if(!open)return;
  if(data.userId)userId=data.userId;if(data.remaining!==undefined)remaining=data.remaining;if(data.unlockedAt!==undefined)unlockedAt=data.unlockedAt;
  if(data.rooms)lobbyRooms=data.rooms;
  const next=data.room;
  if(next&&room?.id===next.id&&next.version<room.version)return;
  const previous=room;room=next||null;
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
  root=document.createElement('section');root.id='wb-screen';root.hidden=true;root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','월드보스');
  const pad=side=>`<div class="wb-pad" aria-label="${side} 방향키">${[['w','▲','위'],['a','◀','왼쪽'],['d','▶','오른쪽'],['s','▼','아래']].map(([key,icon,label])=>`<button type="button" data-key="${key}" aria-label="${side} ${label} 한 칸 이동">${icon}</button>`).join('')}</div>`;
  root.innerHTML=`<div class="wb-shell"><header class="wb-header"><div><small>WORLD BOSS · 1단계</small><h2>월드보스 · ooo</h2></div><time id="wb-time">07:00</time><button id="wb-exit" type="button">나가기</button></header><div id="wb-lobby" class="wb-lobby"></div><div id="wb-battle" class="wb-battle" hidden><div class="wb-boss"><div class="wb-bossbar" role="progressbar" aria-label="보스 체력"><i id="wb-boss-fill"></i><span id="wb-boss-hp"></span></div><div id="wb-party" class="wb-party" aria-label="참가자 체력"></div><div id="wb-pattern" class="wb-pattern-label"></div></div><div class="wb-arena-wrap"><canvas id="wb-arena" class="wb-arena" aria-label="8 곱하기 8 전투 타일, WASD 또는 양쪽 방향키로 이동"></canvas><div id="wb-countdown" class="wb-countdown"></div></div><div class="wb-controls">${pad('왼손')}<div class="wb-control-copy"><strong>정지 시 자동공격</strong>이동 중 공격 중지<br>길게 눌러도 한 칸<br><br>PC · W A S D</div>${pad('오른손')}</div></div><footer id="wb-footer" class="wb-footer" role="status"></footer></div><div id="wb-overlay" class="wb-overlay" hidden></div>`;
  document.body.append(root);
  $('wb-exit').onclick=confirmExit;
  root.addEventListener('click',e=>{const button=e.target.closest('[data-action]');if(!button)return;const action=button.dataset.action;
   if(action==='create')doAction('create');else if(action==='join')doAction('join',{},button.dataset.room);else if(action==='ready')doAction('ready',{ready:!mine()?.ready});else if(action==='start')doAction('start');else if(action==='refresh')doAction('list',{},null);else if(action==='leave-confirm')leave();else if(action==='cancel')hideDialog();else if(action==='ack')ack();});
  root.addEventListener('pointerdown',e=>{const button=e.target.closest('[data-key]');if(!button)return;e.preventDefault();button.setPointerCapture?.(e.pointerId);activePointers.set(e.pointerId,button.dataset.key);button.classList.add('wb-pressed');
   const key=button.dataset.key;queueMicrotask(()=>{const active=[...activePointers.values()];if(active.filter(k=>k===key).length===1&&!active.includes({w:'s',s:'w',a:'d',d:'a'}[key]))move(key);});});
  const release=e=>{activePointers.delete(e.pointerId);root.querySelectorAll('.wb-pressed').forEach(b=>b.classList.remove('wb-pressed'));};root.addEventListener('pointerup',release);root.addEventListener('pointercancel',release);
  window.addEventListener('keydown',e=>{if(!open||room?.status!=='running'||e.target.closest?.('input,textarea,select,[contenteditable="true"]'))return;const key=e.key.toLowerCase();if(!M.directions[key])return;e.preventDefault();if(e.repeat||keys.has(key))return;keys.add(key);queueMicrotask(()=>{if(!keys.has({w:'s',s:'w',a:'d',d:'a'}[key]))move(key);});});
  window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur',()=>{keys.clear();activePointers.clear();});
  document.addEventListener('visibilitychange',()=>{if(!open)return;if(document.hidden){keys.clear();activePointers.clear();cancelAnimationFrame(frameId);frameId=0;sync();}else{lastGood=0;sync();if(room?.status==='running'&&!frameId)frameId=requestAnimationFrame(paint);}});
  root.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();confirmExit();}if(e.key==='Tab'){const focus=[...root.querySelectorAll('button:not(:disabled)')].filter(b=>b.getClientRects().length);const first=focus[0],last=focus.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}});
 }
 function render(){
  const battle=room&&room.status!=='waiting';$('wb-lobby').hidden=!!battle;$('wb-battle').hidden=!battle;
  if(battle){$('wb-party').innerHTML=room.members.map(m=>`<div class="wb-party-row" data-id="${esc(m.id)}" data-me="${m.id===userId}"><span class="wb-party-name">${esc(m.id===userId?'나 · '+m.name:m.name)}</span><span class="wb-party-track"><i></i></span><span class="wb-party-percent"></span></div>`).join('');updateHud();}
  else if(room)renderWaiting();else renderLobby();
 }
 function renderLobby(){
  $('wb-lobby').innerHTML=`<div class="wb-cover"><strong>ooo <small>· 1단계</small></strong></div><p class="wb-copy">거대한 보스를 마주한 8×8 전장. 멈추면 공격하고, 움직여서 살아남으세요.</p><div class="wb-quota">이번 주 보상 가능 <b>${remaining} / 3회</b> · 월요일 00:00 초기화 (한국 시간)<br><small>${remaining?'클리어할 때만 1회 차감 · 보상 내용 준비 중':'보상 없이 참가 가능 · 혼자서도 시작 가능'}</small></div>${unlockedAt?'':'<p class="wb-status">잠김 · 랭킹 플레이어 공격력 합계가 최초 8,000 이상이면 영구 해금됩니다.</p>'}<div class="wb-actions"><button class="wb-primary" data-action="create" ${!unlockedAt||busy?'disabled':''}>방 만들기</button><button data-action="refresh" ${busy?'disabled':''}>새로고침</button></div><div class="wb-room-list">${lobbyRooms.length?lobbyRooms.map(r=>`<div class="wb-room-row"><span>${esc(r.host)}의 방<br><small>${r.count} / 10명</small></span><button data-action="join" data-room="${esc(r.id)}" ${r.count>=10||busy?'disabled':''}>${remaining?'참가':'보상 없이 참가'}</button></div>`).join(''):'<div class="wb-empty">대기 중인 방이 없습니다.<br>방을 만들고 혼자 시작할 수도 있어요.</div>'}</div><details><summary>전투 규칙</summary><ul class="wb-rule-list"><li>최대 체력 = 시작 시 공격력. 보스 피해는 고정 수치입니다.</li><li>정지 시 자동공격, 이동 중 공격 중지. 길게 눌러도 한 칸만 이동합니다.</li><li>PC W 위 · A 왼쪽 · S 아래 · D 오른쪽</li><li>묘비 위에서 3초 대기하면 체력 30%로 부활합니다. 인당 부활 1회.</li><li>부활 돕는 중에도 공격 가능. 맞아도 게이지는 유지됩니다.</li><li>7분 제한 · 전원 사망 시 실패 · 퇴장/실패 횟수 미차감</li><li>보상 횟수 0회도 참가 가능. 클리어 보상은 내용 확정 전까지 지급 대기로 기록됩니다.</li></ul></details>`;
  $('wb-footer').textContent=errorText||'1~10명 · 참가 공격력 제한 없음 · 보스 체력 4,200,000';
 }
 function renderWaiting(){
  const me=mine(),host=room.host===userId;const canStart=room.members.filter(m=>m.present&&m.id!==userId).every(m=>m.ready);
  $('wb-lobby').innerHTML=`<div class="wb-cover"><strong>출정 준비</strong></div><div class="wb-quota">${remaining?`이번 주 보상 ${remaining}회 남음`:'보상 없이 참가 중'} · ${room.members.filter(m=>m.present).length}/10명</div><p class="wb-copy">${host?'모두 준비하면 시작할 수 있습니다. 혼자도 시작 가능합니다.':'준비 완료 후 방장의 시작을 기다려 주세요.'}<br>최대 체력과 외형은 시작 시 고정됩니다.</p><div>${room.members.filter(m=>m.present).map(m=>`<div class="wb-wait-member"><b>${esc(m.name)} ${m.id===room.host?'♛':''} ${m.id===userId?'(나)':''}</b><small>공격력 ${number(m.maxHp)}</small><span class="${m.ready?'wb-ready':'wb-not-ready'}">${m.ready?'준비 완료':'준비 중'}</span></div>`).join('')}</div><div class="wb-actions">${host?`<button class="wb-primary" data-action="start" ${busy||!canStart?'disabled':''}>${room.members.filter(m=>m.present).length===1?'혼자 시작':'전투 시작'}</button>`:`<button class="wb-primary" data-action="ready" ${busy?'disabled':''}>${me.ready?'준비 취소':'준비 완료'}</button>`}</div>`;
  $('wb-footer').textContent=errorText||'연결이 끊긴 방장은 먼저 참가한 플레이어에게 위임됩니다.';
 }
 function updateHud(){
  if(!room)return;const me=mine();const t=now();const rest=M.clamp(Math.ceil((room.startedAt+M.LIMIT_MS-t)/1000),0,420);
  $('wb-time').textContent=String(Math.floor(rest/60)).padStart(2,'0')+':'+String(rest%60).padStart(2,'0');
  $('wb-boss-fill').style.width=M.clamp(room.hp/room.maxHp*100,0,100)+'%';$('wb-boss-hp').textContent=number(room.hp)+' / '+number(room.maxHp);
  for(const row of $('wb-party').children){const m=room.members.find(m=>m.id===row.dataset.id);if(!m)continue;const pct=Math.ceil(m.hp/m.maxHp*100);row.dataset.dead=String(!m.hp);row.querySelector('i').style.width=pct+'%';row.querySelector('.wb-party-percent').textContent=!m.present?'퇴장':!m.hp?'†':pct+'%';}
  const p=M.patterns[(room.pattern||1)-1];$('wb-pattern').innerHTML=`<strong>${room.pattern||'–'} / 11 · ${p[0]}</strong><br>${p[2]} · 고정 피해 ${p[1]}`;
  $('wb-footer').textContent=errorText||(Date.now()-lastGood>2000?'연결 복구 중 · 공격 중지':`정지 시 자동공격 · 이동 중 중지 · 부활 ${me?.revived?'1':'0'}/1 · 기여도 ${M.contribution(me,room).toFixed(1)}%${network==='polling'?' · 연결 지연':''}`);
  $('wb-countdown').textContent=t<room.startedAt?Math.ceil((room.startedAt-t)/1000):'';
 }
 async function doAction(action,args={},id=room?.id){if(busy||flight)return;busy=true;try{if(action==='create'||action==='join')await window.RinguSession?.flush();await request(action,args,id);}catch(e){toast(friendly(e));}finally{busy=false;if(!room)renderLobby();else if(room.status==='waiting')renderWaiting();}}
 function move(key){
  const me=mine(),t=now();if(!open||!$('wb-overlay').hidden||room?.status!=='running'||!me?.hp||document.hidden||t<room.startedAt||Date.now()-lastGood>2000||t-lastMove<M.MOVE_MS)return;
  if(predictedHp()<=0)return;
  const p=moves.at(-1)||origin,d=M.destination(p.x,p.y,key);if(!d)return;
  moves.push({...d,seq:++seq,at:t});lastMove=t;scheduleSync(40);
 }
 function scheduleSync(delay=120){if(urgentTimer)return;urgentTimer=setTimeout(()=>{urgentTimer=null;sync();},delay);}
 async function sync(){
  if(!open||flight||busy)return;
  if(!room){if(!document.hidden)await doAction('list',{},null);return;}
  if(!['waiting','running'].includes(room.status))return;
  flight=true;
  if(!pending)pending={packet:++packet,moves:moves.filter(m=>m.seq>(mine()?.seq||0)).map(m=>({...m})),events:[...reports.values()],background:document.hidden};
  const sent=pending,roomId=room.id;
  try{await request('sync',sent,roomId);
   if(room?.id===roomId){for(const e of sent.events){reports.delete(e.id);resolved.add(e.id);}pending=null;}
  }catch(e){toast(friendly(e));
   if(e.message==='INVALID_MOVE'){moves=[];origin={x:mine()?.x||0,y:mine()?.y||0};seq=mine()?.seq||0;pending=null;lastMove=now();}
   if(e.message==='ROOM_LEFT'){room=null;pending=null;render();}
   if(e.status===401){closeLocal();g?.fn.toast?.(friendly(e));}
  }finally{flight=false;}
 }
 function predictedHp(){const me=mine();if(!me)return 0;let hp=Number(me.hp);for(const r of reports.values())hp-=r.localDamage||0;return Math.max(0,hp);}
 function board(w){if(boardCache&&boardSize===w)return boardCache;boardSize=w;boardCache=document.createElement('canvas');boardCache.width=boardCache.height=w;const c=boardCache.getContext('2d'),s=w/8;
  for(let y=0;y<8;y++)for(let x=0;x<8;x++){const grad=c.createLinearGradient(x*s,y*s,(x+1)*s,(y+1)*s);grad.addColorStop(0,(x+y)%2?'#243443':'#2b3b49');grad.addColorStop(1,'#101d29');c.fillStyle=grad;c.fillRect(x*s+1,y*s+1,s-2,s-2);c.strokeStyle='#485969';c.lineWidth=1;c.strokeRect(x*s+1.5,y*s+1.5,s-3,s-3);c.strokeStyle='#ffffff08';c.beginPath();c.moveTo(x*s+s*.12,y*s+s*.2);c.lineTo(x*s+s*.6,y*s+s*.5);c.lineTo(x*s+s*.8,y*s+s*.9);c.stroke();}return boardCache;
 }
 // Draw-only silhouette clips retain the reference-backed equipped appearance.
 // No aura renderer, pet renderer, or attack pose is invoked in this scene.
 const silhouettes=[
  [[.49,.035],[.57,.04],[.6,.11],[.58,.17],[.74,.23],[.81,.46],[.78,.55],[.71,.57],[.69,.51],[.66,.4],[.65,.58],[.59,.72],[.56,.9],[.54,.97],[.44,.97],[.43,.91],[.46,.72],[.45,.61],[.38,.74],[.37,.92],[.35,.97],[.27,.96],[.27,.9],[.31,.69],[.3,.54],[.29,.4],[.24,.53],[.2,.57],[.14,.53],[.17,.35],[.2,.24],[.41,.17],[.4,.11],[.43,.05]],
  [[.48,.055],[.56,.07],[.6,.13],[.61,.22],[.67,.26],[.73,.44],[.72,.52],[.65,.55],[.6,.44],[.6,.59],[.56,.7],[.55,.91],[.57,.96],[.49,.97],[.45,.94],[.45,.74],[.43,.62],[.4,.73],[.39,.93],[.36,.97],[.29,.96],[.3,.9],[.32,.68],[.3,.52],[.29,.4],[.26,.54],[.21,.55],[.18,.51],[.22,.35],[.27,.26],[.36,.2],[.39,.12],[.43,.07]],
  [[.49,.04],[.57,.045],[.61,.11],[.59,.17],[.71,.21],[.78,.33],[.81,.46],[.78,.54],[.71,.57],[.67,.48],[.67,.65],[.61,.75],[.56,.83],[.57,.94],[.62,.96],[.6,.98],[.5,.98],[.47,.9],[.45,.8],[.43,.7],[.42,.86],[.4,.96],[.32,.98],[.29,.95],[.31,.83],[.3,.75],[.18,.73],[.21,.56],[.26,.38],[.23,.27],[.39,.19],[.43,.17],[.42,.1],[.45,.05]],
  [[.5,.05],[.59,.05],[.63,.12],[.6,.19],[.72,.25],[.78,.39],[.8,.48],[.76,.54],[.7,.53],[.68,.43],[.71,.66],[.65,.73],[.61,.81],[.59,.94],[.62,.97],[.55,.98],[.5,.95],[.51,.78],[.49,.73],[.45,.88],[.44,.97],[.36,.98],[.33,.95],[.35,.84],[.33,.74],[.23,.72],[.25,.57],[.28,.42],[.26,.32],[.28,.25],[.34,.22],[.32,.17],[.4,.1],[.45,.06]]
 ];
 function sprite(m,size,local){const index=m.costume==='kael'?2:m.costume==='serin'?3:m.gender==='female'?1:0,key=index+':'+size+':'+local;if(spriteCache.has(key))return spriteCache.get(key);if(!assets.heroes.complete||!assets.heroes.naturalWidth)return null;
  const c=document.createElement('canvas');c.width=size;c.height=Math.round(size*1.5);const cx=c.getContext('2d'),path=new Path2D();silhouettes[index].forEach(([x,y],i)=>i?path.lineTo(x*c.width,y*c.height):path.moveTo(x*c.width,y*c.height));path.closePath();cx.save();cx.clip(path);const im=assets.heroes;cx.drawImage(im,index*im.width/4,0,im.width/4,im.height,0,0,c.width,c.height);cx.restore();if(local){cx.strokeStyle='#5aff83';cx.lineWidth=Math.max(1.5,size*.028);cx.stroke(path);}spriteCache.set(key,c);return c;}
 function paint(time){
  frameId=0;if(!open||document.hidden||!room||room.status==='waiting')return;frameId=requestAnimationFrame(paint);
  const budget=matchMedia('(max-width:700px)').matches?33:16;if(time-lastFrame<budget)return;lastFrame=time;
  const canvas=$('wb-arena'),rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,1.5),w=Math.round(rect.width*dpr);if(!w)return;if(canvas.width!==w){canvas.width=canvas.height=w;boardCache=null;}
  const c=canvas.getContext('2d');c.drawImage(board(w),0,0);const s=w/8,t=now(),me=mine();
  for(const wave of room.waves||[]){
   if(t<wave.showAt)continue;if(!seen.has(wave.id))seen.set(wave.id,t);
   if(t>=wave.hitAt&&!resolved.has(wave.id)&&!reports.has(wave.id)&&me?.hp>0){const p=M.positionAt(origin,moves,wave.hitAt),seenAt=seen.get(wave.id);reports.set(wave.id,{id:wave.id,seenAt,localDamage:M.hitDamage(wave,p,seenAt)});scheduleSync(80);}
   const impact=t-wave.hitAt;if(impact>220)continue;
   const progress=M.clamp((t-wave.showAt)/(wave.hitAt-wave.showAt),0,1);
   for(const tile of wave.tiles){const x=(tile%8+.5)*s,y=(Math.floor(tile/8)+.5)*s;c.beginPath();c.arc(x,y,s*.43,0,Math.PI*2);c.fillStyle=impact>=0?'#ff8156b0':'#df283a38';c.fill();c.strokeStyle=impact>=0?'#ffbe8d':'#ff4a5d';c.lineWidth=1.5*dpr;c.stroke();if(impact<0){c.beginPath();c.arc(x,y,s*.37,-Math.PI/2,-Math.PI/2+Math.PI*2*progress);c.strokeStyle='#ff9b82';c.stroke();}}
  }
  const occupied=new Map();for(const m of room.members.filter(m=>m.present)){const tile=m.x+8*m.y;occupied.set(tile,(occupied.get(tile)||0)+1);}const indexAt=new Map();
  for(const m of room.members.filter(m=>m.present)){
   const local=m.id===userId;let p=local?M.interpolate(origin,moves,t):{x:m.x,y:m.y};if(!local){const remote=remotePositions.get(m.id);if(remote){const a=M.clamp((t-remote.at)/140,0,1);p={x:remote.fromX+(remote.x-remote.fromX)*a,y:remote.fromY+(remote.y-remote.fromY)*a};}}
   const tile=m.x+8*m.y,n=occupied.get(tile),i=indexAt.get(tile)||0;indexAt.set(tile,i+1);const offset=n>1?(i-(n-1)/2)*Math.min(s*.13,s*.7/n):0,x=(p.x+.5)*s+offset,y=(p.y+.86)*s,hp=local?predictedHp():m.hp;
   if(hp<=0){c.fillStyle=m.revived?'#48444c':'#7e8385';c.strokeStyle='#c1bfb1';c.lineWidth=dpr;c.beginPath();c.roundRect(x-s*.19,y-s*.55,s*.38,s*.52,[s*.12,s*.12,1,1]);c.fill();c.stroke();c.fillStyle='#c9ccb9';c.fillRect(x-s*.025,y-s*.45,s*.05,s*.26);c.fillRect(x-s*.1,y-s*.38,s*.2,s*.05);
    const progress=M.reviveProgress(m,room.members,t);if(progress>0){c.fillStyle='#071c25';c.fillRect(x-s*.42,y+2,s*.84,s*.09);c.fillStyle='#63d7ef';c.fillRect(x-s*.42,y+2,s*.84*progress,s*.09);c.fillStyle='#def9ff';c.font=`${Math.max(8,7*dpr)}px sans-serif`;c.textAlign='center';c.fillText((progress*3).toFixed(1)+'/3초',x,y-s*.6);}continue;
   }
   const img=sprite(m,Math.round(s*.77),local);if(img)c.drawImage(img,x-img.width/2,y-img.height);else{c.fillStyle=local?'#61e18a':'#bac6cf';c.fillRect(x-s*.12,y-s*.7,s*.24,s*.65);}
   c.fillStyle='#050b12';c.fillRect(x-s*.27,y-s*.93,s*.54,s*.08);c.fillStyle=local?'#75ff93':'#68d680';c.fillRect(x-s*.26,y-s*.92,s*.52*M.clamp(hp/m.maxHp,0,1),s*.06);
   const moving=local?t-lastMove<M.MOVE_MS:t<m.stillAt;
   if(!moving&&!m.background&&t>=room.startedAt&&Date.now()-lastGood<2000&&room.status==='running'){
    const phase=((t+room.members.indexOf(m)*83)%800)/800;const px=x+(w*.5-x)*phase,py=y+(s*.15-y)*phase;c.strokeStyle=local?'#b6e9ff':'#e6c084';c.lineWidth=1.5*dpr;c.beginPath();c.moveTo(px,py+s*.18);c.lineTo(px,py);c.stroke();
   }
  }
  if(Math.floor(time/200)!==Math.floor((time-budget)/200))updateHud();
 }
 function dialog(html){$('wb-overlay').innerHTML=`<div class="wb-dialog" role="alertdialog" aria-modal="true">${html}</div>`;$('wb-overlay').hidden=false;$('wb-overlay').querySelector('button')?.focus();}
 function hideDialog(){$('wb-overlay').hidden=true;$('wb-overlay').innerHTML='';$('wb-exit').focus();}
 function confirmExit(){if(!room||!['waiting','running'].includes(room.status))return room?ack():closeLocal();dialog('<h3>전장에서 나갈까요?</h3><p>나가면 이 전투의 보상을 받지 못합니다.<br>남은 보상 횟수는 차감되지 않습니다.</p><div class="wb-actions"><button data-action="cancel">계속하기</button><button data-action="leave-confirm">나가기</button></div>');}
 async function leave(){if(busy)return;busy=true;try{await request('leave',{},room?.id);closeLocal();}catch(e){toast(friendly(e));dialog('<h3>퇴장 확인 실패</h3><p>연결을 확인한 뒤 다시 시도해 주세요.</p><button data-action="leave-confirm">퇴장 다시 시도</button><button data-action="cancel">닫기</button>');}finally{busy=false;}}
 async function ack(){if(busy)return;busy=true;try{if(room)await request('ack',{},room.id);closeLocal();}catch(e){toast(friendly(e));}finally{busy=false;}}
 function showResult(){if(!room||$('wb-overlay').dataset.result===room.id)return;$('wb-overlay').dataset.result=room.id;const me=mine(),won=room.status==='won';
  dialog(`<h3>${won?'토벌 성공':'토벌 실패'}</h3><p>${esc(room.reason||'전투 종료')} · ${Math.max(0,Math.floor(((room.endedAt||now())-room.startedAt)/1000))}초<br>보스 남은 체력 ${number(room.hp)}</p><div class="wb-quota">${won?(me?.reward==='pending'?'보상 획득 기록 완료 · 지급 대기<br><small>보상 내용이 확정되면 지급할 수 있도록 보관됩니다.</small>':'보상 없이 참가한 전투입니다.'):'보상 횟수는 차감되지 않았습니다.'}</div><div class="wb-result-list">${[...room.members].sort((a,b)=>b.damage-a.damage).map(m=>`<div><span>${esc(m.name)}${m.present?'':' (퇴장)'}</span><span>${number(m.damage)} · ${M.contribution(m,room).toFixed(1)}%</span></div>`).join('')}</div><div class="wb-actions"><button class="wb-primary" data-action="ack">${won&&me?.reward==='pending'?'보상 확인':'확인'}</button></div>`);
 }
 async function openWorldBoss(){if(open)return;if(!window.RinguSession?.active)return g?.fn.toast?.('로그인이 필요합니다.');if(g.activeDungeon||g.activeTower||g.state?.serverBattle)return g.fn.toast?.('진행 중인 전투를 먼저 종료해 주세요.');
  shell();if(!assets.heroes.src)assets.heroes.src=assetBase+'heroes-back-v1.png';previousFocus=document.activeElement;open=true;root.hidden=false;document.body.classList.add('wb-open');room=null;pending=null;bestRtt=Infinity;lastGood=0;hideDialog();renderLobby();await doAction('list',{},null);clearInterval(syncTimer);syncTimer=setInterval(sync,1000);$('wb-exit').focus();
 }
 function closeLocal(){open=false;clearInterval(syncTimer);clearTimeout(urgentTimer);urgentTimer=null;cancelAnimationFrame(frameId);frameId=0;unsubscribe?.();unsubscribe=null;channelRoom=null;room=null;pending=null;moves=[];reports.clear();seen.clear();resolved.clear();keys.clear();activePointers.clear();if(root){root.hidden=true;$('wb-overlay').dataset.result='';}document.body.classList.remove('wb-open');window.RinguPortrait?.showPage('hunt');previousFocus?.focus();}
 function install(core){if(g)return;g=core;shell();const button=document.createElement('button');button.textContent='월드보스';button.id='worldBossQuick';button.type='button';button.onclick=openWorldBoss;(document.querySelector('#rmFeatureNav nav')||document.querySelector('.main-quick'))?.append(button);
  const old=core.fn.attack;core.fn.attack=(...a)=>open?false:old(...a);window.RinguSession?.onEnded(closeLocal);
 }
 window.RinguWorldBoss={open:openWorldBoss,get isBattleVisible(){return open;}};
 window.addEventListener('ringu-ready',()=>install(window.RinguCore),{once:true});if(window.RinguCore&&window.RinguSession?.active)install(window.RinguCore);
})();
