import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {SKILL_LOOKS} from './skill-looks.mjs';
import {prepareSkillLookArt,skillLookContext,registerSkillLookSource} from './skill-look-material.mjs';
import {drawFourth,drawFourthGround} from './fourth-effects.mjs';
import {fourthBarrage} from './fourth-effects.mjs';
import {costumeMotionFrame,costumeMotionScale} from './costume-motion.mjs';
import {COSTUMES} from './costumes.mjs';
globalThis.Image=class{complete=true;naturalWidth=1536;naturalHeight=1920;decode(){return Promise.resolve();}};
function context(){const trace=[],values={globalAlpha:1};return {trace,g:new Proxy(values,{get(t,k){if(k in t)return t[k];return (...args)=>{if(k==='drawImage'){trace.push([k,...args.slice(-4)]);return;}if(k.startsWith('create'))return {addColorStop(){}};trace.push([k,...args]);};},set(t,k,v){t[k]=v;return true;}})};}
let runs=0;
const atlas={complete:true,naturalWidth:1983,naturalHeight:793,src:'tower/fourth-job-atlas.webp'},impact={complete:true,naturalWidth:1600,naturalHeight:960,src:'tower/fourth-impact-atlas-v2.webp'};
for(const look of SKILL_LOOKS){
 await prepareSkillLookArt(look.id);
 for(const tier of [1,2,3,4,5]){
  const source=registerSkillLookSource({width:500,height:500},{tier,part:1}),a=context(),b=context();
  a.g.drawImage(source,2,3,44,55,-112,-42,224,84);skillLookContext(b.g,look,{kind:'priest',slot:tier}).drawImage(source,2,3,44,55,-112,-42,224,84);assert.deepEqual(a.trace,b.trace,'source replacement must preserve exact destination geometry');
 }
 if(look.classId==='priest')continue;
 for(const time of [1,5,12,24]){
  const e={kind:'fourth',classId:look.classId,x:500,y:600,size:480,start:0,end:45,orbit:['warrior','rogue'].includes(look.classId),pulse:0};
  const snapshot=structuredClone(e),a=context(),b=context(),player={x:180,y:250};
  drawFourthGround(a.g,e,time);drawFourth(a.g,e,time,player,[],atlas,impact);
  const g=skillLookContext(b.g,look,e);drawFourthGround(g,e,time);drawFourth(g,e,time,player,[],atlas,impact);
  assert.deepEqual(a.trace,b.trace,`${look.id}: orbit, rain and impact choreography`);assert.deepEqual(e,snapshot);assert.deepEqual(fourthBarrage(e,time),fourthBarrage(snapshot,time));runs++;
 }
}
const renderer=await readFile(new URL('./tower-renderer.mjs',import.meta.url),'utf8');
assert.ok(!renderer.includes('drawSkillLook('),'battle must never replace choreography with a generic theme stamp');
for(const c of COSTUMES.filter(c=>c.price>=10000000)){
 assert.equal(c.twoLegWalk,true);assert.equal(c.authoredWalk,true);assert.ok(!c.bobWalk);assert.match(c.atlas,/-motion-twolegs-v1.webp$/);
 for(let dir=0;dir<8;dir++){
  const poses=Array.from({length:8},(_,i)=>costumeMotionFrame(c.classId,dir,true,false,0,i,c.motionLayout));
  assert.equal(new Set(poses.map(p=>p.frame.y)).size,3,'standing and two authored leg steps');
  assert.equal(new Set(poses.map(p=>costumeMotionScale(p,180))).size,1,'head scale stays fixed during walking');
 }
}
console.log('PASS 18 native materials, 90 tier mappings, '+runs+' native orbit/rain geometry traces, and 18 single-sprite fixed-scale walk rigs');
