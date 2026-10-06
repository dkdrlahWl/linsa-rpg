export const UPPER_TOWER_VERSION='tower20-174';
const specs=[
 ['철쇄 집행관 카르둠','chain-judge','교차 쇄옥 · 연쇄 집행','교차하는 쇠사슬은 시간차로 터집니다. 이동 방향을 바꾸고 집행 돌진을 옆으로 피하세요.'],
 ['뇌우 가오리 네프라','storm-manta','뇌전 나선 · 추적 낙뢰','탄막의 열린 방향을 찾고, 연속 낙뢰가 찍힌 위치를 떠나세요.'],
 ['혈월 인형사 벨루아','blood-marionette','꼭두각시 무도 · 혈월 단두대','둘러싼 인형 폭발은 바깥으로 벗어나고, 예측된 이동 경로에서 방향을 바꾸세요.'],
 ['사막의 거울뱀 사르카','mirror-cobra','거울 회랑 · 반사 송곳니','대각선 거울 광선의 빈틈으로 이동하세요. 연속 반사 광선은 시간차가 있습니다.'],
 ['심해 종지기 울모르','abyss-bell','심해 종파 · 침수 의식','안쪽과 바깥쪽 종파를 차례로 피하고, 오래 남는 침수 웅덩이에서 벗어나세요.'],
 ['철혈 악보장 메르칸','iron-maestro','불협화음 · 파멸의 박자','엇박자로 터지는 세 줄의 악보를 순서대로 피하세요. 다음 박자가 같은 자리를 다시 노립니다.'],
 ['포식화 여제 네크시아','devouring-orchid','독화 만개 · 가시 수확','꽃잎 폭발 사이로 빠져나오세요. 독 웅덩이를 한쪽에 유도하고 반대편으로 이동하세요.'],
 ['무중력 해파리 미리온','gravity-jelly','궤도 붕괴 · 중력 격자','서로 다른 반지름의 궤도가 번갈아 터집니다. 격자 광선과 별 탄막을 함께 피하세요.'],
 ['황혼의 도서군주 리브론','living-grimoire','금서의 낙인 · 페이지 절단','이동 방향을 예측하는 낙인을 피하고, 순차적으로 내려오는 페이지 절단 사이를 통과하세요.'],
 ['종언의 별룡 오르테온','star-wyrm','별의 심판 · 종언의 삼중주','시간차 십자 광선, 별 탄막, 안팎 심판이 이어집니다. 체력 35% 이하에서는 간격이 짧아집니다.'],
];
const hp=[6750000,8500000,10800000,13700000,17400000,22000000,27800000,35000000,44000000,55000000];
const attack=[11000,12600,14500,16700,19200,22100,25400,29200,33600,38600];
export const UPPER_TOWER_FLOORS=specs.map(([name,art,pattern,guide],i)=>{
 const floor=i+11;
 return {floor,name,art,artFrames:1,artSize:290+(i===9?45:0),pattern,guide:guide+' · HP 35% 이하 광폭화',level:200,hp:hp[i],attack:attack[i],seconds:90,
  reward:{gold:3*Math.round(3000*floor**1.3),fragment:0,cube:6*floor,highCube:8+i*2,primeCube:floor===20?2:[13,15].includes(floor)?1:0}};
});

