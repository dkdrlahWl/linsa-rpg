import {makeExplorationDungeon,revealDungeon} from './exploration-dungeon.mjs?v=exploration-dungeon-192';
// Calibrated against 도현 warrior Lv.200 snapshot, 2026-10-10 KST.
export const EXPLORATION_VERSION='exploration-dungeon-192';
export const EXPLORATIONS=[
 {id:0,name:'달빛 수림의 유적',floors:10,multiplier:1,level:200,art:'exploration-0',map:'exploration/map-0.webp',boss:'월림의 수호왕 아르보른',monsters:['달가시 늑대','이끼 갑옷돌','달밤 버섯'],seconds:1800,gold:100000,cube:3,highCube:1},
 {id:1,name:'용암 수정 광산',floors:11,multiplier:1.5,level:205,art:'exploration-1',map:'exploration/map-1.webp',boss:'용철 거수 카르곤',monsters:['잿불 도마뱀','용암 수정게','불꽃 광부 임프'],seconds:1980,gold:150000,cube:4,highCube:2},
 {id:2,name:'별의 심연 성전',floors:12,multiplier:2.25,level:210,art:'exploration-2',map:'exploration/map-2.webp',boss:'성운의 여제 아스트라',monsters:['별빛 해파리','공허 가고일','초승달 예언자'],seconds:2160,gold:225000,cube:5,highCube:3},
];
export const EXPLORATION_BASE={bossHp:95000000,attack:11500,referenceAttack:49108,referenceHp:67525,referenceDefense:1373,referencePower:206123};
export const explorationPopulation=n=>({hp:1+.30*(Math.max(1,Math.min(4,n))-1),attack:1+.12*(Math.max(1,Math.min(4,n))-1)});
export function explorationStats(tier,floor,count,boss=false){
 const theme=EXPLORATIONS[tier];if(!theme)throw Error('INVALID_EXPLORATION');
 const depth=.48+.52*(floor-1)/(theme.floors-1),scale=explorationPopulation(count),base=EXPLORATION_BASE;
 return {hp:Math.round(base.bossHp*(boss?1:.007)*theme.multiplier*depth*scale.hp),attack:Math.round(base.attack*(boss?1:.27)*theme.multiplier*depth*scale.attack),speed:boss?15:18+(tier%2)*2};
}
export const explorationArt=(tier,species,boss=false)=>'exploration/'+(boss?'boss-':'monster-')+tier+(boss?'':'-'+species)+'.webp';
export function explorationFloor(w){
 const theme=EXPLORATIONS[w.tier],final=w.floor===theme.floors;w.floorAt=w.tick;w.floorDeadline=w.tick+1800;delete w.bossBattleAt;w.exitOpen=false;w.dungeon=makeExplorationDungeon(w.tier,w.floor,w.started>>>0);w.exit={...w.dungeon.exit};w.monsters=[];w.hazards=[];w.projectiles=[];w.effects=[];w.numbers=[];w.cleared=w.floor-1;
 // Residents occupy separate rooms. The entry room stays safe during loading.
 const rooms=w.dungeon.rooms.filter(r=>r.id!==3),points=rooms.flatMap(r=>[[r.x+2,r.y+2],[r.x+r.w-3,r.y+r.h-3]].map(([x,y])=>[(x+.5)*100,(y+.5)*100]));
 const count=final?3:6+Math.min(4,Math.floor((w.floor-1)/3));
 for(let i=0;i<count;i++){const stats=explorationStats(w.tier,w.floor,w.population);const room=final?w.dungeon.rooms.find(r=>r.id===[4,1,2][i]):null;const [x,y]=room?[(room.x+2.5)*100,(room.y+2.5)*100]:points[(i+w.floor-1)%points.length],species=i%3;w.monsters.push({id:-(w.floor*100+i+1),x,y,species,explorationTier:w.tier,level:theme.level,hp:stats.hp,maxHp:stats.hp,attack:stats.attack,speed:stats.speed,ready:w.tick+15,walk:0,face:1,elite:(i+w.floor)%4===0});}
 if(final){const stats=explorationStats(w.tier,w.floor,w.population,true);w.monsters.push({id:-(w.floor*100+99),x:w.exit.x,y:w.exit.y,species:3,explorationTier:w.tier,boss:true,elite:true,hp:stats.hp,maxHp:stats.hp,attack:stats.attack,speed:stats.speed,level:theme.level,ready:w.tick+20,skillReady:w.tick+40,walk:0,face:1});}
 w.maxHp=w.monsters.reduce((n,e)=>n+e.maxHp,0);w.hp=w.maxHp;w.enemy={...w.exit,face:1};
 for(const [i,m] of w.members.entries()){m.x=w.dungeon.start.x+(i%2)*100-50;m.y=w.dungeon.start.y+Math.floor(i/2)*100-50;m.input=[0,0,0];m.inputAt=w.started+w.tick*100;m.reviveProgress=0;for(const key of ['pendingHits','pendingHit','pendingSkill','firstCast','secondCast','thirdCast','fourthCast','fifthCast'])delete m[key];if(w.floor>1&&!m.left)m.hp=Math.max(1,Math.min(m.power.hp,m.hp+Math.round(m.power.hp*.2)));}
 revealDungeon(w);
}
export function initializeExploration(w){
 if(w.members.filter(m=>!m.left).length>4)throw Error('INVALID_EXPLORATION_PLAYERS');
 Object.assign(w,{floor:1,population:w.members.filter(m=>!m.left).length,kills:0,seed:(w.started>>>0)||1});explorationFloor(w);return w;
}
export function explorationProgress(w){
 w.hp=w.monsters.reduce((n,e)=>n+Math.max(0,e.hp),0);
 if(!w.monsters.length&&!w.exitOpen){w.cleared=w.floor;w.exitOpen=true;w.hazards=[];for(const m of w.members){for(const key of ['firstCast','secondCast','thirdCast','fourthCast','fifthCast','pendingHits','pendingSkill'])delete m[key];}}
 if(w.exitOpen){
  const theme=EXPLORATIONS[w.tier];
  if(w.floor===theme.floors){w.status='won';w.chest={...w.exit};w.lootAt=w.started+w.tick*100;for(const m of w.members)m.input=[0,0,0];return;}
  if(w.members.some(m=>!m.left&&m.hp>0&&Math.hypot(m.x-w.exit.x,m.y-w.exit.y)<190)){w.floor++;explorationFloor(w);}
 }else if(w.tick>=w.floorDeadline){w.status='lost';w.reason='floorTimeout';w.endedTick=w.tick;}
}
