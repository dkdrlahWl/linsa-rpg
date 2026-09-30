import {RAID_ENCOUNTERS,raidWalls,covered,raidMove} from './raid-content.mjs?v=lumi-public-80';
import {TOWER_CLASSES,towerFacing,facingVector} from './tower-model.mjs?v=lumi-public-80';
import {beginCombatSkill,stepCombatSkills} from './combat-skills.mjs?v=lumi-public-80';
import {beginThird,stepThird} from './advancement.mjs?v=lumi-public-80';
import {beginFourth,stepFourth} from './fourth-job.mjs?v=lumi-public-80';
import {beginPriest,stepPriest,PRIEST_SKILLS,supportTick,absorbDamage,holyDamage} from './priest.mjs?v=lumi-public-80';
import {incomingDamage} from './journey-balance.mjs?v=lumi-public-80';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function startRaid(room,now){
 if(room.status!=='waiting'||!RAID_ENCOUNTERS[room.tier]||!room.members.length||room.members.length>8)throw Error('INVALID_COOP_ROOM');
 const w=structuredClone(room),b=RAID_ENCOUNTERS[w.tier];Object.assign(w,{status:'fighting',started:now,tick:0,hp:b.hp,maxHp:b.hp,enemy:{x:1600,y:1200,dir:2,walk:0},walls:raidWalls(w.tier),hazards:[],effects:[],numbers:[],projectiles:[],serial:0,nextBasic:15,nextPattern:60,nextCorruption:120,nextJudgment:300,phase:0});
 w.members.forEach((m,i)=>Object.assign(m,{x:1200+i%4*250,y:2520+Math.floor(i/4)*210,hp:m.power.hp,input:[0,0,0],inputAt:0,attackReady:0,skillReady:0,dashReady:0,ultimateReady:0,thirdReady:0,fourthReady:0,immune:0,hurtReady:0,damage:0,healing:0,shield:0,dir:6,walk:0,corruption:0,soloSupport:false}));return w;
}
export function advanceRaidRaw(room,user,input,now,frames=[]){
 const w=room,b=RAID_ENCOUNTERS[w.tier];if(!b)return w;w.walls=[];
 const upto=Math.min(b.seconds*10,Math.floor((now-w.started)/100));
 if(w.status==='won'){const dt=Math.min(1,Math.max(0,now-(w.lootAt||now))/1000);w.lootAt=now;for(const m of w.members){if(m.left)continue;const active=m.id===user&&input?input:now-m.inputAt<1500?m.input:[0,0,0],moving=Math.hypot(active[0],active[1])>.01;raidMove(m,m.x+active[0]*250*dt,m.y+active[1]*250*dt,[]);if(moving){m.dir=towerFacing(active[0],active[1],m.dir);m.walk=(m.walk||0)+dt*10;}m.moving=moving;if(m.id===user&&input){m.input=input;m.inputAt=now;}}return w;}
 if(w.status!=='fighting')return w;
 if(upto-w.tick>100){w.tick=upto-100;w.members.forEach(m=>m.input=[0,0,0]);}
 for(;w.tick<upto&&w.status==='fighting';w.tick++){
 const t=w.tick,e=w.enemy,alive=w.members.filter(m=>!m.left&&m.hp>0);if(!alive.length){w.status='lost';break;}
 for(const f of frames)if(f.tick===t){const m=alive.find(m=>m.id===f.user);if(m){m.input=f.input;m.inputAt=w.started+t*100;}}
 w.effects=w.effects.filter(v=>v.end>t).slice(-70);w.numbers=w.numbers.filter(v=>v.end>t).slice(-48);w.hazards=w.hazards.filter(v=>v.end>t);w.projectiles=w.projectiles.filter(v=>v.end>t);
 const target=alive[(Math.floor(t/80)+w.tier)%alive.length],enraged=w.hp<w.maxHp*.35;
 e.dir=towerFacing(target.x-e.x,target.y-e.y,e.dir);
 if(t>(w.enemyCastUntil||0)&&dist(e,target)>430){let angle=Math.atan2(target.y-e.y,target.x-e.x);raidMove(e,e.x+Math.cos(angle)*9,e.y+Math.sin(angle)*9,w.walls);e.walk++;}
 const circle=(x,y,r,delay,mult,inner=0)=>w.hazards.push({type:'circle',x,y,r,inner,at:t+delay,end:t+delay+3,multiplier:mult});
 if(t>=w.nextBasic){circle(target.x,target.y,150,10,1.5);w.nextBasic=t+(enraged?17:23);w.enemyAttackStart=t+10;w.enemyAttackUntil=t+15;}
 if(t>=w.nextPattern){
  const phase=w.phase++;w.enemyCastStart=t;w.enemyCastUntil=t+22;w.enemyAttackStart=t+22;w.enemyAttackUntil=t+30;
  if(phase%3===0){w.announcement='탄막 · 발사체 사이로 피하세요';w.announcementUntil=t+70;const angle=Math.atan2(target.y-e.y,target.x-e.x),count=16+w.tier*8;for(let i=0;i<count;i++){const a=angle+i*Math.PI*2/count;w.projectiles.push({id:++w.serial,side:'enemy',x:e.x,y:e.y,dx:Math.cos(a)*46,dy:Math.sin(a)*46,r:34,at:t+22,end:t+120,multiplier:5});}}
  else if(w.tier===0){circle(e.x,e.y,1250,25,3.5,phase%2?470:0);w.announcement=phase%2?'조류 고리 · 보스 가까이':'해일 · 바깥으로';w.announcementUntil=t+28;}
  else if(w.tier===1){for(const m of alive.slice(0,4))circle(m.x,m.y,260,23,4);w.announcement='용철 낙하 · 서로 떨어지세요';w.announcementUntil=t+26;}
  else if(w.tier===2){const a=phase*Math.PI/4;w.hazards.push({type:'line',x:e.x-Math.cos(a)*2200,y:e.y-Math.sin(a)*2200,tx:e.x+Math.cos(a)*2200,ty:e.y+Math.sin(a)*2200,width:260,at:t+25,end:t+29,multiplier:5,cover:true,source:{...e}});for(const m of alive.slice(0,3))circle(m.x,m.y,210,32,3);w.announcement='성좌 절단 · 광선과 장판 회피';w.announcementUntil=t+35;}
  else {if(phase%2){circle(1600,1600,4500,26,5,850);circle(1600,1600,500,26,5);}else for(const dx of [-650,650])w.hazards.push({type:'line',x:1600+dx,y:100,tx:1600-dx,ty:3100,width:320,at:t+24,end:t+28,multiplier:5,cover:true,source:{x:1600+dx,y:100}});w.announcement='시간 붕괴 · 안전 고리 / 교차 광선';w.announcementUntil=t+30;}
  w.nextPattern=t+(enraged?70:100);
 }
 if(t>=w.nextJudgment){w.judgmentAt=t+35;w.announcement=w.tier?'대붕괴 · 사제 보호막 준비':'심해 침식 · 사제 치유 준비';w.announcementUntil=t+40;w.nextJudgment=t+300;}
 supportTick(w.members,t);
 for(const m of alive){const c=TOWER_CLASSES[m.classId];let [x,y,bits]=w.started+t*100-m.inputAt<1500?m.input:[0,0,0],len=Math.max(1,Math.hypot(x,y));x/=len;y/=len;m.moving=Math.hypot(x,y)>.01;m.dir=towerFacing(x,y,m.dir);if(m.moving)m.walk++;
  let speed=c.speed;if((bits&4)&&t>=m.dashReady){const v=facingVector(m.dir);m.dashReady=t+c.dashCooldown;m.immune=t+5;m.dashUntil=t+3;m.dx=m.moving?x:v.x;m.dy=m.moving?y:v.y;}if(t<(m.dashUntil||0)){x=m.dx;y=m.dy;speed*=3;}raidMove(m,m.x+x*speed,m.y+y*speed,w.walls);
  const emit=fx=>w.effects.push({...fx,id:++w.serial});
  const hit=(scale,extra=0)=>{if(w.hp<=0)return;const seed=((t*2654435761+(++w.serial)*1013904223)>>>0)/4294967296,crit=seed<Math.min(.95,m.power.crit+extra),value=Math.min(w.hp,Math.max(1,Math.round(holyDamage(m,m.power.attack*scale*(crit?m.power.critDamage:1),t)*m.power.boss)));w.hp-=value;m.damage+=value;w.enemyHurtUntil=t+2;w.numbers.push({id:++w.serial,value,x:e.x,y:e.y-140,kind:crit?'critical':'outgoing',start:t,end:t+12});};
  if((bits&1)&&t>=m.attackReady&&dist(m,e)<=(m.classId==='priest'?1500:c.range)&&!covered(m,e,w.walls)){m.attackReady=t+c.cooldown;m.attackStart=t;m.attackUntil=t+6;m.attackDir=towerFacing(e.x-m.x,e.y-m.y,m.dir);hit(c.cooldown/10*m.power.cadence);emit({kind:m.classId==='priest'?'priest-orb':'impact',slot:1,classId:m.classId,owner:m.id,fromX:m.x,fromY:m.y-90,x:e.x,y:e.y-90,size:180,start:t,end:t+8});}
  if(bits&8)beginCombatSkill(m,e,t,1);if(bits&2)beginCombatSkill(m,e,t,2);if(bits&16)beginThird(m,e,t);if(bits&32)beginFourth(m,e,t);
  if(m.classId==='priest'){if(bits&64)beginPriest(m,e,t,5);stepPriest(m,[e],t,5,hit,emit);}
  stepCombatSkills(m,[e],t,hit,emit);stepThird(m,e,t,hit,emit);stepFourth(m,e,t,hit,emit);
 }
 supportTick(w.members,t,w.numbers,w.effects,()=>++w.serial);
 const hurt=(m,value,unavoidable=false)=>{if(m.hp<=0||m.left||(!unavoidable&&(t<m.immune||t<m.hurtReady)))return;const damage=absorbDamage(m,Math.max(1,Math.round(value)),t);m.hp=Math.max(0,m.hp-damage);if(!unavoidable)m.hurtReady=t+5;w.numbers.push({id:++w.serial,value:damage,x:m.x,y:m.y-110,kind:'incoming',start:t,end:t+9});};
 if(t>=w.nextCorruption){for(const m of alive){m.corruption=t<(m.purifiedUntil||0)?0:(m.corruption||0)+1;hurt(m,m.power.hp*(.10+m.corruption*.035),true);}w.nextCorruption=t+120;}
 if(t===w.judgmentAt){for(const m of alive)hurt(m,m.power.hp*(w.tier?.6:.3)+incomingDamage(b.attack,m.power.defense)*2,true);}
 for(const h of w.hazards)if(t===h.at){for(const m of alive){let inside;if(h.type==='line'){const dx=h.tx-h.x,dy=h.ty-h.y,k=Math.max(0,Math.min(1,((m.x-h.x)*dx+(m.y-h.y)*dy)/(dx*dx+dy*dy)));inside=Math.hypot(m.x-h.x-k*dx,m.y-h.y-k*dy)<h.width/2+25;}else inside=dist(m,h)<h.r+25&&dist(m,h)>=h.inner;if(inside&&!(h.cover&&covered(h.source,m,w.walls)))hurt(m,incomingDamage(b.attack,m.power.defense)*h.multiplier);}}
 for(const q of w.projectiles){if(t<q.at)continue;const old={x:q.x,y:q.y},next={x:q.x+q.dx,y:q.y+q.dy};if(covered(old,next,w.walls)){q.end=t;continue;}q.x=next.x;q.y=next.y;for(const m of alive)if(dist(m,q)<q.r+35){hurt(m,incomingDamage(b.attack,m.power.defense)*q.multiplier);q.end=t;break;}}
 if(w.hp<=0){w.status='won';w.chest={x:e.x,y:e.y};w.lootAt=now;w.effects=[];w.hazards=[];w.projectiles=[];for(const m of w.members){m.hp=Math.max(1,m.hp);m.input=[0,0,0];delete m.firstCast;delete m.secondCast;delete m.thirdCast;delete m.fourthCast;}}
 }
 if(w.tick>=b.seconds*10&&w.status==='fighting')w.status='lost';const me=w.members.find(m=>m.id===user&&!m.left);if(me&&input){me.input=input;me.inputAt=now;}return w;
}

