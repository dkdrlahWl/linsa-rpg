const oriented=new WeakMap();
export const skillLookSourceAngle=(id,tier,part)=>tier===5&&part===0?({'peacock-plume':-100,'starlit-deer':128}[id]||0)*Math.PI/180:0;
// The authored bows face opposite sides. Normalize only that painted component to
// point down, like the native celestial bow; never rotate world-space effects.
export function orientedSkillLookSource(id,tier,part,image,rect){
 const angle=skillLookSourceAngle(id,tier,part);
 if(!angle||typeof document==='undefined')return {image,...rect};
 let cache=oriented.get(image);if(!cache)oriented.set(image,cache=new Map());
 const key=`${id}:${tier}:${part}:${rect.x}:${rect.y}:${rect.w}:${rect.h}`;
 if(!cache.has(key)){
  const canvas=document.createElement('canvas'),c=Math.abs(Math.cos(angle)),s=Math.abs(Math.sin(angle));
  canvas.width=Math.ceil(rect.w*c+rect.h*s);canvas.height=Math.ceil(rect.w*s+rect.h*c);
  const q=canvas.getContext('2d');q.translate(canvas.width/2,canvas.height/2);q.rotate(angle);
  q.drawImage(image,rect.x,rect.y,rect.w,rect.h,-rect.w/2,-rect.h/2,rect.w,rect.h);
  // Trim rotation gutters once during preparation, keeping the visible size fix.
  let x=0,y=0,w=canvas.width,h=canvas.height;
  if(q.getImageData){const pixels=q.getImageData(0,0,w,h).data;let l=w,t=h,r=-1,b=-1;for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++)if(pixels[(yy*w+xx)*4+3]>12){l=Math.min(l,xx);r=Math.max(r,xx);t=Math.min(t,yy);b=Math.max(b,yy);}if(r>=l){x=l;y=t;w=r-l+1;h=b-t+1;}}
  cache.set(key,{image:canvas,x,y,w,h});
 }
 return cache.get(key);
}
