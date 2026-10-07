import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {initialState,execute} from './engine.mjs';
import {FISH,SPOTS,RARITIES,BAITS,REWARD_RATES,rodGoldCost,rodDiamondCost,fishPrice,fishYield} from './fishing-data.mjs';
import {fishingCommand,normalizeFishing,fishingMeter,fishingStep,fishingTarget,aquariumBank,fishingDifficulty} from './fishing-model.mjs';
let now=Date.parse('2026-10-07T03:00:00Z'),seed=42;
const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
const ctx=()=>({now,random,uuid:randomUUID});
const fresh=()=>{const s=initialState('warrior','낚시검증',ctx());s.hunting=false;s.gold=1e9;normalizeFishing(s,now);return s;};
let s=fresh();const run=(command,args={})=>{const next=structuredClone(s);const r=command.startsWith('fish')?{state:next,events:[fishingCommand(next,command,args,{...ctx(),admin:true})]}:execute(s,command,args,ctx());s=r.state;return r.events.find(e=>e.type===command||e.type==='fishCatch');};
// All authenticated player contexts can fish; client flags never grant admin resources.
for(const admin of [false,undefined,'true',1]){
 const allowed=execute(s,'fishCast',{spot:'brook',bait:'worm',protocol:3},{...ctx(),admin});
 assert.ok(allowed.state.fishing.cast);assert.equal(allowed.state.isAdmin,false);
 assert.equal(allowed.state.gold,s.gold);assert.equal(allowed.state.fishing.bait.worm,s.fishing.bait.worm-1);
}
const adminCast=execute(s,'fishCast',{spot:'brook',bait:'worm',protocol:3},{...ctx(),admin:true});assert.ok(adminCast.state.fishing.cast);assert.equal(adminCast.state.isAdmin,true);
assert.equal(FISH.length,50);assert.equal(new Set(FISH.map(x=>x.id)).size,50);
assert.deepEqual(RARITIES.map((_,i)=>FISH.filter(x=>x.rarity===i).length),[12,11,10,10,5,2]);
assert.deepEqual(SPOTS.map(x=>x.level),[1,10,20,30,40]);assert.ok(Math.abs(REWARD_RATES.reduce((n,x)=>n+x.chance,0)-1)<1e-12);
assert.equal(REWARD_RATES.find(x=>x.id==='primeCube').chance,.01);
assert.equal(REWARD_RATES.find(x=>x.id==='fish').chance,.93);
for(let level=1;level<50;level++)assert.equal(rodGoldCost(level),Math.round(20000*1.17**(level-1)/100)*100*(level>=10&&level<30?5:1));
// Existing paid XP retains its gold value, but the old full bar cannot bypass the new cost.
const trained=fresh();trained.fishing.rod=10;trained.fishing.xp=82200;trained.fishing.diamonds=50;
assert.throws(()=>fishingCommand(trained,'fishUpgrade',{}, {...ctx(),admin:true}),/FISHING_XP_REQUIRED/);
const trainingGold=trained.gold,trainingDiamonds=trained.fishing.diamonds;
fishingCommand(trained,'fishTrain',{gold:328800},{...ctx(),admin:true});
assert.equal(trained.gold,trainingGold-328800);assert.equal(trained.fishing.xp,411000);
fishingCommand(trained,'fishUpgrade',{}, {...ctx(),admin:true});
assert.equal(trained.fishing.rod,11);assert.equal(trained.fishing.xp,0);assert.equal(trained.fishing.diamonds,trainingDiamonds-4);
// Prime reward owns exactly the interval between 96.5% and 97.5% of the server draw.
for(const [draw,reward] of [[.9649999,'cube'],[.9650001,'primeCube'],[.9749999,'primeCube'],[.9750001,'scroll']]){
 const sample=fresh(),draws=[0,0,draw,0,0];
 fishingCommand(sample,'fishCast',{spot:'brook',bait:'worm',protocol:3},{...ctx(),admin:true,random:()=>draws.shift()});
 assert.equal(sample.fishing.cast.reward,reward);
}
for(const d of FISH){assert.ok(fishPrice({species:d.id,weight:d.max})>fishPrice({species:d.id,weight:d.min}));assert.ok(d.level>=SPOTS.find(x=>x.id===d.spot).level);if(d.rarity===5)assert.equal(d.level,45);}
const original=structuredClone(s);assert.throws(()=>run('fishCast',{spot:'moon',bait:'worm',protocol:3}),/FISHING_ROD_REQUIRED/);assert.deepEqual(s,original);
assert.throws(()=>run('fishTrain',{gold:-1}),/INVALID_FISHING_COST/);
const before=s.gold;run('fishTrain',{gold:rodGoldCost(1)});assert.equal(s.gold,before-rodGoldCost(1));assert.throws(()=>run('fishUpgrade'),/FISHING_DIAMONDS_REQUIRED/);
s.fishing.diamonds=10;run('fishUpgrade');assert.equal(s.fishing.rod,2);assert.equal(s.fishing.diamonds,10-rodDiamondCost(1));assert.equal(s.fishing.xp,0);
const baitGold=s.gold,baitDiamonds=s.fishing.diamonds;
assert.throws(()=>run('fishBaitBuy',{bait:'worm',count:10}),/FISHING_REFRESH_REQUIRED/);
assert.throws(()=>run('fishBaitBuy',{bait:'worm',count:1,currency:'diamonds'}),/INVALID_FISHING_BAIT/);
run('fishBaitBuy',{bait:'worm',count:50,currency:'diamonds'});assert.equal(s.fishing.bait.worm,70);assert.equal(s.gold,baitGold);assert.equal(s.fishing.diamonds,baitDiamonds-1);
assert.throws(()=>run('fishBaitBuy',{bait:'star',count:20,currency:'diamonds'}),/FISHING_ROD_REQUIRED/);
const saved=structuredClone(s);s.fishing.rod=50;
for(const bait of BAITS){s.fishing.diamonds=bait.diamonds;const amount=s.fishing.bait[bait.id]||0;const gold=s.gold;run('fishBaitBuy',{bait:bait.id,count:bait.pack,currency:'diamonds'});assert.equal(s.fishing.diamonds,0);assert.equal(s.fishing.bait[bait.id],amount+bait.pack);assert.equal(s.gold,gold);const snapshot=structuredClone(s);assert.throws(()=>run('fishBaitBuy',{bait:bait.id,count:bait.pack,currency:'diamonds'}),/FISHING_DIAMONDS_REQUIRED/);assert.deepEqual(s,snapshot);}
s=saved;
run('fishCast',{spot:'brook',bait:'worm',protocol:3});let c=s.fishing.cast;assert.equal(s.fishing.bait.worm,69);
assert.throws(()=>run('fishCast',{spot:'brook',bait:'worm',protocol:3}),/FISHING_CAST_ACTIVE/);
assert.throws(()=>run('fishHook',{id:c.id}),/FISHING_TOO_EARLY/);assert.throws(()=>run('fishFinish',{id:c.id,frames:[1]}),/FISHING_HOOK_REQUIRED/);now=c.biteAt+50;run('fishHook',{id:c.id});c=s.fishing.cast;assert.throws(()=>run('fishHook',{id:c.id}),/FISHING_ALREADY_HOOKED/);assert.throws(()=>run('fishFinish',{id:c.id,frames:[1]}),/FISHING_TOO_EARLY/);assert.throws(()=>run('fishFinish',{id:c.id,frames:[4]}),/INVALID_FISHING_INPUT/);
function optimal(c){const m=fishingMeter(),frames=[];while(!m.finished){const input=c.protocol===3?Math.min(3,Math.max(0,Math.round((fishingTarget(c,m.tick+1)-m.cursor+c.drift)/c.tap))):m.cursor<fishingTarget(c,m.tick+1)?1:0;frames.push(input);fishingStep(c,input,m);}return {frames,m};}
// Taps are impulses, not a held direction. More taps in a frame move faster right.
const easySpecies=FISH[0],easy={protocol:3,seed:0,...fishingDifficulty(easySpecies,1,0)};
const released=fishingMeter(),oneTap=fishingMeter(),burst=fishingMeter();
fishingStep(easy,0,released);fishingStep(easy,1,oneTap);fishingStep(easy,3,burst);
assert.ok(released.cursor<.5);assert.ok(oneTap.cursor>.5);assert.ok(burst.cursor>oneTap.cursor);
const afterTap=oneTap.cursor;fishingStep(easy,0,oneTap);assert.ok(oneTap.cursor<afterTap);
const mythic=FISH.at(-1),weak=fishingDifficulty(mythic,45,1),strong=fishingDifficulty(mythic,50,1);
assert.equal(weak.powerNeed,48);assert.ok(weak.band<strong.band);assert.ok(weak.speed>strong.speed);
assert.ok(weak.band<easy.band);assert.ok(weak.speed>easy.speed);assert.ok(weak.required>easy.required);
assert.ok(fishingDifficulty(easySpecies,1,1).band<easy.band);
// Every newly unlocked area offers catchable fish; strength gates only block stronger species.
for(const spot of SPOTS)assert.ok(FISH.some(x=>x.spot===spot.id&&fishingDifficulty(x,spot.level,0).powerNeed<=spot.level));
for(const species of FISH)assert.ok(fishingDifficulty(species,50,1).powerNeed<=50);
for(const rarity of [0,1,2,3,4,5]){
 const species=FISH.find(x=>x.rarity===rarity),rod=species.level+Math.max(0,rarity-2);
 for(const size of [0,.5,1])for(let seed=0;seed<24;seed++){
  const challenge={protocol:3,seed:seed*Math.PI/12,...fishingDifficulty(species,rod,size)},p=optimal(challenge);
  assert.equal(p.m.failed,false);assert.ok(p.m.hits/challenge.ticks>=challenge.required);
 }
}
const underpowered=fresh();underpowered.fishing.rod=45;
const weakCast={id:randomUUID(),species:mythic.id,weight:mythic.max,reward:'fish',hookAt:now-30000,expires:now+30000,protocol:3,seed:0,...weak};
underpowered.fishing.cast=weakCast;
const weakPlay=optimal(weakCast),weakResult=fishingCommand(underpowered,'fishFinish',{id:weakCast.id,frames:weakPlay.frames,rod:50},{...ctx(),admin:false});
assert.equal(weakResult.won,false);assert.equal(weakResult.reason,'rodPower');assert.equal(underpowered.fishing.fish.length,0);
const stale=fresh(),staleBait=stale.fishing.bait.worm;
assert.throws(()=>fishingCommand(stale,'fishCast',{spot:'brook',bait:'worm'},{...ctx(),admin:false}),/FISHING_REFRESH_REQUIRED/);
assert.equal(stale.fishing.bait.worm,staleBait);
// Already hooked protocol-2 casts retain their original hold/release physics.
const legacy=fresh(),legacyCast={protocol:2,id:randomUUID(),species:easySpecies.id,weight:easySpecies.min,reward:'fish',seed:0,hookAt:now-20000,expires:now+30000,ticks:80,band:.21,strainLimit:42,required:.45};
legacy.fishing.cast=legacyCast;const legacyPlay=optimal(legacyCast);
assert.ok(legacyPlay.frames.every(x=>x===0||x===1));
assert.equal(fishingCommand(legacy,'fishFinish',{id:legacyCast.id,frames:legacyPlay.frames},{...ctx(),admin:false}).won,true);
const {frames,m}=optimal(c);now=c.hookAt+frames.length*100+5;const reward=run('fishFinish',{id:c.id,frames});assert.equal(reward.won,true);assert.ok(m.hits/c.ticks>=c.required);assert.equal(s.fishing.cast,null);
const rewarded=structuredClone(s);assert.throws(()=>run('fishFinish',{id:c.id,frames}),/FISHING_CAST_MISSING/);assert.deepEqual(s,rewarded);
// Both successful and failed frame streams are replayed by the server; client cannot name a reward.
run('fishCast',{spot:'brook',bait:'worm',protocol:3});c=s.fishing.cast;now=c.biteAt+50;run('fishHook',{id:c.id});c=s.fishing.cast;const bad=fishingMeter(),badFrames=[];while(!bad.finished){badFrames.push(0);fishingStep(c,0,bad);}now=c.hookAt+badFrames.length*100+5;assert.equal(run('fishFinish',{id:c.id,frames:badFrames,reward:'diamondChest'}).won,false);
run('fishCast',{spot:'brook',bait:'worm',protocol:3});c=s.fishing.cast;now=c.hookDeadline+1;assert.throws(()=>run('fishHook',{id:c.id}),/FISHING_CAST_MISSING|FISHING_BITE_MISSED/);run('fishCancel',{id:c.id});assert.equal(s.fishing.cast,null);
const a={id:randomUUID(),species:'fish-01',weight:100,caughtAt:now},b={id:randomUUID(),species:'fish-50',weight:180000,caughtAt:now};s.fishing.fish=[a,b];
run('fishAquariumAdd',{id:b.id});assert.equal(s.fishing.fish.length,1);assert.equal(s.fishing.aquarium.length,1);
assert.throws(()=>run('fishSell',{ids:[b.id]}),/FISHING_FISH_MISSING/);assert.throws(()=>run('fishSell',{ids:[a.id,a.id]}),/INVALID_FISHING_ITEMS/);
const rate=fishYield(b);now+=24*3600000;assert.equal(Math.floor(aquariumBank(s.fishing,now)),rate*12);
const gold=s.gold;run('fishAquariumClaim');assert.equal(s.gold-gold,rate*12);assert.throws(()=>run('fishAquariumClaim'),/FISHING_NO_INCOME/);
now+=3600000;run('fishAquariumRemove',{id:b.id});assert.equal(Math.floor(s.fishing.bank),rate);now+=3600000;assert.equal(Math.floor(aquariumBank(s.fishing,now)),rate);
const sold=run('fishSell',{ids:[a.id]});assert.equal(sold.gold,fishPrice(a));assert.throws(()=>run('fishSell',{ids:[a.id]}),/FISHING_FISH_MISSING/);
s.fishing.daily.catch=10;const diamonds=s.fishing.diamonds;run('fishQuestClaim',{id:'catch'});assert.equal(s.fishing.diamonds,diamonds+3);assert.throws(()=>run('fishQuestClaim',{id:'catch'}),/FISHING_QUEST_CLAIMED/);
now=Date.parse('2026-10-08T15:00:00Z');run('sync');assert.equal(s.fishing.daily.day,'2026-10-09');assert.deepEqual(s.fishing.daily.claimed,[]);
s.fishing.rod=50;assert.throws(()=>run('fishTrain',{gold:1}),/FISHING_MAX_LEVEL/);assert.throws(()=>run('fishUpgrade'),/FISHING_MAX_LEVEL/);
// Every reward type can be awarded once by its server-owned cast, never by client args.
for(const key of REWARD_RATES.map(x=>x.id)){s=fresh();const materialBefore=s.materials[key]||0;run('fishCast',{spot:'brook',bait:'worm',protocol:3});s.fishing.cast.reward=key;c=s.fishing.cast;now=c.biteAt+50;run('fishHook',{id:c.id});c=s.fishing.cast;const p=optimal(c);now=c.hookAt+p.frames.length*100+10;const r=run('fishFinish',{id:c.id,frames:p.frames});assert.equal(r.won,true);if(key==='fish')assert.equal(s.fishing.fish.length,1);else if(key==='diamondChest')assert.ok(s.fishing.diamonds>=3&&s.fishing.diamonds<=8);else assert.equal(s.materials[key],materialBefore+1);}
// Potential lock consumes one stone, preserves exactly the selected line and grade.
s=fresh();const it=s.items[0];it.grade=3;it.potentialUnlocked=true;it.potentialVersion=5;it.lines=[{key:'STR',value:6,grade:3},{key:'DEX',value:6,grade:3},{key:'INT',value:6,grade:3}];s.materials.cube=5;s.materials.highCube=5;s.materials.potentialLock=2;
const locked=structuredClone(it.lines[1]);run('cube',{id:it.id,kind:'cube',lock:1});assert.deepEqual(s.items[0].lines[1],locked);assert.equal(s.items[0].grade,3);assert.equal(s.materials.potentialLock,1);
assert.throws(()=>run('cube',{id:it.id,kind:'cube',lock:3}),/INVALID_POTENTIAL_LOCK/);run('cube',{id:it.id,kind:'highCube',lock:1});assert.deepEqual(s.pendingCube.lines[1],locked);run('cubeChoose',{apply:true});assert.deepEqual(s.items[0].lines[1],locked);assert.equal(s.materials.potentialLock,0);
assert.throws(()=>run('cube',{id:it.id,kind:'cube',lock:0}),/INSUFFICIENT_POTENTIALLOCK/);
assert.throws(()=>run('petSummon',{count:1}),/FISHING_SUMMON_REMOVED/);
console.log('PASS fishing: 50 species, gates, growth costs, frame replay, reward ownership, duplicate protection, sell/tank exclusivity, income cap, daily resets, potential locks');
