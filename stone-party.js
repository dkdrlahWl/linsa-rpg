(() => {'use strict';
window.installRinguStoneParty = function(g) {
  const f = g.fn, $ = id => document.getElementById(id), esc = s => f.escapeHtml(String(s)), fmt = n => Math.floor(n).toLocaleString('ko-KR');
  let room = null, rooms = [], busy = false, polling = false, timer, pending = 0, remaining = 2, lastStatus = '', generation = 0, pollController = null, lastPoll = 0, renderKey = '', renderNode = null;
  const active = () => window.RinguSession.active;
  async function request(action, body, controller = new AbortController()) {
    const timeout = setTimeout(()=>controller.abort(), 10000);
    try {
    const res = await fetch('/api/stone/' + action, body ? {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body),signal:controller.signal} : {signal:controller.signal});
    const data = await res.json(); if (!res.ok) throw new Error(data.error || '파티 서버에 연결하지 못했습니다.'); return data;
    } catch(e) {if(e.name==='AbortError')throw new Error('서버 응답이 지연됩니다. 다시 시도해 주세요.');throw e;}
    finally {clearTimeout(timeout);}
  }
  function update(data) {
    if ('room' in data) room = data.room;
    if (data.rooms) rooms = data.rooms;
    if (data.remaining != null) remaining = data.remaining;
    pending = data.pending || 0;
    if (room?.status === 'running') {
      if (g.activeTower || (g.activeDungeon && !g.activeDungeon.serverRoom)) g.coreFixes?.cancelBattles();
      g.activeDungeon = {serverRoom:true,type:'stone',stage:room.stage,hp:room.hp,maxHp:room.maxHp,reward:room.reward,elapsed:room.tick};
    } else if (g.activeDungeon?.serverRoom) g.activeDungeon = null;
    const signature = room ? room.id + room.status : '';
    if (signature !== lastStatus && room && ['won','lost','canceled'].includes(room.status)) {
      f.toast(room.status === 'won' ? '파티 클리어! 보상은 서버에 보관되었습니다.' : room.reason || '시간 초과 · 티켓은 유지됩니다.');
      window.RinguAudio?.effect(room.status === 'won' ? 'success' : 'failure');
    }
    lastStatus = signature;
    if (pending && active()) {f.save(false); void window.RinguSession.flush().catch(()=>{});}
    if (g.dungeonType === 'stone') render();
  }
  async function poll() {
    if (!active() || polling || busy) return;
    polling = true; lastPoll = Date.now();
    const version = generation, controller = new AbortController(); pollController = controller;
    try {const data=await request(room && ['waiting','running'].includes(room.status) ? 'poll' : 'rooms', room && ['waiting','running'].includes(room.status) ? {id:room.id} : undefined,controller);if(active() && version===generation && !busy){if(room&&!['waiting','running'].includes(room.status)&&!data.room)delete data.room;update(data);}}
    catch(e) {if (version===generation && $('rmStoneStatus')) $('rmStoneStatus').textContent=e.message;}
    finally {if(pollController===controller){polling=false;pollController=null;}}
  }
  async function act(action, args={}) {
    if (busy || !active()) return;
    if (['create','join','start'].includes(action) && (g.activeTower || (g.activeDungeon && !g.activeDungeon.serverRoom))) return f.toast('현재 전투를 먼저 종료하세요.');
    busy = true; ++generation; pollController?.abort(); pollController=null; polling=false;
    render();
    try {
      // Party commands use authoritative server state; leaving must not wait on preference saves.
      const data = await request(action, {id:room?.id,...args});
      if (!active()) return;
      // The leave RPC returns the old room, which can still be running for the partner.
      // It is no longer this player's encounter after a confirmed leave.
      if(action==='leave') data.room=null;
      update(data);
    } catch(e) {f.toast(e.message);}
    finally {busy=false; if(g.dungeonType==='stone') render();}
  }
  function render() {
    if (!$('dungeonStageList') || !$('dungeonModal')?.classList.contains('show')) return;
    const node=$('dungeonStageList'), key=JSON.stringify([room,room?null:rooms,remaining,busy]);
    if(renderKey===key && renderNode===node.firstChild && node.firstChild)return;
    renderKey=key;
    $('dungeonSummary').textContent = 'HP 1/3 적용 [S3] · 2인 협동 · 혼자 시작 가능 · 오늘 남은 보상 ' + remaining + '/2 · 실패 시 티켓 유지';
    $('dungeonBattle').classList.remove('show');
    if (room) {
      const waiting = room.status === 'waiting', running = room.status === 'running', host = room.host === window.RinguSession.account.id;
      $('dungeonStageList').innerHTML = '<section class="rm-stone-room"><h3>초월석 '+room.stage+'단계 · '+({waiting:'모집 중',running:'함께 전투 중',won:'클리어',lost:'시간 초과',canceled:'종료'}[room.status])+'</h3><p>방 코드 '+esc(room.id.slice(0,8))+' · '+room.members.filter(m=>!m.left).length+'/2</p><div class="dungeon-hp"><i style="width:'+(room.hp/room.maxHp*100)+'%"></i></div><p>♥ '+fmt(room.hp)+' / '+fmt(room.maxHp)+'　'+room.tick+' / 15초</p>'+room.members.map(m=>'<div class="rm-stone-member"><strong>'+esc(m.name)+(m.id===room.host?' · 방장':'')+(m.left?' · 퇴장':'')+'</strong><span>⚔ '+fmt(m.stats.attack)+'　누적 피해 '+fmt(m.damage)+'</span></div>').join('')+(waiting&&room.members.length<2?'<p>참가자를 기다리거나 혼자 시작할 수 있습니다.</p>':'')+'<div class="rm-stone-actions">'+(waiting&&host?'<button data-stone="start">'+(room.members.length===1?'혼자 시작':'2인 전투 시작')+'</button>':'')+(waiting&&!host?'<p>방장이 시작할 때까지 기다려 주세요.</p>':'')+((waiting||running)?'<button data-stone="leave">'+(running?'포기하고 나가기':'방 나가기')+'</button>':'<button data-stone="list">방 목록으로</button>')+'</div><p id="rmStoneStatus">'+(running?'서버 자동 공격 · 연결이 끊기면 공격 중단':'클리어 시 각자 초월석 '+room.reward+'개 · 하루 2회')+'</p></section>';
    } else {
      $('dungeonStageList').innerHTML = '<p>방 만들기 → 참가자 입장 → 방장 시작. 최대 2명이 같은 보스를 공격합니다.</p>'+Array.from({length:6},(_,i)=>'<button class="rm-dungeon-entry" data-stone="create" data-stage="'+(i+1)+'">'+(i+1)+'단계 방 만들기　♥ '+fmt(Math.floor(100000*1.5**i))+'　◆ '+(i+2)+'</button>').join('')+'<h3>참가 가능한 방</h3>'+rooms.filter(r=>r.members.length<2).map(r=>'<button class="rm-dungeon-entry" data-stone="join" data-room="'+esc(r.id)+'">'+esc(r.members[0].name)+' · '+r.stage+'단계 · 1/2 · 참가</button>').join('')+'<p id="rmStoneStatus">'+(rooms.length?'목록은 자동 갱신됩니다.':'모집 중인 방이 없습니다.')+'</p>';
    }
    renderNode=node.firstChild;
    $('dungeonStageList').querySelectorAll('[data-stone]').forEach(b=>{b.disabled=busy;b.onclick=()=>{const a=b.dataset.stone;if(a==='list'){++generation;room=null;void poll();return render();}void act(a,a==='create'?{stage:Number(b.dataset.stage)}:a==='join'?{id:b.dataset.room}:{});};});
  }
  window.RinguStoneParty={get inRoom(){return !!room&&['waiting','running'].includes(room.status);}};
  const oldRender=f.renderDungeon; f.renderDungeon=()=>g.dungeonType==='stone'?render():oldRender();
  const oldBattle=f.renderDungeonBattle; f.renderDungeonBattle=()=>g.activeDungeon?.serverRoom?render():oldBattle();
  const oldTick=f.dungeonAttackTick; f.dungeonAttackTick=(...a)=>g.activeDungeon?.serverRoom?false:oldTick(...a);
  const oldFinish=f.finishDungeonClearV15; f.finishDungeonClearV15=(d)=>d?.serverRoom?false:oldFinish(d);
  const oldStart=f.startDungeonBattle; f.startDungeonBattle=(type,...a)=>type==='stone'?f.toast('초월석 던전은 파티 대기실에서 시작하세요.'):oldStart(type,...a);
  // Prevent field rewards while waiting/running; the shared fight is the only active encounter.
  const oldAttack=f.attack;f.attack=(...a)=>room&&['waiting','running'].includes(room.status)?false:oldAttack(...a);
  const oldClose=f.closeDungeon; f.closeDungeon=()=>{if(room&&['waiting','running'].includes(room.status)){$('dungeonModal').classList.remove('show');return;}return oldClose();};
  const oldOpen=f.openDungeon;f.openDungeon=(...a)=>{if(room&&['waiting','running'].includes(room.status)){g.dungeonType='stone';$('dungeonModal').classList.add('show');render();return;}return oldOpen(...a);};
  // Disable legacy cloud/solo room entry points even when invoked by old markup.
  Object.assign(window,{createPartyRoom:stage=>act('create',{stage}),quickPartyEntry:stage=>act('create',{stage}),loadPartyRooms:poll,joinPartyRoom:id=>act('join',{id}),startPartyRoom:()=>act('start'),leavePartyRoom:()=>act('leave')});
  window.addEventListener('ringu:stone-award',e=>{g.state.transcendStone=(Number(g.state.transcendStone)||0)+e.detail.amount;f.renderTop();f.toast('초월석 +'+e.detail.amount+' · 계정 저장 완료');});
  // Stage 1 is available without the retired legendary-equipment prerequisite.
  for(const name of ['startTower','startGoldDungeon','startPetDungeon']){const before=f[name];f[name]=(...a)=>room&&['waiting','running'].includes(room.status)?f.toast('파티 방에서 나온 뒤 도전하세요.'):before(...a);}
  timer=setInterval(()=>{const inRoom=window.RinguStoneParty.inRoom, visible=g.dungeonType==='stone'&&$('dungeonModal')?.classList.contains('show');if((inRoom||visible)&&Date.now()-lastPoll>=(inRoom?1800:5000))void poll();},300);
  window.RinguSession.onEnded(()=>{clearInterval(timer);++generation;pollController?.abort();room=null;if(g.activeDungeon?.serverRoom)g.activeDungeon=null;});
  void poll();
};
})();
