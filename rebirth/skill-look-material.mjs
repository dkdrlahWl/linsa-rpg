import {skillLookDestination} from './skill-look-fit.mjs';
import {SKILL_LOOK_SOURCE} from './skill-look-source.mjs';
import {orientedSkillLookSource} from './skill-look-orientation.mjs';
import {skillLookSourceRect} from './skill-look-bounds.mjs';
import {skillLookArtPath,skillLookDesign} from './skill-look-designs.mjs';
import {skillLookById} from './skill-looks.mjs';
const images=new Map(),loads=new Map(),sources=new WeakMap(),tints=new WeakMap();
export const skillLookAtlasURL=id=>new URL(`./${skillLookArtPath(id)}`,import.meta.url).href;
export function prepareSkillLookArt(id){
 if(!skillLookById(id))return Promise.resolve(null);
 if(!loads.has(id)){const im=new Image();im.src=skillLookAtlasURL(id);images.set(id,im);loads.set(id,im.decode().then(()=>{orientedSkillLookSource(id,5,0,im,skillLookSourceRect(id,5,0,im.naturalWidth,im.naturalHeight));return im;}).catch(()=>null));}
 return loads.get(id);
}
export function registerSkillLookSource(source,info){if(source)sources.set(source,info);return source;}
export function skillLookSourcePart(source,args,e){
 const info=sources.get(source),url=source?.src||'';
 const sx=args.length===8?args[0]:0,sy=args.length===8?args[1]:0;
 const width=source?.naturalWidth||source?.width||1,height=source?.naturalHeight||source?.height||1;
 if(info?.tint)return {tint:true};
 if(info)return {tier:info.tier,part:info.part??Math.min(3,Math.floor((info.axis==='row'?sy/height:sx/width)*(info.cells||4)))};
 if(/second-(mage|archer|pirate)-attack/.test(url)){
  const cuts=url.includes('pirate')?[0,455/2172,935/2172,1600/2172]:url.includes('mage')?[0,525/2172,1060/2172,1665/2172]:[0,.25,.5,.75];
  return {tier:1,part:cuts.reduce((part,x,i)=>sx/width>=x-.002?i:part,0)};
 }
 if(url.includes('second-job-atlas'))return {tier:1,part:Math.min(3,Math.round(sy/(height/4)))};
 if(url.includes('third-job-atlas'))return {tier:3,part:Math.min(3,Math.round(sy/(height/4)))};
 if(url.includes('fourth-job-atlas'))return {tier:4,part:0};
 if(url.includes('fourth-impact-atlas'))return {tier:4,part:2};
 return null;
}
// Replace painted materials without changing native choreography or hit areas.
// Priest figures alone use uniform raster scaling to avoid stretching anatomy.
export function skillLookContext(g,look,e){
 if(!look)return g;
 const design=skillLookDesign(look.id),im=images.get(look.id);if(!im?.complete||!im.naturalWidth){void prepareSkillLookArt(look.id);return g;}
 return new Proxy(g,{
  get(target,key){
   if(key===SKILL_LOOK_SOURCE)return (tier,part)=>orientedSkillLookSource(look.id,tier,part,im,skillLookSourceRect(look.id,tier,part,im.naturalWidth,im.naturalHeight));
   if(key==='drawImage')return (source,...args)=>{
    const part=skillLookSourcePart(source,args,e);if(!part)return target.drawImage(source,...args);
    if(part.tint){
     let cache=tints.get(source);if(!cache)tints.set(source,cache=new Map());
     if(!cache.has(look.id)){const c=document.createElement('canvas');c.width=source.width;c.height=source.height;const q=c.getContext('2d');q.drawImage(source,0,0);q.globalCompositeOperation='source-atop';q.fillStyle=design.color;q.globalAlpha=.65;q.fillRect(0,0,c.width,c.height);cache.set(look.id,c);}
     return target.drawImage(cache.get(look.id),...args);
    }
    const rect=skillLookSourceRect(look.id,part.tier,part.part,im.naturalWidth,im.naturalHeight),dest=args.length===8?args.slice(4):args.length===4?args:[args[0],args[1],source.width,source.height];
    const paint=orientedSkillLookSource(look.id,part.tier,part.part,im,rect);
    return target.drawImage(paint.image,paint.x,paint.y,paint.w,paint.h,...skillLookDestination(look,paint,dest));
   };
   const value=target[key];return typeof value==='function'?value.bind(target):value;
  },
  set(target,key,value){
   if(['strokeStyle','fillStyle','shadowColor'].includes(key)&&typeof value==='string'&&/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(value))value=design.color+(value.length===9?value.slice(7):'');
   target[key]=value;return true;
  }
 });
}
