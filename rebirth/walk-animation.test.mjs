import assert from 'node:assert/strict';
import {walkingPose} from './walk-animation.mjs';
for(let direction=0;direction<8;direction++){
 const feet=walk=>new Map(walkingPose(walk,direction,180).feet.map(foot=>[foot.side,foot]));
 for(let t=0;t<8;t+=.05){
  const a=feet(t),opposite=feet(t+4);
  assert.ok(Math.abs(a.get(-1).step+a.get(1).step)<1e-10,'legs never swing in unison');
  assert.ok(a.get(-1).lift===0||a.get(1).lift===0,'at least one foot stays planted');
  for(const side of [-1,1]){
   assert.ok(Math.abs(a.get(side).step+opposite.get(side).step)<1e-10,'lead foot exchanges every half-cycle');
   for(const point of ['hip','knee','foot'])assert.ok(Object.values(a.get(side)[point]).every(Number.isFinite));
  }
 }
 const a=walkingPose(2,direction,180),b=walkingPose(6,direction,180);
 if(Math.abs(Math.sin(direction*Math.PI/4))>.1)assert.notEqual(a.feet[1].side,b.feet[1].side,'front/back drawing order follows depth');
 for(const side of [-1,1])assert.ok(Math.hypot(feet(2).get(side).foot.x-feet(10).get(side).foot.x,feet(2).get(side).foot.y-feet(10).get(side).foot.y)<1e-9);
}
console.log('PASS walking: opposite legs, planted stance, lead/depth exchange, continuous eight-direction cycle');
