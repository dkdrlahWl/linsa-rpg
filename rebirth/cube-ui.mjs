import * as D from './data.mjs?v=cube-three-1';
const fmt=n=>Number(n||0).toLocaleString('ko-KR');
const pct=n=>(n*100).toFixed(6).replace(/\.?0+$/,'')+'%';
const button=(label,action,arg,disabled=false,cls='enhance-primary')=>`<button class="${cls}" data-action="${action}" data-arg="${arg}" ${disabled?'disabled':''}>${label}</button>`;
export const optionLabel=line=>`${D.OPTIONS[line.key]||line.key} +${line.value}${D.optionUnit(line.key)}`;
export function potentialPanel(item,label='현재 잠재능력'){
 return `<section class="option-panel rarity-${item.grade}"><div class="option-heading"><span>${label}</span><b>${item.lines.length?D.RARITIES[item.grade]:'미개방'}</b></div><div class="option-lines">${Array.from({length:3},(_,i)=>{const l=item.lines[i];return `<div class="option-line ${l?'grade-color-'+l.grade:'empty-line'}"><span class="line-index">0${i+1}</span><span>${l?`<small class="line-grade">${D.RARITIES[l.grade]}</small>${D.OPTIONS[l.key]}`:'잠재 슬롯 미개방'}</span><strong>${l?'+'+l.value+D.optionUnit(l.key):'—'}</strong></div>`;}).join('')}</div></section>`;
}
export function cubeOdds(kind,item,grade=item.grade){
 const c=D.CUBES[kind];if(!c||grade<2||grade>c.maxGrade)return '';
 const table=D.cubeTable(kind,item,grade),rates=D.cubeLineRates(kind,grade);
 return `<details class="cube-probabilities"><summary>${D.RARITIES[grade]} 옵션별 실제 등장 확률</summary><p class="note">공식 표에서 이 게임에 없는 효과를 제외하고, 각 옵션 등급 안에서 확률을 재분배했습니다. 아래 확률은 이 게임의 실제 추첨 확률입니다.${table.level!==item.level?` 이 부위의 Lv.${item.level} 공식 표가 없어 가장 가까운 Lv.${table.level} 표를 적용합니다.`:''}</p>${table.rows.map((pool,i)=>`<details><summary>${i+1}번째 줄${c.prime&&i===0?' · 기존 옵션 고정':''}</summary>${c.prime&&i===0?'첫 줄은 다시 추첨하지 않습니다.':`<table><thead><tr><th>등급 · 옵션</th><th>확률</th></tr></thead><tbody>${['current','lower'].flatMap(group=>(pool[group]||[]).map(r=>`<tr><td>${D.RARITIES[grade-(group==='lower'?1:0)]} · ${optionLabel(r)}</td><td>${pct(r.weight*(group==='current'?rates[i]:1-rates[i]))}</td></tr>`)).join('')}</tbody></table>`}</details>`).join('')}<p class="note">기존과 세부 옵션이 모두 같으면 전체를 다시 추첨합니다. 표는 이 재추첨 조건 적용 전 확률입니다.</p><a href="https://maplestory.nexon.com/Guide/OtherProbability/cube/${c.table}" target="_blank" rel="noopener">메이플 공식 원본 확률표</a></details>`;
}
export function renderCubePanel(it,state,kind,lastResult,protectedReason=''){
 const opened=it.lines.length>0,c=D.CUBES[kind]||D.CUBES.cube,key=opened?kind:'scroll',cost=opened?D.cubeCost(kind,it):500;
 const invalid=opened&&(it.grade>c.maxGrade||c.prime&&(it.grade!==5||it.lines.length<2));
 const blocked=protectedReason||(invalid?(c.prime?'레전더리 등급의 2줄 이상 장비가 필요합니다.':'이 큐브로 재설정할 수 없는 등급입니다.'):(state.materials[key]||0)<1?'재료가 부족합니다.':state.gold<cost?'골드가 부족합니다.':'');
 const limit=c.pity[it.grade],failures=state.cubePity?.[kind+':'+it.grade]||0;
 return `<div class="enhance-intro"><span>POTENTIAL</span><small>장비 등급 · 옵션 재설정</small></div>${lastResult?.id===it.id?`<div class="enhance-result success" role="status"><strong>${lastResult.up?'등급 상승 결과를 확인하세요':'잠재능력을 재설정했습니다'}</strong></div>`:''}${potentialPanel(it)}
 ${opened?`<div class="cube-picker maple-cube-picker" role="group" aria-label="사용할 큐브 선택">${Object.entries(D.CUBES).map(([k,r])=>`<button class="cube-card ${kind===k?'selected':''}" data-action="cubeKind" data-arg="${k}" aria-pressed="${kind===k}"><span class="cube-symbol cube-symbol-${k}">◇</span><span><strong>${r.name}</strong><small>${r.prime?'첫 줄 고정 · 나머지 재설정':r.choose?'이전 / 이후 선택':'새 옵션 즉시 적용'}</small><b>보유 ${fmt(state.materials[k])}개</b></span></button>`).join('')}</div>
 <p class="cube-chance">장비 전체 등급: <b>${D.RARITIES[it.grade]}</b><br>${invalid?'사용 등급 제한':it.grade===c.maxGrade?'등급 유지':`${D.RARITIES[it.grade]} → ${D.RARITIES[it.grade+1]} <b>${pct(c.up[it.grade])}</b>`}${limit?`<br>등급 상승 연속 실패 ${failures} / ${limit} · ${failures>=limit?'다음 사용은 등급 상승 확정':limit-failures+'회 더 실패하면 다음 사용은 확정'}`:''}</p>
 ${!invalid?`<p class="note">현재 등급 옵션: ${D.cubeLineRates(kind,it.grade).map((r,i)=>`${i+1}줄 ${pct(r)}`).join(' · ')}<br>나머지는 한 단계 낮은 등급의 옵션입니다.</p>`:''}`:'<p class="note">주문서로 레어 잠재능력을 개방합니다. 이 게임의 개방 확률: 1줄 70% · 2줄 27% · 3줄 3%. 확장석으로 최대 3줄까지 열 수 있습니다.</p>'}
 <p class="enhance-wallet">${D.MATERIALS[key]} ${fmt(state.materials[key])}개 · 필요 1개${cost?' + '+fmt(cost)+' G':''}</p>
 ${button(opened?c.name+' 사용하기':'잠재능력 개방하기',opened?'cubeUse':'potential',it.id,!!blocked)}
 <p class="enhance-help">${blocked||(opened?(c.choose?'이전/이후 중 등급과 옵션을 함께 선택합니다.':c.prime?'첫 줄은 보존되고 나머지 결과는 즉시 적용됩니다.':'새 결과가 즉시 적용됩니다. 이전 옵션으로 되돌릴 수 없습니다.'):'')}</p>
 ${opened&&!invalid?cubeOdds(kind,it)+((it.grade<c.maxGrade&&!c.prime)?cubeOdds(kind,it,it.grade+1):''):''}
 ${opened&&it.lines.length<3?`<details class="expand-options"><summary>잠재 슬롯 확장 · ${it.lines.length}/3줄</summary><p>확장석 ${it.lines.length===1?1:3}개 + 2,000 G · 기존 옵션 유지</p>${button('슬롯 확장','expand',it.id,!!protectedReason||state.materials.expand<(it.lines.length===1?1:3)||state.gold<2000,'enhance-secondary')}</details>`:''}`;
}
export function cubeGuide(){
 return `<div class="panel pad"><h3>잠재능력 · 큐브 3종</h3><p>레어 → 에픽 → 유니크 → 레전더리. 장비 전체 등급은 한 번에 한 단계씩 상승합니다. 옵션의 줄별 등급은 매번 새로 추첨합니다.</p><p>현재 게임에 있는 효과만 사용하며 부위·레벨·큐브별 공식 표에서 제외된 효과의 확률을 재분배합니다. 옵션 수치는 공식 표의 고정값입니다. 장비의 큐브 화면에서 실제 확률을 확인하세요.</p><table><tr><th>큐브</th><th>레어 → 에픽</th><th>에픽 → 유니크</th><th>유니크 → 레전더리</th></tr>${Object.entries(D.CUBES).map(([k,c])=>`<tr><td>${c.name}</td>${[2,3,4].map(g=>`<td>${c.prime?'—':g<c.maxGrade?pct(c.up[g]):'—'}</td>`).join('')}</tr>`).join('')}</table><p>레드: 전체 재설정 · 블랙: 이전/이후 선택 · 프라임: 레전더리 첫 줄 고정. 단종 큐브는 레드·블랙으로 자동 전환됩니다. 기존 잠재 옵션은 재설정 전까지 보존됩니다. 교환·잠재 부여·슬롯 확장 비용은 이 게임의 재화 기준입니다.</p></div>`;
}

