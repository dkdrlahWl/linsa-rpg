import {TOWER_CLASSES,towerFacing,facingVector} from './tower-model.mjs?v=damage-thirty-10';
import {CLASS_SKILLS,SECOND_SKILLS,THIRD_SKILLS,FOURTH_SKILLS} from './data.mjs?v=damage-thirty-10';
import {incomingDamage} from './journey-balance.mjs?v=damage-thirty-10';

export const WAVE_SECONDS=30, WAVE_LIMIT=100;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const bound=x=>Math.max(120,Math.min(3080,x));
function random(w){w.seed=(Math.imul(w.seed,1664525)+1013904223)>>>0;return w.seed/4294967296;}
export function waveStats(wave){
 const level=Math.max(1,wave)*2,block=Math.floor((wave-1)/10);
 // Four similarly equipped players share ~24 seconds of single-target work.
 return {level,species:block%30,eliteCount:block+1,hp:Math.round(55+level*11+level*level*1.2),attack:Math.round(7+level*2.1+level*level*.025),speed:22};
}
function emitWaveSpawn(w){
 const plan=w.spawnPlan;if(!plan)return;const s=waveStats(w.wave),age=w.tick-plan.at;
 const spawn=(side,elite)=>{const p=200+random(w)*2800,x=side===1?3040:side===3?160:p,y=side===0?160:side===2?3040:p;w.monsters.push({id:++w.serial,x,y,side,elite,species:s.species,level:s.level,hp:s.hp*(elite?4:1),maxHp:s.hp*(elite?4:1),attack:s.attack*(elite?1.7:1),speed:elite?23:s.speed,ready:w.tick+10,walk:0,face:1});};
 // Reinforcements arrive during the first ten seconds, so later waves do not
 // automatically lose merely because their total spawn budget exceeds the arena limit.
 for(let side=0;side<4;side++){const due=Math.min(w.spawnCounts[side],1+Math.floor(age/10));while(plan.regular[side]<due&&w.monsters.length<WAVE_LIMIT){spawn(side,false);plan.regular[side]++;}}
 const elitesDue=Math.min(s.eliteCount,1+Math.floor(age*s.eliteCount/100));while(plan.elites<elitesDue&&w.monsters.length<WAVE_LIMIT){spawn(Math.floor(random(w)*4),true);plan.elites++;}
 if(w.monsters.length>=WAVE_LIMIT){w.status='lost';w.reason='overrun';w.endedTick=w.tick;}
}
export function spawnWave(w){
 w.wave++;w.nextWave=w.tick+WAVE_SECONDS*10;w.spawnCounts=Array.from({length:4},()=>5+Math.floor(random(w)*6));w.spawnPlan={at:w.tick,regular:[0,0,0,0],elites:0};emitWaveSpawn(w);
}
export function initializeWave(w){
 Object.assign(w,{wave:0,nextWave:0,monsters:[],kills:0,seed:(w.started>>>0)||1});
 for(const m of w.members){m.x=1450+w.members.indexOf(m)*100;m.y=1600;m.reviveProgress=0;}
 spawnWave(w);return w;
}
function number(w,value,a,kind){w.numbers.push({id:++w.serial,value,x:a.x,y:a.y-90,kind,start:w.tick,end:w.tick+16});}
function damage(w,m,targets,scale,critAdd=0){
 const first=w.tick<(m.guardUntil||0)?CLASS_SKILLS[m.classId]:null;
 for(const enemy of targets){if(enemy.hp<=0)continue;const critical=random(w)<Math.min(.95,m.power.crit+(first?.critAdd||0)+critAdd),value=Math.min(enemy.hp,Math.max(1,Math.round(m.power.attack*scale*(first?.damage||1)*(critical?m.power.critDamage:1))));enemy.hp-=value;m.damage+=value;number(w,value,enemy,critical?'critical':'outgoing');if(enemy.hp<=0){w.kills++;m.kills=(m.kills||0)+1;}}
}
function pulse(w,m,cast,sk){
 const aim=sk.mode==='orbit'?m:sk.mode==='volley'?(w.monsters.filter(e=>e.hp>0&&distance(e,m)<=sk.range+150).sort((a,b)=>distance(a,m)-distance(b,m))[0]||cast):cast;
 const targets=w.monsters.filter(e=>e.hp>0&&distance(e,aim)<=sk.radius);
 damage(w,m,targets,sk.damage);
 if(cast.kind!=='fourth')w.effects.push({id:++w.serial,kind:cast.kind,classId:m.classId,owner:m.id,x:aim.x,y:aim.y,size:sk.radius*2,orbit:sk.mode==='orbit',pulse:sk.hits-cast.left,start:w.tick,impact:w.tick,end:w.tick+Math.max(4,Math.min(10,sk.interval)),fromX:m.x,fromY:m.y,volley:sk.mode==='volley'});
 cast.left--;cast.next+=sk.interval;
}
export function advanceWaveRaw(room,user,input,now,frames=[]){
 const w=structuredClone(room);if(w.status!=='fighting')return w;
 const upto=Math.max(w.tick,Math.floor((now-w.started)/100));
 // A disconnected arena cannot be kept alive by skipping simulation time.
 const end=Math.min(upto,w.tick+100);
 for(;w.tick<end&&w.status==='fighting';w.tick++){
  const t=w.tick;
  for(const f of frames)if(f.tick===t){const m=w.members.find(a=>a.id===f.user&&!a.left);if(m){m.input=f.input;m.inputAt=w.started+t*100;}}
  let alive=w.members.filter(m=>!m.left&&m.hp>0);
  if(!alive.length){w.status='lost';w.reason='dead';w.endedTick=t;break;}
  if(t>=w.nextWave)spawnWave(w);else emitWaveSpawn(w);if(w.status==='lost')break;
  w.effects=w.effects.filter(e=>e.end>t).slice(-70);w.numbers=w.numbers.filter(e=>e.end>t).slice(-35);w.hazards=w.hazards.filter(h=>h.end>t);w.projectiles=[];
  for(const m of alive){
   const c=TOWER_CLASSES[m.classId];let [x,y,bits]=w.started+t*100-m.inputAt<1500?m.input:[0,0,0];const n=Math.max(1,Math.hypot(x,y));x/=n;y/=n;m.dir=towerFacing(x,y,m.dir);m.moving=Math.hypot(x,y)>.01;if(m.moving)m.walk++;
   if((bits&4)&&t>=m.dashReady){m.dashReady=t+c.dashCooldown;m.immune=t+5;m.dashUntil=t+3;const f=facingVector(m.dir);m.dx=m.moving?x:f.x;m.dy=m.moving?y:f.y;}
   const dashing=t<(m.dashUntil||0),speed=c.speed;m.x=bound(m.x+(dashing?m.dx*3:x)*speed);m.y=bound(m.y+(dashing?m.dy*3:y)*speed);if(x)m.face=x<0?-1:1;
   if(m.power.firstJob!==false&&(bits&8)&&t>=m.ultimateReady){const sk=CLASS_SKILLS[m.classId];m.ultimateReady=t+sk.cooldown*10;m.guardUntil=t+sk.seconds*10;m.hp=Math.min(m.power.hp,m.hp+m.power.hp*.12);m.skillStart=t;m.skillUntil=t+8;m.skillDir=m.dir;}
   const targets=w.monsters.filter(e=>e.hp>0).sort((a,b)=>distance(a,m)-distance(b,m)),target=targets[0];
   if(target&&(bits&1)&&t>=m.attackReady&&distance(m,target)<=c.range){m.attackReady=t+c.cooldown;m.attackStart=t;m.attackUntil=t+6;m.attackDir=towerFacing(target.x-m.x,target.y-m.y,m.dir);m.dir=m.attackDir;
    // Small cleave keeps all five starter classes viable against a crowd.
    const victims=targets.filter(e=>distance(e,m)<=c.range&&distance(e,target)<(c.range<300?230:140)).slice(0,3);
    damage(w,m,victims,c.cooldown/10*m.power.cadence);w.effects.push({id:++w.serial,kind:'slash',classId:m.classId,owner:m.id,x:target.x,y:target.y-30,size:180,angle:Math.atan2(target.y-m.y,target.x-m.x),start:t,end:t+5});
   }
   if(target&&m.advanced&&(bits&2)&&t>=m.skillReady&&distance(m,target)<760){const sk=SECOND_SKILLS[m.classId];m.skillReady=t+sk.cooldown*10;m.skillStart=t;m.skillUntil=t+8;m.skillDir=m.dir;damage(w,m,targets.filter(e=>distance(e,target)<360),sk.damage*sk.hits,sk.critAdd||0);w.effects.push({id:++w.serial,kind:'second',classId:m.classId,x:target.x,y:target.y,size:650,start:t,end:t+16});}
   for(const [bit,stage,key,kind,skills] of [[16,2,'third','third',THIRD_SKILLS],[32,3,'fourth','fourth',FOURTH_SKILLS]]){
    const sk=skills[m.classId];if(target&&(bits&bit)&&m.power.advancement>=stage&&t>=(m[key+'Ready']||0)&&distance(m,target)<=sk.range){m[key+'Ready']=t+sk.cooldown*10;m[key+'Cast']={kind,x:target.x,y:target.y,next:t+(kind==='fourth'&&sk.mode!=='orbit'?4:2),left:sk.hits};m.skillStart=t;m.skillUntil=t+9;m.skillDir=m.dir;}
    const cast=m[key+'Cast'];
    if(cast&&kind==='fourth'){
     const lead=sk.mode==='orbit'?2:4;cast.visualNext??=cast.next;cast.visualLeft??=cast.left;
     while(cast.visualLeft>0&&t>=cast.visualNext-lead){const aim=sk.mode==='orbit'?m:cast;
      w.effects.push({id:++w.serial,kind,classId:m.classId,owner:m.id,x:aim.x,y:aim.y,size:sk.radius*2,orbit:sk.mode==='orbit',pulse:sk.hits-cast.visualLeft,start:cast.visualNext-lead,impact:cast.visualNext,end:cast.visualNext+(sk.mode==='orbit'?sk.interval:4)});
      cast.visualLeft--;cast.visualNext+=sk.interval;
     }
    }
    if(cast&&t>=cast.next){pulse(w,m,cast,sk);if(!cast.left)delete m[key+'Cast'];}
   }
  }
  w.monsters=w.monsters.filter(e=>e.hp>0);
  // A cleared full spawn budget advances immediately, without waiting for the clock.
  const plan=w.spawnPlan;
  if(!w.monsters.length&&plan&&plan.regular.every((n,i)=>n>=w.spawnCounts[i])&&plan.elites>=waveStats(w.wave).eliteCount)spawnWave(w);
  for(const e of w.monsters){
   alive=w.members.filter(m=>!m.left&&m.hp>0);if(!alive.length)break;
   const target=alive.reduce((a,b)=>distance(a,e)<distance(b,e)?a:b),d=distance(target,e);
   e.moving=false;if(!e.strike&&!e.skill&&d>70){const dx=(target.x-e.x)/d,dy=(target.y-e.y)/d;e.x=bound(e.x+dx*e.speed);e.y=bound(e.y+dy*e.speed);e.face=dx<0?-1:1;e.walk++;e.moving=true;}
   if(!e.strike&&!e.skill&&d<150&&t>=e.ready){e.strike={x:target.x,y:target.y,at:t+(e.elite?7:5)};e.castStart=t;e.attackStart=e.strike.at;e.attackUntil=e.attackStart+4;e.attackAngle=Math.atan2(target.y-e.y,target.x-e.x);e.ready=t+(e.elite?20:25);w.hazards.push({type:'circle',x:target.x,y:target.y,r:e.elite?135:95,inner:0,at:e.strike.at,end:e.strike.at+2});}
   if(e.elite&&!e.strike&&!e.skill&&d<950&&t>=(e.skillReady||40)){
    const type=e.species%3===1?'line':'circle',at=t+13;
    e.skill=type==='line'?{type,x:e.x,y:e.y,tx:target.x,ty:target.y,width:130,at,end:at+3}:{type,x:e.species%3===2?e.x:target.x,y:e.species%3===2?e.y:target.y,r:e.species%3===2?240:170,inner:0,at,end:at+3};
    w.hazards.push({...e.skill});e.skillReady=t+85;e.castStart=t;e.attackStart=at;e.attackUntil=at+5;e.attackAngle=Math.atan2(target.y-e.y,target.x-e.x);
   }
   if(e.skill&&t>=e.skill.at){const h=e.skill;for(const m of alive){let inside=distance(m,h)<=h.r;if(h.type==='line'){const dx=h.tx-h.x,dy=h.ty-h.y,q=Math.max(0,Math.min(1,((m.x-h.x)*dx+(m.y-h.y)*dy)/(dx*dx+dy*dy||1)));inside=Math.hypot(m.x-h.x-q*dx,m.y-h.y-q*dy)<=h.width/2;}if(!inside||t<m.immune||t<m.hurtReady)continue;const guard=t<m.guardUntil?CLASS_SKILLS[m.classId].guard||1:1,value=Math.max(1,Math.round(incomingDamage(e.attack,m.power.defense)*1.65*guard));m.hp=Math.max(0,m.hp-value);m.hurtReady=t+3;number(w,value,m,'incoming');if(!m.hp){m.reviveProgress=0;delete m.thirdCast;delete m.fourthCast;}}delete e.skill;}
   if(e.strike&&t>=e.strike.at){for(const m of alive){if(t<m.immune||t<m.hurtReady||distance(m,e.strike)>(e.elite?135:95))continue;const guard=t<m.guardUntil?CLASS_SKILLS[m.classId].guard||1:1,value=Math.max(1,Math.round(incomingDamage(e.attack,m.power.defense)*guard));m.hp=Math.max(0,m.hp-value);m.hurtReady=t+3;number(w,value,m,'incoming');if(!m.hp){m.reviveProgress=0;delete m.thirdCast;delete m.fourthCast;}}
    delete e.strike;
   }
  }
  alive=w.members.filter(m=>!m.left&&m.hp>0);
  if(!alive.length){w.status='lost';w.reason='dead';w.endedTick=t;break;}
  for(const dead of w.members.filter(m=>!m.left&&m.hp<=0)){
   const helper=alive.find(m=>distance(m,dead)<=95&&!m.moving&&t>=(m.dashUntil||0));
   if(helper){if(dead.reviver!==helper.id){dead.reviver=helper.id;dead.reviveProgress=0;}dead.reviveProgress++;}else{dead.reviveProgress=0;dead.reviver=null;}
   if(dead.reviveProgress>=50){dead.hp=Math.max(1,Math.round(dead.power.hp*.3));dead.immune=t+20;dead.reviveProgress=0;dead.reviver=null;dead.input=[0,0,0];dead.inputAt=0;number(w,dead.hp,dead,'heal');}
  }
 }
 const me=w.members.find(m=>m.id===user&&!m.left);if(me&&input){me.input=input;me.inputAt=now;}
 return w;
}
