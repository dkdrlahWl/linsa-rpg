// Fishing gold rebalance: instant 100% catches, no cube/potential rewards, bounded income.
import assert from 'node:assert/strict';
import {FISH,SPOTS,BAITS,REWARD_RATES,fishPrice,fishYield,rodGoldCost,aquariumExpandCost} from './fishing-data.mjs';
import {fishingCommand,FISHING_PROTOCOL} from './fishing-model.mjs';
let n=0;const uuid=()=>'id-'+(++n);
function seq(seed){let x=seed>>>0;return ()=>((x=(Math.imul(x,1664525)+1013904223)>>>0)/4294967296);}
assert.deepEqual(REWARD_RATES.map(r=>r.id),['fish','diamondChest','dungeonKey']);
assert.ok(Math.abs(REWARD_RATES.reduce((a,r)=>a+r.chance,0)-1)<1e-9);
for(const id of ['cube','highCube','primeCube','scroll','potentialLock'])assert.ok(!REWARD_RATES.some(r=>r.id===id));
// Grade order holds inside each spot at equal relative weight.
for(const s of SPOTS){const fish=FISH.filter(f=>f.spot===s.id);for(const a of fish)for(const b of fish)if(a.rarity<b.rarity)assert.ok(fishPrice({species:a.id,weight:a.max})<fishPrice({species:b.id,weight:b.max}),a.name+'<'+b.name);}
// Simulate an hour of perfect casting at each tier; bounded vs Lv.200 hunting (~385k/h).
function hour(spot,rod,bait,seed){
 const s={gold:0,materials:{},fishing:undefined};const random=seq(seed);let now=Date.UTC(2026,9,11,3),gold=0,casts=0,keys=0,dia=0;
 s.fishing={version:1,rod,xp:0,diamonds:0,bait:{[bait]:100000},fish:[],aquarium:[],slots:3,bank:0,bankAt:now,collection:{},daily:{},cast:null,lastCatch:null};
 const end=now+3600000;
 while(now<end){
  const {castId}=fishingCommand(s,'fishCast',{protocol:FISHING_PROTOCOL,spot,bait},{now,random,uuid});casts++;
  assert.throws(()=>fishingCommand(s,'fishHook',{id:castId},{now:now+1000,random,uuid}),/FISHING_TOO_EARLY/);
  now=s.fishing.cast.biteAt;
  const r=fishingCommand(s,'fishHook',{id:castId},{now,random,uuid});
  assert.equal(r.won,true);assert.equal(s.fishing.cast,null);
  if(r.reward==='fish'){gold+=fishPrice(r.fish);s.fishing.fish=[];}else if(r.reward==='dungeonKey')keys++;else dia+=r.diamonds;
  now+=1500; // client/network turnaround
 }
 const baitGold=BAITS.find(b=>b.id===bait).gold?casts*BAITS.find(b=>b.id===bait).gold/BAITS.find(b=>b.id===bait).pack:0;
 return {spot,rod,bait,casts,net:Math.round(gold-baitGold),keys,dia,cubes:s.materials.cube||0};
}
const rows=[hour('brook',1,'worm',1),hour('moon',10,'shrimp',2),hour('canyon',20,'shrimp',3),hour('coral',30,'pearl',4),hour('abyss',40,'star',5),hour('abyss',50,'star',6)];
console.table(rows);
for(const r of rows){assert.equal(r.cubes,0);assert.ok(r.net>0);}
assert.ok(rows.at(-1).net<250000,'max-rod active fishing must stay below Lv.200 hunting income');
for(let i=1;i<rows.length;i++)assert.ok(rows[i].net>rows[i-1].net*0.95,'income rises with rod progression');
// Aquarium of ten best average fish stays a side income.
const myth=FISH.filter(f=>f.rarity===5),leg=FISH.filter(f=>f.rarity===4&&f.spot==='abyss');
const avg=f=>({species:f.id,weight:Math.round(f.min+(f.max-f.min)*.377)});
const tenMyth=myth.reduce((a,f)=>a+fishYield(avg(f)),0)*5,tenLeg=leg.reduce((a,f)=>a+fishYield(avg(f)),0)*10/leg.length;
console.log('aquarium/h ten mythic',Math.round(tenMyth),'ten legendary',Math.round(tenLeg));
assert.ok(tenMyth<80000&&tenLeg<60000);
let rodTotal=0;for(let l=1;l<50;l++)rodTotal+=rodGoldCost(l);console.log('rod 1→50 gold',rodTotal);
assert.ok(rodTotal>12e6&&rodTotal<22e6);
assert.equal(aquariumExpandCost(3),300000);
// Old protocol clients must refresh.
assert.throws(()=>fishingCommand({gold:0,materials:{}},'fishCast',{protocol:3,spot:'brook',bait:'worm'},{now:Date.now(),random:Math.random,uuid}),/FISHING_REFRESH_REQUIRED/);
console.log('PASS fishing gold rebalance');
