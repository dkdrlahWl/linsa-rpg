import bounds from './skill-look-bounds-data.mjs';
import {skillLookArtPath} from './skill-look-designs.mjs';
// Destinations remain native: remove only unused pixels inside the replacement
// source cell so transparent gutters cannot shrink the visible skill radius.
export function skillLookSourceRect(id,tier,part,width,height){
 const data=bounds[id],row=Math.max(0,Math.min(4,tier-1)),col=Math.max(0,Math.min(3,part));
 if(data?.asset===skillLookArtPath(id)&&data.width===width&&data.height===height)return data.frames[row*4+col];
 return {x:col*width/4,y:row*height/5,w:width/4,h:height/5};
}
