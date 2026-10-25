import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {execute,initialState} from './engine.mjs';
import {ROD_MAX,FISH,SPOTS,RARITIES,rodGoldCost,rodDiamondCost,DIAMOND_EXCHANGE_DAILY,contestWeek,contestWeekEnd,contestTarget,CONTEST_START} from './fishing-data.mjs';

assert.equal(ROD_MAX,70);
assert.equal(FISH.length,70);assert.equal(SPOTS.length,7);assert.equal(RARITIES[6].name,'태고');
assert.equal(FISH.filter(x=>x.rarity===6).length,2);assert.ok(FISH.filter(x=>x.rarity===6).every(x=>x.level===65&&x.spot==='origin'));
assert.ok(FISH.filter(x=>x.spot==='palace').every(x=>x.level>=50));assert.ok(FISH.filter(x=>x.spot==='origin').every(x=>x.level>=60));
let gold=0,dia=0;for(let l=50;l<70;l++){gold+=rodGoldCost(l);dia+=rodDiamondCost(l);}
assert.ok(gold>100e6&&gold<200e6,String(gold));assert.equal(dia,780);assert.equal(rodDiamondCost(49),11,'Lv.<50 unchanged');

let now=Date.parse('2026-10-27T03:00:00Z');
const ctx=(extra={})=>({now,random:Math.random,uuid:randomUUID,accountId:'a',...extra});
let s=initialState('warrior','낚시',ctx());s.level=200;s.fishing={version:1,rod:70,xp:0,diamonds:500,bait:{worm:100},fish:[],aquarium:[],slots:3,bank:0,bankAt:now,collection:{},daily:{},cast:null,lastCatch:null};

// Diamond exchange: 5 → 에디셔널 큐브, 3 → 블랙 큐브, 5 → 잠재 잠금석, 30 per day.
s=execute(s,'fishExchange',{item:'addCube',count:10},ctx()).state;assert.equal(s.materials.addCube,10);assert.equal(s.fishing.diamonds,450);
s=execute(s,'fishExchange',{item:'highCube',count:15},ctx()).state;assert.equal(s.fishing.diamonds,405);
s=execute(s,'fishExchange',{item:'potentialLock',count:5},ctx()).state;assert.equal(s.fishing.diamonds,380);assert.equal(s.fishing.daily.exchanged,30);
assert.throws(()=>execute(s,'fishExchange',{item:'addCube',count:1},ctx()),/FISHING_EXCHANGE_LIMIT/);
assert.throws(()=>execute(s,'fishExchange',{item:'gold',count:1},ctx()),/INVALID_FISHING_EXCHANGE/);
now+=86400000;s=execute(s,'fishExchange',{item:'addCube',count:1},ctx()).state;assert.equal(s.fishing.daily.exchanged,1,'resets at midnight');
s.fishing.diamonds=4;assert.throws(()=>execute(s,'fishExchange',{item:'addCube',count:1},ctx()),/FISHING_DIAMONDS_REQUIRED/);

// Contest: weeks start Monday 00:00 KST; only the target species counts; heaviest kept.
assert.equal(contestWeek(Date.parse('2026-10-25T14:59:00Z')),'2026-10-19');assert.equal(contestWeek(Date.parse('2026-10-25T15:00:00Z')),'2026-10-26');
const week=contestWeek(now),target=contestTarget(week);assert.ok(week>=CONTEST_START);
s.fishing.diamonds=100;s.fishing.bait.worm=10;s.fishing.rod=70;
const land=(species,weight)=>{s=execute(s,'fishCast',{spot:'brook',bait:'worm',protocol:4},ctx()).state;Object.assign(s.fishing.cast,{species,weight,reward:'fish'});now=s.fishing.cast.biteAt;s=execute(s,'fishHook',{id:s.fishing.cast.id},ctx()).state;};
land(target.species,1000);assert.equal(s.fishing.contest[week].weight,1000);
land(target.species,800);assert.equal(s.fishing.contest[week].weight,1000,'lighter fish does not replace the record');
land(FISH.find(x=>x.id!==target.species).id,999999);assert.equal(s.fishing.contest[week].weight,1000,'other species ignored');
land(target.species,1500);assert.equal(s.fishing.contest[week].weight,1500);

// Claim: only after the week ends, only with a server rank 1~3, once.
const board={rewards:[{week,rank:1}]};
assert.throws(()=>execute(s,'fishContestClaim',{week},ctx({fishingContest:board})),/FISHING_CONTEST_CLOSED/);
now=contestWeekEnd(week)+1000;
assert.throws(()=>execute(s,'fishContestClaim',{week},ctx({fishingContest:{rewards:[]}})),/FISHING_CONTEST_NO_REWARD/);
assert.throws(()=>execute(s,'fishContestClaim',{week},ctx()),/FISHING_CONTEST_NO_REWARD/);
const cubes=s.materials.addCube,d0=s.fishing.diamonds;
s=execute(s,'fishContestClaim',{week},ctx({fishingContest:board})).state;
assert.equal(s.fishing.diamonds,d0+100);assert.equal(s.materials.addCube,cubes+50);
assert.throws(()=>execute(s,'fishContestClaim',{week},ctx({fishingContest:board})),/FISHING_CONTEST_CLAIMED/);
const s2=structuredClone(s);s2.fishing.contestClaims=[];
const second=execute(s2,'fishContestClaim',{week},ctx({fishingContest:{rewards:[{week,rank:3}]}})).state;assert.equal(second.materials.addCube,cubes+80);
now=contestWeekEnd(week)+5*604800000;assert.throws(()=>execute(s2,'fishContestClaim',{week},ctx({fishingContest:board})),/FISHING_CONTEST_CLOSED/);
console.log('PASS fishing expansion: rod 70, 2 new spots, 태고, costs, diamond exchange 30/day, weekly contest record + server-ranked claim');
