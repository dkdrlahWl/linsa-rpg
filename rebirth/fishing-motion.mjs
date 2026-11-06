import {fishingSkin} from './fishing-skins.mjs';
// Measured rod tips in the padded 512px frames of angler-poses-v2.webp.
export const ROD_TIPS=[[.7768,.26066],[.08211,.19328],[.8484,.28434],[.77832,.30133],[.89715,.4316],[.64426,.25438]];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function fishingSceneMotion({width,height,angler,phase,pose=0,elapsed=900,time=0,reduced=false,tips=ROD_TIPS}){
 const t=reduced?0:time/1000;
 let angle=0,dy=0;
 if(!reduced){
  if(phase==='casting')angle=elapsed<220?8*Math.sin(clamp(elapsed/220,0,1)*Math.PI):-9*Math.sin(clamp((elapsed-220)/680,0,1)*Math.PI);
  else if(phase==='waiting'){angle=.35*Math.sin(t*2);dy=-.8*Math.sin(t*2);}
  else if(phase==='hooking')angle=-5;
  else if(phase==='reeling'){angle=-1.5+1.5*Math.sin(t*8);dy=-.6*Math.sin(t*8);}
 }
 const [ax,ay]=tips[pose]||tips[0],size=angler.size;
 const ox=size*(angler.seat?.[0]??.42),oy=size*(angler.seat?.[1]??.82),rx=ax*size-ox,ry=ay*size-oy,r=angle*Math.PI/180;
 const tip={x:angler.left+ox+rx*Math.cos(r)-ry*Math.sin(r),y:angler.top+oy+rx*Math.sin(r)+ry*Math.cos(r)+dy};
 const seatY=angler.top+size*(angler.seat?.[1]??.82);
 let x=width*.86,y=clamp(seatY-height*.11,height*.46,height*.62),slack=Math.min(14,height*.035),splash=false;
 if(phase==='casting'){
  const p=clamp((elapsed-220)/680,0,1),ease=1-(1-p)**2;
  x=tip.x+(x-tip.x)*ease;y=tip.y+(y-tip.y)*ease-Math.sin(p*Math.PI)*height*.22;
  if(elapsed<220){x=tip.x+5;y=tip.y+18;}
  slack=3+Math.sin(p*Math.PI)*9;splash=p>.9;
 }else if(phase==='waiting'){x+=1.2*Math.sin(t*1.8);y+=1.4*Math.sin(t*2.4);}
 else if(phase==='bite'){y+=4+4*Math.sin(t*14);slack=3;splash=true;}
 else if(phase==='hooking'){y-=7;slack=1;splash=true;}
 else if(phase==='reeling'){x+=Math.sin(t*7)*Math.min(7,width*.02);y+=Math.sin(t*9)*2;slack=1.5;splash=true;}
 x=clamp(x,8,width-8);y=clamp(y,8,height-8);
 const end={x,y},control={x:(tip.x+x)/2,y:(tip.y+y)/2+slack};
 return {tip,end,control,angle,dy,splash,visible:['casting','waiting','bite','hooking','reeling'].includes(phase)};
}
// Measured sitting points on the actual dock/stone platform in each source image.
export const FISHING_DOCKS=Object.freeze({brook:[.43,.64],moon:[.45,.635],canyon:[.42,.66],coral:[.42,.625],abyss:[.42,.65],palace:[.41,.625],volcano:[.45,.63],origin:[.40,.63],glacier:[.45,.635],galaxy:[.42,.65]});
export function fishingDockLayout({width,height,imageWidth,imageHeight,site,skin='default'}){
 const [ax,ay]=FISHING_DOCKS[site]||FISHING_DOCKS.brook,scale=Math.max(width/imageWidth,height/imageHeight);
 const iw=imageWidth*scale,ih=imageHeight*scale;
 const left=clamp(width*.36-ax*iw,width-iw,0),top=clamp(height*.63-ay*ih,height-ih,0);
 const dock={x:left+ax*iw,y:top+ay*ih},seat=fishingSkin(skin).seat;
 const size=Math.min(width*(width>=700?.30:.44),width>=700?260:240,dock.x/seat[0]*.96,dock.y/seat[1]*.96);
 return {image:{left,top,width:iw,height:ih},dock,angler:{left:dock.x-seat[0]*size,top:dock.y-seat[1]*size,size}};
}
export function mountFishingScene(scene,started){
 if(!scene)return {dispose(){}};
 const angler=scene.querySelector('.fishing-angler'),line=scene.querySelector('.fishing-line'),path=line.querySelector('path');
 const bobber=scene.querySelector('.fishing-bobber'),ripple=scene.querySelector('.fishing-ripple'),splash=scene.querySelector('.fishing-splash');
 const art=scene.querySelector('.fishing-scene-art'),skin=fishingSkin(angler.dataset.skin);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 let raf=0,disposed=false,layout;
 const measure=()=>{
  if(!art?.naturalWidth||!scene.clientWidth||!scene.clientHeight)return;
  const anchored=fishingDockLayout({width:scene.clientWidth,height:scene.clientHeight,imageWidth:art.naturalWidth,imageHeight:art.naturalHeight,site:scene.dataset.site,skin:skin.id});
  art.dataset.anchored='true';Object.assign(art.style,{left:anchored.image.left+'px',top:anchored.image.top+'px',width:anchored.image.width+'px',height:anchored.image.height+'px'});
  Object.assign(angler.style,{left:anchored.angler.left+'px',top:anchored.angler.top+'px',bottom:'auto',width:anchored.angler.size+'px',height:anchored.angler.size+'px',transformOrigin:(skin.seat[0]*100)+'% '+(skin.seat[1]*100)+'%'});
  layout={width:scene.clientWidth,height:scene.clientHeight,angler:{...anchored.angler,seat:skin.seat}};line.setAttribute('viewBox',`0 0 ${layout.width} ${layout.height}`);
 };
 const onArtLoad=()=>{measure();if(!raf)draw();};
 const observer=new ResizeObserver(onArtLoad);observer.observe(scene);measure();art?.addEventListener('load',onArtLoad);
 function draw(){
  raf=0;if(disposed||document.hidden||!layout)return;
  const motion=fishingSceneMotion({...layout,phase:scene.dataset.phase,pose:Number(angler.dataset.pose),elapsed:Date.now()-started,time:performance.now(),reduced,tips:skin.tips});
  angler.style.transform=`translateY(${motion.dy}px) rotate(${motion.angle}deg)`;
  path.setAttribute('d',`M ${motion.tip.x} ${motion.tip.y} Q ${motion.control.x} ${motion.control.y} ${motion.end.x} ${motion.end.y}`);
  for(const el of [bobber,ripple,splash]){el.style.left=motion.end.x+'px';el.style.top=motion.end.y+'px';}
  line.style.visibility=bobber.style.visibility=motion.visible?'visible':'hidden';
  ripple.style.visibility=motion.visible&&scene.dataset.phase!=='casting'?'visible':'hidden';
  splash.style.visibility=motion.splash?'visible':'hidden';
  if(motion.visible)raf=requestAnimationFrame(draw);
 };
 const visibility=()=>{cancelAnimationFrame(raf);if(!document.hidden)draw();};
 document.addEventListener('visibilitychange',visibility);draw();
 return {dispose(){disposed=true;cancelAnimationFrame(raf);observer.disconnect();art?.removeEventListener('load',onArtLoad);document.removeEventListener('visibilitychange',visibility);}};
}
