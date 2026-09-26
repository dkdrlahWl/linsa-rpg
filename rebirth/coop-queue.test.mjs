import assert from 'node:assert/strict';
import {startCoop,advanceCoop,advanceCoopRaw} from './coop-model.mjs';
const power={attack:40,hp:100000,defense:100,boss:1,crit:0,critDamage:1.5,cadence:1,firstJob:true,advancement:3};
for(const mode of ['wave','rift']){
 const initial=startCoop({id:'queued',me:'p0',mode,tier:0,status:'waiting',members:['warrior','mage','archer','pirate'].map((classId,i)=>({id:'p'+i,classId,power,advanced:true}))},0);
 const frames=Array.from({length:4},(_,i)=>Array.from({length:30},(_,tick)=>({user:'p'+i,tick,input:[i%2?.3:-.3,0,1|(tick===0?32:0)]})));
 let reference=initial;for(let tick=0;tick<30;tick++)reference=advanceCoopRaw(reference,null,null,(tick+1)*100,frames.flat().filter(f=>f.tick===tick));
 const queued={...initial,_queuedInputs:frames.flat()};const result=advanceCoop(queued,'p0',{frames:[]},3000);
 for(let i=0;i<4;i++){assert.equal(result.members[i].x,reference.members[i].x);assert.equal(result.members[i].damage,reference.members[i].damage);assert.equal(result.members[i].inputAck,29);}
 assert.equal(result.hp,reference.hp);assert.ok(!result._net.points.some(p=>p._net||p._queuedInputs));
 console.log('PASS',mode,'all four queued players match reference movement and damage');
}
