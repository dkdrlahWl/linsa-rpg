import assert from 'node:assert/strict';
import {startCoop,advanceCoop,predictCoopStep} from './coop-model.mjs';
import {waveStats,spawnWave,advanceWaveRaw} from './wave-model.mjs';
const p={attack:40,hp:10000,defense:10,boss:1,crit:.1,critDamage:1.5,cadence:1,firstJob:false,advancement:0};
const fresh=(count=4)=>startCoop({id:'wave',mode:'wave',me:'p0',tier:0,status:'waiting',members:Array.from({length:count},(_,i)=>({id:'p'+i,name:'모험가'+i,classId:'warrior',power:{...p},advanced:false}))},0);
const step=(w,inputs={})=>advanceWaveRaw(w,null,null,w.started+(w.tick+1)*100,Object.entries(inputs).map(([user,input])=>({user,input,tick:w.tick})));
let w=fresh();assert.equal(w.wave,1);assert.equal(w.nextWave,300);assert.equal(w.monsters.filter(e=>e.elite).length,1);assert.ok(w.spawnCounts.every(n=>n>=5&&n<=10));
assert.equal(waveStats(1).level,2);assert.equal(waveStats(300).species,29);assert.equal(waveStats(301).species,0);assert.equal(waveStats(10).species,0);assert.equal(waveStats(11).species,1);assert.equal(waveStats(20).eliteCount,2);assert.equal(waveStats(21).eliteCount,3);assert.equal(waveStats(201).level,402);
w.tick=299;w.monsters=[];w=step(w);assert.equal(w.wave,1);w=step(w);assert.equal(w.wave,2);
w=fresh();w.monsters=Array.from({length:99},()=>({...w.monsters[0]}));spawnWave(w);assert.equal(w.status,'lost');assert.equal(w.reason,'overrun');
w=fresh();w.members.forEach(m=>m.hp=0);assert.equal(step(w).reason,'dead');
w=fresh(2);w.monsters=[];Object.assign(w.members[1],{hp:0,x:w.members[0].x,y:w.members[0].y});
for(let i=0;i<49;i++)w=step(w,{'p0':[0,0,0]});assert.equal(w.members[1].hp,0);assert.equal(w.members[1].reviveProgress,49);
w=step(w,{'p0':[0,0,0]});assert.equal(w.members[1].hp,3000);
w.members[1].hp=0;for(let i=0;i<20;i++)w=step(w,{'p0':[0,0,0]});w=step(w,{'p0':[1,0,0]});assert.equal(w.members[1].reviveProgress,0);
w=fresh(1);w.members[0].hp=0;assert.equal(step(w).status,'lost');
// An unlimited run has no old rift 90-second timeout.
w=fresh();w.tick=12000;w.nextWave=12300;w.wave=41;w.monsters=[];delete w.spawnPlan;assert.equal(step(w).status,'fighting');
assert.equal(fresh().wave,1);assert.equal(fresh(1).wave,1);
// Delayed movement/dash/attacks replay identically to local prediction.
const trace=Array.from({length:80},(_,tick)=>({tick,input:[tick<30?1:-1,0,1|(tick%30===0?4:0)]}));
let reference=fresh(1);for(const f of trace)reference=predictCoopStep(reference,'p0',f.input);
let server=fresh(1);for(let tick=0;tick<80;tick+=5)server=advanceCoop(server,'p0',{frames:trace.filter(f=>f.tick>=tick-10&&f.tick<tick-5)},tick*100);
server=advanceCoop(server,'p0',{frames:trace.slice(55)},8000);delete server._net;delete server.members[0].inputAck;assert.deepEqual(server,reference);
assert.throws(()=>advanceCoop(fresh(),'p0',{frames:[{tick:0,input:[9,0,1]}]},100),/INVALID/);
// AOE damages multiple monsters without multiplying a single target's damage.
w=fresh();w.monsters=w.monsters.slice(0,3);w.monsters.forEach(e=>{e.x=w.members[0].x;e.y=w.members[0].y-70;e.hp=e.maxHp=1000;});w=step(w,{'p0':[0,0,1]});assert.equal(w.monsters.filter(e=>e.hp<1000).length,3);
console.log('PASS wave boundaries, 4-side spawn, elite scaling, no time/level cap, reset, 100-monster failure, all-dead, exact 5s revival/reset, 30% HP, delayed input replay, AOE.');

// Clearing all spawned monsters advances once and restarts the relative timer.
w=fresh();w.tick=123;w.spawnPlan.regular=[...w.spawnCounts];w.spawnPlan.elites=1;w.monsters=[];
w=step(w);assert.equal(w.wave,2);assert.equal(w.nextWave,423);assert.equal(w.monsters.length,5);
w=step(w);assert.equal(w.wave,2);
// Empty arena with pending reinforcements is not a completed wave.
w=fresh();w.monsters=[];w=step(w);assert.equal(w.wave,1);
// 50 and 99 living monsters remain playable; 100 triggers failure.
for(const count of [50,99]){w=fresh();w.spawnPlan.regular=[...w.spawnCounts];w.spawnPlan.elites=1;w.monsters=Array.from({length:count},(_,i)=>({...w.monsters[0],id:100+i}));w=step(w);assert.equal(w.status,'fighting');}
console.log('PASS fast clear, relative timer, pending spawns and 50/99 survival');

// Ally attacks retain their class, and falling fourth effects precede impact.
w=fresh(2);const ally=w.members[1];ally.classId='pirate';ally.power.advancement=3;ally.power.attack=10;
w.monsters.forEach(e=>{e.x=ally.x;e.y=ally.y-50;e.hp=e.maxHp=100000;});
w=step(w,{'p1':[0,0,33]});
const fall=w.effects.find(e=>e.kind==='fourth'&&e.owner==='p1');assert.ok(fall);assert.equal(fall.classId,'pirate');assert.equal(fall.impact-fall.start,4);
assert.ok(w.effects.some(e=>e.kind==='slash'&&e.owner==='p1'&&e.classId==='pirate'));
const before=w.members[1].damage;
for(let i=0;i<3;i++)w=step(w);assert.equal(w.members[1].damage,before);
w=step(w);assert.ok(w.members[1].damage>before);
console.log('PASS allied class effects and fourth launch before damage');
