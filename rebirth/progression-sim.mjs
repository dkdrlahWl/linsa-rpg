
import fs from 'node:fs';
import {initialState,execute,power,huntingRate,bestEquipment} from './engine.mjs?v=tower-reward-3x-6';
import * as D from './data.mjs?v=tower-reward-3x-6';
import {towerStep,TOWER_CLASSES} from './tower-model.mjs?v=tower-reward-3x-6';
const classId=process.argv[2]||'warrior',seed=Number(process.argv[3]||1),maxDays=Number(process.argv[4]||365);
let rng=seed>>>0,id=0,now=Date.parse('2026-09-26T08:00:00+09:00');
const random=()=>{rng+=0x6D2B79F5;let t=rng;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};
const ctx={get now(){return now},random,uuid:()=>String(++id)};
let s=initialState(classId,'모험가',ctx),activeSeconds=0;const rows=[],notes=[],errors={};
function run(cmd,args={}){try{const r=execute(s,cmd,args,ctx);s=r.state;return r;}catch(e){errors[e.message]=(errors[e.message]||0)+1;return null;}}
function spendTime(seconds){now+=seconds*1000;activeSeconds+=seconds;run('sync');}
function score(state=s){return power(state).combatPower;}
function equip(){run('autoEquip');}
function maintain(){
 if(s.points)run('stats',{key:D.CLASSES.find(c=>c.id===classId).stat,amount:s.points});
 equip();
 const equipped=new Set(Object.values(s.equipped));
 const keep=new Set(equipped);
 for(let slot=0;slot<9;slot++){
  const own=s.items.filter(it=>it.classId===classId&&it.slot===slot&&!it.broken);
  for(const item of own.sort((a,b)=>b.level-a.level||D.gearAttributes(b).attack-D.gearAttributes(a).attack).slice(0,3))keep.add(item.id);
 }
 const junk=s.items.filter(it=>!keep.has(it.id)&&!it.bound&&!it.locked).map(it=>it.id);
 for(let i=0;i<junk.length;i+=50)run('salvage',{ids:junk.slice(i,i+50)});
 for(let n=0;n<3;n++){
  const region=Math.min(9,Math.floor((s.level-1)/20)),r=Array.from({length:region+1},(_,i)=>i).reverse().find(r=>(s.bossMaterials[r]||0)>=24&&D.TIERS[r+1]<=s.level&&s.materials.fragment>=60&&s.gold>=3000+r*500);
  if(r===undefined)break;
  const slot=Array.from({length:9},(_,i)=>i).sort((a,b)=>(s.items.find(it=>it.id===s.equipped[a])?.level||0)-(s.items.find(it=>it.id===s.equipped[b])?.level||0))[0];
  run('craft',{region:r,slot});equip();
 }
 // Invest in stronger base gear before comparing it with an already enhanced item.
 for(let slot=0;slot<9;slot++){
  const old=s.items.find(it=>it.id===s.equipped[slot]);
  const raw=it=>{if(!it)return 0;const p=D.gearAttributes(it,0);return p.attack*3+p.stat+p.hp*.03+p.defense*.1;};
  const next=s.items.filter(it=>it.classId===classId&&it.slot===slot&&it.level<=s.level&&!it.broken).sort((a,b)=>raw(b)-raw(a))[0];
  if(!next||next.id===old?.id||raw(next)<=raw(old)*1.12)continue;
  for(let n=0;n<120;n++){const it=s.items.find(i=>i.id===next.id);if(it.stars>=Math.min(15,old?.stars||5)||s.gold<D.starCost(it)+3000)break;run('star',{id:it.id});}
  let it=s.items.find(i=>i.id===next.id);
  if(!it.lines.length&&s.materials.scroll&&s.gold>=500)run('potential',{id:it.id});
  for(let n=0;n<8;n++){it=s.items.find(i=>i.id===next.id);if(!it.lines.length||it.grade>=Math.min(4,old?.grade||2)||!s.materials.cube)break;run('cube',{id:it.id,kind:'cube'});}
 }
 equip();
 const starTarget=s.level<40?5:s.level<80?8:s.level<120?10:s.level<160?12:s.level<200?15:20;
 for(let tries=0;tries<250;tries++){
  const list=Object.values(s.equipped).map(id=>s.items.find(it=>it.id===id)).filter(it=>it.stars<starTarget&&s.gold>=D.starCost(it)+500);
  if(!list.length)break;
  list.sort((a,b)=>a.stars-b.stars||a.slot-b.slot);run('star',{id:list[0].id});
 }
 for(const id of Object.values(s.equipped)){
  let item=s.items.find(it=>it.id===id);
  if(!item.lines.length&&s.materials.scroll>0&&s.gold>=500)run('potential',{id});
  item=s.items.find(it=>it.id===id);
  if(item.lines.length===1&&s.materials.expand>=1&&s.gold>=2000)run('expand',{id});
  item=s.items.find(it=>it.id===id);
  if(item.lines.length===2&&s.materials.expand>=3&&s.gold>=2000)run('expand',{id});
 }
 for(let n=0;n<24;n++){
  const kind=s.materials.highCube>0?'highCube':s.materials.cube>0?'cube':null;if(!kind)break;
  const list=Object.values(s.equipped).map(id=>s.items.find(it=>it.id===id)).filter(it=>it.lines.length&&(kind==='highCube'||it.grade<5)).sort((a,b)=>a.grade-b.grade||((n+a.slot)%9)-((n+b.slot)%9));
  if(!list.length)break;
  const it=list[0];run('cube',{id:it.id,kind});
  if(s.pendingCube){const p=s.pendingCube,copy=structuredClone(s),item=copy.items.find(x=>x.id===p.id);item.lines=p.lines;item.grade=p.grade;run('cubeChoose',{apply:p.grade>it.grade||score(copy)>score(s)});}
 }
 if(!s.advancement&&s.level>=60&&s.cleared.includes(8))run('advance');
}
function chooseStage(){
 const p=power(s);let best={id:s.stage,value:0};
 for(const st of D.STAGES){if(st.star>p.stars||st.region>0&&!s.cleared.includes(st.region*3-1))continue;
 const rate=huntingRate({...s,stage:st.id}),value=rate.survives?rate.xp/rate.seconds:0;if(value>best.value)best={id:st.id,value};
 }
 if(best.id!==s.stage)run('stage',{id:best.id});
 if(!s.hunting)run('hunt',{enabled:true});
}
function fight(cmd,args,end){
 if(!run(cmd,args)||!s.battle)return false;
 while(s.battle&&now<end){
  const b=s.battle;
  if(now>=(b.skillReady||0))run('skill',{slot:1});
  if(s.battle&&s.advancement&&now>=(s.battle.secondReady||0))run('skill',{slot:2});
  if(s.battle&&s.battle.hp<s.battle.power.hp*.6&&(s.battle.potions||0)<3&&now>=(s.battle.potionReady||0))run('battlePotion');
  spendTime(Math.min(3,(end-now)/1000));
 }
 if(s.battle)run('abandon');
 return !!s.lastReward?.won;
}
function tower(end){
 const floor=Math.min(10,(s.tower?.cleared.length||0)+1);
 if(s.tower?.cleared.includes(10)||s.level<Math.max(10,floor*20-10)||end-now<180000)return;
 if(!run('towerStart',{floor})||!s.battle)return;
 const b=s.battle;let steps=0;
 while(!b.ended&&now+steps*100<end){
  const p=b.player,e=b.enemy,c=TOWER_CLASSES[classId],dx=e.x-p.x,dy=e.y-p.y,d=Math.hypot(dx,dy),target=c.range<300?c.range*.75:c.range*.7;
  let mx=dx/(d||1)*(d>target?1:-.1),my=dy/(d||1)*(d>target?1:-.1);
  for(const h of b.hazards){if(h.at-b.tick>15)continue;const hx=p.x-h.x,hy=p.y-h.y,dist=Math.hypot(hx,hy);if(h.type!=='line'&&dist<h.r+65){mx+=hx/(dist||1)*3;my+=hy/(dist||1)*3;}}
  const n=Math.max(1,Math.hypot(mx,my));towerStep(b,[mx/n,my/n,1|2|8]);steps++;
 }
 now+=steps*100;activeSeconds+=steps/10;run('sync');if(s.battle)run('towerLeave');
}
const start=now;
for(let day=1;day<=maxDays;day++){
 const before={level:s.level,kills:s.huntKills||0,cleared:s.cleared.length,tower:s.tower?.cleared.length||0};
 for(let visit=0;visit<2;visit++){
  now=start+((day-1)*24+visit*12)*3600000;run('sync');run('attendanceClaim');
  const end=now+15*60000;
  maintain();chooseStage();
  for(const key of ['hunt','boss','tower'])if(s.daily?.[key]>=D.DAILY_TASKS[key].goal&&!s.daily.claimed.includes(key))run('dailyClaim',{key});
  if(s.level>=20)for(const kind of ['material','cube']){if(now+180000>end)break;if(s.dungeonClaims[kind]!==D.dayKey(now))fight('dungeon',{kind},end);}
  const candidates=D.BOSSES.filter(b=>b.level<=s.level&&(b.id===0||s.cleared.includes(b.id-1))&&s.bossClaims[b.id]!== (b.weekly?D.weekKey(now):D.dayKey(now))).sort((a,b)=>Number(s.cleared.includes(a.id))-Number(s.cleared.includes(b.id))||b.id-a.id);
  for(const b of candidates.slice(0,6)){if(now+180000>end)break;fight('boss',{id:b.id},end);}
  // Newly unlocked bosses can be attempted during the same visit.
  for(let n=0;n<5&&now+180000<=end;n++){const b=D.BOSSES[s.cleared.length];if(!b||s.level<b.level||!fight('boss',{id:b.id},end))break;}
  tower(end);
  for(const key of ['hunt','boss','tower'])if(s.daily?.[key]>=D.DAILY_TASKS[key].goal&&!s.daily.claimed.includes(key))run('dailyClaim',{key});
  if(s.level===200&&s.cleared.includes(29)&&s.dungeonClaims.relic!==D.dayKey(now)&&now+180000<=end)fight('dungeon',{kind:'relic'},end);
  maintain();chooseStage();if(now<end)spendTime((end-now)/1000);
 }
 const p=power(s),gear=Object.values(s.equipped).map(id=>s.items.find(it=>it.id===id));
 rows.push({day,level:s.level,xpPercent:Math.round(s.xp/D.xpNeeded(s.level)*1000)/10,kills:(s.huntKills||0)-before.kills,stage:D.STAGES[s.stage].name,power:p.combatPower,gold:s.gold,stars:p.stars,gearSlots:gear.length,gearLevel:Math.round(gear.reduce((n,it)=>n+it.level,0)/Math.max(1,gear.length)),bosses:s.cleared.length,tower:s.tower?.cleared.length||0,red:s.materials.cube,black:s.materials.highCube,epic:gear.filter(i=>i.grade>=3).length,legend:gear.filter(i=>i.grade===5).length,newBosses:s.cleared.slice(before.cleared).map(id=>D.BOSSES[id].name).join(' / '),ending:s.level===200&&s.cleared.includes(29),allClear:s.level===200&&s.cleared.includes(29)&&s.tower?.cleared.includes(10)&&!!s.dungeonClaims.relic});
 if(day%20===0)console.log(JSON.stringify({classId,seed,...rows.at(-1)}));
 if(rows.at(-1).allClear)break;
}
fs.mkdirSync('rebirth/simulation-results',{recursive:true});
const result={classId,seed,assumptions:{visits:2,offlineCapHours:6,activeMinutes:30,trade:false,coop:false,freeResources:false,maxDays},rows,errors,activeHours:activeSeconds/3600};
fs.writeFileSync('rebirth/simulation-results/'+classId+'-'+seed+'.json',JSON.stringify(result));
console.log(JSON.stringify({finished:true,classId,seed,last:rows.at(-1),errors}));

