import assert from 'node:assert/strict';
import {companionCommand,companionExpectedGold,optimalCompanions} from './companion-model.mjs';
const hour=3600000,now=20*hour,ctx={now,random:()=>0};
const cards=[
 {i:1,c:'f2',r:100,t:'gold',v:40,s:1},
 {i:2,c:'f2',r:110,t:'jackpot',v:30,s:1},
 {i:3,c:'f2',r:110,t:'growth',v:50,s:1},
 {i:4,c:'f3',r:115,t:'gold',v:20,s:1},
];
// Jackpot EV beats a larger displayed gold rate; fresh growth must ramp up.
assert.equal(companionExpectedGold(cards[0]),67200);
assert.equal(companionExpectedGold(cards[1]),68640);
assert.equal(companionExpectedGold(cards[2]),62040);
assert.equal(companionExpectedGold(cards[2],10*hour),79200);
assert.deepEqual(optimalCompanions(cards,[],now).map(x=>x.card.i),[2,1,4]);
assert.deepEqual(optimalCompanions(cards,[{card:3,placedAt:now-10*hour,claimedAt:now-hour}],now).map(x=>x.card.i),[3,2,1]);
const retained={card:3,placedAt:now-10*hour,claimedAt:now-hour};
const s={gold:0,companions:{passiveVersion:2,cards:[...cards,{i:5,c:'f1',r:70,t:'gold',v:40,s:5},{i:6,c:'f1',r:50,t:'jackpot',v:30,s:1}],slots:[{...retained},{card:6,placedAt:now-2*hour,claimedAt:now-2*hour},null],tickets:0}};
const beforeCards=structuredClone(s.companions.cards);
let e=companionCommand(s,'companionAutoEquip',{},ctx);
assert.deepEqual(e.ids,[3,5,2]);assert.equal(e.changed,2);assert.equal(new Set(s.companions.slots.map(x=>x.card)).size,3);
assert.deepEqual(s.companions.slots[0],retained);assert.deepEqual(s.companions.cards,beforeCards);
assert.equal(e.claims.length,1);assert.equal(e.claims[0].card,6);assert.equal(e.claims[0].gold,12000);assert.equal(s.gold,12000);
const beforeSlots=structuredClone(s.companions.slots);
e=companionCommand(s,'companionAutoEquip',{},ctx);
assert.equal(e.changed,0);assert.deepEqual(e.claims,[]);assert.deepEqual(s.companions.slots,beforeSlots);assert.equal(s.gold,12000);
const lone={gold:0,companions:{passiveVersion:2,cards:[cards[0]],slots:[],tickets:0}};
companionCommand(lone,'companionAutoEquip',{},ctx);assert.equal(lone.companions.slots.filter(Boolean).length,1);
assert.throws(()=>companionCommand({gold:0},'companionAutoEquip',{},ctx),/COMPANION_NOT_FOUND/);
// Five-pull consumes exactly five tickets and requires five inventory places.
const pulls={gold:0,companions:{passiveVersion:2,cards:[],slots:[],tickets:6}};
assert.equal(companionCommand(pulls,'companionSummon',{count:5},ctx).cards.length,5);assert.equal(pulls.companions.tickets,1);
assert.throws(()=>companionCommand(pulls,'companionSummon',{count:5},ctx),/COMPANION_NO_TICKET/);
assert.equal(companionCommand(pulls,'companionSummon',{count:1},ctx).cards.length,1);assert.equal(pulls.companions.tickets,0);
for(const count of [10,0,-1,1.5,'5'])assert.throws(()=>companionCommand(pulls,'companionSummon',{count},ctx),/INVALID_SUMMON_COUNT/);
const full={gold:0,companions:{passiveVersion:2,cards:Array.from({length:96},(_,i)=>({...cards[0],i:i+1})),slots:[],tickets:5}};
assert.throws(()=>companionCommand(full,'companionSummon',{count:5},ctx),/COMPANION_BAG_FULL/);assert.equal(full.companions.tickets,5);
console.log('PASS optimal companions: 8h EV, jackpot, growth ramp/current age, stars, preserved timers, replacement payout, idempotence, exact five-pull cost/capacity');
