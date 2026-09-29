import {WAVE_REWARDS,WAVE_END} from './wave-rewards.mjs?v=lumi-68';
import {currencyIconURL} from './currency-icons.mjs?v=lumi-68';
import {waveStats,WAVE_LIMIT} from './wave-model.mjs?v=lumi-68';
import {WAVE_MONSTERS} from './wave-monsters.mjs?v=lumi-68';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Math.round(n||0).toLocaleString('ko-KR');
const button=(label,action,arg='',disabled=false)=>`<button data-action="${action}" data-arg="${esc(arg)}" ${disabled?'disabled':''}>${label}</button>`;
export function waveLobby(state,room,rooms=[]){
 if(room)return `<section class="panel pad wave-lobby"><p class="eyebrow">THE FINAL MEADOW</p><h2>협동 웨이브 · 준비실</h2><p>항상 1웨이브부터 시작 · 1~4명 · 4인 기준 난이도</p><div class="wave-members">${room.members.filter(m=>!m.left).map(m=>`<p>● ${esc(m.name)} ${m.id===room.owner?'· 방장':''} · ${m.ready?'준비 완료':'접속 대기'}<small>전투력 ${fmt(m.power.combatPower)}</small></p>`).join('')}</div><div class="actions">${button(room.members.every(m=>m.ready)?'1웨이브 시작':'모두 준비 후 시작','coopStart','',room.owner!==room.me||!room.members.every(m=>m.ready))}${button('새로고침','coopSync')}${button('나가기','coopLeave')}</div></section>`;
 const list=rooms.filter(r=>r.mode==='wave');
 return `<section class="panel pad wave-lobby"><p class="eyebrow">THE FINAL MEADOW</p><h2>협동 웨이브</h2><p>함께 돌파하는 200웨이브 · 마지막 적을 쓰러뜨리면 엔딩.</p><div class="wave-rules"><span>1~4인 · 레벨 제한 없음</span><span>매 도전 1웨이브부터</span><span>전멸 즉시 / 최대 30초마다 다음 웨이브</span><span>전원 사망 / 몬스터 100마리 → 종료</span></div><p class="note">상하좌우 각 5~10마리 + 정예가 첫 10초 동안 몰려옵니다. 10웨이브마다 몬스터 종류 변경, 정예 1마리 추가. 200웨이브는 모든 적을 처치해야 완료되며, 201웨이브는 없습니다.<br>동료 묘비 위에서 움직이지 않고 5초 → 체력 30%로 부활.<br>권장 레벨 = 웨이브 × 2 · 4인 기준 고정 난이도 · 입장 횟수 무제한</p><div class="actions">${button('방 만들기','waveCreate')}${button('목록 새로고침','coopList')}</div>${waveRewardGuide(state)}<p>내 최고 기록 <strong>${fmt(state.waveBest)}웨이브</strong></p>${state.waveEnding?'<p class="wave-ending-badge">200웨이브 엔딩 달성</p>':''}${waveHistory(state)}<h3>모집 중인 방</h3>${list.length?list.map(r=>`<div class="daily-row"><span>${esc(r.name)}의 초원<small>${r.count} / 4명 · 1웨이브부터 시작</small></span>${button('참가','coopJoin',r.id,r.count>=4)}</div>`).join(''):'<p class="note">새 방을 만들어 혼자서도 출발할 수 있어요.</p>'}</section>`;
}
export function waveHud(host,w){
 const speed=host.querySelector('#wave-speed');
 if(speed){speed.textContent='1.5배속 '+(w.waveSpeed===1.5?'켜짐':'꺼짐')+(w.owner!==w.me?' · 방장 전용':'');speed.setAttribute('aria-pressed',String(w.waveSpeed===1.5));speed.disabled=w.owner!==w.me||w.entryWaiting||w.status!=='fighting';}

 const me=w.members.find(m=>m.id===w.me),s=waveStats(w.wave||1),count=w.monsters?.length||0,clock=Math.max(0,Math.ceil((w.nextWave-w.tick)/10));
 host.querySelector('.tower-title-row h3').textContent=`${w.wave} / ${WAVE_END}웨이브 · ${WAVE_MONSTERS[s.species].name}`;
 host.querySelector('.tower-floor-tag').textContent='W'+w.wave;
 host.querySelector('#tower-enemy-hp').textContent=`남은 몬스터 ${count} / ${WAVE_LIMIT} · 처치 ${fmt(w.kills)}`;
 host.querySelector('#tower-enemy-bar').style.width=Math.min(100,count/WAVE_LIMIT*100)+'%';
 host.querySelector('#tower-player-hp').textContent=fmt(me.hp)+' / '+fmt(me.power.hp);
 host.querySelector('#tower-player-bar').style.width=me.hp/me.power.hp*100+'%';
 host.querySelector('#tower-clock').textContent=w.status==='won'?'200웨이브 완료':w.wave>=WAVE_END?'최종전 · 전부 처치':`다음 ${clock}초`;
 const dead=w.members.filter(m=>!m.left&&m.hp<=0),reviving=dead.find(m=>m.reviver===me.id);
 host.querySelector('#tower-status').hidden=!(w.pendingOutcome||me.hp<=0||reviving||count>=WAVE_LIMIT*.8);
 host.querySelector('#tower-status').textContent=w.pendingOutcome?'종료 판정 확인 중…':me.hp<=0?`동료가 묘비 위에서 5초 대기하면 부활 · ${(me.reviveProgress/10).toFixed(1)} / 5초`:reviving?`동료 부활 중 ${(reviving.reviveProgress/10).toFixed(1)} / 5초 · 움직이면 중단`:count>=WAVE_LIMIT*.8?'위험! 몬스터 100마리가 쌓이면 종료됩니다.':`사방의 적을 처치하세요 · 정예 ${s.eliteCount}마리 등장`;
 host.querySelector('#tower-range').textContent=`생존 ${w.members.filter(m=>!m.left&&m.hp>0).length} / ${w.members.filter(m=>!m.left).length}`;
 host.querySelector('#tower-chest').hidden=true;
 for(const b of host.querySelectorAll('[data-tower-button]')){const key={1:'attackReady',2:'skillReady',4:'dashReady',8:'ultimateReady',16:'thirdReady',32:'fourthReady'}[b.dataset.towerButton],left=Math.max(0,(me[key]||0)-w.tick);b.querySelector('b').textContent=left?(left/10).toFixed(1):'';}
}


