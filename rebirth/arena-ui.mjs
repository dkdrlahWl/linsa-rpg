import {tier} from './arena-model.mjs?v=arena-polish-148';
import {portraitStyle} from './costume-ui.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>Math.floor(Number(v)||0).toLocaleString('ko-KR');
const jobs={warrior:'전사',mage:'마법사',archer:'궁수',rogue:'도적',pirate:'해적',priest:'사제'};
const portraitPosition=id=>Math.max(0,['warrior','mage','archer','rogue','pirate'].indexOf(id))*25;
const portrait=(p,extra='')=>`<div class="portrait pvp-portrait ${p.classId==='priest'?'priest-portrait':''} ${extra}" style="${portraitStyle(p.classId,p.costumeId,portraitPosition(p.classId))}" aria-label="${esc(jobs[p.classId]||'모험가')}"></div>`;
const countdown=time=>{const ms=Math.max(0,new Date(time).getTime()-Date.now()),hours=Math.floor(ms/3600000),minutes=Math.floor(ms%3600000/60000);return `${hours}시간 ${String(minutes).padStart(2,'0')}분`;};
const button=(label,action,arg='',extra='')=>`<button class="pvp-button ${extra}" data-action="${action}" data-arg="${esc(arg)}">${label}</button>`;
const heading=(title,sub='')=>`<header class="pvp-title"><span>✦</span><h1>${title}</h1><span>✦</span>${sub?`<small>${sub}</small>`:''}</header>`;
const nav=active=>`<nav class="pvp-tabs" aria-label="아레나 메뉴">${[['home','홈'],['opponents','상대'],['ranking','순위'],['rewards','시즌 보상']].map(([key,label])=>`<button data-action="arenaPage" data-arg="${key}" ${key===active?'class="active" aria-current="page"':''}>${label}</button>`).join('')}</nav>`;
const tierKeys={'언랭크':'unranked','브론즈':'bronze','실버':'silver','골드':'gold','플래티넘':'platinum','다이아':'diamond','마스터':'master','그랜드 마스터':'grandmaster','챌린저':'challenger'};
export const tierArt=t=>`arena-art/tier-${tierKeys[t.name]||'unranked'}-v1.webp`;
const badge=(score,rank)=>{const t=tier(score,rank);return `<span class="pvp-badge" style="--tier-color:${t.color}" aria-label="${esc(t.label)}"><img src="${tierArt(t)}" alt="" loading="lazy"><span>${esc(t.name)}${t.step?`<small>${esc(t.step)}</small>`:''}</span></span>`;};
const frameText=(f,name)=>`${name} · ${f.type==='cast'?f.skill+' 시전':f.type==='support'?f.heal?'HP +'+fmt(f.heal):'보호막 +'+fmt(f.shield):`${f.skill||'기본 공격'} · ${fmt(f.damage)} 피해`}`;
export function arenaView(args){return buildArenaView(args).replaceAll('<button','<button data-illustrated="1"');}
const rankingRow=(r)=>`<div class="pvp-ranking-row"><b class="pvp-place">${fmt(r.rank)}</b>${portrait(r)}<div class="pvp-ranking-name"><strong>${esc(r.name)}</strong><small>${esc(jobs[r.classId]||'모험가')} · ${fmt(r.score)}점</small></div>${badge(r.score,r.rank)}</div>`;

