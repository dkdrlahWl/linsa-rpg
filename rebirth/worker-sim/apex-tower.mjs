export const APEX_TOWER_VERSION='tower30-20261013';
const specs=[
 ['월식의 창기병 아르세온','eclipse-centaur','월식 십자창 · 쌍월 돌진','시간차 십자창을 옆으로 피하고, 돌진 뒤 생기는 폭발에서 벗어나세요.'],
 ['빙정 불사조 크리오라','frost-phoenix','빙익 산개 · 서리 봉쇄','날개 탄막의 빈 방향으로 이동한 뒤 얼음 벽이 닫히기 전에 틈을 찾으세요.'],
 ['모래시계 거신 템포르','hourglass-colossus','역행의 시계침 · 모래 낙인','시계침이 지나간 자리는 다시 폭발합니다. 다음 낙인은 이동 방향을 예측합니다.'],
 ['혈옥 거미여왕 아라크네','ruby-spider','혈옥 그물 · 여왕의 포획','그물 광선의 틈으로 이동하고, 오래 남는 독 웅덩이를 가장자리로 유도하세요.'],
 ['폭풍의 사자왕 레오니스','thunder-lion','뇌왕의 포효 · 삼중 낙뢰','안팎으로 퍼지는 포효를 피하고 이동 경로를 따라 떨어지는 낙뢰에서 방향을 바꾸세요.'],
 ['망해의 골룡 네레보스','bone-leviathan','망해의 파도 · 골극 추격','엇박자 파도를 통과한 뒤 뼈 탄막의 열린 방향으로 빠져나오세요.'],
 ['영혼의 종성 바실리온','cathedral-titan','삼중 종소리 · 장송의 회랑','세 번의 종파가 안팎을 바꿉니다. 종파 뒤에는 대각선 절단이 이어집니다.'],
 ['성운의 세계수 실바리온','cosmic-tree','운석 씨앗 · 성운 개화','유도한 씨앗은 오래 남습니다. 꽃잎 폭발 사이의 통로를 확보하세요.'],
 ['천상의 판결자 유스티엘','judgement-seraph','육익 판결 · 순차 심판','차례로 회전하는 심판 광선을 따라 이동하고 마지막 안팎 판결을 피하세요.'],
 ['천공의 절대룡 아스트라칸','absolute-dragon','천공 붕괴 · 절대자의 사중주','회전 광선, 연속 낙인, 돌진, 안팎 심판이 네 단계로 이어집니다. 광폭화 중 추가 탄막을 피하세요.'],
];
const hp=[68000000,84000000,104000000,129000000,160000000,198000000,245000000,304000000,377000000,468000000];
const attacks=[44500,51200,58900,67800,78000,89700,103200,118700,136500,157000];
export const APEX_TOWER_FLOORS=specs.map(([name,art,pattern,guide],i)=>({floor:i+21,name,art,artFrames:1,artSize:i===9?350:310,level:Math.min(250,210+i*5),hp:hp[i],attack:attacks[i],seconds:90,pattern,guide:guide+' · HP 35% 이하 광폭화 · 붉은 예고 후 공격',reward:{gold:3*Math.round(3000*(i+21)**1.3),fragment:0,cube:6*(i+21),highCube:30+i*3,primeCube:i===9?5:i===4?3:i>=5?2:1}}));
const clamp=n=>Math.max(350,Math.min(2850,n));
export function apexTowerPattern(b,{circle,line},f){
 const i=b.floor-21;if(i<0||i>=10||b.encounter||b.weeklyBossId!==undefined||b.advancementStage!==undefined)return false;
 const e=b.enemy,p=b.player,k=b.phase-1,cycle=k%(i===9?4:3),rage=b.enemyHp<f.hp*.35;
 const delay=rage?16:21,damage=rage?2.5:2.15,a=Math.atan2(p.y-e.y,p.x-e.x),travel=(p.dir??6)*Math.PI/4;
 b.enemyCastUntil=b.tick+delay;b.enemyAttackStart=b.tick+delay;b.enemyAttackUntil=b.tick+delay+7;
 const ray=(angle,wait=delay,width=155)=>line(b,e.x-Math.cos(angle)*4400,e.y-Math.sin(angle)*4400,e.x+Math.cos(angle)*4400,e.y+Math.sin(angle)*4400,width,wait,damage);
 const mark=(x=p.x,y=p.y,wait=delay,r=210,duration=3,mult=damage)=>circle(b,clamp(x),clamp(y),r,wait,mult,duration);
 const ring=(r,inner=0,wait=delay)=>circle(b,e.x,e.y,r,wait,damage,3,inner);
 const trail=(count=3,step=260)=>{for(let j=0;j<count;j++)mark(p.x+Math.cos(travel)*j*step,p.y+Math.sin(travel)*j*step,delay+j*9);};
 const volley=(count=16,wait=delay,gap=.65)=>{for(let j=0;j<count;j++){const angle=k*.31+j*Math.PI*2/count;if(Math.abs(Math.atan2(Math.sin(angle-a),Math.cos(angle-a)))<gap)continue;b.projectiles.push({id:++b.serial,side:'enemy',upperTower:true,x:e.x,y:e.y,dx:Math.cos(angle)*27,dy:Math.sin(angle)*27,r:22,at:b.tick+wait,end:b.tick+wait+75,multiplier:1.25});}};
 const charge=(wait=delay)=>{line(b,e.x,e.y,p.x,p.y,200,wait,damage);b.charge={x:p.x,y:p.y,at:b.tick+wait,end:b.tick+wait+5};};
 const row=(y,wait=delay)=>line(b,150,y,3050,y,145,wait,damage);
 const col=(x,wait=delay)=>line(b,x,150,x,3050,145,wait,damage);
 switch(i){
 case 0:if(cycle===0){ray(a);ray(a+Math.PI/2,delay+11);mark(p.x,p.y,delay+24);}else if(cycle===1){charge();ring(420,0,delay+17);}else{ray(k*.24);ray(k*.24+Math.PI/2,delay+13);volley(14,delay+25);}break;
 case 1:if(cycle===0){volley(18);trail();}else if(cycle===1){col(850);col(2350,delay+11);row(p.y,delay+23);}else{ring(600,280);volley(16,delay+20);mark(p.x,p.y,delay+32);}break;
 case 2:if(cycle===0){for(let j=0;j<3;j++){ray(k*.21+j*Math.PI/3,delay+j*11);ray(k*.21+j*Math.PI/3,delay+36+j*11,125);}}else if(cycle===1){trail(4,240);ring(550,300,delay+34);}else{row(p.y);col(p.x,delay+14);mark(p.x,p.y,delay+29,250);}break;
 case 3:if(cycle===0){ray(Math.PI/4);ray(-Math.PI/4,delay+13);trail();}else if(cycle===1){mark(p.x,p.y,delay,185,52,.6);mark(p.x+Math.cos(travel)*370,p.y+Math.sin(travel)*370,delay+13,180,45,.6);volley(16,delay+25);}else{charge();for(let j=0;j<5;j++){const angle=j*Math.PI*2/5;mark(p.x+Math.cos(angle)*480,p.y+Math.sin(angle)*480,delay+18,170);}}break;
 case 4:if(cycle===0){ring(520);ring(4500,570,delay+19);volley(20,delay+31);}else if(cycle===1){trail(3,320);ray(a+Math.PI/2,delay+29);}else{charge();mark(e.x,e.y,delay+17,420);volley(18,delay+29);}break;
 case 5:if(cycle===0){for(let j=0;j<3;j++)row(700+j*900,delay+j*12);col(p.x,delay+32);}else if(cycle===1){volley(22);ring(680,350,delay+21);}else{trail(4,250);charge(delay+38);}break;
 case 6:if(cycle===0){ring(360);ring(720,400,delay+18);ring(4500,770,delay+36);}else if(cycle===1){ray(Math.PI/4+k*.2);ray(-Math.PI/4+k*.2,delay+15);mark(p.x,p.y,delay+29);}else{volley(20);ring(600,280,delay+20);trail();}break;
 case 7:if(cycle===0){for(let j=0;j<3;j++)mark(p.x+Math.cos(travel)*j*300,p.y+Math.sin(travel)*j*300,delay+j*11,175,48,.65);}else if(cycle===1){for(let j=0;j<6;j++){const angle=j*Math.PI/3+k*.2;mark(e.x+Math.cos(angle)*600,e.y+Math.sin(angle)*600,delay+j%2*12,205);}ring(300,0,delay+26);}else{ray(a);volley(22,delay+17);ring(4500,650,delay+34);}break;
 case 8:if(cycle===0){for(let j=0;j<5;j++)ray(k*.2+j*Math.PI/5,delay+j*10,140);}else if(cycle===1){ring(450);ring(4500,500,delay+21);mark(p.x,p.y,delay+35);}else{volley(24);trail(4,240);ray(a+Math.PI/2,delay+40);}break;
 case 9:if(cycle===0){for(let j=0;j<4;j++)ray(k*.19+j*Math.PI/4,delay+j*10,145);volley(24,delay+38);}else if(cycle===1){trail(4,280);ray(a+Math.PI/2,delay+37);volley(18,delay+45);}else if(cycle===2){charge();ring(460,0,delay+17);ring(780,500,delay+35);}else{ring(530);ring(4500,580,delay+20);ray(a,delay+36);ray(a+Math.PI/2,delay+47);volley(22,delay+56);}break;
 }
 if(rage&&cycle===2)volley(14,delay+25,.9);
 b.nextPattern=b.tick+(rage?47:62)-Math.floor(i*.7);
 return true;
}
