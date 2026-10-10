import assert from 'node:assert/strict';
import {startCoop,advanceCoop,advanceCoopRaw,coopClientView} from './coop-model.mjs';
import {CoopPredictionCore} from './coop-prediction-core.mjs';
import {explorationFloor} from './exploration-data.mjs';
const power={attack:100,hp:10000,defense:50,crit:0,critDamage:1.5,boss:1,cadence:1,firstJob:true,level:200};
for(const mode of ['rift','raid','wave','advancement','exploration'])for(const delay of [3,12]){
 let room=startCoop({id:mode,tier:0,mode,me:'p',owner:'p',status:'waiting',members:[{id:'p',name:'p',classId:'warrior',power},{id:'q',name:'q',classId:'mage',power}]},1000);
 room.entryWaiting=false;if(mode==='exploration'){room.floor=10;explorationFloor(room);}
 Object.assign(room,{status:'won',tick:0,lootAt:1000,lootStarted:1000,effects:[],hazards:[],projectiles:[],numbers:[],monsters:[]});
 for(const m of room.members)Object.assign(m,{x:1600,y:1600,input:[0,0,0],inputAt:1000,inputAck:-1});
 const core=new CoopPredictionCore();core.reset({room});let reference=structuredClone(room),frames=[];
 for(let tick=0;tick<120;tick++){
  const input=tick%32<8?[1,0,0]:tick%32<16?[-1,0,0]:tick%32<24?[0,1,0]:[0,0,0];
  frames.push({tick,input});core.step(tick,input);
  reference=advanceCoopRaw(reference,null,null,1000+(tick+1)*100,[{user:'p',tick,input}]);
  if(tick%4===3){
   room=advanceCoop(room,'p',{frames:frames.filter(f=>f.tick<=tick-delay&&f.tick>(room.members[0].inputAck??-1)).slice(-35)},1000+(tick+1)*100);
   const result=core.reset({room:coopClientView(room,2),frames,target:tick+1}).world;
   assert.equal(result.tick,tick+1,mode+' replay reaches local tick');
   assert.ok(Math.hypot(result.members[0].x-reference.members[0].x,result.members[0].y-reference.members[0].y)<1e-6,mode+' preserves movement through delayed responses');
   assert.equal(result.status,'won');
  }
 }
 room=advanceCoop(room,'p',{frames:frames.filter(f=>f.tick>(room.members[0].inputAck??-1)).slice(-35)},13000);
 assert.deepEqual([room.members[0].x,room.members[0].y],[reference.members[0].x,reference.members[0].y]);
}
console.log('PASS post-clear input acknowledgement and replay in all five multiplayer modes at 300/1200ms latency, reversals, stops and server convergence');
