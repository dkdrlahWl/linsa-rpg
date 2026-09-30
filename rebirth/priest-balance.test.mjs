import assert from 'node:assert/strict';
import {fixture,setLines,rotation} from './priest-balance.mjs';
import {power} from './engine.mjs';
import {PRIEST_SKILLS,priestAttack} from './priest.mjs';
// Offensive lines are no longer suppressed to 5% effectiveness.
const base=power(setLines(fixture('priest'),{}));
const attack=power(setLines(fixture('priest'),{attack:1}));
assert.ok(Math.abs(attack.attack/base.attack-1.12)<.0001);
assert.equal(power(setLines(fixture('priest'),{boss:1})).boss,1.4);
assert.ok(Math.abs(power(setLines(fixture('priest'),{crit:1})).crit-base.crit-.12)<1e-12);
assert.equal(power(setLines(fixture('priest'),{crit:27})).crit,.95);
assert.equal(priestAttack(1000,100,100,20),priestAttack(1000,100,100,0)*1.2);
let comparisons=0;
for(const level of [10,30,60,100,150,200])for(const stars of [0,15,25]){
 const s=fixture('priest',level,stars);
 for(const value of [3,6,9,12])for(const n of [1,9,27]){
  const hp=structuredClone(s),atk=structuredClone(s);
  for(const [key,state] of [['hp',hp],['attack',atk]])state.items.forEach((item,i)=>{item.lines=Array.from({length:Math.max(0,Math.min(3,n-i*3))},()=>({key,value,grade:5}));});
  const h=power(hp),a=power(atk);
  assert.ok(h.attack>a.attack,`HP basic: level ${level}, stars ${stars}, ${n}x${value}`);
  for(const sk of Object.values(PRIEST_SKILLS))assert.ok(h.attack*sk.damage+h.hp*sk.hpRatio>a.attack*sk.damage+a.hp*sk.hpRatio);
  comparisons++;
 }
 const hpDps=rotation(setLines(structuredClone(s),{hp:27}));
 for(let attack=1;attack<=27;attack++)assert.ok(rotation(setLines(structuredClone(s),{hp:27-attack,attack}))<hpDps,`HP beats attack replacement: ${level}/${stars}/${attack}`);
}
const p=setLines(fixture('priest'),{hp:27}),without=structuredClone(p);
without.items.forEach(i=>i.baseStats.attack=0);
assert.ok(power(without).attack<power(p).attack);
assert.ok(power(setLines(fixture('priest'),{LUK:1})).attack>base.attack);
console.log(`PASS: full offensive potential effects; ${comparisons} HP/attack comparisons, all skill coefficients and mixed attack replacements`);
