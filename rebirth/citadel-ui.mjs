import {partyMemberCard} from './party-room.mjs';
import {CITADEL_CONTENT,CITADEL_BIOMES,CITADEL_BOSSES,citadelStage,citadelPopulation,isCitadel} from './citadel-zero.mjs';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(label,action,arg='',off=false)=>`<button data-action="${action}" data-arg="${esc(arg)}" ${off?'disabled data-unavailable':''}>${label}</button>`;
export function citadelLobby(state,room,rooms=[]){
 const members=room?.members.filter(m=>!m.left)||[],scale=citadelPopulation(members.length||1);
 const recruiting=rooms.filter(r=>r.mode==='citadel'||r.mode==='exploration'&&r.tier===3);
 return `<section class="citadel-lobby"><div class="citadel-cover"><img src="${CITADEL_CONTENT.map}" alt="숲에서 암흑성채로 들어가는 네 모험가"><div class="citadel-cover-shade"></div><div class="citadel-cover-title"><small>COOPERATIVE CAMPAIGN · NG 0</small><h1>암흑성채</h1><p>숲을 지나, 성채의 가장 깊은 곳까지.</p></div></div><div class="citadel-entry"><div><b>0단계 · 최대 4인</b><p>8가지 지역 · 21구역 · 6개 보스전</p><small>입장 열쇠 없음 · 제한 시간 없음 · 보스 6마리마다 개인 보상 상자</small><small class="citadel-reward-note">상자: 장비 파편 10개 확정 · 잠재 잠금석/해금 주문서 10~35% · 보스 장비 4~5% (Lv.100~190, 무기 확률 절반)</small></div>${room?button('나가기','coopLeave'):button('원정 준비','citadelCreate')}</div>${room?`<section class="citadel-party"><h2>원정대 ${members.length} / 4</h2><p>몬스터 체력 ${Number(scale.hp.toFixed(2))}배 · 공격력 동일</p><div class="citadel-party-members">${members.map(m=>partyMemberCard(m,{owner:room.owner})).join('')}</div>${button(members.length===1?'혼자 출발':'함께 출발','coopStart','',room.owner!==room.me||members.some(m=>!m.ready))}</section>`:`<section class="citadel-party"><h2>모집 중인 원정대</h2>${button('새로고침','coopList')}${recruiting.length?recruiting.map(r=>`<div class="citadel-recruit"><strong>${esc(r.name)}</strong><span>${r.count} / 4</span>${button('합류','coopJoin',r.id,r.count>=4)}</div>`).join(''):'<p>원정대를 만들거나 친구의 원정대에 합류하세요.</p>'}</section>`}<div class="citadel-region-strip">${CITADEL_BIOMES.map((b,i)=>`<div style="--region:${b.color}"><img src="citadel/enemy-${i*4}-213.webp" alt=""><span>${b.name}</span></div>`).join('')}</div></section>`;
}
export function citadelHud(host,w){
 const stage=citadelStage(w.floor),me=w.members.find(m=>m.id===w.me),bosses=w.monsters.filter(e=>e.boss&&e.hp>0),hp=bosses.reduce((n,e)=>n+e.hp,0),max=bosses.reduce((n,e)=>n+e.maxHp,0),set=(selector,text)=>{const el=host.querySelector(selector);if(el)el.textContent=text;};
 set('.tower-floor-tag','NG 0');set('.tower-title-row h3',stage.name);
 set('#tower-clock',w.status==='won'?'원정 완료':Math.floor(w.tick/600)+'분 '+Math.floor(w.tick/10)%60+'초');
 set('#tower-range',w.members.filter(m=>!m.left&&m.hp>0).length+'명 생존 · '+(stage.boss?CITADEL_BOSSES[stage.boss]:'미지의 길'));
 const rc=w.rewardChest,mineOpen=rc&&(me.citadelChests||[]).includes(rc.boss),chestText=rc&&!mineOpen?'보스 보상 상자 가까이에서 공격해서 여세요.':rc&&w.exitLocked?'동료가 상자를 모두 열면 포탈이 열려요.':'';
 set('#tower-status',w.status==='won'?'최후의 화신을 처치했습니다. 나가기를 눌러 원정을 마치세요.':me.hp<=0?'쓰러졌습니다. 동료의 구조를 기다리세요.':chestText?chestText:bosses.length?CITADEL_BOSSES[stage.boss]+' · 공격 예고를 피하세요.':w.exitOpen?'출구 계단 위에서 1초 서 있으면 다음 구역으로 이동합니다.':'전투 중');
 set('#tower-enemy-hp',bosses.length?Math.ceil(hp).toLocaleString('ko-KR')+' / '+Math.ceil(max).toLocaleString('ko-KR'):stage.name);
 host.classList.toggle('citadel-boss-active',bosses.length>0);
 const status=host.querySelector('#tower-status');if(status)status.hidden=w.status!=='won'&&me.hp>0&&!chestText;
 const bar=host.querySelector('#tower-enemy-bar');if(bar)bar.style.width=(max?hp/max*100:0)+'%';
 const chest=host.querySelector('#tower-chest');if(chest){chest.hidden=true;chest.disabled=true;}
}
