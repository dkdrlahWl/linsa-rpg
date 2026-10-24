// Shared authoritative 31–50F encounters. All timings are simulation ticks (10 Hz).
export const SOVEREIGN_TOWER_VERSION='tower50-20261025';
const specs=[
 ['경면의 백록 엘루네','거울 파편 · 반전 회랑','엇갈린 거울 사이를 통과한 뒤 되돌아오는 파편을 피하세요.'],
 ['비취 사마귀 세라티스','쌍낫 수확 · 비취 포위','바깥쪽 낫이 먼저 베고 안쪽이 이어집니다. 중앙에 머물지 마세요.'],
 ['홍련 가면극 유라','비단의 무대 · 가면 낙인','비단 장막의 엇박자를 보고 낙인을 가장자리로 유도하세요.'],
 ['용광성 거북 브론테','용광로 분출 · 열차단벽','분출 기둥 사이의 통로를 따라 이동하세요.'],
 ['태양 갑충 케프리온','태양 날개 · 사막의 윤회','안팎으로 바뀌는 태양 고리를 차례로 피하세요.'],
 ['월궁 해파리 셀레네','월궁 궤도 · 밀물의 인장','작은 달이 터지는 순서를 따라 빈 궤도로 이동하세요.'],
 ['흑백 성채 루크','체스의 행진 · 성채 압착','가로와 세로 성벽이 번갈아 닫힙니다. 대각선으로 이동하세요.'],
 ['종이학 검성 하쿠렌','천지학 절단 · 접힌 날개','종이 날개의 두 대각선은 시간차로 접힙니다.'],
 ['청람 갑각왕 네프튠','닻의 협공 · 심해 폭쇄','양옆 닻 공격 뒤에 남는 파도를 피하세요.'],
 ['영원의 모래여제 템페라','모래의 역류 · 영시의 판결','같은 위치를 두 번 덮치는 역류 사이에 이동하세요.'],
 ['산호 고래 아르벨','산호 개화 · 진주 파도','산호 꽃잎 사이를 빠져나오고 진주 고리를 피하세요.'],
 ['태엽 공작 파보리스','시침의 부채 · 역박자','부채꼴로 순차 절단하는 시침의 뒤를 따라가세요.'],
 ['홍화 포식황 네펜시아','포식 정원 · 꽃턱의 만개','화관 밖으로 나간 뒤 남은 독밭을 우회하세요.'],
 ['명등 아귀 루미보르','등불 유인 · 심연 소등','세 등불의 유도 폭발을 한쪽으로 모으세요.'],
 ['육완 우왕 아스테르','육완 분쇄 · 쇄옥 회랑','세 쌍의 쇄도를 순서대로 피하고 탈출로를 남기세요.'],
 ['월린 나방 예언자','월린 인장 · 반월 예언','겹친 날개 고리의 빈 안쪽과 바깥쪽을 오가세요.'],
 ['자수정 전갈 스콜피아','유리 독침 · 보석 감옥','독침의 선을 옆으로 피한 뒤 보석 포위를 벗어나세요.'],
 ['살아있는 검의 성당','성검 강림 · 제단 절개','평행한 검 사이를 통과하고 제단의 십자 절개를 피하세요.'],
 ['성운 기린 루미아르','성운 질주 · 별굽 낙인','질주 뒤 남는 별굽을 피해 이동 방향을 바꾸세요.'],
 ['월식의 절대황 아우렐리아','월식 날개 · 종극의 사계','네 날개의 순차 심판과 낙인을 피하세요. 마지막 고리는 안팎이 바뀝니다.'],
];
export const SOVEREIGN_TOWER_FLOORS=specs.map(([name,pattern,guide],i)=>({
 floor:31+i,name,art:'sovereign-'+(31+i),artFrames:1,artSize:i===19?370:320,
 level:Math.min(300,250+Math.ceil((i+1)*2.5)),hp:Math.round(468000000*1.055**(i+1)),attack:Math.round(157000*1.115**(i+1)),seconds:90,
 pattern,guide:guide+' · 붉은 예고 후 공격 · HP 35% 이하 광폭화',
 reward:{gold:3*Math.round(3000*(31+i)**1.3),fragment:0,cube:6*(31+i),highCube:60+i*4,primeCube:(i+1)%5===0?6+Math.floor(i/5)*2:3+Math.floor(i/5)}
}));
const clamp=n=>Math.max(350,Math.min(2850,n));
export function sovereignTowerPattern(b,{circle,line},f){
 const i=b.floor-31;
 if(i<0||i>=20||b.encounter||b.weeklyBossId!==undefined||b.advancementStage!==undefined)return false;
 const e=b.enemy,p=b.player,k=b.phase-1,phase=k%4,rage=b.enemyHp<f.hp*.35;
 const delay=rage?18:23,damage=rage?2.7:2.3,a=Math.atan2(p.y-e.y,p.x-e.x),travel=(p.dir??6)*Math.PI/4;
 b.enemyCastUntil=b.tick+delay;b.enemyAttackStart=b.tick+delay;b.enemyAttackUntil=b.tick+delay+7;
 const ray=(angle,wait=delay,width=135)=>line(b,e.x-Math.cos(angle)*4400,e.y-Math.sin(angle)*4400,e.x+Math.cos(angle)*4400,e.y+Math.sin(angle)*4400,width,wait,damage);
 const mark=(x,y,wait=delay,r=190,duration=3,mult=damage)=>circle(b,clamp(x),clamp(y),r,wait,mult,duration);
 const ring=(r,inner=0,wait=delay)=>circle(b,e.x,e.y,r,wait,damage,3,inner);
 const row=(y,wait=delay)=>line(b,150,y,3050,y,135,wait,damage);
 const col=(x,wait=delay)=>line(b,x,150,x,3050,135,wait,damage);
 const flowers=(count,radius,wait=delay)=>{for(let j=0;j<count;j++){const angle=j*Math.PI*2/count+k*.17;mark(e.x+Math.cos(angle)*radius,e.y+Math.sin(angle)*radius,wait+j%2*12,160);}};
 const trail=(count,step,wait=delay)=>{for(let j=0;j<count;j++)mark(p.x+Math.cos(travel)*j*step,p.y+Math.sin(travel)*j*step,wait+j*12,170);};
 const volley=(count,wait=delay,offset=k*.23)=>{for(let j=0;j<count;j++){const angle=offset+j*Math.PI*2/count;if(Math.abs(Math.atan2(Math.sin(angle-a),Math.cos(angle-a)))<.75)continue;b.projectiles.push({id:++b.serial,side:'enemy',upperTower:true,x:e.x,y:e.y,dx:Math.cos(angle)*26,dy:Math.sin(angle)*26,r:21,at:b.tick+wait,end:b.tick+wait+80,multiplier:1.3});}};
 const charge=(wait=delay)=>{line(b,e.x,e.y,p.x,p.y,185,wait,damage);b.charge={x:p.x,y:p.y,at:b.tick+wait,end:b.tick+wait+5};};
 // Each boss has a dedicated opening, followed by three evolving moves.
 if(phase===0)switch(i){
 case 0:ray(.32);ray(-.32,delay+16);ray(.32,delay+36,100);break;
 case 1:ray(a-.6);ray(a+.6,delay+13);ring(440,220,delay+29);break;
 case 2:row(950);row(2250,delay+15);mark(p.x,p.y,delay+31,235);break;
 case 3:for(let j=0;j<4;j++)col(550+j*700,delay+j*11);break;
 case 4:ring(350);ring(720,410,delay+18);ring(4500,780,delay+37);break;
 case 5:flowers(3,540);ring(430,200,delay+26);break;
 case 6:row(800);col(1250,delay+14);row(2400,delay+28);col(2350,delay+42);break;
 case 7:ray(Math.PI/4);ray(-Math.PI/4,delay+19);volley(12,delay+34);break;
 case 8:col(900);col(2300,delay+13);row(p.y,delay+30);ring(380,0,delay+44);break;
 case 9:mark(p.x,p.y,delay,230);mark(p.x,p.y,delay+30,280);ray(a+Math.PI/2,delay+46);break;
 case 10:flowers(5,670);ring(500,260,delay+31);break;
 case 11:for(let j=0;j<4;j++)ray(.17+j*.4,delay+j*12,115);break;
 case 12:flowers(6,440);mark(p.x,p.y,delay+30,170,24,.8);break;
 case 13:trail(3,380);volley(14,delay+40);break;
 case 14:for(let j=0;j<3;j++){row(650+j*950,delay+j*13);col(650+j*950,delay+8+j*13);}break;
 case 15:ring(440,200);ring(840,530,delay+21);flowers(4,1100,delay+40);break;
 case 16:ray(a,delay,180);flowers(7,550,delay+20);break;
 case 17:for(let j=0;j<3;j++)col(900+j*700,delay+j*14);ray(Math.PI/2,delay+48);break;
 case 18:charge();trail(4,280,delay+18);break;
 case 19:for(let j=0;j<4;j++)ray(Math.PI/8+j*Math.PI/4,delay+j*13,120);ring(4500,700,delay+57);break;
 }
 else if(phase===1){
  if(i%4===0){flowers(3+i%5,600);ray(a,delay+29);}
  if(i%4===1){trail(3,250+i*4);ring(450,230,delay+38);}
  if(i%4===2){volley(16+i%7);row(p.y,delay+26);col(p.x,delay+42);}
  if(i%4===3){charge();flowers(4,500,delay+20);}
 }else if(phase===2){
  if(i%3===0){for(let j=0;j<3;j++)ray(k*.13+j*Math.PI/3,delay+j*17,125);}
  if(i%3===1){ring(450);ring(4500,550,delay+24);volley(18,delay+43);}
  if(i%3===2){flowers(5,700);trail(3,310,delay+28);}
 }else{
  volley(18+i%6);mark(p.x,p.y,delay+24,210);ray(a+Math.PI/2,delay+42,140);
  if(i>=15)ring(550,300,delay+59);
 }
 if(rage&&phase===3)flowers(4,900,delay+30);
 // Do not start a new sequence until the last telegraph has resolved.
 b.nextPattern=b.tick+(rage?100:115)+i%4*3;
 return true;
}
