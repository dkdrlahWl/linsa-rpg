const TAU=Math.PI*2;
const colors={warrior:'#ffbb50',mage:'#b28aff',archer:'#82f3ac',rogue:'#bc9aff',pirate:'#66e5df'};
const atlases=new Map();
export const fifthAsset=cls=>'tower/fifth-'+cls+'-v1.webp';
// Decode and isolate each atlas cell once, outside the animation loop.
export async function prepareFifthArt(classes,image){
 await Promise.all([...new Set(classes)].filter(c=>c!=='priest').map(async cls=>{
  if(atlases.has(cls))return;
  const im=image(fifthAsset(cls));try{await im.decode();}catch{return;}
  const frames=[];
  for(let cell=0;cell<4;cell++){
   const sx=cell%2*im.width/2,sy=Math.floor(cell/2)*im.height/2,sw=im.width/2,sh=im.height/2;
   const canvas=document.createElement('canvas');canvas.width=384;canvas.height=384;const g=canvas.getContext('2d',{willReadFrequently:true});g.drawImage(im,sx,sy,sw,sh,0,0,384,384);
   const d=g.getImageData(0,0,384,384).data;let l=383,t=383,r=0,b=0;
   for(let y=0;y<384;y++)for(let x=0;x<384;x++)if(d[(y*384+x)*4+3]>12){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
   frames.push({im:canvas,x:l,y:t,w:Math.max(1,r-l+1),h:Math.max(1,b-t+1)});
  }
  atlases.set(cls,frames);
 }));
}
function sprite(g,cls,cell,x,y,w,h,angle=0,alpha=1){const f=atlases.get(cls)?.[cell];if(!f)return;g.save();g.translate(x,y);g.rotate(angle);g.globalAlpha*=alpha;g.drawImage(f.im,f.x,f.y,f.w,f.h,-w/2,-h/2,w,h);g.restore();}
export function fifthFields(effects,time){
 const fields=effects.filter(e=>e.kind==='fifth-field'&&e.start<=time&&e.end>time);
 return fields.map(e=>{if(e.mode!=='tracking')return e;const pulses=effects.filter(p=>p.kind==='fifth'&&p.owner===e.owner&&p.classId===e.classId&&p.start>=e.start&&p.start<=time);const last=pulses.at(-1);return last?{...e,x:last.x,y:last.y}:e;});
}
export function drawFifthGround(g,e,time,opacity=1){
 if(e.mode==='homing')return;
 const fade=Math.min(1,(time-e.start+1)/4,(e.end-time)/5),r=e.radius,color=colors[e.classId];
 g.save();g.translate(e.x,e.y);g.globalAlpha=Math.max(0,fade)*opacity;
 if(e.mode==='line'){
  g.rotate(e.angle);g.fillStyle=color;g.globalAlpha*=.07;g.fillRect(0,-e.width/2,e.length,e.width);g.globalAlpha=fade*opacity*.65;g.strokeStyle=color;g.lineWidth=5;g.strokeRect(0,-e.width/2,e.length,e.width);
  for(let i=1;i<5;i++){g.beginPath();g.moveTo(e.length*i/5,-e.width/2);g.lineTo(e.length*i/5,e.width/2);g.globalAlpha=fade*opacity*.13;g.stroke();}
 }else{
  g.fillStyle=color;g.globalAlpha*=.055;g.beginPath();g.arc(0,0,r,0,TAU);g.fill();g.globalAlpha=fade*opacity*.7;g.strokeStyle=color;g.lineWidth=5;g.stroke();
  if(e.classId==='mage')sprite(g,e.classId,0,0,0,r*1.98,r*1.98,(time-e.start)*.006,.3);
  else if(e.classId==='rogue')sprite(g,e.classId,0,0,0,r*1.7,r*1.7,0,.15);
  else {g.globalAlpha=fade*opacity*.25;g.lineWidth=2;g.beginPath();g.arc(0,0,r-22,0,TAU);g.stroke();}
 }
 g.restore();
}
// Image transforms supply motion; no per-frame blur, pixel reads or new canvases.
export function drawFifth(g,e,time,opacity=1){
 const age=time-e.start,impactAge=time-(e.impact??e.start),progress=Math.max(0,Math.min(1,age/4));
 g.save();g.globalAlpha=opacity;
 if(e.kind==='fifth-field'){
  const t=time-e.start,fade=Math.min(1,(t+1)/6,(e.end-time)/6);g.globalAlpha*=Math.max(0,fade);
  if(e.classId==='warrior'&&t<10){for(let i=0;i<8;i++){const a=i*TAU/8+t*.035;sprite(g,e.classId,0,e.fromX+Math.cos(a)*230,e.fromY-150+Math.sin(a)*120,55,230,a+Math.PI/2,.7);}}
  if(e.classId==='mage')sprite(g,e.classId,t<60?1:2,e.x,e.y-210,350+Math.sin(t*.12)*20,350+Math.sin(t*.12)*20,t*.025,.88);
  if(e.classId==='archer')sprite(g,e.classId,0,e.fromX,e.fromY-130,380,430,0,.8);
  if(e.classId==='pirate')for(let i=0;i<3;i++){const a=-Math.PI*.8+i*Math.PI*.3;sprite(g,e.classId,0,e.x+Math.cos(a)*e.radius*.72,e.y+Math.sin(a)*e.radius*.6-130,540,380,0,.58);}
  g.restore();return;
 }
 if(impactAge<0){
  if(e.classId==='archer'||e.classId==='pirate'){
   const ship=e.classId==='pirate',a=ship?-Math.PI*.8+(e.pulse%3)*Math.PI*.3:0,fromX=ship?e.x+Math.cos(a)*e.radius*.72:e.fromX,fromY=ship?e.y+Math.sin(a)*e.radius*.6-150:e.fromY-150;
   const aimX=e.x+(ship?Math.cos(e.pulse*2.4)*e.radius*.45:0),aimY=e.y+(ship?Math.sin(e.pulse*2.4)*e.radius*.45:0);
   const x=fromX+(aimX-fromX)*progress,y=fromY+(aimY-fromY)*progress-Math.sin(progress*Math.PI)*130,angle=Math.atan2(aimY-fromY,aimX-fromX)+Math.PI/2;
   sprite(g,e.classId,1,x,y,ship?160:90,ship?230:340,angle,.95);
  }else if(e.classId==='warrior'){
   const x=e.x+Math.cos(e.angle)*e.length*.55,y=e.y+Math.sin(e.angle)*e.length*.55;
   sprite(g,e.classId,0,x,y-(1-progress)*650,260,e.pulse===0?1250:750,Math.PI,.9);
  }else if(e.classId==='rogue'){
   const a=e.pulse*2.4;sprite(g,e.classId,1,e.x+Math.cos(a)*(1-progress)*460,e.y+Math.sin(a)*(1-progress)*340-90,210,300,a*.08,.65);
  }else if(e.final)sprite(g,e.classId,2,e.x,e.y-110,600+progress*500,600+progress*500,0,.8);
 }else{
  const fade=Math.max(0,1-impactAge/7),scale=.7+impactAge*.07;g.globalAlpha*=fade;
  if(e.classId==='warrior'){
   const count=e.pulse===0?3:2;for(let i=0;i<count;i++){const along=e.length*(.28+i*.25);sprite(g,e.classId,e.pulse===0?3:2,e.x+Math.cos(e.angle)*along,e.y+Math.sin(e.angle)*along-100,700*scale,600*scale,e.angle-Math.PI/2,.8);}
  }else if(e.classId==='rogue')sprite(g,e.classId,e.final?3:2,e.x,e.y-90,e.final?1300*scale:600*scale,e.final?1200*scale:550*scale,e.pulse*.8,.85);
  else if(e.classId==='mage')sprite(g,e.classId,e.final?3:2,e.x,e.y-100,e.final?e.radius*1.75*scale:620*scale,e.final?e.radius*1.75*scale:620*scale,e.pulse*.7,e.final?.75:.65);
  else sprite(g,e.classId,3,e.x,e.y-90,e.final?900*scale:370*scale,e.final?750*scale:340*scale,0,.9);
 }
 g.restore();
}
