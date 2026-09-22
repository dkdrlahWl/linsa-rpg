// Shared deterministic combat. Only input vectors/buttons cross the network.
export const TOWER_STEP = 100;
export const TOWER_SIZE = {width:1000,height:1200};
const names=['이끼문 파수꾼 그로움','월익 여왕 셀레네','수정 집게 크라그','용암 송곳니 바르칸','참수기사 모르딘','빙결 마녀 이셀라','독침황제 세르케트','추락한 성상 아우리엘','태엽룡 크로가스','공허왕 아자렐'];
const arts=['moss','moth','crab','wolf','knight','witch','scorpion','seraph','clock','king'];
const patterns=['대지 분쇄','달빛 탄막','십자 수정파','화염 돌진','망령 참격','빙창 감옥','맹독 웅덩이','심판의 고리','시간의 회전침','공허의 종언'];
const guides=['발밑의 문양이 폭발하기 전에 벗어나세요.','부채꼴로 퍼지는 달빛 탄을 비껴가세요.','십자로 갈라지는 수정의 길을 피하세요.','돌진 방향을 확인하고 옆으로 회피하세요.','긴 참격의 경로와 뒤따르는 망령을 피하세요.','연속으로 내려오는 빙창 사이로 이동하세요.','독이 남은 바닥을 피해 전장을 넓게 쓰세요.','안쪽 폭발과 바깥쪽 심판을 구분하세요.','시간차로 회전하는 광선의 빈틈을 찾으세요.','여러 패턴이 겹칩니다. 체력이 낮아지면 광폭화합니다.'];
export const TOWER_FLOORS=names.map((name,i)=>({floor:i+1,name,art:arts[i],pattern:patterns[i],guide:guides[i],level:(i+1)*20,hp:[18000,38000,76000,130000,210000,320000,470000,660000,900000,1200000][i],attack:[200,340,520,780,1100,1450,1800,2200,2650,3200][i],seconds:180,reward:{gold:Math.round(3000*(i+1)**1.3),fragment:20+(i+1)*10,cube:2*(i+1),highCube:(i+1)%5===0?2:0}}));
export const TOWER_CLASSES={
 warrior:{range:225,cooldown:9,skill:'대지 분쇄',skillScale:3.8,skillCooldown:90,ultimate:'철벽의 맹세'},
 mage:{range:670,cooldown:10,skill:'유성 폭발',skillScale:4.2,skillCooldown:110,ultimate:'마력 결계'},
 archer:{range:730,cooldown:8,skill:'관통 화살',skillScale:3.5,skillCooldown:85,ultimate:'바람의 가호'},
 rogue:{range:200,cooldown:7,skill:'그림자 난무',skillScale:4.4,skillCooldown:100,ultimate:'그림자 장막'},
 pirate:{range:630,cooldown:8,skill:'포격 명령',skillScale:4.0,skillCooldown:100,ultimate:'해적의 기백'}
};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const lineDistance=(p,a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);};
function random(b){b.seed=(Math.imul(b.seed,1664525)+1013904223)>>>0;return b.seed/4294967296;}
export function newTowerBattle(floor,classId,power,now,id,seed){const f=TOWER_FLOORS[floor-1];return {kind:'tower',runId:id,floor,classId,power,started:now,tick:0,seed:seed>>>0,hp:power.hp,enemyHp:f.hp,player:{x:500,y:950,face:1},enemy:{x:500,y:320,face:1},attackReady:0,skillReady:0,dashReady:0,ultimateReady:0,invulnerableUntil:0,guardUntil:0,attackUntil:0,skillUntil:0,enemyCastUntil:0,enemyAttackUntil:0,nextPattern:25,phase:0,hazards:[],projectiles:[],effects:[],numbers:[],serial:0,won:false,ended:false};}
function fx(b,kind,x,y,size=150,life=6){b.effects.push({id:++b.serial,kind,x,y,size,start:b.tick,end:b.tick+life});}
function number(b,value,x,y,kind){b.numbers.push({id:++b.serial,value,x,y,kind,start:b.tick,end:b.tick+9});}
function enemyDamage(b,scale){const crit=random(b)<b.power.crit,damage=Math.max(1,Math.round(b.power.attack*b.power.boss*scale*(crit?b.power.critDamage:1)));b.enemyHp=Math.max(0,b.enemyHp-damage);number(b,damage,b.enemy.x,b.enemy.y-120,crit?'critical':'outgoing');fx(b,'impact',b.enemy.x,b.enemy.y-50,150);b.enemyHurtUntil=b.tick+2;}
function playerDamage(b,multiplier){if(b.tick<b.invulnerableUntil||b.tick<(b.hurtUntil||0))return;const f=TOWER_FLOORS[b.floor-1],damage=Math.max(1,Math.round((f.attack*multiplier-b.power.defense*.4)*(b.tick<b.guardUntil?.4:1)));b.hp=Math.max(0,b.hp-damage);b.hurtUntil=b.tick+5;number(b,damage,b.player.x,b.player.y-100,'incoming');fx(b,'impact',b.player.x,b.player.y-40,110);}
function circle(b,x,y,r,delay=12,multiplier=1.6,duration=3,inner=0){b.hazards.push({id:++b.serial,type:'circle',x:clamp(x,70,930),y:clamp(y,140,1110),r,inner,at:b.tick+delay,end:b.tick+delay+duration,multiplier});}
function line(b,x,y,tx,ty,width=90,delay=12,multiplier=1.6,duration=3){b.hazards.push({id:++b.serial,type:'line',x,y,tx,ty,width,at:b.tick+delay,end:b.tick+delay+duration,multiplier});}
function fan(b,count=5){const a=Math.atan2(b.player.y-b.enemy.y,b.player.x-b.enemy.x);for(let i=0;i<count;i++){const angle=a+(i-(count-1)/2)*.23;b.projectiles.push({id:++b.serial,side:'enemy',x:b.enemy.x,y:b.enemy.y,dx:Math.cos(angle)*31,dy:Math.sin(angle)*31,r:24,at:b.tick+10,end:b.tick+65,multiplier:.9});}}
function pattern(b){const e=b.enemy,p=b.player,k=b.phase++,f=b.floor;
 b.enemyCastUntil=b.tick+10;b.enemyAttackUntil=b.tick+16;
 if(f===1){circle(b,p.x,p.y,130);circle(b,p.x+(p.x<500?170:-170),p.y-170,120,19);}
 if(f===2){fan(b,5+k%3);if(k%2)circle(b,p.x,p.y,110,16);}
 if(f===3){line(b,p.x,120,p.x,1120,110);line(b,80,p.y,920,p.y,110,16);}
 if(f===4){const a=Math.atan2(p.y-e.y,p.x-e.x),tx=clamp(e.x+Math.cos(a)*650,90,910),ty=clamp(e.y+Math.sin(a)*650,180,1080);line(b,e.x,e.y,tx,ty,150,10,1.9);b.charge={x:tx,y:ty,at:b.tick+10,end:b.tick+15};}
 if(f===5){line(b,e.x,e.y,p.x,p.y,220,11,2.1);circle(b,p.x,p.y,145,22,1.4);}
 if(f===6){for(let i=0;i<3;i++)line(b,190+i*290,120,190+i*290,1120,100,10+i*5,1.5);circle(b,p.x,p.y,105,25);}
 if(f===7){circle(b,p.x,p.y,125,13,.7,65);fan(b,3);}
 if(f===8){if(k%2)circle(b,e.x,e.y,680,15,2,3,280);else circle(b,e.x,e.y,270,15,2);}
 if(f===9){for(let i=0;i<3;i++){const a=(k*.7+i*Math.PI/3);line(b,e.x-Math.cos(a)*900,e.y-Math.sin(a)*900,e.x+Math.cos(a)*900,e.y+Math.sin(a)*900,100,12+i*5,1.7);}}
 if(f===10){fan(b,7);circle(b,p.x,p.y,160,15,1.8);if(k%2)line(b,80,600,920,600,150,24,2);else circle(b,e.x,e.y,700,24,1.7,3,320);}
 b.nextPattern=b.tick+(f===10&&b.enemyHp<TOWER_FLOORS[9].hp*.35?28:Math.max(32,56-f*2));
}
export function towerStep(b,input){
 if(b.ended)return b;b.tick++;const f=TOWER_FLOORS[b.floor-1],c=TOWER_CLASSES[b.classId],p=b.player,e=b.enemy;
 b.effects=b.effects.filter(x=>x.end>b.tick).slice(-40);b.numbers=b.numbers.filter(x=>x.end>b.tick).slice(-25);
 let [mx,my,buttons]=input,n=Math.hypot(mx,my);if(n>1){mx/=n;my/=n;}p.moving=!!n;if(mx)p.face=mx<0?-1:1;
 if((buttons&4)&&b.tick>=b.dashReady){b.dashReady=b.tick+35;b.invulnerableUntil=b.tick+5;b.dashUntil=b.tick+3;b.dashX=n?mx:0;b.dashY=n?my:1;fx(b,'slash',p.x,p.y,170);}
 if(b.tick<(b.dashUntil||0)){mx=b.dashX*3;my=b.dashY*3;}
 p.x=clamp(p.x+mx*25,70,930);p.y=clamp(p.y+my*25,150,1120);
 if((buttons&8)&&b.tick>=b.ultimateReady){b.ultimateReady=b.tick+240;b.guardUntil=b.tick+45;const healed=Math.min(b.power.hp-b.hp,Math.round(b.power.hp*.18));b.hp+=healed;number(b,healed,p.x,p.y-100,'heal');fx(b,'rune',p.x,p.y,220,12);}
 if((buttons&1)&&b.tick>=b.attackReady&&distance(p,e)<=c.range){b.attackReady=b.tick+c.cooldown;b.attackUntil=b.tick+4;p.face=e.x<p.x?-1:1;if(c.range<300){enemyDamage(b,c.cooldown/10*b.power.cadence);fx(b,'slash',(p.x+e.x)/2,(p.y+e.y)/2-40,200);}else{const a=Math.atan2(e.y-p.y,e.x-p.x);b.projectiles.push({id:++b.serial,side:'player',x:p.x,y:p.y-30,dx:Math.cos(a)*75,dy:Math.sin(a)*75,r:28,at:b.tick,end:b.tick+15,scale:c.cooldown/10*b.power.cadence});}}
 if((buttons&2)&&b.tick>=b.skillReady&&distance(p,e)<760){b.skillReady=b.tick+c.skillCooldown;b.skillUntil=b.tick+7;enemyDamage(b,c.skillScale);fx(b,b.classId==='mage'?'impact':'slash',e.x,e.y-50,310,9);if(b.classId==='warrior')b.guardUntil=Math.max(b.guardUntil,b.tick+20);}
 if(b.enemyHp<=0){b.ended=true;b.won=true;return b;}
 if(b.tick>=b.nextPattern)pattern(b);
 if(b.charge&&b.tick>=b.charge.at&&b.tick<=b.charge.end){e.x+=(b.charge.x-e.x)*.48;e.y+=(b.charge.y-e.y)*.48;}
 else if(b.tick>b.enemyAttackUntil&&distance(p,e)>140){const angle=Math.atan2(p.y-e.y,p.x-e.x),speed=b.floor===4?6:2.5;e.x=clamp(e.x+Math.cos(angle)*speed,140,860);e.y=clamp(e.y+Math.sin(angle)*speed,230,970);}
 e.face=p.x<e.x?-1:1;
 for(const h of b.hazards){if(b.tick<h.at||b.tick>=h.end)continue;if(b.tick===h.at)fx(b,'impact',h.type==='line'?(h.x+h.tx)/2:h.x,h.type==='line'?(h.y+h.ty)/2:h.y,h.type==='line'?200:h.r*2,5);const d=h.type==='line'?lineDistance(p,{x:h.x,y:h.y},{x:h.tx,y:h.ty}):Math.hypot(p.x-h.x,p.y-h.y);if(h.type==='line'?d<h.width/2+22:d<h.r+22&&d>=Math.max(0,h.inner-22))playerDamage(b,h.multiplier);}
 b.hazards=b.hazards.filter(x=>x.end>b.tick);
 for(const q of b.projectiles){if(b.tick<q.at||b.tick>=q.end)continue;const old={x:q.x,y:q.y};q.x+=q.dx;q.y+=q.dy;const target=q.side==='player'?e:p;if(lineDistance(target,old,q)<(q.side==='player'?90:25)+q.r){if(q.side==='player')enemyDamage(b,q.scale);else playerDamage(b,q.multiplier);q.end=b.tick;}if(q.x<0||q.x>1000||q.y<50||q.y>1220)q.end=b.tick;}
 b.projectiles=b.projectiles.filter(x=>x.end>b.tick);
 if(b.enemyHp<=0){b.ended=true;b.won=true;}else if(b.hp<=0||b.tick>=f.seconds*10){b.ended=true;b.won=false;}
 return b;
}
