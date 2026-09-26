// Independent rolls, per player and per chest. No daily cap or shared loot pool.
export const COOP_TIERS=Array.from({length:10},(_,i)=>{
 const level=(i+1)*20,band=level<=60?0:level<=120?1:2;
 return {level,name:`Lv.${level} ${['숲','용암','공허'][band]}의 균열`,art:['rift-forest','rift-magma','rift-void'][band],
  hp:[80000,185000,320000,680000,1650000,2050000,3250000,4000000,4600000,5200000][i],
  attack:[200,340,520,780,1100,1450,1800,2200,2650,3200][i]*1.8,
  gold:100+level*8,gearChance:[.02,.03,.04][band],fragmentCount:[1,2,3][band],
  chances:{cube:[.01,.02,.03][band],highCube:[0,.003,.006][band],primeCube:[0,0,.001][band],fragment:[.08,.12,.16][band],scroll:[.01,.015,.02][band]}};
});
export function rollRiftReward(tier,random){
 const t=COOP_TIERS[tier];if(!t)throw Error('INVALID_COOP_TIER');
 const reward={type:'coop',won:true,level:t.level,gold:t.gold,items:[]};
 for(const [key,chance] of Object.entries(t.chances))reward[key]=chance>0&&random()<chance?(key==='fragment'?t.fragmentCount:1):0;
 reward.gear=random()<t.gearChance;return reward;
}
