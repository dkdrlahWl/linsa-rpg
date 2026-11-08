import {isCitadel,CITADEL_CONTENT,CITADEL_TIER,citadelFloor,citadelStats,citadelPopulation,citadelStage,citadelBossOrdinal,citadelChestPending,CITADEL_BOSS_FLOORS} from './citadel-zero.mjs?v=expl1116-20261108';
import {makeExplorationDungeon,makeExplorationArena,revealDungeon,dungeonWalkable,nearestWalkable} from './exploration-dungeon.mjs?v=expl1116-20261108';
// Calibrated against 도현 warrior Lv.200 snapshot, 2026-10-10 KST.
export const EXPLORATION_VERSION='exploration-arena-196';
export const EXPLORATIONS=[
 {id:0,name:'달빛 수림의 유적',floors:5,multiplier:1,level:200,art:'exploration-0',map:'exploration/map-0.webp',boss:'월림의 수호왕 아르보른',monsters:['달가시 늑대','이끼 갑옷돌','달밤 버섯'],seconds:1800,gold:50000},
 {id:1,name:'용암 수정 광산',floors:5,multiplier:1.5,level:205,art:'exploration-1',map:'exploration/map-1.webp',boss:'용철 거수 카르곤',monsters:['잿불 도마뱀','용암 수정게','불꽃 광부 임프'],seconds:1980,gold:70000},
 {id:2,name:'별의 심연 성전',floors:5,multiplier:2.25,level:210,art:'exploration-2',map:'exploration/map-2.webp',boss:'성운의 여제 아스트라',monsters:['별빛 해파리','공허 가고일','초승달 예언자'],seconds:2160,gold:100000},
 , // id 3 = 암흑성채 (CITADEL_TIER, 별도 콘텐츠)
 // 2026-10-25: 4~6단계. 보스 체력 = 1인 체력 × 인원수(linearHp), 공격력은 attackMultiplier, 입장 열쇠 keys개.
 {id:4,name:'서리 왕관 빙궁',floors:5,multiplier:3.76,attackMultiplier:2,linearHp:true,keys:1,level:215,art:'exploration-4',map:'exploration/map-4.webp',boss:'빙결 여제 크리오네',monsters:['서리 송곳니 늑대','얼음 갑주 골렘','눈보라 정령'],seconds:2340,gold:130000},
 {id:5,name:'잿빛 망령 요새',floors:5,multiplier:5.26,attackMultiplier:2.3,linearHp:true,keys:2,level:220,art:'exploration-5',map:'exploration/map-5.webp',boss:'망령 군주 모르가스',monsters:['잿불 해골병','저주받은 갑옷','망령 까마귀'],seconds:2520,gold:170000},
 {id:6,name:'시간이 멈춘 탑',floors:5,multiplier:7.52,attackMultiplier:2.6,linearHp:true,keys:3,level:225,art:'exploration-6',map:'exploration/map-6.webp',boss:'시간의 파수꾼 크로노스',monsters:['태엽 기사','모래시계 정령','멈춘 시곗바늘 마도사'],seconds:2700,gold:220000},
 // 2026-11-02 7단계(200제 보장): 보스 1인 체력 7억(6단계 5억 · 8단계 9.27억 사이). 10.53 × 9,500만 × 0.7 ≈ 7억. 그림은 임시로 5단계 것을 복사.
 {id:7,name:'심연 수정 회랑',floors:5,multiplier:10.53,attackMultiplier:2.9,linearHp:true,keys:4,level:228,art:'exploration-7',map:'exploration/arena-7-original-v1.webp',arena:'exploration/arena-7-original-v1.webp',boss:'심연의 수정 군주 벨락시스',monsters:['수정 갑각 전갈','심연 등불 망령','깨진 거울 기사'],seconds:2790,gold:250000},
 // 2026-11-02 8단계(220제 보장): 보스 1인 체력 17.5억(도현 확정). 기준 = 200제 종언급·25성·불꽃5%·보스용 잠재27줄(레전 보공 35%)·코스튬90%·치피200%·Lv.300·300전직,
 // 사제 제외 평균 120초 풀딜 약 17.9억(에디셔널 제외). 26.3158 × 9,500만 × 0.7 ≈ 17.5억. 그림은 임시로 6단계 것을 복사해 사용.
 {id:8,name:'별이 무너진 천공 신전',floors:5,multiplier:26.3158,attackMultiplier:3.2,linearHp:true,keys:5,level:230,art:'exploration-8',map:'exploration/arena-8-original-v1.webp',arena:'exploration/arena-8-original-v1.webp',boss:'천공의 붕괴자 아스트라뮤트',monsters:['성운 파편 골렘','별빛 칼날 수호자','공허 예언자'],seconds:2880,gold:280000},
 // 2026-11-03 도현: 9·10단계(5·6·7처럼 보상 확률·개수 증가, 보스 체력 증가). 보스 1인 체력 9단계 25억 · 10단계 35억(8단계 17.5억에서 ×1.43 · ×1.4).
 // 25억 ÷ (9,500만 × 0.7) = 37.594 · 35억 ÷ 6,650만 = 52.632. 열쇠는 8단계와 같은 5개 고정(도현). 9단계는 영겁의 서리 왕좌·네펠리온, 10단계는 종말의 별무덤·녹타리스 전용 이미지.
 {id:9,name:'영겁의 서리 왕좌',floors:5,multiplier:37.594,attackMultiplier:3.5,linearHp:true,keys:6,level:233,art:'exploration-9',map:'exploration/arena-9-original-v2.webp',arena:'exploration/arena-9-original-v2.webp',boss:'영겁의 군주 네펠리온',monsters:['서리 결정 거인','영겁의 망령 기사','얼어붙은 시간술사'],seconds:2970,gold:310000},
 {id:10,name:'종말의 별무덤',floors:5,multiplier:52.632,attackMultiplier:3.8,linearHp:true,keys:7,level:236,art:'exploration-10',map:'exploration/arena-10-original-v2.webp',arena:'exploration/arena-10-original-v2.webp',boss:'종말의 별 포식자 녹타리스',monsters:['별무덤 수호석상','붕괴한 성운 정령','검은 별 사도'],seconds:3060,gold:340000},
// 2026-11-08 도현: 11~13단계(250제 보장)·14~16단계(300제 보장). 220제(8~10단계)와 같은 방식.
// 첫 단계 = 이전 보장 풀세팅(220제/250제 종언급·25성·보스용 잠재27줄·코스튬90%·치피200%·Lv.300·300전직) 사제 제외 평균 120초 풀딜 × 0.94
// (8단계 17.5억 ÷ 200제 풀딜 18.61억). 220제 풀딜 58.0억 → 11단계 55억, 250제 풀딜 172.6억 → 14단계 160억. 다음 단계는 9·10처럼 ×1.43·×1.4.
// 열쇠는 단계마다 +1. 그림은 임시로 9·10단계 것을 번갈아 복사(도현이 직접 교체 예정).
 {id:11,name:'홍염의 용암 왕궁',floors:5,multiplier:82.707,attackMultiplier:4.1,linearHp:true,keys:8,level:239,art:'exploration-11',map:'exploration/arena-11-original-v2.webp',arena:'exploration/arena-11-original-v2.webp',boss:'염제 이그니스바르',monsters:['용암 갑주 기사', '불씨 비룡', '잿빛 화염 사제'],seconds:3150,gold:370000},
 {id:12,name:'적월의 핏빛 첨탑',floors:5,multiplier:118.797,attackMultiplier:4.4,linearHp:true,keys:9,level:242,art:'exploration-12',map:'exploration/arena-12-original-v2.webp',arena:'exploration/arena-12-original-v2.webp',boss:'적월의 여왕 세라핀',monsters:['핏빛 박쥐 군주', '적월 창기병', '혈석 골렘'],seconds:3240,gold:400000},
 {id:13,name:'멸화의 화산 심장',floors:5,multiplier:165.414,attackMultiplier:4.7,linearHp:true,keys:10,level:245,art:'exploration-13',map:'exploration/arena-13-original-v2.webp',arena:'exploration/arena-13-original-v2.webp',boss:'멸화의 군주 볼카노스',monsters:['마그마 거신', '화산재 망령', '불꽃 뱀 술사'],seconds:3330,gold:430000},
 {id:14,name:'극광의 공허 회랑',floors:5,multiplier:240.602,attackMultiplier:5.0,linearHp:true,keys:11,level:248,art:'exploration-14',map:'exploration/arena-14-original-v2.webp',arena:'exploration/arena-14-original-v2.webp',boss:'극광의 감시자 오로라스',monsters:['극광 파수꾼', '공허 결정 짐승', '오로라 마도사'],seconds:3420,gold:460000},
 {id:15,name:'태허의 균열 신전',floors:5,multiplier:345.865,attackMultiplier:5.3,linearHp:true,keys:12,level:251,art:'exploration-15',map:'exploration/arena-15-original-v2.webp',arena:'exploration/arena-15-original-v2.webp',boss:'태허의 지배자 바르무트',monsters:['균열 촉수체', '태허 기사단장', '무형의 그림자'],seconds:3510,gold:490000},
 {id:16,name:'영겁의 왕좌 너머',floors:5,multiplier:481.203,attackMultiplier:5.6,linearHp:true,keys:13,level:254,art:'exploration-16',map:'exploration/arena-16-original-v2.webp',arena:'exploration/arena-16-original-v2.webp',boss:'영겁의 왕 에테르니온',monsters:['초신성 수호자', '영겁의 시계 거인', '공허 대사제'],seconds:3600,gold:520000},
];
// 이전 단계(암흑성채 id 3은 건너뜀). 0단계는 null.
export const explorationPrevious=tier=>{for(let i=tier-1;i>=0;i--)if(EXPLORATIONS[i])return i;return null;};
export const explorationKeys=tier=>EXPLORATIONS[tier]?.keys||1;
export const EXPLORATION_MOVE_SPEED=1.6,CITADEL_MOVE_SPEED=1.5;
// Dark Citadel moves faster than Ringu exploration (Hammerwatch-like pace).
export const dungeonMoveSpeed=w=>isCitadel(w)?CITADEL_MOVE_SPEED:EXPLORATION_MOVE_SPEED;
export const explorationMonsterMultiplier=(tier,floor)=>floor<=Math.ceil(EXPLORATIONS[tier].floors/2)?2:3;
export const EXPLORATION_BASE={bossHp:95000000,attack:11500,referenceAttack:49108,referenceHp:67525,referenceDefense:1373,referencePower:206123};
// Final-floor boss HP only (update 229: 30% HP nerf on every difficulty; attack unchanged).
export const EXPLORATION_BOSS_SCALE=.7;
export const explorationPopulation=n=>({hp:1+.30*(Math.max(1,Math.min(4,n))-1),attack:1+.12*(Math.max(1,Math.min(4,n))-1)});
export const explorationScale=(tier,n)=>{const s=explorationPopulation(n);return EXPLORATIONS[tier]?.linearHp?{...s,hp:Math.max(1,Math.min(4,n))}:s;};
export function explorationStats(tier,floor,count,boss=false){
 if(tier===CITADEL_TIER)return citadelStats(floor,count,boss);
 const theme=EXPLORATIONS[tier];if(!theme)throw Error('INVALID_EXPLORATION');
 const depth=.48+.52*(floor-1)/(theme.floors-1),scale=explorationScale(tier,count),base=EXPLORATION_BASE;
 return {hp:Math.round(base.bossHp*(boss?EXPLORATION_BOSS_SCALE:.007)*theme.multiplier*depth*scale.hp),attack:Math.round(base.attack*(boss?1:.27)*(theme.attackMultiplier??theme.multiplier)*depth*scale.attack),speed:boss?15:18+(tier%2)*2};
}
export const explorationArt=(tier,species,boss=false)=>boss&&tier>=7?'exploration/boss-'+tier+'-original-'+(tier>=9?'v2':'v1')+'.webp':tier===CITADEL_TIER?'citadel/'+(boss?'boss-9':'enemy-'+species)+'-213.webp':'exploration/'+(boss?'boss-':'monster-')+tier+(boss?'':'-'+species)+'.webp';
export function explorationFloor(w){
 if(isCitadel(w)){delete w.rewardChest;delete w.exitLocked;return citadelFloor(w,dungeonWalkable,revealDungeon);}
 const theme=EXPLORATIONS[w.tier],final=w.floor===theme.floors;w.floorAt=w.tick;w.floorDeadline=w.tick+1800;delete w.bossBattleAt;w.exitOpen=false;delete w.bossDeath;w.dungeon=(final?makeExplorationArena:makeExplorationDungeon)(w.tier,w.floor,(w.mapSeed??w.started)>>>0);w.exit={...w.dungeon.exit};w.monsters=[];w.hazards=[];w.projectiles=[];w.effects=[];w.numbers=[];w.cleared=w.floor-1;
 // Residents occupy separate rooms. The entry room stays safe during loading.
 const rooms=w.dungeon.rooms.filter(r=>r.id!==3),multiplier=explorationMonsterMultiplier(w.tier,w.floor);
 let spawnSeed=(((w.mapSeed??w.started)>>>0)^Math.imul(w.floor,2654435761)^Math.imul(w.tier+1,1597334677))>>>0;
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
 for(const [i,m] of w.members.entries()){Object.assign(m,nearestWalkable(w.dungeon,w.dungeon.start.x+(i%2)*100-50,w.dungeon.start.y+Math.floor(i/2)*100-50,32));m.input=[0,0,0];m.inputAt=w.started+w.tick*100;m.reviveProgress=0;for(const key of ['pendingHits','pendingHit','pendingSkill','firstCast','secondCast','thirdCast','fourthCast','fifthCast'])delete m[key];if(w.floor>1&&!m.left)m.hp=Math.max(1,Math.min(m.power.hp,m.hp+Math.round(m.power.hp*.2)));}
 revealDungeon(w);
}
export function initializeExploration(w){
 if(w.members.filter(m=>!m.left).length>4)throw Error('INVALID_EXPLORATION_PLAYERS');
 // Ringu exploration starts straight in the final boss arena (2026-10-15); the citadel still starts at region 1.
 Object.assign(w,{floor:isCitadel(w)?(CITADEL_BOSS_FLOORS[(w.citadelBoss|0)-1]||1):EXPLORATIONS[w.tier].floors,population:w.members.filter(m=>!m.left).length,kills:0,seed:(w.started>>>0)||1,mapSeed:w.started>>>0});explorationFloor(w);return w;
}
export function explorationProgress(w){
 if(isCitadel(w)&&w.tick>=w.floorDeadline){w.status='lost';w.reason='floorTimeout';w.endedTick=w.tick;return;}
 w.hp=w.monsters.reduce((n,e)=>n+Math.max(0,e.hp),0);
 if(!w.monsters.length&&!w.exitOpen){w.cleared=w.floor;w.exitOpen=true;w.hazards=[];for(const m of w.members){for(const key of ['firstCast','secondCast','thirdCast','fourthCast','fifthCast','pendingHits','pendingSkill'])delete m[key];}}
 if(w.exitOpen){
  const theme=isCitadel(w)?CITADEL_CONTENT:EXPLORATIONS[w.tier];
  if(isCitadel(w)){
   if(citadelStage(w.floor)?.boss&&!w.rewardChest){const at=w.bossDeath||w.exit;w.rewardChest={x:at.x,y:at.y,boss:citadelBossOrdinal(w.floor),floor:w.floor,at:w.tick};
    // 2026-11-06 도현: 성채 보스를 아군이 잡으면 쓰러진 동료(이탈 제외)도 체력 30%로 부활 — 직접 상자를 열어 보상을 받는다.
    for(const m of w.members)if(!m.left&&m.hp<=0){m.hp=Math.max(1,Math.round(m.power.hp*.3));m.reviveProgress=0;m.reviver=null;m.immune=w.tick+20;m.input=[0,0,0];m.inputAt=0;}}
   w.exitLocked=citadelChestPending(w);if(w.exitLocked){for(const m of w.members)m.exitStay=0;return;}
  }
  if(w.floor===theme.floors||(isCitadel(w)&&w.citadelBoss)){w.status='won';w.chest=isCitadel(w)?null:{...(w.bossDeath||w.exit)};w.hazards=[];w.effects=[];w.numbers=[];w.projectiles=[];w.lootAt=w.started+w.tick*100;for(const m of w.members){m.input=[0,0,0];
   // 2026-10-25: 링구의 탐험 클리어 시 쓰러진 동료(이탈 제외)는 체력 30%로 부활해 상자를 열 수 있다.
   if(!isCitadel(w)&&!m.left&&m.hp<=0){m.hp=Math.max(1,Math.round(m.power.hp*.3));m.reviveProgress=0;m.reviver=null;m.inputAt=0;}}return;}
  // Citadel portals need a deliberate one-second stand, so running past never warps the party.
  if(isCitadel(w)){let go=false;for(const m of w.members){const near=!m.left&&m.hp>0&&Math.hypot(m.x-w.exit.x,m.y-w.exit.y)<150;m.exitStay=near?(m.exitStay||0)+1:0;if(m.exitStay>=10)go=true;}if(go){for(const m of w.members)delete m.exitStay;w.floor++;explorationFloor(w);}}
  else if(w.members.some(m=>!m.left&&m.hp>0&&Math.hypot(m.x-w.exit.x,m.y-w.exit.y)<190)){w.floor++;explorationFloor(w);}
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
