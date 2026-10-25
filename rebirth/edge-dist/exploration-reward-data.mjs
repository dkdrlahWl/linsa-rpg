// Ten-stage reward schedule; only the first three expeditions are currently open.
export const EXPLORATION_REWARDS=[
 [50000,20,15,2,5],[70000,23,18,3,6],[100000,26,21,4,7],
 [130000,29,24,5,5],[170000,32,27,6,5],[220000,35,30,7,5],
 [280000,38,33,8,5],[350000,41,36,10,5],[430000,45,40,12,5],[550000,50,45,15,5]
].map(([gold,scroll,highCube,potentialLock,bossGear])=>({gold:gold*20,scroll:scroll/100,highCube:highCube/100,potentialLock:potentialLock/100,bossGear:bossGear/100}));
export const EXPLORATION_REWARD_COUNTS={scroll:3,highCube:5,potentialLock:2};
export const EXPLORATION_GEAR_WEIGHTS=[25,20,15,12,10,7,5,3,2,1];
export function explorationGearLevel(random){let roll=random()*100;for(const [i,weight] of EXPLORATION_GEAR_WEIGHTS.entries()){roll-=weight;if(roll<0)return 100+i*10;}return 190;}

// 2026-10-25 4~6단계 보상(id 4~6). 에디셔널 큐브·추가옵션 불꽃 추가, 보스장비 레벨 구간 상향.
const EXTRA=[
 [4,{gold:2600000,scroll:.30,highCube:.30,potentialLock:.05,addCube:.30,bonusFlame:.03,bossGear:.08,counts:{scroll:3,highCube:5,potentialLock:2,addCube:3,bonusFlame:1},gear:[[150,25],[160,22],[170,18],[180,15],[190,12],[200,8]]}],
 [5,{gold:3400000,scroll:.32,highCube:.35,potentialLock:.06,addCube:.40,bonusFlame:.05,bossGear:.10,counts:{scroll:3,highCube:6,potentialLock:2,addCube:5,bonusFlame:1},gear:[[170,35],[180,30],[190,20],[200,15]]}],
 [6,{gold:4400000,scroll:.35,highCube:.40,potentialLock:.07,addCube:.50,bonusFlame:.08,bossGear:.12,counts:{scroll:3,highCube:8,potentialLock:2,addCube:8,bonusFlame:1},gear:[[180,40],[190,30],[200,30]]}],
];
for(const [id,r] of EXTRA)EXPLORATION_REWARDS[id]=r;
export const EXPLORATION_REWARD_KEYS=['scroll','highCube','potentialLock','addCube','bonusFlame'];
export const explorationRewardCount=(rates,key)=>rates.counts?.[key]??EXPLORATION_REWARD_COUNTS[key]??1;
export function explorationGearLevelFor(rates,random){if(!rates.gear)return explorationGearLevel(random);const total=rates.gear.reduce((n,[,w])=>n+w,0);let roll=random()*total;for(const [level,w] of rates.gear){roll-=w;if(roll<0)return level;}return rates.gear.at(-1)[0];}
export const explorationGearRange=rates=>rates.gear?rates.gear[0][0]+'~'+rates.gear.at(-1)[0]:'100~190';
