import assert from 'node:assert/strict';
import {COMPANION_PASSIVES,companionPassiveValueChance,rollCompanionPassiveValue,companionExpectedGold} from './companion-model.mjs';
const means={};
for(const type of Object.keys(COMPANION_PASSIVES)){
 const p=COMPANION_PASSIVES[type];let total=0,ev=0;
 for(let v=p.min;v<=p.max;v++){
  const chance=companionPassiveValueChance(type,v);total+=chance;
  if(v<p.max)assert.ok(chance>companionPassiveValueChance(type,v+1));
  ev+=chance*companionExpectedGold({i:1,c:'f1',r:10000,t:type,v,s:1});
 }
 assert.ok(Math.abs(total-1)<1e-12);means[type]=ev/4800000-1;
 assert.equal(rollCompanionPassiveValue(type,()=>0),p.min);
 assert.equal(rollCompanionPassiveValue(type,()=>.999999999),p.max);
 // Every weighted bucket's midpoint resolves to that exact value.
 let sum=0;for(let v=p.min;v<=p.max;v++){const chance=companionPassiveValueChance(type,v);assert.equal(rollCompanionPassiveValue(type,()=>sum+chance/2),v);sum+=chance;}
}
assert.ok(Math.abs(means.gold-4/15)<1e-6);
assert.ok(Math.abs(means.jackpot-means.gold)<1e-6);
assert.ok(Math.abs(means.growth-9/35)<1e-6);
assert.ok(Math.abs(means.growth-means.gold)<.01);
assert.equal(companionPassiveValueChance('gold',40),1/231);
assert.equal(companionPassiveValueChance('gold',20),21/231);
console.log('PASS descending passive odds, all 63 weighted buckets, 8h mean bonuses:',means);
