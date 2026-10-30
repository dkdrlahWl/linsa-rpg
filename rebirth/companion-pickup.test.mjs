import assert from 'node:assert/strict';
import {companionCommand,normalizeCompanions,PICKUP_COMPANION,rollPickupCompanion,companionRate,companionQuality,slotAccrued} from './companion-model.mjs';
const ctx={now:0,random:()=>0};
let s={gold:0,companions:{tickets:5,pickupTickets:5,cards:[]}};
let e=companionCommand(s,'companionSummon',{count:5,banner:'pickup'},ctx);
assert.equal(s.companions.tickets,5);assert.equal(s.companions.pickupTickets,0);assert.ok(e.cards.every(c=>c.c===PICKUP_COMPANION.id));
assert.throws(()=>companionCommand(s,'companionSummon',{count:1,banner:'pickup'},ctx),/NO_TICKET/);
companionCommand(s,'companionSummon',{count:5},ctx);assert.equal(s.companions.tickets,0);assert.equal(s.companions.cards.length,10);
const saved=JSON.parse(JSON.stringify(s));assert.equal(normalizeCompanions(saved).cards.length,10);
assert.throws(()=>companionCommand(s,'companionSummon',{banner:'other'},ctx),/INVALID_BANNER/);
const full={companions:{tickets:0,pickupTickets:5,cards:Array.from({length:100},(_,i)=>({i,c:'s1'}))}};
assert.throws(()=>companionCommand(full,'companionSummon',{count:5,banner:'pickup'},ctx),/BAG_FULL/);assert.equal(full.companions.pickupTickets,5);
for(const t of ['gold','growth','jackpot']){
 const c={i:1,c:PICKUP_COMPANION.id,r:10000,t,v:t==='growth'?100:80,s:1};assert.equal(companionQuality(c),100);
 if(t==='growth'){assert.equal(companionRate(c,3600e3),12000);assert.equal(companionRate(c,5*3600e3),20000);assert.equal(slotAccrued(c,{placedAt:0,claimedAt:0},8*3600e3),7800000);}
 if(t==='gold')assert.equal(companionRate(c),18000);
}
let i=0;const seq=[.005,0,0,0,0,0];assert.notEqual(rollPickupCompanion(()=>seq[i++]??0,1).c,PICKUP_COMPANION.id);
const old={companions:{tickets:3,cards:[{i:1,c:'s1',t:'gold',v:40,r:5000,s:1}],passiveVersion:2}};normalizeCompanions(old);assert.equal(old.companions.pickupTickets,0);assert.equal(old.companions.cards[0].v,40);
console.log('PASS pickup: isolated ticket wallets, no ordinary-pool leak, persistence, bag atomicity, doubled passive production and quality');

// Exact stratified grade boundaries: total S 1%, pickup .5%, ordinary S .5%.
let pickup=0,ordinaryS=0,a=0;
for(let k=0;k<100000;k++){let first=true;const c=rollPickupCompanion(()=>{if(first){first=false;return (k+.5)/100000;}return 0;},k);if(c.c===PICKUP_COMPANION.id)pickup++;else if(c.c==='s1')ordinaryS++;else if(c.c==='a1')a++;}
assert.equal(pickup,500);assert.equal(ordinaryS,500);assert.equal(a,5000);
console.log('PASS exact pickup .5%, ordinary S .5%, total S 1%, A 5%');

const pity={companions:{tickets:0,pickupTickets:80,pickupPity:79,cards:[]}};
const missed={now:0,random:()=>.9};
assert.equal(companionCommand(pity,'companionSummon',{count:1,banner:'pickup'},missed).cards[0].c,PICKUP_COMPANION.id);
assert.equal(pity.companions.pickupPity,0);
const five={companions:{tickets:0,pickupTickets:5,pickupPity:77,cards:[]}};
const drawn=companionCommand(five,'companionSummon',{count:5,banner:'pickup'},missed).cards;
assert.equal(drawn[2].c,PICKUP_COMPANION.id);assert.equal(five.companions.pickupPity,2);
const early={companions:{pickupTickets:1,pickupPity:40,cards:[]}};
companionCommand(early,'companionSummon',{count:1,banner:'pickup'},{now:0,random:()=>0});assert.equal(early.companions.pickupPity,0);
console.log('PASS 80-pull pity, early reset, five-pull boundary');
