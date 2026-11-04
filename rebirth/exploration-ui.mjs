import {partyRoomView} from './party-room.mjs';
import {citadelPopulation,citadelStage,citadelAsset,CITADEL_BOSSES} from './citadel-zero.mjs';
import {EXPLORATIONS,explorationArt,explorationPopulation,explorationScale,explorationPrevious,explorationKeys} from './exploration-data.mjs';
import {EXPLORATION_REWARDS,explorationRewardCount,explorationGearRange,explorationGearTable} from './exploration-reward-data.mjs?v=nobc-20261105';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const artURL=src=>/^exploration\/(?:boss-[456]|map-[456])\.webp$/.test(src)?src+'?v=exploration-art456-20261025':src;
const fmt=n=>new Intl.NumberFormat('ko-KR').format(n);
const btn=(label,action,arg='',off=false)=>'<button data-action="'+action+'" data-arg="'+esc(arg)+'" '+(off?'disabled':'')+'>'+label+'</button>';
export const explorationUnlocked=(state,tier)=>Number.isInteger(tier)&&!!EXPLORATIONS[tier]&&(tier===0||(state.exploration?.cleared||[]).includes(explorationPrevious(tier)));
// exploration-rewards.mjs의 EXPLORATION_COMPANION_TICKET_CHANCE와 같은 값.
const COMPANION_TICKET_CHANCE=0;
const pctText=x=>(x*100).toFixed(0)+'%';
// 보스장비 레벨 구간별: 판당 확률(보스장비가 나왔을 때 그 레벨일 비중).
const finePct=x=>{const v=x*100;return (v>=10?v.toFixed(1):v>=1?v.toFixed(2):v.toFixed(3)).replace(/\.?0+$/,'')+'%';};
const gearRows=r=>explorationGearTable(r).map(([level,share,chance])=>'<li class="exploration-gear-tier"><span>└ '+level+'제 <small>('+finePct(share)+')</small></span><b>'+finePct(chance)+'</b></li>').join('');
function rewardList(t){
 const r=EXPLORATION_REWARDS[t.id],n=key=>explorationRewardCount(r,key),row=(label,p)=>'<li><span>'+label+'</span><b>'+pctText(p)+'</b></li>';
 return '<ul class="exploration-reward-list"><li><span>골드 '+fmt(r.gold)+' G</span><b>확정</b></li>'+row('잠재 해금 주문서 '+n('scroll')+'개',r.scroll)+(r.highCube?row('블랙 큐브 '+n('highCube')+'개',r.highCube):'')+(r.potentialLock?row('잠재 잠금석 '+n('potentialLock')+'개',r.potentialLock):'')+(r.addCube?row('에디셔널 큐브 '+n('addCube')+'개',r.addCube):'')+(r.bonusFlame?row('추가옵션 불꽃 '+n('bonusFlame')+'개',r.bonusFlame):'')+row(explorationGearRange(r)+'제 보스장비 1개',r.bossGear)+gearRows(r)+(COMPANION_TICKET_CHANCE?row('동료 소환권 1장',COMPANION_TICKET_CHANCE):'')+'</ul><p class="note">각각 독립 추첨 · 직업·부위 랜덤<br>└ 레벨별 오른쪽 숫자 = 한 판에 그 레벨 보스장비가 나올 확률 · 괄호 = 보스장비가 나왔을 때 그 레벨일 확률</p>';
}
function explorationCardNote(t){
 const r=EXPLORATION_REWARDS[t.id],n=key=>explorationRewardCount(r,key),extra=(r.addCube?'<br>에디셔널 큐브 '+n('addCube')+'개 '+pctText(r.addCube):'')+(r.bonusFlame?'<br>추가옵션 불꽃 '+n('bonusFlame')+'개 '+pctText(r.bonusFlame):'');
 const strength=t.linearHp?'보스 체력 1인 '+(66.5e6*t.multiplier/1e8).toFixed(1).replace(/\.0$/,'')+'억 × 인원수 · 입장 열쇠 '+(t.keys||1)+'개':'강도 '+t.multiplier+'배';
 return '<p class="note">'+strength+' · 골드 '+fmt(r.gold)+' G 확정<br>잠재해금 '+n('scroll')+'개 '+pctText(r.scroll)+(r.highCube?' · 블랙 큐브 '+n('highCube')+'개 '+pctText(r.highCube):'')+'<br>'+(r.potentialLock?'잠재잠금석 '+n('potentialLock')+'개 '+pctText(r.potentialLock)+' · ':'')+explorationGearRange(r)+'제 랜덤 보스장비 1개 '+pctText(r.bossGear)+extra+(COMPANION_TICKET_CHANCE?'<br>동료 소환권 1장 '+pctText(COMPANION_TICKET_CHANCE)+' (모든 테마 동일)':'')+'<br>추가 보상은 각각 독립 추첨 · 직업·부위 랜덤 · 무기는 다른 각 부위의 절반 확률</p>';
}
export function explorationLobby(state,room,rooms=[]){
 if(room){const need=explorationKeys(room.tier),hostKeys=room.tier===3||(Number(state.materials?.dungeonKey)||0)>=need,theme=EXPLORATIONS[room.tier],members=room.members.filter(m=>!m.left),scale=room.tier===3?citadelPopulation(members.length):explorationScale(room.tier,members.length);
  return partyRoomView({room,max:4,cover:artURL(theme.map),boss:room.tier!==3?{src:artURL(explorationArt(room.tier,3,true))}:null,eyebrow:'RINGU EXPEDITION · BOSS',title:theme.name,tagline:theme.boss+'의 보스방으로 바로 입장.',head:'링구의 탐험 · 보스방 바로 입장 · 최대 4인',lines:['출발 시 인원 확정 · 전투 중 난이도 하락 없음','모든 인원이 한 번씩 움직이면 전투 시작'],notes:[room.bus?(room.owner===room.me?(!hostKeys?'<span class="exploration-key-warning">🚌 버스 방 · 방장 열쇠 '+need+'개가 필요해요.</span>':'🚌 버스 방 · 방장만 열쇠 '+need+'개 사용 · 클리어 보상은 방장만 받아요'):'🚌 버스 방 · 파티원은 열쇠를 쓰지 않고 보상도 받지 않아요 (방장만 보상)'):room.tier===3?'열쇠 없이 입장':!hostKeys?'<span class="exploration-key-warning">내 던전 열쇠가 '+need+'개 이상 있어야 해요. 파티원 모두 각자 '+need+'개씩 필요하고, 클리어 후 상자를 받을 때 본인 열쇠 '+need+'개가 사용돼요.</span>':'파티원 각자 열쇠 '+need+'개 필요 · 실패·이탈 시 열쇠 유지 · 클리어 상자 받을 때 본인 열쇠 '+need+'개 사용'],scale:'몬스터 체력 '+scale.hp.toFixed(2)+'배 · 공격력 '+scale.attack.toFixed(2)+'배',start:{label:room.owner===room.me&&!hostKeys?'던전 열쇠 '+need+'개 필요':members.length===1?'혼자 탐험 시작':'함께 탐험 시작',disabled:room.owner!==room.me||members.some(m=>!m.ready)||!hostKeys}});}
 const keys=Math.max(0,Number(state.materials?.dungeonKey)||0);
 const waiting=rooms.filter(x=>x.mode==='exploration'&&x.tier!==3&&EXPLORATIONS[x.tier]);
 const stepNo=t=>t.id>3?t.id:t.id+1,man=n=>fmt(Math.round(n/1e4))+'만';
 const summary=t=>{const r=EXPLORATION_REWARDS[t.id];return (t.linearHp?'보스 '+(66.5e6*t.multiplier/1e8).toFixed(1).replace(/\.0$/,'')+'억×인원':'강도 '+t.multiplier+'배')+' · 열쇠 '+explorationKeys(t.id)+' · '+man(r.gold)+' G · '+explorationGearRange(r)+'제 '+(r.bossGear*100).toFixed(0)+'%';};
 const card=t=>{const open=explorationUnlocked(state,t.id),need=explorationKeys(t.id);return '<article class="panel exploration-card'+(open?'':' locked')+'"><img src="'+artURL(t.map)+'" alt="" loading="lazy"><div class="exploration-card-body"><small>'+stepNo(t)+'단계 · '+esc(t.boss)+'</small><h3>'+t.name+'</h3><p class="exploration-card-line">'+summary(t)+'</p><details class="exploration-card-rewards" data-no-currency-art><summary>보상 자세히</summary>'+rewardList(t)+'</details>'+btn(open?(keys>=need?'탐험 준비':'열쇠 '+need+'개 필요'):EXPLORATIONS[explorationPrevious(t.id)].name+' 클리어 필요','explorationCreate',t.id,!open||keys<need)+(open&&t.id!==3?btn('🚌 버스 방 (방장만 열쇠·보상)','explorationBusCreate',t.id,keys<need):'')+'</div></article>';};
 const roomList='<section class="panel pad exploration-rooms"><div class="exploration-rooms-head"><h3>모집 중인 탐험 '+(waiting.length?'<b>'+waiting.length+'</b>':'')+'</h3>'+btn('새로고침','coopList')+'</div>'+(waiting.length?waiting.map(x=>'<div class="daily-row"><span>'+esc(x.name)+' · '+stepNo(EXPLORATIONS[x.tier])+'단계 '+EXPLORATIONS[x.tier].name+'<small>'+x.count+' / 4명</small></span>'+btn(explorationUnlocked(state,x.tier)?'참가':'이전 단계 클리어 필요','coopJoin',x.id,x.count>=4||!explorationUnlocked(state,x.tier))+'</div>').join(''):'<p class="note">모집 중인 탐험이 없어요.</p>')+'</section>';
 return '<section class="exploration-lobby"><header class="panel pad exploration-head"><h2>링구의 탐험</h2><p>던전 열쇠 <b>'+fmt(keys)+'개</b> · 방장만 사용(1~4단계 1개 · 5단계 2개 · 6단계 3개 · 7단계 4개 · 8~10단계 5개) · 실패·이탈 시 유지, 최종 클리어 시 차감</p><details><summary>탐험 규칙</summary><p class="note">출발하면 보스방으로 바로 입장 · 모든 인원이 한 번씩 움직이면 전투 시작<br>이동속도 +60% · 호위 몬스터 3배 · 하트 자동 획득: 먹은 캐릭터 최대 체력 10% 회복<br>혼자 시작 가능 · 최대 4인 · 벽 없는 넓은 보스 전장<br>탐색 180초 · 보스 교전 시작부터 120초<br>쓰러진 동료 곁에서 5초 동안 멈추면 부활 · 최종 보스 처치 후 개인 상자</p></details></header>'+roomList+'<div class="exploration-cards compact">'+EXPLORATIONS.filter(Boolean).slice().reverse().map(card).join('')+'</div></section>';
}
export function explorationHud(host,w){
 const theme=EXPLORATIONS[w.tier],st=w.tier===3?citadelStage(w.floor):null,me=w.members.find(m=>m.id===w.me),alive=w.monsters?.filter(e=>e.hp>0)||[],boss=alive.find(e=>e.boss);
 host.querySelector('.tower-floor-tag').textContent=w.floor+'F';
 host.querySelector('.tower-title-row h3').textContent=st?st.name+' · '+w.floor+' / '+theme.floors+'구역':theme.name+' · 보스방';
 host.querySelector('#tower-clock').textContent=w.status==='won'?'탐험 완료':w.exitOpen?'계단 개방':Math.max(0,Math.ceil((w.floorDeadline-w.tick)/10))+'초';
 host.querySelector('#tower-range').textContent='남은 몬스터 '+alive.length+' · '+w.members.filter(m=>!m.left&&m.hp>0).length+'명 생존';
 host.querySelector('#tower-status').textContent=w.status==='won'?'개인 상자로 이동한 뒤 공격 버튼을 눌러 받으세요.':me.hp<=0?'동료가 곁에서 5초 멈추면 부활할 수 있어요.':w.exitOpen?'미니맵의 초록 계단으로 이동하세요.':boss?(st?CITADEL_BOSSES[st.boss]:theme.boss)+' · 붉은 공격 예고를 피하세요.':'맵의 모든 몬스터를 찾아 처치하세요.';
 host.querySelector('#tower-enemy-hp').textContent=boss?fmt(boss.hp)+' / '+fmt(boss.maxHp):'층 진행 '+(w.exitOpen?'완료':alive.length+'마리');
 host.querySelector('#tower-enemy-bar').style.width=(boss?boss.hp/boss.maxHp:w.hp/Math.max(1,w.maxHp))*100+'%';
 const chest=host.querySelector('#tower-chest');chest.hidden=w.status!=='won';chest.disabled=!w.chest||Math.hypot(me.x-w.chest.x,me.y-w.chest.y)>180;
 chest.textContent=chest.disabled?'개인 상자 가까이 이동하세요':'개인 상자 받고 나가기';
}
export function prepareExplorationArt(tier,image,floor=1){if(tier===3){const st=citadelStage(floor);return Promise.all([citadelAsset('terrain',st.biome),...Array.from({length:32},(_,i)=>citadelAsset('enemy',i)),...Array.from({length:10},(_,i)=>citadelAsset('boss',i)),'exploration/heal-heart-194.webp'].map(src=>image(src).decode()));}return Promise.all([image(EXPLORATIONS[tier].map),image(EXPLORATIONS[tier].arena||'exploration/arena-'+tier+'-196.webp'),image('exploration/terrain-'+tier+'-193.webp'),image('exploration/heal-heart-194.webp'),...Array.from({length:3},(_,i)=>image(explorationArt(tier,i))),image(explorationArt(tier,3,true))].map(im=>im.decode()));}
