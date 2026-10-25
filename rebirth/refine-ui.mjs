import * as D from './data.mjs?v=prime-choice-158-lv300b';
import {BONUS_FLAME,REROLL_STONE,BONUS_TABLE} from './gear-refine.mjs?v=refine4-20261025';
const materialArt=item=>`<img src="${item.art}" alt="" width="38" height="38" style="width:38px;height:38px;object-fit:contain;vertical-align:middle;margin-right:6px">`;
const fmt=n=>Number(n||0).toLocaleString('ko-KR');
const button=(label,action,arg,disabled=false,cls='enhance-primary')=>`<button class="${cls}" data-action="${action}" data-arg="${arg}" ${disabled?'disabled':''}>${label}</button>`;
const LABELS={attack:'공격력',stat:'주스탯',hp:'HP',defense:'방어력'};
const pct=x=>(x*100).toFixed(2).replace(/\.?0+$/,'')+'%';
const statText=(key,v)=>key==='attack'?Number(v).toFixed(1):fmt(Math.floor(v));
const statsWith=(it,patch)=>D.gearAttributes({...it,...patch});

function statsTable(it,before,after){
 return `<div class="refine-stats">${Object.entries(LABELS).map(([key,label])=>{const a=before[key],b=after[key],d=b-a;return `<div><span>${label}</span><b>${statText(key,b)}</b>${Math.abs(d)>=.05?`<small class="${d>0?'up':'down'}">${d>0?'+':''}${statText(key,d)}</small>`:''}</div>`;}).join('')}</div>`;
}
function bonusOdds(){
 const at=p=>BONUS_TABLE.find(r=>r.pct===p).chance,range=(a,b)=>BONUS_TABLE.filter(r=>r.pct>=a&&r.pct<=b).reduce((n,r)=>n+r.chance,0);
 return `<details class="cube-extra"><summary>추가치 확률</summary><p class="note">1%~10% 중 하나가 붙고, 높을수록 훨씬 희귀합니다.<br>${BONUS_TABLE.map(r=>`${r.pct}% ${pct(r.chance)}`).join(' · ')}</p></details>`;
}
function rerollRange(it){
 const tiered=D.isTieredBossGear(it),r=tiered?D.gearStatFullRanges(it):D.gearStatRanges(it),now=D.gearStatRanges(it);
 const row=([key,label])=>{const m=D.gearStatMultiplier(it)*(key==='hp'?D.gearHPMultiplier(it):1);return `<span>${label} <b>${fmt(Math.round(r[key].min*m))}~${fmt(Math.round(r[key].max*m))}</b>${tiered?` <small>(현재 등급 ${fmt(Math.round(now[key].min*m))}~${fmt(Math.round(now[key].max*m))})</small>`:''}</span>`;};
 return `<div class="refine-range-list"><small>재굴림 범위${tiered?' · 등급 '+D.bossTierName({...it,bossTier:0})+' ~ '+D.bossTierName({...it,bossTier:D.bossTierCount(it)-1})+' 전체':''}</small>${Object.entries(LABELS).map(row).join('')}</div>`;
}
export function renderRefinePanel(it,state,protectedReason=''){
 const flames=state.materials.bonusFlame||0,stones=state.materials.rerollStone||0,bonus=Number.isInteger(it.bonusPct)?it.bonusPct:0;
 const base=statsWith(it,{bonusPct:0}),now=D.gearAttributes(it);
 const flameBlock=protectedReason||(flames<1?'추가옵션 불꽃이 부족합니다. 상점 소모품에서 구매할 수 있어요.':'');
 const stoneBlock=protectedReason||(!it.baseStats?'기본 수치가 없는 장비입니다.':stones<1?'기본수치 재련석이 부족합니다. 상점 소모품에서 구매할 수 있어요.':'');
 return `<section class="panel pad refine-panel">
 <h4>추가옵션 <b class="refine-bonus">${bonus?'+'+bonus+'%':'없음'}</b></h4>
 <p class="note">추가옵션은 장비의 공격력·주스탯·HP·방어력 전체에 같은 비율로 붙습니다. (스타포스 포함 장비 능력치 기준)</p>
 ${statsTable(it,base,now)}
 <div class="cube-controls"><p class="cube-wallet" data-no-currency-art>${materialArt(BONUS_FLAME)}${BONUS_FLAME.name} 보유 <b>${fmt(flames)}개</b></p>${button(bonus?'추가옵션 다시 굴리기':'추가옵션 부여','bonusRoll',it.id,!!flameBlock)}</div>
 <p class="enhance-help">${flameBlock||'1개 소모 · 결과를 보고 이전 유지 / 새 결과 적용 선택'}</p>${bonusOdds()}
 <div class="cube-controls"><p class="cube-wallet" data-no-currency-art>${materialArt(REROLL_STONE)}${REROLL_STONE.name} 보유 <b>${fmt(stones)}개</b></p>${button('기본 수치 재굴림','statReroll',it.id,!!stoneBlock)}</div>
 ${it.baseStats?rerollRange(it):''}
 <p class="enhance-help">${stoneBlock||(D.isTieredBossGear(it)?'1개 소모 · 보스 장비 등급까지 다시 추첨 · 가장 낮은 등급 ~ 가장 높은 등급 전체 범위에서 완전 랜덤 · 결과 선택 가능':'1개 소모 · 장비 범위 안에서 완전 랜덤 추첨(모든 수치 같은 확률) · 결과 선택 가능')}</p>
 </section>`;
}
export function renderRefineChoice(it,pending,state){
 const bonus=pending.kind==='bonus',material=bonus?BONUS_FLAME:REROLL_STONE,count=state.materials[material.id]||0;
 const before=D.gearAttributes(it),after=D.gearAttributes({...it,...(bonus?{bonusPct:pending.bonusPct}:{baseStats:pending.baseStats,...(Number.isInteger(pending.bossTier)?{bossTier:pending.bossTier}:{})})});
 const tierName=n=>D.bossTierName({...it,bossTier:n}),head=bonus?`<p class="refine-compare">추가옵션 <b>${pending.previous?'+'+pending.previous+'%':'없음'}</b> → <b class="refine-new">+${pending.bonusPct}%</b></p>`:Number.isInteger(pending.bossTier)?`<p class="refine-compare">기본 수치 재굴림 결과 · 등급 <b>${tierName(pending.previousTier)}</b> → <b class="refine-new">${tierName(pending.bossTier)}</b></p>`:'<p class="refine-compare">기본 수치 재굴림 결과</p>';
 const tierRange=bonus?null:D.gearStatRanges({...it,...(Number.isInteger(pending.bossTier)?{bossTier:pending.bossTier}:{})}),fullRange=bonus?null:(D.isTieredBossGear(it)?D.gearStatFullRanges(it):D.gearStatRanges(it));
 const baseRows=bonus?'':`<div class="refine-stats">${Object.entries(LABELS).map(([key,label])=>{const m=D.gearStatMultiplier(it)*(key==='hp'?D.gearHPMultiplier(it):1),a=pending.previous[key]*m,b=pending.baseStats[key]*m,range=r=>fmt(Math.round(r[key].min*m))+'~'+fmt(Math.round(r[key].max*m));return `<div><span>기본 ${label}</span><b>${statText(key,b)}</b><small class="${b>a?'up':b<a?'down':''}">이전 ${statText(key,a)}</small><small class="refine-range">${Number.isInteger(pending.bossTier)?'이 등급 '+range(tierRange)+' · 전체 ':'범위 '}${range(fullRange)}</small></div>`;}).join('')}</div>`;
 return `<div class="cube-choice-compact"><div class="cube-choice-controls" role="group" aria-label="결과 선택">
 ${button('이전 유지','refineChoose','no',false,'enhance-secondary')}${button('새 결과 적용','refineChoose','yes')}
 ${button('유지 후 다시','refineChooseRepeat','no',count<1,'enhance-secondary')}${button('적용 후 다시','refineChooseRepeat','yes',count<1)}
 </div>${head}${baseRows}<h4 class="refine-sub">적용 시 장비 능력치</h4>${statsTable(it,before,after)}
 <p class="enhance-help" data-no-currency-art>${materialArt(material)}결과 선택 무료 · 다시 하면 ${material.name} 1개 소모 · 남은 ${material.name} <b>${fmt(count)}개</b></p></div>`;
}
