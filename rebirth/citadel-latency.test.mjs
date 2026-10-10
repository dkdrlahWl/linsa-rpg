import assert from 'node:assert/strict';
import {startCoop,advanceCoop,coopClientView} from './coop-model.mjs';
import {explorationFloor} from './exploration-data.mjs';
let peakBytes=0,packets=0;const started=performance.now();
for(const floor of [1,13,21]){
 let w=startCoop({id:'soak',owner:'p0',mode:'citadel',tier:0,status:'waiting',members:['warrior','mage','archer','priest'].map((classId,i)=>({id:'p'+i,classId,advanced:true,power:{attack:1,hp:1e9,defense:1e9,boss:1,crit:.3,critDamage:1.6,cadence:1,firstJob:true,advancement:4,level:200}}))},0);
 w.entryWaiting=false;w.floor=floor;explorationFloor(w);for(const e of w.monsters){e.hp*=100;e.maxHp*=100;}w.maxHp=w.monsters.reduce((n,e)=>n+e.maxHp,0);w.hp=w.maxHp; // Keep all encounter actors alive for the full network soak.
 for(const [i,m] of w.members.entries()){m.entryMoved=true;m.x=w.monsters[0].x+(i%2)*120;m.y=w.monsters[0].y+150+Math.floor(i/2)*100;}
 for(let tick=6;tick<=1800;tick+=6){
  const frames=[];for(let i=0;i<4;i++){const delay=[2,5,8,11][i];for(let t=Math.max(0,tick-delay-12);t<tick-delay;t++)frames.push({user:'p'+i,tick:t,input:[t%60<30?.15:-.15,i%2?.1:0,1|(t%60===0?122:0)]});}
  w=advanceCoop({...w,_queuedInputs:[...frames.reverse(),...frames.slice(0,4)]},'p0',{frames:[]},tick*100);packets+=4;assert.equal(w.tick,tick,JSON.stringify({floor,at:tick,status:w.status,reason:w.reason,hp:w.members.map(m=>m.hp),stage:w.floor}));assert.ok(w._net.points.length<=6);assert.ok(w._net.frames.length<=4*46);
  const view=coopClientView({...w,me:'p0'},2);assert.equal(view._net,undefined);assert.equal(view._queuedInputs,undefined);peakBytes=Math.max(peakBytes,JSON.stringify(view).length);assert.equal(w.status,'fighting');
 }
}
console.log('PASS citadel 4 players, 9 simulated minutes, 0.2–1.1s delayed/duplicated/reordered input',{packets,peakBytes,seconds:((performance.now()-started)/1000).toFixed(2)});