function buildArenaView({data,page='home',self,battle,frameIndex=0,error=''}){
 if(!data)return `<section class="pvp-screen">${heading('아레나')}<div class="pvp-panel pvp-empty">${error?`<p>아레나 정보를 불러오지 못했어요.</p><small>${esc(error)}</small>${button('다시 불러오기','arenaRetry','','pvp-primary')}`:'아레나 정보를 불러오는 중…'}</div></section>`;
 const season= `시즌 종료까지 ${countdown(data.seasonEndsAt)}`;
 if(page==='battle'&&battle)return battleView(battle,self,frameIndex);
 if(page==='result'&&battle)return resultView(battle,data);
 const top=(data.top100||[]).slice(0,100);
 const score=data.score;
 let content='';
 if(page==='home'){
   const t=tier(score,data.rank);
   const lower=t.name==='브론즈'?0:t.name==='실버'?400:t.name==='골드'?800:t.name==='플래티넘'?1200:t.name==='다이아'?1600:t.name==='마스터'?2200:t.name==='그랜드 마스터'?2600:3000;
   const upper=t.name==='브론즈'?400:t.name==='실버'?800:t.name==='골드'?1200:t.name==='플래티넘'?1600:t.name==='다이아'?2200:t.name==='마스터'?2600:t.name==='그랜드 마스터'?3000:3000;
   const progress=score===null?0:Math.min(100,Math.max(0,(score-lower)/(upper-lower||1)*100));
   content=`${heading('아레나',season)}<section class="pvp-rank-hero"><div class="pvp-crest" style="--tier-color:${t.color}"><img src="${tierArt(t)}" alt="${esc(t.name)} 문장" fetchpriority="high"></div><h2>${esc(t.label)}</h2><strong>${score===null?'첫 도전 대기':`${fmt(score)}점`}</strong><div class="pvp-progress"><span style="width:${progress}%"></span></div><small>${score===null?'첫 전투를 마치면 티어가 배정됩니다.':t.name==='챌린저'?'현재 최고 티어':`다음 구간까지 ${fmt(Math.max(0,upper-score))}점`}</small></section><div class="pvp-home-cta">${button('⚔ 상대 선택','arenaPage','opponents','pvp-primary')}</div><div class="pvp-home-grid"><button class="pvp-panel pvp-stat" data-action="arenaPage" data-arg="ranking"><small>🏆 현재 순위</small><strong>${data.rank?`${fmt(data.rank)}위`:'언랭크'}</strong></button><button class="pvp-panel pvp-stat" data-action="arenaPage" data-arg="rewards"><small>🎁 시즌 보상</small><strong>추후 공개</strong></button></div><section class="pvp-panel"><div class="pvp-section-head"><h3>상위 랭커</h3><button data-action="arenaPage" data-arg="ranking">전체 순위 ›</button></div>${top.slice(0,3).map(rankingRow).join('')||'<p class="pvp-note">순위 정보가 없어요.</p>'}</section>`;
 }else if(page==='opponents'){
   content=`${heading('상대 선택',season)}<div class="pvp-refresh">상대 갱신까지 <b data-arena-countdown="${esc(data.nextRefreshAt)}">${countdown(data.nextRefreshAt)}</b><small>2시간마다 4명이 새로 배정됩니다.</small></div><div class="pvp-opponents">${(data.offers||[]).map(o=>`<article class="pvp-opponent pvp-panel ${o.used?'used':''}">${portrait(o)}<div class="pvp-opponent-info"><h3>${esc(o.name)}</h3><dl><div><dt>직업</dt><dd>${esc(jobs[o.classId]||'모험가')}</dd></div><div><dt>티어</dt><dd>${badge(o.score,o.rank)}</dd></div><div><dt>점수</dt><dd>${fmt(o.score)}점</dd></div><div><dt>전투력</dt><dd>${fmt(o.combatPower)}</dd></div></dl></div>${o.used?'<span class="pvp-fought">도전 완료</span>':button('도전','arenaChallenge',o.id,'pvp-primary')}</article>`).join('')}</div><p class="pvp-note">장비와 능력치가 전투 결과에 반영됩니다. 전투는 자동으로 진행됩니다.</p>`;
 }else if(page==='ranking'){
   content=`${heading('전체 순위',season)}<div class="pvp-panel pvp-own-rank"><span>내 순위</span><strong>${data.rank?`${fmt(data.rank)}위`:'언랭크'}</strong><small>${score===null?'첫 전투 후 집계':`${fmt(score)}점 · ${esc(tier(score,data.rank).label)}`}</small></div><div class="pvp-ranking-list pvp-panel"><div class="pvp-section-head"><h3>상위 100위</h3><span>이번 시즌</span></div>${top.map(rankingRow).join('')}</div>`;
 }else if(page==='rewards'){
   content=`${heading('시즌 보상',season)}<div class="pvp-panel pvp-season-panel"><div class="pvp-gift">🎁</div><h2>시즌 보상</h2><p>보상 내용은 추후 공개됩니다.</p><div class="pvp-reward-placeholder" aria-label="시즌 보상 미정"></div><small>7일마다 새 시즌이 시작됩니다.</small></div>`;
 }else if(page==='history'){
   content=`${heading('전투 기록',season)}<div class="pvp-panel">${(data.history||[]).map(h=>`<div class="pvp-history-row"><b class="${h.battle?.won?'win':'loss'}">${h.battle?.won?'승리':'패배'}</b><span>${esc(h.opponent?.name||'상대')}</span><small>${h.delta>=0?'+':''}${fmt(h.delta)}점</small></div>`).join('')||'<p class="pvp-note">아직 전투 기록이 없어요.</p>'}</div>`;
 }
 return `<section class="pvp-screen">${error?`<div class="pvp-panel pvp-load-error"><span>${esc(error)}</span>${button('다시 불러오기','arenaRetry')}</div>`:''}${content}<div class="pvp-history-link"><button data-action="arenaPage" data-arg="history">전투 기록 ›</button></div>${nav(page)}</section>`;
}

