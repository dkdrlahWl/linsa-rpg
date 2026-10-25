import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {initialState,execute,power,makeLootItem,addItem} from './engine.mjs';
import {gearAttributes,gearStatRanges,gearStatFullRanges,isTieredBossGear,bossTierCount,equipmentKey,MATERIALS} from './data.mjs';
import {BONUS_TABLE,rollBonusPct,BONUS_FLAME,REROLL_STONE} from './gear-refine.mjs';
import {shopConsumable} from './consumables.mjs';

// Bonus odds: 1..30, strictly decreasing, sums to 1.
assert.equal(BONUS_TABLE.length,10);assert.equal(BONUS_TABLE[0].pct,1);assert.equal(BONUS_TABLE.at(-1).pct,10);assert.ok(BONUS_TABLE.at(-1).chance<.005);
assert.ok(Math.abs(BONUS_TABLE.reduce((a,r)=>a+r.chance,0)-1)<1e-12);
for(let i=1;i<10;i++)assert.ok(BONUS_TABLE[i].chance<BONUS_TABLE[i-1].chance);
assert.equal(rollBonusPct(()=>0),1);assert.equal(rollBonusPct(()=>.9999999999),10);
assert.equal(shopConsumable('bonusFlame').price,10_000_000);assert.equal(shopConsumable('rerollStone').price,100_000_000);
assert.equal(MATERIALS.bonusFlame,'추가옵션 불꽃');assert.equal(MATERIALS.rerollStone,'기본수치 재련석');

const ctx=(random=Math.random)=>({now:Date.now(),uuid:randomUUID,random,accountId:'t'});
const seq=v=>{let i=0;return ()=>v[i++%v.length];};
let s=initialState('warrior','불꽃테스트',ctx());s.hunting=false;
const it=makeLootItem(200,'warrior',0,true,ctx(),undefined,true);it.stars=10;addItem(s,it);s.equipped={0:it.id};
s.gold=300_000_000;

// Bonus: every equipment stat +pct% (e.g. attack 400 at 10% → +40).
const base=gearAttributes(it),boosted=gearAttributes({...it,bonusPct:10});
for(const k of ['attack','stat','hp','defense'])assert.ok(Math.abs(boosted[k]-base[k]*1.1)<1e-6,k);
assert.equal(gearAttributes({...it,bonusPct:11}).attack,base.attack,'out-of-range bonus ignored');

assert.throws(()=>execute(s,'bonusRoll',{id:it.id},ctx()),/INSUFFICIENT_BONUSFLAME/);
s=execute(s,'consumableBuy',{id:'bonusFlame',quantity:2},ctx()).state;assert.equal(s.gold,280_000_000);assert.equal(s.materials.bonusFlame,2);
s=execute(s,'consumableBuy',{id:'rerollStone',quantity:1},ctx()).state;assert.equal(s.gold,180_000_000);

const p0=power(s).attack;
s=execute(s,'bonusRoll',{id:it.id},ctx(()=>.9999999)).state;assert.deepEqual(s.pendingRefine,{id:it.id,kind:'bonus',previous:0,bonusPct:10});assert.equal(s.materials.bonusFlame,1);
assert.throws(()=>execute(s,'statReroll',{id:it.id},ctx()),/ITEM_CUBE_PENDING/);
assert.throws(()=>execute(s,'shopSell',{id:it.id},ctx()),/ITEM_CUBE_PENDING/);
let kept=execute(s,'refineChoose',{apply:false},ctx()).state;assert.equal(kept.items.find(x=>x.id===it.id).bonusPct,undefined);assert.equal(kept.pendingRefine,null);
s=execute(s,'refineChoose',{apply:true},ctx()).state;assert.equal(s.items.find(x=>x.id===it.id).bonusPct,10);assert.ok(power(s).attack>p0);
// Re-roll never returns the same percent.
s=execute(s,'bonusRoll',{id:it.id},ctx(seq([.9999999,0]))).state;assert.equal(s.pendingRefine.bonusPct,1);assert.equal(s.pendingRefine.previous,10);s=execute(s,'refineChoose',{apply:false},ctx()).state;

// Stat reroll: tiered boss gear re-rolls its tier too (whole range), keep/apply.
const before=structuredClone(s.items.find(x=>x.id===it.id).baseStats),tier=s.items.find(x=>x.id===it.id).bossTier;
s=execute(s,'statReroll',{id:it.id},ctx()).state;const p=s.pendingRefine;assert.equal(p.kind,'stats');assert.deepEqual(p.previous,before);assert.notDeepEqual(p.baseStats,before);
const tiered=isTieredBossGear(s.items.find(x=>x.id===it.id));assert.equal(Number.isInteger(p.bossTier),tiered);
const ranges=gearStatRanges({...s.items.find(x=>x.id===it.id),...(tiered?{bossTier:p.bossTier}:{})});for(const k of Object.keys(ranges))assert.ok(p.baseStats[k]>=ranges[k].min&&p.baseStats[k]<=ranges[k].max,k);
s=execute(s,'refineChoose',{apply:true},ctx()).state;const after=s.items.find(x=>x.id===it.id);assert.deepEqual(after.baseStats,p.baseStats);assert.equal(after.bossTier,tiered?p.bossTier:tier);if(tiered)assert.ok(s.collection.includes(equipmentKey(after)),'new tier recorded in collection');assert.equal(after.bonusPct,10,'bonus survives reroll');
assert.equal(s.materials.rerollStone,0);assert.throws(()=>execute(s,'statReroll',{id:it.id},ctx()),/INSUFFICIENT_REROLLSTONE/);
assert.throws(()=>execute(s,'refineChoose',{apply:true},ctx()),/NO_PENDING_CUBE/);

// Uniform: rerolled attack lands in the top 10% of the range about 10% of the time.
let top=0,low=0;const n=20000;const r=gearStatFullRanges(after);const tiers=new Set();
for(let i=0;i<n;i++){const pr=execute({...s,materials:{...s.materials,rerollStone:1}},'statReroll',{id:it.id},ctx()).state.pendingRefine,t=pr.baseStats.attack;tiers.add(pr.bossTier);if(t>=r.attack.min+.9*(r.attack.max-r.attack.min))top++;if(t<r.attack.min+.1*(r.attack.max-r.attack.min))low++;}
if(isTieredBossGear(after))assert.equal(tiers.size,bossTierCount(after),'every tier reachable');assert.ok(low/n>.08&&low/n<.13,'low '+low/n);
assert.ok(top/n>.08&&top/n<.13,String(top/n));
// Locked items are protected.
s.items.find(x=>x.id===it.id).locked=true;s.materials.bonusFlame=1;assert.throws(()=>execute(s,'bonusRoll',{id:it.id},ctx()),/ITEM_PROTECTED/);
console.log('PASS gear refine: bonus 1~10% on all stats (rarer high), 10M/100M shop, keep/apply, no repeat result, uniform reroll over the whole tier range (tier re-rolled), pending/lock guards, power applies');
