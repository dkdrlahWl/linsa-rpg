import {professionGather,gatherAmount} from './profession-model.mjs';
import {FISHING_VERSION,legacyRodGoldCost,legacyRodDiamondCost,legacyAquariumExpandCost,legacyFishPrice,LEGACY_BAIT_DIAMONDS,FISH_SIZES,MUTATIONS,fishSizeOf,fishSizeWeight,rollFishSize,rollMutation,ROD_ENHANCE,ROD_ENHANCE_MAX,ENHANCE_TOKEN_BONUS,ENHANCE_RARE_BONUS,enchantSlotCount,ENCHANT_TIERS,ENCHANTS,enchantCost,fishingEnchant,FUSE_COUNT,FUSE_CHANCE,FUSE_JACKPOT,FUSE_MUT_BOOST,GOLD_FUSE_COUNT,GOLD_FUSE_CHANCE,AWAKEN_MAX,FISHING_AUTO_PLANS,fishBagSize,fishingDailyCasts,FISHING_DAILY_CASTS,ROD_MAX,FISH,SPOTS,RARITIES,BAITS,FISHING_QUESTS,REWARD_RATES,fishPrice,fishYield,rodGoldCost,rodDiamondCost,baitDiamondCost,aquariumExpandCost,baitGradeWeight,spotGradeWeight,BITE_MIN_MS,BITE_RANGE_MS,FISHER_BITE_MIN_MS,FISHER_BITE_RANGE_MS,CAST_EXPIRE_MS,DIAMOND_EXCHANGE,DIAMOND_EXCHANGE_DAILY,CONTEST_REWARDS,CONTEST_CLAIM_WEEKS,CONTEST_START,CONTEST_CLOSED,contestWeek,contestWeekEnd,contestTarget} from './fishing-data.mjs';
import {treasureTicketDrop} from './treasure-model.mjs';
export const FISHING_PROTOCOL=5; // v3 낚시 개편
const require=(ok,msg)=>{if(!ok)throw Error(msg);};
const integer=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const koreanDay=now=>new Date(now+9*3600000).toISOString().slice(0,10);
const freshV3=now=>({rod:1,xp:0,bait:{worm:20},fish:[],aquarium:[],slots:3,bank:0,bankAt:now,cast:null,lastCatch:null,tokens:0,enhance:0,enchants:[]});
// 2026-11-05 도현: 낚시 v3 초기화 — 낚싯대·수족관 칸·미끼에 쓴 골드·다이아, 가방·수족관 물고기 판매가, 쌓인 수족관 골드를
// 예전 가격으로 계산해 운영자 우편(골드·다이아)으로 돌려주고 0부터 시작. 도감·대어 대회 기록·누적 낚은 수는 유지.
export function fishingV3Refund(f,now){
 const rod=Math.max(1,Math.min(70,Number(f.rod)||1));let gold=Math.max(0,Math.floor(Number(f.xp)||0)),diamonds=0;
 for(let L=1;L<rod;L++){gold+=legacyRodGoldCost(L);diamonds+=legacyRodDiamondCost(L);}
 for(let k=3;k<Math.min(10,Number(f.slots)||3);k++)gold+=legacyAquariumExpandCost(k);
 const fish=[...(Array.isArray(f.fish)?f.fish:[]),...(Array.isArray(f.aquarium)?f.aquarium:[])];
 for(const x of fish)gold+=legacyFishPrice(x);
 const hours=Math.min(12,Math.max(0,now-(Number(f.bankAt)||now))/3600000);
 const legacyYield=x=>{const d=FISH.find(y=>y.id===x.species);return d?Math.max(1,Math.round(legacyFishPrice(x)*AQUARIUM_RATE_V2[d.rarity]*(SPOTS.find(y=>y.id===d.spot).tank||1))):0;};
 gold+=Math.floor(Math.min(1e9,(Number(f.bank)||0)+(Array.isArray(f.aquarium)?f.aquarium:[]).reduce((n,x)=>n+legacyYield(x),0)*hours));
 const bait=f.bait||{};gold+=Math.max(0,Math.floor(Number(bait.worm)||0))*100;
 let dia=0;for(const [k,v] of Object.entries(LEGACY_BAIT_DIAMONDS))dia+=Math.max(0,Number(bait[k])||0)*v;diamonds+=Math.round(dia);
 return {gold,diamonds,fish:fish.length,rod};
}
const AQUARIUM_RATE_V2=[.9375,.65,.4625,.29375,.155,.16875,.1];
export function normalizeFishing(s,now){
 s.fishing??={version:FISHING_VERSION,rod:1,xp:0,diamonds:0,bait:{worm:20},fish:[],aquarium:[],slots:3,bank:0,bankAt:now,collection:{},daily:{},cast:null,lastCatch:null,tokens:0,enhance:0,enchants:[]};
 const f=s.fishing;
 if((f.version||1)<FISHING_VERSION){
  const r=fishingV3Refund(f,now);Object.assign(f,freshV3(now),{version:FISHING_VERSION});
  if(r.gold>0||r.diamonds>0){
   const m={id:'fishing-v3-refund',kind:'trade',sender:'운영자',title:'낚시 개편 환불',message:`낚시가 새로 바뀌어 처음부터 시작해요. 낚싯대 Lv.${r.rod}·수족관·물고기 ${r.fish}마리·미끼 값을 돌려드려요.`,rewards:{...(r.gold>0?{gold:r.gold}:{}),...(r.diamonds>0?{diamond:r.diamonds}:{})},items:[],sentAt:new Date(now).toISOString()};
   s.rewardMailbox=[...(Array.isArray(s.rewardMailbox)?s.rewardMailbox:[]).filter(x=>x?.id!==m.id),m];s.systemMailbox=[...(Array.isArray(s.systemMailbox)?s.systemMailbox:[]).filter(x=>x?.id!==m.id),m];
  }
  f.v3Refund={gold:r.gold,diamonds:r.diamonds,at:now};
 }
 f.tokens=Number.isSafeInteger(f.tokens)&&f.tokens>=0?f.tokens:0;f.enhance=Number.isInteger(f.enhance)?Math.max(0,Math.min(ROD_ENHANCE_MAX,f.enhance)):0;f.enchants=Array.isArray(f.enchants)?f.enchants.slice(0,3):[];
 f.collection??={};f.daily??={};f.bait??={worm:0};
 if(f.daily.day!==koreanDay(now))f.daily={day:koreanDay(now),catch:0,rare:0,sell:0,exchanged:0,claimed:[]};
 if(f.cast&&now>f.cast.expires)f.cast=null;
 return f;
}
export const aquariumHourly=f=>f.aquarium.reduce((n,x)=>n+fishYield(x,fishingEnchant(f,'tank')),0);
export function aquariumBank(f,now){const hours=Math.min(12,Math.max(0,now-f.bankAt)/3600000);return Math.min(1e9,f.bank+aquariumHourly(f)*hours);}
function settleAquarium(f,now){f.bank=aquariumBank(f,now);f.bankAt=now;}
const spendGold=(s,n)=>{require(integer(n,0,1e12),'INVALID_FISHING_COST');require(s.gold>=n,'INSUFFICIENT_GOLD');s.gold-=n;};
const spendTokens=(f,n)=>{require(integer(n,0,1e12),'INVALID_FISHING_COST');require((f.tokens||0)>=n,'FISHING_TOKENS_REQUIRED');f.tokens-=n;};
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
// ── v3 손맛 낚시 ──
// 낚싯대 힘 = 레벨 + 강화×2. 물고기가 요구하는 힘 = 낚시터 레벨 + 등급×4 + 크기 단계×3.
// 힘이 모자랄수록 막대가 좁고 빠르고 줄이 쉽게 끊어진다. 15 넘게 모자라면 바로 끊어진다.
export const rodPower=f=>Math.max(1,f?.rod||1)+2*(f?.enhance||0);
export function fishNeed(fish){const d=FISH.find(x=>x.id===fish.species),spot=SPOTS.find(x=>x.id===d.spot),size=Math.max(0,FISH_SIZES.findIndex(x=>x.id===fishSizeOf(fish).id));return spot.level+d.rarity*4+size*3;}
export const FISHING_SNAP_DEFICIT=15,FISHING_TICK_MS=50;
export function fishingDifficulty(fish,power){
 const d=FISH.find(x=>x.id===fish.species),size=Math.max(0,FISH_SIZES.findIndex(x=>x.id===fishSizeOf(fish).id)),deficit=fishNeed(fish)-power;
 const over=Math.max(0,deficit),spare=Math.min(10,Math.max(0,-deficit)),ch=Math.max(0,d.rarity*.5+size*.42+over*.38-spare*.06);
 return {need:fishNeed(fish),power,deficit,snap:deficit>FISHING_SNAP_DEFICIT,species:d.id,rarity:d.rarity,size:fishSizeOf(fish).id,
  band:clamp(.15-ch*.012,.05,.15),speed:clamp(.8+ch*.11,.8,1.6),drift:.011+ch*.0006,tap:.05,
  strainLimit:Math.round(clamp(46-d.rarity*2-size*1.5-over*2.2,8,46)),required:clamp(.45+d.rarity*.025+size*.02,.45,.72),ticks:80+d.rarity*16+size*12};
}
// 오토(자동 낚시권): 손맛 없이 낚싯대 힘만으로 판정 — 충분하면 95%, 1 모자랄 때마다 -8%.
export const autoCatchChance=dif=>dif.snap?0:clamp(.9-Math.max(0,dif.deficit)*.08,0,.9);
export function fishingTarget(cast,tick){
 const sp=cast.challenge?.speed||1,seed=cast.seed||0;
 return clamp(.5+Math.sin(tick*.035*sp+seed)*.25+Math.sin(tick*.09*sp+seed*2)*.09+Math.sin(tick*.23*sp+seed*3)*.02*sp,.04,.96);
}
export function fishingStep(cast,input,meter){
 const c=cast.challenge;meter.tick++;
 const target=fishingTarget(cast,meter.tick);
 // v3 클릭 낚시: input = 이 틱(50ms)에 누른 횟수(0~3). 한 번 누를 때마다 오른쪽으로, 가만히 두면 왼쪽으로 밀린다.
 meter.cursor=clamp(meter.cursor+Math.min(3,Math.max(0,Number(input)||0))*c.tap-c.drift,.02,.98);
 const inside=Math.abs(meter.cursor-target)<=c.band;
 if(inside)meter.hits++;
 // 처음 1초(20틱)는 장력이 오르지 않는다 — 막대를 물고기 쪽으로 옮길 시간.
 meter.strain=Math.max(0,meter.strain+(inside?-1.5:meter.tick<=20?0:1));
 meter.progress=meter.hits/c.ticks;
 meter.failed=meter.strain>=c.strainLimit;
 meter.finished=meter.failed||meter.tick>=c.ticks;
 meter.target=target;meter.inside=inside;
 return meter;
}
export const fishingMeterWon=(cast,m)=>!m.failed&&m.tick>=cast.challenge.ticks&&m.hits/cast.challenge.ticks>=cast.challenge.required;
export const fishingMeter=()=>({tick:0,cursor:.5,hits:0,strain:0,progress:0,failed:false,finished:false,target:.5,inside:true});
// Base grade weights per grade (2026-10-12).
// 2026-10-25: 전설·신화 확률 절반, 태고 3배.
export const FISH_GRADE_WEIGHTS=[1,.30,.09,.006,.000585,.000189,.000018];
// v3 낚시 판정. 낚싯대 레벨·강화·인챈트·낚시터 특기·미끼가 모두 여기서 합쳐진다.
export function fishingBonuses(s,f,spot,bait){
 const sp=spot?.special||{},rod=Math.max(1,f?.rod||1),star=f?.enhance||0;
 return {
  rare:(sp.rare||1)*(1+ENHANCE_RARE_BONUS*star)*(1+fishingEnchant(f,'rare')),
  legend:bait?.legend||1,
  big:(sp.big||1)*(bait?.big||1)*(1+fishingEnchant(f,'big'))*professionGather(s,'bigFish'),
  chest:(sp.chest||1)*(bait?.chest||1)*(1+fishingEnchant(f,'chest')),
  key:(sp.key||1)*(bait?.key||1)*(1+fishingEnchant(f,'key'))*professionGather(s,'dungeonKey'),
  double:(sp.double||0)+(bait?.double||0)+fishingEnchant(f,'double'),
  mut:(sp.mut||1)*(bait?.mut||1),
  bite:(sp.bite||1)*(1-.005*(rod-1))*(1-fishingEnchant(f,'bite')),
  token:1+ENHANCE_TOKEN_BONUS*star+fishingEnchant(f,'token'),
  rodRare:r=>1+.009*(rod-1)*r,
 };
}
function rollSpecies(spot,bait,b,ctx){
 const available=FISH.filter(x=>x.spot===spot.id);
 const perGrade={};for(const x of available)perGrade[x.rarity]=(perGrade[x.rarity]||0)+1;
 const weights=available.map(x=>FISH_GRADE_WEIGHTS[x.rarity]*baitGradeWeight(x,bait)*spotGradeWeight(x)*b.rodRare(x.rarity)*(x.rarity>=1?b.rare:1)*(x.rarity>=4?b.legend:1)/perGrade[x.rarity]);
 let roll=ctx.random()*weights.reduce((n,x)=>n+x,0),index=weights.length-1;
 for(let i=0;i<weights.length;i++){roll-=weights[i];if(roll<0){index=i;break;}}
 return available[index];
}
function rollFish(spot,bait,b,ctx){
 const d=rollSpecies(spot,bait,b,ctx),size=rollFishSize(ctx.random,b.big),mut=rollMutation(ctx.random,b.mut);
 return {species:d.id,weight:fishSizeWeight(d,size,ctx.random()),size:size.id,...(mut?{mut:mut.id}:{})};
}
function rollCatch(c,ctx,s=null){
 const spot=SPOTS.find(x=>x.id===c.spot)||SPOTS[0],bait=BAITS.find(x=>x.id===c.bait)||BAITS[0],b=fishingBonuses(s,s?.fishing,spot,bait);
 const first=rollFish(spot,bait,b,ctx);
 // 희귀 보상부터 판정하고 남는 확률은 물고기.
 let reward='fish',roll=ctx.random();for(const r of [...REWARD_RATES].reverse()){if(r.id==='fish')continue;roll-=r.chance*(r.id==='dungeonKey'?b.key:r.id==='diamondChest'?b.chest:1);if(roll<0){reward=r.id;break;}}
 const extra=reward==='fish'&&b.double>0&&ctx.random()<b.double?rollFish(spot,bait,b,ctx):null;
 return {...first,reward,...(extra?{extra}:{})};
}
// 주간 대어 대회: 이번 주 대상 물고기 중 가장 무거운 한 마리만 남긴다 (최근 몇 주만 보관).
function recordContest(f,item){
 if(CONTEST_CLOSED)return;
 const week=contestWeek(item.caughtAt);if(week<CONTEST_START||contestTarget(week).species!==item.species)return;
 f.contest??={};const best=f.contest[week];
 if(!best||item.weight>best.weight)f.contest[week]={species:item.species,weight:item.weight,at:item.caughtAt};
 const keep=new Set(Array.from({length:CONTEST_CLAIM_WEEKS+1},(_,i)=>contestWeek(item.caughtAt-i*604800000)));
 for(const key of Object.keys(f.contest))if(!keep.has(key))delete f.contest[key];
}
function addCaughtFish(s,f,c,fish,ctx){
 const item={id:ctx.uuid(),species:fish.species,weight:fish.weight,size:fish.size,...(fish.mut?{mut:fish.mut}:{}),caughtAt:ctx.now};f.fish.push(item);
 f.collection[item.species]=Math.max(f.collection[item.species]||0,item.weight);f.daily.catch=(f.daily.catch||0)+1;f.totalCatch=(f.totalCatch||0)+1;
 if(FISH.find(x=>x.id===item.species).rarity>=1)f.daily.rare=(f.daily.rare||0)+1;
 recordContest(f,item);return item;
}
function landCatch(s,f,c,ctx){
 f.cast=null;
 if(!c.species)Object.assign(c,rollCatch(c,ctx,s));
 const reward=REWARD_RATES.some(r=>r.id===c.reward)?c.reward:'fish';
 const result={type:'fishCatch',at:ctx.now,won:true,species:c.species,weight:c.weight,size:c.size,mut:c.mut,reward};
 if(reward==='fish'){
  const item=addCaughtFish(s,f,c,c,ctx);result.fish=item;result.tokens=fishPrice(item);
  // 두 마리 동시 낚기: 가방에 자리가 있을 때만.
  if(c.extra&&f.fish.length<fishBagSize(s)&&c.extraOk!==false){const extra=addCaughtFish(s,f,c,c.extra,ctx);result.extra=extra;}
 }else if(reward==='diamondChest'){const diamonds=gatherAmount(s,'diamond',3+Math.floor(ctx.random()*6),ctx.random);f.diamonds+=diamonds;result.diamonds=diamonds;}
 else{s.materials[reward]=(s.materials[reward]||0)+1;result.amount=1;}
 const spot=SPOTS.find(x=>x.id===c.spot),tickets=spot?.special?.ticket||1;
 for(let i=0;i<tickets;i++)if(treasureTicketDrop(s,ctx.now,ctx.random)){result.treasureTicket=(result.treasureTicket||0)+1;}
 f.lastCatch=result;return result;
}
function escapeCatch(f,c,ctx,reason){
 f.cast=null;const result={type:'fishCatch',at:ctx.now,won:false,reason,species:c.species,size:c.size,mut:c.mut,reward:'fish'};f.lastCatch=result;return result;
}
const sameFish=(a,b)=>a.species===b.species&&fishSizeOf(a).id===fishSizeOf(b).id;
export function fishingCommand(s,command,args,ctx){
 const f=normalizeFishing(s,ctx.now);settleAquarium(f,ctx.now);
 s.materials??={};
 if(command==='fishCast'){
  require(args.protocol===FISHING_PROTOCOL,'FISHING_REFRESH_REQUIRED');
  require(!f.cast,'FISHING_CAST_ACTIVE');require(f.fish.length<fishBagSize(s),'FISHING_BAG_FULL');
  require((f.daily.casts||0)<fishingDailyCasts(s),'FISHING_DAILY_LIMIT');
  const spot=SPOTS.find(x=>x.id===args.spot),bait=BAITS.find(x=>x.id===args.bait);
  require(spot&&bait,'INVALID_FISHING_SPOT');require(f.rod>=spot.level&&f.rod>=bait.level,'FISHING_ROD_REQUIRED');
  const bonus=fishingBonuses(s,f,spot,bait);
  require((f.bait[bait.id]||0)>0,'FISHING_BAIT_REQUIRED');
  // The catch is rolled on the server when the fish bites, so a visible cast reveals nothing to reroll.
  // 2026-11-04 도현: 어부는 입질 3~5초 (일반 5~9초)
  // v3: 낚싯대 레벨(-0.5%/Lv) · 숲속 여울(×0.5) · 입질 인챈트로 입질이 빨라진다 (최소 1초).
  const fisher=s.profession?.id==='fisher',biteAt=ctx.now+Math.max(1000,Math.round(((fisher?FISHER_BITE_MIN_MS:BITE_MIN_MS)+Math.floor(ctx.random()*(fisher?FISHER_BITE_RANGE_MS:BITE_RANGE_MS)))*bonus.bite));
  f.bait[bait.id]--;f.daily.casts=(f.daily.casts||0)+1;
  f.cast={protocol:FISHING_PROTOCOL,id:ctx.uuid(),spot:spot.id,bait:bait.id,rod:f.rod,seed:ctx.random()*Math.PI*2,started:ctx.now,biteAt,hookDeadline:biteAt+CAST_EXPIRE_MS,hookAt:null,expires:biteAt+CAST_EXPIRE_MS};
  return {type:'fishCast',castId:f.cast.id};
 }
 if(command==='fishCancel'){require(!f.cast||f.cast.id===args.id,'FISHING_CAST_MISSING');f.cast=null;return {type:'fishCancel'};}
 // Every bite is landed immediately; there is no reeling challenge or failure.
 // v3: 입질 → 챔질(fishHook). 상자·열쇠는 바로 받고, 물고기는 손맛 낚시(fishFinish) 또는 자동 낚시권(auto)으로 판정.
 if(command==='fishHook'){
  const c=f.cast;require(c&&c.id===args.id,'FISHING_CAST_MISSING');
  require(ctx.now>=c.biteAt,'FISHING_TOO_EARLY');
  if(!c.species)Object.assign(c,rollCatch(c,ctx,s));
  if(c.reward!=='fish')return landCatch(s,f,c,ctx);
  const dif=fishingDifficulty(c,rodPower(f));
  if(args.auto){
   require((f.autoUntil||0)>ctx.now,'FISHING_AUTO_REQUIRED');
   if(ctx.random()<autoCatchChance(dif))return landCatch(s,f,c,ctx);
   return escapeCatch(f,c,ctx,dif.snap?'snap':'escape');
  }
  if(dif.snap)return escapeCatch(f,c,ctx,'snap');
  require(!c.hookAt,'FISHING_ALREADY_HOOKED');
  c.hookAt=ctx.now;c.challenge=dif;c.reelDeadline=ctx.now+dif.ticks*FISHING_TICK_MS+20000;
  return {type:'fishBite',castId:c.id,challenge:dif,seed:c.seed};
 }
 if(command==='fishFinish'){
  const c=f.cast;require(c&&c.id===args.id,'FISHING_CAST_MISSING');require(c.hookAt&&c.challenge,'FISHING_HOOK_REQUIRED');
  if(ctx.now>c.reelDeadline)return escapeCatch(f,c,ctx,'timeout');
  const inputs=args.inputs;require(typeof inputs==='string'&&/^[0-3]*$/.test(inputs)&&inputs.length<=c.challenge.ticks,'INVALID_FISHING_INPUT');
  // 서버가 같은 규칙으로 다시 계산해서 판정 (조작 방지). 입력이 짧으면 남은 칸은 손을 뗀 것으로 본다.
  const m=fishingMeter();for(let i=0;i<c.challenge.ticks&&!m.finished;i++)fishingStep(c,Number(inputs[i]||0),m);
  if(fishingMeterWon(c,m))return landCatch(s,f,c,ctx);
  return escapeCatch(f,c,ctx,m.failed?'snap':'escape');
 }
 // 자동 낚시권 (골드): 남은 시간에 더한다.
 if(command==='fishAutoBuy'){
  const plan=FISHING_AUTO_PLANS.find(x=>x.id===args.plan);require(plan,'INVALID_FISHING_AUTO');spendGold(s,plan.gold);
  f.autoUntil=Math.max(f.autoUntil||0,ctx.now)+plan.hours*3600000;return {type:'fishAutoBuy',plan:plan.id,until:f.autoUntil,gold:plan.gold};
 }
 if(command==='fishBaitBuy'){
  const bait=BAITS.find(x=>x.id===args.bait);require(bait&&integer(args.count,1,10000),'INVALID_FISHING_BAIT');
  const currency=bait.gold?'gold':'tokens';require(args.currency===currency,'FISHING_REFRESH_REQUIRED');
  require(args.count%bait.pack===0,'INVALID_FISHING_BAIT');
  require(f.rod>=bait.level,'FISHING_ROD_REQUIRED');require((f.bait[bait.id]||0)+args.count<=10000,'FISHING_BAIT_LIMIT');
  const cost=(bait.gold||bait.tokens)*(args.count/bait.pack);
  if(currency==='gold')spendGold(s,cost);else spendTokens(f,cost);
  f.bait[bait.id]=(f.bait[bait.id]||0)+args.count;return {type:'fishBaitBuy',count:args.count,[currency]:cost,currency};
 }
 if(command==='fishTrain'){
  require(f.rod<ROD_MAX,'FISHING_MAX_LEVEL');const cost=rodGoldCost(f.rod);
  require(f.xp<cost,'FISHING_XP_FULL');require(integer(args.gold,1,cost-f.xp),'INVALID_FISHING_COST');spendGold(s,args.gold);f.xp+=args.gold;return {type:'fishTrain'};
 }
 if(command==='fishUpgrade'){
  require(f.rod<ROD_MAX,'FISHING_MAX_LEVEL');require(f.xp>=rodGoldCost(f.rod),'FISHING_XP_REQUIRED');const cost=rodDiamondCost(f.rod);
  require(f.diamonds>=cost,'FISHING_DIAMONDS_REQUIRED');f.diamonds-=cost;f.rod++;f.xp=0;return {type:'fishUpgrade',level:f.rod};
 }
 if(command==='fishSell'){
  require(Array.isArray(args.ids)&&args.ids.length>0&&args.ids.length<=Math.max(fishBagSize(s),f.fish.length)&&new Set(args.ids).size===args.ids.length,'INVALID_FISHING_ITEMS');
  const fish=args.ids.map(id=>f.fish.find(x=>x.id===id));require(fish.every(Boolean),'FISHING_FISH_MISSING');
  // v3: 판매하면 골드 대신 낚시 토큰 (강화 +5%/단계 · 판매 토큰 인챈트).
  const tokens=Math.round(fish.reduce((n,x)=>n+fishPrice(x),0)*fishingBonuses(s,f,null,null).token);f.tokens=Math.min(9e12,f.tokens+tokens);f.fish=f.fish.filter(x=>!args.ids.includes(x.id));f.daily.sell=(f.daily.sell||0)+fish.length;
  return {type:'fishSell',tokens,count:fish.length};
 }
 if(command==='fishAquariumAdd'||command==='fishAquariumRemove'){
  const add=command==='fishAquariumAdd',from=add?f.fish:f.aquarium,to=add?f.aquarium:f.fish,index=from.findIndex(x=>x.id===args.id);
  require(index>=0,'FISHING_FISH_MISSING');require(add?to.length<f.slots:to.length<fishBagSize(s),add?'FISHING_AQUARIUM_FULL':'FISHING_BAG_FULL');
  to.push(from.splice(index,1)[0]);return {type:command};
 }
 if(command==='fishAquariumAuto'){
  // 최적 배치: the aquarium keeps the highest gold-per-hour fish from aquarium + bag (ties: stable by id).
  const yieldOf=x=>fishYield(x),all=[...f.aquarium,...f.fish].sort((a,b)=>yieldOf(b)-yieldOf(a)||(a.id<b.id?-1:1));
  const best=all.slice(0,f.slots),keep=new Set(best.map(x=>x.id)),inTank=new Set(f.aquarium.map(x=>x.id));
  const moved=best.filter(x=>!inTank.has(x.id)).length;require(moved>0,'FISHING_AQUARIUM_OPTIMAL');
  const before=f.aquarium.reduce((n,x)=>n+yieldOf(x),0),bag=[...f.fish.filter(x=>!keep.has(x.id)),...f.aquarium.filter(x=>!keep.has(x.id))];
  require(bag.length<=fishBagSize(s),'FISHING_BAG_FULL');
  f.aquarium=best;f.fish=bag;
  return {type:'fishAquariumAuto',moved,before,after:best.reduce((n,x)=>n+yieldOf(x),0)};
 }
 if(command==='fishAquariumClaim'){const gold=Math.floor(f.bank);require(gold>0,'FISHING_NO_INCOME');f.bank-=gold;s.gold+=gold;return {type:'fishAquariumClaim',gold};}
 if(command==='fishAquariumExpand'){require(f.slots<10,'FISHING_MAX_SLOTS');const cost=aquariumExpandCost(f.slots);spendTokens(f,cost);f.slots++;return {type:'fishAquariumExpand',slots:f.slots,tokens:cost};}
 // ── v3 낚싯대 강화 (토큰, 실패하면 토큰만 사라지고 단계 유지) ──
 if(command==='fishEnhance'){
  require(f.enhance<ROD_ENHANCE_MAX,'FISHING_ENHANCE_MAX');const step=ROD_ENHANCE[f.enhance];spendTokens(f,step.cost);
  const success=ctx.random()<step.chance;if(success)f.enhance++;return {type:'fishEnhance',success,level:f.enhance,tokens:step.cost};
 }
 // ── v3 인챈트: 잠그지 않은 열린 칸을 전부 다시 뽑는다. 잠근 칸 1개마다 비용 2배 ──
 if(command==='fishEnchant'){
  const slots=enchantSlotCount(f.enhance),locks=Array.isArray(args.locks)?[...new Set(args.locks)]:[];
  require(locks.every(i=>Number.isInteger(i)&&i>=0&&i<slots&&f.enchants[i]),'INVALID_FISHING_ENCHANT');require(locks.length<slots,'INVALID_FISHING_ENCHANT');
  const cost=enchantCost(locks.length);spendTokens(f,cost);
  const rollTier=()=>{let r=ctx.random();for(let i=ENCHANT_TIERS.length-1;i>0;i--){r-=ENCHANT_TIERS[i].p;if(r<0)return i;}return 0;};
  const next=[];for(let i=0;i<slots;i++)next[i]=locks.includes(i)?f.enchants[i]:{id:ENCHANTS[Math.floor(ctx.random()*ENCHANTS.length)].id,tier:rollTier()};
  f.enchants=next;return {type:'fishEnchant',enchants:next,tokens:cost};
 }
 // ── v3 합성: 같은 종·같은 크기 3마리 → 다음 크기 ──
 if(command==='fishFuse'){
  const ids=Array.isArray(args.ids)?[...new Set(args.ids)]:[];require(ids.length===FUSE_COUNT,'INVALID_FISHING_FUSE');
  const list=ids.map(id=>f.fish.find(x=>x.id===id));require(list.every(Boolean),'FISHING_FISH_MISSING');
  require(list.every(x=>sameFish(x,list[0])),'FISHING_FUSE_MISMATCH');
  const sizeIndex=FISH_SIZES.findIndex(x=>x.id===fishSizeOf(list[0]).id);require(sizeIndex>=0&&sizeIndex<FISH_SIZES.length-1,'FISHING_FUSE_MAX');
  // 돌연변이: 셋 다 같은 돌연변이면 유지, 아니면 가장 좋은 돌연변이를 30% 확률로 유지.
  const muts=list.map(x=>x.mut||null),bestMut=[...MUTATIONS].reverse().find(m=>muts.includes(m.id))?.id||null;
  const keepMut=muts.every(m=>m===muts[0])?muts[0]:bestMut&&ctx.random()<.3?bestMut:null;
  f.fish=f.fish.filter(x=>!ids.includes(x.id));
  const d=FISH.find(x=>x.id===list[0].species),success=ctx.random()<FUSE_CHANCE[sizeIndex];
  const jump=success&&sizeIndex+2<FISH_SIZES.length&&ctx.random()<FUSE_JACKPOT?2:success?1:0,size=FISH_SIZES[sizeIndex+jump];
  // 새 돌연변이: 더 좋은 게 나오면 바꾼다.
  const rolled=rollMutation(ctx.random,FUSE_MUT_BOOST),rank=id=>MUTATIONS.findIndex(m=>m.id===id),mut=rolled&&rank(rolled.id)>rank(keepMut)?rolled.id:keepMut;
  const item=success||mut!==(list[0].mut||null)?{id:ctx.uuid(),species:d.id,weight:fishSizeWeight(d,size,ctx.random()),size:size.id,...(mut?{mut}:{}),caughtAt:ctx.now}:{...list[0]};
  f.fish.push(item);if(success){f.collection[d.id]=Math.max(f.collection[d.id]||0,item.weight);recordContest(f,{...item,caughtAt:ctx.now});}
  return {type:'fishFuse',success,jump,mutated:!!mut&&mut!==(list[0].mut||null),fish:item};
 }
 // 황금 개체 5마리 → 20% 무지개 (가장 높은 등급 물고기가 무지개가 된다)
 if(command==='fishGoldFuse'){
  const ids=Array.isArray(args.ids)?[...new Set(args.ids)]:[];require(ids.length===GOLD_FUSE_COUNT,'INVALID_FISHING_FUSE');
  const list=ids.map(id=>f.fish.find(x=>x.id===id));require(list.every(Boolean),'FISHING_FISH_MISSING');require(list.every(x=>x.mut==='gold'),'FISHING_FUSE_MISMATCH');
  const best=list.slice().sort((a,b)=>FISH.find(x=>x.id===b.species).rarity-FISH.find(x=>x.id===a.species).rarity||fishPrice(b)-fishPrice(a))[0];
  f.fish=f.fish.filter(x=>!ids.includes(x.id));const success=ctx.random()<GOLD_FUSE_CHANCE;
  const item={...best,id:success?ctx.uuid():best.id,mut:success?'rainbow':'gold'};f.fish.push(item);
  return {type:'fishGoldFuse',success,fish:item};
 }
 // 각성: 수족관 물고기에 같은 종을 먹여 ★1~5 (★당 수족관 골드 +20%, 필요 마리 = 다음 ★ 숫자)
 if(command==='fishAwaken'){
  const target=f.aquarium.find(x=>x.id===args.id);require(target,'FISHING_FISH_MISSING');const star=target.star||0;require(star<AWAKEN_MAX,'FISHING_AWAKEN_MAX');
  const need=star+1,feed=f.fish.filter(x=>x.species===target.species).sort((a,b)=>fishPrice(a)-fishPrice(b)).slice(0,need);require(feed.length===need,'FISHING_AWAKEN_REQUIRED');
  settleAquarium(f,ctx.now);const used=new Set(feed.map(x=>x.id));f.fish=f.fish.filter(x=>!used.has(x.id));target.star=star+1;
  return {type:'fishAwaken',star:target.star,used:need};
 }
 if(command==='fishQuestClaim'){
  const q=FISHING_QUESTS.find(x=>x.id===args.id);require(q,'INVALID_FISHING_QUEST');
  require(!f.daily.claimed.includes(q.id),'FISHING_QUEST_CLAIMED');require(f.daily[q.id]>=q.goal,'FISHING_QUEST_REQUIRED');
  const diamonds=gatherAmount(s,'diamond',q.diamonds,ctx?.random||Math.random);f.daily.claimed.push(q.id);f.diamonds+=diamonds;return {type:'fishQuestClaim',diamonds};
 }
 if(command==='fishExchange'){
  require(false,'FISHING_EXCHANGE_REMOVED'); // 2026-11-04 도현: 다이아 교환소 삭제
  const item=DIAMOND_EXCHANGE.find(x=>x.id===args.item);require(item&&integer(args.count,1,DIAMOND_EXCHANGE_DAILY),'INVALID_FISHING_EXCHANGE');
  require((f.daily.exchanged||0)+args.count<=DIAMOND_EXCHANGE_DAILY,'FISHING_EXCHANGE_LIMIT');
  const cost=item.diamonds*args.count;require(f.diamonds>=cost,'FISHING_DIAMONDS_REQUIRED');
  f.diamonds-=cost;f.daily.exchanged=(f.daily.exchanged||0)+args.count;s.materials[item.id]=(s.materials[item.id]||0)+args.count;
  return {type:'fishExchange',item:item.id,name:item.name,count:args.count,diamonds:cost};
 }
 if(command==='fishContestClaim'){
  // The ranking comes from the server (rebirth_fishing_contest), never from the client.
  const week=String(args.week||''),board=ctx.fishingContest;
  require(/^\d{4}-\d{2}-\d{2}$/.test(week)&&contestWeekEnd(week)<=ctx.now&&ctx.now-contestWeekEnd(week)<CONTEST_CLAIM_WEEKS*604800000,'FISHING_CONTEST_CLOSED');
  f.contestClaims??=[];require(!f.contestClaims.includes(week),'FISHING_CONTEST_CLAIMED');
  const mine=(board?.rewards||[]).find(r=>r.week===week),reward=CONTEST_REWARDS.find(r=>r.rank===mine?.rank);
  require(reward,'FISHING_CONTEST_NO_REWARD');
  f.contestClaims=[...f.contestClaims.filter(w=>ctx.now-contestWeekEnd(w)<(CONTEST_CLAIM_WEEKS+1)*604800000),week];
  f.diamonds+=reward.diamonds;s.materials.addCube=(s.materials.addCube||0)+reward.addCube;
  return {type:'fishContestClaim',week,rank:reward.rank,diamonds:reward.diamonds,addCube:reward.addCube};
 }
 throw Error('UNKNOWN_FISHING_COMMAND');
}
