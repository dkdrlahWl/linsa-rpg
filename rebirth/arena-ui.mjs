import {tier,arenaPointDelta} from './arena-model.mjs?v=arena-daily-155';
import {ARENA_REWARDS,ARENA_REWARD_MIN_MATCHES,arenaSeasonReward} from './arena-rewards.mjs?v=arena-rewards-167';
import {portraitStyle} from './costume-ui.mjs';
import {prepareArenaEffects,drawArenaEffect} from './arena-effects.mjs?v=arena-transparent-156';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>Math.floor(Number(v)||0).toLocaleString('ko-KR');
const jobs={warrior:'전사',mage:'마법사',archer:'궁수',rogue:'도적',pirate:'해적',priest:'사제'};
const portraitPosition=id=>Math.max(0,['warrior','mage','archer','rogue','pirate'].indexOf(id))*25;
const portrait=(p,extra='')=>`<div class="portrait pvp-portrait ${p.classId==='priest'?'priest-portrait':''} ${extra}" style="${portraitStyle(p.classId,p.costumeId,portraitPosition(p.classId))}" aria-label="${esc(jobs[p.classId]||'모험가')}"></div>`;
const countdown=time=>{const ms=Math.max(0,new Date(time).getTime()-Date.now()),hours=Math.floor(ms/3600000),minutes=Math.floor(ms%3600000/60000);return `${hours}시간 ${String(minutes).padStart(2,'0')}분`;};
const button=(label,action,arg='',extra='')=>`<button class="pvp-button ${extra}" data-action="${action}" data-arg="${esc(arg)}">${label}</button>`;
const heading=(title,sub='')=>`<header class="pvp-title"><span>✦</span><h1>${title}</h1><span>✦</span>${sub?`<small>${sub}</small>`:''}</header>`;
const nav=active=>`<nav class="pvp-tabs" aria-label="아레나 메뉴">${[['home','홈'],['opponents','상대'],['ranking','순위'],['rewards','시즌 보상']].map(([key,label])=>`<button data-action="arenaPage" data-arg="${key}" ${key===active?'class="active" aria-current="page"':''}>${label}</button>`).join('')}</nav>`;
const tierKeys={'언랭크':'unranked','브론즈':'bronze','실버':'silver','골드':'gold','플래티넘':'platinum','다이아':'diamond','마스터':'master','그랜드 마스터':'grandmaster','챌린저':'challenger','챔피언':'champion'};
export const tierArt=t=>`arena-art/tier-${tierKeys[t.name]||'unranked'}-v1.webp`;
export function arenaTierIcon(score,rank){const t=tier(score,rank);return `<span class="rank-arena-icon" data-no-currency-art title="아레나 · ${esc(t.label)}" aria-label="아레나 ${esc(t.label)}"><img src="${tierArt(t)}" alt="" width="26" height="26" loading="lazy">${t.step?`<small>${esc(t.step)}</small>`:''}</span>`;}
const rewardAmount=(key,value)=>`<div class="pvp-reward-amount" data-no-currency-art>${key==='gold'?'<span class="pvp-reward-text-label">골드</span>':`<img src="currencies/${key==='highCube'?'cube-black-v2.png':'cube-prime-v2.png'}" alt=""><span>${key==='highCube'?'블랙 큐브':'프라임 큐브'}</span>`}<strong>${fmt(value)}<small>${key==='gold'?' G':'개'}</small></strong></div>`;
function seasonRewards(data,seasonName,season){
 const t=tier(data.score,data.rank),current=data.seasonReward??arenaSeasonReward(data.score,data.rank);
 const played=Number(data.seasonMatches??((data.wins||0)+(data.losses||0))),needed=ARENA_REWARD_MIN_MATCHES;
 const groups=[...new Set(ARENA_REWARDS.map(r=>r.name))];
 return `${heading(seasonName+' 시즌 보상',season)}<section class="pvp-panel pvp-reward-hero"><div class="pvp-reward-heading"><img src="${tierArt(t)}" alt=""><div><small>현재 티어의 예상 보상</small><h2>${esc(t.label)}</h2><p>시즌 종료 시 최종 티어 기준</p></div></div>${current?`<div class="pvp-reward-bundle">${rewardAmount('gold',current.gold)}${rewardAmount('highCube',current.highCube)}${rewardAmount('primeCube',current.primeCube)}</div>`:'<p class="pvp-reward-unranked">첫 경기를 마치면 예상 보상이 표시됩니다.</p>'}<div class="pvp-reward-eligibility ${played>=needed?'ready':''}"><strong>${played>=needed?'지급 조건 달성':`보상까지 ${needed-played}경기`}</strong><span>이번 시즌 ${fmt(played)} / ${needed}경기 참여</span><div class="pvp-reward-progress"><i style="width:${Math.min(100,played/needed*100)}%"></i></div></div></section><section class="pvp-reward-guide"><h3>매주 도전하고, 시즌 보상을 받으세요</h3><p>매주 월요일 0시 · 한국시간<br>직접 5경기 이상 참여하면 최종 티어 보상 하나를 우편으로 지급합니다.</p><small>하위 티어 보상은 합산하지 않으며, 경기마다 별도 보상은 지급하지 않습니다.</small></section><div class="pvp-reward-catalog">${groups.map(name=>{const entries=ARENA_REWARDS.filter(r=>r.name===name),isCurrent=t.name===name;return `<details class="pvp-panel pvp-reward-group ${isCurrent?'is-current':''}" ${isCurrent?'open':''}><summary><img src="${tierArt({name})}" alt=""><strong>${esc(name)}</strong><span>${isCurrent?'내 티어':entries.length===4?'IV → I':'시즌 순위 보상'}</span><b aria-hidden="true">⌄</b></summary><div class="pvp-reward-table" role="table" aria-label="${esc(name)} 시즌 보상"><div class="pvp-reward-table-head" role="row"><span>등급</span><span>골드</span><span>블랙</span><span>프라임</span></div>${entries.map(r=>`<div class="pvp-reward-row ${current?.label===r.label?'selected':''}" role="row"><strong>${r.step||'보상'}</strong><span>${fmt(r.gold/10000)}만</span><span>${r.highCube}개</span><span>${r.primeCube?r.primeCube+'개':'—'}</span></div>`).join('')}</div>${name==='그랜드 마스터'||name==='챌린저'||name==='챔피언'?`<p class="pvp-reward-rank-rule">2,600점 이상 · ${name==='챔피언'?'전체 1위':name==='챌린저'?'전체 2~3위':'전체 4~10위'}</p>`:''}</details>`;}).join('')}</div>`;
}
const badge=(score,rank)=>{const t=tier(score,rank);return `<span class="pvp-badge" data-no-currency-art style="--tier-color:${t.color}" aria-label="${esc(t.label)}"><img src="${tierArt(t)}" alt="" loading="lazy"><span>${esc(t.name)}${t.step?`<small>${esc(t.step)}</small>`:''}</span></span>`;};
const frameText=(f,name)=>`${name} · ${f.type==='cast'?f.skill+' 시전':f.type==='support'?f.heal?'HP +'+fmt(f.heal):'보호막 +'+fmt(f.shield):`${f.skill||'기본 공격'} · ${fmt(f.damage)} 피해`}`;
export function arenaView(args){return buildArenaView(args).replaceAll('<button','<button data-illustrated="1"');}
const rankingRow=(r)=>`<div class="pvp-ranking-row"><b class="pvp-place">${fmt(r.rank)}</b>${portrait(r)}<div class="pvp-ranking-name"><strong>${esc(r.name)}</strong><small>${esc(jobs[r.classId]||'모험가')} · ${fmt(r.score)}점</small></div>${badge(r.score,r.rank)}</div>`;
const homeRankingRow=r=>`<div class="pvp-home-leader"><b>${fmt(r.rank)}</b>${portrait(r)}<div class="pvp-ranking-name"><strong>${esc(r.name)}</strong><small>${fmt(r.score)}점</small></div>${badge(r.score,r.rank)}</div>`;
export function arenaDock(){return `<nav class="pvp-dock" aria-label="아레나 하단 메뉴">${[['tab','hunt','홈',2],['arenaOpen','','아레나',null],['tab','gear','가방',1],['gameMenu','','메뉴',15]].map(([action,arg,label,icon])=>`<button data-illustrated="1" data-action="${action}" data-arg="${arg}" ${icon===null?'class="active" aria-current="page"':''}>${icon===null?'<img class="pvp-dock-art" src="ui/arena-emblem.svg" alt="">':`<i class="pvp-dock-art" aria-hidden="true" style="background-position:${icon%4*100/3}% ${Math.floor(icon/4)*100/3}%"></i>`}<span>${label}</span></button>`).join('')}</nav>`;}


