import {initializeWave,advanceWaveRaw} from './wave-model.mjs?v=wave-clear-2';
import {beginFourth,stepFourth} from './fourth-job.mjs?v=wave-clear-2';
import {beginThird,stepThird} from './advancement.mjs?v=wave-clear-2';
import {TOWER_CLASSES,towerFacing,facingVector} from './tower-model.mjs?v=wave-clear-2';
import {CLASS_SKILLS,SECOND_SKILLS} from './data.mjs?v=wave-clear-2';
import {incomingDamage} from './journey-balance.mjs?v=wave-clear-2';
import {COOP_TIERS} from './rift-rewards.mjs?v=wave-clear-2';
export {COOP_TIERS};
const clamp=n=>Math.max(120,Math.min(3080,n));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function startCoop(room,now){const w=structuredClone(room),tier=COOP_TIERS[w.tier];if(w.status!=='waiting'||w.members.length<1)throw Error('INVALID_COOP_ROOM');w.status='fighting';w.started=now;w.tick=0;w.maxHp=tier.hp;w.hp=w.maxHp;w.enemy={x:1600,y:1400,face:1};w.hazards=[];w.effects=[];w.numbers=[];w.projectiles=[];w.serial=0;w.nextPattern=20;w.phase=0;w.members.forEach((m,i)=>Object.assign(m,{x:1300+i*200,y:1900,hp:m.power.hp,input:[0,0,0],inputAt:0,attackReady:0,skillReady:0,dashReady:0,guardReady:0,immune:0,hurtReady:0,damage:0,face:1,dir:6,walk:0,ultimateReady:0,guardUntil:0,secondUntil:0,attackUntil:0,skillUntil:0}));return w.mode==='wave'?initializeWave(w):w;}
export function advanceCoopRaw(room,user,input,now,frames=[]){
 const w=structuredClone(room);
 if(input&&(!Array.isArray(input)||input.length!==3||!input.every(Number.isFinite)||Math.abs(input[0])>1||Math.abs(input[1])>1||!Number.isInteger(input[2])||input[2]<0||input[2]>63))throw Error('INVALID_COOP_INPUT');
 if(w.mode==='wave')return advanceWaveRaw(w,user,input,now,frames);
 if(w.status==='won'){
  if(input){const m=w.members.find(m=>m.id===user&&!m.left);if(m){m.input=input;m.inputAt=now;}}
  const dt=Math.max(0,Math.min(1000,now-(w.lootAt??now)))/1000;w.lootAt=now;w.tick+=dt*10;
  for(const m of w.members){if(m.left)continue;let [x,y]=now-m.inputAt<1500?m.input:[0,0];const n=Math.max(1,Math.hypot(x,y));m.x=clamp(m.x+x/n*TOWER_CLASSES[m.classId].speed*10*dt);m.y=clamp(m.y+y/n*TOWER_CLASSES[m.classId].speed*10*dt);m.dir=towerFacing(x,y,m.dir);m.walk=(m.walk||0)+(Math.hypot(x,y)>.01?dt*10:0);if(x)m.face=x<0?-1:1;}
  const me=w.members.find(m=>m.id===user&&!m.left);if(me&&input){me.input=[input[0],input[1],0];me.inputAt=now;}return w;
 }
 if(w.status!=='fighting')return w;
 w.effects||=[];w.numbers||=[];w.projectiles||=[];w.serial||=0;
 const tier=COOP_TIERS[w.tier],upto=Math.min(900,Math.floor((now-w.started)/100));
 // Only a bounded, recent backlog is interactive; long disconnections still time out.
 if(upto-w.tick>100){w.tick=upto-100;for(const m of w.members)m.input=[0,0,0];}
 for(;w.tick<upto&&w.status==='fighting';w.tick++){
  const t=w.tick;for(const f of frames){if(f.tick===t){const actor=w.members.find(m=>m.id===f.user&&!m.left);if(actor){actor.input=f.input;actor.inputAt=w.started+t*100;}}}
  const alive=w.members.filter(m=>m.hp>0&&!m.left);if(!alive.length){w.status='lost';break;}
  w.effects=w.effects.filter(x=>x.end>t).slice(-50);w.numbers=w.numbers.filter(x=>x.end>t).slice(-40);w.projectiles=w.projectiles.filter(x=>x.end>t);
  const target=alive.reduce((a,b)=>dist(a,w.enemy)<dist(b,w.enemy)?a:b),e=w.enemy;
  if(dist(e,target)>115){const a=Math.atan2(target.y-e.y,target.x-e.x);e.dir=towerFacing(target.x-e.x,target.y-e.y,e.dir??2);e.walk=(e.walk||0)+1;e.x=clamp(e.x+Math.cos(a)*15);e.y=clamp(e.y+Math.sin(a)*15);if(Math.abs(target.x-e.x)>45)e.face=target.x<e.x?-1:1;}
  // Frequent locked-target strikes, with room for melee players to sidestep.
  if(t>=(w.nextBasic??8)&&t>=(w.enemyCastUntil||0)){
   const near=dist(e,target)<300,aim=near?{x:(e.x+target.x)/2,y:(e.y+target.y)/2}:target;
   w.hazards.push({type:'circle',basic:true,x:aim.x,y:aim.y,r:near?155:125,inner:0,at:t+6,end:t+8,multiplier:.85});
   w.enemyAttackStart=t+6;w.enemyAttackUntil=t+10;w.enemyAttackDir=towerFacing(target.x-e.x,target.y-e.y,e.dir);w.nextBasic=t+18;
  }
  if(t>=w.nextPattern){
   w.enemyCastStart=t;w.enemyCastUntil=t+15;w.enemyAttackStart=t+15;w.enemyAttackUntil=t+21;e.castDir=e.dir;w.enemyAttackDir=e.dir;
   const phase=w.phase++;
   if(phase%4===3)w.hazards.push({x:e.x,y:e.y,r:4500,inner:520,at:t+25,end:t+29,multiplier:2});
   else if(phase%2===1)w.hazards.push({x:e.x,y:e.y,r:330,inner:0,at:t+15,end:t+19,multiplier:1.7});
   else for(const m of [...alive].sort((a,b)=>dist(a,e)-dist(b,e)).slice(0,2))w.hazards.push({x:m.x,y:m.y,r:170,inner:0,at:t+15,end:t+19,multiplier:1.6});
   w.nextPattern=t+90;
  }
  for(const m of alive){const c={...TOWER_CLASSES[m.classId],skillScale:{warrior:3.8,mage:4.2,archer:3.5,rogue:4.4,pirate:4}[m.classId],skillCooldown:{warrior:90,mage:110,archer:85,rogue:100,pirate:100}[m.classId]};let [x,y,bits]=w.started+t*100-m.inputAt<1500?m.input:[0,0,0],n=Math.hypot(x,y);if(n>1){x/=n;y/=n;}m.dir=towerFacing(x,y,m.dir??6);m.moving=n>.01;if(m.moving)m.walk=(m.walk||0)+1;let speed=(bits&1)&&c.range>300?17:c.speed;
   if((bits&4)&&t>=m.dashReady){m.dashReady=t+c.dashCooldown;m.immune=t+5;m.dashUntil=t+3;const v=facingVector(m.dir??6);m.dx=n?x/Math.hypot(x,y):v.x;m.dy=n?y/Math.hypot(x,y):v.y;}
   if(t<(m.dashUntil||0)){x=m.dx;y=m.dy;speed=c.speed*3;}
   m.x=clamp(m.x+x*speed);m.y=clamp(m.y+y*speed);if(x)m.face=x<0?-1:1;
   const fx=(kind,x,y,size=180,angle=0)=>w.effects.push({id:++w.serial,kind,x,y,size,angle,start:t,end:t+7});
   const first=t<(m.guardUntil||0)?CLASS_SKILLS[m.classId]:null,second=t<(m.secondUntil||0)&&SECOND_SKILLS[m.classId].type==='buff'?SECOND_SKILLS[m.classId]:null;
   if(m.power.firstJob!==false&&(bits&8)&&t>=(m.ultimateReady||0)){const sk=CLASS_SKILLS[m.classId];m.ultimateReady=t+sk.cooldown*10;m.guardUntil=t+sk.seconds*10;m.hp=Math.min(m.power.hp,m.hp+m.power.hp*.12);m.skillStart=t;m.skillUntil=t+8;m.skillDir=m.dir;fx('rune',m.x,m.y,220);}
   const hit=(scale,extraCrit=0)=>{const critical=coopRandom(w,t,m.id)<Math.min(.95,m.power.crit+(first?.critAdd||0)+(second?.critAdd||0)+extraCrit),damage=Math.min(w.hp,Math.max(1,Math.round(m.power.attack*m.power.boss*scale*(first?.damage||1)*(second?.damage||1)*(critical?m.power.critDamage+(second?.critDamageAdd||0):1))));w.hp-=damage;m.damage+=damage;w.enemyHurtUntil=t+2;w.numbers.push({id:++w.serial,value:damage,x:e.x,y:e.y-120,kind:critical?'critical':'outgoing',start:t,end:t+24});fx('impact',e.x,e.y-50,150);};
   if((bits&1)&&t>=m.attackReady&&dist(m,e)<=c.range){m.attackReady=t+c.cooldown;m.attackStart=t;m.attackUntil=t+6;m.attackDir=towerFacing(e.x-m.x,e.y-m.y,m.dir);m.dir=m.attackDir;m.face=e.x<m.x?-1:1;if(c.range<300)(m.pendingHits||=[]).push({at:t+2,scale:c.cooldown/10*m.power.cadence});else{const a=Math.atan2(e.y-m.y,e.x-m.x),ticks=Math.max(1,Math.ceil(dist(m,e)/75));w.projectiles.push({id:++w.serial,side:'player',owner:m.id,classId:m.classId,x:m.x,y:m.y-30,dx:Math.cos(a)*75,dy:Math.sin(a)*75,r:28,at:t+2,end:t+ticks+2});(m.pendingHits||=[]).push({at:t+ticks+2,scale:c.cooldown/10*m.power.cadence,ranged:true});}}
   m.pendingHits||=[];if(m.pendingHit){m.pendingHits.push(m.pendingHit);delete m.pendingHit;}for(const pending of m.pendingHits){if(t>=pending.at&&(pending.ranged||dist(m,e)<=c.range+30)){hit(pending.scale);if(!pending.ranged)fx('slash',(m.x+e.x)/2,(m.y+e.y)/2-40,220,Math.atan2(e.y-m.y,e.x-m.x));}}m.pendingHits=m.pendingHits.filter(p=>p.at>t).slice(-16);
   if(m.advanced&&(bits&2)&&t>=m.skillReady){const sk=SECOND_SKILLS[m.classId];if(sk.type!=='attack'||dist(m,e)<760){m.skillReady=t+sk.cooldown*10;m.skillStart=t;m.skillUntil=t+8;w.effects.push({id:++w.serial,kind:'second',follow:sk.type!=='attack',owner:m.id,classId:m.classId,x:sk.type==='attack'?e.x:m.x,y:sk.type==='attack'?e.y:m.y,size:sk.type==='attack'?500:360,start:t,end:t+16});m.skillDir=towerFacing(e.x-m.x,e.y-m.y,m.dir);if(sk.type==='attack'){m.pendingSkill={at:t+3,hits:sk.hits,damage:sk.damage,critAdd:sk.critAdd||0};}else{m.secondUntil=t+sk.seconds*10;fx('rune',m.x,m.y,220);}}}
   if(bits&32)beginFourth(m,e,t);stepFourth(m,e,t,scale=>hit(scale),effect=>w.effects.push({...effect,id:++w.serial}));
   if(bits&16)beginThird(m,e,t);stepThird(m,e,t,scale=>hit(scale),effect=>w.effects.push({...effect,id:++w.serial}));
   if(m.pendingSkill&&t>=m.pendingSkill.at){if(dist(m,e)<790){for(let i=0;i<m.pendingSkill.hits;i++)hit(m.pendingSkill.damage,m.pendingSkill.critAdd);fx('slash',e.x,e.y-50,310,Math.atan2(e.y-m.y,e.x-m.x));}delete m.pendingSkill;}
   if(t>=m.immune&&t>=m.hurtReady){const hazard=w.hazards.find(h=>t>=h.at&&t<h.end&&dist(m,h)<h.r&&dist(m,h)>=h.inner),mult=hazard?hazard.multiplier:0;if(mult){const damage=Math.max(1,Math.round(incomingDamage(tier.attack,m.power.defense)*mult*(first?.guard||1)*(second?.guard||1)));m.hp=Math.max(0,m.hp-damage);m.hurtReady=t+5;w.numbers.push({id:++w.serial,value:damage,x:m.x,y:m.y-100,kind:"incoming",start:t,end:t+9});fx("impact",m.x,m.y-40,110);}}
  }
  for(const q of w.projectiles){if(t>=q.at){q.x+=q.dx;q.y+=q.dy;}}
  w.hazards=w.hazards.filter(h=>h.end>t);if(w.hp<=0){w.status='won';w.chest={x:e.x,y:e.y};w.lootAt=now;w.hazards=[];w.effects=[];w.numbers=[];w.projectiles=[];for(const m of w.members){if(!m.left)m.hp=Math.max(1,m.hp);m.input=[0,0,0];m.attackUntil=0;m.skillUntil=0;m.dashUntil=0;delete m.pendingHit;delete m.pendingHits;delete m.pendingSkill;delete m.thirdCast;delete m.fourthCast;}}
 }
 if(w.tick>=900&&w.status==='fighting')w.status='lost';
 const me=w.members.find(m=>m.id===user&&!m.left);if(me&&input){if(!Array.isArray(input)||input.length!==3||!input.every(Number.isFinite)||Math.abs(input[0])>1||Math.abs(input[1])>1||!Number.isInteger(input[2])||input[2]<0||input[2]>63)throw Error('INVALID_COOP_INPUT');me.input=input;me.inputAt=now;}
 return w;
}

