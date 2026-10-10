import {dungeonMove} from './exploration-dungeon.mjs?v=citadel-path-216';
// Dark Citadel NG+0 structure: official developer-linked wiki, checked 2026-10-11.
// Camera, dimensions, densities and combat values are Ringu adaptations, not unpublished original values.
export const CITADEL_TIER=3,CITADEL_VERSION='citadel-independent-214';
export const CITADEL_REFERENCE={attack:49108,hp:67525,defense:1373,boss:3.2,combatPower:206123};
export const CITADEL_BIOMES=[
 {name:'깊은 숲',color:'#192b24',floor:'#43553c',wall:'#203326',light:'#d0b76c',enemies:['회색 늑대','녹색 딱정벌레','붉은모자 고블린','고블린 주술사']},
 {name:'어둠의 동굴',color:'#17191f',floor:'#484446',wall:'#28272d',light:'#71c0c6',enemies:['검은 거미','검은 박쥐','독침 딱정벌레','동굴 트롤']},
 {name:'잊힌 신전',color:'#23192c',floor:'#5a455c',wall:'#322636',light:'#bf80d8',enemies:['광신도 검객','광신도 마법사','맨드레이크','광신도 궁수']},
 {name:'지하 묘지',color:'#17212d',floor:'#465265',wall:'#283545',light:'#a0bccc',enemies:['해골 전사','해골 궁수','강령술사','그림자 망령']},
 {name:'침식된 지하 감옥',color:'#152520',floor:'#3f5348',wall:'#273c32',light:'#84bf68',enemies:['망자 병사','독성 맨드레이크','가시 뿌리','망자 감독관']},
 {name:'성채 병영',color:'#281b20',floor:'#56424b',wall:'#372832',light:'#e99458',enemies:['해골 방패병','해골 창병','망자 마법사','해골 기사']},
 {name:'왕실의 뜰',color:'#292329',floor:'#776f69',wall:'#484147',light:'#caa177',enemies:['해골 처형자','해골 저격수','파멸의 예언자','망자 심판관']},
 {name:'암흑 회랑',color:'#141226',floor:'#37304f',wall:'#252039',light:'#8580df',enemies:['거대 마안','작은 마안','성기사 환영','마술사 환영']}
];
const stage=(act,biome,name,boss=null)=>({act,biome,name,boss});
export const CITADEL_STAGES=[
 stage(1,0,'숲 1'),stage(1,0,'숲 2'),stage(1,1,'동굴 1'),stage(1,1,'동굴 2'),stage(1,1,'원소의 제단','totem'),
 stage(2,0,'숲 3'),stage(2,2,'신전'),stage(2,3,'묘지 1'),stage(2,3,'묘지 2'),stage(2,3,'그림자의 의식','shadow'),
 stage(3,4,'감옥 1'),stage(3,4,'감옥 2'),stage(3,4,'가시의 심장','plant'),
 stage(4,5,'병영 1'),stage(4,5,'병영 2'),stage(4,5,'공포의 전령','harbingers'),
 stage(5,6,'왕실의 뜰 1'),stage(5,6,'왕실의 뜰 2'),stage(5,6,'멸망의 뱀','serpents'),
 stage(6,7,'암흑 회랑'),stage(6,7,'최후의 화신','avatar')
];
export const CITADEL_BOSSES={totem:'사원소 토템',shadow:'그림자 얼굴',plant:'아리스타',harbingers:'공포의 전령들',serpents:'멸망의 뱀들',avatar:'암흑의 화신'};
export const citadelStage=floor=>CITADEL_STAGES[floor-1];
export const isCitadel=w=>w?.mode==='citadel'||(w?.mode==='exploration'&&w.tier===CITADEL_TIER);
export const isDungeon=w=>w?.mode==='exploration'||w?.mode==='citadel';
export const CITADEL_CONTENT={id:0,name:'암흑성채',floors:21,level:200,art:'exploration-3',map:'citadel/main-214.webp',boss:'암흑의 화신',seconds:0};
export const citadelAsset=(type,index)=>'citadel/'+type+'-'+index+'-213.webp';
export const citadelPopulation=n=>({hp:Math.max(1,Math.min(4,n)),attack:1});
// The steep increase after the second boss is the requested halfway growth wall.
export function citadelStats(floor,count,boss=false){
 const stage=citadelStage(floor),depth=stage.act<=2?(.45+.55*(floor-1)/9):[0,0,0,1.85,3.4,5.3,8][stage.act];
 return {hp:Math.round((boss?18000000:180000)*depth*citadelPopulation(count).hp),attack:Math.round((boss?(stage.act<=2?2100:9000):1700)*depth),speed:boss?19:20+Math.min(5,stage.act)};
}
function rng(seed){let n=seed>>>0;return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
export function makeCitadelDungeon(floor,seed){
 const st=citadelStage(floor),random=rng(seed^Math.imul(floor,2654435761)),size=64,cell=100,grid=Array.from({length:size},()=>Array(size).fill('0')),rooms=[];
 const paint=(x,y,w,h,value='2')=>{for(let yy=Math.max(1,y);yy<Math.min(size-1,y+h);yy++)for(let xx=Math.max(1,x);xx<Math.min(size-1,x+w);xx++)grid[yy][xx]=value;};
 if(st.boss){rooms.push({id:3,x:25,y:43,w:13,h:8},{id:0,x:17,y:12,w:30,h:30});paint(25,39,13,12);paint(17,12,30,30);}
 else if(st.biome===7){
  // A winding primary hall with side branches, rather than a rectangular room grid.
  const points=[[6,54],[18,54],[18,39],[42,39],[42,23],[56,23],[56,8]];
  for(let i=0;i<points.length;i++){const [x,y]=points[i];rooms.push({id:i===0?3:i===6?0:i+4,x:x-3,y:y-3,w:7,h:7});paint(x-3,y-3,7,7);if(i){const [a,b]=points[i-1];paint(Math.min(a,x)-2,Math.min(b,y)-2,Math.abs(a-x)+5,Math.abs(b-y)+5,'1');}}
  for(const [x,y] of [[9,39],[28,48],[51,44],[32,23],[47,10]]){rooms.push({id:rooms.length+8,x:x-3,y:y-3,w:7,h:7});paint(x-3,y-3,7,7);const [a,b]=points.reduce((best,p)=>Math.abs(p[0]-x)+Math.abs(p[1]-y)<Math.abs(best[0]-x)+Math.abs(best[1]-y)?p:best);paint(Math.min(x,a)-1,y-1,Math.abs(x-a)+3,3,'1');paint(a-1,Math.min(y,b)-1,3,Math.abs(y-b)+3,'1');}
 }else{
  const natural=st.biome<=1,slots=[[5,45],[7,26],[5,6],[24,7],[44,5],[44,24],[45,45],[25,43],[25,25]];
  for(let i=0;i<slots.length;i++){const [x,y]=slots[i],w=(natural?10:8)+Math.floor(random()*5),h=(natural?10:8)+Math.floor(random()*5);rooms.push({id:i===0?3:i===3?0:i+4,x,y,w,h});paint(x,y,w,h);}
  const connect=(a,b)=>{let x=a.x+Math.floor(a.w/2),y=a.y+Math.floor(a.h/2),tx=b.x+Math.floor(b.w/2),ty=b.y+Math.floor(b.h/2),width=natural?4:3;while(x!==tx){paint(x,y,width,width,'1');x+=Math.sign(tx-x);}while(y!==ty){paint(x,y,width,width,'1');y+=Math.sign(ty-y);}paint(x,y,width,width,'1');};
  for(let i=1;i<rooms.length;i++)connect(rooms[i-1],rooms[i]);connect(rooms[8],rooms[1]);connect(rooms[5],rooms[8]);
  if(natural)for(const r of rooms)for(let i=0;i<9;i++){const x=r.x+1+Math.floor(random()*(r.w-2)),y=r.y+1+Math.floor(random()*(r.h-2));if((x-r.x>3)&&(y-r.y>3)&&(r.x+r.w-x>3)&&(r.y+r.h-y>3)&&Math.hypot(x-(r.x+r.w/2),y-(r.y+r.h/2))>2)grid[y][x]='0';}
 }
 const shadowWalls=[];if(st.biome===7&&!st.boss){for(const [x,y,h] of [[18,45,4],[42,29,4],[50,23,4]])for(let i=0;i<h;i++)if(grid[y+i]?.[x]!=='0'){grid[y+i][x]='3';shadowWalls.push({x:x*cell,y:(y+i)*cell});}}
 const startRoom=rooms.find(r=>r.id===3),exitRoom=rooms.find(r=>r.id===0)||rooms.at(-1),center=r=>({x:(r.x+r.w/2)*cell,y:(r.y+r.h/2)*cell});
 return {id:CITADEL_VERSION+':'+floor+':'+(seed>>>0),size,cell,tiles:grid.map(r=>r.join('')),rooms,start:center(startRoom),exit:center(exitRoom),seen:Array(size).fill('0'.repeat(size)),citadel:true,shadowWalls,biome:st.biome,bossArena:!!st.boss};
}
export function citadelFloor(w,walkable,reveal){
 const st=citadelStage(w.floor),random=rng((w.started>>>0)^Math.imul(w.floor,1597334677));
 w.citadelVersion=CITADEL_VERSION;w.citadelStage=st;w.floorAt=w.tick;w.floorDeadline=Number.MAX_SAFE_INTEGER;delete w.bossBattleAt;delete w.bossDeath;w.exitOpen=!st.boss;w.dungeon=makeCitadelDungeon(w.floor,w.started>>>0);w.exit={...w.dungeon.exit};w.monsters=[];w.hazards=[];w.projectiles=[];w.effects=[];w.numbers=[];w.cleared=w.floor-1;w.citadelBossCleared=false;w.hearts=[];w.traps=[];
 const slots=[];for(const r of w.dungeon.rooms){if(r.id===3)continue;for(let y=r.y+1;y<r.y+r.h-1;y++)for(let x=r.x+1;x<r.x+r.w-1;x++)if(walkable(w.dungeon,(x+.5)*100,(y+.5)*100))slots.push({x:(x+.5)*100,y:(y+.5)*100});}
 for(let i=slots.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[slots[i],slots[j]]=[slots[j],slots[i]];}
 const count=st.boss?0:Math.min(slots.length-12,70+st.act*12+Math.floor(random()*20));
 const make=(i,point,extra={})=>{const stats=citadelStats(w.floor,w.population,!!extra.boss),species=st.biome*4+i%4;return {id:-(w.floor*10000+i+1),...point,species,name:CITADEL_BIOMES[st.biome].enemies[i%4],citadel:true,explorationTier:3,art:citadelAsset('enemy',species),level:200,hp:stats.hp,maxHp:stats.hp,attack:stats.attack,speed:stats.speed,ready:w.tick+15,walk:0,face:1,elite:i%13===0,role:[6,11,13,21,25].includes(species)?'ranged':[3,9,14,15,22,26,27,31].includes(species)?'caster':'melee',...extra};};
 for(let i=0;i<count;i++)w.monsters.push(make(i,slots.pop()));
 if(st.boss){const order=[0,1,2,3];for(let j=3;j>0;j--){const k=Math.floor(random()*(j+1));[order[j],order[k]]=[order[k],order[j]];}const n=st.boss==='harbingers'?2:st.boss==='serpents'?3:1,artIndex={totem:0,shadow:4,plant:5,harbingers:6,serpents:8,avatar:9}[st.boss];
  for(let i=0;i<n;i++){const stats=citadelStats(w.floor,w.population,true);w.monsters.push(make(900+i,{x:w.exit.x+(i-(n-1)/2)*450,y:w.exit.y},{boss:true,elite:true,role:'boss',name:CITADEL_BOSSES[st.boss],bossKind:st.boss,art:citadelAsset('boss',artIndex+(st.boss==='harbingers'?i:0)),hp:Math.round(stats.hp/n),maxHp:Math.round(stats.hp/n),speed:st.boss==='totem'||st.boss==='shadow'||st.boss==='plant'?0:stats.speed,skillReady:w.tick+30,phase:0,phaseOrder:order}));}
  if(st.boss==='shadow')for(let i=0;i<4;i++)w.monsters.push(make(1000+i,{x:w.exit.x+Math.cos(i*Math.PI/2)*550,y:w.exit.y+Math.sin(i*Math.PI/2)*550},{channel:true,attack:500,role:'caster',art:citadelAsset('enemy',9),name:'의식의 광신도',hp:citadelStats(w.floor,w.population,true).hp/12,maxHp:citadelStats(w.floor,w.population,true).hp/12}));
 }
 for(let i=0;i<(st.boss?2:5);i++){const p=slots.pop();if(p)w.hearts.push({id:w.floor*10+i,...p});}
 if(!st.boss&&st.biome!==0)for(let i=0;i<6+st.act;i++){const p=slots.pop();if(p)w.traps.push({id:w.floor*100+i,...p,r:100,ready:w.tick+15,type:st.biome===1?'rock':st.biome===4?'thorn':st.biome===7?'shadow':'spike'});}
 w.maxHp=w.monsters.reduce((n,e)=>n+e.maxHp,0);w.hp=w.maxHp;w.enemy={...w.exit,face:1};
 for(const [i,m] of w.members.entries()){Object.assign(m,{x:w.dungeon.start.x+(i%2)*90-45,y:w.dungeon.start.y+Math.floor(i/2)*90-45,input:[0,0,0],inputAt:w.started+w.tick*100,reviveProgress:0});for(const key of ['pendingHits','pendingHit','pendingSkill','firstCast','secondCast','thirdCast','fourthCast','fifthCast'])delete m[key];}
 reveal(w);return w;
}
export function citadelDamageFactor(w,e){if(!isCitadel(w))return 1;if(e.bossKind==='shadow')return 0;if(e.bossKind==='plant'&&(w.tick-w.floorAt)%100<30)return .15;return 1;}
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function citadelBossTick(w,e,alive){
 if(!e.bossKind||!alive.length)return false;const t=w.tick,target=alive.reduce((a,b)=>dist(a,e)<dist(b,e)?a:b),kind=e.bossKind;
 e.phase=kind==='totem'?Math.min(3,Math.floor((1-e.hp/e.maxHp)*4)):kind==='avatar'?Math.min(2,Math.floor((1-e.hp/e.maxHp)*3)):Math.min(2,Math.floor((1-e.hp/e.maxHp)*3));
 if(kind==='avatar')e.art=citadelAsset('boss',e.phase===1?4:9);
 if(kind==='totem')e.art=citadelAsset('boss',e.phaseOrder[e.phase]);
 if(e.charge&&t>=e.charge.at){const q=e.charge;if(t<q.end){dungeonMove(w.dungeon,e,q.dx,q.dy,60);e.moving=true;e.walk++;if(q.fire&&t%2===0)w.hazards.push({type:'circle',x:e.x,y:e.y,r:130,at:t+2,end:t+32,citadel:true,attack:e.attack*.35,source:e.id,element:'fire'});}else delete e.charge;}
 if(t<(e.skillReady||0))return true;e.skillReady=t+(kind==='avatar'?24:kind==='serpents'?32:42);e.castStart=t;e.attackStart=t+14;e.attackUntil=t+18;e.attackAngle=Math.atan2(target.y-e.y,target.x-e.x);
 const circle=(x,y,r,delay=14,mult=1.4,extra={})=>w.hazards.push({type:'circle',x,y,r,at:t+delay,end:t+delay+4,citadel:true,attack:e.attack*mult,source:e.id,...extra});
 const line=(a,b,width=140,delay=14,mult=1.5)=>w.hazards.push({type:'line',x:a.x,y:a.y,tx:b.x,ty:b.y,width,at:t+delay,end:t+delay+4,citadel:true,attack:e.attack*mult,source:e.id});
 if(kind==='totem'){const element=e.phaseOrder[e.phase];if(element===0)for(let i=0;i<6;i++){const angle=i*Math.PI/3+t*.07;circle(e.x+Math.cos(angle)*650,e.y+Math.sin(angle)*650,150,14+i*2,1.3,{element:'fire',linger:30});}else if(element===1)for(const m of alive)circle(m.x,m.y,210,18,1.2,{element:'ice',slow:20});else if(element===2){circle(e.x,e.y,700,18,1.6,{inner:350,element:'earth'});for(const m of alive)circle(m.x,m.y,130,12);}else for(const m of alive){line(e,{x:m.x+(m.x-e.x),y:m.y+(m.y-e.y)},110,10,1.2);circle(m.x,m.y,130,22,1.4);}}
 if(kind==='shadow'){for(const m of alive)circle(m.x,m.y,230,16,1.7);for(let i=0;i<8;i++){const a=i*Math.PI/4+t*.03;line(e,{x:e.x+Math.cos(a)*1400,y:e.y+Math.sin(a)*1400},85,22,1.2);}}
 if(kind==='plant'){circle(e.x,e.y,800,18,1.7,{inner:330,element:'thorn'});for(const m of alive)circle(m.x,m.y,170,14,1.1,{element:'poison',linger:45});}
 if(kind==='harbingers'){if(e.art.includes('boss-6')){circle(e.x,e.y,480,12,1.6);line(e,target,300,18,1.6);}else{for(let i=0;i<6;i++){const a=i*Math.PI/3+t*.05;circle(target.x+Math.cos(a)*400,target.y+Math.sin(a)*400,160,12+i*2,1.5);}}}
 if(kind==='serpents'){const n=Math.max(1,dist(e,target));e.charge={at:t+18,end:t+30,dx:(target.x-e.x)/n*55,dy:(target.y-e.y)/n*55,fire:true};line(e,{x:target.x+(target.x-e.x),y:target.y+(target.y-e.y)},200,18,1.8);circle(e.x,e.y,230,8,1.2,{element:'fire',linger:25});}
 if(kind==='avatar'){const pattern=Math.floor(t/24)%5;if(e.phase===1){for(let i=0;i<10;i++){const a=i*Math.PI/5+t*.04;line(e,{x:e.x+Math.cos(a)*1500,y:e.y+Math.sin(a)*1500},90,16,1.4);}}else if(pattern===0){circle(e.x,e.y,650,14,1.7,{inner:180,element:'lightning',disarm:15});}else if(pattern===1){const n=Math.max(1,dist(e,target));e.charge={at:t+12,end:t+12+(e.phase===2?18:6),dx:(target.x-e.x)/n*75,dy:(target.y-e.y)/n*75,fire:e.phase===2};for(let i=0;i<(e.phase===2?3:1);i++)line({x:e.x+i*80,y:e.y-i*80},target,260,12+i*8,1.6);}else if(pattern===2){line(e,{x:target.x+(target.x-e.x)*2,y:target.y+(target.y-e.y)*2},130,12,2);}else if(pattern===3){circle(e.x,e.y,850,24,2,{inner:200});}else{for(const m of alive)circle(m.x,m.y,320,18,1.9,{element:'shadow',linger:50});}if(e.phase===2)for(let i=0;i<8;i++){const a=t*.05+i*Math.PI/4;circle(e.x+Math.cos(a)*700,e.y+Math.sin(a)*700,170,14+i*2,1.5,{element:'fire',linger:30});}}
 // Summons are capped; encounter identity and serial remain replay deterministic.
 if(['totem','plant','shadow','avatar','serpents'].includes(kind)&&w.monsters.filter(m=>m.summon).length<12){const num=kind==='shadow'?0:kind==='serpents'?1:2;for(let i=0;i<num;i++){const a=t*.04+i*Math.PI,x=e.x+Math.cos(a)*500,y=e.y+Math.sin(a)*500,stats=citadelStats(w.floor,w.population);w.monsters.push({id:-(1000000+(++w.serial)),x,y,hp:stats.hp,maxHp:stats.hp,attack:stats.attack,speed:22,ready:t+15,skillReady:t+30,walk:0,face:1,elite:false,aggro:true,summon:true,citadel:true,explorationTier:3,species:kind==='plant'?18:kind==='totem'?2:15,art:citadelAsset('enemy',kind==='plant'?18:kind==='totem'?2:15),role:'melee'});}}
 return true;
}
export function citadelAfterDamage(w){
 if(!isCitadel(w))return;
 for(const e of [...w.monsters])if(e.hp<=0&&e.species===28&&!e.split){e.split=true;for(let i=0;i<3;i++)w.monsters.push({...e,id:-(2000000+(++w.serial)),species:29,art:citadelAsset('enemy',29),x:e.x+Math.cos(i*2*Math.PI/3)*60,y:e.y+Math.sin(i*2*Math.PI/3)*60,hp:e.maxHp*.22,maxHp:e.maxHp*.22,split:true,aggro:true});}
 const shadow=w.monsters.find(e=>e.bossKind==='shadow'&&e.hp>0);if(shadow){const dead=w.monsters.filter(e=>e.channel&&e.hp<=0);for(const e of dead){shadow.hp=Math.max(0,shadow.hp-shadow.maxHp/12);if(shadow.hp>0){e.hp=e.maxHp;e.ready=w.tick+20;}}}
 if(w.citadelStage.boss&&!w.monsters.some(e=>e.boss&&e.hp>0)){w.citadelBossCleared=true;for(const e of w.monsters)if(!e.boss)e.hp=0;}
}
export function hazardInside(h,m){if(h.type==='line'){const dx=h.tx-h.x,dy=h.ty-h.y,q=Math.max(0,Math.min(1,((m.x-h.x)*dx+(m.y-h.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(m.x-h.x-q*dx,m.y-h.y-q*dy)<=h.width/2;}const d=dist(m,h);return d<=h.r&&d>=(h.inner||0);}
