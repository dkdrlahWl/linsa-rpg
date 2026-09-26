import assert from 'node:assert/strict';
import {CoopMotion} from './coop-motion.mjs';
import {startCoop,advanceCoop} from './coop-model.mjs';
const m=new CoopMotion(),actor={id:'me',x:1000,y:1000},room={me:'me',members:[actor],enemy:{x:1600,y:1600}};
m.accept(room,1);
let last=1000;
// A delayed response must not freeze at 500ms or rewind the moving player.
for(let now=17;now<1500;now+=16){
 if(now===657)m.accept({...room,members:[{...actor,x:1100}]},now,600);
 const p=m.local('me',actor,[1,0,0],16,now,250);
 assert.ok(p.x>last);assert.ok(p.x-last<6);last=p.x;
}
assert.ok(last>1300);
// Remote snapshot arrival must not change the displayed coordinate instantly.
const before=m.remote('enemy',room.enemy,1500);
m.accept({...room,enemy:{x:1900,y:1600}},1501);
assert.equal(m.remote('enemy',room.enemy,1501).x,before.x);
assert.ok(m.remote('enemy',room.enemy,1650).x>before.x);
const power={attack:1,hp:10000,defense:0,boss:1,crit:0,critDamage:1,cadence:1,firstJob:false};
let w=startCoop({tier:0,status:'waiting',members:[{id:'me',classId:'warrior',power}]},0);
w=advanceCoop(w,'me',[1,0,0],0);const x=w.members[0].x;
w=advanceCoop(w,'me',[1,0,0],1200);assert.equal(w.members[0].x-x,300);
// A disconnected player still stops: the input has a finite lifetime.
w=advanceCoop(w,'me',null,6000);assert.ok(w.members[0].x<3080);
console.log('PASS delayed input catch-up, 1.5s smooth prediction, no rewind or remote snap, stale input expiry');
