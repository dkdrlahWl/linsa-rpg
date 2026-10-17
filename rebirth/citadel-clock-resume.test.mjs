import assert from 'node:assert/strict';
import {startCoop,advanceCoop,advanceCoopRaw} from './coop-model.mjs';
import {explorationFloor} from './exploration-data.mjs';
function room(floor){
 const w=startCoop({id:'resume',owner:'p0',mode:'citadel',tier:0,status:'waiting',members:['mage','warrior','archer','priest'].map((classId,i)=>({id:'p'+i,classId,advanced:true,power:{attack:1,hp:1e9,defense:1e9,boss:1,crit:0,critDamage:1.6,cadence:1,firstJob:true,advancement:4,level:200}}))},0);
 w.entryWaiting=false;w.floor=floor;explorationFloor(w);w.tick=281;w.cleared=floor-1;
 for(const m of w.members){m.entryMoved=true;m.input=[0,0,0];}
 return w;
}
for(const floor of [2,16,21]){
 const initial=room(floor),claimBefore=initial.members.map(m=>m.citadelChests);
 const future=Array.from({length:4},(_,i)=>({user:'p'+i,tick:298,input:[.3,0,0]}));
 let w=advanceCoop({...initial,_queuedInputs:future},'p0',{frames:[{tick:298,input:[.3,0,0]}]},128100);
 assert.equal(w.tick,282,'resume advances without simulating the whole idle gap');
 assert.equal(w.status,'fighting');assert.equal(w.floor,floor);
 assert.ok(w.members.every(m=>!m.left&&m.hp>0));
 assert.deepEqual(w.members.map(m=>m.citadelChests),claimBefore,'no reward is opened by recovery');
 assert.ok(w.members.every(m=>(m.inputAck??-1)<298),'deferred frames remain eligible for resend');
 for(let step=2;step<=25;step++)w=advanceCoop({...w,_queuedInputs:[...future,...future]},'p0',{frames:[]},128000+step*100);
 assert.equal(w.tick,306);assert.ok(w.members.every(m=>m.inputAck===298),'all four queued inputs are eventually accepted');
 assert.equal(w._net.frames.filter(f=>f.tick===298).length,4,'duplicate delivery cannot duplicate frame execution');
 const before=JSON.stringify(w);advanceCoop(w,'p0',{frames:[]},130600);assert.equal(JSON.stringify(w),before,'input world remains immutable');
 assert.throws(()=>advanceCoop({...initial,_queuedInputs:[{user:'p1',tick:initial.tick+31,input:[0,0,0]}]},'p0',{frames:[]},128100),/INVALID_COOP_FUTURE/,'prediction window stays bounded');
}
console.log('PASS citadel idle resume: 4 players, 3 floors, deferred and duplicated input retained, forward progress, rewards/membership preserved, future bound enforced');
