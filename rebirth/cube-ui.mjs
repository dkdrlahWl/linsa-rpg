import {currencyIconURL} from './currency-icons.mjs?v=fourth-fall-5';
import * as D from './data.mjs?v=fourth-fall-5';
const fmt=n=>Number(n||0).toLocaleString('ko-KR');
const pct=n=>(n*100).toFixed(6).replace(/\.?0+$/,'')+'%';
const button=(label,action,arg,disabled=false,cls='enhance-primary')=>`<button class="${cls}" data-action="${action}" data-arg="${arg}" ${disabled?'disabled':''}>${label}</button>`;
export const optionLabel=line=>`${D.OPTIONS[line.key]||line.key} +${line.value}${D.optionUnit(line.key)}`;
export function potentialPanel(item,label='현재 잠재능력'){
 return `<section class="option-panel rarity-${item.grade}"><div class="option-heading"><span>${label}</span><b>${item.lines.length?D.RARITIES[item.grade]:'미개방'}</b></div><div class="option-lines">${Array.from({length:3},(_,i)=>{const l=item.lines[i];return `<div class="option-line ${l?'grade-color-'+l.grade:'empty-line'}"><span class="line-index">0${i+1}</span><span>${l?`<small class="line-grade">${D.RARITIES[l.grade]}</small>${D.OPTIONS[l.key]}`:'잠재 슬롯 미개방'}</span><strong>${l?'+'+l.value+D.optionUnit(l.key):'—'}</strong></div>`;}).join('')}</div></section>`;
}
export function cubeOdds(kind,item,grade=item.grade){
 const c=D.CUBES[kind];if(!c||grade<2||grade>c.maxGrade)return '';
 grade=c.prime?Math.max(3,grade):grade;
 const pool=D.cubeTable(kind,item,grade).rows[0].current;
 return `<details class="cube-probabilities"><summary>${D.RARITIES[grade]} · 3줄 공통 옵션 확률</summary><p class="note">장비 레벨·직업·부위·큐브 종류와 관계없이 같은 등급은 동일한 표를 사용합니다. 세 줄 모두 ${D.RARITIES[grade]} 옵션만 나옵니다. 아래는 각 줄의 생성 확률입니다.</p><div class="scroll"><table><thead><tr><th>옵션</th><th>줄당 확률</th></tr></thead><tbody>${pool.map(r=>`<tr><td>${optionLabel(r)}</td><td>${pct(r.weight)}</td></tr>`).join('')}</tbody></table></div><p class="note">3줄은 독립 추첨하며 같은 옵션 중복이 가능합니다. 현재 3줄과 등급·수치·옵션이 전부 같으면 다시 추첨하므로 최종 결과는 이 조건을 반영합니다.</p></details>`;
}
export function renderCubePanel(it,state,kind,lastResult,protectedReason=''){
 const opened=it.lines.length>0,c=D.CUBES[kind]||D.CUBES.cube,key=kind,cost=D.cubeCost(kind,it);
 if(!opened)return `${potentialPanel(it)}<div class="cube-card"><img class="cube-item-art" src="${currencyIconURL('scroll')}" alt="잠재 해금 주문서"><span><strong>잠재 해금 주문서</strong><small>1개로 잠긴 3줄을 모두 해금 · 성공 100%</small><b>보유 ${fmt(state.materials.scroll)}개</b></span></div><p class="note">협동 균열의 개인 상자에서 획득합니다. 해금 시 레어 잠재 3줄이 부여됩니다.</p>${button('잠재 3줄 해금','potentialUnlock',it.id,!!protectedReason||!(state.materials.scroll>0))}<p class="enhance-help">${protectedReason||(!(state.materials.scroll>0)?'잠재 해금 주문서가 필요합니다.':'')}</p>`;
 const invalid=opened&&(it.grade>c.maxGrade||c.prime&&(it.lines.length!==3));
 const blocked=protectedReason||(invalid?(c.prime?'잠재 3줄이 개방된 장비가 필요합니다.':'이 큐브로 재설정할 수 없는 등급입니다.'):(state.materials[key]||0)<1?'재료가 부족합니다.':state.gold<cost?'골드가 부족합니다.':'');
 const limit=c.pity[it.grade],failures=state.cubePity?.[kind+':'+it.grade]||0;
 return `<div class="enhance-intro"><span>POTENTIAL</span><small>장비 등급 · 옵션 재설정</small></div>${lastResult?.id===it.id?`<div class="enhance-result success" role="status"><strong>${lastResult.up?'등급 상승 결과를 확인하세요':'잠재능력을 재설정했습니다'}</strong></div>`:''}${potentialPanel(it)}
 ${opened?`<div class="cube-picker maple-cube-picker" role="group" aria-label="사용할 큐브 선택">${Object.entries(D.CUBES).map(([k,r])=>`<button class="cube-card ${kind===k?'selected':''}" data-action="cubeKind" data-arg="${k}" aria-pressed="${kind===k}"><img class="cube-item-art" src="${currencyIconURL(k)}" alt=""><span><strong>${r.name}</strong><small>${r.prime?'최소 에픽 · 3줄 전체 재설정':r.choose?'이전 / 이후 선택':'새 옵션 즉시 적용'}</small><b>보유 ${fmt(state.materials[k])}개</b></span></button>`).join('')}</div>
 <p class="cube-chance">장비 전체 등급: <b>${D.RARITIES[it.grade]}</b><br>${invalid?'사용 등급 제한':it.grade===c.maxGrade?'등급 유지':`${D.RARITIES[it.grade]} → ${D.RARITIES[it.grade+1]} <b>${pct(c.up[it.grade])}</b>`}${limit?`<br>등급 상승 연속 실패 ${failures} / ${limit} · ${failures>=limit?'다음 사용은 등급 상승 확정':limit-failures+'회 더 실패하면 다음 사용은 확정'}`:''}</p>
 ${!invalid?`<p class="note">승급 후 장비 등급과 3줄 옵션 등급이 모두 같습니다. 낮은 등급 옵션은 나오지 않습니다.<br>모든 레벨·직업·부위에 동일한 옵션·수치·확률 적용.</p>`:''}`:'<p class="note">새 장비의 잠재 3줄은 주문서로 해금합니다.</p>'}
 <p class="enhance-wallet">${D.MATERIALS[key]} ${fmt(state.materials[key])}개 · 필요 1개${cost?' + '+fmt(cost)+' G':''}</p>
 ${button(c.name+' 사용하기','cubeUse',it.id,!!blocked)}
 <p class="enhance-help">${blocked||(opened?(c.choose?'이전/이후 중 등급과 옵션을 함께 선택합니다.':c.prime?'최소 에픽, 레전더리까지 승급 가능. 3줄 전체 결과가 즉시 적용됩니다.':'새 결과가 즉시 적용됩니다. 이전 옵션으로 되돌릴 수 없습니다.'):'')}</p>
 ${opened&&!invalid?cubeOdds(kind,it)+((it.grade<c.maxGrade&&!(c.prime&&it.grade<3))?cubeOdds(kind,it,it.grade+1):''):''}
`;
}
export function cubeGuide(){
 return `<div class="panel pad"><h3>잠재능력 · 큐브 3종</h3><p>장비 잠재 등급과 세 줄의 옵션 등급이 항상 같습니다. 레어면 세 줄 레어, 에픽이면 세 줄 에픽, 유니크면 세 줄 유니크, 레전더리면 세 줄 레전더리입니다.</p><p>모든 장비의 레벨·직업·부위와 관계없이 동일한 옵션 종류·수치·확률을 사용합니다. 같은 옵션이 세 줄 모두 나올 수 있습니다. 레전더리 STR +12% 세 줄도 가능합니다.</p><table><tr><th>큐브</th><th>레어 → 에픽</th><th>에픽 → 유니크</th><th>유니크 → 레전더리</th></tr>${Object.values(D.CUBES).map(c=>`<tr><td>${c.name}</td>${[2,3,4].map(g=>`<td>${pct(c.up[g])}</td>`).join('')}</tr>`).join('')}</table><p>레드: 3줄 즉시 적용 · 블랙: 이전/이후 선택 · 프라임: 최소 에픽, 레전더리까지 승급, 첫 줄 고정 없이 3줄 즉시 적용. 사용당 큐브 1개, 추가 골드 없음.</p><p>기존 잠재 옵션은 큐브를 쓰기 전까지 유지됩니다. 새 장비는 잠재 해금 주문서 1개로 3줄을 개방합니다. 해금 결과는 세 줄 모두 레어입니다.</p></div>`;
}
