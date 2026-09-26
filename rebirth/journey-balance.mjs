// 45–60 day progression target with frequent collection (6 h offline storage).
export const BALANCE_VERSION='journey-20260925';
export const levelHours=level=>.16+.00035*level*level;
export const journeyXP=level=>Math.round(120+level**2.1*12);
export function balanceWorld(stages,bosses,raids){
 const fieldHP=[260,1800,5000,11000,20000,32000,48000,65000,90000,120000];
 const fieldAttack=[8,55,125,210,320,470,650,850,1100,1450];
 for(const s of stages){
  const offset=s.id%3;s.level=Math.max(1,s.region*20+offset*6);
  s.hp=Math.round(fieldHP[s.region]*(1+offset*.2));
  s.attack=Math.round(fieldAttack[s.region]*(1+offset*.12));
  s.xp=Math.max(1,Math.round(journeyXP(s.level)*8/(levelHours(s.level)*3600)));
  s.gold=4+s.region*2+offset;
  s.dropLevel=s.id===29?200:Math.max(10,Math.floor(s.level/10)*10);
  s.star=s.region<2?0:Math.max(0,(s.region-1)*9);
 }
 const bossHP=[1800,26000,100000,245000,480000,830000,1350000,2050000,3000000,4400000];
 const bossAttack=[9,70,155,270,430,650,890,1170,1500,1900];
 for(const b of bosses){
  const n=b.id%3;b.hp=Math.round(bossHP[b.region]*(1+n*.22));
  b.attack=Math.round(bossAttack[b.region]*(1+n*.12)*(n===2?3.5:1));b.hp=Math.round(b.hp*(n===2?1.35:1));b.seconds=90;
  b.patternEvery=Math.max(9,16-b.region);b.patternMultiplier=2.1+n*.2;
  b.gold=Math.round((1200+900*b.region)*(n===2?4:1));
  b.cubes=n===2?18:6;b.material=0;
  b.dropChance=n===2?.25:.10;b.gearLevel=b.region*20+(n===0?10:20);
  b.level=b.id===29?200:b.region===0?1+n*5:Math.min(200,b.region*20+n*6);
  b.recommended={...b.recommended,gear:Math.max(1,b.region*20),stars:Math.min(20,Math.round(b.region*2)),pot:b.region>=2,target:100};
 }
 const raidValues=[{hp:1200000,attack:500,seconds:240,gold:18000,fragment:100,cube:16,highCubeChance:.5},{hp:9000000,attack:2200,seconds:240,gold:60000,fragment:240,cube:30,highCubeChance:1}];
 raids.forEach((r,i)=>Object.assign(r,raidValues[i]));
}
export function incomingDamage(attack,defense){return Math.max(1,attack/(1+Math.max(0,defense)/650));}
export const DAILY_TASKS={
 hunt:{name:'사냥 1,200마리',goal:1200,gold:12000,fragment:80,cube:4,highCube:1},
 boss:{name:'보스 1회 승리',goal:1,gold:18000,fragment:100,cube:4,highCube:1},
 tower:{name:'시련의 탑 새 층 최초 클리어',goal:1,gold:15000,fragment:80,cube:2,highCube:0},
};

