import assert from 'node:assert/strict';
import {CoopMotion,motionSnapshot,interpolateActor} from './coop-motion.mjs';
import {startCoop,predictCoopStep} from './coop-model.mjs';
import {spawnWave} from './wave-model.mjs?v=field-fragment-13';
// A received snapshot can correct any actor by a large amount without moving
// its first displayed frame. Subsequent corrections have a bounded velocity.
for(const local of [false,true]){
 const motion=new CoopMotion();let actor={x:1000,y:1000};motion.begin(1);motion.sample('a',actor,local);motion.end();
 motion.reconcile();actor={x:1800,y:600};motion.begin(17);let previous=motion.sample('a',actor,local);motion.end();assert.deepEqual([previous.x,previous.y],[1000,1000]);
 for(let now=33;now<5017;now+=16){motion.begin(now);const next=motion.sample('a',actor,local);motion.end();assert.ok(Math.hypot(next.x-previous.x,next.y-previous.y)<=(local?300:500)*.016+.000001);previous=next;}
 assert.ok(Math.hypot(previous.x-actor.x,previous.y-actor.y)<1);
 motion.begin(5100);motion.end();assert.equal(motion.points.size,0);
}
// Normal movement / a legitimate dash is not low-pass filtered. Opposite
// direction corrections do not turn an input into a position jump.
const motion=new CoopMotion();motion.begin(1);motion.sample('me',{x:1200,y:1200},true);motion.end();
motion.begin(17);assert.equal(motion.sample('me',{x:1212,y:1200},true).x,1212);motion.end();
assert.equal(interpolateActor({x:1300,y:1100},{x:1000,y:1000},.5).x,1150);
const power={attack:2,hp:1e8,defense:100,boss:1,crit:.3,critDamage:1.6,cadence:1,firstJob:true,advancement:3};
const fresh=mode=>startCoop({id:'smooth',me:'0',mode,tier:3,status:'waiting',members:Array.from({length:4},(_,i)=>({id:String(i),classId:'warrior',power,advanced:true}))},10000);
// Full copy and owned prediction produce identical gameplay. Position snapshots
// must not alias the world being advanced in place.
for(const mode of ['wave','rift']){
 let reference=fresh(mode),owned=structuredClone(reference);
 for(let tick=0;tick<120;tick++){
  const snapshot=motionSnapshot(owned),saved=structuredClone(snapshot),input=[tick%40<20?1:-1,0,1|(tick%35===0?4:0)];
  reference=predictCoopStep(reference,'0',input);owned=predictCoopStep(owned,'0',input,true);
  assert.deepEqual(owned,reference);assert.deepEqual(snapshot,saved);
 }
}
// Replaying additional attacks must not renumber or relocate future spawns.
const a=fresh('wave'),b=structuredClone(a);b.serial+=700;b.seed=1234567;
spawnWave(a);spawnWave(b);
assert.deepEqual(a.spawnCounts,b.spawnCounts);assert.deepEqual(a.monsters,b.monsters);
assert.equal(new Set(a.monsters.map(m=>m.id)).size,a.monsters.length);
// Repeated jitter and corrections with 4 players + 100 monsters stay bounded.
const crowd=new CoopMotion();let last=new Map();
for(let frame=0;frame<600;frame++){
 if(frame%17===0)crowd.reconcile();crowd.begin(frame*16+1);
 for(let i=0;i<104;i++){
  const p=crowd.sample(String(i),{x:1400+Math.sin(Math.floor(frame/17)*.8+i)*150,y:1400+Math.cos(i)*150},i<4);
  if(last.has(i))assert.ok(Math.hypot(p.x-last.get(i).x,p.y-last.get(i).y)<=8.000001);
  last.set(i,p);
 }
 crowd.end();assert.equal(crowd.points.size,104);
}
console.log('PASS snapshot correction continuity, bounded recovery, immediate input, dash interpolation, 4-player/100-monster jitter, stable spawns and exact owned-prediction parity');
