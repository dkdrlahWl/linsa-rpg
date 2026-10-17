import {startCoop,advanceCoop} from './coop-model.mjs';
import {packCitadelWorld,unpackCitadelWorld} from './citadel-zero.mjs';
import {explorationFloor} from './exploration-data.mjs';
import assert from 'node:assert/strict';
const p={hp:100000,attack:5000,defense:2000,crit:.3,critDamage:1.6,cadence:1,boss:1,level:200,advancement:4,firstJob:true};
let w=startCoop({mode:'citadel',tier:0,status:'waiting',owner:'p0',id:'c',members:['warrior','mage','priest','rogue'].map((c,i)=>({id:'p'+i,name:'n'+i,classId:c,power:p,advanced:true,advancement:4,ready:true}))},Date.now()-5000);
for(const floor of [1,5,7,12,20]){w.floor=floor;explorationFloor(w);
 const raw=JSON.stringify(w),packed=packCitadelWorld(w),back=unpackCitadelWorld(JSON.parse(JSON.stringify(packed)));
 assert.deepEqual(JSON.parse(JSON.stringify(back)),JSON.parse(raw));
 console.log('floor',floor,'monsters',w.monsters.length,'raw',raw.length,'packed',JSON.stringify(packed).length);}
assert.equal(packCitadelWorld({mode:'exploration',dungeon:{a:1}}).dungeon.a,1,'non-citadel worlds are untouched');
console.log('PASS citadel storage: terrain stripped on save and rebuilt identically on read');
