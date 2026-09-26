import {waveStats,WAVE_LIMIT} from './wave-model.mjs?v=coop-ready-7';
import {WAVE_MONSTERS} from './wave-monsters.mjs?v=coop-ready-7';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Math.round(n||0).toLocaleString('ko-KR');
const button=(label,action,arg='',disabled=false)=>`<button data-action="${action}" data-arg="${esc(arg)}" ${disabled?'disabled':''}>${label}</button>`;
export function waveLobby(state,room,rooms=[]){
 if(room)return `<section class="panel pad wave-lobby"><p class="eyebrow">ENDLESS MEADOW</p><h2>협동 웨이브 · 준비실</h2><p>항상 1웨이브부터 시작 · 1~4명 · 4인 기준 난이도</p><div class="wave-members">${room.members.filter(m=>!m.left).map(m=>`<p>● ${esc(m.name)} ${m.id===room.owner?'· 방장':''}<small>전투력 ${fmt(m.power.combatPower)}</small></p>`).join('')}</div><div class="actions">${button('1웨이브 시작','coopStart','',room.owner!==room.me)}${button('새로고침','coopSync')}${button('나가기','coopLeave')}</div></section>`;
 const list=rooms.filter(r=>r.mode==='wave');
 return `<section class="panel pad wave-lobby"><p class="eyebrow">ENDLESS MEADOW</p><h2>협동 웨이브</h2><p>끝없이 밀려오는 적, 함께 버티는 초원.</p><div class="wave-rules"><span>1~4인 · 레벨 제한 없음</span><span>매 도전 1웨이브부터</span><span>전멸 즉시 / 최대 30초마다 다음 웨이브</span><span>전원 사망 / 몬스터 100마리 → 종료</span></div><p class="note">상하좌우 각 5~10마리 + 정예가 첫 10초 동안 몰려옵니다. 10웨이브마다 몬스터 종류 변경, 정예 1마리 추가. 300웨이브까지 30종씩, 301부터 외형 반복.<br>동료 묘비 위에서 움직이지 않고 5초 → 체력 30%로 부활.<br>권장 레벨 = 웨이브 × 2 · 4인 기준 고정 난이도 · 입장 횟수 무제한</p><div class="actions">${button('방 만들기','waveCreate')}${button('목록 새로고침','coopList')}</div><details><summary>누적 보상 · 확률</summary><p>전부 처치하거나 30초를 버틴 웨이브당 5 G + ⌊웨이브 / 10⌋ G.<br>10웨이브 생존: 레드 큐브 1개 5% · 20웨이브 6% · 이후 10단위마다 +1%p, 최대 15%.<br>잠재 해금 주문서는 10·20·30…웨이브마다 개인별 20% 확률로 1개. 큐브와 별도 독립 추첨합니다. 종료·나가기 시 지급. 실패한 웨이브는 미지급.</p></details><p>내 최고 기록 <strong>${fmt(state.waveBest)}웨이브</strong></p><h3>모집 중인 방</h3>${list.length?list.map(r=>`<div class="daily-row"><span>${esc(r.name)}의 초원<small>${r.count} / 4명 · 1웨이브부터 시작</small></span>${button('참가','coopJoin',r.id,r.count>=4)}</div>`).join(''):'<p class="note">새 방을 만들어 혼자서도 출발할 수 있어요.</p>'}</section>`;
}
export function waveHud(host,w){
 const me=w.members.find(m=>m.id===w.me),s=waveStats(w.wave||1),count=w.monsters?.length||0,clock=Math.max(0,Math.ceil((w.nextWave-w.tick)/10));
 host.querySelector('.tower-title-row h3').textContent=`${w.wave}웨이브 · ${WAVE_MONSTERS[s.species].name}`;
 host.querySelector('.tower-floor-tag').textContent='W'+w.wave;
 host.querySelector('#tower-enemy-hp').textContent=`남은 몬스터 ${count} / ${WAVE_LIMIT} · 처치 ${fmt(w.kills)}`;
 host.querySelector('#tower-enemy-bar').style.width=Math.min(100,count/WAVE_LIMIT*100)+'%';
 host.querySelector('#tower-player-hp').textContent=fmt(me.hp)+' / '+fmt(me.power.hp);
 host.querySelector('#tower-player-bar').style.width=me.hp/me.power.hp*100+'%';
 host.querySelector('#tower-clock').textContent=`다음 ${clock}초`;
 const dead=w.members.filter(m=>!m.left&&m.hp<=0),reviving=dead.find(m=>m.reviver===me.id);
 host.querySelector('#tower-status').textContent=w.pendingOutcome?'종료 판정 확인 중…':me.hp<=0?`동료가 묘비 위에서 5초 대기하면 부활 · ${(me.reviveProgress/10).toFixed(1)} / 5초`:reviving?`동료 부활 중 ${(reviving.reviveProgress/10).toFixed(1)} / 5초 · 움직이면 중단`:count>=WAVE_LIMIT*.8?'위험! 몬스터 100마리가 쌓이면 종료됩니다.':`사방의 적을 처치하세요 · 정예 ${s.eliteCount}마리 등장`;
 host.querySelector('#tower-range').textContent=`생존 ${w.members.filter(m=>!m.left&&m.hp>0).length} / ${w.members.filter(m=>!m.left).length}`;
 host.querySelector('#tower-chest').hidden=true;
 for(const b of host.querySelectorAll('[data-tower-button]')){const key={1:'attackReady',2:'skillReady',4:'dashReady',8:'ultimateReady',16:'thirdReady',32:'fourthReady'}[b.dataset.towerButton],left=Math.max(0,(me[key]||0)-w.tick);b.querySelector('b').textContent=left?(left/10).toFixed(1):'';}
}
