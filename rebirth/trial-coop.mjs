import {supportTick} from './priest.mjs?v=raid-light-32';
import {ADVANCEMENT_BOSSES} from './advancement.mjs?v=raid-light-32';
import {newTowerBattle,towerStep} from './tower-model.mjs?v=raid-light-32';

// The existing trial simulation supplies all damage, movement and boss patterns.
// Only one actor advances the shared boss timeline each tick.
const sharedKeys=['enemy','hazards','projectiles','effects','numbers','serial','seed','nextPattern','phase','charge','enemyCastStart','enemyCastUntil','enemyAttackStart','enemyAttackUntil','enemyAttackDir','enemyHurtUntil'];
const actorKeys=['fifthCast','fifthReady','holyReductionUntil','shieldGiven','purifiedUntil','holySupport','shield','shieldUntil','shieldOwner','healing','holyHealTick','holyHealAmount','hp','attackReady','skillReady','dashReady','ultimateReady','invulnerableUntil','hurtUntil','guardUntil','secondUntil','attackStart','attackUntil','skillStart','skillUntil','dashUntil','dashX','dashY','firstCast','secondCast','thirdReady','thirdCast','fourthReady','fourthCast','pendingMelee','pendingSkillHit','contactReady'];
const copy=(to,from,keys)=>{for(const key of keys){if(from[key]===undefined)delete to[key];else to[key]=from[key];}};
export function startTrialCoop(room,now){
 const trial=ADVANCEMENT_BOSSES[room.tier];
 if(!trial||room.status!=='waiting'||room.members.length<1||room.members.length>2)throw Error('INVALID_COOP_ROOM');
 const w=structuredClone(room),first=w.members[0];
 const base=newTowerBattle(trial.floor,first.classId,first.power,now,w.id,1,first.advanced);
 copy(w,base,sharedKeys);
 Object.assign(w,{status:'fighting',started:now,tick:0,maxHp:trial.hp,hp:trial.hp});
 w.members.forEach((m,i)=>{
  const b=newTowerBattle(trial.floor,m.classId,m.power,now,w.id,i+1,m.advanced);
  copy(m,b,actorKeys);
  Object.assign(m,b.player,{x:1600+(w.members.length===1?0:(i?100:-100)),input:[0,0,0],inputAt:0,damage:0});
 });
 return w;
}
export function advanceTrialCoopRaw(w,user,input,now,frames=[]){
 if(w.status!=='fighting')return w;
 const trial=ADVANCEMENT_BOSSES[w.tier],upto=Math.min(trial.seconds*10,Math.floor((now-w.started)/100));
 if(upto-w.tick>100){w.tick=upto-100;for(const m of w.members)m.input=[0,0,0];}
 while(w.tick<upto&&w.status==='fighting'){
  const tick=w.tick;
  for(const f of frames)if(f.tick===tick){const m=w.members.find(m=>m.id===f.user&&!m.left);if(m){m.input=f.input;m.inputAt=w.started+tick*100;}}
  const alive=w.members.filter(m=>m.hp>0&&!m.left);
  if(!alive.length){w.status='lost';break;}
  const target=alive.reduce((a,b)=>Math.hypot(a.x-w.enemy.x,a.y-w.enemy.y)<=Math.hypot(b.x-w.enemy.x,b.y-w.enemy.y)?a:b);
  // Target runs first; followers take the same hazards without moving the boss twice.
  for(const m of [target,...alive.filter(m=>m!==target)]){
   const b={...m,sharedTrial:true,soloSupport:w.members.length===1,kind:'tower',worldVersion:3,actorId:m.id,runId:w.id,floor:trial.floor,encounter:trial,advancementStage:w.tier,started:w.started,tick,enemyHp:w.hp,ended:false,won:false,player:{x:m.x,y:m.y,dir:m.dir,face:m.face,walk:m.walk,attackDir:m.attackDir,skillDir:m.skillDir}};
   copy(b,w,sharedKeys);
   const oldSerial=w.serial,oldHp=w.hp;
   towerStep(b,w.started+tick*100-m.inputAt<1500?m.input:[0,0,0],{advanceEnemy:m===target});
   for(const fx of b.effects)if(fx.id>oldSerial&&!fx.hostile){fx.owner=m.id;fx.classId=m.classId;}
   copy(w,b,sharedKeys);w.hp=b.enemyHp;
   copy(m,b,actorKeys);Object.assign(m,b.player,{damage:m.damage+Math.max(0,oldHp-w.hp),immune:b.invulnerableUntil,dx:b.dashX,dy:b.dashY});
   if(w.hp<=0)break;
  }
  supportTick(w.members,tick,w.numbers,w.effects,()=>++w.serial);
  w.tick=tick+1;
  if(w.hp<=0){w.status='won';w.hazards=[];w.projectiles=[];w.effects=[];w.numbers=[];}
  else if(!w.members.some(m=>m.hp>0&&!m.left)||w.tick>=trial.seconds*10)w.status='lost';
 }
 const me=w.members.find(m=>m.id===user&&!m.left);
 if(me&&input){me.input=input;me.inputAt=now;}
 return w;
}
