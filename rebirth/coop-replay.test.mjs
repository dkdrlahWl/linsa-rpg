import assert from 'node:assert/strict';
import {startCoop,advanceCoop,predictCoopStep} from './coop-model.mjs';
const power={attack:50,hp:50000,defense:30,boss:1,crit:.3,critDamage:1.6,cadence:1,firstJob:true,advancement:3};
const fresh=()=>startCoop({id:'replay',me:'me',tier:5,status:'waiting',members:[{id:'me',classId:'mage',power,advanced:true}]},0);
const trace=Array.from({length:90},(_,tick)=>({tick,input:[tick<30?1:tick<60?-1:0,0,1|(tick%35===0?4:0)|(tick===5?32:0)]}));
let reference=fresh();for(const f of trace)reference=predictCoopStep(reference,'me',f.input);
// Server advances while inputs are delayed, then rewinds to their original ticks.
let server=fresh();
for(let tick=0;tick<90;tick+=5){const arrived=trace.filter(f=>f.tick>=tick-10&&f.tick<tick-5);server=advanceCoop(server,'me',{frames:arrived},tick*100);}
server=advanceCoop(server,'me',{frames:trace.slice(65)},9000);
const projection=w=>({tick:w.tick,hp:w.hp,enemy:w.enemy,member:w.members[0],effects:w.effects,numbers:w.numbers});
delete server.members[0].inputAck;
assert.deepEqual(projection(server),projection(reference));
const duplicate=advanceCoop(server,'me',{frames:trace.slice(65)},9000);delete duplicate.members[0].inputAck;
assert.deepEqual(projection(duplicate),projection(server));
assert.throws(()=>advanceCoop(fresh(),'me',{frames:[{tick:50,input:[1,0,4]}]},100),/FUTURE/);
assert.throws(()=>advanceCoop(fresh(),'me',{frames:[{tick:0,input:[9,0,4]}]},100),/INVALID/);
// Pressing dash starts locally and protects the same tick when replayed on server.
const hazard=fresh();hazard.members[0].x=1600;hazard.members[0].y=1800;hazard.hazards=[{x:1600,y:1800,r:250,inner:0,at:0,end:4,multiplier:2}];
const dodged=predictCoopStep(hazard,'me',[1,0,4]);assert.equal(dodged.members[0].hp,power.hp);assert.equal(dodged.members[0].x,1675);
const delayed=advanceCoop(advanceCoop(hazard,'me',{frames:[]},300),'me',{frames:[{tick:0,input:[1,0,4]},{tick:1,input:[1,0,0]},{tick:2,input:[1,0,0]}]},300);
assert.equal(delayed.members[0].hp,power.hp);
for(const [classId,range] of [['mage',560],['archer',610],['pirate',550]]){
 let room=fresh();room.members[0].classId=classId;
 for(let tick=0;tick<45;tick++){room.enemy={x:1000,y:1400};room.members[0].x=1000+range;room.members[0].y=1400;room=predictCoopStep(room,'me',[0,0,1]);}
 assert.ok(room.members[0].damage>=power.attack*2,classId+' in-flight shots must not be overwritten by the next attack');
}
console.log('PASS 500–1000ms delayed frame replay matches local movement, dash, damage and RNG; duplicate/future/malformed input guards; dodged hazard does not damage after delayed reconciliation.');

for(const [radius,inner,x] of [[250,0,1255],[900,500,1495]]){
 const room=fresh();room.enemy={x:400,y:400};Object.assign(room.members[0],{x,y:1000});room.hazards=[{x:1000,y:1000,r:radius,inner,at:0,end:4,multiplier:2}];
 assert.equal(predictCoopStep(room,'me',[0,0,0]).members[0].hp,power.hp,'visible safe boundary must match hit test');
}
