import assert from 'node:assert/strict';
import {campaign} from './citadel-campaign-sim.mjs';
import {citadelStats} from './citadel-zero.mjs';
// Dohyun Lv.200 reference, solo, full NG0 campaign with a dodging bot (0.3 s reaction).
// Tuned target ≈80% clears (64-seed measurement 51/64 on 2026-10-11); assert a safe band on 8 seeds.
let wins=0;const fails=[];
for(let i=0;i<8;i++){const r=campaign(9000+i*7919);if(r.won)wins++;else fails.push(r.reached);}
assert.ok(wins>=5&&wins<=8,`solo clears ${wins}/8 (fails at ${fails})`);
for(let floor=1;floor<=21;floor++)for(const boss of [false,true])assert.equal(citadelStats(floor,4,boss).hp,citadelStats(floor,1,boss).hp*4);
console.log('PASS citadel NG0 balance: Dohyun solo campaign',wins,'/ 8 cleared; party HP scales 1-4x',{fails});