function buildArenaView({data,page='home',self,battle,frameIndex=0,error=''}){
 if(!data)return `<section class="pvp-screen">${heading('아레나')}<div class="pvp-panel pvp-empty">${error?`<p>아레나 정보를 불러오지 못했어요.</p><small>${esc(error)}</small>${button('다시 불러오기','arenaRetry','','pvp-primary')}`:'아레나 정보를 불러오는 중…'}</div></section>`;
 const week=7*24*3600000,firstSeason=Date.parse('2026-10-05T00:00:00+09:00');
 const parsedStart=Date.parse(data.seasonStart),start=Number.isFinite(parsedStart)?parsedStart:Date.parse(data.seasonEndsAt)-week;
 const seasonName=`S${Math.max(1,1+Math.floor(((Number.isFinite(start)?start:firstSeason)-firstSeason)/week))}`;
 const season= `${seasonName} · 시즌 종료까지 ${countdown(data.seasonEndsAt)}`;
 if(page==='battle'&&battle)return battleView(battle,self,frameIndex);
 if(page==='result'&&battle)return resultView(battle,data);
 const top=(data.top100||[]).slice(0,100);
 const score=data.score;
 let content='';
 if(page==='home'){
   const t=tier(score,data.rank);
   const lower=t.name==='브론즈'?0:t.name==='실버'?400:t.name==='골드'?800:t.name==='플래티넘'?1200:t.name==='다이아'?1600:t.name==='마스터'?2200:2600;
   const upper=t.name==='브론즈'?400:t.name==='실버'?800:t.name==='골드'?1200:t.name==='플래티넘'?1600:t.name==='다이아'?2200:t.name==='마스터'?2600:2600;
   const progress=score===null?0:score>=2600?100:Math.min(100,Math.max(0,(score-lower)/(upper-lower||1)*100));
   content=`${heading('아레나 · '+seasonName,season)}<section class="pvp-rank-hero"><div class="pvp-crest" style="--tier-color:${t.color}"><img src="${tierArt(t)}" alt="${esc(t.name)} 문장" fetchpriority="high"></div><h2>${esc(t.label)}</h2><strong>${score===null?'첫 도전 대기':`${fmt(score)}점`}</strong><div class="pvp-progress"><span style="width:${progress}%"></span></div><small>${score===null?'첫 전투를 마치면 티어가 배정됩니다.':score>=2600?`현재 ${fmt(data.rank)}위 · 점수 상한 없음`:`다음 구간까지 ${fmt(Math.max(0,upper-score))}점`}</small></section><div class="pvp-home-cta">${button('⚔ 상대 선택','arenaPage','opponents','pvp-primary')}</div><div class="pvp-home-grid"><button class="pvp-panel pvp-stat" data-action="arenaPage" data-arg="ranking"><small class="pvp-home-stat-label"><i class="pvp-home-stat-art" aria-hidden="true" style="background-position:0% 100%"></i>현재 순위</small><strong>${data.rank?`${fmt(data.rank)}위`:'언랭크'}</strong></button><button class="pvp-panel pvp-stat" data-action="arenaPage" data-arg="rewards"><small class="pvp-home-stat-label"><i class="pvp-home-stat-art" aria-hidden="true" style="background-position:66.6667% 66.6667%"></i>시즌 보상</small><strong>${arenaSeasonReward(score,data.rank)?fmt(arenaSeasonReward(score,data.rank).gold/10000)+"만 G":"첫 도전 대기"}</strong></button></div><section class="pvp-panel pvp-home-leaders"><div class="pvp-section-head"><h3>상위 랭커</h3><button data-action="arenaPage" data-arg="ranking">전체 순위 ›</button></div><p class="pvp-note">상위 100명 · 매일 0시(한국시간) 갱신</p><div class="pvp-home-leaders-list">${top.slice(0,3).map(homeRankingRow).join('')||'<p class="pvp-note">순위 정보가 없어요.</p>'}</div></section>`;
 }else if(page==='opponents'){
   content=`${heading('상대 선택',season)}<div class="pvp-refresh">상대 갱신까지 <b data-arena-countdown="${esc(data.nextRefreshAt)}">${countdown(data.nextRefreshAt)}</b><small>5분마다 비슷한 점수의 상대 4명이 새로 배정됩니다.</small></div><div class="pvp-opponents">${(data.offers||[]).map(o=>`<article class="pvp-opponent pvp-panel ${o.used?'used':''}">${portrait(o)}<div class="pvp-opponent-info"><h3>${esc(o.name)}</h3><dl><div><dt>직업</dt><dd>${esc(jobs[o.classId]||'모험가')}</dd></div><div><dt>티어</dt><dd>${badge(o.score,o.rank)}</dd></div><div><dt>점수</dt><dd>${fmt(o.score)}점</dd></div><div><dt>기본 전투력</dt><dd>${fmt(o.combatPower)}</dd></div></dl></div>${o.used?'<span class="pvp-fought">도전 완료</span>':button('도전','arenaChallenge',o.id,'pvp-primary')}</article>`).join('')}</div><p class="pvp-note">장비와 능력치가 전투 결과에 반영됩니다. 아레나에서는 직업별 피해·회복·보호막이 조정됩니다. 마스터 미만은 승리 +30 / 패배 −20점, 마스터 이상은 ±25점입니다.</p>`;
 }else if(page==='ranking'){
   content=`${heading('전체 순위',season)}<p class="pvp-note">상위 100명 점수·순위 · 매일 0시 갱신</p><div class="pvp-panel pvp-own-rank"><span>내 순위</span><strong>${data.rank?`${fmt(data.rank)}위`:'언랭크'}</strong><small>${score===null?'첫 전투 후 집계':`${fmt(score)}점 · ${esc(tier(score,data.rank).label)}`}</small></div><div class="pvp-ranking-list pvp-panel"><div class="pvp-section-head"><h3>상위 100위</h3><span>이번 시즌</span></div>${top.map(rankingRow).join('')}</div>`;
 }else if(page==='rewards'){
   content=seasonRewards(data,seasonName,season);
 }else if(page==='history'){
   content=`${heading('전투 기록',season)}<div class="pvp-panel">${(data.history||[]).map(h=>`<div class="pvp-history-row"><b class="${h.battle?.won?'win':'loss'}">${h.battle?.won?'승리':'패배'}</b><span>${esc(h.opponent?.name||'상대')}</span><small>${h.delta>=0?'+':''}${fmt(h.delta)}점</small></div>`).join('')||'<p class="pvp-note">아직 전투 기록이 없어요.</p>'}</div>`;
 }
 return `<section class="pvp-screen ${page==='home'?'pvp-home-screen':''}">${error?`<div class="pvp-panel pvp-load-error"><span>${esc(error)}</span>${button('다시 불러오기','arenaRetry')}</div>`:''}${content}<div class="pvp-history-link"><button data-action="arenaPage" data-arg="history">전투 기록 ›</button></div>${nav(page)}</section>`;
}

