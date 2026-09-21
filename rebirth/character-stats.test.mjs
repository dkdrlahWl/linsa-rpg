import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {initialState,makeItem,power} from './engine.mjs';
import {CLASSES} from './data.mjs';
const ctx={now:0,uuid:randomUUID,random:()=>.5};
for(const cl of CLASSES){
 const s=initialState(cl.id,'능력치',ctx);s.level=80;
 s.items=Array.from({length:9},(_,slot)=>({...makeItem(80,cl.id,slot,true,ctx,0),stars:12,lines:[{key:'flat'+cl.stat,value:17,grade:4},{key:cl.stat,value:12,grade:4},{key:'boss',value:9,grade:4}]}));s.equipped=Object.fromEntries(s.items.map((it,i)=>[i,it.id]));
 const p=power(s);assert.equal(p.stats[cl.stat].total,p.primary);assert.equal(p.stats[cl.stat].fixed,153);assert.equal(p.bonuses[cl.stat],113);assert.equal(p.bonuses.attack,5);assert.equal(p.bonuses.boss,91);
 assert.equal(p.combatPower,Math.floor(p.dps*p.boss+p.hp*.1+p.defense*5));
 s.items[0].lines.push({key:'goldGain',value:.7,grade:4},{key:'xpGain',value:.3,grade:2});const farming=power(s);assert.equal(farming.combatPower,p.combatPower);assert.equal(farming.goldGain,.7);assert.equal(farming.xpGain,.3);
 s.items[0].lines.push({key:'attack',value:10,grade:4});assert.ok(power(s).combatPower>p.combatPower);
 s.items[0].broken=true;const broken=power(s);assert.equal(broken.stats[cl.stat].fixed,136);assert.equal(broken.goldGain,0);assert.equal(broken.bonuses.boss,72);
 s.items.push({...makeItem(80,cl.id,1,true,ctx,0),lines:[{key:cl.stat,value:999,grade:5}]});assert.deepEqual(power(s),broken);
}
console.log('PASS: all five classes, final primary consistency, flat/%/set totals, combat power, farming exclusions, broken and unequipped exclusions.');
