import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {startCoop,advanceCoop,advanceCoopRaw,predictCoopStep,coopClientView,indexCoopFrames,coopEncounter,COOP_TIERS,setWaveSpeed} from './coop-model.mjs';
import {CoopMotion,motionSnapshot,interpolateActor} from './coop-motion.mjs';
import {TowerInput} from './tower-input.mjs';
const power={attack:1,hp:1000000,defense:100,boss:1,crit:.25,critDamage:1.5,cadence:1,firstJob:true,advancement:4};
function fresh(mode){
 const w=startCoop({id:mode,me:'a',owner:'a',revision:1,mode,tier:mode==='raid'?3:mode==='advancement'?4:mode==='wave'?0:5,status:'waiting',members:['a','b'].map((id,i)=>({id,name:id,classId:i?'archer':'warrior',power:{...power},advanced:true}))},0);
 w.entryWaiting=false;
 for(const [i,m] of w.members.entries()){m.entryMoved=true;m.x=w.enemy.x+(i?200:-200);m.y=w.enemy.y+100;}
 return w;
}
const trace=(id,count=30)=>Array.from({length:count},(_,tick)=>({user:id,tick,input:[tick%20<10?.4:-.4,id==='b'?.2:0,1|(tick===12?8:0)|(tick===18?4:0)|(tick===21?16:0)]}));
const local=trace('a'),remote=trace('b');
function project(w){
 const copy=structuredClone(w);for(const k of ['_net','_queuedInputs','predictionInputs','predictionBase','protocol','revision','me','id','owner','waveSpeed','speedAt','speedTime'])delete copy[k];
 for(const m of copy.members)delete m.inputAck;
 return JSON.parse(JSON.stringify(copy));
}
let cases=0;
for(const mode of ['rift','raid','wave','advancement']){
 const seed=fresh(mode);
 let server=seed;
 for(let tick=5;tick<=30;tick+=5){
  server={...server,_queuedInputs:remote.filter(f=>f.tick<tick)};
  server=advanceCoop(server,'a',{frames:local.filter(f=>f.tick<tick-5)},tick*100);
 }
 server=advanceCoop(server,'a',{frames:local},3000);
 const reference=advanceCoopRaw(seed,null,null,3000,[...local,...remote]);
 assert.deepEqual(project(server),project(reference),mode+' delayed/duplicate queue must match one authoritative simulation');
 const before=JSON.stringify(server);
 const repeated=advanceCoop(server,'a',{frames:local},3000);
 assert.equal(repeated,server,mode+' acknowledged duplicate avoids a room write');
 assert.equal(JSON.stringify(server),before,mode+' duplicate never mutates history');
 const late=advanceCoop({...seed,_queuedInputs:remote},'a',{frames:local.slice(0,10)},3000);
 const view=coopClientView(late,2);
 assert.equal(view.protocol,2);
 assert.equal(view.predictionBase.members[0].power,undefined);
 assert.ok(coopClientView(late,1).predictionBase.members[0].power,'old clients retain full snapshot');
 let predicted=structuredClone(view.predictionBase);
 for(const m of predicted.members)for(const key of ['power','name','classId','advanced'])m[key]=structuredClone(view.members.find(a=>a.id===m.id)[key]);
 const lookup=indexCoopFrames(view.predictionInputs);
 while(predicted.tick<30)predicted=predictCoopStep(predicted,'a',local[predicted.tick].input,true,lookup.get(predicted.tick)||[]);
 assert.deepEqual(project(predicted),project(reference),mode+' remote movement, skills, hit timing and RNG survive personal replay');
 cases++;
}
let wave=setWaveSpeed(fresh('wave'),'a',1.5,0);
wave=advanceCoop({...wave,_queuedInputs:remote},'a',{frames:local},2000);
assert.equal(wave.tick,30,'1.5x wave keeps its simulation clock');
assert.throws(()=>advanceCoop(fresh('rift'),'a',{frames:[{tick:-1,input:[0,0,0]}]},0),/INVALID/);
assert.throws(()=>advanceCoop(fresh('rift'),'a',{frames:[{tick:10,input:[0,0,0]}]},0),/FUTURE/);