function battleView(result,self,index){
 const b=result.battle,frames=b.frames||[],current=frames[Math.max(0,index-1)],leftHp=current?.leftHp??b.leftMaxHp,rightHp=current?.rightHp??b.rightMaxHp;
 const left=result.self||self,right=result.opponent;
 const log=frames.slice(Math.max(0,index-3),index).reverse();
 return `<section class="pvp-screen pvp-battle-screen">${heading('아레나 전투')}<div class="pvp-battle-status">⚔ 자동 전투 중</div><div class="pvp-combatants"><div><strong>${esc(left?.name||'나')}</strong><small>${esc(jobs[left?.classId]||'모험가')} · ${left?.score===null?'언랭크':`${fmt(left?.score)}점`}</small><div class="pvp-health"><i data-arena-shield="left"></i><span data-arena-hp="left" style="width:${leftHp/b.leftMaxHp*100}%"></span></div></div><div><strong>${esc(right?.name||'상대')}</strong><small>${esc(jobs[right?.classId]||'모험가')} · ${fmt(right?.score)}점</small><div class="pvp-health enemy"><i data-arena-shield="right"></i><span data-arena-hp="right" style="width:${rightHp/b.rightMaxHp*100}%"></span></div></div></div><div class="pvp-stage"><div class="pvp-stage-fighter left">${portrait(left,'pvp-fighter')}</div><div class="pvp-stage-hit"></div><div class="pvp-stage-fighter right">${portrait(right,'pvp-fighter')}</div></div><div class="pvp-combat-log"><h3>전투 기록</h3><div data-arena-log>${log.map(f=>`<p class="${f.side===0?'ally':'enemy'}">${esc(frameText(f,f.side===0?left?.name:right?.name))}</p>`).join('')||'<p>전투를 시작합니다.</p>'}</div></div><div class="pvp-battle-controls"><button data-action="arenaSpeed">2배속</button><button data-action="arenaSkip">결과 보기</button></div></section>`;
}
function resultView(result,data){const won=result.battle.won,delta=result.delta??arenaPointDelta(result.scoreBefore,won),score=result.scoreAfter??data.score,before=result.scoreBefore??0,rank=tier(score,data.rank);
 const damage=(result.battle.frames||[]).filter(f=>f.side===0).reduce((n,f)=>n+f.damage,0),skills=(result.battle.frames||[]).filter(f=>f.side===0&&(f.type==='cast'||f.type==='skill'&&!('slot' in f))).length;
 const duration=Math.ceil((result.battle.duration||0)/1000);
 return `<section class="pvp-screen pvp-result-screen"><div class="pvp-result-hero">${portrait(result.self||{},'pvp-result-portrait')}<div class="pvp-result-crown">${won?'❖ 승리! ❖':'⚔ 패배'}</div></div><div class="pvp-panel pvp-result-detail"><h2>${won?'아레나 승리':'다음 전투를 준비하세요'}</h2><p>${badge(score,data.rank)}</p><div class="pvp-result-change"><span>${fmt(before)}점</span><b>→</b><strong>${fmt(score)}점</strong></div><div class="pvp-result-delta ${won?'win':'loss'}">${delta>=0?'+':''}${fmt(delta)}점</div><div class="pvp-result-opponent">${portrait(result.opponent||{})}<span>${esc(result.opponent?.name||'상대')}<small>${esc(jobs[result.opponent?.classId]||'모험가')} · ${fmt(result.opponent?.score)}점</small></span><strong>${won?'제압':'승리'}</strong></div><div class="pvp-result-summary"><div><small>전투 시간</small><b>${Math.floor(duration/60)}:${String(duration%60).padStart(2,'0')}</b></div><div><small>가한 피해</small><b>${fmt(damage)}</b></div><div><small>사용 스킬</small><b>${fmt(skills)}회</b></div></div></div><div class="pvp-result-actions">${button('⚔ 다음 상대','arenaPage','opponents','pvp-primary')}${button('아레나 홈','arenaPage','home')}</div></section>`;
}

