import {skillLookById} from './skill-looks.mjs';
const clamp=v=>Math.max(0,Math.min(1,v)),mix=(a,b,t)=>a+(b-a)*t;
const art=new Map(),loads=new Map();
export const skillLookAtlasURL=id=>new URL(`./skill-looks/${id}-skills-v1.webp`,import.meta.url).href;
export function prepareSkillLookArt(id){
 if(!skillLookById(id))return Promise.resolve(null);
 if(!loads.has(id)){
  const image=new Image();image.src=skillLookAtlasURL(id);art.set(id,image);
  loads.set(id,image.decode().then(()=>image).catch(()=>null));
 }
 return loads.get(id);
}
export function skillLookIllustration(look){
 return `<img src="skill-looks/${look.id}-preview-v1.webp" alt="${look.name}" loading="lazy" class="skill-look-illustration">`;
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
export function drawSkillLook(g,e,time,look,owner=null){
 if(!look||!SKILL_LOOK_EFFECT_KINDS.includes(e.kind)||e.hostile||time<e.start||time>=e.end)return false;
 const image=art.get(look.id);if(!image?.complete||!image.naturalWidth){void prepareSkillLookArt(look.id);return false;}
 const {tier,row,column,progress:p}=skillLookFrame(e,time);
 const sw=image.naturalWidth/3,sh=image.naturalHeight/5;
 const orbit=e.orbit||e.mode==='self'||e.follow;
 let x=orbit&&owner?owner.x:e.x,y=orbit&&owner?owner.y:e.y;
 let rotation=0,w=Math.max(90,Math.min(1400,e.size||e.radius*2||470)),h=w;
 if(e.kind==='second-sequence'&&e.phase==='charge'){x=e.fromX??x;y=e.fromY??y;w*=.48;h=w;}
 else if(tier<=2&&e.fromX!==undefined&&e.impact!==undefined&&time<e.impact){
  const fly=clamp((time-e.start)/Math.max(1,e.impact-e.start));
  x=mix(e.fromX,x,fly);y=mix(e.fromY,y,fly);rotation=(e.angle||0)+.35;w*=.65;h=w;
 }
 // Wide fields keep the existing ground/range telegraph; the art rises above
 // that same center. The original effect objects remain untouched.
 if(tier>=4)h=w*1.04;
 g.save();g.translate(x,y-(tier>=3?h*.14:15));g.rotate(rotation);
 // 전투 중 투명도는 설정 > 스킬 투명도(skill-alpha.mjs)가 차수별로 곱한다.
 g.globalCompositeOperation='source-over';g.globalAlpha=Math.min(.94,(1-p)*6)* (e.phase==='charge'?.65:1)*(e.opacity??1);
 const breathe=1+Math.sin(p*Math.PI)*.035;w*=breathe;h*=breathe;
 g.drawImage(image,column*sw,row*sh,sw,sh,-w/2,-h*.65,w,h);
 g.restore();return true;
}
export function playSkillLookPreview(canvas,look,{loop=true,slot=1,cycle=true}={}){
 const g=canvas.getContext('2d');let stopped=false,raf,start=performance.now();
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 let ready=false;void prepareSkillLookArt(look.id).then(()=>{ready=true;});
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
export function playSkillLookOverlay(arena,look,slot){
 const canvas=document.createElement('canvas');canvas.width=800;canvas.height=700;canvas.className='skill-sequence-overlay';canvas.setAttribute('aria-hidden','true');arena.append(canvas);
 const g=canvas.getContext('2d'),start=performance.now();void prepareSkillLookArt(look.id);
 const kind=['','first','second-sequence','third','fourth','fifth'][slot]||'first';
 const frame=now=>{const time=(now-start)/100;if(!canvas.isConnected||time>=28){canvas.remove();return;}g.clearRect(0,0,800,700);drawSkillLook(g,{kind,classId:look.classId,x:425,y:365,size:520,start:0,end:28},time,look);requestAnimationFrame(frame);};requestAnimationFrame(frame);
}
