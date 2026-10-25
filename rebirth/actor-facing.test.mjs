import assert from 'node:assert/strict';
import {actorFacing} from './actor-facing.mjs';
import {COSTUMES} from './costumes.mjs';
import {MIRROR_ROWS,costumeMotionFrame} from './costume-motion.mjs';
for(const c of COSTUMES)for(let dir=0;dir<8;dir++){
 const other=(dir+4)%8;
 for(const casting of [false,true])for(const attacking of [false,true]){
  const p=actorFacing({moving:true,moveDir:dir,idleDir:other,casting,castDir:other,attacking,attackDir:other,poseDir:other});
  assert.deepEqual(p,{dir,acting:false});
  const frame=costumeMotionFrame(c.classId,p.dir,true,p.acting,0,2,c.motionLayout);
  assert.equal(frame.row,[2,1,0,1,2,3,4,3][dir]);assert.equal(frame.flip,([3,4,5].includes(dir)?-1:1)*(MIRROR_ROWS[c.motionLayout]?.includes(frame.row)?-1:1));
 }
 assert.deepEqual(actorFacing({moving:false,idleDir:dir,attacking:true,attackDir:other}),{dir:other,acting:true});
 assert.deepEqual(actorFacing({moving:false,idleDir:dir,casting:true,castDir:other}),{dir:other,acting:true});
}
console.log('PASS 36 costumes × 8 directions: movement overrides stale attack/cast/fifth poses; stationary attacks face their target');
