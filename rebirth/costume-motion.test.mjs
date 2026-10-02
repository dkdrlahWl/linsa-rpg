import assert from 'node:assert/strict';
import {costumeMotionFrame} from './costume-motion.mjs';
for(const cls of ['warrior','mage','archer','rogue','pirate','priest']){
 const front=costumeMotionFrame(cls,2,false,false),back=costumeMotionFrame(cls,6,false,false),right=costumeMotionFrame(cls,0,false,false);
 assert.equal(front.row,0);assert.equal(back.row,4);assert.equal(right.row,2);
 assert.notDeepEqual(front.frame,back.frame);
 for(let dir=0;dir<8;dir++)for(let phase=0;phase<8;phase++)for(const acting of [false,true]){
  const p=costumeMotionFrame(cls,dir,true,acting,phase/9,phase/1.05+.001),f=p.frame;
  assert.ok(f&&f.w>0&&f.h>0&&f.body>0);
  assert.ok(f.x>=0&&f.y>=0&&f.x+f.w<=p.layout.width&&f.y+f.h<=p.layout.height);
  assert.ok(f.anchor>=0&&f.anchor<=f.w&&f.foot>0&&f.foot<=f.h);
  assert.equal(p.flip,[3,4,5].includes(dir)?-1:1);
  assert.ok(acting?p.row>=5:p.row<5);
 }
 assert.equal(costumeMotionFrame(cls,100,false,false).row,back.row);
 assert.equal(costumeMotionFrame(cls,0,true,true,100).phase,7);
}
console.log('PASS: six costumes, eight directions, walk/attack frame bounds and ground anchors.');
