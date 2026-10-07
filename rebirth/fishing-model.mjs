import {FISH,SPOTS,BAITS,FISHING_QUESTS,REWARD_RATES,fishPrice,fishYield,rodGoldCost,rodDiamondCost} from './fishing-data.mjs';
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
export function fishingTarget(cast,tick){return .5+Math.sin(tick*.047+cast.seed)*.19+Math.sin(tick*.103+cast.seed*2)*.09;}
export function fishingStep(cast,input,meter){
 meter.tick++;
 const target=fishingTarget(cast,meter.tick);
 meter.cursor=Math.min(.98,Math.max(.02,meter.cursor+(input?1:-1)*.012));
 const inside=Math.abs(meter.cursor-target)<=cast.band;
 if(inside)meter.hits++;
 meter.strain=Math.max(0,meter.strain+(inside?-1.5:1));
 meter.progress=meter.hits/cast.ticks;
 meter.failed=meter.strain>=cast.strainLimit;
 meter.finished=meter.failed||meter.tick>=cast.ticks;
 return meter;
}
export const fishingMeter=()=>({tick:0,cursor:.5,hits:0,strain:0,progress:0,failed:false,finished:false});
export function fishingCommand(s,command,args,ctx){
 const f=normalizeFishing(s,ctx.now);settleAquarium(f,ctx.now);
 s.materials??={};
 if(command==='fishCast'){
  require(!f.cast,'FISHING_CAST_ACTIVE');require(f.fish.length<150,'FISHING_BAG_FULL');
  const spot=SPOTS.find(x=>x.id===args.spot),bait=BAITS.find(x=>x.id===args.bait);
  require(spot&&bait,'INVALID_FISHING_SPOT');require(f.rod>=spot.level&&f.rod>=bait.level,'FISHING_ROD_REQUIRED');
  require((f.bait[bait.id]||0)>0,'FISHING_BAIT_REQUIRED');
  const available=FISH.filter(x=>x.spot===spot.id&&x.level<=f.rod);
  // Higher-grade bait improves rarity weights but never bypasses rod gates.
  const weights=available.map(x=>[1,.30,.09,.024,.0035,.0005][x.rarity]*(1+bait.luck*x.rarity)*(1+.012*Math.max(0,f.rod-x.level)*x.rarity));
  let roll=ctx.random()*weights.reduce((n,x)=>n+x,0),index=weights.length-1;
  for(let i=0;i<weights.length;i++){roll-=weights[i];if(roll<0){index=i;break;}}
  const species=available[index],size=ctx.random()**1.65,weight=Math.round(species.min+(species.max-species.min)*size);
  let reward=REWARD_RATES.at(-1).id;roll=ctx.random();for(const r of REWARD_RATES){roll-=r.chance;if(roll<0){reward=r.id;break;}}
  const biteAt=ctx.now+2000+Math.floor(ctx.random()*2000);
  f.bait[bait.id]--;
  f.cast={id:ctx.uuid(),spot:spot.id,bait:bait.id,species:species.id,weight,reward,seed:ctx.random()*Math.PI*2,started:ctx.now,biteAt,expires:biteAt+60000,ticks:80+species.rarity*24+Math.round(size*30),band:Math.max(.055,.21-species.rarity*.023-size*.035),strainLimit:42-species.rarity*3,required:.45+species.rarity*.055+size*.06};
  return {type:'fishCast',castId:f.cast.id};
 }
 if(command==='fishCancel'){require(f.cast&&f.cast.id===args.id,'FISHING_CAST_MISSING');f.cast=null;return {type:'fishCancel'};}
 if(command==='fishFinish'){
  const c=f.cast;require(c&&c.id===args.id,'FISHING_CAST_MISSING');
  require(Array.isArray(args.frames)&&args.frames.length>0&&args.frames.length<=c.ticks&&args.frames.every(x=>x===0||x===1),'INVALID_FISHING_INPUT');
  require(args.frames.length<=Math.floor((ctx.now-c.biteAt)/100),'FISHING_TOO_EARLY');
  const meter=fishingMeter();for(const input of args.frames){require(!meter.finished,'INVALID_FISHING_INPUT');fishingStep(c,input,meter);}
  require(meter.finished,'FISHING_NOT_FINISHED');f.cast=null;
  const won=!meter.failed&&meter.hits/c.ticks>=c.required;
  const result={type:'fishCatch',won,species:c.species,weight:c.weight,reward:won?c.reward:null};
  if(won){
   if(c.reward==='fish'){
    const item={id:ctx.uuid(),species:c.species,weight:c.weight,caughtAt:ctx.now};f.fish.push(item);
    f.collection[c.species]=Math.max(f.collection[c.species]||0,c.weight);f.daily.catch++;
    if(FISH.find(x=>x.id===c.species).rarity>=1)f.daily.rare++;
    result.fish=item;
   }else if(c.reward==='diamondChest'){const diamonds=3+Math.floor(ctx.random()*6);f.diamonds+=diamonds;result.diamonds=diamonds;}
   else{s.materials[c.reward]=(s.materials[c.reward]||0)+1;result.amount=1;}
  }
  f.lastCatch=result;return result;
 }
 if(command==='fishBaitBuy'){
  const bait=BAITS.find(x=>x.id===args.bait);require(bait&&integer(args.count,1,100),'INVALID_FISHING_BAIT');
  require(f.rod>=bait.level,'FISHING_ROD_REQUIRED');require((f.bait[bait.id]||0)+args.count<=10000,'FISHING_BAIT_LIMIT');
  spendGold(s,bait.cost*args.count);f.bait[bait.id]=(f.bait[bait.id]||0)+args.count;return {type:'fishBaitBuy',count:args.count};
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
 if(command==='fishAquariumClaim'){const gold=Math.floor(f.bank);require(gold>0,'FISHING_NO_INCOME');f.bank-=gold;s.gold+=gold;return {type:'fishAquariumClaim',gold};}
 if(command==='fishAquariumExpand'){require(f.slots<10,'FISHING_MAX_SLOTS');const cost=100000*3**(f.slots-3);spendGold(s,cost);f.slots++;return {type:'fishAquariumExpand',slots:f.slots};}
 if(command==='fishQuestClaim'){
  const q=FISHING_QUESTS.find(x=>x.id===args.id);require(q,'INVALID_FISHING_QUEST');
  require(!f.daily.claimed.includes(q.id),'FISHING_QUEST_CLAIMED');require(f.daily[q.id]>=q.goal,'FISHING_QUEST_REQUIRED');
  f.daily.claimed.push(q.id);f.diamonds+=q.diamonds;return {type:'fishQuestClaim',diamonds:q.diamonds};
 }
 throw Error('UNKNOWN_FISHING_COMMAND');
}
