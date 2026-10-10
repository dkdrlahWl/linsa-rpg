import {makeExplorationDungeon,makeExplorationArena,revealDungeon,dungeonWalkable} from './exploration-dungeon.mjs?v=terrain-cubes-movement-202';
// Calibrated against 도현 warrior Lv.200 snapshot, 2026-10-10 KST.
export const EXPLORATION_VERSION='exploration-arena-196';
export const EXPLORATIONS=[
 {id:0,name:'달빛 수림의 유적',floors:10,multiplier:1,level:200,art:'exploration-0',map:'exploration/map-0.webp',boss:'월림의 수호왕 아르보른',monsters:['달가시 늑대','이끼 갑옷돌','달밤 버섯'],seconds:1800,gold:50000},
 {id:1,name:'용암 수정 광산',floors:11,multiplier:1.5,level:205,art:'exploration-1',map:'exploration/map-1.webp',boss:'용철 거수 카르곤',monsters:['잿불 도마뱀','용암 수정게','불꽃 광부 임프'],seconds:1980,gold:70000},
 {id:2,name:'별의 심연 성전',floors:12,multiplier:2.25,level:210,art:'exploration-2',map:'exploration/map-2.webp',boss:'성운의 여제 아스트라',monsters:['별빛 해파리','공허 가고일','초승달 예언자'],seconds:2160,gold:100000},
];
export const EXPLORATION_MOVE_SPEED=1.3;
export const explorationMonsterMultiplier=(tier,floor)=>floor<=Math.ceil(EXPLORATIONS[tier].floors/2)?2:3;
export const EXPLORATION_BASE={bossHp:95000000,attack:11500,referenceAttack:49108,referenceHp:67525,referenceDefense:1373,referencePower:206123};
export const explorationPopulation=n=>({hp:1+.30*(Math.max(1,Math.min(4,n))-1),attack:1+.12*(Math.max(1,Math.min(4,n))-1)});
export function explorationStats(tier,floor,count,boss=false){
 const theme=EXPLORATIONS[tier];if(!theme)throw Error('INVALID_EXPLORATION');
 const depth=.48+.52*(floor-1)/(theme.floors-1),scale=explorationPopulation(count),base=EXPLORATION_BASE;
 return {hp:Math.round(base.bossHp*(boss?1:.007)*theme.multiplier*depth*scale.hp),attack:Math.round(base.attack*(boss?1:.27)*theme.multiplier*depth*scale.attack),speed:boss?15:18+(tier%2)*2};
}
export const explorationArt=(tier,species,boss=false)=>'exploration/'+(boss?'boss-':'monster-')+tier+(boss?'':'-'+species)+'.webp';
export function explorationFloor(w){
 const theme=EXPLORATIONS[w.tier],final=w.floor===theme.floors;w.floorAt=w.tick;w.floorDeadline=w.tick+1800;delete w.bossBattleAt;w.exitOpen=false;delete w.bossDeath;w.dungeon=(final?makeExplorationArena:makeExplorationDungeon)(w.tier,w.floor,w.started>>>0);w.exit={...w.dungeon.exit};w.monsters=[];w.hazards=[];w.projectiles=[];w.effects=[];w.numbers=[];w.cleared=w.floor-1;
 // Residents occupy separate rooms. The entry room stays safe during loading.
 const rooms=w.dungeon.rooms.filter(r=>r.id!==3),multiplier=explorationMonsterMultiplier(w.tier,w.floor);
 let spawnSeed=((w.started>>>0)^Math.imul(w.floor,2654435761)^Math.imul(w.tier+1,1597334677))>>>0;
 const random=()=>{spawnSeed=(Math.imul(spawnSeed,1664525)+1013904223)>>>0;return spawnSeed/4294967296;};
 const slots=new Map(w.dungeon.rooms.map(r=>{const points=[];for(let y=r.y+1;y<r.y+r.h-1;y++)for(let x=r.x+1;x<r.x+r.w-1;x++)if((!r.spawnBounds||((x+.5)*100>=r.spawnBounds.left&&(x+.5)*100<r.spawnBounds.right&&(y+.5)*100>=r.spawnBounds.top&&(y+.5)*100<r.spawnBounds.bottom))&&dungeonWalkable(w.dungeon,(x+.5)*100,(y+.5)*100)&&(!final||Math.hypot((x+.5)*100-w.exit.x,(y+.5)*100-w.exit.y)>90))points.push([(x+.5)*100,(y+.5)*100]);for(let i=points.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[points[i],points[j]]=[points[j],points[i]];}return [r.id,points];}));
 const count=(final?3:6+Math.min(4,Math.floor((w.floor-1)/3)))*multiplier;
 for(let i=0;i<count;i++){const stats=explorationStats(w.tier,w.floor,w.population),room=final?w.dungeon.rooms.find(r=>r.id===[4,1,2][i%3]):rooms[(i+w.floor-1)%rooms.length],species=i%3;
  const [x,y]=slots.get(room.id).pop();w.monsters.push({id:-(w.floor*100+i+1),x,y,species,explorationTier:w.tier,level:theme.level,hp:stats.hp,maxHp:stats.hp,attack:stats.attack,speed:stats.speed,ready:w.tick+15,walk:0,face:1,elite:(i+w.floor)%4===0});
 }
 // Sparse floor pickups use a separate deterministic stream from combat critical hits.
 const roll=random(),hearts=roll<.3?0:roll<.85?1:2;w.hearts=[];
 for(let i=0;i<hearts;i++){const room=w.dungeon.rooms[Math.floor(random()*w.dungeon.rooms.length)],point=slots.get(room.id).pop();if(point)w.hearts.push({id:w.floor*10+i,x:point[0],y:point[1]});}
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
  if(w.floor===theme.floors){w.status='won';w.chest={...(w.bossDeath||w.exit)};w.hazards=[];w.effects=[];w.numbers=[];w.projectiles=[];w.lootAt=w.started+w.tick*100;for(const m of w.members)m.input=[0,0,0];return;}
  if(w.members.some(m=>!m.left&&m.hp>0&&Math.hypot(m.x-w.exit.x,m.y-w.exit.y)<190)){w.floor++;explorationFloor(w);}
 }else if(w.tick>=w.floorDeadline){w.status='lost';w.reason='floorTimeout';w.endedTick=w.tick;}
}

export function collectExplorationHearts(w){
 if(!w.hearts?.length)return;
 for(const h of w.hearts){
  const eligible=w.members.filter(m=>!m.left&&m.hp>0&&m.hp<m.power.hp&&Math.hypot(m.x-h.x,m.y-h.y)<=85);
  const m=eligible.reduce((best,next)=>!best||Math.hypot(next.x-h.x,next.y-h.y)<Math.hypot(best.x-h.x,best.y-h.y)?next:best,null);
  if(!m)continue;
  const amount=Math.min(m.power.hp-m.hp,Math.max(1,Math.round(m.power.hp*.1)));m.hp+=amount;h.claimed=true;
  w.numbers.push({id:++w.serial,value:amount,x:m.x,y:m.y-90,kind:'heal',start:w.tick,end:w.tick+16});
 }
 w.hearts=w.hearts.filter(h=>!h.claimed);
}
