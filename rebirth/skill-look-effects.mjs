import {skillLookPreviewPath} from './skill-look-designs.mjs';
import {skillLookById} from './skill-looks.mjs';
const clamp=v=>Math.max(0,Math.min(1,v)),mix=(a,b,t)=>a+(b-a)*t;
import {prepareSkillLookArt,skillLookAtlasURL,skillLookContext} from './skill-look-material.mjs';
import {drawSecondSequence} from './second-effects.mjs';
import {drawFourth,drawFourthGround} from './fourth-effects.mjs';
import {drawFifth,drawFifthGround,prepareFifthArt} from './fifth-effects.mjs';
import {drawPriestSkillArt,preparePriestSkillArt} from './priest-skill-art.mjs';
export {prepareSkillLookArt,skillLookAtlasURL};
const nativeImages=new Map();
const nativeImage=path=>{if(!nativeImages.has(path)){const im=new Image();im.src=new URL('./'+path,import.meta.url).href;nativeImages.set(path,im);}return nativeImages.get(path);};
export async function prepareNativePreview(look){await Promise.all([prepareSkillLookArt(look.id),prepareFifthArt([look.classId],nativeImage),look.classId==='priest'?preparePriestSkillArt():null,...['tower/second-job-atlas.webp','tower/third-job-atlas.webp','tower/second-sequence-atlas-v1.webp','tower/fourth-job-atlas.webp','tower/fourth-impact-atlas-v2.webp'].map(p=>nativeImage(p).decode().catch(()=>null))]);}
export function skillLookIllustration(look){
 return `<img src="${skillLookPreviewPath(look.id)}" alt="${look.name}" loading="lazy" class="skill-look-illustration">`;
}
export const SKILL_LOOK_EFFECT_KINDS=Object.freeze(['first','second','second-sequence','third','fourth','fifth','fifth-field','priest']);
export function skillLookTier(e){return e.kind==='priest'?Math.max(1,Math.min(5,e.slot||1)):e.kind==='first'?1:e.kind==='second'||e.kind==='second-sequence'?2:e.kind==='third'?3:e.kind==='fourth'?4:5;}
// Resolve the owning actor, never a viewer's choice onto somebody else's spells.
export function skillLookForEffect(b,e){
 if(e.hostile)return null;
 const self=e.owner==null||e.owner===(b.actorId??b.id);
 const actor=self?b:(b.allies||[]).find(a=>a.id===e.owner);
 const c=skillLookById(actor?.power?.skillLookId);
 return c&&c.classId===(e.classId||actor?.classId)?c:null;
}
export function skillLookFrame(e,time){
 const tier=skillLookTier(e),duration=Math.max(1,e.end-e.start),p=clamp((time-e.start)/duration);
 // Pulse VFX lands on the authoritative impact tick; purely visual frames never
 // schedule damage, healing, cooldowns, targeting or a second combat event.
 let column;
 if(e.impact!==undefined)column=time<e.impact?0:time<e.impact+(e.end-e.impact)*.65?1:2;
 else column=p<.24?0:p<.76?1:2;
 return {tier,row:tier-1,column,progress:p};
}
// Previews use the same native choreography as combat, including projectile paths.
export function drawSkillLook(ctx,e,time,look){
 if(!look||e.hostile||time<e.start||time>=e.end)return false;
 const tier=skillLookTier(e),classId=look.classId,g=skillLookContext(ctx,look,e),age=clamp((time-e.start)/(e.end-e.start)),frame=Math.min(3,Math.floor(age*4));
 const event={...e,classId,slot:tier,fromX:e.x-200,fromY:e.y+20,angle:0,radius:180,size:360,impact:e.start+9,pulse:0,final:false,mode:classId==='mage'?'fixed':classId==='pirate'?'self':'tracking'};
 if(classId==='priest'){drawPriestSkillArt(g,event,time,{scale:.36});return true;}
 if(tier===2){drawSecondSequence(g,event,time,nativeImage('tower/second-sequence-atlas-v1.webp'),()=>{});return true;}
 if(tier===4){event.orbit=['warrior','rogue'].includes(classId);drawFourthGround(g,event,time);drawFourth(g,event,time,{x:e.x,y:e.y},[],nativeImage('tower/fourth-job-atlas.webp'),nativeImage('tower/fourth-impact-atlas-v2.webp'));return true;}
 if(tier===5){drawFifthGround(g,event,time);drawFifth(g,event,time);return true;}
 const im=nativeImage(tier===3?'tower/third-job-atlas.webp':'tower/second-job-atlas.webp');if(!im.complete||!im.naturalWidth)return false;
 const col=['warrior','mage','archer','rogue','pirate'].indexOf(classId),sw=im.naturalWidth/5,sh=im.naturalHeight/4;
 const flight=['archer','pirate'].includes(classId)?Math.min(1,age*3):1,x=mix(event.fromX,event.x,flight);
 g.save();g.globalAlpha=.9;g.drawImage(im,col*sw,frame*sh,sw,sh,x-180,event.y-230,360,288);g.restore();return true;
}
export function playSkillLookPreview(canvas,look,{loop=true,slot=1,cycle=true}={}){
 const g=canvas.getContext('2d');let stopped=false,raf,start=performance.now();
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 let ready=false;void prepareNativePreview(look).then(()=>{ready=true;});
 const draw=now=>{
  if(stopped||!canvas.isConnected)return;
  const t=(now-start)/100,clock=loop?t%28:t,stage=cycle?1+Math.floor(t/28)%5:slot;
  const kind=['','first','second-sequence','third','fourth','fifth'][stage];
  g.clearRect(0,0,canvas.width,canvas.height);g.fillStyle='#091624';g.fillRect(0,0,canvas.width,canvas.height);
  g.save();g.translate(canvas.width/2,canvas.height*.72);g.scale(canvas.width/620,canvas.width/620);
  drawSkillLook(g,{kind,classId:look.classId,x:0,y:0,size:355,start:0,end:28,preview:true},reduced?12:clock,look);g.restore();
  g.fillStyle='#e9e4f4';g.textAlign='center';g.font='16px sans-serif';g.fillText(`${stage}차 스킬 · ${look.name}`,canvas.width/2,canvas.height-15);
  if(!reduced||!ready)raf=requestAnimationFrame(draw);
 };
 draw(performance.now());return ()=>{stopped=true;cancelAnimationFrame(raf);};
}
export async function playSkillLookOverlay(arena,look,slot){
 await prepareSkillLookArt(look.id);
 if(look.classId==='priest'){const{playHolyOverlay}=await import('./priest-overlay.mjs');playHolyOverlay(arena,slot,look);return;}
 if(slot===5){const{playFifthOverlay}=await import('./fifth-overlay.mjs');return playFifthOverlay(arena,look.classId,look);}
 if(slot===2){const{playSecondOverlay}=await import('./skill-overlay.mjs');playSecondOverlay(arena,look.classId,look);return;}
 const canvas=document.createElement('canvas');canvas.width=800;canvas.height=700;canvas.className='skill-sequence-overlay';canvas.setAttribute('aria-hidden','true');arena.append(canvas);
 const g=canvas.getContext('2d'),start=performance.now();void prepareNativePreview(look);
 const kind=['','first','second-sequence','third','fourth','fifth'][slot]||'first';
 const frame=now=>{const time=(now-start)/100;if(!canvas.isConnected||time>=28){canvas.remove();return;}g.clearRect(0,0,800,700);drawSkillLook(g,{kind,classId:look.classId,x:425,y:365,size:520,start:0,end:28},time,look);requestAnimationFrame(frame);};requestAnimationFrame(frame);
}
