import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {initialState,execute} from './engine.mjs';
import {FISH,SPOTS,RARITIES,REWARD_RATES,rodGoldCost,rodDiamondCost,fishPrice,fishYield} from './fishing-data.mjs';
import {normalizeFishing,fishingMeter,fishingStep,fishingTarget,aquariumBank} from './fishing-model.mjs';
let now=Date.parse('2026-10-07T03:00:00Z'),seed=42;
const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
const ctx=()=>({now,random,uuid:randomUUID});
const fresh=()=>{const s=initialState('warrior','낚시검증',ctx());s.hunting=false;s.gold=1e9;normalizeFishing(s,now);return s;};
let s=fresh();const run=(command,args={})=>{const r=execute(s,command,args,ctx());s=r.state;return r.events.find(e=>e.type===command||e.type==='fishCatch');};
assert.equal(FISH.length,50);assert.equal(new Set(FISH.map(x=>x.id)).size,50);
assert.deepEqual(RARITIES.map((_,i)=>FISH.filter(x=>x.rarity===i).length),[12,11,10,10,5,2]);
assert.deepEqual(SPOTS.map(x=>x.level),[1,10,20,30,40]);assert.ok(Math.abs(REWARD_RATES.reduce((n,x)=>n+x.chance,0)-1)<1e-12);
for(const d of FISH){assert.ok(fishPrice({species:d.id,weight:d.max})>fishPrice({species:d.id,weight:d.min}));assert.ok(d.level>=SPOTS.find(x=>x.id===d.spot).level);if(d.rarity===5)assert.equal(d.level,45);}
const original=structuredClone(s);assert.throws(()=>run('fishCast',{spot:'moon',bait:'worm'}),/FISHING_ROD_REQUIRED/);assert.deepEqual(s,original);
assert.throws(()=>run('fishTrain',{gold:-1}),/INVALID_FISHING_COST/);
const before=s.gold;run('fishTrain',{gold:rodGoldCost(1)});assert.equal(s.gold,before-rodGoldCost(1));assert.throws(()=>run('fishUpgrade'),/FISHING_DIAMONDS_REQUIRED/);
s.fishing.diamonds=10;run('fishUpgrade');assert.equal(s.fishing.rod,2);assert.equal(s.fishing.diamonds,10-rodDiamondCost(1));assert.equal(s.fishing.xp,0);
run('fishBaitBuy',{bait:'worm',count:10});assert.equal(s.fishing.bait.worm,30);assert.throws(()=>run('fishBaitBuy',{bait:'star',count:1}),/FISHING_ROD_REQUIRED/);
run('fishCast',{spot:'brook',bait:'worm'});let c=s.fishing.cast;assert.equal(s.fishing.bait.worm,29);
assert.throws(()=>run('fishCast',{spot:'brook',bait:'worm'}),/FISHING_CAST_ACTIVE/);
assert.throws(()=>run('fishFinish',{id:c.id,frames:[1]}),/FISHING_TOO_EARLY/);assert.throws(()=>run('fishFinish',{id:c.id,frames:[2]}),/INVALID_FISHING_INPUT/);
function optimal(c){const m=fishingMeter(),frames=[];while(!m.finished){const input=m.cursor<fishingTarget(c,m.tick+1)?1:0;frames.push(input);fishingStep(c,input,m);}return {frames,m};}
const {frames,m}=optimal(c);now=c.biteAt+frames.length*100+5;const reward=run('fishFinish',{id:c.id,frames});assert.equal(reward.won,true);assert.ok(m.hits/c.ticks>=c.required);assert.equal(s.fishing.cast,null);
const rewarded=structuredClone(s);assert.throws(()=>run('fishFinish',{id:c.id,frames}),/FISHING_CAST_MISSING/);assert.deepEqual(s,rewarded);
// Both successful and failed frame streams are replayed by the server; client cannot name a reward.
run('fishCast',{spot:'brook',bait:'worm'});c=s.fishing.cast;const bad=fishingMeter(),badFrames=[];while(!bad.finished){badFrames.push(1);fishingStep(c,1,bad);}now=c.biteAt+badFrames.length*100+5;assert.equal(run('fishFinish',{id:c.id,frames:badFrames,reward:'diamondChest'}).won,false);
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
for(const key of REWARD_RATES.map(x=>x.id)){s=fresh();const materialBefore=s.materials[key]||0;run('fishCast',{spot:'brook',bait:'worm'});s.fishing.cast.reward=key;c=s.fishing.cast;const p=optimal(c);now=c.biteAt+p.frames.length*100+10;const r=run('fishFinish',{id:c.id,frames:p.frames});assert.equal(r.won,true);if(key==='fish')assert.equal(s.fishing.fish.length,1);else if(key==='diamondChest')assert.ok(s.fishing.diamonds>=3&&s.fishing.diamonds<=8);else assert.equal(s.materials[key],materialBefore+1);}
// Potential lock consumes one stone, preserves exactly the selected line and grade.
s=fresh();const it=s.items[0];it.grade=3;it.potentialUnlocked=true;it.potentialVersion=5;it.lines=[{key:'STR',value:6,grade:3},{key:'DEX',value:6,grade:3},{key:'INT',value:6,grade:3}];s.materials.cube=5;s.materials.highCube=5;s.materials.potentialLock=2;
const locked=structuredClone(it.lines[1]);run('cube',{id:it.id,kind:'cube',lock:1});assert.deepEqual(s.items[0].lines[1],locked);assert.equal(s.items[0].grade,3);assert.equal(s.materials.potentialLock,1);
assert.throws(()=>run('cube',{id:it.id,kind:'cube',lock:3}),/INVALID_POTENTIAL_LOCK/);run('cube',{id:it.id,kind:'highCube',lock:1});assert.deepEqual(s.pendingCube.lines[1],locked);run('cubeChoose',{apply:true});assert.deepEqual(s.items[0].lines[1],locked);assert.equal(s.materials.potentialLock,0);
assert.throws(()=>run('cube',{id:it.id,kind:'cube',lock:0}),/INSUFFICIENT_POTENTIALLOCK/);
assert.throws(()=>run('petSummon',{count:1}),/FISHING_SUMMON_REMOVED/);
console.log('PASS fishing: 50 species, gates, growth costs, frame replay, reward ownership, duplicate protection, sell/tank exclusivity, income cap, daily resets, potential locks');
