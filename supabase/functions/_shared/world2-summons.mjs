import './world2-data.js';
const W=globalThis.RinguWorld2Data;
export const summonCosts=[250,250,250,500,500,500,1000,1000,1000,2500,7500,7500,18000,18000,18000,...W.costs];
export function normalizeSummons(s,requirements){
 s.summons??={};
 for(const group of ['weapon','armor','accessory']){
  const v=s.summons[group]??={exp:0,level:1};
  let exp=Number.isSafeInteger(v.exp)&&v.exp>=0?v.exp:0;
  const base=requirements[14];
  if(v.world2Version!==1){exp=Math.min(base,exp);v.world2Version=1;}
  let level=requirements.reduce((lv,n,i)=>exp>=n?i+1:lv,1);
  if(!s.world2Unlocked){exp=Math.min(base,exp);level=Math.min(15,level);}
  else if(exp>=base){
   level=16;
   const first=base+10000,last=first+20000;
   if(exp>=first&&(s.monsterUnlockStep||0)>=42){level=17;if(exp>=last&&(s.monsterUnlockStep||0)>=60)level=18;}
   exp=Math.min(level===16?first:last,exp);
  }
  v.exp=exp;v.level=level;
 }
}
export function grantSummonExperience(s,group,count,requirements){
 for(let i=0;i<count;i++){
  const v=s.summons[group],limit=v.level<15?requirements[14]:v.level===15?requirements[14]:v.level===16?requirements[14]+10000:requirements[14]+30000;
  v.exp=Math.min(limit,v.exp+1);normalizeSummons(s,requirements);
 }
}
export function selectFallen(group,randomInt){
 let roll=randomInt(15),series=4;
 for(let i=0;i<5;i++){roll-=W.seriesWeights[i];if(roll<0){series=i;break;}}
 const slots=group==='weapon'?['무기']:group==='armor'?['투구','갑옷','바지','신발']:['반지','귀걸이'];
 const slot=slots[randomInt(slots.length)];
 return W.gear.find(it=>it.rank===series+1&&it.slot===slot);
}
