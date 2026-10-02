import {RAID_ENCOUNTERS} from './raid-content.mjs?v=priest-potential-83';
import {raidWeeklyStatus} from './raid-rewards.mjs?v=fifth-aim-120';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const btn=(label,action,arg='',disabled=false)=>`<button data-action="${action}" data-arg="${esc(arg)}" ${disabled?'disabled':''}>${label}</button>`;
function rewardDetails(raid){
 const extras=[['highCube','블랙 큐브'],['primeCube','프라임 큐브'],['scroll','잠재 해금 주문서']];
 return `<p>확정 보상 · 레드 큐브 ${raid.cubes}개 · 장비 파편 ${raid.fragment}개 · ${raid.gold.toLocaleString('ko-KR')} G</p><p>${extras.map(([key,name])=>`${name} ${raid[key]}개 · ${Math.round(raid[key+'Chance']*100)}%`).join('<br>')}</p><p><strong>Lv.${raid.level} 랜덤 보스 장비 1개 · 60%</strong><br>전체 직업 장비 · 직업과 부위 무작위 · 개인별 추첨</p><small>항목별 독립 추첨 · 개인별 보상 지급</small>`;
}
export function raidLobby(state,room,rooms=[]){
 const weekly=raidWeeklyStatus(state),progress=`이번 주 개인 보상 ${weekly.used}/${weekly.limit}회 · ${weekly.remaining?`남은 보상 ${weekly.remaining}회`:'보상 소진 · 연습 가능'}`;
 const rules='모든 레이드 보스 합산 계정당 주 3회 · 같은 보스 반복 가능<br>월요일 00시(한국 시간) 초기화 · 개인 상자 보상 수령 시 차감 · 실패 시 차감 없음';
 if(room){
  const r=RAID_ENCOUNTERS[room.tier],ready=room.members.every(m=>m.ready),members=room.members.filter(m=>!m.left);
  return `<section class="panel pad raid-waiting"><p class="eyebrow">SACRED EXPEDITION</p><h2>${r.name}</h2><p>6인 기준 고정 난이도 · ${members.length}/8명 · 레벨 제한 없음</p><p class="note">${r.guide}<br>제한 5분 · 전투 중 부활 없음</p><p><strong>${progress}</strong></p><p class="note">${rules}</p><div class="raid-members">${members.map(m=>`<div><strong>${esc(m.name)}</strong><span>${m.classId==='priest'?'사제 · 지원':'공격대원'} · ${m.ready?'준비 완료':'준비 중'}</span></div>`).join('')}</div><div class="actions">${btn('공격대 출발','coopStart','',room.owner!==room.me||!ready)}${btn('새로고침','coopSync')}${btn('나가기','coopLeave')}</div></section>`;
 }
 const open=rooms.filter(r=>r.mode==='raid');
 return `<section class="panel pad"><p class="eyebrow">RAID · SIX PLAYER BALANCE</p><h2>성역 원정대</h2><p>권장 장비 60·100·150·200레벨 · 입장 레벨 제한 없음<br>최대 8명 · 6인 기준 난이도 · 5분 제한</p><p><strong>${progress}</strong></p><p class="note">${rules}<br>횟수 소진 후에도 보상 없이 도전 가능<br>치유로 침식 정화 · 보호막으로 전체 폭발 대응 · 탄막과 장판 회피</p><h3>모집 중</h3>${btn('목록 새로고침','coopList')}${open.length?open.map(r=>`<div class="daily-row"><span>${esc(r.name)} · ${RAID_ENCOUNTERS[r.tier]?.name||''}<small>${r.count}/8명</small></span>${btn('참가','coopJoin',r.id,r.count>=8)}</div>`).join(''):'<p class="note">모집 중인 원정대가 없습니다. 3초마다 갱신합니다.</p>'}</section><div class="raid-cards">${RAID_ENCOUNTERS.map(r=>`<article class="panel raid-card" style="--raid-map:url('tower/${r.map}.webp')"><div class="raid-art"><img src="tower/raid-boss-${r.id}-portrait.webp" alt="${r.name}"></div><div class="pad"><small>권장 Lv.${r.level} · ${r.arena}</small><h3>${r.name}</h3><p>${r.guide}</p><p class="note">HP ${r.hp.toLocaleString('ko-KR')} · 사제의 힐·보호막이 필요한 고난도 전투</p>${btn('원정대 만들기','raidCreate',r.id)}<details><summary>개인 보상 · 수량과 확률</summary>${rewardDetails(r)}</details></div></article>`).join('')}</div>`;
}
