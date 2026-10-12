// Shared waiting-room layout for every boss party (raid, exploration, advancement, citadel):
// cover art with the boss, entry info bar, member cards with arena tier + title.
import {titleBadge} from './title-ui.mjs';
import {arenaTierIcon} from './arena-ui.mjs?v=arena-fit-170';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const CLASS_NAMES={warrior:'전사',archer:'궁수',mage:'마법사',rogue:'도적',pirate:'해적',priest:'사제'};
const fmt=n=>new Intl.NumberFormat('ko-KR').format(Math.round(n||0));

export function partyMemberCard(m,{owner,role}={}){
 const cls=CLASS_NAMES[m.classId]||'모험가',power=m.power?.combatPower;
 return `<div class="party-member ${m.ready?'is-ready':''}"><strong>${owner===m.id?'<i class="party-host" title="방장">♛</i>':''}${esc(m.name)}</strong><div class="party-badges">${arenaTierIcon(m.arenaScore,m.arenaRank)}${titleBadge(m.title,'md')}</div><small>${esc(role?role(m):cls)}${power?' · 전투력 '+fmt(power):''}</small><span>${m.ready?'준비 완료':'불러오는 중'}</span></div>`;
}

// opts: {cover, boss:{src,frames}, eyebrow, title, tagline, head, lines[], notes[], room, max, scale, start:{label,disabled}, role, extra}
export function partyRoomView(o){
 const room=o.room,members=room.members.filter(m=>!m.left);
 const boss=o.boss?.src?`<div class="party-cover-boss" style="background-image:url('${o.boss.src}');background-size:${(o.boss.frames||1)>1?(o.boss.frames*100)+'% 100%':'contain'};background-position:${(o.boss.frames||1)>1?'0 100%':'center bottom'}"></div>`:'';
 return `<section class="citadel-lobby party-room"><div class="citadel-cover"><img src="${o.cover}" alt="">${boss}<div class="citadel-cover-shade"></div><div class="citadel-cover-title"><small>${esc(o.eyebrow||'')}</small><h1>${esc(o.title)}</h1>${o.tagline?`<p>${esc(o.tagline)}</p>`:''}</div></div>
<div class="citadel-entry"><div><b>${o.head||''}</b>${(o.lines||[]).map(l=>`<p>${l}</p>`).join('')}${(o.notes||[]).map(l=>`<small>${l}</small>`).join('')}</div><div class="party-room-actions"><button data-action="coopSync" data-arg="">새로고침</button><button data-action="coopLeave" data-arg="">나가기</button></div></div>
<section class="citadel-party"><h2>원정대 ${members.length} / ${o.max}</h2>${o.scale?`<p>${o.scale}</p>`:''}<div class="citadel-party-members">${members.map(m=>partyMemberCard(m,{owner:room.owner,role:o.role})).join('')}</div>${o.extra||''}<button data-action="coopStart" data-arg="" ${o.start.disabled?'disabled data-unavailable':''}>${o.start.label}</button></section></section>`;
}
