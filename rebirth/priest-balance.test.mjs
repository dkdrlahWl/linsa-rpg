import assert from 'node:assert/strict';
import {fixture,setLines} from './priest-balance.mjs';
import {power} from './engine.mjs';
import {PRIEST_SKILLS,priestAttack,PRIEST_HP_POTENTIAL_ATTACK_RATE} from './priest.mjs';
assert.equal(PRIEST_HP_POTENTIAL_ATTACK_RATE,.7);
const base=power(setLines(fixture('priest'),{}));
const attack=power(setLines(fixture('priest'),{attack:1}));
assert.ok(Math.abs(attack.attack/base.attack-1.12)<.0001);
assert.equal(power(setLines(fixture('priest'),{boss:1})).boss,1.4);
assert.ok(Math.abs(power(setLines(fixture('priest'),{crit:1})).crit-base.crit-.12)<1e-12);
assert.equal(power(setLines(fixture('priest'),{crit:27})).crit,.95);
assert.equal(priestAttack(1000,100,100,20),priestAttack(1000,100,100,0)*1.2);
let comparisons=0;
for(const level of [10,30,60,100,150,200])for(const stars of [0,15,25]){
 const s=fixture('priest',level,stars),base=power(s);
 for(const value of [3,6,9,12])for(const n of [1,9,27]){
  const hp=structuredClone(s),atk=structuredClone(s);
  for(const [key,state] of [['hp',hp],['attack',atk]])state.items.forEach((item,i)=>{item.lines=Array.from({length:Math.max(0,Math.min(3,n-i*3))},()=>({key,value,grade:5}));});
  const h=power(hp),a=power(atk),percent=n*value/100;
  assert.ok(Math.abs(h.dps-base.dps*(1+percent*.7))<2,`HP70: ${level}/${stars}/${n}x${value}`);
  assert.ok(Math.abs(a.dps/base.dps-(1+percent))<1e-10);
  assert.ok(Math.abs(h.hp-base.hp*(1+percent))<5);
  assert.ok(h.attack<a.attack);
  comparisons++;
 }
 const mixed=structuredClone(s);mixed.items[0].lines=[{key:'hp',value:9,grade:4},{key:'attack',value:9,grade:4}];
 assert.ok(Math.abs(power(mixed).dps-base.dps*1.153)<2);
}
const p=setLines(fixture('priest'),{hp:27}),without=structuredClone(p);
without.items.forEach(i=>i.baseStats.attack=0);
assert.ok(power(without).attack<power(p).attack);
assert.ok(power(setLines(fixture('priest'),{LUK:1})).attack>base.attack);
// Preserve the earlier skill HP damage reduction.
for(const [slot,ratio] of [[1,.007],[2,.014],[3,.035],[4,.00875],[5,.013125]])assert.equal(PRIEST_SKILLS[slot].hpRatio,ratio);
console.log(`PASS: ${comparisons} HP70/attack comparisons, mixed potentials, full HP and existing skill damage coefficients`);
