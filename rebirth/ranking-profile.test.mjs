import assert from 'node:assert/strict';
import {initialState,power} from './engine.mjs';
import {COSTUMES} from './costumes.mjs';
import {rankingProfile} from './ranking-profile.mjs';
let n=0;const ctx={now:Date.now(),random:()=>.5,uuid:()=>String(++n)};
for(const costume of COSTUMES){
 const s=initialState(costume.classId,'정보검증',ctx);
 s.costumes=[costume.id];s.equippedCostume=costume.id;
 s.gold=123456;s.privateSecret='must not return';
 const before=JSON.stringify(s),p=power(s),result=rankingProfile(s,{id:'public-user',arenaRank:7});
 assert.equal(result.costumeId,costume.id);assert.equal(result.arenaRank,7);
 assert.equal(result.metrics.combatPower,p.combatPower);assert.equal(result.metrics.attack,p.attack);
 assert.deepEqual(Object.keys(result).sort(),['id','name','classId','costumeId','arenaRank','metrics'].sort());
 assert(!JSON.stringify(result).includes('must not return'));assert(!('items' in result));assert(!('gold' in result));
 assert.equal(JSON.stringify(s),before);
 s.equippedCostume=null;assert.equal(rankingProfile(s,{}).costumeId,null);
 assert.equal(rankingProfile(s,{}).arenaRank,null);
}
console.log('PASS public ranking profile: exact combat stats, all costumes, unequip/unranked fallback, no inventory/private fields, no mutation');
