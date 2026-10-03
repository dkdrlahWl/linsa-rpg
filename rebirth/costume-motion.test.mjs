import assert from 'node:assert/strict';
import {costumeMotionFrame,costumeMotionScale} from './costume-motion.mjs';
import {COSTUMES} from './costumes.mjs';
for(const {classId:cls,motionLayout,renderBodyHeight} of COSTUMES){
 const front=costumeMotionFrame(cls,2,false,false,0,0,motionLayout),back=costumeMotionFrame(cls,6,false,false,0,0,motionLayout),right=costumeMotionFrame(cls,0,false,false,0,0,motionLayout);
 assert.equal(front.row,0);assert.equal(back.row,4);assert.equal(right.row,2);
 assert.notDeepEqual(front.frame,back.frame);
 for(let dir=0;dir<8;dir++)for(let phase=0;phase<8;phase++)for(const acting of [false,true]){
  const p=costumeMotionFrame(cls,dir,true,acting,phase/9,phase/1.05+.001,motionLayout),f=p.frame;
  assert.ok(f&&f.w>0&&f.h>0&&f.body>0);
  assert.ok(f.x>=0&&f.y>=0&&f.x+f.w<=p.layout.width&&f.y+f.h<=p.layout.height);
  assert.ok(f.anchor>=0&&f.anchor<=f.w&&f.foot>0&&f.foot<=f.h);
  const renderedBody=f.body*costumeMotionScale(p,180,renderBodyHeight);
  const standingBody=180*p.layout.bodyHeight/(renderBodyHeight||p.layout.bodyHeight);
  assert.ok(Math.abs(renderedBody-standingBody)<1e-8,`${motionLayout}: body changes size on attack frame ${phase}`);
  assert.equal(p.flip,[3,4,5].includes(dir)?-1:1);
  assert.ok(acting?p.row>=5:p.row<5);
 }
 assert.equal(costumeMotionFrame(cls,100,false,false,0,0,motionLayout).row,back.row);
 assert.equal(costumeMotionFrame(cls,0,true,true,100,0,motionLayout).phase,7);
}
console.log(`PASS: ${COSTUMES.length} costumes, eight directions, walk/attack frame bounds and ground anchors.`);
