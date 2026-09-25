import * as D from './data.mjs?v=cube-art-1';
import {COOP_TIERS} from './coop-model.mjs?v=cube-art-1';
import {TOWER_FLOORS} from './tower-model.mjs?v=cube-art-1';
const pct=n=>(n*100).toLocaleString('ko-KR',{maximumFractionDigits:10})+'%';
const table=(heads,rows)=>'<div class="scroll"><table><thead><tr>'+heads.map(h=>'<th>'+h+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(x=>'<td>'+x+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
const section=(id,title,body)=>'<section id="'+id+'"><h2>'+title+'</h2>'+body+'</section>';
const levels=[1,...Array.from({length:20},(_,i)=>(i+1)*10)];
const select=(id,label,items)=>'<label>'+label+'<select id="'+id+'">'+items.map(([v,t])=>'<option value="'+v+'">'+t+'</option>').join('')+'</select></label>';
const reward=r=>Object.entries(r).filter(([k])=>['gold','fragment','cube','highCube','primeCube','scroll','expand'].includes(k)).map(([k,v])=>(k==='gold'?'골드':D.MATERIALS[k])+' '+v).join(' · ');
let html=section('field','1. 사냥터와 몬스터',
'<p>처치 1마리마다 아래 항목을 각각 독립 추첨합니다. 여러 종류를 함께 얻을 수 있으며, 실패한 전투에는 처치 보상이 없습니다. 골드·경험치는 처치 보상으로 확정 지급합니다. 오프라인 누적은 최대 6시간입니다.</p>'+
table(['항목','1마리당 확률','성공 시'],[['일반 장비',pct(D.EQUIP_DROP),'1개'],['장비 파편',pct(D.FRAGMENT_DROP),'1개'],['레드 큐브',pct(D.CUBE_DROP),'1개'],['잠재 부여 주문서',pct(D.SCROLL_DROP),'1개'],['보스 장비 / 블랙 / 프라임 / 확장석','0%','일반 사냥에서는 없음']])+
'<p>각 사냥터의 몬스터 2종은 누적 처치 수에 따라 번갈아 표시됩니다. 별도 등장 확률 추첨은 없으며, 두 종류의 능력치·드롭률은 같습니다. 장비 레벨은 아래 사냥터 상한과 자신의 레벨을 10단위로 내림한 값 중 낮은 값(최소 1)으로 고정됩니다.</p>'+
table(['사냥터','권장 Lv.','몬스터 2종','HP','공격','기본 XP','기본 G','장비 상한'],D.STAGES.map(s=>[s.name,s.level,D.MONSTERS.slice(s.id*2,s.id*2+2).map(m=>m.name).join(' / '),s.hp,s.attack,s.xp,s.gold,s.dropLevel]))+
'<p>경험치 = 기본 XP × min(1, (사냥터 레벨+15)/내 레벨)² × 경험치 보너스. 골드에는 골드 획득 보너스가 반영됩니다. 처치 속도는 전투력에 따라 달라지고 최소 8초입니다.</p>');
html+=section('boss','2. 보스·협동·던전',
'<p>연습·패배·보상 횟수 초과는 보상 없음. 일일 보스는 각각 하루 1회, 주간 보스는 각각 주 1회. 아래 장비 확률은 보상 가능한 승리 1회 기준입니다. 주간 확장석과 장비는 독립 추첨입니다.</p>'+
table(['보스','주기','장비 레벨','장비 확률','확정 G','레드','지역 재료','추가'],D.BOSSES.map(b=>[b.name,b.weekly?'주간':'일일',b.gearLevel,pct(b.dropChance),b.gold,b.cubes,b.material,b.weekly?'블랙 2개 100% · 확장석 1개 20%':'없음']))+
'<h3>협동 토벌</h3><p>보스별 하루 2회, 실제 피해를 준 참가자에게 지급. 장비와 블랙 큐브는 독립 추첨.</p>'+
table(['보스','확정 보상','장비','블랙 1개'],D.RAID_BOSSES.map(b=>[b.name,reward(b),'Lv.'+b.gearLevel+' · '+pct(b.dropChance),pct(b.highCubeChance)]))+
'<h3>협동 균열</h3><p>하루 총 3회 승리 보상. 실제 피해를 주고 이탈하지 않은 참가자에게 아래 보상 100% 지급. 장비 추첨 없음.</p>'+
table(['균열','입장 Lv.','확정 보상'],COOP_TIERS.map(t=>[t.name,t.level,reward(t)]))+
'<h3>던전</h3><p>각 던전 하루 1회 승리 보상, 모두 100% 지급.</p>'+
table(['종류','보상'],[['큐브','레드 25 + 블랙 3'],['재료','파편 200'],['유적','Lv.200 일반 장비 1개 + 20,000 G + 파편 60 (직업·부위는 랜덤)']]));
html+=section('stars','3. 스타포스·잠재 개방·제작',
'<p>스타포스는 성공하면 +1성, 실패하면 현재 별 유지. 모든 구간 하락 0%, 파괴 0%. 최대 25성.</p>'+
table(['강화','성공','유지'],D.STAR_SUCCESS.map((p,i)=>[i+' → '+(i+1)+'성',pct(p),pct(1-p)]))+
'<p>강화 비용 = 반올림[45 × (1+장비레벨/25)^1.3 × (현재별+1)^1.35 × (1+max(0,현재별−15)×0.5)] G.</p>'+
table(['항목','확률·비용'],[['잠재 개방','주문서 1 + 500 G · 레어 등급 100%'],['처음 줄 수','1줄 70% / 2줄 27% / 3줄 3%'],['1 → 2줄','확장석 1 + 2,000 G · 성공 100%'],['2 → 3줄','확장석 3 + 2,000 G · 성공 100%'],['장비 제작','지역 보스 재료 24 + 파편 60 + (3,000+지역번호×500) G · 성공 100%'],['옛 파괴 장비 복원','12성으로 복원 · 성공 100%']])+
'<p>개방 옵션은 레드·레어 표를 사용합니다. 확장은 현재 등급의 레드 표에서 새 줄만 추첨합니다. 제작은 내 직업·선택 부위·제작 레벨 고정, 디자인과 기본 수치는 랜덤입니다. 지역번호는 첫 지역 0부터 마지막 9입니다.</p>');
html+=section('cube','4. 큐브 등급·모든 옵션',
table(['큐브','레어→에픽','에픽→유니크','유니크→레전더리','기능'],Object.entries(D.CUBES).map(([k,c])=>[c.name,...[2,3,4].map(g=>pct(c.prime&&g===2?1:c.up[g])),c.prime?'결과 최소 에픽, 첫 줄 유지, 나머지 재설정':c.choose?'기존/새 등급과 옵션 선택':'전체 옵션 재설정, 즉시 적용']))+
'<p>1회 큐브 1개, 추가 골드 0. 잠재 줄 수는 유지됩니다. 프라임은 잠재가 개방된 2줄 이상 장비에 사용합니다. 레어 장비는 에픽으로 100% 상승하며, 에픽·유니크·레전더리는 기존 등급을 유지합니다. 고정된 첫 줄은 수치와 줄 등급도 그대로 유지됩니다.</p>'+
table(['큐브','첫 줄 동일 등급','둘째 줄 동일 등급','셋째 줄 동일 등급','보장 시도(연속 실패 후)'],[['레드','100%','10%','1%','레어 26번째 / 에픽 84번째 / 유니크 501번째'],['블랙','100%','20%','5%','레어 11번째 / 에픽 43번째 / 유니크 108번째'],['프라임','기존 첫 줄 유지','20%','5%','레어→에픽 100%, 이후 등급 유지']])+
'<p>동일 등급이 아니면 바로 아래 등급입니다. 레어의 아래는 노멀입니다. 보장 횟수는 캐릭터의 큐브 종류·현재 등급별로 누적되며, 등급 상승 결과 생성 시 초기화됩니다. 블랙으로 기존 결과를 선택해도 초기화가 취소되지 않습니다.</p>'+
'<p class="note">메이플 표에서 이 게임이 지원하지 않는 효과를 제외하고 남은 가중치를 재정규화한 현재 게임 확률입니다. 공식 메이플의 모든 옵션·확률과 동일한 것은 아닙니다. 표가 없는 레벨·부위 조합은 가장 가까운 레벨 표를 사용하고, 거리가 같으면 낮은 레벨을 사용합니다.</p>'+
'<div class="filters">'+select('cube-kind','큐브',Object.entries(D.CUBES).map(([k,c])=>[k,c.name]))+select('cube-grade','장비 등급',[2,3,4,5].map(g=>[g,D.RARITIES[g]]))+select('cube-level','장비 레벨',levels.map(l=>[l,l]))+select('cube-slot','장비 부위',D.SLOTS.map((s,i)=>[i,s]))+'</div><p id="cube-mapping"></p><div id="cube-rows"></div><button id="cube-csv">전체 큐브 옵션 확률 CSV 다운로드</button>'+
'<p>옵션 표의 확률은 등급 상승 여부가 정해진 뒤의 1회 생성 기준이며, 현재 옵션과 완전히 같은 전체 결과는 제외됩니다. 따라서 최종 결과 확률은 “해당 전체 결과의 생성 확률 ÷ (1−기존 전체 결과의 생성 확률)”로 조건화됩니다. 첫 줄 고정인 프라임도 나머지 줄이 전부 같으면 다시 추첨합니다. 최대 256번 모두 같으면 결제를 취소합니다. 서로 다른 줄에서 같은 옵션이 중복되는 것은 허용됩니다.</p>');
html+=section('gear','5. 장비 종류·기본 능력치',
'<p>드롭 직업은 전사·마법사·궁수·도적·해적 각각 20%. 내 직업 우선 없음. 9개 부위는 각각 1/9 (약 11.111111%). 직업과 부위는 독립 추첨합니다. 아래 디자인 확률은 해당 레벨·직업·부위의 장비가 나온 조건에서의 확률입니다.</p>'+
table(['디자인 수','순서대로 확률'],[[4,'60 / 28 / 11 / 1%'],[5,'50 / 28 / 15 / 6 / 1%'],[6,'44 / 26 / 16 / 9 / 4 / 1%']])+
'<div class="filters">'+select('gear-level','레벨',levels.map(l=>[l,l]))+select('gear-class','직업',D.CLASSES.map(c=>[c.id,c.name]))+select('gear-slot','부위',D.SLOTS.map((s,i)=>[i,s]))+select('gear-boss','장비 종류',[[0,'일반'],[1,'보스']])+'</div><div id="gear-rows"></div><button id="gear-csv">전체 장비·디자인·능력치 범위 CSV</button>'+
'<p>품질 등급 추첨은 없습니다. 공격력·주스탯·HP·방어력의 기본 수치는 각각 독립 추첨합니다. 연속 구간의 하위 50%에 75%, 다음 40%에 24%, 최상위 10%에 1%를 배분한 뒤 정수로 내림합니다. 따라서 정수 구간 경계에서 각 수치의 확률은 달라집니다. 아래에서 선택한 장비의 수치별 정확한 추첨 확률을 펼칠 수 있습니다.</p><div id="stat-rows"></div>'+
'<p>특정 장비의 사냥 1회 확률 = 0.065% × 20% × 1/9 × 디자인 확률. 보스에서는 0.065% 대신 해당 보스 장비 확률을 사용합니다. 기본 능력치까지 지정하면 각각의 수치 확률도 곱합니다. 무기 종류는 디자인에 묶여 있으므로 3종 동일 확률이 아닙니다.</p>');
html+=section('fixed','6. 확정 보상·전투 확률',
'<h3>탑</h3><p>첫 클리어는 아래 보상을 100% 지급. 재도전은 하루 승리 횟수 3회 이내일 때 각 보상의 30%를 내림해서 지급합니다. 첫 클리어도 당일 승리 횟수에 포함됩니다. 무작위 장비 드롭 없음.</p>'+
table(['층','첫 클리어 보상'],TOWER_FLOORS.map(f=>[f.floor,reward(f.reward)]))+
'<h3>일일 목표</h3>'+table(['목표','확정 보상'],Object.values(D.DAILY_TASKS).map(t=>[t.name,reward(t)+' + 현재 레벨 필요 XP 5%']))+
'<h3>출석</h3>'+table(['일차','확정 보상'],D.ATTENDANCE_REWARDS.map((r,i)=>[i+1,reward(r)]))+
'<p>출석은 받은 날 기준 7회 순환. 교환·출석·목표 보상은 조건 충족 시 100% 지급합니다. 전직과 직업 변경은 조건 충족 시 확정 처리됩니다.</p>'+
'<p>치명타는 기본 5% + 궁수 5%p + 장비 잠재 확률, 일반 능력치 상한 95%. 전투 스킬 보너스는 각 스킬 설명대로 더해지며 일반 보스·협동 토벌은 최대 100%, 탑은 최대 95%입니다. 협동 균열은 기본 능력치 치명 확률을 사용합니다. 일반 자동사냥은 평균 피해 계산을 사용합니다. 직접 조작 전투의 공격 적중·회피는 거리와 위치 판정이며 별도 명중·회피 확률 추첨은 없습니다.</p>');
html+=section('exchange','7. 교환소',
table(['품목','교환소 파편/개','교환소 G/개'],Object.entries(D.SUPPLY_EXCHANGE).map(([k,o])=>[D.MATERIALS[k],o.fragment,o.gold]))+
'<p>파편 교환소는 일일 횟수 제한 없음. 거래소는 유저 간 거래로 별도 유지됩니다.</p>');
document.querySelector('#content').innerHTML=html;
const value=id=>document.getElementById(id).value;
function cubeRows(kind,grade,level,slot){
 const t=D.cubeTable(kind,{grade,level,slot}),rates=D.cubeLineRates(kind,grade),out=[];
 t.rows.forEach((row,i)=>{if(D.CUBES[kind].prime&&i===0)return;for(const group of ['current','lower']){
 const rate=group==='current'?rates[i]:1-rates[i];if(!rate)continue;
 const pool=row[group],total=pool.reduce((s,o)=>s+o.weight,0);
 for(const o of pool)out.push([D.CUBES[kind].name,D.RARITIES[grade],level,t.level,D.SLOTS[slot],i+1,D.RARITIES[group==='current'?grade:grade-1],D.OPTIONS[o.key]+' +'+o.value+D.optionUnit(o.key),rate*o.weight/total]);
 }});return out;
}
function drawCube(){
 const kind=value('cube-kind'),prime=D.CUBES[kind].prime,sel=document.getElementById('cube-grade');for(const o of sel.options)o.disabled=prime&&Number(o.value)<3;if(prime&&Number(sel.value)<3)sel.value='3';sel.disabled=false;
 const grade=+sel.value,level=+value('cube-level'),slot=+value('cube-slot'),rows=cubeRows(kind,grade,level,slot);
 document.getElementById('cube-mapping').textContent='실제 사용 표: Lv.'+D.cubeTable(kind,{grade,level,slot}).level+' · 등급 상승 후 옵션이 궁금하면 상승한 등급을 선택하세요.';
 document.getElementById('cube-rows').innerHTML=table(['줄','옵션 등급','옵션','1회 생성 확률'],rows.map(r=>[r[5],r[6],r[7],pct(r[8])]));
}
const cdf=x=>x<=.5?1.5*x:x<=.9?.75+.6*(x-.5):.99+.1*(x-.9);
function gearRows(level,classId,slot,boss){
 const weights=D.designWeights(D.designCount(level,classId,slot,boss));
 return weights.map((w,i)=>{const it=D.designItem(level,classId,slot,boss,i);return {it,w,ranges:D.gearStatRanges(it)};});
}
function drawGear(){
 const rows=gearRows(+value('gear-level'),value('gear-class'),+value('gear-slot'),value('gear-boss')==='1');
 document.getElementById('gear-rows').innerHTML=table(['디자인','조건부 확률','종류','공격력','주스탯','HP','방어력'],rows.map(({it,w,ranges})=>[D.gearName(it),w+'%',D.equipmentType(it),...Object.values(ranges).map(r=>r.min+'–'+r.max)]));
 document.getElementById('stat-rows').innerHTML=rows.map(({it,ranges})=>'<details><summary>'+D.gearName(it)+' · 수치별 확률</summary>'+Object.entries(ranges).map(([key,r])=>{
 const n=r.max-r.min+1;return '<h4>'+({attack:'공격력',stat:'주스탯',hp:'HP',defense:'방어력'}[key])+'</h4>'+table(['수치','해당 능력치 추첨 확률'],Array.from({length:n},(_,i)=>[r.min+i,pct(cdf((i+1)/n)-cdf(i/n))]));
 }).join('')+'</details>').join('');
}
function csv(name,heads,rows){const data='﻿'+[heads,...rows].map(r=>r.map(x=>'"'+String(x).replaceAll('"','""')+'"').join(',')).join('\r\n'),url=URL.createObjectURL(new Blob([data],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
for(const id of ['cube-kind','cube-grade','cube-level','cube-slot'])document.getElementById(id).addEventListener('change',drawCube);
for(const id of ['gear-level','gear-class','gear-slot','gear-boss'])document.getElementById(id).addEventListener('change',drawGear);
document.getElementById('cube-csv').onclick=()=>{const rows=[];for(const kind of Object.keys(D.CUBES))for(const grade of D.CUBES[kind].prime?[3,4,5]:[2,3,4,5])for(const level of levels)for(let slot=0;slot<9;slot++)rows.push(...cubeRows(kind,grade,level,slot).map(r=>[...r.slice(0,8),r[8]*100]));csv('링구-전체-큐브-옵션.csv',['큐브','장비등급','장비레벨','매핑레벨','부위','줄','옵션등급','옵션','생성확률(%)'],rows);};
document.getElementById('gear-csv').onclick=()=>{const rows=[];for(const level of levels)for(const c of D.CLASSES)for(let slot=0;slot<9;slot++)for(const boss of [false,true])for(const {it,w,ranges} of gearRows(level,c.id,slot,boss))rows.push([level,c.name,D.SLOTS[slot],boss?'보스':'일반',D.gearName(it),D.equipmentType(it),w,...Object.values(ranges).flatMap(r=>[r.min,r.max])]);csv('링구-전체-장비.csv',['레벨','직업','부위','종류','장비명','무기종류','디자인확률(%)','공격최소','공격최대','스탯최소','스탯최대','HP최소','HP최대','방어최소','방어최대'],rows);};
drawCube();drawGear();
