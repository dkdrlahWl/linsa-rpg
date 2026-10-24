import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {initialState,execute,power,makeLootItem,addItem} from './engine.mjs';
import {gearAttributes,gearStatRanges,MATERIALS} from './data.mjs';
import {BONUS_TABLE,rollBonusPct,BONUS_FLAME,REROLL_STONE} from './gear-refine.mjs';
import {shopConsumable} from './consumables.mjs';

// Bonus odds: 1..30, strictly decreasing, sums to 1.
assert.equal(BONUS_TABLE.length,30);assert.equal(BONUS_TABLE[0].pct,1);assert.equal(BONUS_TABLE.at(-1).pct,30);
assert.ok(Math.abs(BONUS_TABLE.reduce((a,r)=>a+r.chance,0)-1)<1e-12);
for(let i=1;i<30;i++)assert.ok(BONUS_TABLE[i].chance<BONUS_TABLE[i-1].chance);
assert.equal(rollBonusPct(()=>0),1);assert.equal(rollBonusPct(()=>.9999999999),30);
assert.equal(shopConsumable('bonusFlame').price,10_000_000);assert.equal(shopConsumable('rerollStone').price,100_000_000);
assert.equal(MATERIALS.bonusFlame,'추가옵션 불꽃');assert.equal(MATERIALS.rerollStone,'기본수치 재련석');

const ctx=(random=Math.random)=>({now:Date.now(),uuid:randomUUID,random,accountId:'t'});
const seq=v=>{let i=0;return ()=>v[i++%v.length];};
let s=initialState('warrior','불꽃테스트',ctx());s.hunting=false;
const it=makeLootItem(200,'warrior',0,true,ctx(),undefined,true);it.stars=10;addItem(s,it);s.equipped={0:it.id};
s.gold=300_000_000;

// Bonus: every equipment stat +pct% (e.g. attack 400 at 30% → +120).
const base=gearAttributes(it),boosted=gearAttributes({...it,bonusPct:30});
for(const k of ['attack','stat','hp','defense'])assert.ok(Math.abs(boosted[k]-base[k]*1.3)<1e-6,k);
assert.ok(Math.abs(gearAttributes({...it,baseStats:{...it.baseStats,attack:400},stars:0,level:150}).attack*1.3-gearAttributes({...it,baseStats:{...it.baseStats,attack:400},stars:0,level:150,bonusPct:30}).attack)<1e-6);
assert.equal(gearAttributes({...it,bonusPct:31}).attack,base.attack,'out-of-range bonus ignored');

assert.throws(()=>execute(s,'bonusRoll',{id:it.id},ctx()),/INSUFFICIENT_BONUSFLAME/);
s=execute(s,'consumableBuy',{id:'bonusFlame',quantity:2},ctx()).state;assert.equal(s.gold,280_000_000);assert.equal(s.materials.bonusFlame,2);
s=execute(s,'consumableBuy',{id:'rerollStone',quantity:1},ctx()).state;assert.equal(s.gold,180_000_000);

const p0=power(s).attack;
s=execute(s,'bonusRoll',{id:it.id},ctx(()=>.9999999)).state;assert.deepEqual(s.pendingRefine,{id:it.id,kind:'bonus',previous:0,bonusPct:30});assert.equal(s.materials.bonusFlame,1);
assert.throws(()=>execute(s,'statReroll',{id:it.id},ctx()),/ITEM_CUBE_PENDING/);
assert.throws(()=>execute(s,'shopSell',{id:it.id},ctx()),/ITEM_CUBE_PENDING/);
let kept=execute(s,'refineChoose',{apply:false},ctx()).state;assert.equal(kept.items.find(x=>x.id===it.id).bonusPct,undefined);assert.equal(kept.pendingRefine,null);
s=execute(s,'refineChoose',{apply:true},ctx()).state;assert.equal(s.items.find(x=>x.id===it.id).bonusPct,30);assert.ok(power(s).attack>p0);
// Re-roll never returns the same percent.
s=execute(s,'bonusRoll',{id:it.id},ctx(seq([.9999999,0]))).state;assert.equal(s.pendingRefine.bonusPct,1);assert.equal(s.pendingRefine.previous,30);s=execute(s,'refineChoose',{apply:false},ctx()).state;

// Stat reroll: inside the item's range, tier kept, keep/apply.
const before=structuredClone(s.items.find(x=>x.id===it.id).baseStats),tier=s.items.find(x=>x.id===it.id).bossTier;
s=execute(s,'statReroll',{id:it.id},ctx()).state;const p=s.pendingRefine;assert.equal(p.kind,'stats');assert.deepEqual(p.previous,before);assert.notDeepEqual(p.baseStats,before);
const ranges=gearStatRanges(s.items.find(x=>x.id===it.id));for(const k of Object.keys(ranges))assert.ok(p.baseStats[k]>=ranges[k].min&&p.baseStats[k]<=ranges[k].max,k);
s=execute(s,'refineChoose',{apply:true},ctx()).state;const after=s.items.find(x=>x.id===it.id);assert.deepEqual(after.baseStats,p.baseStats);assert.equal(after.bossTier,tier);assert.equal(after.bonusPct,30,'bonus survives reroll');
assert.equal(s.materials.rerollStone,0);assert.throws(()=>execute(s,'statReroll',{id:it.id},ctx()),/INSUFFICIENT_REROLLSTONE/);
assert.throws(()=>execute(s,'refineChoose',{apply:true},ctx()),/NO_PENDING_CUBE/);

// Upper values rare: rerolled attack lands in the top 10% of the range about 1% of the time.
let top=0;const n=20000;const r=gearStatRanges(after);
for(let i=0;i<n;i++){const t=execute({...s,materials:{...s.materials,rerollStone:1}},'statReroll',{id:it.id},ctx()).state.pendingRefine.baseStats.attack;if(t>=r.attack.min+.9*(r.attack.max-r.attack.min))top++;}
assert.ok(top/n<.03,String(top/n));
// Locked items are protected.
s.items.find(x=>x.id===it.id).locked=true;s.materials.bonusFlame=1;assert.throws(()=>execute(s,'bonusRoll',{id:it.id},ctx()),/ITEM_PROTECTED/);
console.log('PASS gear refine: bonus 1~30% on all stats (rarer high), 10M/100M shop, keep/apply, no repeat result, reroll within range keeping tier, pending/lock guards, power applies');
