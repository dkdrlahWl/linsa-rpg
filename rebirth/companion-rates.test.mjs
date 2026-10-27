import assert from 'node:assert/strict';
import {COMPANIONS,COMPANION_GRADES,COMPANION_GRADE_RATES,rollCompanionCharacter,rollCompanion,companionSummonChance} from './companion-model.mjs';
const expected={s1:.0035,s2:.0065,a1:.025,a2:.015,a3:.01,b1:.05,b2:.03,b3:.02,c1:.10,c2:.06,c3:.04,d1:.125,d2:.075,d3:.05,f1:.156,f2:.117,f3:.078,f4:.039};
for(const grade of COMPANION_GRADES){
 const defs=COMPANIONS.filter(c=>c.grade===grade),seen={};
 // Stratified draws verify all weighted intervals without sampling noise.
 for(let i=0;i<10000;i++){const c=rollCompanionCharacter(grade,()=> (i+.5)/10000);seen[c.id]=(seen[c.id]||0)+1;}
 let gradeChance=0;
 for(const c of defs){assert.equal(seen[c.id],c.weight*100);assert.ok(Math.abs(companionSummonChance(c.id)-expected[c.id])<1e-12);gradeChance+=expected[c.id];}
 assert.ok(Math.abs(gradeChance-COMPANION_GRADE_RATES[grade])<1e-12);
 const ordered=defs.toSorted((a,b)=>(a.min+a.max)-(b.min+b.max));
 for(let i=1;i<ordered.length;i++)assert.ok(ordered[i].weight<ordered[i-1].weight);
 assert.equal(rollCompanionCharacter(grade,()=>0).id,defs[0].id);
 assert.equal(rollCompanionCharacter(grade,()=>1-Number.EPSILON).id,defs.at(-1).id);
}
let seed=8;const random=()=>{let t=seed+=0x6d2b79f5;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
const n=500000,tally={};for(let i=0;i<n;i++){const c=rollCompanion(random,i);tally[c.c]=(tally[c.c]||0)+1;}
for(const [id,p] of Object.entries(expected))assert.ok(Math.abs((tally[id]||0)/n-p)<6*Math.sqrt(p*(1-p)/n),id);
console.log('PASS companion weighted rates: 18 exact probabilities, stronger means rarer in every grade, 500k end-to-end draws');
