import {CLASSES,CLASS_SKILLS,SECOND_SKILLS,rollBaseStats} from './data.mjs';
import {makeItem,power} from './engine.mjs';

export const ARENA_BOT_COUNT=2000;
export const ARENA_CLASSES=['warrior','mage','archer','rogue','pirate','priest'];
export const ARENA_WIN_POINTS=120;
export const ARENA_LOSS_POINTS=80;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));

export function botScore(id){
 if(!Number.isInteger(id)||id<1||id>ARENA_BOT_COUNT)throw Error('INVALID_ARENA_BOT');
 if(id===1)return 3000;
 if(id<=10)return 2600+Math.floor((10-id)*390/8);
 if(id<=100)return 2200+Math.floor((100-id)*399/89);
 return Math.floor((2000-id)*2199/1899);
}
export function tier(score,rank){
 if(score===null||score===undefined)return {name:'언랭크',step:'',label:'언랭크',color:'#a7b0c7'};
 const s=Math.max(0,Math.floor(score));
 if(s>=3000&&rank===1)return {name:'챌린저',step:'',label:'챌린저',color:'#f7d588'};
 if(s>=2600&&rank>=2&&rank<=10){const step=['IV','III','II','I'][clamp(Math.floor((s-2600)/100),0,3)];return {name:'그랜드 마스터',step,label:`그랜드 마스터 ${step}`,color:'#eabb82'};}
 if(s>=2200&&rank>=11&&rank<=100){const step=['IV','III','II','I'][clamp(Math.floor((s-2200)/100),0,3)];return {name:'마스터',step,label:`마스터 ${step}`,color:'#d3a6f5'};}
 const bands=[['브론즈',0,400,'#c89c80'],['실버',400,800,'#d7dfe9'],['골드',800,1200,'#f0cf75'],['플래티넘',1200,1600,'#8cdbdc'],['다이아',1600,2200,'#8ebaff']];
 const [name,min,max,color]=bands.find(([,lo,,],i)=>s<bands[i][2])||bands.at(-1);
 const step=['IV','III','II','I'][clamp(Math.floor((s-min)/((max-min)/4)),0,3)];
 return {name,step,label:`${name} ${step}`,color};
}
export function gearSpec(score){
 const s=clamp(score,0,3000);
 if(s>=2600)return {level:190,stars:20,grade:5,attackLines:25};
 if(s>=1200&&s<1300)return {level:100,stars:15,grade:4,attackLines:10};
 if(s<1200)return {level:Math.floor((20+s/1200*80)/10)*10,stars:Math.round(3+s/1200*12),grade:s<400?1:s<800?2:3,attackLines:Math.round(s/1200*9)};
 const q=(s-1300)/1300;
 return {level:Math.floor((110+q*80)/10)*10,stars:Math.round(15+q*5),grade:s<1800?4:5,attackLines:Math.round(11+q*14)};
}
export function buildBot(meta){
 const id=Number(meta.id),score=Number(meta.score??botScore(id)),classId=ARENA_CLASSES.includes(meta.classId)?meta.classId:ARENA_CLASSES[(id-1)%ARENA_CLASSES.length];
 const spec=gearSpec(score),level=200,primary=CLASSES.find(c=>c.id===classId).stat;
 const ctx={random:()=>.52,uuid:()=>crypto.randomUUID(),now:0};
 const items=Array.from({length:9},(_,slot)=>{
   const item=makeItem(spec.level,classId,slot,true,ctx,0);
   item.id=`arena-${id}-${slot}`;item.stars=spec.stars;item.grade=spec.grade;item.potentialUnlocked=true;
   item.baseStats=rollBaseStats(item,()=>.52);
   const count=Math.floor(spec.attackLines/9)+(slot<spec.attackLines%9?1:0);
   item.lines=Array.from({length:count},()=>({key:'attack',value:spec.grade>=5?12:spec.grade>=4?10:5,grade:spec.grade}));
   return item;
 });
 const stats={STR:4,DEX:4,INT:4,LUK:4};stats[primary]+=5*(level-1);
 return {name:meta.name||`투사${String(id).padStart(4,'0')}`,classId,level,stats,advancement:4,items,equipped:Object.fromEntries(items.map((item,i)=>[i,item.id])),costumes:[],equippedCostume:null,score,botId:id};
}
export function arenaProfile(state,score=null,rank=null,id=null){
 const p=power(state);
 return {id,name:state.name,classId:state.classId,score,rank,tier:tier(score,rank),combatPower:p.combatPower,costumeId:p.costumeId,level:state.level};
}
function seedNumber(value){let h=2166136261;for(const c of String(value)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
export function simulateArena(leftState,rightState,seed='arena'){
 const left=power(leftState),right=power(rightState);let rand=seedNumber(seed)||1;
 const random=()=>{rand^=rand<<13;rand^=rand>>>17;rand^=rand<<5;return (rand>>>0)/4294967296;};
 const fighters=[{state:leftState,stats:left,hp:Math.max(1,left.hp*6),maxHp:Math.max(1,left.hp*6),nextBasic:0,nextFirst:3,nextSecond:7},{state:rightState,stats:right,hp:Math.max(1,right.hp*6),maxHp:Math.max(1,right.hp*6),nextBasic:.4,nextFirst:3.4,nextSecond:7.4}];
 const frames=[];
 for(let time=0;time<=90&&fighters.every(f=>f.hp>0);time+=.2){
   for(let side=0;side<2;side++){
     const a=fighters[side],b=fighters[1-side];if(a.hp<=0||b.hp<=0)break;
     let type='basic',skill=null,mult=1;
     if(a.state.advancement>=2&&time>=a.nextSecond){skill=SECOND_SKILLS[a.state.classId];type='skill';a.nextSecond=time+Math.max(8,skill?.cooldown||14);}
     else if(a.state.advancement>=1&&time>=a.nextFirst){skill=CLASS_SKILLS[a.state.classId];type='skill';a.nextFirst=time+Math.max(7,skill?.cooldown||10);}
     else if(time<a.nextBasic)continue;
     if(skill)mult=Math.min(5,Math.max(1,Number(skill.damage||1)*Number(skill.hits||1)));
     a.nextBasic=time+1/Math.max(.6,a.stats.cadence||1);
     const crit=random()<(a.stats.crit||.05),raw=a.stats.attack*mult*(crit?a.stats.critDamage||1.6:1),mitigation=1/(1+Math.max(0,b.stats.defense||0)/2600);
     const damage=Math.max(1,Math.round(raw*mitigation*(.92+random()*.16)));
     b.hp=Math.max(0,b.hp-damage);
     frames.push({at:Math.round(time*1000),side,type,skill:skill?.name||null,damage,crit,leftHp:fighters[0].hp,rightHp:fighters[1].hp});
   }
 }
 const won=fighters[1].hp<=0||(fighters[0].hp>0&&fighters[0].hp/fighters[0].maxHp>fighters[1].hp/fighters[1].maxHp);
 return {won,duration:frames.at(-1)?.at||0,frames,leftMaxHp:fighters[0].maxHp,rightMaxHp:fighters[1].maxHp,leftHp:fighters[0].hp,rightHp:fighters[1].hp};
}
