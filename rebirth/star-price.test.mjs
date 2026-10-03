import assert from 'node:assert/strict';
import {starCost} from './data.mjs';
import {starCost as workerStarCost} from './worker-sim/data.mjs';

for(const level of [140,150,160,170,180,190,200])for(const boss of [false,true]){
  let previous=0;
  for(let stars=0;stars<25;stars++){
    const item={level,boss,stars};
    const base=Math.round(45*(1+level/25)**1.3*(stars+1)**1.35*(1+Math.max(0,stars-15)*.5));
    const cost=starCost(item);
    assert.equal(cost,base*(boss&&level>=150?3:1));
    assert.equal(workerStarCost(item),cost);
    assert.ok(cost>previous,`${level} ${boss?'boss':'normal'} ${stars} stars must cost more than the previous step`);
    previous=cost;
  }
}
console.log('PASS: high-level boss star prices triple, other gear unchanged, all steps increase.');
