// 최종 보스(7인 레이드) 체력 기준 (2026-11-09 도현):
// 장비 L제(220/250/300) 최상급(무기 5등급·방어구 3등급, 기본수치 최대) 9부위 · 25성 · 불꽃 5%
// · 잠재 보스용 27줄 최적 · 에디 레전 27줄 최적 · 코스튬 전부 · 칭호 전부 · 스킬외형 전부
// · 입장 레벨 · 6차 전직(최종) → 직업별 300초 딜(보공 포함).
// node rebirth/final-boss-calibrate.mjs
import {initialState,makeItem,power} from './engine.mjs';
import {CLASSES,rollBaseStats,bossTierCount} from './data.mjs';
import {rotation} from './class-dps-sim.mjs';
import {COSTUMES} from './costumes.mjs';
import {SKILL_LOOKS} from './skill-looks.mjs';
import {TITLE_BY_ID} from './titles-data.mjs';
import {additionalPool} from './additional-potential.mjs';
const SECONDS=300;
let serial=0;
const maxVal=key=>key==='boss'?35:12;
const addVal=Object.fromEntries(additionalPool(5).map(r=>[r.key,r.value]));
export function perfect(classId,gear,level){
 const ctx={now:0,random:()=>.999999,uuid:()=>'p'+(++serial)},cl=CLASSES.find(c=>c.id===classId),s=initialState(classId,'최종'+gear,ctx);
 Object.assign(s,{level,firstAdvancement:true,advancement:6,items:[],equipped:{}});s.stats[cl.stat]=4+(level-1)*5;
 for(let slot=0;slot<9;slot++){const i=makeItem(gear,classId,slot,true,ctx,2);Object.assign(i,{design:2,stars:25,grade:5,potentialVersion:5,potentialUnlocked:true,bonusPct:5,addGrade:5});i.bossTier=bossTierCount(i)-1;i.baseStats=rollBaseStats(i,()=>.999999);s.items.push(i);s.equipped[slot]=i.id;}
 s.costumes=COSTUMES.map(c=>c.id);s.skillLooks=SKILL_LOOKS.map(l=>l.id);s.titles=Object.fromEntries(Object.keys(TITLE_BY_ID).map(id=>[id,1]));
 return s;
}
const lines=(counts,val,extra={})=>Object.entries(counts).flatMap(([key,n])=>Array.from({length:n},()=>({key,value:val(key),grade:5,...extra})));
function setLines(s,counts){const l=lines(counts,maxVal);s.items.forEach((i,n)=>i.lines=l.slice(n*3,n*3+3));}
function setAdd(s,counts){const l=lines(counts,k=>addVal[k],{additional:true});s.items.forEach((i,n)=>i.addLines=l.slice(n*3,n*3+3));}
export function best(classId,gear,level){
 const main=CLASSES.find(c=>c.id===classId).stat,s=perfect(classId,gear,level);let top={score:0};
 setAdd(s,{attack:27});
 for(let attack=0;attack<=27;attack+=3)for(let m=0;m<=27-attack;m+=3)for(let crit=0;crit<=27-attack-m;crit+=3){const counts={attack,[main]:m,crit,boss:27-attack-m-crit};setLines(s,counts);const p=power(s),score=p.dps*p.boss;if(score>top.score)top={score,counts};}
 setLines(s,top.counts);let topAdd={score:0};
 for(let attack=0;attack<=27;attack+=3)for(let m=0;m<=27-attack;m+=3){const counts={attack,[main]:m,crit:27-attack-m};setAdd(s,counts);const p=power(s),score=p.dps*p.boss;if(score>topAdd.score)topAdd={score,counts};}
 setAdd(s,topAdd.counts);const p=power(s);
 return {classId,dps:rotation(s,SECONDS),hp:p.hp,defense:p.defense,power:p};
}
if(import.meta.url===`file://${process.argv[1]}`){
 for(const [gear,level] of [[220,300],[250,350],[300,400]]){
  const rows=CLASSES.map(c=>best(c.id,gear,level)),dealers=rows.filter(r=>r.classId!=='priest'),avg=dealers.reduce((n,r)=>n+r.dps,0)/dealers.length,priest=rows.find(r=>r.classId==='priest');
  console.log(`== ${gear}제 · Lv.${level}`);
  for(const r of rows)console.log(' ',r.classId.padEnd(8),'DPS',(r.dps/1e8).toFixed(2)+'억/s','HP',r.hp.toLocaleString(),'DEF',Math.round(r.defense));
  const party=avg*6+priest.dps;console.log('  6딜+사제 300초 풀딜',(party*SECONDS/1e8).toFixed(0)+'억');
 }
}