const document={hidden:false,querySelector:()=>null},navigator={onLine:true};
const context={performance,structuredClone,Math,Map,Set,Promise,document,navigator,requestAnimationFrame:()=>1,
 paintHealthBar:()=>{},autoSkillBits:()=>0,prepareWaveCreature:()=>Promise.resolve(),image:()=>({}),WAVE_MONSTERS:Array.from({length:30},()=>({})),waveHud:()=>{},
 predictCoopStep,indexCoopFrames,coopEncounter,COOP_TIERS,motionSnapshot,interpolateActor,CoopMotion,TowerInput,
 projectPlayer:b=>({x:b.player.x,y:b.player.y}),raidMove:(m,x,y)=>Object.assign(m,{x,y})};
const source=readFileSync(new URL('./coop-client.mjs',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/^export /gm,'');
const Controller=vm.runInNewContext(source+'\nCoopController;',context);
function controller(seed){
 const nodes=new Map(),host={querySelector:s=>{if(!nodes.has(s))nodes.set(s,{style:{},dataset:{},textContent:'',hidden:false,append(){}});return nodes.get(s);},querySelectorAll:()=>[]};
 return Object.assign(Object.create(Controller.prototype),{host,room:seed,predicted:structuredClone(seed),frames:[...local],keys:new Set(),pointers:new Map(),stick:{x:0,y:0},sampler:new TowerInput(100),motion:new CoopMotion(),hint:{},pendingBits:0,received:performance.now(),nextSend:0,artReady:true,renderer:{draw(){}}});
}
const seed=fresh('rift'),late=advanceCoop({...seed,_queuedInputs:remote},'a',{frames:local.slice(0,10)},3000),c=controller(seed);
c.accept(coopClientView(late,2));
let now=performance.now();
for(let i=0;i<30&&c.predicted.tick<30;i++)c.draw(now+=17);
assert.equal(c.predicted.tick,30);
assert.deepEqual(project(c.predicted),project(advanceCoopRaw(seed,null,null,3000,[...local,...remote])),'actual controller consumes remote replay and restores compact actor stats');
const oldTick=c.room.tick;
c.accept({...c.room,tick:oldTick+1,revision:0});
assert.equal(c.room.tick,oldTick,'out-of-order revision cannot replace the room');
let sent=0;c.send=async()=>{sent++;return {};};
navigator.onLine=false;await c.flush();assert.equal(sent,0,'offline does not flood requests');
navigator.onLine=true;document.hidden=true;await c.flush();assert.equal(sent,0,'hidden tab does not flood requests');
document.hidden=false;c.nextSend=0;c.pendingBits=1;c.send=async()=>{throw new Error('NETWORK');};
await c.flush();assert.equal(c.pendingBits&1,1,'failed request retains the chest interaction');
c.nextSend=0;c.needsResync=true;let args;
c.send=async(_,value)=>{args=value;return {};};
await c.flush();assert.equal(args.frames.length,0,'resume requests current state without stale buffered actions');
assert.equal(args.protocol,2);assert.equal(c.needsResync,false);
// A predicted killing blow must still reach the authoritative combat timeline.
for(const mode of ['rift','raid','advancement']){
 const fighting=fresh(mode);fighting.hp=1;
 const finisher=controller(fighting);finisher.frames=[{tick:0,input:[0,0,2]}];
 finisher.predicted.status='won';finisher.predicted.hp=0;
 let payload;finisher.send=async(_,value)=>{payload=value;return {};};
 await finisher.flush();
 assert.equal(payload.frames.length,1,mode+' predicted victory keeps the unacknowledged killing input');
 assert.equal(payload.input,undefined);
 finisher.room.status='won';finisher.nextSend=0;await finisher.flush();
 assert.ok(Array.isArray(payload.input),mode+' only confirmed victory switches to loot movement');
}
const motion=new CoopMotion();motion.begin(1);motion.sample('ally',{x:200,y:200});motion.end();motion.reconcile();motion.begin(17);
assert.equal(motion.sample('ally',{x:2200,y:2200}).x,2200,'long reconnect does not drag an actor ghost across the arena');
console.log('PASS: '+cases+' multiplayer modes; delayed/duplicate inputs, ally skills, compact compatibility, wave speed, controller reconciliation, offline/resume and failed interaction retry.');
