import assert from 'node:assert/strict';
import {SKILL_LOOKS} from './skill-looks.mjs';
import bounds from './skill-look-bounds-data.mjs';
import {skillLookDestination} from './skill-look-fit.mjs';
let priestFrames=0;
for(const look of SKILL_LOOKS)for(const paint of bounds[look.id].frames){
 const original=[-480,-1075.2,960,1280],dest=skillLookDestination(look,paint,original);
 if(look.classId==='priest'){
  assert.ok(Math.abs(dest[2]/paint.w-dest[3]/paint.h)<1e-9,'same horizontal and vertical scale preserves faces and wings');
  assert.equal(dest[1],original[1]);assert.equal(dest[3],original[3],'do not shrink the spell height');
  assert.ok(Math.abs(dest[0]+dest[2]/2-(original[0]+original[2]/2))<1e-9,'same horizontal center');priestFrames++;
 }else assert.equal(dest,original,'other jobs retain exact native geometry');
 assert.deepEqual(original,[-480,-1075.2,960,1280]);
}
assert.equal(priestFrames,60);
console.log('PASS all 3 priest looks / 60 frames keep natural proportions, native height and center; other 300 components unchanged');