// Stable RNG makes a replay of the same inputs yield the same damage.
function coopRandom(w,t,id){let n=((t+1)*2654435761+(w.serial||0)*1013904223)>>>0;for(const c of id)n=Math.imul(n^c.charCodeAt(0),16777619)>>>0;return n/4294967296;}
export function predictCoopStep(room,user,input){
 if(room.status==='won')return advanceCoopRaw(room,user,input,(room.lootAt||room.started)+100);
 return advanceCoopRaw(room,null,null,room.started+(room.tick+1)*100,[{user,tick:room.tick,input}]);
}
const validFrame=f=>f&&Number.isInteger(f.tick)&&Array.isArray(f.input)&&f.input.length===3&&f.input.every(Number.isFinite)&&Math.abs(f.input[0])<=1&&Math.abs(f.input[1])<=1&&Number.isInteger(f.input[2])&&f.input[2]>=0&&f.input[2]<=63;
const bare=w=>{const b=structuredClone(w);delete b._net;return b;};
// Return a confirmed personal timeline as well as the shared room snapshot.
// The client replays its still-unconfirmed inputs from here, not from a world
// that has already advanced using an older held direction.
export function coopClientView(room){
 if(!room)return room;const view=bare(room),net=room._net,me=room.members.find(m=>m.id===room.me);
 if(!net||room.status!=='fighting'||!me)return view;
 const target=Math.min(room.tick,(me.inputAck??-1)+1),point=[...net.points].reverse().find(p=>p.tick<=target);
 if(!point)return view;
 let base=structuredClone(point);
 while(base.tick<target&&base.status==='fighting')base=advanceCoopRaw(base,null,null,base.started+(base.tick+1)*100,net.frames);
 for(const m of base.members){const current=room.members.find(a=>a.id===m.id);if(current?.left){m.left=true;m.hp=0;}}
 view.predictionBase={...base,id:room.id,me:room.me,revision:room.revision};return view;
}
export function advanceCoop(room,user,input,now){
 if(Array.isArray(input)||!input)return advanceCoopRaw(room,user,input,now);
 if(!Array.isArray(input.frames)||input.frames.length>40||!input.frames.every(validFrame))throw Error('INVALID_COOP_INPUT');
 if(room.status==='won')return advanceCoopRaw(room,user,input.frames.at(-1)?.input||[0,0,0],now);
 if(room.status!=='fighting')return structuredClone(room);
 const upto=Math.min(room.mode==='wave'?room.tick+100:900,Math.max(room.tick,Math.floor((now-room.started)/100))),net=structuredClone(room._net||{points:[bare(room)],frames:[]});
 let earliest=Infinity;
 for(const f of input.frames){
  if(f.tick<Math.max(net.points[0].tick,upto-30))continue;
  if(f.tick>upto+2)throw Error('INVALID_COOP_FUTURE');
  if(net.frames.some(old=>old.user===user&&old.tick===f.tick))continue;
  net.frames.push({user,tick:f.tick,input:f.input});earliest=Math.min(earliest,f.tick);
 }
 let w=bare(room);
 if(earliest<w.tick){const point=[...net.points].reverse().find(p=>p.tick<=earliest);if(point){w=structuredClone(point);net.points=net.points.filter(p=>p.tick<=point.tick);}}
 // Membership changes are never undone by input replay.
 for(const m of w.members){const current=room.members.find(a=>a.id===m.id);if(current?.left){m.left=true;m.hp=0;}}
 for(;w.tick<upto&&w.status==='fighting';){
  w=advanceCoopRaw(w,null,null,w.started+(w.tick+1)*100,net.frames);
  if(w.tick%(w.mode==='wave'?10:5)===0)net.points.push(bare(w));
 }
 const cutoff=upto-35;net.points=net.points.filter((p,i,a)=>p.tick>=cutoff||a[i+1]?.tick>cutoff||i===a.length-1);
 net.frames=net.frames.filter(f=>f.tick>=net.points[0].tick);
 for(const m of w.members)m.inputAck=Math.max(m.inputAck??-1,...net.frames.filter(f=>f.user===m.id).map(f=>f.tick));
 if(w.status==='lost'&&upto-w.tick<30&&(room.mode==='wave'||upto<900)){w.status='fighting';w.pendingOutcome=true;}
 w._net=net;return w;
}
