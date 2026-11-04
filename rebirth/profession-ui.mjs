// 2026-11-04 전문 직업 화면: 선택 · 제작 · 숙련도
import {currencyIconURL} from './currency-icons.mjs';
import {PROFESSIONS,RESOURCE_NAMES,PROFESSION_MAX_LEVEL,PROFESSION_CHANGE_COOLDOWN,PROFESSION_CHANGE_COST,professionById,normalizeProfession,professionXpNeeded,professionCostMultiplier,professionBonusChance,professionGather,recipeCost,recipeMaxCount,resourceCount} from './profession-model.mjs';
const fmt=n=>Math.floor(n||0).toLocaleString('ko-KR');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pct=x=>Math.round(x*100)+'%';
const GATHER_LABELS={cube:'레드 큐브 획득',highCube:'블랙 큐브 획득(링탐)',dungeonKey:'낚시 던전 열쇠 드랍',companionTicket:'링탐 동료 소환권 확률',diamond:'낚시 다이아 획득',fishingCasts:'하루 낚시 횟수',bigFish:'대어 확률',fragment:'장비 파편 획득',huntGold:'사냥 골드'};
const REF_PRICE={primeCube:1500000,addCube:1000000,dungeonKey:8000000,treasureTicket:2000000,bonusFlame:5000000,companionTicket:4000000,pickupTicket:6000000,potentialLock:2000000,transcendStone:10000000};
const icon=k=>`<img class="prof-ic" src="${currencyIconURL(k)}" alt="">`;
const left=ms=>{const h=Math.ceil(ms/3600000);return h>=24?Math.ceil(h/24)+'일':h+'시간';};
export function professionView(s,now=Date.now()){
 const p=normalizeProfession(s);
 if(!p)return `<div class="prof-panel"><p class="prof-lead">직업을 하나 고르면 그 직업만 만들 수 있는 소모품을 <b>횟수 제한 없이</b> 제작할 수 있어요. 제작자는 가공업자예요. 남들한테 원재료(파편·큐브·다이아)를 사서 가공해 되파는 구조라, 레시피는 싸고 생산량은 서버 전체를 감당할 만큼 커요.</p><p class="note">처음 선택은 무료 · 변경은 7일 쿨타임 + ${fmt(PROFESSION_CHANGE_COST)} G + 숙련도 초기화 · 직업이 없어도 기존 획득은 그대로</p><div class="prof-choose">${PROFESSIONS.map(d=>card(d,s)).join('')}</div></div>`;
 const def=professionById(p.id),need=p.level>=PROFESSION_MAX_LEVEL?0:professionXpNeeded(p.level),cool=Math.max(0,p.chosenAt+PROFESSION_CHANGE_COOLDOWN-now);
 return `<div class="prof-panel"><div class="prof-head"><span class="prof-icon">${def.icon}</span><div><h3>${def.name} <small>Lv.${p.level}</small></h3><p>${esc(def.blurb)}</p><div class="prof-xp"><i style="width:${need?Math.min(100,Math.round(p.xp/need*100)):100}%"></i></div><small>${need?`숙련 ${p.xp}/${need} · 제작 1회 = 숙련 1`:'최고 숙련도'} · 누적 제작 ${fmt(p.crafted)}회 (추가 제작 ${fmt(p.bonus)}회)</small></div></div>
 <div class="prof-perks"><span>추가 제작 확률 <b>${pct(professionBonusChance(p.level))}</b></span>${Object.entries(def.gather).map(([k,v])=>`<span>${GATHER_LABELS[k]||k} <b>+${Math.round((professionGather(s,k)-1)*100)}%</b></span>`).join('')}</div>
 <p class="note">Lv.10까지: 추가 제작 확률 2% → 20% · 채집 보너스 50% → 100% · 제작 비용은 레벨과 무관하게 동일</p>
 <div class="prof-recipes">${def.recipes.map(r=>recipeCard(s,p,r)).join('')}</div>
 <details class="prof-change"><summary>직업 변경</summary><p class="note">${cool?`변경 가능까지 ${left(cool)} 남음 · `:''}변경 시 ${fmt(PROFESSION_CHANGE_COST)} G 소모, 숙련도 Lv.1로 초기화</p><div class="prof-choose">${PROFESSIONS.filter(d=>d.id!==p.id).map(d=>card(d,s,!!cool)).join('')}</div></details></div>`;
}
function card(d,s,disabled=false){
 return `<article class="prof-card"><h4>${d.icon} ${d.name}</h4><p>${esc(d.blurb)}</p><ul>${d.recipes.map(r=>`<li>${icon(Object.keys(r.out)[0])}<b>${r.name}</b><span>${Object.entries(r.cost).map(([k,v])=>`${RESOURCE_NAMES[k]||k} ${v}`).join(' + ')}${r.gold?` + ${fmt(r.gold/10000)}만 G`:''}</span></li>`).join('')}</ul><small>채집 보너스(Lv.10): ${Object.entries(d.gather).map(([k,v])=>`${GATHER_LABELS[k]||k} +${Math.round(v*100)}%`).join(' · ')}</small><button data-action="professionChoose" data-arg="${d.id}" ${disabled?'disabled':''}>${normalizeProfession(s)?'이 직업으로 변경':'이 직업 선택'}</button></article>`;
}
function recipeCard(s,p,r){
 const unit=recipeCost(r,p.level,1),max=recipeMaxCount(s,professionById(p.id),r);
 const outKey=Object.keys(r.out)[0];
 const count=Math.max(1,Math.min(10,max)),ref=REF_PRICE[outKey];
 return `<article class="prof-recipe"><div class="prof-recipe-head">${icon(outKey)}<strong>${r.name}</strong><small>보유 ${fmt(resourceCount(s,outKey))}개${ref?` · 기준가 ${fmt(ref/10000)}만`:''}</small></div><div class="prof-cost">${Object.entries(unit.materials).map(([k,v])=>`<span class="${resourceCount(s,k)>=v?'':'short'}">${icon(k)}${RESOURCE_NAMES[k]||k} ${v}<em>보유 ${fmt(resourceCount(s,k))}</em></span>`).join('')}${unit.gold?`<span class="${(s.gold||0)>=unit.gold?'':'short'}">💰 ${fmt(unit.gold)} G</span>`:''}</div><div class="prof-actions"><input type="number" inputmode="numeric" min="1" max="1000" step="1" value="${count}" data-recipe-count="${r.id}" aria-label="제작 수량"><button data-action="professionCraft" data-arg="${r.id}" ${max?'':'disabled'}>제작</button><button data-action="professionCraftMax" data-arg="${r.id}" ${max?'':'disabled'}>최대 ${fmt(max)}</button></div><p class="prof-sum" data-recipe-sum="${r.id}">${craftSummary(s,p,r,count)}</p></article>`;
}
export function craftSummary(s,p,r,count){
 const c=recipeCost(r,p.level,Math.max(1,count||1)),chance=professionBonusChance(p.level);
 const mats=Object.entries(c.materials).map(([k,v])=>`${RESOURCE_NAMES[k]||k} ${fmt(v)}`).join(' · ');
 return `${count}개 제작 시 ${mats}${c.gold?` · ${fmt(c.gold)} G`:''} 소모 · 추가 제작 기대 +${(count*chance).toFixed(1)}개`;
}
