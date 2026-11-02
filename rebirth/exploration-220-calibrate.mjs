// 220제 보장 탐험 보스 체력 기준 (2026-11-02 도현):
// 200제 종언급(무기 최상·방어구 높음, 기본수치 최대) 9부위 · 25성 · 불꽃 5% · 잠재 보스용 27줄 최적 · 코스튬 90%(54/60)
// · 치명타 피해 200%(스킬외형 30 + 칭호 20) · Lv.300 · 300 전직 → 사제 제외 직업 평균 120초 딜.
// node rebirth/exploration-220-calibrate.mjs
import {initialState,makeItem,power} from './engine.mjs';
import {CLASSES,rollBaseStats,bossTierCount,optionRange} from './data.mjs';
import {rotation} from './class-dps-sim.mjs';
import {COSTUMES} from './costumes.mjs';
import {SKILL_LOOKS} from './skill-looks.mjs';
import {TITLE_BY_ID} from './titles-data.mjs';
const SECONDS=120,LEVEL=300,ADV=6;
let serial=0;
const maxVal=key=>{for(const g of [5,4]){try{return optionRange(key,g).max;}catch{}}throw Error(key);};
function perfect(classId){
 const ctx={now:0,random:()=>.999999,uuid:()=>'p'+(++serial)},cl=CLASSES.find(c=>c.id===classId),s=initialState(classId,'완벽200',ctx);
 Object.assign(s,{level:LEVEL,firstAdvancement:true,advancement:ADV,items:[],equipped:{}});s.stats[cl.stat]=4+(LEVEL-1)*5;
 for(let slot=0;slot<9;slot++){const i=makeItem(200,classId,slot,true,ctx,2);Object.assign(i,{design:2,stars:25,grade:5,potentialVersion:5,potentialUnlocked:true,bonusPct:5});i.bossTier=bossTierCount(i)-1;i.baseStats=rollBaseStats(i,()=>.999999);s.items.push(i);s.equipped[slot]=i.id;}
 s.costumes=COSTUMES.slice(0,Math.ceil(COSTUMES.length*.9)).map(c=>c.id);
 s.skillLooks=SKILL_LOOKS.map(l=>l.id);s.titles=Object.fromEntries(Object.keys(TITLE_BY_ID).slice(0,20).map(id=>[id,1]));
 return s;
}
function setLines(s,counts){const lines=Object.entries(counts).flatMap(([key,n])=>Array.from({length:n},()=>({key,value:maxVal(key),grade:5})));s.items.forEach((i,n)=>i.lines=lines.slice(n*3,n*3+3));}
function best(classId){
 const main=CLASSES.find(c=>c.id===classId).stat,s=perfect(classId);let top={score:0};
 for(let attack=0;attack<=27;attack+=3)for(let m=0;m<=27-attack;m+=3)for(let crit=0;crit<=27-attack-m;crit+=3){const counts={attack,[main]:m,crit,boss:27-attack-m-crit};setLines(s,counts);const p=power(s),score=p.dps*p.boss;if(score>top.score)top={score,counts};}
 setLines(s,top.counts);const p=power(s);return {classId,counts:top.counts,critDamage:p.critDamage,crit:p.crit,costume:p.costumeAttackBonus,dps:rotation(s,SECONDS)};
}
const rows=CLASSES.filter(c=>c.id!=='priest').map(c=>best(c.id)),avg=rows.reduce((n,r)=>n+r.dps,0)/rows.length;
for(const r of rows)console.log(r.classId.padEnd(8),'DPS',Math.round(r.dps).toLocaleString().padStart(12),'· 120초',(r.dps*SECONDS/1e8).toFixed(2)+'억','· 치피',r.critDamage.toFixed(2),'· 크리',r.crit.toFixed(2),'· 코스튬',r.costume+'%','·',JSON.stringify(r.counts));
console.log('사제 제외 평균 DPS',Math.round(avg).toLocaleString(),'→ 120초 풀딜',(avg*SECONDS/1e8).toFixed(2)+'억');
