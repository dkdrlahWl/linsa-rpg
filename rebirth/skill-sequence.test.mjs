import assert from 'node:assert/strict';
import {CLASS_SKILLS,SECOND_SKILLS,beginCombatSkill,stepCombatSkills} from './combat-skills.mjs';
import {newTowerBattle,towerStep,clearVictoryEffects} from './tower-model.mjs?v=crit-restore-57';
import {startCoop,predictCoopStep,advanceCoop} from './coop-model.mjs?v=crit-restore-57';
import {advanceWaveRaw} from './wave-model.mjs?v=crit-restore-57';
import {initialState,execute} from './engine.mjs?v=crit-restore-57';
const expected={warrior:[1600,4700,8,30],mage:[1800,4800,9,38],archer:[1750,4600,10,34],rogue:[1600,4700,10,28],pirate:[1700,4800,10,36]};
const power={attack:1000,hp:1e9,defense:1e9,boss:1,crit:0,critDamage:1,cadence:1,advancement:1,firstJob:true};
for(const [classId,[first,second,hits,duration]] of Object.entries(expected)){
 for(const slot of [1,2]){
  const a={id:'me',classId,power,x:0,y:0,hp:1000},target={id:'boss',x:300,y:0},events=[],damage=[];
  assert.equal(beginCombatSkill(a,target,0,slot),true);assert.equal(beginCombatSkill(a,target,1,slot),false);
  for(let t=0;t<=45;t++)stepCombatSkills(a,[target],t,(scale,crit,e)=>damage.push({t,scale,crit,id:e.id}),e=>events.push(e));
  assert.equal(Math.round(damage.reduce((n,p)=>n+p.scale*1000,0)),slot===1?first:second);
  assert.equal(damage.length,slot===1?CLASS_SKILLS[classId].hits:hits);assert.equal(a.hp,1000,'no hidden heal');
  assert.ok(damage.every((p,i)=>i===0||p.t>damage[i-1].t),'hits must occur separately');assert.equal(events[0].kind,slot===1?'first':'second-sequence');
  if(slot===2){const pulses=events.filter(e=>e.phase==='pulse');assert.equal(damage.at(-1).t,duration);assert.deepEqual(pulses.map(e=>e.impact),damage.map(p=>p.t));assert.ok(pulses.every(e=>e.start<e.impact&&e.end>e.impact));}
  const denied={classId,power:{...power,firstJob:false,advancement:0},x:0,y:0};assert.equal(beginCombatSkill(denied,target,0,slot),false);assert.equal(beginCombatSkill({...a},{x:9000,y:0},1000,slot),false);
 }
 const b=newTowerBattle(1,classId,power,0,'skills',42,true);b.enemyHp=1e9;b.hp=5e8;b.nextPattern=1e9;
 for(let t=0;t<45;t++){b.player.x=1600;b.player.y=1780;b.enemy.x=1600;b.enemy.y=1500;towerStep(b,[0,0,t===0?10:0]);}
 assert.equal(1e9-b.enemyHp,first+second);assert.equal(b.hp,5e8);assert.ok(!b.firstCast&&!b.secondCast);
 let room=startCoop({id:'skills',me:'me',tier:0,status:'waiting',members:[{id:'me',classId,power,advanced:true}]},0);room.hp=room.maxHp=1e9;
 for(let t=0;t<45;t++){room.enemy.x=1600;room.enemy.y=1500;room.members[0].x=1600;room.members[0].y=1780;room=predictCoopStep(room,'me',[0,0,t===0?10:0]);}
 assert.equal(room.members[0].damage,first+second);
 let id=0;const ctx=now=>({now,uuid:()=>String(++id),random:()=>.99});let s=initialState(classId,'검증',ctx(0));Object.assign(s,{hunting:false,firstAdvancement:true,advancement:1});s=execute(s,'boss',{id:0,practice:true},ctx(0)).state;Object.assign(s.battle,{enemyHp:1e9,hp:1e9,power});
 s=execute(s,'skill',{slot:1},ctx(0)).state;s=execute(s,'skill',{slot:2},ctx(0)).state;assert.equal(s.battle.enemyHp,1e9,'casting must not deal all damage instantly');
 s=JSON.parse(JSON.stringify(s));s=execute(s,'sync',{},ctx(4000)).state;assert.equal(1e9-s.battle.enemyHp,first+second+4000,'four normal attacks plus scheduled skills');
 const stopped=newTowerBattle(1,classId,power,0,'stop',1,true);towerStep(stopped,[0,0,10]);clearVictoryEffects(stopped);assert.ok(!stopped.firstCast&&!stopped.secondCast);
}
let a={classId:'pirate',power,x:0,y:0},target={x:700,y:0},total=0;beginCombatSkill(a,target,0,2);for(let t=0;t<45;t++)stepCombatSkills(a,[target],t,n=>total+=n);assert.ok(Math.abs(total-4.2)<1e-9);
a={classId:'archer',power,x:0,y:0};target={x:500,y:0};beginCombatSkill(a,target,0,2);target.y=500;total=0;for(let t=0;t<45;t++)stepCombatSkills(a,[target],t,n=>total+=n);assert.equal(total,0);
const moving=newTowerBattle(1,'mage',power,0,'moving',1,true);const x=moving.player.x;towerStep(moving,[1,0,10]);towerStep(moving,[1,0,4]);assert.ok(moving.player.x>x&&moving.dashReady>0&&moving.secondCast);
for(const classId of Object.keys(expected)){
 const fresh=()=>startCoop({id:'replay',me:'me',tier:5,status:'waiting',members:[{id:'me',classId,power:{...power,attack:10},advanced:true}]},0);
 const trace=Array.from({length:60},(_,tick)=>({tick,input:[0,0,tick===1?10:0]}));let predicted=fresh();for(const f of trace)predicted=predictCoopStep(predicted,'me',f.input);
 let server=fresh();for(let t=0;t<60;t+=5)server=advanceCoop(server,'me',{frames:trace.filter(f=>f.tick>=t-10&&f.tick<t-5)},t*100);server=advanceCoop(server,'me',{frames:trace.slice(35)},6000);
 delete server._net;delete server.members[0].inputAck;assert.deepEqual(server,predicted);
 const duplicate=advanceCoop(server,'me',{frames:trace.slice(35)},6000);delete duplicate._net;delete duplicate.members[0].inputAck;assert.deepEqual(duplicate,server);
}
// Wave AOE applies each pulse once to each enemy, including allied skill owners.
for(const [classId,[first,second]] of Object.entries(expected)){
 let w=startCoop({id:'wave-skills',mode:'wave',me:'me',tier:0,status:'waiting',members:[{id:'me',classId,power,advanced:true}]},0);
 const m=w.members[0],sample=w.monsters[0];w.monsters=Array.from({length:3},(_,i)=>({...sample,id:100+i,x:m.x+i*20,y:m.y-280,hp:1e8,maxHp:1e8,speed:0,attack:0,elite:false,ready:1e9}));delete w.spawnPlan;w.nextWave=1e9;
 for(let t=0;t<45;t++)w=advanceWaveRaw(w,null,null,(t+1)*100,[{user:'me',tick:t,input:[0,0,t===0?10:0]}]);
 for(const enemy of w.monsters)assert.equal(1e8-enemy.hp,first+second,classId+' wave damage');
 assert.equal(w.members[0].damage,3*(first+second));
}
console.log('PASS exact totals, timed hits, VFX arrival, locks/range/cooldowns, no heal, movement/dodge, tower/party/legacy save parity, pirate range, archer line, cleanup and delayed/duplicate replay.');
