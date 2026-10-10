// Ten-stage reward schedule; only the first three expeditions are currently open.
export const EXPLORATION_REWARDS=[
 [50000,20,15,2,1],[70000,23,18,3,1.5],[100000,26,21,4,2],
 [130000,29,24,5,3],[170000,32,27,6,4],[220000,35,30,7,5],
 [280000,38,33,8,6],[350000,41,36,10,7],[430000,45,40,12,8.5],[550000,50,45,15,10]
].map(([gold,scroll,highCube,potentialLock,bossGear])=>({gold,scroll:scroll/100,highCube:highCube/100,potentialLock:potentialLock/100,bossGear:bossGear/100}));
export const EXPLORATION_REWARD_COUNTS={scroll:3,highCube:5,potentialLock:2};
export const EXPLORATION_GEAR_WEIGHTS=[25,20,15,12,10,7,5,3,2,1];
export function explorationGearLevel(random){let roll=random()*100;for(const [i,weight] of EXPLORATION_GEAR_WEIGHTS.entries()){roll-=weight;if(roll<0)return 100+i*10;}return 190;}
