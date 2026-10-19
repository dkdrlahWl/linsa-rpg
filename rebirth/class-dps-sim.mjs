// 전 직업 단일 대상 보스 딜 시뮬레이션(5개 스킬 + 기본 공격, 200레벨·25성·200제 보스장비 9부위).
// node rebirth/class-dps-sim.mjs → 직업별 최고 빌드 DPS와 사제 비율.
import {initialState,makeItem,power} from './engine.mjs?v=fifth-impact-121';
import {CLASSES,rollBaseStats} from './data.mjs?v=unique-boss-25-20261015-lv300';
import {beginCombatSkill,stepCombatSkills} from './combat-skills.mjs?v=rogue-archer-20261019';
import {beginThird,stepThird} from './advancement.mjs?v=rogue-archer-20261019';
import {beginFourth,stepFourth} from './fourth-job.mjs?v=rogue-archer-20261019';
import {beginFifth,stepFifth} from './fifth-job.mjs?v=rogue-archer-20261019';
import {supportTick,holyDamage} from './priest.mjs?v=fifth-114';
import {TOWER_CLASSES} from './tower-model.mjs?v=fifth-impact-121';
let serial=0;
export function fixture(classId,{level=200,stars=25,roll=.75}={}){
 const ctx={now:0,random:()=>roll,uuid:()=>String(++serial)},cl=CLASSES.find(c=>c.id===classId),s=initialState(classId,'밸런스',ctx);
 Object.assign(s,{level,firstAdvancement:level>=30,advancement:level>=200?4:level>=150?3:level>=100?2:level>=60?1:0,items:[],equipped:{}});s.stats[cl.stat]=4+(level-1)*5;
 for(let slot=0;slot<9;slot++){const i=makeItem(level,classId,slot,true,ctx,2);Object.assign(i,{design:2,stars,grade:5,potentialVersion:5,potentialUnlocked:true});i.baseStats=rollBaseStats(i,()=>roll);s.items.push(i);s.equipped[slot]=i.id;}
 return s;
}
export function setLines(s,counts){const lines=Object.entries(counts).flatMap(([key,n])=>Array.from({length:n},()=>({key,value:key==='boss'?35:12,grade:5})));s.items.forEach((i,n)=>i.lines=lines.slice(n*3,n*3+3));return s;}
export function rotation(s,seconds=180){
 const p=power(s),a={id:'me',classId:s.classId,power:p,hp:p.hp,x:0,y:0,advancement:s.advancement,advanced:s.advancement>=1,level:s.level},target={id:'dummy',x:100,y:0,hp:1e15,maxHp:1e15};let total=0;
 const c=TOWER_CLASSES[s.classId];
 for(let t=0;t<seconds*10;t++){a.tick=t;supportTick([a],t);
  const hit=(scale,extra=0)=>{const crit=Math.min(.95,p.crit+extra);total+=holyDamage(a,p.attack*scale*(1+crit*(p.critDamage-1)),t)*p.boss;};
  if(t%c.cooldown===0)hit(c.cooldown/10*p.cadence);
  beginFifth(a,target,t);beginFourth(a,target,t);beginThird(a,target,t);beginCombatSkill(a,target,t,2);beginCombatSkill(a,target,t,1);
  stepCombatSkills(a,[target],t,hit);stepThird(a,target,t,hit);stepFourth(a,target,t,hit);stepFifth(a,[target],t,hit);supportTick([a],t);}
 return total/seconds;
}
export function bestBuild(classId,opts){
 const main=CLASSES.find(c=>c.id===classId).stat,s=fixture(classId,opts);let best={dps:0};
 for(let attack=0;attack<=27;attack+=3)for(let m=0;m<=27-attack;m+=3)for(let crit=0;crit<=27-attack-m;crit+=3){const counts={attack,[main]:m,crit,boss:27-attack-m-crit};setLines(s,counts);const pw=power(s),score=pw.dps*pw.boss;if(score>best.score||!best.score)best={score,counts};}
 setLines(s,best.counts);return {classId,counts:best.counts,dps:rotation(s),state:s};
}
if(process.argv[1]?.endsWith('class-dps-sim.mjs')){
 for(const opts of [{level:200,stars:25},{level:200,stars:15},{level:200,stars:20,roll:.3},{level:150,stars:17},{level:100,stars:15},{level:60,stars:12},{level:30,stars:10}]){
  const rows=CLASSES.map(c=>bestBuild(c.id,opts)),others=rows.filter(r=>r.classId!=='priest'),avg=others.reduce((n,r)=>n+r.dps,0)/others.length,min=Math.min(...others.map(r=>r.dps)),priest=rows.find(r=>r.classId==='priest');
  console.log(JSON.stringify(opts),rows.map(r=>r.classId+':'+Math.round(r.dps/1000)+'k').join(' '),'| 사제/평균',(priest.dps/avg).toFixed(3),'사제/최저',(priest.dps/min).toFixed(3),JSON.stringify(priest.counts));
 }
}
