import assert from 'node:assert/strict';
import {SKILL_LOOKS} from './skill-looks.mjs';
import {skillLookSourceAngle,orientedSkillLookSource} from './skill-look-orientation.mjs';
const operations=[];let allocations=0;
globalThis.document={createElement(name){assert.equal(name,'canvas');allocations++;return {width:0,height:0,getContext(){return {translate(...a){operations.push(['translate',...a]);},rotate(...a){operations.push(['rotate',...a]);},drawImage(...a){operations.push(['drawImage',...a]);}};}};}};
let corrected=0;
for(const c of SKILL_LOOKS)for(let tier=1;tier<=5;tier++)for(let part=0;part<4;part++){
 const expected=['peacock-plume','starlit-deer'].includes(c.id)&&tier===5&&part===0;
 const angle=expected?(c.id==='peacock-plume'?-100:128)*Math.PI/180:0;
 assert.equal(skillLookSourceAngle(c.id,tier,part),angle);
 const image={},rect={x:20,y:1500,w:180,h:360},source=orientedSkillLookSource(c.id,tier,part,image,rect);
 if(expected){assert.equal(source.w,Math.ceil(180*Math.abs(Math.cos(angle))+360*Math.abs(Math.sin(angle))));assert.equal(source.h,Math.ceil(180*Math.abs(Math.sin(angle))+360*Math.abs(Math.cos(angle))));assert.equal(operations.at(-2)[1],angle);assert.equal(orientedSkillLookSource(c.id,tier,part,image,rect),source,'reuse prepared bow');corrected++;}
 else assert.deepEqual(source,{image,...rect});
}
assert.equal(corrected,2);assert.equal(allocations,2);
for(const [id,heading]of [['peacock-plume',190],['starlit-deer',-38]]){const result=heading*Math.PI/180+skillLookSourceAngle(id,5,0);assert.ok(Math.abs(Math.cos(result))<1e-9);assert.ok(Math.abs(Math.sin(result)-1)<1e-9,'each painted bow points down after its own orientation correction');}
console.log('PASS only Peacock/Deer fifth-tier bows point down; arrows, other tiers and all other themes unchanged; raster prepared once');