export function startArenaReplay(result,onFinish){
 const frames=result?.battle?.frames||[];let index=0,speed=1,stopped=false,timer;const cleanups=new Set(),timeouts=new Set();
 const later=(fn,ms)=>{const id=setTimeout(()=>{timeouts.delete(id);fn();},ms);timeouts.add(id);};
 const add=(stage,node,life=850)=>{stage.append(node);cleanups.add(node);later(()=>{node.remove();cleanups.delete(node);},life/speed);};
 const step=()=>{
  if(stopped)return;
  const f=frames[index++];if(!f){stop();onFinish();return;}
  for(const [side,hp,max,shield] of [['left',f.leftHp,result.battle.leftMaxHp,f.leftShield],['right',f.rightHp,result.battle.rightMaxHp,f.rightShield]]){
   const bar=document.querySelector(`[data-arena-hp="${side}"]`),guard=document.querySelector(`[data-arena-shield="${side}"]`);
   if(bar)bar.style.width=`${Math.max(0,hp/max*100)}%`;
   if(guard){guard.style.width=`${Math.min(100,Math.max(0,(shield||0)/max*100))}%`;guard.setAttribute('aria-label',`보호막 ${fmt(shield)}`);}
  }
  const stage=document.querySelector('.pvp-stage'),profile=f.side===0?result.self:result.opponent,acting=f.side===0?'left':'right';
  if(stage){
   if(f.type==='cast'||f.type==='support'){
    const label=document.createElement('span');label.className=`pvp-skill-callout ${acting}`;label.textContent=f.type==='support'?f.heal?'HP +'+fmt(f.heal):'보호막 +'+fmt(f.shield):f.skill;add(stage,label,1200);
   }
   if(f.type==='cast'||f.type==='skill'){
    const vfx=document.createElement('canvas');
    vfx.className=`pvp-skill-vfx ${acting} ${profile?.classId==='priest'?'holy':''}`;vfx.setAttribute('aria-hidden','true');
    drawArenaEffect(vfx,profile?.classId||'warrior',Math.max(1,f.slot||1));add(stage,vfx,f.type==='cast'?950:450);
   }
   if(f.damage>0){
    stage.classList.remove('pvp-hit-left','pvp-hit-right');void stage.offsetWidth;stage.classList.add(f.side===0?'pvp-hit-right':'pvp-hit-left');
    const number=document.createElement('b');number.className=`pvp-damage-number ${f.side===0?'right':'left'} ${f.crit?'critical':''}`;number.textContent=fmt(f.damage);add(stage,number,650);
   }
  }
  const log=document.querySelector('[data-arena-log]');if(log){const p=document.createElement('p');p.className=f.side===0?'ally':'enemy';p.textContent=frameText(f,profile?.name||'모험가');log.prepend(p);while(log.children.length>3)log.lastElementChild.remove();}
  const wait=frames[index]?Math.max(0,frames[index].at-f.at):550;
  timer=setTimeout(step,Math.min(1500,wait)/speed);
 };
 const stop=()=>{stopped=true;clearTimeout(timer);for(const id of timeouts)clearTimeout(id);for(const node of cleanups)node.remove();timeouts.clear();cleanups.clear();};
 prepareArenaEffects(result).then(()=>{if(!stopped)timer=setTimeout(step,450);});
 return {stop,skip:()=>{stop();onFinish();},speed:()=>{speed=speed===1?2:1;return speed;}};
}
