import {skillLookDestination} from './skill-look-fit.mjs';
import assert from 'node:assert/strict';
import {SKILL_LOOKS} from './skill-looks.mjs';
import {skillLookArtPath} from './skill-look-designs.mjs';
import {skillLookSourceRect} from './skill-look-bounds.mjs';
import bounds from './skill-look-bounds-data.mjs';
import {prepareSkillLookArt,registerSkillLookSource,skillLookContext} from './skill-look-material.mjs';
globalThis.Image=class{complete=true;naturalWidth=1536;naturalHeight=1920;decode(){return Promise.resolve();}};
let trimmed=0,cases=0;
for(const look of SKILL_LOOKS){
 const data=bounds[look.id];assert.equal(data.asset,skillLookArtPath(look.id));assert.equal(data.frames.length,20);
 await prepareSkillLookArt(look.id);
 for(let tier=1;tier<=5;tier++)for(let part=0;part<4;part++){
  const rect=skillLookSourceRect(look.id,tier,part,data.width,data.height),cw=data.width/4,ch=data.height/5;
  assert.ok(rect.w>0&&rect.h>0);assert.ok(rect.x>=part*cw&&rect.x+rect.w<=(part+1)*cw);assert.ok(rect.y>=(tier-1)*ch&&rect.y+rect.h<=tier*ch);
  if(rect.w<cw||rect.h<ch)trimmed++;
  const source=registerSkillLookSource({width:384,height:384},{tier,part}),calls=[];
  const g={drawImage:(...args)=>calls.push(args),globalAlpha:1};
  skillLookContext(g,look,{kind:'priest',slot:tier}).drawImage(source,0,0,384,384,-240,-160,480,320);
  assert.deepEqual(calls[0].slice(1,5),[rect.x,rect.y,rect.w,rect.h],'sample painted pixels, not the transparent cell');
  assert.deepEqual(calls[0].slice(5),skillLookDestination(look,rect,[-240,-160,480,320]),'native destination or proportion-preserving priest fit');cases++;
 }
}
assert.equal(trimmed,360);
assert.deepEqual(skillLookSourceRect('unknown',1,0,400,500),{x:0,y:0,w:100,h:100});
assert.deepEqual(skillLookSourceRect('peacock-plume',1,0,400,500),{x:0,y:0,w:100,h:100},'unknown atlas dimensions fail safely');
console.log('PASS',cases,'painted source rectangles fill unchanged native destinations; all 18 themes / 5 tiers covered');