function battleView(result,self,index){
 const b=result.battle,frames=b.frames||[],current=frames[Math.max(0,index-1)],leftHp=current?.leftHp??b.leftMaxHp,rightHp=current?.rightHp??b.rightMaxHp;
 const left=result.self||self,right=result.opponent;
 const log=frames.slice(Math.max(0,index-3),index).reverse();
 return `<section class="pvp-screen pvp-battle-screen">${heading('아레나 전투')}<div class="pvp-battle-status">⚔ 자동 전투 중</div><div class="pvp-combatants"><div><strong>${esc(left?.name||'나')}</strong><small>${esc(jobs[left?.classId]||'모험가')} · ${left?.score===null?'언랭크':`${fmt(left?.score)}점`}</small><div class="pvp-health"><i data-arena-shield="left"></i><span data-arena-hp="left" style="width:${leftHp/b.leftMaxHp*100}%"></span></div></div><div><strong>${esc(right?.name||'상대')}</strong><small>${esc(jobs[right?.classId]||'모험가')} · ${fmt(right?.score)}점</small><div class="pvp-health enemy"><i data-arena-shield="right"></i><span data-arena-hp="right" style="width:${rightHp/b.rightMaxHp*100}%"></span></div></div></div><div class="pvp-stage"><div class="pvp-stage-fighter left">${portrait(left,'pvp-fighter')}</div><div class="pvp-stage-hit"></div><div class="pvp-stage-fighter right">${portrait(right,'pvp-fighter')}</div></div><div class="pvp-combat-log"><h3>전투 기록</h3><div data-arena-log>${log.map(f=>`<p class="${f.side===0?'ally':'enemy'}">${esc(frameText(f,f.side===0?left?.name:right?.name))}</p>`).join('')||'<p>전투를 시작합니다.</p>'}</div></div><div class="pvp-battle-controls"><button data-action="arenaSpeed">2배속</button><button data-action="arenaSkip">결과 보기</button></div></section>`;
}
function resultView(result,data){const won=result.battle.won,delta=result.delta??(won?120:-80),score=result.scoreAfter??data.score,before=result.scoreBefore??0,rank=tier(score,data.rank);
 const damage=(result.battle.frames||[]).filter(f=>f.side===0).reduce((n,f)=>n+f.damage,0),skills=(result.battle.frames||[]).filter(f=>f.side===0&&(f.type==='cast'||f.type==='skill'&&!('slot' in f))).length;
 const duration=Math.ceil((result.battle.duration||0)/1000);
 return `<section class="pvp-screen pvp-result-screen"><div class="pvp-result-hero">${portrait(result.self||{},'pvp-result-portrait')}<div class="pvp-result-crown">${won?'❖ 승리! ❖':'⚔ 패배'}</div></div><div class="pvp-panel pvp-result-detail"><h2>${won?'아레나 승리':'다음 전투를 준비하세요'}</h2><p>${badge(score,data.rank)}</p><div class="pvp-result-change"><span>${fmt(before)}점</span><b>→</b><strong>${fmt(score)}점</strong></div><div class="pvp-result-delta ${won?'win':'loss'}">${delta>=0?'+':''}${fmt(delta)}점</div><div class="pvp-result-opponent">${portrait(result.opponent||{})}<span>${esc(result.opponent?.name||'상대')}<small>${esc(jobs[result.opponent?.classId]||'모험가')} · ${fmt(result.opponent?.score)}점</small></span><strong>${won?'제압':'승리'}</strong></div><div class="pvp-result-summary"><div><small>전투 시간</small><b>${Math.floor(duration/60)}:${String(duration%60).padStart(2,'0')}</b></div><div><small>가한 피해</small><b>${fmt(damage)}</b></div><div><small>사용 스킬</small><b>${fmt(skills)}회</b></div></div></div><div class="pvp-result-actions">${button('⚔ 다음 상대','arenaPage','opponents','pvp-primary')}${button('아레나 홈','arenaPage','home')}</div></section>`;
}

const effectArt=(cls,slot)=>{
 const col=Math.max(0,['warrior','mage','archer','rogue','pirate'].indexOf(cls));
 if(cls==='priest')return {url:`tower/priest-skill-${slot}-v2.png`,cols:4,rows:1,col:0,row:0};
 if(slot===5)return {url:`tower/fifth-${cls}-v1.webp`,cols:2,rows:2,col:1,row:1};
 return {url:slot===4?'tower/fourth-job-atlas.webp':slot===3?'tower/third-job-atlas.webp':slot===2?'tower/second-sequence-atlas-v1.png':'tower/second-job-atlas.webp',cols:5,rows:slot===4?1:slot===2?3:4,col,row:slot===4?0:2};
};
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
    const art=effectArt(profile?.classId||'warrior',Math.max(1,f.slot||1)),vfx=document.createElement('div');
    vfx.className=`pvp-skill-vfx ${acting} ${profile?.classId==='priest'?'holy':''}`;vfx.style.backgroundImage=`url('${art.url}')`;vfx.style.backgroundSize=`${art.cols*100}% ${art.rows*100}%`;vfx.style.backgroundPosition=`${art.cols>1?art.col/(art.cols-1)*100:0}% ${art.rows>1?art.row/(art.rows-1)*100:0}%`;add(stage,vfx,f.type==='cast'?950:450);
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
 timer=setTimeout(step,450);
 return {stop,skip:()=>{stop();onFinish();},speed:()=>{speed=speed===1?2:1;return speed;}};
}
