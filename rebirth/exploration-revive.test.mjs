// 2026-10-25: a member who died during Ringu exploration is revived when the party wins, so they can open their chest.
import assert from 'node:assert/strict';
import {startCoop,advanceCoopRaw} from './coop-model.mjs';
import {explorationProgress} from './exploration-data.mjs';
const power={attack:5e4,hp:1e5,defense:2000,crit:.3,critDamage:1.6,boss:3,cadence:1,advancement:4,firstJob:true,level:200};
let w=startCoop({id:'r',owner:'a',mode:'exploration',tier:4,status:'waiting',members:['a','b','c'].map((id,i)=>({id,name:id,classId:['warrior','mage','archer'][i],advanced:true,power:{...power}}))},1000);
w.entryWaiting=false;w.members[1].hp=0;w.members[2].left=true;w.members[2].hp=0;
w.monsters=[];w.exitOpen=false;explorationProgress(w);
assert.equal(w.status,'won');assert.ok(w.chest);
assert.equal(w.members[1].hp,Math.round(power.hp*.3),'dead member revived at 30%');assert.equal(w.members[2].hp,0,'left member stays out');assert.equal(w.members[0].hp>0,true);
// Revived member can walk to the chest during loot time.
const before={x:w.members[1].x,y:w.members[1].y};
for(let t=0;t<10;t++)w=advanceCoopRaw(w,null,null,(w.lootStarted??w.lootAt)+(w.tick+1)*100,[{user:'b',tick:w.tick,input:[1,0,0]}],true);
assert.ok(Math.hypot(w.members[1].x-before.x,w.members[1].y-before.y)>0,'revived member moves');
console.log('PASS exploration win revives fallen members (30% HP) so they can reach the chest; left members excluded');
