import {skillLookById} from './skill-looks.mjs';
import {transparentEffectAtlas} from './effect-alpha.mjs';

const images=new Map(),frames=new Map();
export function arenaEffectArt(classId,slot,skillLookId=null){
 const look=skillLookById(skillLookId);if(look?.classId===classId)return {url:`skill-looks/${look.id}-skills-v1.webp`,cols:3,rows:5,col:1,row:Math.max(0,Math.min(4,slot-1))};
 const col=Math.max(0,['warrior','mage','archer','rogue','pirate'].indexOf(classId));
 if(classId==='priest')return {url:`tower/priest-skill-${slot}-v2.webp`,cols:4,rows:1,col:0,row:0};
 if(slot===5)return {url:`tower/fifth-${classId}-v1.webp`,cols:2,rows:2,col:1,row:1};
 return {url:slot===4?'tower/fourth-job-atlas.webp':slot===3?'tower/third-job-atlas.webp':slot===2?'tower/second-sequence-atlas-v1.webp':'tower/second-job-atlas.webp',cols:5,rows:slot===4?1:slot===2?3:4,col,row:slot===4?0:2,blackMatte:slot===2};
}
function loadImage(path){
 if(!images.has(path)){
  const image=new Image();image.src=new URL(path,import.meta.url).href;
  images.set(path,image.decode().then(()=>image).catch(()=>null));
 }
 return images.get(path);
}
export function prepareArenaEffect(classId,slot,skillLookId=null){
 const key=`${classId}:${slot}:${skillLookId||"base"}`;
 if(!frames.has(key))frames.set(key,(async()=>{
  const art=arenaEffectArt(classId,slot,skillLookId),image=await loadImage(art.url);if(!image)return null;
  // Use the game's existing light-effect renderer for the opaque second-job atlas.
  // Already-transparent priest and other job artwork keeps its original alpha.
  const source=art.blackMatte?transparentEffectAtlas(image):image;
  const width=image.naturalWidth/art.cols,height=image.naturalHeight/art.rows,scale=Math.min(1,512/Math.max(width,height));
  const canvas=document.createElement('canvas');canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);
  canvas.getContext('2d').drawImage(source,art.col*width,art.row*height,width,height,0,0,canvas.width,canvas.height);
  return canvas;
 })());
 return frames.get(key);
}
export function prepareArenaEffects(result){
 const wanted=new Map();
 for(const frame of result?.battle?.frames||[]){
  if(!['cast','skill'].includes(frame.type))continue;
  const classId=(frame.side===0?result.self:result.opponent)?.classId||'warrior',slot=Math.max(1,frame.slot||1);
  const skillLookId=(frame.side===0?result.self:result.opponent)?.skillLookId;wanted.set(`${classId}:${slot}:${skillLookId||'base'}`,[classId,slot,skillLookId]);
 }
 return Promise.all([...wanted.values()].map(([classId,slot,skillLookId])=>prepareArenaEffect(classId,slot,skillLookId)));
}
export async function drawArenaEffect(canvas,classId,slot,skillLookId=null){
 const frame=await prepareArenaEffect(classId,slot,skillLookId);if(!frame)return false;
 canvas.width=frame.width;canvas.height=frame.height;canvas.getContext('2d').drawImage(frame,0,0);return true;
}
