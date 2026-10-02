import assert from 'node:assert/strict';
import {FIFTH_SKILLS,fifthUnlocked,beginFifth,stepFifth,fifthContains,boundedCombatEffects} from './fifth-job.mjs';
import {absorbDamage} from './priest.mjs';
import {initialState,execute,power} from './engine.mjs';
import {jobStage,ADVANCEMENT_BOSSES} from './advancement.mjs';
import {newTowerBattle,towerStep} from './tower-model.mjs';
import {startCoop,predictCoopStep} from './coop-model.mjs';
import {startRaid,advanceRaidRaw} from './raid-model.mjs';
import {autoSkillBits} from './auto-skills.mjs';
import {randomUUID} from 'node:crypto';
const ids=['warrior','mage','archer','rogue','pirate'];
const P={level:200,advancement:4,firstJob:true,hp:1e8,attack:100,defense:1000,boss:1,crit:0,critDamage:1,cadence:1};
const actor=classId=>({id:classId,classId,x:0,y:0,hp:P.hp,power:{...P},advancement:4});
for(const [i,cls] of ids.entries()){
 const a=actor(cls),target={id:'boss',x:100,y:0,hp:1000,maxHp:1000};
 assert.equal(fifthUnlocked({...a,power:{...P,level:199}}),false);
 assert.equal(beginFifth({...a,advancement:3},target,0),false);
 assert.equal(beginFifth(a,target,0),true);assert.equal(beginFifth(a,target,1),false);
 let sum=0;const hits=[],visual=[];
 for(let tick=0;tick<100;tick++)stepFifth(a,[target],tick,s=>{sum+=s;hits.push(tick);},e=>visual.push(e));
 assert.ok(Math.abs(sum-[24,26,22,22,25][i])<1e-9,cls);
 assert.deepEqual(visual.filter(e=>e.kind==='fifth').map(e=>e.impact),hits);
 assert.ok(visual.filter(e=>e.kind==='fifth').every(e=>e.start===e.impact-4));
 assert.equal(beginFifth(a,target,299),false);assert.equal(beginFifth(a,target,300),true);
 const dead=actor(cls);beginFifth(dead,target,0);dead.hp=0;let damage=0;stepFifth(dead,[target],100,s=>damage+=s);assert.equal(damage,0);assert.equal(dead.fifthCast,undefined);
 const outside=actor(cls);beginFifth(outside,target,0);let missed=0;stepFifth(outside,[{...target,x:10000}],100,s=>missed+=s);assert.equal(missed,0,cls+' outside');
 const replay=actor(cls);beginFifth(replay,target,0);const cloned=JSON.parse(JSON.stringify(replay));let s1=0,s2=0;for(let t=0;t<100;t++){stepFifth(replay,[target],t,s=>s1+=s);stepFifth(cloned,[target],t,s=>s2+=s);}assert.equal(s1,s2);
}
const rogue=actor('rogue'),weak={id:'weak',x:100,y:0,hp:300,maxHp:1000};beginFifth(rogue,weak,0);let finish=0;stepFifth(rogue,[weak],100,s=>finish+=s);assert.ok(Math.abs(finish-24)<1e-9);
const archer=actor('archer'),targets=[weak,{...weak,id:'other'}];beginFifth(archer,weak,0);let arrows=0;stepFifth(archer,targets,100,()=>arrows++);assert.equal(arrows,20,'no multiplied homing volleys');
const warrior=actor('warrior');beginFifth(warrior,weak,0);assert.equal(absorbDamage(warrior,1000,49),800);assert.equal(absorbDamage(warrior,1000,50),1000);
assert.equal(fifthContains({mode:'line',x:0,y:0,angle:0,length:2400,width:1600},{x:2400,y:800}),true);assert.equal(fifthContains({mode:'line',x:0,y:0,angle:0,length:2400,width:1600},{x:-1,y:0}),false);
const marker={kind:'fifth-field',end:100};assert.ok(boundedCombatEffects([marker,...Array.from({length:100},()=>({kind:'impact',end:100}))],50,40).includes(marker));
assert.equal(fifthUnlocked({classId:'priest',power:{level:200,advancement:3}}),true);
for(const cls of ids){
 const b=newTowerBattle(10,cls,P,0,'solo',1,true);towerStep(b,[0,0,64]);assert.ok(b.fifthCast,cls+' solo');assert.equal(autoSkillBits(b,1)&64,0);
 let w=startCoop({id:'trial',tier:4,mode:'advancement',status:'waiting',members:[{id:'me',classId:cls,power:P,advanced:true}]},0);w.entryWaiting=false;w=predictCoopStep(w,'me',[0,0,64]);assert.ok(w.members[0].fifthCast,cls+' trial');assert.ok(w.effects.some(e=>e.kind==='fifth-field'));
 let raid=startRaid({id:'raid',tier:3,status:'waiting',members:[{id:'me',classId:cls,power:P,advanced:true}]},0);raid.members[0].x=1600;raid.members[0].y=1600;raid=advanceRaidRaw(raid,'me',[0,0,64],0);raid=advanceRaidRaw(raid,'me',null,100);assert.ok(raid.members[0].fifthCast,cls+' raid');
}
const ctx={now:1000000,random:()=>.5,uuid:randomUUID};let s=initialState('warrior','5차시험',ctx);Object.assign(s,{level:199,firstAdvancement:true,advancement:3,hunting:false});
assert.throws(()=>execute(s,'advance',{},ctx),/LEVEL_REQUIRED/);s.level=200;const before=power(s);s=execute(s,'advance',{},ctx).state;assert.equal(s.battle.advancementStage,4);assert.equal(s.battle.enemyHp,18000000);
s.battle.ended=true;s.battle.won=false;s=execute(s,'sync',{},ctx).state;assert.equal(s.advancement,3);
s=execute(s,'advance',{},ctx).state;s.battle.ended=true;s.battle.won=true;s=execute(s,'sync',{},ctx).state;assert.equal(s.advancement,4);assert.equal(jobStage(s),5);assert.ok(Math.abs(power(s).attack/before.attack-1.1)<.02);
assert.throws(()=>execute(s,'advance',{},ctx),/ALREADY_ADVANCED/);const stats=power(s);s=execute(s,'advancementStart',{stage:4},ctx).state;assert.equal(s.battle.advancementPractice,true);s.battle.won=true;s.battle.ended=true;s=execute(s,'sync',{},ctx).state;assert.deepEqual(power(s),stats);
assert.equal(ADVANCEMENT_BOSSES[4].level,200);
console.log('PASS fifth: exact totals, cooldown, level/victory gates, outside/death, execution, single-target arrows, guard, serialized replay, persistent fields, priest compatibility, solo/trial/raid and repeat victory safety');
// Tracking keeps the live target, follows motion every tick, and reacquires nearest alive.
const hunter=actor('rogue'),moving={id:'moving',x:3500,y:0,hp:1000,maxHp:1000};
assert.equal(beginFifth(hunter,moving,0),true);
const emitted=[];stepFifth(hunter,[moving],4,()=>{},e=>emitted.push(e));
moving.x=4000;stepFifth(hunter,[moving],5,()=>{},e=>emitted.push(e));assert.equal(hunter.fifthCast.x,4000);
const replacement={id:'replacement',x:4200,y:0,hp:1000,maxHp:1000},edge={id:'edge',x:6300,y:0,hp:1000,maxHp:1000},beyond={id:'beyond',x:6301,y:0,hp:1000,maxHp:1000};
moving.hp=0;const hitIds=[];stepFifth(hunter,[moving,replacement,edge,beyond],8,(_,__,t)=>hitIds.push(t.id),e=>emitted.push(e));
assert.equal(hunter.fifthCast.targetId,'replacement');assert.deepEqual(hitIds,['replacement','edge']);
stepFifth(hunter,[moving,replacement],10,()=>{},e=>emitted.push(e));assert.equal(emitted.filter(e=>e.kind==='fifth').at(-1).targetId,'replacement');
assert.equal(beginFifth(actor('rogue'),{...replacement,x:4401},0),false);
console.log('PASS rogue: doubled tracking distance, +61.5% radius, live movement, dead-target reacquisition, matching visual IDs and exact radius edge');
