// 2026-11-04 전문 직업 화면: 선택 · 제작 · 숙련도
import {currencyIconURL} from './currency-icons.mjs';
import {PROFESSION_SLOTS,professionOpenFor,JOB_MATERIALS,PROFESSIONS,RESOURCE_NAMES,PROFESSION_MAX_LEVEL,PROFESSION_CHANGE_COOLDOWN,PROFESSION_CHANGE_COST,professionById,normalizeProfession,professionXpNeeded,professionCostMultiplier,professionBonusChance,professionGather,recipeCost,recipeMaxCount,resourceCount} from './profession-model.mjs';
const fmt=n=>Math.floor(n||0).toLocaleString('ko-KR');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// 보유량 표기: 1만 이상은 만·억·조로 줄여서 (예: 12.3만, 4.5억, 1조)
const short=n=>{n=Math.floor(n||0);const u=[[1e12,'조'],[1e8,'억'],[1e4,'만']];for(const [v,k] of u)if(n>=v){const x=n/v;return (x>=100?Math.floor(x).toLocaleString('ko-KR'):(Math.floor(x*10)/10).toString())+k;}return fmt(n);};
const bigGold=short;
const pct=x=>Math.round(x*100)+'%';
const GATHER_LABELS={cube:'사냥 레드 큐브',highCube:'링탐 블랙 큐브',diamond:'낚시 다이아',fragment:'사냥 장비 파편'};
// 효과 표기: 드랍률형은 실제 확률, 개수형은 +%
const DROP_RATE={cube:1,fragment:1};
const gatherText=(k,mult)=>DROP_RATE[k]?`드랍률 <b>×${+mult.toFixed(2)}</b>`:`<b>+${Math.round((mult-1)*100)}%</b>`;
const REF_PRICE={highCube:400000,primeCube:1500000,addCube:1000000,dungeonKey:8000000,treasureTicket:2000000,bonusFlame:5000000,companionTicket:4000000,pickupTicket:6000000,potentialLock:4500000,transcendStone:10000000};
const icon=k=>`<img class="prof-ic" src="${currencyIconURL(k)}" alt="" title="${RESOURCE_NAMES[k]||k}">`;
const chip=(k,v)=>`<span class="prof-chip" title="${RESOURCE_NAMES[k]||k} ${v}">${icon(k)}${v}</span>`;
const goldChip=g=>g?`<span class="prof-chip prof-gold">${g>=10000&&g%10000===0?fmt(g/10000)+'만':fmt(g)} G</span>`:'';
const art=id=>`professions/${id}-v1.webp`;
const hero=(id='alchemist')=>`<header class="prof-guild"><img src="${art(id)}" alt=""><div><small>장인의 길</small><h3>모험가 제작 길드</h3><p>나만의 전문 기술로, 새로운 가치를 만들어요.</p></div></header>`;
const left=ms=>{const h=Math.ceil(ms/3600000);return h>=24?Math.ceil(h/24)+'일':h+'시간';};
export function professionView(s,now=Date.now(),counts={}){
 const p=normalizeProfession(s);
 if(!professionOpenFor(s))return `<div class="prof-panel" data-currency-label>${hero()}<p class="prof-lead">전문 직업은 <b>준비 중</b>이에요. 곧 열려요!</p><p class="note">사냥터에서 나오는 직업 재료(마력 정수·고대 지도 조각·심해 진주·원석)는 지금도 모을 수 있고 거래소에서 거래할 수 있어요.</p></div>`;
 if(!p)return `<div class="prof-panel" data-currency-label>${hero()}<p class="prof-lead">네 가지 전문 직업 중 하나를 선택하세요. 재료를 모아 전용 소모품을 <b>횟수 제한 없이</b> 제작하고, 숙련도를 높일 수 있어요.</p><p class="note">직업당 최대 ${PROFESSION_SLOTS}명 · 처음 선택은 무료 · 변경은 7일 쿨타임 + ${fmt(PROFESSION_CHANGE_COST)} G + 숙련도 초기화 · 직업이 없어도 기존 획득은 그대로</p><div class="prof-choose">${PROFESSIONS.map(d=>card(d,s,false,counts)).join('')}</div></div>`;
 const def=professionById(p.id),need=p.level>=PROFESSION_MAX_LEVEL?0:professionXpNeeded(p.level),cool=Math.max(0,p.chosenAt+PROFESSION_CHANGE_COOLDOWN-now);
 return `<div class="prof-panel" data-profession="${def.id}" data-currency-label>${hero(def.id)}<div class="prof-head"><img class="prof-icon" src="${art(def.id)}" alt=""><div><h3>${def.name} <small>Lv.${p.level}</small></h3><p>${esc(def.blurb)}</p><div class="prof-xp"><i style="width:${need?Math.min(100,Math.round(p.xp/need*100)):100}%"></i></div><small>${need?`숙련 ${fmt(p.xp)}/${fmt(need)} · 제작 1회 = 숙련 1 · Lv.10까지 총 1만 회`:'최고 숙련도'} · 누적 제작 ${fmt(p.crafted)}회</small></div></div>
 <div class="prof-perks">${Object.keys(def.gather).map(k=>`<span>${GATHER_LABELS[k]||k} ${gatherText(k,professionGather(s,k))}</span>`).join('')}${def.id==='fisher'?'<span>낚시 입질 <b>3~5초</b> (일반 5~9초)</span>':''}</div>
 <p class="note">숙련도가 오를수록 채집 보너스 증가 (Lv.10에서 Lv.1의 2배) · 제작 비용은 레벨과 무관하게 동일</p>
 ${wallet(s,def)}
 <div class="prof-recipes">${def.recipes.map(r=>recipeCard(s,p,r)).join('')}</div>
 <details class="prof-change"><summary>직업 변경</summary><p class="note">${cool?`변경 가능까지 ${left(cool)} 남음 · `:''}변경 시 ${fmt(PROFESSION_CHANGE_COST)} G 소모, 숙련도 Lv.1로 초기화</p><div class="prof-choose">${PROFESSIONS.filter(d=>d.id!==p.id).map(d=>card(d,s,!!cool,counts)).join('')}</div></details></div>`;
}
function card(d,s,disabled=false,counts={}){
 const jm=JOB_MATERIALS[d.id],n=Number(counts?.[d.id])||0,full=n>=PROFESSION_SLOTS&&!s.isAdmin&&!s.isTester;
 return `<article class="prof-card" data-profession="${d.id}"><div class="prof-card-art"><img src="${art(d.id)}" alt="${d.name} 전용 일러스트" loading="lazy"><span>전문 직업 · ${n}/${PROFESSION_SLOTS}명</span><h4>${d.name}</h4></div><div class="prof-card-body"><p>${esc(d.blurb)}</p><p class="prof-jobmat"><small>제작 1회당 소모</small><span>${icon(jm)}<b>${RESOURCE_NAMES[jm]} 1개</b></span></p><ul>${d.recipes.map(r=>`<li>${icon(Object.keys(r.out)[0])}<b>${r.name}</b><span>${Object.entries(r.cost).map(([k,v])=>chip(k,v)).join('')}${goldChip(r.gold)}</span></li>`).join('')}</ul><small>채집 보너스 (Lv.1 → Lv.10)${Object.entries(d.gather).map(([k,v])=>`<span>${GATHER_LABELS[k]||k} ${DROP_RATE[k]?`×${+(1+v/2).toFixed(2)} → <b>×${+(1+v).toFixed(2)}</b>`:`+${Math.round(v*50)}% → <b>+${Math.round(v*100)}%</b>`}</span>`).join('')}${d.id==='fisher'?'<span>낚시 입질 <b>3~5초</b> (일반 5~9초)</span>':''}</small><button data-action="professionChoose" data-arg="${d.id}" ${disabled||full?'disabled':''}>${full?'정원 마감':normalizeProfession(s)?'이 직업으로 변경':d.name+' 선택'}</button></div></article>`;
}
// 제작창 상단: 이 직업 레시피에 쓰이는 재료(직업 재료 포함) + 골드 보유량
function wallet(s,def){
 const outs=def.recipes.map(r=>Object.keys(r.out)[0]);
 const keys=[JOB_MATERIALS[def.id]];for(const r of def.recipes)for(const k of Object.keys(r.cost))if(!keys.includes(k))keys.push(k);
 return `<div class="prof-wallet"><small>보유 완성품</small><div class="prof-made">${outs.map(k=>`<span>${icon(k)}<i>${RESOURCE_NAMES[k]||k}</i><b>${short(resourceCount(s,k))}</b></span>`).join('')}</div><small>내 제작 재료</small><div>${keys.map(k=>`<span>${icon(k)}<i>${RESOURCE_NAMES[k]||k}</i><b>${short(resourceCount(s,k))}</b></span>`).join('')}<span>${icon('gold')}<i>골드</i><b>${bigGold(s.gold)}</b></span></div></div>`;
}
function recipeCard(s,p,r){
 const unit=recipeCost(r,p.level,1,p.id),max=recipeMaxCount(s,professionById(p.id),r);
 const outKey=Object.keys(r.out)[0];
 const count=1,ref=REF_PRICE[outKey];
 return `<article class="prof-recipe"><div class="prof-recipe-head">${icon(outKey)}<strong>${r.name}</strong><small>보유 ${short(resourceCount(s,outKey))}개</small></div><div class="prof-cost"><div class="pc-head"><span></span><span>재료 · 필요</span><span>보유</span></div>${Object.entries(unit.materials).map(([k,v])=>{const have=resourceCount(s,k);return `<div class="pc-row ${have>=v?'':'short'}">${icon(k)}<span class="pc-need">${RESOURCE_NAMES[k]||k}<b>×${fmt(v)}</b></span><em>${short(have)}</em></div>`;}).join('')}${unit.gold?`<div class="pc-row ${(s.gold||0)>=unit.gold?'':'short'}">${icon('gold')}<span class="pc-need">골드<b>${bigGold(unit.gold)}</b></span><em>${bigGold(s.gold)}</em></div>`:''}</div><div class="prof-actions"><input type="number" inputmode="numeric" min="1" max="1000" step="1" value="${count}" data-recipe-count="${r.id}" aria-label="제작 수량"><button data-action="professionCraft" data-arg="${r.id}" ${max?'':'disabled'}>제작</button><button data-action="professionCraftMax" data-arg="${r.id}" ${max?'':'disabled'}>최대 ${fmt(max)}</button></div><p class="prof-sum" data-recipe-sum="${r.id}">${craftSummary(s,p,r,count)}</p></article>`;
}
export function craftSummary(s,p,r,count){
 const c=recipeCost(r,p.level,Math.max(1,count||1),p.id);
 const mats=Object.entries(c.materials).map(([k,v])=>`${RESOURCE_NAMES[k]||k} ${fmt(v)}`).join(' · ');
 return `${count}개 제작 시 ${mats}${c.gold?` · ${fmt(c.gold)} G`:''} 소모`;
}
