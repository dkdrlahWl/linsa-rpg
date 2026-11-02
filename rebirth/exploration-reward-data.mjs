// Ten-stage reward schedule; only the first three expeditions are currently open.
export const EXPLORATION_REWARDS=[
 [50000,20,15,2,5],[70000,23,18,3,6],[100000,26,21,4,7],
 [130000,29,24,5,5],[170000,32,27,6,5],[220000,35,30,7,5],
 [280000,38,33,8,5],[350000,41,36,10,5],[430000,45,40,12,5],[550000,50,45,15,5]
].map(([gold,scroll,highCube,potentialLock,bossGear])=>({gold:gold*20,scroll:scroll/100,highCube:highCube/100,potentialLock:potentialLock/100,bossGear:bossGear/100}));
export const EXPLORATION_REWARD_COUNTS={scroll:3,highCube:5,potentialLock:2};
export const EXPLORATION_GEAR_WEIGHTS=[25,20,15,12,10,7,5,3,2,1];
export function explorationGearLevel(random){let roll=random()*100;for(const [i,weight] of EXPLORATION_GEAR_WEIGHTS.entries()){roll-=weight;if(roll<0)return 100+i*10;}return 190;}

// 2026-10-25 4~6단계 보상(id 4~6). 에디셔널 큐브·추가옵션 불꽃 추가, 보스장비 레벨 구간 상향. 200제는 4단계 없음, 5단계 극소 확률, 6단계 30%.
const EXTRA=[
 [4,{gold:2600000,scroll:.30,highCube:.30,potentialLock:.05,addCube:.30,bonusFlame:.03,bossGear:.08,counts:{scroll:3,highCube:5,potentialLock:2,addCube:3,bonusFlame:1},gear:[[150,25],[160,22],[170,18],[180,15],[190,12]]}],
 [5,{gold:3400000,scroll:.32,highCube:.35,potentialLock:.06,addCube:.40,bonusFlame:.05,bossGear:.10,counts:{scroll:3,highCube:6,potentialLock:2,addCube:5,bonusFlame:1},gear:[[170,35],[180,30],[190,25],[200,10]]}],
 // 2026-11-02 도현: 7단계 이상은 보스장비 180제 이상만. 판당 200제 확률을 5→6단계(1.0%→2.04%)처럼 단계마다 두 배.
 // 7단계: 보스장비 14% · 200제 판당 4.08%(비중 29.14%). 8단계: 보스장비 16% · 200제 판당 8.16%(51%) · 220제 판당 1%(6.25%, 5단계 200제와 같음).
 // 180·190제는 남은 비중을 6단계 비율(50:33)로 나눈다.
 [7,{gold:7000000,scroll:.36,highCube:.42,potentialLock:.075,addCube:.55,bonusFlame:.09,bossGear:.14,counts:{scroll:3,highCube:9,potentialLock:2,addCube:9,bonusFlame:1},gear:[[180,4268],[190,2818],[200,2914]]}],
 [8,{gold:8600000,scroll:.38,highCube:.45,potentialLock:.08,addCube:.60,bonusFlame:.10,bossGear:.16,counts:{scroll:3,highCube:10,potentialLock:2,addCube:10,bonusFlame:1},gear:[[180,2575],[190,1700],[200,5100],[220,625]]}],
 [6,{gold:4400000,scroll:.35,highCube:.40,potentialLock:.07,addCube:.50,bonusFlame:.08,bossGear:.12,counts:{scroll:3,highCube:8,potentialLock:2,addCube:8,bonusFlame:1},gear:[[180,50],[190,33],[200,17]]}],
];
for(const [id,r] of EXTRA)EXPLORATION_REWARDS[id]=r;
export const EXPLORATION_REWARD_KEYS=['scroll','highCube','potentialLock','addCube','bonusFlame'];
export const explorationRewardCount=(rates,key)=>rates.counts?.[key]??EXPLORATION_REWARD_COUNTS[key]??1;
export function explorationGearLevelFor(rates,random){if(!rates.gear)return explorationGearLevel(random);const total=rates.gear.reduce((n,[,w])=>n+w,0);let roll=random()*total;for(const [level,w] of rates.gear){roll-=w;if(roll<0)return level;}return rates.gear.at(-1)[0];}
export const explorationGearRange=rates=>rates.gear?rates.gear[0][0]+'~'+rates.gear.at(-1)[0]:'100~190';
// 확률보기용: 레벨 구간별 [레벨, 보스장비 안에서 비중, 판당 확률].
export function explorationGearTable(rates){const list=rates.gear||EXPLORATION_GEAR_WEIGHTS.map((w,i)=>[100+i*10,w]);const total=list.reduce((n,[,w])=>n+w,0);return list.map(([level,w])=>[level,w/total,rates.bossGear*w/total]);}
