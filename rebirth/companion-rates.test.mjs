import assert from 'node:assert/strict';
import {COMPANIONS,COMPANION_GRADES,COMPANION_GRADE_RATES,rollCompanionCharacter,rollCompanion,rollPickupCompanion,companionSummonChance,PICKUP_GRADE_RATES} from './companion-model.mjs';
const expected={'pickup-celestia':.002,s1:.008*35/180,s2:.008*65/180,s3:.008*20/180,s4:.008*16/180,s5:.008*13/180,s6:.008*10/180,s7:.008*8/180,s8:.008*7/180,'pickup-astria':.008*6/180,a1:.025,a2:.015,a3:.01,b1:.05,b2:.03,b3:.02,c1:.10,c2:.06,c3:.04,d1:.125,d2:.075,d3:.05,f1:.156,f2:.117,f3:.078,f4:.039};
for(const grade of COMPANION_GRADES){
 const defs=COMPANIONS.filter(c=>c.grade===grade),seen={};
 // Stratified draws verify all weighted intervals without sampling noise.
 for(let i=0;i<10000;i++){const c=rollCompanionCharacter(grade,()=> (i+.5)/10000);seen[c.id]=(seen[c.id]||0)+1;}
 let gradeChance=0;
 for(const c of defs){assert.ok(Math.abs(seen[c.id]-c.weight*10000/defs.reduce((sum,def)=>sum+def.weight,0))<=1);assert.ok(Math.abs(companionSummonChance(c.id)-expected[c.id])<1e-12);gradeChance+=expected[c.id];}
 assert.ok(Math.abs(gradeChance-COMPANION_GRADE_RATES[grade])<1e-12);
 assert.equal(rollCompanionCharacter(grade,()=>0).id,defs[0].id);
 assert.equal(rollCompanionCharacter(grade,()=>1-Number.EPSILON).id,defs.at(-1).id);
}
let seed=8;const random=()=>{let t=seed+=0x6d2b79f5;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
const n=500000,tally={};for(let i=0;i<n;i++){const c=rollCompanion(random,i);tally[c.c]=(tally[c.c]||0)+1;}
for(const [id,p] of Object.entries(expected))assert.ok(Math.abs((tally[id]||0)/n-p)<6*Math.sqrt(p*(1-p)/n),id);
const draw=(roll,gradeRoll)=>roll((()=>{const values=[gradeRoll,0,0,0,0];return ()=>values.shift();})(),1);
assert.equal(draw(rollCompanion,.0019999).c,'pickup-celestia');
assert.equal(draw(rollCompanion,.002).c,'s1');
assert.equal(draw(rollPickupCompanion,.0049999).c,'pickup-aurel');
assert.equal(draw(rollPickupCompanion,.005).c,'s1');
assert.equal(companionSummonChance('pickup-aurel'),0);
assert.equal(companionSummonChance('pickup-celestia','pickup'),0);
for(const g of COMPANION_GRADES){
 const sum=[...COMPANIONS,{id:'pickup-aurel',grade:'SS'}].filter(c=>c.grade===g)
  .reduce((total,c)=>total+companionSummonChance(c.id,'pickup'),0);
 assert.ok(Math.abs(sum-PICKUP_GRADE_RATES[g])<1e-12);
}
console.log('PASS companion rates: weighted normal and pickup pools, banner boundaries, 500k normal draws');
