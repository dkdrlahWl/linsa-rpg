import {RAID_ENCOUNTERS,raidWalls,covered,raidMove} from './raid-content.mjs?v=sovereign-20261025';
import {TOWER_CLASSES,towerFacing,facingVector} from './tower-model.mjs?v=sovereign-20261025';
import {beginCombatSkill,stepCombatSkills} from './combat-skills.mjs?v=sovereign-20261025';
import {beginThird,stepThird} from './advancement.mjs?v=sovereign-20261025';
import {beginFourth,stepFourth} from './fourth-job.mjs?v=sovereign-20261025';
import {beginFifth,stepFifth,boundedCombatEffects} from './fifth-job.mjs?v=sovereign-20261025';
import {beginPriest,stepPriest,PRIEST_SKILLS,supportTick,absorbDamage,holyDamage} from './priest.mjs?v=sovereign-20261025';
import {incomingDamage} from './journey-balance.mjs?v=sovereign-20261025';
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
 w.effects=boundedCombatEffects(w.effects,t,70);w.numbers=w.numbers.filter(v=>v.end>t).slice(-48);w.hazards=w.hazards.filter(v=>v.end>t);w.projectiles=w.projectiles.filter(v=>v.end>t);
 const target=alive[(Math.floor(t/80)+w.tier)%alive.length],enraged=w.hp<w.maxHp*.35;
 // Lv.200: 시간 가속 — from 30s the boss hits 15% harder every 10s (a hard DPS check).
 const atk=b.attack*(w.tier===3?1+Math.max(0,t-300)*.0015:1);
 if(w.tier===3&&t===300){w.announcement='시간 가속 · 보스 공격력이 계속 상승합니다';w.announcementUntil=t+40;}
 e.dir=towerFacing(target.x-e.x,target.y-e.y,e.dir);
 if(t>(w.enemyCastUntil||0)&&dist(e,target)>430){let angle=Math.atan2(target.y-e.y,target.x-e.x);raidMove(e,e.x+Math.cos(angle)*9,e.y+Math.sin(angle)*9,w.walls);e.walk++;}
 const circle=(x,y,r,delay,mult,inner=0,extra={})=>w.hazards.push({type:'circle',x,y,r,inner,start:t,at:t+delay,end:t+delay+3,multiplier:mult,...extra});
 const hard=w.tier===3;
 if(t>=w.nextBasic){circle(target.x,target.y,hard?190:150,10,hard?2:1.5,0,{basic:true,label:'평타'});w.nextBasic=t+(hard?(enraged?12:16):(enraged?17:23));w.enemyAttackStart=t+10;w.enemyAttackUntil=t+15;w.enemyAttackDir=e.dir;}
 if(t>=w.nextPattern){
  const phase=w.phase++;w.enemyCastStart=t;w.enemyCastUntil=t+22;w.enemyAttackStart=t+22;w.enemyAttackUntil=t+30;
  if(phase%3===0){w.announcement='탄막 · 발사체 사이로 피하세요';w.announcementUntil=t+70;const angle=Math.atan2(target.y-e.y,target.x-e.x),count=hard?40:16+w.tier*8,waves=hard?2:1;for(let k=0;k<waves;k++)for(let i=0;i<count;i++){const a=angle+(i+k*.5)*Math.PI*2/count,v=hard?54+k*6:46;w.projectiles.push({id:++w.serial,side:'enemy',x:e.x,y:e.y,dx:Math.cos(a)*v,dy:Math.sin(a)*v,r:34,at:t+22+k*8,end:t+120,multiplier:hard?4:5});}}
  else if(w.tier===0){circle(e.x,e.y,1250,25,3.5,phase%2?470:0);w.announcement=phase%2?'조류 고리 · 보스 가까이':'해일 · 바깥으로';w.announcementUntil=t+28;}
  else if(w.tier===1){for(const m of alive.slice(0,4))circle(m.x,m.y,260,23,4);w.announcement='용철 낙하 · 서로 떨어지세요';w.announcementUntil=t+26;}
  else if(w.tier===2){const a=phase*Math.PI/4;w.hazards.push({type:'line',x:e.x-Math.cos(a)*2200,y:e.y-Math.sin(a)*2200,tx:e.x+Math.cos(a)*2200,ty:e.y+Math.sin(a)*2200,width:260,start:t,label:'성좌 절단',at:t+25,end:t+29,multiplier:5,cover:true,source:{...e}});for(const m of alive.slice(0,3))circle(m.x,m.y,210,32,3,0,{label:'별빛 낙하'});w.announcement='성좌 절단 · 광선과 장판 회피';w.announcementUntil=t+35;}
  else {const ox=1250+((phase*577)%700),oy=1250+((phase*331)%700);if(phase%2){circle(ox,oy,4500,24,6,700,{label:'시간 붕괴'});circle(ox,oy,420,24,6,0,{label:'시간 붕괴'});}else{for(const dx of [-650,650])w.hazards.push({type:'line',x:1600+dx,y:100,tx:1600-dx,ty:3100,width:340,start:t,label:'교차 광선',at:t+22,end:t+26,multiplier:6,cover:true,source:{x:1600+dx,y:100}});w.hazards.push({type:'line',x:100,y:1600+((phase*211)%900)-450,tx:3100,ty:1600-((phase*211)%900)+450,width:300,start:t,label:'시간 절단',at:t+30,end:t+34,multiplier:6,cover:true,source:{x:100,y:1600}});}
   // Every phase also drops a delayed eclipse on each living player.
   for(const m of alive)circle(m.x,m.y,250,34,4.5,0,{label:'일식 추적'});
   w.announcement='시간 붕괴 · 안전 고리 / 교차 광선 · 일식 추적';w.announcementUntil=t+34;}
  w.nextPattern=t+(hard?(enraged?42:62):(enraged?70:100));
 }
 if(t<w.nextCorruption&&t>=w.nextCorruption-30&&w.corruptionWarningAt!==w.nextCorruption){w.corruptionWarningAt=w.nextCorruption;circle(1600,1600,4500,w.nextCorruption-t,0,0,{warningOnly:true,kind:'corruption',label:'침식 · 회복 준비'});}
 if(t>=w.nextJudgment){w.judgmentAt=t+35;w.announcement=w.tier?'대붕괴 · 사제 보호막 준비':'심해 침식 · 사제 치유 준비';w.announcementUntil=t+40;circle(1600,1600,4500,35,0,0,{warningOnly:true,kind:'judgment',label:w.announcement});w.nextJudgment=t+(w.tier===3?220:300);}
 supportTick(w.members,t);
 for(const m of alive){const c=TOWER_CLASSES[m.classId];let [x,y,bits]=w.started+t*100-m.inputAt<1500?m.input:[0,0,0],len=Math.max(1,Math.hypot(x,y));x/=len;y/=len;m.moving=Math.hypot(x,y)>.01;m.dir=towerFacing(x,y,m.dir);if(m.moving)m.walk++;
  let speed=c.speed;if((bits&4)&&t>=m.dashReady){const v=facingVector(m.dir);m.dashReady=t+c.dashCooldown;m.immune=t+5;m.dashUntil=t+3;m.dx=m.moving?x:v.x;m.dy=m.moving?y:v.y;}if(t<(m.dashUntil||0)){x=m.dx;y=m.dy;speed*=3;}raidMove(m,m.x+x*speed,m.y+y*speed,w.walls);
  const emit=fx=>w.effects.push({...fx,id:++w.serial});
  const hit=(scale,extra=0)=>{if(w.hp<=0)return;const seed=((t*2654435761+(++w.serial)*1013904223)>>>0)/4294967296,crit=seed<Math.min(.95,m.power.crit+extra),value=Math.min(w.hp,Math.max(1,Math.round(holyDamage(m,m.power.attack*scale*(crit?m.power.critDamage:1),t)*m.power.boss)));w.hp-=value;m.damage+=value;w.enemyHurtUntil=t+2;w.numbers.push({id:++w.serial,value,x:e.x,y:e.y-140,kind:crit?'critical':'outgoing',start:t,end:t+12});};
  if((bits&1)&&t>=m.attackReady&&dist(m,e)<=c.range&&!covered(m,e,w.walls)){m.attackReady=t+c.cooldown;m.attackStart=t;m.attackUntil=t+6;m.attackDir=towerFacing(e.x-m.x,e.y-m.y,m.dir);hit(c.cooldown/10*m.power.cadence);emit({kind:m.classId==='priest'?'priest-orb':'impact',slot:1,classId:m.classId,owner:m.id,fromX:m.x,fromY:m.y-90,x:e.x,y:e.y-90,size:180,start:t,end:t+8});}
  if(bits&8)beginCombatSkill(m,e,t,1);if(bits&2)beginCombatSkill(m,e,t,2);if(bits&16)beginThird(m,e,t);if(bits&32)beginFourth(m,e,t);
  if(bits&64)beginFifth(m,e,t);stepFifth(m,[{...e,hp:w.hp,maxHp:w.maxHp}],t,hit,emit);
  stepCombatSkills(m,[e],t,hit,emit);stepThird(m,e,t,hit,emit);stepFourth(m,e,t,hit,emit);
 }
 supportTick(w.members,t,w.numbers,w.effects,()=>++w.serial);
 const hurt=(m,value,unavoidable=false)=>{if(m.hp<=0||m.left||(!unavoidable&&(t<m.immune||t<m.hurtReady)))return;const damage=absorbDamage(m,Math.max(1,Math.round(value)),t);m.hp=Math.max(0,m.hp-damage);if(!unavoidable)m.hurtReady=t+5;w.numbers.push({id:++w.serial,value:damage,x:m.x,y:m.y-110,kind:'incoming',start:t,end:t+9});};
 if(t>=w.nextCorruption){for(const m of alive){m.corruption=t<(m.purifiedUntil||0)?0:(m.corruption||0)+1;hurt(m,m.power.hp*(.10+m.corruption*(w.tier===3?.05:.035)),true);}w.nextCorruption=t+(w.tier===3?90:120);}
 if(t===w.judgmentAt){for(const m of alive)hurt(m,m.power.hp*(w.tier===3?.7:w.tier?.6:.3)+incomingDamage(atk,m.power.defense)*(w.tier===3?2.5:2),true);}
 for(const h of w.hazards)if(!h.warningOnly&&t===h.at){for(const m of alive){let inside;if(h.type==='line'){const dx=h.tx-h.x,dy=h.ty-h.y,k=Math.max(0,Math.min(1,((m.x-h.x)*dx+(m.y-h.y)*dy)/(dx*dx+dy*dy)));inside=Math.hypot(m.x-h.x-k*dx,m.y-h.y-k*dy)<h.width/2+25;}else inside=dist(m,h)<h.r+25&&dist(m,h)>=h.inner;if(inside&&!(h.cover&&covered(h.source,m,w.walls)))hurt(m,incomingDamage(atk,m.power.defense)*h.multiplier);}}
 for(const q of w.projectiles){if(t<q.at)continue;const old={x:q.x,y:q.y},next={x:q.x+q.dx,y:q.y+q.dy};if(covered(old,next,w.walls)){q.end=t;continue;}q.x=next.x;q.y=next.y;for(const m of alive)if(dist(m,q)<q.r+35){hurt(m,incomingDamage(atk,m.power.defense)*q.multiplier);q.end=t;break;}}
 if(w.hp<=0){w.status='won';w.chest={x:e.x,y:e.y};w.lootAt=now;w.effects=[];w.hazards=[];w.projectiles=[];for(const m of w.members){m.hp=Math.max(1,m.hp);m.input=[0,0,0];delete m.firstCast;delete m.secondCast;delete m.thirdCast;delete m.fourthCast;delete m.fifthCast;}}
 }
 if(w.tick>=b.seconds*10&&w.status==='fighting')w.status='lost';const me=w.members.find(m=>m.id===user&&!m.left);if(me&&input){me.input=input;me.inputAt=now;}return w;
}
