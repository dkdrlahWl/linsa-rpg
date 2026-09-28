import assert from 'node:assert/strict';
import {fixture,setLines,rotation} from './priest-balance.mjs';
import {power} from './engine.mjs';
import {CLASSES} from './data.mjs';
const priest=setLines(fixture('priest'),{hp:27});
assert.deepEqual(priest.items[0].baseStats,{hp:3088,stat:394,attack:3081,defense:155});
assert.deepEqual(priest.items[1].baseStats,{hp:3088,stat:394,attack:377,defense:155});
const hpDps=rotation(priest),others=CLASSES.filter(c=>c.id!=='priest').map(c=>rotation(setLines(fixture(c.id),{[c.stat]:27}))),ratio=hpDps/(others.reduce((a,b)=>a+b)/others.length);
assert.ok(ratio>.69&&ratio<.71,`sustained ratio ${ratio}`);
const lukDps=rotation(setLines(fixture('priest'),{LUK:27})),baseDps=rotation(setLines(fixture('priest'),{}));
assert.ok(lukDps>baseDps*1.5);assert.ok(lukDps>hpDps*.8&&lukDps<hpDps);
for(const key of ['LUK','attack','crit','boss'])for(let n=1;n<=27;n++){
 const mixed=setLines(fixture('priest'),{hp:27-n,[key]:n});
 assert.ok(rotation(mixed)<hpDps,`HP beats ${n} ${key} replacements`);
}
for(const level of [30,60,100,150,200])for(const stars of [0,15,25]){
 const hp=setLines(fixture('priest',level,stars),{hp:27}),luk=setLines(fixture('priest',level,stars),{LUK:27});
 assert.ok(power(hp).attack>power(luk).attack,`HP basic damage level ${level} stars ${stars}`);
 assert.ok(rotation(hp)>rotation(luk),`HP all skills level ${level} stars ${stars}`);
}
const withoutGearAttack=structuredClone(priest);withoutGearAttack.items.forEach(i=>i.baseStats.attack=0);
assert.ok(power(withoutGearAttack).attack<power(priest).attack);
console.log(`PASS: actual max gear, HP potential priority, meaningful LUK, weapon attack included; 180s basic+skills ratio ${(ratio*100).toFixed(2)}%`);
