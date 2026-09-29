import {RAID_ENCOUNTERS} from './raid-content.mjs?v=lumi-68';
import {weekKey} from './data.mjs?v=lumi-68';

export const RAID_WEEKLY_LIMIT=3;
export function raidWeeklyStatus(state,now=Date.now()){
 const week=weekKey(now),claim=state?.raidWeekly;
 // Carry over this week's rewards from the former per-boss limit once.
 const count=claim?(claim.week===week?claim.count:0):RAID_ENCOUNTERS.reduce((n,raid)=>n+Number(state?.raidClaims?.[raid.id]===week),0);
 const used=Math.min(RAID_WEEKLY_LIMIT,Math.max(0,Number.isSafeInteger(count)?count:0));
 return {week,used,limit:RAID_WEEKLY_LIMIT,remaining:RAID_WEEKLY_LIMIT-used};
}

export function rollRaidReward(tier,random){
 const raid=RAID_ENCOUNTERS[tier];if(!raid)throw Error('INVALID_RAID');
 const reward={type:'coop',mode:'raid',name:raid.name,won:true,practice:false,gold:raid.gold,cube:raid.cubes,fragment:raid.fragment,highCube:0,primeCube:0,scroll:0,items:[]};
 for(const key of ['highCube','primeCube','scroll']){
  const chance=raid[key+'Chance'];
  if(chance>=1||(chance>0&&random()<chance))reward[key]=raid[key];
 }
 return reward;
}
