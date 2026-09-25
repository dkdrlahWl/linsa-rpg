import {TOWER_CLASSES} from './tower-model.mjs?v=prime-recovery-1';
import {incomingDamage} from './journey-balance.mjs?v=prime-recovery-1';
export const COOP_TIERS=[{level:60,name:'숲의 균열',hp:700000,attack:450,art:'moss',gold:18000,cube:20,highCube:3,fragment:120},{level:140,name:'용암의 균열',hp:3500000,attack:1800,art:'wolf',gold:35000,cube:30,highCube:5,fragment:180},{level:200,name:'공허의 균열',hp:10000000,attack:3400,art:'king',gold:60000,cube:40,highCube:8,fragment:260}];
const clamp=n=>Math.max(120,Math.min(3080,n));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function startCoop(room,now){const w=structuredClone(room),tier=COOP_TIERS[w.tier];if(w.status!=='waiting'||w.members.length<1)throw Error('INVALID_COOP_ROOM');w.status='fighting';w.started=now;w.tick=0;w.maxHp=Math.round(tier.hp*(.65+.55*w.members.length));w.hp=w.maxHp;w.enemy={x:1600,y:1400,face:1};w.hazards=[];w.nextPattern=20;w.phase=0;w.members.forEach((m,i)=>Object.assign(m,{x:1300+i*200,y:1900,hp:m.power.hp,input:[0,0,0],inputAt:0,attackReady:0,skillReady:0,dashReady:0,guardReady:0,immune:0,hurtReady:0,damage:0,face:1}));return w;}
export function advanceCoop(room,user,input,now){
 const w=structuredClone(room);if(w.status!=='fighting')return w;
 const tier=COOP_TIERS[w.tier],upto=Math.min(2400,Math.floor((now-w.started)/100));
 // Only a bounded, recent backlog is interactive; long disconnections still time out.
 if(upto-w.tick>100){w.tick=upto-100;for(const m of w.members)m.input=[0,0,0];}
 for(;w.tick<upto&&w.status==='fighting';w.tick++){
  const t=w.tick,alive=w.members.filter(m=>m.hp>0&&!m.left);if(!alive.length){w.status='lost';break;}
  const target=alive.reduce((a,b)=>dist(a,w.enemy)<dist(b,w.enemy)?a:b),e=w.enemy;
  if(dist(e,target)>115){const a=Math.atan2(target.y-e.y,target.x-e.x);e.x=clamp(e.x+Math.cos(a)*15);e.y=clamp(e.y+Math.sin(a)*15);if(Math.abs(target.x-e.x)>45)e.face=target.x<e.x?-1:1;}
  if(t>=w.nextPattern){const phase=w.phase++;for(const m of alive)w.hazards.push({x:m.x,y:m.y,r:170,inner:0,at:t+15,end:t+19,multiplier:1.6});if(phase%3===2)w.hazards.push({x:e.x,y:e.y,r:4500,inner:520,at:t+25,end:t+29,multiplier:2});if(phase%3===1)w.hazards.push({x:e.x,y:e.y,r:330,inner:0,at:t+20,end:t+24,multiplier:2});w.nextPattern=t+(w.hp<w.maxHp*.35?32:45);}
  for(const m of alive){const c={...TOWER_CLASSES[m.classId],skillScale:{warrior:3.8,mage:4.2,archer:3.5,rogue:4.4,pirate:4}[m.classId],skillCooldown:{warrior:90,mage:110,archer:85,rogue:100,pirate:100}[m.classId]};let [x,y,bits]=now-m.inputAt<1000?m.input:[0,0,0],n=Math.hypot(x,y);if(n>1){x/=n;y/=n;}let speed=(bits&1)&&c.range>300?17:25;
   if((bits&4)&&t>=m.dashReady){m.dashReady=t+35;m.immune=t+5;m.dashUntil=t+3;m.dx=x;m.dy=y||(!x?1:0);}
   if(t<(m.dashUntil||0)){x=m.dx;y=m.dy;speed=75;}
   m.x=clamp(m.x+x*speed);m.y=clamp(m.y+y*speed);if(x)m.face=x<0?-1:1;
   if((bits&8)&&t>=m.guardReady){m.guardReady=t+240;m.immune=t+12;for(const friend of alive)if(dist(m,friend)<650)friend.hp=Math.min(friend.power.hp,friend.hp+friend.power.hp*.15);}
   const hit=scale=>{const crit=Math.random()<m.power.crit?m.power.critDamage:1,damage=Math.min(w.hp,Math.round(m.power.attack*m.power.boss*scale*crit));w.hp-=damage;m.damage+=damage;m.attackUntil=t+4;m.face=e.x<m.x?-1:1;};
   if((bits&1)&&t>=m.attackReady&&dist(m,e)<=c.range){m.attackReady=t+c.cooldown;hit(c.cooldown/10*m.power.cadence);}
   if((bits&2)&&t>=m.skillReady&&dist(m,e)<650){m.skillReady=t+c.skillCooldown;hit(c.skillScale);}
   if(t>=m.immune&&t>=m.hurtReady){const hazard=w.hazards.find(h=>t>=h.at&&t<h.end&&dist(m,h)<h.r+20&&dist(m,h)>=h.inner-20),mult=hazard?hazard.multiplier:dist(m,e)<105?.6:0;if(mult){m.hp=Math.max(0,m.hp-Math.round(incomingDamage(tier.attack,m.power.defense)*mult));m.hurtReady=t+6;}}
  }
  w.hazards=w.hazards.filter(h=>h.end>t);if(w.hp<=0)w.status='won';
 }
 if(w.tick>=2400&&w.status==='fighting')w.status='lost';
 const me=w.members.find(m=>m.id===user&&!m.left);if(me&&input){if(!Array.isArray(input)||input.length!==3||!input.every(Number.isFinite)||Math.abs(input[0])>1||Math.abs(input[1])>1||!Number.isInteger(input[2])||input[2]<0||input[2]>15)throw Error('INVALID_COOP_INPUT');me.input=input;me.inputAt=now;}
 return w;
}