const bounds={left:150,right:3050,top:150,bottom:3050};
const clamp=n=>Math.max(350,Math.min(2850,n));
// All mechanics use the same server/client hazard geometry and visible wind-up.
export function upperTowerPattern(b,{circle,line},encounter){
 const index=b.floor-11;
 if(index<0||index>=10||b.encounter||b.weeklyBossId!==undefined||b.advancementStage!==undefined)return false;
 const e=b.enemy,p=b.player,k=b.phase-1,cycle=k%3,enraged=b.enemyHp<encounter.hp*.35;
 const turn=Math.atan2(p.y-e.y,p.x-e.x),travel=(p.dir??6)*Math.PI/4;
 const damage=enraged?2.3:2,delay=enraged?14:18;
 b.enemyCastUntil=b.tick+delay;b.enemyAttackStart=b.tick+delay;b.enemyAttackUntil=b.tick+delay+7;
 const ray=(angle,width=150,wait=delay,mult=damage)=>line(b,e.x-Math.cos(angle)*4400,e.y-Math.sin(angle)*4400,e.x+Math.cos(angle)*4400,e.y+Math.sin(angle)*4400,width,wait,mult);
 const mark=(x=p.x,y=p.y,r=210,wait=delay,mult=damage,duration=3)=>circle(b,x,y,r,wait,mult,duration);
 const orbit=(count=10,offset=0,gap=1,speed=26,wait=delay)=>{
  for(let i=0;i<count;i++){
   const angle=offset+i*Math.PI*2/count;
   if(Math.abs(Math.atan2(Math.sin(angle-turn),Math.cos(angle-turn)))<gap)continue;
   b.projectiles.push({id:++b.serial,side:'enemy',upperTower:true,x:e.x,y:e.y,dx:Math.cos(angle)*speed,dy:Math.sin(angle)*speed,r:23,at:b.tick+wait,end:b.tick+wait+85,multiplier:1.2});
  }
 };
 const aimed=(count=5,spread=.25,wait=delay)=>{
  for(let i=0;i<count;i++){const angle=turn+(i-(count-1)/2)*spread;b.projectiles.push({id:++b.serial,side:'enemy',upperTower:true,x:e.x,y:e.y,dx:Math.cos(angle)*27,dy:Math.sin(angle)*27,r:23,at:b.tick+wait,end:b.tick+wait+80,multiplier:1.2});}
 };
 const ring=(r,wait=delay,inner=0,mult=damage)=>circle(b,e.x,e.y,r,wait,mult,3,inner);
 const charge=(wait=delay)=>{line(b,e.x,e.y,p.x,p.y,210,wait,damage);b.charge={x:p.x,y:p.y,at:b.tick+wait,end:b.tick+wait+5};};
 const row=(y,wait,width=130)=>line(b,bounds.left,y,bounds.right,y,width,wait,damage);
 const col=(x,wait,width=130)=>line(b,x,bounds.top,x,bounds.bottom,width,wait,damage);
 if(index===0){
  if(cycle===0){row(p.y,delay);col(p.x,delay+9);mark(clamp(p.x+Math.cos(travel)*330),clamp(p.y+Math.sin(travel)*330),200,delay+18);}
  if(cycle===1){charge();mark(e.x,e.y,350,delay+16);}
  if(cycle===2){for(let i=0;i<3;i++)col(650+i*950,delay+i*7);mark(p.x,p.y,190,delay+23);}
 }else if(index===1){
  if(cycle===0){orbit(14,k*.33,.55);mark(p.x,p.y,210,delay+11);}
  if(cycle===1){for(let i=0;i<3;i++)mark(clamp(p.x+Math.cos(travel)*i*280),clamp(p.y+Math.sin(travel)*i*280),190,delay+i*7);}
  if(cycle===2){aimed(7,.23);ray(turn+Math.PI/2,140,delay+13);}
 }else if(index===2){
  if(cycle===0){for(let i=0;i<6;i++){const a=i*Math.PI/3+k*.25;mark(clamp(p.x+Math.cos(a)*460),clamp(p.y+Math.sin(a)*460),180,delay+i%2*8);}mark(p.x,p.y,200,delay+21);}
  if(cycle===1){row(p.y,delay,190);row(clamp(p.y+Math.sin(travel)*360),delay+13,190);col(p.x,delay+22,150);}
  if(cycle===2){charge();aimed(5,.32,delay+16);}
 }else if(index===3){
  if(cycle===0){ray(Math.PI/4+k*.16);ray(-Math.PI/4+k*.16,150,delay+11);}
  if(cycle===1){col(850,delay,180);col(2350,delay+8,180);row(p.y,delay+19);}
  if(cycle===2){ray(turn,150,delay);ray(turn+Math.PI/3,150,delay+10);ray(turn-Math.PI/3,150,delay+20);}
 }else if(index===4){
  if(cycle===0){ring(530,delay);ring(4500,delay+20,580);}
  if(cycle===1){mark(p.x,p.y,200,delay,.65,48);mark(clamp(p.x+Math.cos(travel)*350),clamp(p.y+Math.sin(travel)*350),180,delay+12,.65,40);}
  if(cycle===2){orbit(12,k*.2,.65,23);ring(640,delay+17,310);}
 }else if(index===5){
  if(cycle===0){for(let i=0;i<3;i++)row(700+i*900,delay+i*9,160);col(p.x,delay+27);}
  if(cycle===1){for(let i=0;i<3;i++)mark(p.x,p.y,180+i*40,delay+i*12);}
  if(cycle===2){ray(k*.25,150,delay);ray(k*.25+Math.PI/2,150,delay+12);aimed(5,.3,delay+24);}
 }else if(index===6){
  if(cycle===0){for(let i=0;i<5;i++){const a=i*Math.PI*2/5+k*.3;mark(clamp(e.x+Math.cos(a)*550),clamp(e.y+Math.sin(a)*550),220,delay);}ring(290,delay+16);}
  if(cycle===1){for(let i=0;i<3;i++)mark(clamp(p.x+Math.cos(travel)*i*260),clamp(p.y+Math.sin(travel)*i*260),175,delay+i*9,.55,55);}
  if(cycle===2){ray(turn,190,delay);orbit(15,k*.3,.7,25,delay+16);}
 }else if(index===7){
  if(cycle===0){ring(650,delay,300);ring(300,delay+16);ring(4500,delay+32,690);}
  if(cycle===1){for(let i=0;i<3;i++){col(650+i*950,delay+i*8,130);row(650+i*950,delay+12+i*8,130);}}
  if(cycle===2){orbit(16,k*.3,.6,28);mark(p.x,p.y,220,delay+18);}
 }else if(index===8){
  if(cycle===0){for(let i=0;i<4;i++)mark(clamp(p.x+Math.cos(travel)*i*230),clamp(p.y+Math.sin(travel)*i*230),190,delay+i*7);}
  if(cycle===1){for(let i=0;i<4;i++)ray(k*.21+i*Math.PI/4,140,delay+i*9);}
  if(cycle===2){charge();ring(580,delay+18,260);aimed(7,.24,delay+29);}
 }else{
  if(cycle===0){ray(turn,170,delay);ray(turn+Math.PI/2,170,delay+10);orbit(18,k*.28,.6,28,delay+22);}
  if(cycle===1){ring(500,delay);ring(4500,delay+19,550);mark(p.x,p.y,210,delay+30);}
  if(cycle===2){for(let i=0;i<3;i++)mark(clamp(p.x+Math.cos(travel)*i*280),clamp(p.y+Math.sin(travel)*i*280),200,delay+i*8);charge(delay+27);}
 }
 if(enraged&&cycle===2)orbit(12,k*.31,.8,24,delay+20);
 b.nextPattern=b.tick+Math.max(enraged?34:42,(enraged?43:55)-Math.floor(index*.9));
 return true;
}
