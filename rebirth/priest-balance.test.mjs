import assert from 'node:assert/strict';
import {fixture,setLines} from './priest-balance.mjs';
import {power} from './engine.mjs';
import {PRIEST_SKILLS,PRIEST_ATTACK_RATE,PRIEST_PARTY_ATTACK_BUFF} from './priest.mjs';
import {bestBuild} from './class-dps-sim.mjs';
import {CLASSES} from './data.mjs';
// Priest remake: same attack formula and combat power as other jobs; only skill coefficients are lower.
assert.equal(PRIEST_ATTACK_RATE,1);assert.equal(PRIEST_PARTY_ATTACK_BUFF,1.05);
const base=power(setLines(fixture('priest'),{}));
assert.ok(Math.abs(power(setLines(fixture('priest'),{attack:1})).attack/base.attack-1.12)<1e-4);
assert.equal(power(setLines(fixture('priest'),{boss:1})).boss,1.4);
assert.ok(Math.abs(power(setLines(fixture('priest'),{crit:1})).crit-base.crit-.12)<1e-12);
let comparisons=0;
for(const level of [10,30,60,100,150,200])for(const stars of [0,15,25]){
 const s=fixture('priest',level,stars),b=power(s);
 for(const value of [3,6,9,12])for(const n of [1,9,27]){
  const hp=structuredClone(s),atk=structuredClone(s);
  for(const [key,state] of [['hp',hp],['attack',atk]])state.items.forEach((item,i)=>{item.lines=Array.from({length:Math.max(0,Math.min(3,n-i*3))},()=>({key,value,grade:5}));});
  const h=power(hp),a=power(atk),percent=n*value/100;
  assert.ok(Math.abs(h.dps-b.dps)<1e-6,`HP% must not raise priest damage: ${level}/${stars}/${n}x${value}`);
  assert.ok(Math.abs(a.dps/b.dps-(1+percent))<1e-10);
  assert.ok(Math.abs(h.hp-b.hp*(1+percent))<10);
  comparisons++;
 }
}
assert.ok(power(setLines(fixture('priest'),{LUK:1})).attack>base.attack);
for(const slot of [1,2,3,4,5])assert.equal(PRIEST_SKILLS[slot].hpRatio,0,'no max-HP damage');
// Damage target: 80~90% of the other jobs' average from level 60 (level 30 ≤ 91%), and always below the weakest job.
for(const opts of [{level:30,stars:10},{level:60,stars:12},{level:100,stars:15},{level:150,stars:17},{level:200,stars:20},{level:200,stars:25}]){
 const rows=CLASSES.map(c=>bestBuild(c.id,opts)),others=rows.filter(r=>r.classId!=='priest'),avg=others.reduce((n,r)=>n+r.dps,0)/others.length,min=Math.min(...others.map(r=>r.dps)),priest=rows.find(r=>r.classId==='priest').dps;
 assert.ok(priest/avg>=.8&&priest/avg<=(opts.level<60?.91:.9),`priest/avg ${opts.level}: ${(priest/avg).toFixed(3)}`);
 assert.ok(priest/min<.96,`priest/weakest ${opts.level}: ${(priest/min).toFixed(3)}`);
}
console.log(`PASS: ${comparisons} HP/attack potential comparisons, standard priest formula, no HP damage, skill-only 80~90% damage at six stages`);
