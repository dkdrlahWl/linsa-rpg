import assert from 'node:assert/strict';
import {FOURTH_SKILLS,beginFourth,stepFourth} from './fourth-job.mjs';
import {fourthBarrage,fourthAreaEffects,drawFourthGround} from './fourth-effects.mjs';
for(const classId of ['mage','archer','pirate']){
 const skill=FOURTH_SKILLS[classId],a={classId,advancement:3,x:0,y:0},target={x:100,y:100};
 const effects=[],hits=[];beginFourth(a,target,0);
 for(let t=0;t<150;t++)stepFourth(a,target,t,damage=>hits.push({t,damage}),e=>effects.push(e));
 assert.equal(hits.length,skill.hits);assert.ok(hits.every(h=>h.damage===skill.damage));assert.deepEqual(hits.map(h=>h.t),effects.map(e=>e.impact));
 const e=effects[0],next=effects[1],time=skill.interval+1;
 assert.equal(fourthAreaEffects([e,next]).length,1);
 assert.deepEqual(fourthBarrage(e,time),fourthBarrage(next,time));
 const lastY=new Map(),landings=new Set();let launches=new Set();
 for(let t=0;t<70;t+=.1){
  const samples=fourthBarrage(e,t);assert.ok(samples.length<55);
  for(const p of samples){assert.ok(Math.hypot(p.x,p.y)<skill.radius);assert.ok(Number.isFinite(p.drop));
   if(lastY.has(p.id))assert.ok(p.drop<=lastY.get(p.id)+1e-9,'fall never reverses');
   lastY.set(p.id,p.drop);launches.add(p.launch);landings.add(p.impact);
  }
 }
 assert.ok(launches.size>150);assert.equal(landings.size,launches.size,'staggered impacts');
 const radii=[];const g=new Proxy({}, {get:(_,key)=>key==='arc'?((x,y,r)=>radii.push(r)):()=>{}});drawFourthGround(g,e,2);assert.equal(radii[0],skill.radius);
 const outside={classId,advancement:3,x:0,y:0};beginFourth(outside,target,0);let count=0;stepFourth(outside,{x:4000,y:4000},150,()=>count++);assert.equal(count,0);
}
console.log('PASS continuous staggered rain, monotonic falls, bounded particle counts, exact range marker, unchanged full-area hit counts/damage and outside-range rejection.');
