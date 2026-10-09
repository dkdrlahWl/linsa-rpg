import {EXPLORATIONS,explorationArt,explorationPopulation} from './exploration-data.mjs';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>new Intl.NumberFormat('ko-KR').format(n);
const btn=(label,action,arg='',off=false)=>'<button data-action="'+action+'" data-arg="'+esc(arg)+'" '+(off?'disabled':'')+'>'+label+'</button>';
export function explorationLobby(state,room,rooms=[]){
 if(room){const theme=EXPLORATIONS[room.tier],members=room.members.filter(m=>!m.left),scale=explorationPopulation(members.length);return '<section class="panel pad exploration-waiting"><img src="'+theme.map+'" alt="'+theme.name+'"><h2>링구의 탐험 · '+theme.name+'</h2><p>'+theme.floors+'층 · '+members.length+' / 4명</p><p class="note">현재 인원 기준 체력 '+scale.hp.toFixed(2)+'배 · 공격력 '+scale.attack.toFixed(2)+'배<br>출발 시 인원 확정 · 전투 중 난이도 하락 없음</p>'+members.map(m=>'<p>'+esc(m.name)+' · '+(m.ready?'준비 완료':'불러오는 중')+'</p>').join('')+'<div class="actions">'+btn(members.length===1?'혼자 탐험 시작':'함께 탐험 시작','coopStart','',room.owner!==room.me||members.some(m=>!m.ready))+btn('나가기','coopLeave')+'</div></section>';}
 const waiting=rooms.filter(x=>x.mode==='exploration');
 return '<section class="exploration-lobby"><header class="panel pad"><h2>링구의 탐험</h2><p>층마다 모든 몬스터를 처치하고 열린 계단으로 이동하세요.</p><p class="note">혼자 시작 가능 · 최대 4인 · 마지막 층 보스<br>일반 층 제한 180초 · 마지막 층 120초 · 다음 층에서 체력 20% 회복<br>쓰러진 동료 곁에서 5초 동안 멈추면 부활 · 최종 보스 처치 후 개인 상자</p></header><div class="exploration-cards">'+EXPLORATIONS.map(t=>'<article class="panel"><img src="'+t.map+'" alt="'+t.name+'" loading="lazy"><div><small>EXPEDITION '+(t.id+1)+' · '+t.floors+'F</small><h3>'+t.name+'</h3><p>'+t.boss+'</p><p class="note">강도 '+t.multiplier+'배 · 골드 '+fmt(t.gold)+' · 레드 큐브 '+t.cube+' · 블랙 큐브 '+t.highCube+'</p>'+btn('탐험 준비','explorationCreate',t.id)+'</div></article>').join('')+'</div><section class="panel pad"><h3>모집 중인 탐험</h3>'+btn('목록 새로고침','coopList')+(waiting.length?waiting.map(x=>'<div class="daily-row"><span>'+esc(x.name)+' · '+EXPLORATIONS[x.tier].name+'<small>'+x.count+' / 4명</small></span>'+btn('참가','coopJoin',x.id,x.count>=4)+'</div>').join(''):'<p class="note">모집 중인 탐험이 없습니다.</p>')+'</section></section>';
}
export function explorationHud(host,w){
 const theme=EXPLORATIONS[w.tier],me=w.members.find(m=>m.id===w.me),alive=w.monsters?.filter(e=>e.hp>0)||[],boss=alive.find(e=>e.boss);
 host.querySelector('.tower-floor-tag').textContent=w.floor+'F';
 host.querySelector('.tower-title-row h3').textContent=theme.name+' · '+w.floor+' / '+theme.floors+'층';
 host.querySelector('#tower-clock').textContent=w.status==='won'?'탐험 완료':w.exitOpen?'계단 개방':Math.max(0,Math.ceil((w.floorDeadline-w.tick)/10))+'초';
 host.querySelector('#tower-range').textContent='남은 몬스터 '+alive.length+' · '+w.members.filter(m=>!m.left&&m.hp>0).length+'명 생존';
 host.querySelector('#tower-status').textContent=w.status==='won'?'개인 상자로 이동한 뒤 공격 버튼을 눌러 받으세요.':me.hp<=0?'동료가 곁에서 5초 멈추면 부활할 수 있어요.':w.exitOpen?'모든 몬스터 처치! 북쪽 계단으로 이동하세요.':boss?theme.boss+' · 붉은 공격 예고를 피하세요.':'맵의 모든 몬스터를 찾아 처치하세요.';
 host.querySelector('#tower-enemy-hp').textContent=boss?fmt(boss.hp)+' / '+fmt(boss.maxHp):'층 진행 '+(w.exitOpen?'완료':alive.length+'마리');
 host.querySelector('#tower-enemy-bar').style.width=(boss?boss.hp/boss.maxHp:w.hp/Math.max(1,w.maxHp))*100+'%';
 const chest=host.querySelector('#tower-chest');chest.hidden=w.status!=='won';chest.disabled=!w.chest||Math.hypot(me.x-w.chest.x,me.y-w.chest.y)>180;
 chest.textContent=chest.disabled?'개인 상자 가까이 이동하세요':'개인 상자 받고 나가기';
}
export function prepareExplorationArt(tier,image){return Promise.all([image(EXPLORATIONS[tier].map),...Array.from({length:3},(_,i)=>image(explorationArt(tier,i))),image(explorationArt(tier,3,true))].map(im=>im.decode()));}