const odds=options=>options.filter(([n])=>n>0).map(([n,p])=>`${n}개 ${p===1?'확정':Math.round(p*100)+'%'}`).join(' / ');
function waveRewardGuide(state){
 const claims=state.waveFirstClaims||[];
 return `<details class="wave-reward-guide"><summary>최초 보상 · 마지막 완료 구간 추첨표</summary><p class="note">완료한 마지막 10단위 구간만 추첨합니다. 89웨이브 완료 → 80구간 1회. 레큐와 주문서는 각각 추첨하며, 하위 구간 추첨은 합산하지 않습니다.<br>최초 보상은 계정당 구간별 1회, 아직 받지 않은 완료 구간을 합산 지급합니다. 종료·나가기·200웨이브 엔딩 시 자동 지급됩니다. 10웨이브 미만은 보상이 없습니다.</p><div class="wave-reward-tiers">${WAVE_REWARDS.map(r=>`<article class="wave-tier"><div class="row spread"><strong>${r.wave}웨이브${r.wave===200?' · 엔딩':''}</strong><span class="pill">${claims.includes(r.wave)?'최초 보상 수령 완료':'최초 보상 미수령'}</span></div><p>최초: ${fmt(r.gold)} G · 장비 파편 ${r.fragment}개</p><small>레드 큐브 ${odds(r.cube)}<br>잠재 해금 주문서 ${odds(r.scroll)}</small></article>`).join('')}</div></details>`;
}
function waveHistory(state){
 const history=state.waveRewardHistory||[];
 if(!history.length)return '';
 return `<details class="wave-reward-history"><summary>최근 보상 수령 내역 ${history.length}건</summary>${history.map((r,i)=>`<div class="daily-row"><span>${fmt(r.cleared)}웨이브 완료 · ${r.ending?'엔딩 · ':''}지급 완료<small>${fmt(r.gold)} G · 파편 ${fmt(r.fragment)} · 레큐 ${fmt(r.cube)} · 주문서 ${fmt(r.scroll)}</small></span>${button('상세','waveRewardHistory',i)}</div>`).join('')}</details>`;
}
export function waveRewardBody(r){
 const firsts=r.firstRewards||[],bracket=r.rewardTier??Math.floor((r.cleared||0)/10)*10;
 const names={gold:'골드',fragment:'장비 파편',cube:'레드 큐브',scroll:'잠재 해금 주문서'};
 const totals=['gold','fragment','cube','scroll'].map(key=>`<div class="wave-loot ${r[key]>0?'received':'empty'}"><img src="${currencyIconURL(key)}" alt=""><span>${names[key]}<strong>${fmt(r[key])}${key==='gold'?' G':'개'}</strong><small>${r[key]>0?'지급 완료':'획득 없음'}</small></span></div>`).join('');
 return `<div class="wave-result ${r.ending?'wave-ended':''}">${r.ending?'<p class="eyebrow">THE END · 200 / 200</p><h2>초원의 마지막 물결을 넘어</h2><p>200웨이브의 모든 적을 처치했습니다.</p>':`<h3>${fmt(r.cleared)}웨이브 완료</h3><p>${fmt(r.wave)}웨이브 도달 · ${r.reason==='overrun'?'몬스터 100마리 누적':r.reason==='leave'?'도전 종료':'전원 사망'}</p>`}<p class="note">처치 ${fmt(r.kills)}마리 · ${bracket?bracket+'웨이브 구간 추첨':'10웨이브 미완료 · 추첨 없음'}</p><h3>실제 받은 보상</h3><div class="wave-loot-grid">${totals}</div><section class="wave-first-rewards"><h4>이번에 받은 최초 보상</h4>${firsts.length?firsts.map(f=>`<p><strong>${f.wave}웨이브</strong><span>${fmt(f.gold)} G · 파편 ${fmt(f.fragment)}개</span></p>`).join(''):`<p class="note">${bracket?'완료 구간의 최초 보상은 이미 수령했습니다.':'10웨이브부터 최초 보상을 받을 수 있습니다.'}</p>`}</section><section class="wave-roll-result"><h4>${bracket?bracket+'웨이브 추첨 결과':'반복 추첨 보상'}</h4><p>레드 큐브 <strong>${r.cube>0?fmt(r.cube)+'개 획득':'미당첨'}</strong></p><p>잠재 해금 주문서 <strong>${r.scroll>0?fmt(r.scroll)+'개 획득':'미당첨'}</strong></p><p class="note">${bracket?'해당 구간 확률표로 각 재료를 한 번씩 추첨했습니다.':'추첨 대상 구간에 도달하지 않았습니다.'}</p></section><p class="note">보상은 이미 계정에 지급됐습니다. 확인 버튼은 추가 지급하지 않습니다.<br>재도전은 1웨이브부터 시작하며, 수령한 최초 보상은 다시 지급되지 않습니다.</p></div>`;
}
