import {incomingDamage} from './journey-balance.mjs?v=daily-limit-1';
// Shared deterministic combat. Only input vectors/buttons cross the network.
import {CLASS_SKILLS,SECOND_SKILLS} from './data.mjs?v=daily-limit-1';
export const TOWER_STEP = 100;
export const CHEST_REACH=150;
export const canOpenChest=b=>!!b.chest&&Math.hypot(b.player.x-b.chest.x,b.player.y-b.chest.y)<=CHEST_REACH;
export function clearVictoryEffects(b){b.effects=[];b.numbers=[];b.hazards=[];b.projectiles=[];for(const key of ['attackUntil','skillUntil','enemyCastUntil','enemyAttackUntil','guardUntil','secondUntil'])b[key]=0;delete b.pendingMelee;delete b.pendingSkillHit;return b;}

export const TOWER_SIZE = {width:3200,height:3200};
export const TOWER_BOUNDS = {left:150,right:3050,top:150,bottom:3050};
const names=['이끼문 파수꾼 그로움','월익 여왕 셀레네','수정 집게 크라그','용암 송곳니 바르칸','참수기사 모르딘','빙결 마녀 이셀라','독침황제 세르케트','추락한 성상 아우리엘','태엽룡 크로가스','공허왕 아자렐'];
const arts=['moss','moth','crab','wolf','knight','witch','scorpion','seraph','clock','king'];
const patterns=['대지 분쇄','달빛 탄막','십자 수정파','화염 돌진','망령 참격','빙창 감옥','맹독 웅덩이','심판의 고리','시간의 회전침','공허의 종언'];
const guides=['발밑의 문양이 폭발하기 전에 벗어나세요.','부채꼴로 퍼지는 달빛 탄을 비껴가세요.','십자로 갈라지는 수정의 길을 피하세요.','돌진 방향을 확인하고 옆으로 회피하세요.','긴 참격의 경로와 뒤따르는 망령을 피하세요.','연속으로 내려오는 빙창 사이로 이동하세요.','독이 남은 바닥을 피해 전장을 넓게 쓰세요.','안쪽 폭발과 바깥쪽 심판을 구분하세요.','시간차로 회전하는 광선의 빈틈을 찾으세요.','여러 패턴이 겹칩니다. 체력이 낮아지면 광폭화합니다.'];
export const TOWER_FLOORS=names.map((name,i)=>({floor:i+1,name,art:arts[i],pattern:patterns[i],guide:guides[i],level:(i+1)*20,hp:[26000,65000,150000,300000,550000,950000,1500000,2250000,3200000,4500000][i],attack:[200,340,520,780,1100,1450,1800,2200,2650,3200][i]*2.5,seconds:90,reward:{gold:Math.round(3000*(i+1)**1.3),fragment:0,cube:2*(i+1),highCube:(i+1)%5===0?2:0}}));
export const towerEncounter=b=>b.encounter||TOWER_FLOORS[b.floor-1];
export const TOWER_CLASSES={
 warrior:{range:225,cooldown:9},mage:{range:560,cooldown:10},
 archer:{range:610,cooldown:8},rogue:{range:200,cooldown:7},pirate:{range:550,cooldown:8}
};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
// Screen coordinates: east, south-east, south, south-west, west, north-west, north, north-east.
export const towerFacing=(dx,dy,fallback=2)=>{if(Math.hypot(dx,dy)<.001)return fallback;const a=Math.atan2(dy,dx),delta=Math.atan2(Math.sin(a-fallback*Math.PI/4),Math.cos(a-fallback*Math.PI/4));return Math.abs(delta)<Math.PI/8+.1?fallback:(Math.round(a*4/Math.PI)+8)%8;};
export const facingVector=dir=>({x:Math.cos(dir*Math.PI/4),y:Math.sin(dir*Math.PI/4)});
const lineDistance=(p,a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);};
function random(b){b.seed=(Math.imul(b.seed,1664525)+1013904223)>>>0;return b.seed/4294967296;}
export function newTowerBattle(floor,classId,power,now,id,seed,advanced=false){const f=TOWER_FLOORS[floor-1];return {kind:'tower',worldVersion:3,runId:id,floor,classId,advanced,power,started:now,tick:0,seed:seed>>>0,hp:power.hp,enemyHp:f.hp,player:{x:1600,y:1800,face:1,dir:6,attackDir:6,walk:0},enemy:{x:1600,y:1500,face:1,dir:2,castDir:2,walk:0},attackReady:0,skillReady:0,dashReady:0,ultimateReady:0,invulnerableUntil:0,guardUntil:0,attackUntil:0,skillUntil:0,enemyCastUntil:0,nextPattern:25,phase:0,hazards:[],projectiles:[],effects:[],numbers:[],serial:0,won:false,ended:false};}
export function upgradeTowerBattle(b){
 if(b.worldVersion===3)return b;
 const xScale=b.worldVersion===2?2:3.2,yScale=b.worldVersion===2?3200/1800:3200/1200;
 const xy=o=>{if(o){o.x*=xScale;o.y*=yScale;}};xy(b.player);xy(b.enemy);
 for(const h of b.hazards||[]){xy(h);if(h.type==='line'){h.tx*=xScale;h.ty*=yScale;}if(h.r)h.r*=Math.min(xScale,yScale);if(h.inner)h.inner*=Math.min(xScale,yScale);if(h.width)h.width*=Math.min(xScale,yScale);}
 for(const q of b.projectiles||[]){xy(q);q.dx*=xScale;q.dy*=yScale;}
 for(const e of b.effects||[])xy(e);for(const n of b.numbers||[])xy(n);
 xy(b.charge);b.worldVersion=3;return b;
}
function fx(b,kind,x,y,size=150,life=6,angle=0,hostile=false){b.effects.push({id:++b.serial,kind,x,y,size,start:b.tick,end:b.tick+life,angle,hostile});}
function number(b,value,x,y,kind){b.numbers.push({id:++b.serial,value,x,y,kind,start:b.tick,end:b.tick+9});}
function enemyDamage(b,scale,skillCrit=0){const first=b.tick<(b.guardUntil||0)?CLASS_SKILLS[b.classId]:null,second=b.tick<(b.secondUntil||0)?SECOND_SKILLS[b.classId]:null;const crit=random(b)<Math.min(.95,b.power.crit+(first?.critAdd||0)+(second?.critAdd||0)+skillCrit),damage=Math.max(1,Math.round(b.power.attack*b.power.boss*scale*(first?.damage||1)*(second?.damage||1)*(crit?b.power.critDamage+(second?.critDamageAdd||0):1)));b.enemyHp=Math.max(0,b.enemyHp-damage);number(b,damage,b.enemy.x,b.enemy.y-120,crit?'critical':'outgoing');fx(b,'impact',b.enemy.x,b.enemy.y-50,150);b.enemyHurtUntil=b.tick+2;}
function playerDamage(b,multiplier){if(b.tick<b.invulnerableUntil||b.tick<(b.hurtUntil||0))return;const f=towerEncounter(b),first=b.tick<(b.guardUntil||0)?CLASS_SKILLS[b.classId]:null,second=b.tick<(b.secondUntil||0)?SECOND_SKILLS[b.classId]:null;const damage=Math.max(1,Math.round((incomingDamage(f.attack,b.power.defense)*multiplier)*(first?.guard||1)*(second?.guard||1)));b.hp=Math.max(0,b.hp-damage);b.hurtUntil=b.tick+5;number(b,damage,b.player.x,b.player.y-100,'incoming');fx(b,'impact',b.player.x,b.player.y-40,110);}
function circle(b,x,y,r,delay=12,multiplier=1.6,duration=3,inner=0){const hx=clamp(x,TOWER_BOUNDS.left,TOWER_BOUNDS.right),hy=clamp(y,TOWER_BOUNDS.top,TOWER_BOUNDS.bottom);b.hazards.push({id:++b.serial,type:'circle',x:hx,y:hy,r,inner,dir:towerFacing(hx-b.enemy.x,hy-b.enemy.y,b.enemy.dir??2),at:b.tick+delay,end:b.tick+delay+duration,multiplier});}
function line(b,x,y,tx,ty,width=90,delay=12,multiplier=1.6,duration=3){b.hazards.push({id:++b.serial,type:'line',x,y,tx,ty,width,dir:towerFacing(tx-x,ty-y,b.enemy.dir??2),at:b.tick+delay,end:b.tick+delay+duration,multiplier});}
function fan(b,count=5){const a=Math.atan2(b.player.y-b.enemy.y,b.player.x-b.enemy.x);for(let i=0;i<count;i++){const angle=a+(i-(count-1)/2)*.23;b.projectiles.push({id:++b.serial,side:'enemy',x:b.enemy.x,y:b.enemy.y,dx:Math.cos(angle)*31,dy:Math.sin(angle)*31,r:24,at:b.tick+10,end:b.tick+65,multiplier:.9});}}
function pattern(b){const e=b.enemy,p=b.player,k=b.phase++,f=b.floor;
 e.castDir=towerFacing(p.x-e.x,p.y-e.y,e.dir??2);e.dir=e.castDir;
 b.enemyCastStart=b.tick;b.enemyCastUntil=b.tick+10;b.enemyAttackStart=b.tick+10;b.enemyAttackUntil=b.tick+16;b.enemyAttackDir=e.castDir;
 if(f===1){circle(b,p.x,p.y,130);circle(b,p.x+(p.x<1600?170:-170),p.y-170,120,19);}
 if(f===2){fan(b,5+k%3);if(k%2)circle(b,p.x,p.y,110,16);}
 if(f===3){line(b,p.x,TOWER_BOUNDS.top,p.x,TOWER_BOUNDS.bottom,110);line(b,TOWER_BOUNDS.left,p.y,TOWER_BOUNDS.right,p.y,110,16);}
 if(f===4){const a=Math.atan2(p.y-e.y,p.x-e.x),tx=clamp(e.x+Math.cos(a)*800,TOWER_BOUNDS.left,TOWER_BOUNDS.right),ty=clamp(e.y+Math.sin(a)*800,TOWER_BOUNDS.top,TOWER_BOUNDS.bottom);line(b,e.x,e.y,tx,ty,150,10,1.9);b.charge={x:tx,y:ty,at:b.tick+10,end:b.tick+15};}
 if(f===5){line(b,e.x,e.y,p.x,p.y,220,11,2.1);circle(b,p.x,p.y,145,22,1.4);}
 if(f===6){for(let i=0;i<3;i++)line(b,520+i*1080,TOWER_BOUNDS.top,520+i*1080,TOWER_BOUNDS.bottom,100,10+i*5,1.5);circle(b,p.x,p.y,105,25);}
 if(f===7){circle(b,p.x,p.y,125,13,.7,65);fan(b,3);}
 if(f===8){if(k%2)circle(b,e.x,e.y,680,15,2,3,280);else circle(b,e.x,e.y,270,15,2);}
 if(f===9){for(let i=0;i<3;i++){const a=(k*.7+i*Math.PI/3);line(b,e.x-Math.cos(a)*900,e.y-Math.sin(a)*900,e.x+Math.cos(a)*900,e.y+Math.sin(a)*900,100,12+i*5,1.7);}}
 if(f===10){fan(b,7);circle(b,p.x,p.y,160,15,1.8);if(k%2)line(b,TOWER_BOUNDS.left,1600,TOWER_BOUNDS.right,1600,150,24,2);else circle(b,e.x,e.y,700,24,1.7,3,320);}
 if(k%3===2){circle(b,e.x,e.y,4500,23,1.4,3,480);circle(b,p.x,p.y,145,12,1.2);}
 if(k%3===1&&distance(p,e)>450){line(b,e.x,e.y,p.x,p.y,170,14,1.5);b.charge={x:p.x,y:p.y,at:b.tick+14,end:b.tick+20};}
 if(b.weeklyBossId!==undefined){
  if(k%2===0){circle(b,p.x,p.y,175,10,1.7);circle(b,p.x,p.y,230,22,1.8);}
  if(k%2===1)circle(b,e.x,e.y,4500,18,2.2,3,520);
  if(distance(p,e)>480){fan(b,7);line(b,e.x,e.y,p.x,p.y,190,10,1.7);}
 }
 // A second marker predicts the current travel direction; changing direction remains a counter.
 if(k%2===0){const v=facingVector(p.dir??6);circle(b,p.x+v.x*250,p.y+v.y*250,175,18,1.7);}
 b.nextPattern=b.tick+(f===10&&b.enemyHp<towerEncounter(b).hp*.35?28:Math.max(b.weeklyBossId!==undefined?20:26,(b.weeklyBossId!==undefined?34:44)-f*2));
}
export function towerStep(b,input){
 if(b.chest){
  clearVictoryEffects(b);b.tick++;const p=b.player;let [x,y,bits]=input,n=Math.hypot(x,y);if(n>1){x/=n;y/=n;}p.moving=n>.01;if(p.moving){p.dir=towerFacing(x,y,p.dir??6);p.walk=(p.walk||0)+1;}
  if((bits&4)&&b.tick>=b.dashReady){const v=facingVector(p.dir??6);b.dashReady=b.tick+35;b.dashUntil=b.tick+3;b.dashX=n?x:v.x;b.dashY=n?y:v.y;}
  if(b.tick<(b.dashUntil||0)){x=b.dashX*3;y=b.dashY*3;}p.x=clamp(p.x+x*25,TOWER_BOUNDS.left,TOWER_BOUNDS.right);p.y=clamp(p.y+y*25,TOWER_BOUNDS.top,TOWER_BOUNDS.bottom);return b;
 }
 if(b.ended)return b;upgradeTowerBattle(b);b.tick++;const f=towerEncounter(b),c=TOWER_CLASSES[b.classId],p=b.player,e=b.enemy;
 b.effects=b.effects.filter(x=>x.end>b.tick).slice(-40);b.numbers=b.numbers.filter(x=>x.end>b.tick).slice(-25);
 let [mx,my,buttons]=input,n=Math.hypot(mx,my);if(n>1){mx/=n;my/=n;}p.moving=!!n;
 if(n>.01){p.dir=towerFacing(mx,my,p.dir??6);p.walk=(p.walk||0)+Math.min(1,n);if(mx)p.face=mx<0?-1:1;}
 if((buttons&4)&&b.tick>=b.dashReady){const v=facingVector(p.dir??6);b.dashReady=b.tick+35;b.invulnerableUntil=b.tick+5;b.dashUntil=b.tick+3;b.dashX=n?mx:v.x;b.dashY=n?my:v.y;fx(b,'slash',p.x,p.y,170,6,Math.atan2(b.dashY,b.dashX));}
 if(b.tick<(b.dashUntil||0)){mx=b.dashX*3;my=b.dashY*3;p.dir=towerFacing(mx,my,p.dir??6);}
 const moveSpeed=(buttons&1)&&c.range>300&&!(b.tick<(b.dashUntil||0))?17:25;
 p.x=clamp(p.x+mx*moveSpeed,TOWER_BOUNDS.left,TOWER_BOUNDS.right);p.y=clamp(p.y+my*moveSpeed,TOWER_BOUNDS.top,TOWER_BOUNDS.bottom);
 if((buttons&8)&&b.tick>=b.ultimateReady){const sk=CLASS_SKILLS[b.classId];b.hp=Math.min(b.power.hp,b.hp+b.power.hp*.12);b.ultimateReady=b.tick+sk.cooldown*10;b.guardUntil=b.tick+sk.seconds*10;b.skillStart=b.tick;b.skillUntil=b.tick+8;p.skillDir=p.dir??6;fx(b,'rune',p.x,p.y,220,12);}
 if((buttons&1)&&b.tick>=b.attackReady&&distance(p,e)<=c.range){const a=Math.atan2(e.y-p.y,e.x-p.x),v=facingVector(towerFacing(e.x-p.x,e.y-p.y,p.dir??6));p.dir=p.attackDir=towerFacing(e.x-p.x,e.y-p.y,p.dir??6);p.face=v.x<0?-1:1;b.attackReady=b.tick+c.cooldown;b.attackStart=b.tick;b.attackUntil=b.tick+6;if(c.range<300){b.pendingMelee={at:b.tick+2,scale:c.cooldown/10*b.power.cadence};}else{b.projectiles.push({id:++b.serial,side:'player',x:p.x+v.x*28,y:p.y-30+v.y*15,dx:Math.cos(a)*75,dy:Math.sin(a)*75,r:28,at:b.tick,end:b.tick+15,scale:c.cooldown/10*b.power.cadence});}}
 if(b.advanced&&(buttons&2)&&b.tick>=b.skillReady){const sk=SECOND_SKILLS[b.classId];if(sk.type!=='attack'||distance(p,e)<760){b.skillReady=b.tick+sk.cooldown*10;b.skillStart=b.tick;b.skillUntil=b.tick+8;if(sk.type==='attack'){const a=Math.atan2(e.y-p.y,e.x-p.x);p.dir=p.attackDir=p.skillDir=towerFacing(e.x-p.x,e.y-p.y,p.dir??6);p.face=Math.cos(a)<0?-1:1;b.pendingSkillHit={at:b.tick+3,hits:sk.hits,damage:sk.damage,critAdd:sk.critAdd||0};}else{p.skillDir=p.dir??6;b.secondUntil=b.tick+sk.seconds*10;fx(b,'rune',p.x,p.y,220,12);}}}
 if(b.enemyHp<=0){b.ended=true;b.won=true;return b;}
 if(b.tick>=b.nextPattern)pattern(b);
 if(b.charge&&b.tick>=b.charge.at&&b.tick<=b.charge.end){if(b.tick===b.charge.at){b.enemyAttackStart=b.tick;b.enemyAttackUntil=b.tick+6;b.enemyAttackDir=towerFacing(b.charge.x-e.x,b.charge.y-e.y,e.dir??2);}e.dir=b.enemyAttackDir;e.x+=(b.charge.x-e.x)*.48;e.y+=(b.charge.y-e.y)*.48;}
 else if(b.tick>b.enemyAttackUntil&&distance(p,e)>140){const angle=Math.atan2(p.y-e.y,p.x-e.x),speed=Math.min(26,19+b.floor*.7);e.x=clamp(e.x+Math.cos(angle)*speed,TOWER_BOUNDS.left+80,TOWER_BOUNDS.right-80);e.y=clamp(e.y+Math.sin(angle)*speed,TOWER_BOUNDS.top+80,TOWER_BOUNDS.bottom-80);e.dir=towerFacing(p.x-e.x,p.y-e.y,e.dir??2);e.walk=(e.walk||0)+1;}
 else if(b.tick>b.enemyAttackUntil)e.dir=towerFacing(p.x-e.x,p.y-e.y,e.dir??2);
 e.face=[3,4,5].includes(e.dir)?-1:1;
 if(distance(p,e)<105&&b.tick>=(b.contactReady||0)){playerDamage(b,.7);b.contactReady=b.tick+14;}
 if(b.pendingMelee&&b.tick>=b.pendingMelee.at){if(distance(p,e)<=c.range+30){const a=Math.atan2(e.y-p.y,e.x-p.x);enemyDamage(b,b.pendingMelee.scale);fx(b,'slash',(p.x+e.x)/2,(p.y+e.y)/2-40,220,7,a);}delete b.pendingMelee;}
 if(b.pendingSkillHit&&b.tick>=b.pendingSkillHit.at){if(distance(p,e)<790){const hit=b.pendingSkillHit,a=Math.atan2(e.y-p.y,e.x-p.x);for(let i=0;i<hit.hits;i++)enemyDamage(b,hit.damage,hit.critAdd);fx(b,'slash',e.x,e.y-50,310,9,a);}delete b.pendingSkillHit;}
 if(b.enemyHp<=0){b.ended=true;b.won=true;return b;}
 for(const h of b.hazards){if(b.tick<h.at||b.tick>=h.end)continue;if(b.tick===h.at){b.enemyAttackStart=b.tick;b.enemyAttackUntil=b.tick+6;b.enemyAttackDir=h.dir??e.castDir??2;e.dir=b.enemyAttackDir;fx(b,h.type==='line'?'slash':'impact',h.type==='line'?(h.x+h.tx)/2:h.x,h.type==='line'?(h.y+h.ty)/2:h.y,h.type==='line'?240:h.r*2,5,h.type==='line'?Math.atan2(h.ty-h.y,h.tx-h.x):0,true);}const d=h.type==='line'?lineDistance(p,{x:h.x,y:h.y},{x:h.tx,y:h.ty}):Math.hypot(p.x-h.x,p.y-h.y);if(h.type==='line'?d<h.width/2+22:d<h.r+22&&d>=Math.max(0,h.inner-22))playerDamage(b,h.multiplier);}
 b.hazards=b.hazards.filter(x=>x.end>b.tick);
 for(const q of b.projectiles){if(b.tick<q.at||b.tick>=q.end)continue;if(q.side==='enemy'&&b.tick===q.at){b.enemyAttackStart=b.tick;b.enemyAttackUntil=b.tick+6;b.enemyAttackDir=e.castDir??towerFacing(q.dx,q.dy,2);e.dir=b.enemyAttackDir;}const old={x:q.x,y:q.y};q.x+=q.dx;q.y+=q.dy;const target=q.side==='player'?e:p;if(lineDistance(target,old,q)<(q.side==='player'?90:25)+q.r){if(q.side==='player')enemyDamage(b,q.scale);else playerDamage(b,q.multiplier);q.end=b.tick;}if(q.x<0||q.x>TOWER_SIZE.width||q.y<0||q.y>TOWER_SIZE.height)q.end=b.tick;}
 b.projectiles=b.projectiles.filter(x=>x.end>b.tick);
 if(b.enemyHp<=0){b.ended=true;b.won=true;}else if(b.hp<=0||b.tick>=f.seconds*10){b.ended=true;b.won=false;}
 return b;
}
