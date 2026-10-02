import assert from 'node:assert/strict';
import {fifthFlight,resolveFifthVisual,fifthPose,fifthFeedback} from './fifth-effects.mjs';

// The last travel frame must land at the same point as the impact, for every direction.
for(const cls of ['archer','pirate'])for(const [x,y] of [[600,0],[-600,0],[0,600],[0,-600],[0,0]])for(let pulse=0;pulse<20;pulse++){
 const e={kind:'fifth',classId:cls,mode:cls==='archer'?'homing':'area',x,y,fromX:0,fromY:0,radius:1400,pulse,start:20,impact:24,end:31};
 const before=fifthFlight(e,24-1e-7),land=fifthFlight(e,24);
 assert.ok(Math.hypot(before.point.x-land.point.x,before.point.y-land.point.y)<.001);
 assert.equal(land.point.x,x);assert.equal(land.point.y,y-(cls==='archer'?95:0));
 for(let t=20;t<=24;t+=.025){const f=fifthFlight(e,t);assert.ok([f.point.x,f.point.y,f.angle].every(Number.isFinite));}
}
// Retarget during flight; residual slashes/explosions stay at the landing point afterwards.
const e={kind:'fifth',classId:'archer',mode:'homing',owner:'me',start:4,impact:8,end:15,pulse:0,x:100,y:100},cache=new Map();
assert.equal(resolveFifthVisual(e,{x:200,y:200},7,cache).x,200);
assert.equal(resolveFifthVisual(e,{x:230,y:220},8,cache).x,230);
assert.equal(resolveFifthVisual(e,{x:500,y:500},9,cache).x,230);
assert.deepEqual(e,{kind:'fifth',classId:'archer',mode:'homing',owner:'me',start:4,impact:8,end:15,pulse:0,x:100,y:100});
const other={...e,owner:'other'};assert.equal(resolveFifthVisual(other,{x:600,y:600},9,cache).x,600);assert.equal(cache.size,2);
for(const classId of ['warrior','mage','archer','rogue','pirate'])for(let t=0;t<100;t+=.05){const pose=fifthPose({classId,start:0,end:86},t);if(pose)assert.ok(pose.age>=0&&pose.age<=1&&Number.isFinite(pose.lunge));}
const impact={...e,classId:'mage',final:true};assert.deepEqual(fifthFeedback([impact],7.99,'me'),{x:0,y:0});assert.deepEqual(fifthFeedback([impact],8.6,'other'),{x:0,y:0});assert.ok(Math.abs(fifthFeedback([impact],8.3,'me').x)<=10);assert.deepEqual(fifthFeedback([impact],10,'me'),{x:0,y:0});
console.log('PASS fifth motion: projectile/impact continuity in all directions, moving-target landing freeze, per-actor isolation, finite pose ages and bounded local-only feedback');
