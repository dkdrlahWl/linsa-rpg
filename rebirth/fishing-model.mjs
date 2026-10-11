import {FISH,SPOTS,RARITIES,BAITS,FISHING_QUESTS,REWARD_RATES,fishPrice,fishYield,rodGoldCost,rodDiamondCost,baitDiamondCost,aquariumExpandCost,baitGradeWeight,spotGradeWeight,BITE_MIN_MS,BITE_RANGE_MS,CAST_EXPIRE_MS} from './fishing-data.mjs';
export const FISHING_PROTOCOL=4;
const require=(ok,msg)=>{if(!ok)throw Error(msg);};
const integer=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const koreanDay=now=>new Date(now+9*3600000).toISOString().slice(0,10);
export function normalizeFishing(s,now){
 s.fishing??={version:1,rod:1,xp:0,diamonds:0,bait:{worm:20},fish:[],aquarium:[],slots:3,bank:0,bankAt:now,collection:{},daily:{},cast:null,lastCatch:null};
 const f=s.fishing;
 if(f.daily.day!==koreanDay(now))f.daily={day:koreanDay(now),catch:0,rare:0,sell:0,claimed:[]};
 if(f.cast&&now>f.cast.expires)f.cast=null;
 return f;
}
export function aquariumBank(f,now){const hours=Math.min(12,Math.max(0,now-f.bankAt)/3600000);return Math.min(1e9,f.bank+f.aquarium.reduce((n,x)=>n+fishYield(x),0)*hours);}
function settleAquarium(f,now){f.bank=aquariumBank(f,now);f.bankAt=now;}
const spendGold=(s,n)=>{require(integer(n,0,1e12),'INVALID_FISHING_COST');require(s.gold>=n,'INSUFFICIENT_GOLD');s.gold-=n;};
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
export function fishingDifficulty(species,rod,size){
 const powerNeed=Math.max(species.level,RARITIES[species.rarity].gate+Math.max(0,species.rarity-2)),advantage=clamp((rod-species.level)/18,0,1);
 const challenge=species.rarity+size*.9+Math.max(0,6-(rod-species.level))*.08-advantage*.8;
 return {powerNeed,rod,band:clamp(.125-challenge*.014,.035,.125),speed:.85+challenge*.18,drift:.014+challenge*.0016,tap:.072-species.rarity*.001+advantage*.006,strainLimit:36-species.rarity*3,required:.50+species.rarity*.035+size*.04,ticks:100+species.rarity*20+Math.round(size*20)};
}
export function fishingTarget(cast,tick){
 if(cast.protocol===3)return .5+Math.sin(tick*.055*cast.speed+cast.seed)*.20+Math.sin(tick*.11*cast.speed+cast.seed*2)*.065;
 return .5+Math.sin(tick*.047+cast.seed)*.19+Math.sin(tick*.103+cast.seed*2)*.09;
}
export function fishingStep(cast,input,meter){
 meter.tick++;
 const target=fishingTarget(cast,meter.tick);
 meter.cursor=clamp(meter.cursor+(cast.protocol===3?input*cast.tap-cast.drift:(input?1:-1)*.012),.02,.98);
 const inside=Math.abs(meter.cursor-target)<=cast.band;
 if(inside)meter.hits++;
 meter.strain=Math.max(0,meter.strain+(inside?-1.5:1));
 meter.progress=meter.hits/cast.ticks;
 meter.failed=meter.strain>=cast.strainLimit;
 meter.finished=meter.failed||meter.tick>=cast.ticks;
 return meter;
}
export const fishingMeter=()=>({tick:0,cursor:.5,hits:0,strain:0,progress:0,failed:false,finished:false});
// Base grade weights (2026-10-12: 에픽 1/2, 전설·신화 1/4 again).
export const FISH_GRADE_WEIGHTS=[1,.30,.09,.012,.00021875,.00003125];
function rollCatch(c,ctx){
 const spot=SPOTS.find(x=>x.id===c.spot)||SPOTS[0],bait=BAITS.find(x=>x.id===c.bait)||BAITS[0],rod=c.rod||1;
 const available=FISH.filter(x=>x.spot===spot.id&&x.level<=rod);
 // Higher-grade bait improves rarity weights but never bypasses rod gates.
 const weights=available.map(x=>FISH_GRADE_WEIGHTS[x.rarity]*baitGradeWeight(x,bait)*spotGradeWeight(x)*(1+.012*Math.max(0,rod-x.level)*x.rarity));
 let roll=ctx.random()*weights.reduce((n,x)=>n+x,0),index=weights.length-1;
 for(let i=0;i<weights.length;i++){roll-=weights[i];if(roll<0){index=i;break;}}
 const species=available[index],size=ctx.random()**1.65,weight=Math.round(species.min+(species.max-species.min)*size);
 let reward=REWARD_RATES.at(-1).id;roll=ctx.random();for(const r of REWARD_RATES){roll-=r.chance;if(roll<0){reward=r.id;break;}}
 return {species:species.id,weight,reward};
}
function landCatch(s,f,c,ctx){
 f.cast=null;
 if(!c.species)Object.assign(c,rollCatch(c,ctx));
 const reward=REWARD_RATES.some(r=>r.id===c.reward)?c.reward:'fish';
 const result={type:'fishCatch',at:ctx.now,won:true,species:c.species,weight:c.weight,reward};
 if(reward==='fish'){
  const item={id:ctx.uuid(),species:c.species,weight:c.weight,caughtAt:ctx.now};f.fish.push(item);
  f.collection[c.species]=Math.max(f.collection[c.species]||0,c.weight);f.daily.catch++;
  if(FISH.find(x=>x.id===c.species).rarity>=1)f.daily.rare++;
  result.fish=item;result.gold=fishPrice(item);
 }else if(reward==='diamondChest'){const diamonds=3+Math.floor(ctx.random()*6);f.diamonds+=diamonds;result.diamonds=diamonds;}
 else{s.materials[reward]=(s.materials[reward]||0)+1;result.amount=1;}
 f.lastCatch=result;return result;
}
export function fishingCommand(s,command,args,ctx){
 const f=normalizeFishing(s,ctx.now);settleAquarium(f,ctx.now);
 s.materials??={};
 if(command==='fishCast'){
  require(args.protocol===FISHING_PROTOCOL,'FISHING_REFRESH_REQUIRED');
  require(!f.cast,'FISHING_CAST_ACTIVE');require(f.fish.length<150,'FISHING_BAG_FULL');
  const spot=SPOTS.find(x=>x.id===args.spot),bait=BAITS.find(x=>x.id===args.bait);
  require(spot&&bait,'INVALID_FISHING_SPOT');require(f.rod>=spot.level&&f.rod>=bait.level,'FISHING_ROD_REQUIRED');
  require((f.bait[bait.id]||0)>0,'FISHING_BAIT_REQUIRED');
  // The catch is rolled on the server when the fish bites, so a visible cast reveals nothing to reroll.
  const biteAt=ctx.now+BITE_MIN_MS+Math.floor(ctx.random()*BITE_RANGE_MS);
  f.bait[bait.id]--;
  f.cast={protocol:FISHING_PROTOCOL,id:ctx.uuid(),spot:spot.id,bait:bait.id,rod:f.rod,seed:ctx.random()*Math.PI*2,started:ctx.now,biteAt,hookDeadline:biteAt+CAST_EXPIRE_MS,hookAt:null,expires:biteAt+CAST_EXPIRE_MS};
  return {type:'fishCast',castId:f.cast.id};
 }
 if(command==='fishCancel'){require(!f.cast||f.cast.id===args.id,'FISHING_CAST_MISSING');f.cast=null;return {type:'fishCancel'};}
 // Every bite is landed immediately; there is no reeling challenge or failure.
 if(command==='fishHook'||command==='fishFinish'){
  const c=f.cast;require(c&&c.id===args.id,'FISHING_CAST_MISSING');
  require(ctx.now>=c.biteAt,'FISHING_TOO_EARLY');
  return landCatch(s,f,c,ctx);
 }
 if(command==='fishBaitBuy'){
  const bait=BAITS.find(x=>x.id===args.bait);require(bait&&integer(args.count,1,100),'INVALID_FISHING_BAIT');
  const currency=bait.gold?'gold':'diamonds';require(args.currency===currency,'FISHING_REFRESH_REQUIRED');
  require(args.count%bait.pack===0,'INVALID_FISHING_BAIT');
  require(f.rod>=bait.level,'FISHING_ROD_REQUIRED');require((f.bait[bait.id]||0)+args.count<=10000,'FISHING_BAIT_LIMIT');
  const cost=bait.gold?bait.gold*(args.count/bait.pack):baitDiamondCost(bait,args.count);
  if(currency==='gold')spendGold(s,cost);else{require(f.diamonds>=cost,'FISHING_DIAMONDS_REQUIRED');f.diamonds-=cost;}
  f.bait[bait.id]=(f.bait[bait.id]||0)+args.count;return {type:'fishBaitBuy',count:args.count,[currency]:cost,currency};
 }
 if(command==='fishTrain'){
  require(f.rod<50,'FISHING_MAX_LEVEL');const cost=rodGoldCost(f.rod);
  require(f.xp<cost,'FISHING_XP_FULL');require(integer(args.gold,1,cost-f.xp),'INVALID_FISHING_COST');spendGold(s,args.gold);f.xp+=args.gold;return {type:'fishTrain'};
 }
 if(command==='fishUpgrade'){
  require(f.rod<50,'FISHING_MAX_LEVEL');require(f.xp>=rodGoldCost(f.rod),'FISHING_XP_REQUIRED');const cost=rodDiamondCost(f.rod);
  require(f.diamonds>=cost,'FISHING_DIAMONDS_REQUIRED');f.diamonds-=cost;f.rod++;f.xp=0;return {type:'fishUpgrade',level:f.rod};
 }
 if(command==='fishSell'){
  require(Array.isArray(args.ids)&&args.ids.length>0&&args.ids.length<=150&&new Set(args.ids).size===args.ids.length,'INVALID_FISHING_ITEMS');
  const fish=args.ids.map(id=>f.fish.find(x=>x.id===id));require(fish.every(Boolean),'FISHING_FISH_MISSING');
  const gold=fish.reduce((n,x)=>n+fishPrice(x),0);s.gold+=gold;f.fish=f.fish.filter(x=>!args.ids.includes(x.id));f.daily.sell+=fish.length;
  return {type:'fishSell',gold,count:fish.length};
 }
 if(command==='fishAquariumAdd'||command==='fishAquariumRemove'){
  const add=command==='fishAquariumAdd',from=add?f.fish:f.aquarium,to=add?f.aquarium:f.fish,index=from.findIndex(x=>x.id===args.id);
  require(index>=0,'FISHING_FISH_MISSING');require(add?to.length<f.slots:to.length<150,add?'FISHING_AQUARIUM_FULL':'FISHING_BAG_FULL');
  to.push(from.splice(index,1)[0]);return {type:command};
 }
 if(command==='fishAquariumAuto'){
  // 최적 배치: the aquarium keeps the highest gold-per-hour fish from aquarium + bag (ties: stable by id).
  const yieldOf=x=>fishYield(x),all=[...f.aquarium,...f.fish].sort((a,b)=>yieldOf(b)-yieldOf(a)||(a.id<b.id?-1:1));
  const best=all.slice(0,f.slots),keep=new Set(best.map(x=>x.id)),inTank=new Set(f.aquarium.map(x=>x.id));
  const moved=best.filter(x=>!inTank.has(x.id)).length;require(moved>0,'FISHING_AQUARIUM_OPTIMAL');
  const before=f.aquarium.reduce((n,x)=>n+yieldOf(x),0),bag=[...f.fish.filter(x=>!keep.has(x.id)),...f.aquarium.filter(x=>!keep.has(x.id))];
  require(bag.length<=150,'FISHING_BAG_FULL');
  f.aquarium=best;f.fish=bag;
  return {type:'fishAquariumAuto',moved,before,after:best.reduce((n,x)=>n+yieldOf(x),0)};
 }
 if(command==='fishAquariumClaim'){const gold=Math.floor(f.bank);require(gold>0,'FISHING_NO_INCOME');f.bank-=gold;s.gold+=gold;return {type:'fishAquariumClaim',gold};}
 if(command==='fishAquariumExpand'){require(f.slots<10,'FISHING_MAX_SLOTS');const cost=aquariumExpandCost(f.slots);spendGold(s,cost);f.slots++;return {type:'fishAquariumExpand',slots:f.slots};}
 if(command==='fishQuestClaim'){
  const q=FISHING_QUESTS.find(x=>x.id===args.id);require(q,'INVALID_FISHING_QUEST');
  require(!f.daily.claimed.includes(q.id),'FISHING_QUEST_CLAIMED');require(f.daily[q.id]>=q.goal,'FISHING_QUEST_REQUIRED');
  f.daily.claimed.push(q.id);f.diamonds+=q.diamonds;return {type:'fishQuestClaim',diamonds:q.diamonds};
 }
 throw Error('UNKNOWN_FISHING_COMMAND');
}
