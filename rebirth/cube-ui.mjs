import {currencyIconURL} from './currency-icons.mjs?v=priest-potential-83';
import * as D from './data.mjs?v=prime-choice-158';
const fmt=n=>Number(n||0).toLocaleString('ko-KR');
const pct=n=>(n*100).toFixed(6).replace(/\.?0+$/,'')+'%';
const button=(label,action,arg,disabled=false,cls='enhance-primary')=>`<button class="${cls}" data-action="${action}" data-arg="${arg}" ${disabled?'disabled':''}>${label}</button>`;
export const optionLabel=line=>`${D.OPTIONS[line.key]||line.key} +${line.value}${D.optionUnit(line.key)}`;
export function potentialPanel(item,label='현재 잠재능력'){
 return `<section class="option-panel rarity-${item.grade}"><div class="option-heading"><span>${label}</span><b>${item.lines.length?D.RARITIES[item.grade]:'미개방'}</b></div><div class="option-lines">${Array.from({length:3},(_,i)=>{const l=item.lines[i];return `<div class="option-line ${l?'grade-color-'+l.grade:'empty-line'}"><span class="line-index">0${i+1}</span><span>${l?`<small class="line-grade">${D.RARITIES[l.grade]}</small>${D.OPTIONS[l.key]}`:'잠재 슬롯 미개방'}</span><strong>${l?'+'+l.value+D.optionUnit(l.key):'—'}</strong></div>`;}).join('')}</div></section>`;
}
export function cubeOdds(kind,item,grade=item.grade){
 const c=D.CUBES[kind];if(!c||grade<2||grade>c.maxGrade)return '';
 grade=c.choose?Math.max(3,grade):grade;
 const pool=D.cubeTable(kind,item,grade).rows[0].current;
 return `<details class="cube-probabilities"><summary>${D.RARITIES[grade]} · 3줄 공통 옵션 확률</summary><p class="note">장비 레벨·직업·부위·큐브 종류와 관계없이 같은 등급은 동일한 표를 사용합니다. 세 줄 모두 ${D.RARITIES[grade]} 옵션만 나옵니다. 에픽 이상 공격력%·보스 피해% 등장 확률은 기존보다 40% 낮으며, 치명타 확률 옵션은 이번 조정 직전의 절반으로 감소했습니다. 유니크·레전더리 보스 피해%는 추가로 기존 확률의 3분의 1로 조정되었습니다. 아래는 각 줄의 생성 확률입니다.</p><div class="scroll"><table><thead><tr><th>옵션</th><th>줄당 확률</th></tr></thead><tbody>${pool.map(r=>`<tr><td>${optionLabel(r)}</td><td>${pct(r.weight)}</td></tr>`).join('')}</tbody></table></div><p class="note">3줄은 독립 추첨하며 같은 옵션 중복이 가능합니다. 현재 3줄과 등급·수치·옵션이 전부 같으면 다시 추첨하므로 최종 결과는 이 조건을 반영합니다.</p></details>`;
}
export function renderCubePanel(it,state,kind,lastResult,protectedReason='',lockChoice=-1){
 const opened=it.lines.length>0,c=D.CUBES[kind]||D.CUBES.cube,cost=D.cubeCost(kind,it);
 if(!opened)return `<div class="cube-compact"><div class="cube-controls"><p class="cube-wallet">잠재해금 보유 ${fmt(state.materials.scroll)}개</p>${button('잠재 3줄 해금','potentialUnlock',it.id,!!protectedReason||!(state.materials.scroll>0))}</div>${potentialPanel(it)}<p class="enhance-help">${protectedReason||`주문서 1개 소모 · 잠재 3줄 해금 성공 ${it.level>=200?'30% · 실패 시 주문서 소모':'100%'}`}</p></div>`;
 const invalid=it.grade>c.maxGrade||c.prime&&it.lines.length!==3;
 const locked=Number.isInteger(lockChoice)&&lockChoice>=0&&lockChoice<it.lines.length;
 const lockAllowed=(state.materials.potentialLock||0)>0&&!(c.choose&&it.grade<3);
 const selectedLock=locked&&lockAllowed?lockChoice:-1;
 const blocked=protectedReason||(invalid?(kind==='cube'?'레드 큐브는 유니크까지 사용 가능합니다.':'이 큐브로 재설정할 수 없는 등급입니다.'):(state.materials[kind]||0)<1?'큐브가 부족합니다.':state.gold<cost?'골드가 부족합니다.':'');
 const limit=c.pity[it.grade],failures=state.cubePity?.[kind+':'+it.grade]||0;
 return `<div class="cube-compact">
 <div class="cube-picker maple-cube-picker" role="group" aria-label="사용할 큐브 선택">${Object.entries(D.CUBES).map(([k,r])=>`<button class="cube-card ${kind===k?'selected':''}" data-action="cubeKind" data-arg="${k}" aria-pressed="${kind===k}"><img class="cube-item-art" src="${currencyIconURL(k)}" alt=""><span><strong>${r.name}</strong><b>${Number(state.materials[k]||0).toLocaleString("ko-KR",{notation:"compact",maximumFractionDigits:1})}개</b></span></button>`).join('')}</div>
 <div class="cube-controls"><label class="enhance-field" for="cube-lock">잠금석 ${fmt(state.materials.potentialLock)}개 · 잠금 시 1개 소모</label><select id="cube-lock" aria-label="유지할 잠재 줄 선택" ${protectedReason?'disabled':''}><option value="-1" ${selectedLock<0?'selected':''}>잠금 없이 전체 재설정</option>${it.lines.map((l,i)=>`<option value="${i}" ${!lockAllowed?'disabled':''} ${selectedLock===i?'selected':''}>${i+1}번 줄 유지 · ${optionLabel(l)}</option>`).join('')}</select>${button(c.name+' 돌리기','cubeUse',it.id,!!blocked)}<p class="cube-wallet">사용당 큐브 1개${cost?' + '+fmt(cost)+' G':''}${selectedLock>=0?' · '+(selectedLock+1)+'번 줄 유지':''}</p></div>
 ${potentialPanel(it)}
 <p class="enhance-help" role="status">${blocked||(lastResult?.id===it.id?'잠재능력을 재설정했습니다.':c.choose?'이전·새 옵션 중 선택':'새 옵션 즉시 적용')}</p>
 <details class="cube-extra"><summary>등급 상승 · 잠금 안내</summary><p class="cube-chance">장비 등급: <b>${D.RARITIES[it.grade]}</b><br>${invalid?'사용 등급 제한':it.grade===c.maxGrade?'등급 유지':`${D.RARITIES[it.grade]} → ${D.RARITIES[it.grade+1]} ${pct(c.up[it.grade])}`}${limit?`<br>승급 실패 ${failures} / ${limit}`:''}</p><p class="note">잠금은 선택한 한 줄을 유지하며 사용당 잠금석 1개를 추가로 소모합니다. 잠금 사용 시 등급을 유지하고 승급 천장은 쌓이지 않습니다.</p></details>
 ${!invalid?cubeOdds(kind,it)+((it.grade<c.maxGrade&&!(c.choose&&it.grade<3))?cubeOdds(kind,it,it.grade+1):''):''}
 </div>`;
}
export function renderCubeChoice(it,pending,state,kind){
 const canRepeat=(state.materials[kind]||0)>0&&(!(pending.lock>=0)||(state.materials.potentialLock||0)>0);
 return `<div class="cube-choice-compact"><div class="cube-choice-controls" role="group" aria-label="큐브 결과 선택">
 ${button('이전 유지','cubeChoose','no',false,'enhance-secondary')}${button('새 결과 적용','cubeChoose','yes')}
 ${button('유지 후 다시','cubeChooseRepeat','no',!canRepeat,'enhance-secondary')}${button('적용 후 다시','cubeChooseRepeat','yes',!canRepeat)}
 </div>${pending.grade>pending.previousGrade?`<p class="cube-upgrade">${D.RARITIES[pending.previousGrade]} → ${D.RARITIES[pending.grade]} · 새 결과 선택 시 승급</p>`:''}
 <div class="cube-comparison">${potentialPanel(it,'이전 옵션')}${potentialPanel(pending,'새 옵션')}</div>
 <p class="enhance-help">결과 선택 무료 · 다시 돌리면 큐브 1개${pending.lock>=0?' + 잠금석 1개':''} 소모${pending.legacy?' · 기존 승급 등급 유지':''}</p></div>`;
}
export function cubeGuide(){
 return `<div class="panel pad"><h3>잠재능력 · 큐브 3종</h3><p>장비 잠재 등급과 세 줄의 옵션 등급이 항상 같습니다. 레어면 세 줄 레어, 에픽이면 세 줄 에픽, 유니크면 세 줄 유니크, 레전더리면 세 줄 레전더리입니다.</p><p>모든 장비의 레벨·직업·부위와 관계없이 동일한 옵션 종류·수치·확률을 사용합니다. 같은 옵션이 세 줄 모두 나올 수 있습니다. 레전더리 STR +12% 세 줄도 가능합니다.</p><table><tr><th>큐브</th><th>레어 → 에픽</th><th>에픽 → 유니크</th><th>유니크 → 레전더리</th></tr>${Object.values(D.CUBES).map(c=>`<tr><td>${c.name}</td>${[2,3,4].map(g=>`<td>${pct(c.up[g])}</td>`).join('')}</tr>`).join('')}</table><p>레드: 최대 유니크, 레전더리 장비 사용 불가, 3줄 즉시 적용 · 블랙: 최소 에픽, 이전/이후 선택 · 프라임: 최소 에픽, 레전더리까지 승급, 첫 줄 고정 없이 3줄 재설정 후 이전/이후 선택. 사용당 큐브 1개, 추가 골드 없음.</p><p>기존 잠재 옵션은 큐브를 쓰기 전까지 유지됩니다. 새 장비는 잠재 해금 주문서 1개를 소모해 3줄 해금을 시도합니다. 200제 이상은 성공 확률 30%, 200제 미만은 100%이며 실패해도 주문서는 소모됩니다. 해금 결과는 세 줄 모두 레어입니다.</p></div>`;
}
