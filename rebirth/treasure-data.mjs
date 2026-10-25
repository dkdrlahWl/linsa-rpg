// 2026-10-26 보물 지뢰찾기: 5×5 판 · 지뢰 3개 · 하루 2판 · 터지면 모은 보상 전부 잃음.
export const TREASURE_CELLS=25;
export const TREASURE_MINES=3;
export const TREASURE_DAILY=2;
export const TREASURE_GEAR_LEVELS=[150,160,170,180,190];
// 안전한 칸을 열 때마다 하나씩 나온다. chance 합계 = 1.
export const TREASURE_REWARDS=Object.freeze([
 {id:'gold',name:'골드',amount:300000,chance:.295},
 {id:'cube',name:'레드 큐브',amount:5,chance:.25},
 {id:'highCube',name:'블랙 큐브',amount:1,chance:.20},
 {id:'addCube',name:'에디셔널 큐브',amount:1,chance:.10},
 {id:'scroll',name:'잠재 해금 주문서',amount:1,chance:.06},
 {id:'dungeonKey',name:'던전 열쇠',amount:1,chance:.04},
 {id:'potentialLock',name:'잠재 잠금석',amount:1,chance:.025},
 {id:'bonusFlame',name:'추가옵션 불꽃',amount:1,chance:.02},
 {id:'bossGear',name:'150~190제 보스장비 상자',amount:1,chance:.005},
 {id:'primeCube',name:'프라임 큐브',amount:1,chance:.005},
].map(Object.freeze));
export const treasureReward=id=>TREASURE_REWARDS.find(r=>r.id===id);
export function rollTreasureReward(random){
 let roll=random();
 for(const r of TREASURE_REWARDS){roll-=r.chance;if(roll<0)return r;}
 return TREASURE_REWARDS[0];
}
