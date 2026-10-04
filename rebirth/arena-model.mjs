import {CLASSES,CLASS_SKILLS,SECOND_SKILLS,THIRD_SKILLS,FOURTH_SKILLS,FIFTH_SKILLS,firstJobUnlocked,rollBaseStats} from './data.mjs';
import {beginCombatSkill,stepCombatSkills} from './combat-skills.mjs';
import {beginThird,stepThird} from './advancement.mjs';
import {beginFourth,stepFourth} from './fourth-job.mjs';
import {beginFifth,stepFifth,fifthUnlocked} from './fifth-job.mjs';
import {supportTick,absorbDamage,holyDamage} from './priest.mjs';
import {botName} from './arena-names.mjs?v=arena-ranks-150';
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
export const ARENA_ELITE_MIN_SCORE=2600;
export function tier(score,rank){
 if(score===null||score===undefined)return {name:'언랭크',step:'',label:'언랭크',color:'#a7b0c7'};
 const s=Math.max(0,Math.floor(score));
 if(s>=ARENA_ELITE_MIN_SCORE&&Number.isInteger(rank)&&rank>=1&&rank<=10){
  const name=rank===1?'챔피언':rank<=3?'챌린저':'그랜드 마스터';
  return {name,step:'',label:name,color:name==='챔피언'?'#ffdc86':name==='챌린저'?'#f7d588':'#eabb82'};
 }
 if(s>=2200){const step=['IV','III','II','I'][clamp(Math.floor((s-2200)/100),0,3)];return {name:'마스터',step,label:`마스터 ${step}`,color:'#d3a6f5'};}
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
 return {name:meta.name&&!/^투사\d+$/.test(meta.name)?meta.name:botName(id),classId,level,stats,advancement:4,items,equipped:Object.fromEntries(items.map((item,i)=>[i,item.id])),costumes:[],equippedCostume:null,score,botId:id};
}
export function arenaProfile(state,score=null,rank=null,id=null){
 const p=power(state);
 return {id,name:state.name,classId:state.classId,score,rank,tier:tier(score,rank),combatPower:p.combatPower,costumeId:p.costumeId,level:state.level};
}
export async function arenaOfferProfiles(arena,readPlayer){
 return Promise.all((arena.offers||[]).map(async offer=>{
  const rank=(arena.top100||[]).find(row=>row.id===offer.id)?.rank||null;
  const state=offer.kind==='bot'?buildBot({id:Number(offer.id.slice(4)),name:offer.name,classId:offer.classId,score:offer.score}):await readPlayer(offer.id.slice(7));
  return {...arenaProfile(state,offer.score,rank,offer.id),used:offer.used===true};
 }));
}
function seedNumber(value){let h=2166136261;for(const c of String(value)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
// Use the same pulse, cooldown and support schedulers as the other combat modes.
export function simulateArena(leftState,rightState,seed='arena'){
 let rand=seedNumber(seed)||1;
 const random=()=>{rand^=rand<<13;rand^=rand>>>17;rand^=rand<<5;return (rand>>>0)/4294967296;};
 const states=[leftState,rightState],skillSets={1:CLASS_SKILLS,2:SECOND_SKILLS,3:THIRD_SKILLS,4:FOURTH_SKILLS,5:FIFTH_SKILLS};
 const readyKeys={1:'ultimateReady',2:'skillReady',3:'thirdReady',4:'fourthReady',5:'fifthReady'};
 const fighters=states.map((state,side)=>{
  const stats=power(state),maxHp=Math.max(1,stats.hp*30);
  return {id:side,classId:state.classId,advancement:state.advancement||0,level:state.level,x:side*400,y:0,hp:maxHp,maxHp,power:{...stats,hp:maxHp,level:state.level,firstJob:firstJobUnlocked(state)},nextBasic:side*4,nextCast:2+side*3,opening:{1:2+side*3,2:10+side*3,3:18+side*3,4:26+side*3,5:34+side*3},state};
 });
 const frames=[];
 let currentTick=0;
 const snapshot=(side,extra)=>frames.push({at:currentTick*100,side,leftHp:fighters[0].hp,rightHp:fighters[1].hp,leftShield:Math.round(fighters[0].shield||0),rightShield:Math.round(fighters[1].shield||0),...extra});
 for(let tick=0;tick<=900&&fighters.every(f=>f.hp>0);tick++){
  currentTick=tick;
  for(let side=0;side<2;side++){
   const a=fighters[side],b=fighters[1-side];if(a.hp<=0||b.hp<=0)break;
   const hit=(scale,critAdd=0,target=b,slot=0)=>{
    if(a.hp<=0||b.hp<=0)return;
    const crit=random()<Math.min(.95,(a.power.crit||.05)+critAdd);
    const raw=a.power.attack*scale*(crit?a.power.critDamage||1.6:1);
    // Arena HP is thirtyfold for readable fights; HP-based offensive flat damage keeps its normal scale.
    const flat=a.holyFlatDamage||0;a.holyFlatDamage=flat/30;
    const modified=holyDamage(a,raw,tick);a.holyFlatDamage=flat;
    const mitigation=1/(1+Math.max(0,b.power.defense||0)/2600);
    const damage=Math.max(0,Math.round(absorbDamage(b,modified*mitigation*(.92+random()*.16),tick)));
    b.hp=Math.max(0,b.hp-damage);
    snapshot(side,{type:slot?'skill':'basic',slot,skill:slot?skillSets[slot][a.classId]?.name:null,damage,crit});
   };
   if(tick>=a.nextCast){
    const unlocked=slot=>slot===5?fifthUnlocked(a):slot===1?firstJobUnlocked(a.state):a.advancement>=slot-1;
    const available=slot=>unlocked(slot)&&tick>=a.opening[slot]&&tick>=(a[readyKeys[slot]]||0);
    // Heal when injured, protect before heavy attacks, and use each unlocked offensive skill.
    let order=[5,4,3,2,1];
    if(a.classId==='priest')order=a.hp/a.maxHp<=.55?[5,2,3,4,1]:a.hp/a.maxHp<=.8?[2,3,4,5,1]:[3,4,1,5,2];
    for(const slot of order){
     if(!available(slot)||a.classId==='priest'&&[2,5].includes(slot)&&a.hp/a.maxHp>.82)continue;
     const cast=slot<=2?beginCombatSkill(a,b,tick,slot):slot===3?beginThird(a,b,tick):slot===4?beginFourth(a,b,tick):beginFifth(a,b,tick);
     if(cast){snapshot(side,{type:'cast',slot,skill:skillSets[slot][a.classId].name,damage:0,crit:false});a.nextCast=tick+7;break;}
    }
   }
   stepCombatSkills(a,[b],tick,hit);
   stepThird(a,b,tick,(scale,critAdd=0)=>hit(scale,critAdd,b,3));
   stepFourth(a,b,tick,(scale,critAdd=0)=>hit(scale,critAdd,b,4));
   stepFifth(a,[b],tick,hit);
   const hpBefore=a.hp,shieldBefore=a.shield||0;
   supportTick([a],tick);
   if(a.hp>hpBefore||(a.shield||0)>shieldBefore)snapshot(side,{type:'support',skill:(a.shield||0)>shieldBefore?'성역의 결계':'체력 회복',damage:0,heal:Math.round(a.hp-hpBefore),shield:Math.round((a.shield||0)-shieldBefore),crit:false});
   if(tick>=a.nextBasic&&b.hp>0){hit(1);a.nextBasic=tick+Math.max(1,Math.round(10/Math.max(.6,a.power.cadence||1)));}
  }
 }
 const won=fighters[1].hp<=0||(fighters[0].hp>0&&fighters[0].hp/fighters[0].maxHp>fighters[1].hp/fighters[1].maxHp);
 return {won,duration:frames.at(-1)?.at||0,frames,leftMaxHp:fighters[0].maxHp,rightMaxHp:fighters[1].maxHp,leftHp:fighters[0].hp,rightHp:fighters[1].hp};
}
