import assert from 'node:assert/strict';
import {initialState,makeItem,power,huntingRate,execute} from './engine.mjs';
import * as D from './data.mjs';
import {damageRows} from './damage-stack.mjs';
import {newTowerBattle,towerStep,TOWER_CLASSES} from './tower-model.mjs';
import {startCoop,predictCoopStep} from './coop-model.mjs';
let id=0;const ctx={now:100000,random:()=>.5,uuid:()=>String(++id)};
export function fieldCharacter(level,cl,geared=true){
 const s=initialState(cl.id,'사냥시험',ctx);Object.assign(s,{level,items:[],equipped:{},firstAdvancement:level>=30,advancement:level>=150?3:level>=100?2:level>=60?1:0});s.stats[cl.stat]+=5*(level-1);
 if(geared)for(let slot=0;slot<9;slot++){
  const it=makeItem(Math.max(1,Math.floor(level/10)*10),cl.id,slot,false,ctx,0);
  it.baseStats=D.rollBaseStats(it,()=>.5);it.stars=level===1?0:Math.min(15,Math.floor(level/15)+3);
  s.items.push(it);s.equipped[slot]=it.id;
 }
 s.stage=Math.min(29,Math.floor(level/20)*3);return s;
}
const report=[];
for(const cl of D.CLASSES)for(const level of [1,20,40,60,80,100,120,140,160,180,200]){
 const s=fieldCharacter(level,cl),p=power(s),r=huntingRate(s),bare=huntingRate(fieldCharacter(level,cl,false));
 assert.equal(r.survives,true,`${cl.id} ${level} appropriately enhanced equipment should survive`);
 assert.ok(level===1||!bare.survives,`${cl.id} ${level} no equipment should fail on matching field`);
 const low=huntingRate({...s,stage:Math.max(0,s.stage-6)});
 if(level>=40){assert.ok(r.xp/r.seconds>low.xp/low.seconds,`${cl.id} ${level} higher field XP`);assert.ok(r.gold/r.seconds>low.gold/low.seconds,`${cl.id} ${level} higher field gold`);}
 report.push({class:cl.id,level,stage:D.STAGES[s.stage].level,kill:r.fightSeconds,death:r.deathSeconds,hpLostPct:Math.round(Math.floor((r.fightSeconds-.001)/3)*r.incoming/p.hp*100),xpHour:Math.round(r.xp/r.seconds*3600),goldHour:Math.round(r.gold/r.seconds*3600)});
}
// Zero damage while spawning; no artificial defeat when a long fight remains survivable.
const tank=fieldCharacter(1,D.CLASSES[0]);tank.stage=29;for(const it of tank.items)it.lines=[{key:'flatHP',value:1e8}];
const long=huntingRate(tank);assert.ok(long.fightSeconds>90);assert.equal(long.survives,true);
// Damage queue keeps exactly the ten latest outgoing hits, without consuming slots for healing/hurt.
const numbers=Array.from({length:40},(_,i)=>({id:i,start:i/10,end:50,kind:i%7===0?'incoming':'outgoing'}));
const rows=damageRows(numbers,5);assert.equal(rows.length,10);assert.equal(rows.at(-1).id,39);assert.ok(rows.every(n=>n.kind==='outgoing'));assert.equal(damageRows(numbers,51).length,0);
// The same melee speed/dash rules must hold in solo and co-op simulation.
for(const cl of D.CLASSES){const p=power(fieldCharacter(100,cl)),b=newTowerBattle(1,cl.id,p,0,'speed',1,true);b.nextPattern=1e9;b.enemy.x=3000;b.enemy.y=3000;
 const start=b.player.x;towerStep(b,[1,0,0]);assert.equal(b.player.x-start,TOWER_CLASSES[cl.id].speed);towerStep(b,[1,0,4]);assert.equal(b.dashReady-b.tick,TOWER_CLASSES[cl.id].dashCooldown);
 let w=startCoop({id:'speed',tier:0,status:'waiting',members:[{id:'me',classId:cl.id,power:p}]},0);w=predictCoopStep(w,'me',[1,0,4]);assert.equal(w.members[0].dashReady,TOWER_CLASSES[cl.id].dashCooldown);
}
// Normal attacks replace contact damage; rings occur only twice in a full 90s run.
let w=startCoop({id:'patterns',tier:0,status:'waiting',members:[{id:'me',classId:'warrior',power:{...power(fieldCharacter(200,D.CLASSES[0])),hp:1e9}}]},0),rings=new Set(),basic=new Set();
for(let t=0;t<899;t++){w=predictCoopStep(w,'me',[0,0,0]);for(const h of w.hazards){if(h.inner)rings.add(h.at);if(h.basic)basic.add(h.at);}}
assert.equal(rings.size,2);assert.ok(basic.size>=35);
console.log(JSON.stringify(report));
console.log('PASS 55 field builds, death-only failure, high-field reward efficiency, latest 10 hits, melee movement parity and two rings per 90 seconds.');
