import {TOWER_CLASSES,towerFacing,facingVector} from './tower-model.mjs?v=combat-catalog-1';
import {CLASS_SKILLS,SECOND_SKILLS} from './data.mjs?v=combat-catalog-1';
import {incomingDamage} from './journey-balance.mjs?v=combat-catalog-1';
export const COOP_TIERS=[{level:60,name:'숲의 균열',hp:700000,attack:450,art:'moss',gold:18000,cube:20,highCube:3,fragment:0},{level:140,name:'용암의 균열',hp:3500000,attack:1800,art:'wolf',gold:35000,cube:30,highCube:5,fragment:0},{level:200,name:'공허의 균열',hp:10000000,attack:3400,art:'king',gold:60000,cube:40,highCube:8,fragment:0}];
const clamp=n=>Math.max(120,Math.min(3080,n));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function startCoop(room,now){const w=structuredClone(room),tier=COOP_TIERS[w.tier];if(w.status!=='waiting'||w.members.length<1)throw Error('INVALID_COOP_ROOM');w.status='fighting';w.started=now;w.tick=0;w.maxHp=Math.round(tier.hp*(.65+.55*w.members.length));w.hp=w.maxHp;w.enemy={x:1600,y:1400,face:1};w.hazards=[];w.effects=[];w.numbers=[];w.projectiles=[];w.serial=0;w.nextPattern=20;w.phase=0;w.members.forEach((m,i)=>Object.assign(m,{x:1300+i*200,y:1900,hp:m.power.hp,input:[0,0,0],inputAt:0,attackReady:0,skillReady:0,dashReady:0,guardReady:0,immune:0,hurtReady:0,damage:0,face:1,dir:6,walk:0,ultimateReady:0,guardUntil:0,secondUntil:0,attackUntil:0,skillUntil:0}));return w;}
export function advanceCoop(room,user,input,now){
 const w=structuredClone(room);if(w.status!=='fighting')return w;
 w.effects||=[];w.numbers||=[];w.projectiles||=[];w.serial||=0;
 const tier=COOP_TIERS[w.tier],upto=Math.min(900,Math.floor((now-w.started)/100));
 // Only a bounded, recent backlog is interactive; long disconnections still time out.
 if(upto-w.tick>100){w.tick=upto-100;for(const m of w.members)m.input=[0,0,0];}
 for(;w.tick<upto&&w.status==='fighting';w.tick++){
  const t=w.tick,alive=w.members.filter(m=>m.hp>0&&!m.left);if(!alive.length){w.status='lost';break;}
  w.effects=w.effects.filter(x=>x.end>t).slice(-50);w.numbers=w.numbers.filter(x=>x.end>t).slice(-40);w.projectiles=w.projectiles.filter(x=>x.end>t);
  const target=alive.reduce((a,b)=>dist(a,w.enemy)<dist(b,w.enemy)?a:b),e=w.enemy;
  if(dist(e,target)>115){const a=Math.atan2(target.y-e.y,target.x-e.x);e.dir=towerFacing(target.x-e.x,target.y-e.y,e.dir??2);e.walk=(e.walk||0)+1;e.x=clamp(e.x+Math.cos(a)*15);e.y=clamp(e.y+Math.sin(a)*15);if(Math.abs(target.x-e.x)>45)e.face=target.x<e.x?-1:1;}
  if(t>=w.nextPattern){w.enemyCastStart=t;w.enemyCastUntil=t+15;w.enemyAttackStart=t+15;w.enemyAttackUntil=t+21;e.castDir=e.dir;w.enemyAttackDir=e.dir;const phase=w.phase++;for(const m of alive)w.hazards.push({x:m.x,y:m.y,r:170,inner:0,at:t+15,end:t+19,multiplier:1.6});if(phase%3===2)w.hazards.push({x:e.x,y:e.y,r:4500,inner:520,at:t+25,end:t+29,multiplier:2});if(phase%3===1)w.hazards.push({x:e.x,y:e.y,r:330,inner:0,at:t+20,end:t+24,multiplier:2});w.nextPattern=t+(w.hp<w.maxHp*.35?32:45);}
  for(const m of alive){const c={...TOWER_CLASSES[m.classId],skillScale:{warrior:3.8,mage:4.2,archer:3.5,rogue:4.4,pirate:4}[m.classId],skillCooldown:{warrior:90,mage:110,archer:85,rogue:100,pirate:100}[m.classId]};let [x,y,bits]=now-m.inputAt<1000?m.input:[0,0,0],n=Math.hypot(x,y);if(n>1){x/=n;y/=n;}m.dir=towerFacing(x,y,m.dir??6);m.moving=n>.01;if(m.moving)m.walk=(m.walk||0)+1;let speed=(bits&1)&&c.range>300?17:25;
   if((bits&4)&&t>=m.dashReady){m.dashReady=t+35;m.immune=t+5;m.dashUntil=t+3;m.dx=x;m.dy=y||(!x?facingVector(m.dir??6).y:0);if(!n)m.dx=facingVector(m.dir??6).x;}
   if(t<(m.dashUntil||0)){x=m.dx;y=m.dy;speed=75;}
   m.x=clamp(m.x+x*speed);m.y=clamp(m.y+y*speed);if(x)m.face=x<0?-1:1;
   const fx=(kind,x,y,size=180,angle=0)=>w.effects.push({id:++w.serial,kind,x,y,size,angle,start:t,end:t+7});
   const first=t<(m.guardUntil||0)?CLASS_SKILLS[m.classId]:null,second=t<(m.secondUntil||0)?SECOND_SKILLS[m.classId]:null;
   if((bits&8)&&t>=(m.ultimateReady||0)){const sk=CLASS_SKILLS[m.classId];m.ultimateReady=t+sk.cooldown*10;m.guardUntil=t+sk.seconds*10;m.hp=Math.min(m.power.hp,m.hp+m.power.hp*.12);m.skillStart=t;m.skillUntil=t+8;m.skillDir=m.dir;fx('rune',m.x,m.y,220);}
   const hit=(scale,extraCrit=0)=>{const critical=Math.random()<Math.min(.95,m.power.crit+(first?.critAdd||0)+(second?.critAdd||0)+extraCrit),damage=Math.min(w.hp,Math.max(1,Math.round(m.power.attack*m.power.boss*scale*(first?.damage||1)*(second?.damage||1)*(critical?m.power.critDamage+(second?.critDamageAdd||0):1))));w.hp-=damage;m.damage+=damage;w.enemyHurtUntil=t+2;w.numbers.push({id:++w.serial,value:damage,x:e.x,y:e.y-120,kind:critical?'critical':'outgoing',start:t,end:t+9});fx('impact',e.x,e.y-50,150);};
   if((bits&1)&&t>=m.attackReady&&dist(m,e)<=c.range){m.attackReady=t+c.cooldown;m.attackStart=t;m.attackUntil=t+6;m.attackDir=towerFacing(e.x-m.x,e.y-m.y,m.dir);m.dir=m.attackDir;m.face=e.x<m.x?-1:1;if(c.range<300)m.pendingHit={at:t+2,scale:c.cooldown/10*m.power.cadence};else{const a=Math.atan2(e.y-m.y,e.x-m.x),ticks=Math.max(1,Math.ceil(dist(m,e)/75));w.projectiles.push({id:++w.serial,side:'player',owner:m.id,classId:m.classId,x:m.x,y:m.y-30,dx:Math.cos(a)*75,dy:Math.sin(a)*75,r:28,at:t,end:t+ticks});m.pendingHit={at:t+ticks,scale:c.cooldown/10*m.power.cadence,ranged:true};}}
   if(m.pendingHit&&t>=m.pendingHit.at){if(m.pendingHit.ranged||dist(m,e)<=c.range+30){hit(m.pendingHit.scale);if(!m.pendingHit.ranged)fx('slash',(m.x+e.x)/2,(m.y+e.y)/2-40,220,Math.atan2(e.y-m.y,e.x-m.x));}delete m.pendingHit;}
   if(m.advanced&&(bits&2)&&t>=m.skillReady){const sk=SECOND_SKILLS[m.classId];if(sk.type!=='attack'||dist(m,e)<760){m.skillReady=t+sk.cooldown*10;m.skillStart=t;m.skillUntil=t+8;m.skillDir=towerFacing(e.x-m.x,e.y-m.y,m.dir);if(sk.type==='attack'){m.pendingSkill={at:t+3,hits:sk.hits,damage:sk.damage,critAdd:sk.critAdd||0};}else{m.secondUntil=t+sk.seconds*10;fx('rune',m.x,m.y,220);}}}
   if(m.pendingSkill&&t>=m.pendingSkill.at){if(dist(m,e)<790){for(let i=0;i<m.pendingSkill.hits;i++)hit(m.pendingSkill.damage,m.pendingSkill.critAdd);fx('slash',e.x,e.y-50,310,Math.atan2(e.y-m.y,e.x-m.x));}delete m.pendingSkill;}
   if(t>=m.immune&&t>=m.hurtReady){const hazard=w.hazards.find(h=>t>=h.at&&t<h.end&&dist(m,h)<h.r+20&&dist(m,h)>=h.inner-20),mult=hazard?hazard.multiplier:dist(m,e)<105?.6:0;if(mult){const damage=Math.max(1,Math.round(incomingDamage(tier.attack,m.power.defense)*mult*(first?.guard||1)*(second?.guard||1)));m.hp=Math.max(0,m.hp-damage);m.hurtReady=t+5;w.numbers.push({id:++w.serial,value:damage,x:m.x,y:m.y-100,kind:"incoming",start:t,end:t+9});fx("impact",m.x,m.y-40,110);}}
  }
  for(const q of w.projectiles){q.x+=q.dx;q.y+=q.dy;}
  w.hazards=w.hazards.filter(h=>h.end>t);if(w.hp<=0)w.status='won';
 }
 if(w.tick>=900&&w.status==='fighting')w.status='lost';
 const me=w.members.find(m=>m.id===user&&!m.left);if(me&&input){if(!Array.isArray(input)||input.length!==3||!input.every(Number.isFinite)||Math.abs(input[0])>1||Math.abs(input[1])>1||!Number.isInteger(input[2])||input[2]<0||input[2]>15)throw Error('INVALID_COOP_INPUT');me.input=input;me.inputAt=now;}
 return w;
}
