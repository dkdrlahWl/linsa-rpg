import assert from 'node:assert/strict';
import {FIFTH_SKILLS,beginFifth,stepFifth} from './fifth-job.mjs';
import {meteorLanding,meteorFlight,resolveFifthVisual} from './fifth-effects.mjs';
const a={id:'archer',classId:'archer',x:0,y:0,hp:1000,power:{level:200,advancement:4}};
const center={id:'center',x:500,y:500,hp:1e6},rim={id:'rim',x:1800,y:500,hp:1e6},outside={id:'outside',x:1801,y:500,hp:1e6};
assert.ok(beginFifth(a,center,0));const effects=[],hits=new Map();
for(let tick=0;tick<=60;tick++){
 a.x=tick*30;a.y=-tick*20;
 stepFifth(a,[center,rim,outside],tick,(damage,crit,target)=>{const v=hits.get(target.id)||[];v.push(damage);hits.set(target.id,v);},e=>effects.push(e));
}
for(const id of ['center','rim']){assert.equal(hits.get(id).length,20);assert.ok(Math.abs(hits.get(id).reduce((a,b)=>a+b,0)-22)<1e-9);}
assert.equal(hits.has('outside'),false);assert.equal(FIFTH_SKILLS.archer.radius,1300);
const pulses=effects.filter(e=>e.kind==='fifth');assert.equal(pulses.length,20);assert.equal(pulses.filter(e=>e.final).length,1);
for(const e of effects)assert.deepEqual([e.x,e.y],[500,500],'cast stays fixed as caster moves');
for(const e of pulses){
 const p=meteorLanding(e);assert.ok(Math.hypot(p.x-e.x,p.y-e.y)<e.radius*.7);
 const f=meteorFlight(e,e.impact),before=meteorFlight(e,e.impact-1e-7);assert.deepEqual([f.x,f.y],[p.x,p.y]);assert.ok(Math.hypot(before.x-p.x,before.y-p.y)<.001);
 const resolved=resolveFifthVisual(e,{x:9999,y:9999},e.start,new Map());assert.equal(resolved.x,500);assert.equal(resolved.y,500);
}
// Entering or leaving the zone affects subsequent pulses; killing the original target does not end it.
const b={...a,x:0,y:0,fifthReady:0},aim={id:'aim',x:500,y:500,hp:100},walker={id:'walker',x:1900,y:500,hp:100};
beginFifth(b,aim,0);const times=[];
for(let tick=0;tick<=60;tick++){if(tick===10){aim.hp=0;walker.x=500;}if(tick===20)walker.x=1900;stepFifth(b,[aim,walker],tick,(d,c,t)=>{if(t.id==='walker')times.push(tick);});}
assert.deepEqual(times,[10,12,14,16,18]);console.log('PASS meteor: fixed area, 20 hits each, exact 2200%, inclusive radius edge, no outside damage, entry/exit and target death, image landing continuity, final visual has no bonus damage');

