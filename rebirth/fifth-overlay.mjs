import {beginFifth,stepFifth,boundedCombatEffects,FIFTH_SKILLS} from './fifth-job.mjs?v=fifth-114';
import {prepareFifthArt,drawFifth,drawFifthGround} from './fifth-effects.mjs?v=fifth-range-118';
const images=new Map(),overlays=new WeakMap();
const image=src=>{if(!images.has(src)){const im=new Image();im.src=new URL(src,import.meta.url).href;images.set(src,im);}return images.get(src);};

// Compact field/boss screens share the full cast sequence with movement battles.
export async function playFifthOverlay(arena,classId){
 if(!FIFTH_SKILLS[classId]||classId==='priest')return;
 overlays.get(arena)?.remove();
 const canvas=document.createElement('canvas');canvas.className='skill-sequence-overlay fifth-sequence-overlay';canvas.setAttribute('aria-hidden','true');
 arena.append(canvas);overlays.set(arena,canvas);
 await prepareFifthArt([classId],image);if(!canvas.isConnected)return;
 const rect=arena.getBoundingClientRect();if(!rect.width||!rect.height){canvas.remove();return;}
 const dpr=Math.min(devicePixelRatio||1,1.5),unit=3200/rect.width;
 canvas.width=Math.min(800,Math.max(360,Math.round(rect.width*dpr)));canvas.height=Math.round(canvas.width*rect.height/rect.width);
 const targetElement=arena.querySelector('.monster-sprite,.monster img,.monster'),targetRect=targetElement?.getBoundingClientRect();
 const target={id:'overlay-target',x:targetRect?(targetRect.left+targetRect.width/2-rect.left)*unit:1850,y:targetRect?(targetRect.bottom-rect.top-15)*unit:rect.height*unit*.68,hp:1e8,maxHp:1e8};
 const a={id:'overlay',classId,x:576,y:rect.height*unit*.78,hp:1e8,power:{level:200,advancement:4}},g=canvas.getContext('2d');
 if(!beginFifth(a,target,0)){canvas.remove();return;}
 let effects=[],tick=-1,last=-Infinity;const started=performance.now(),end=a.fifthCast.end;
 function frame(now){
  const time=(now-started)/100;if(!canvas.isConnected||time>=end){canvas.remove();return;}
  if(now-last>=1000/30){
   last=now;while(tick<Math.floor(time))stepFifth(a,[target],++tick,()=>{},e=>effects.push({...e,targetX:target.x,targetY:target.y}));
   effects=boundedCombatEffects(effects,time,40);g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,canvas.width,canvas.height);
   g.scale(canvas.width/3200,canvas.width/3200);
   for(const e of effects)if(e.kind==='fifth-field'){drawFifthGround(g,e,time,.7);drawFifth(g,e,time,.8);}
   for(const e of effects)if(e.kind==='fifth')drawFifth(g,e,time,.85);
  }requestAnimationFrame(frame);
 }requestAnimationFrame(frame);
}
