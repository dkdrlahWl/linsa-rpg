import assert from 'node:assert/strict';
import {startCoop,advanceCoopRaw} from './coop-model.mjs';
import {explorationFloor} from './exploration-data.mjs';
// Public combat-stat fixture only; never changes the live account or its items.
const power={attack:49108,hp:67525,defense:1373,crit:.41,critDamage:1.6,boss:3.2,cadence:1,advancement:4,firstJob:true,level:200,combatPower:206123};
export function benchmark(floor,seed=1234,invulnerable=false){
 let w=startCoop({mode:'exploration',tier:3,status:'waiting',owner:'p',members:[{id:'p',classId:'warrior',power:{...power},advanced:true,ready:true}]},seed);w.entryWaiting=false;w.floor=floor;explorationFloor(w);const boss=w.monsters.find(e=>e.boss);w.members[0].x=boss.x;w.members[0].y=boss.y+150;if(invulnerable)w.members[0].immune=1e9;
 for(let t=0;t<6000&&w.status==='fighting';t++){
  const m=w.members[0],target=w.monsters.filter(e=>e.hp>0&&e.bossKind!=='shadow').sort((a,b)=>Math.hypot(a.x-m.x,a.y-m.y)-Math.hypot(b.x-m.x,b.y-m.y))[0];let dx=0,dy=0;
  if(target&&Math.hypot(target.x-m.x,target.y-m.y)>170){dx=target.x-m.x;dy=target.y-m.y;const n=Math.hypot(dx,dy);dx/=n;dy/=n;}
  w=advanceCoopRaw(w,null,null,w.started+(t+1)*100,[{user:'p',tick:t,input:[dx,dy,123]}],true);
  if(w.floor!==floor||!w.monsters.some(e=>e.boss))return {cleared:true,seconds:w.tick/10,hp:w.members[0].hp};
 }
 return {cleared:false,seconds:w.tick/10,hp:w.members[0].hp};
}
const results=[5,10,13,16,19,21].map(floor=>({floor,...benchmark(floor)}));
assert.ok(results[0].cleared,'first boss must be accessible');
assert.ok(results[1].cleared,'current build reaches second boss / 10 of 21 stages');
assert.equal(results[2].cleared,false,'third act requires growth or better dodging');
console.log('PASS Dohyun baseline, approach-and-attack bot without active hazard dodging',results);
