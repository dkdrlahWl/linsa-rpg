// Measured rod tips in the padded 512px frames of angler-poses-v2.webp.
export const ROD_TIPS=[[.7768,.26066],[.08211,.19328],[.8484,.28434],[.77832,.30133],[.89715,.4316],[.64426,.25438]];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function fishingSceneMotion({width,height,angler,phase,pose=0,elapsed=900,time=0,reduced=false}){
 const t=reduced?0:time/1000;
 let angle=0,dy=0;
 if(!reduced){
  if(phase==='casting')angle=elapsed<220?8*Math.sin(clamp(elapsed/220,0,1)*Math.PI):-9*Math.sin(clamp((elapsed-220)/680,0,1)*Math.PI);
  else if(phase==='waiting'){angle=.35*Math.sin(t*2);dy=-.8*Math.sin(t*2);}
  else if(phase==='hooking')angle=-5;
  else if(phase==='reeling'){angle=-1.5+1.5*Math.sin(t*8);dy=-.6*Math.sin(t*8);}
 }
 const [ax,ay]=ROD_TIPS[pose]||ROD_TIPS[0],size=angler.size;
 const ox=size*.5,oy=size*.85,rx=ax*size-ox,ry=ay*size-oy,r=angle*Math.PI/180;
 const tip={x:angler.left+ox+rx*Math.cos(r)-ry*Math.sin(r),y:angler.top+oy+rx*Math.sin(r)+ry*Math.cos(r)+dy};
 let x=width*.64,y=height*.67,slack=Math.min(14,height*.035),splash=false;
 if(phase==='casting'){
  const p=clamp((elapsed-220)/680,0,1),ease=1-(1-p)**2;
  x=tip.x+(x-tip.x)*ease;y=tip.y+(y-tip.y)*ease-Math.sin(p*Math.PI)*height*.18;
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
export function mountFishingScene(scene,started){
 if(!scene)return {dispose(){}};
 const angler=scene.querySelector('.fishing-angler'),line=scene.querySelector('.fishing-line'),path=line.querySelector('path');
 const bobber=scene.querySelector('.fishing-bobber'),ripple=scene.querySelector('.fishing-ripple'),splash=scene.querySelector('.fishing-splash');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 let raf=0,disposed=false,layout;
 const measure=()=>{layout={width:scene.clientWidth,height:scene.clientHeight,angler:{left:angler.offsetLeft,top:angler.offsetTop,size:angler.offsetWidth}};line.setAttribute('viewBox',`0 0 ${layout.width} ${layout.height}`);};
 const observer=new ResizeObserver(measure);observer.observe(scene);observer.observe(angler);measure();
 const draw=()=>{
  if(disposed||document.hidden)return;
  const motion=fishingSceneMotion({...layout,phase:scene.dataset.phase,pose:Number(angler.dataset.pose),elapsed:Date.now()-started,time:performance.now(),reduced});
  angler.style.transform=`translateY(${motion.dy}px) rotate(${motion.angle}deg)`;
  path.setAttribute('d',`M ${motion.tip.x} ${motion.tip.y} Q ${motion.control.x} ${motion.control.y} ${motion.end.x} ${motion.end.y}`);
  for(const el of [bobber,ripple,splash]){el.style.left=motion.end.x+'px';el.style.top=motion.end.y+'px';}
  line.style.visibility=bobber.style.visibility=motion.visible?'visible':'hidden';
  ripple.style.visibility=motion.visible&&scene.dataset.phase!=='casting'?'visible':'hidden';
  splash.style.visibility=motion.splash?'visible':'hidden';
  raf=requestAnimationFrame(draw);
 };
 const visibility=()=>{cancelAnimationFrame(raf);if(!document.hidden)draw();};
 document.addEventListener('visibilitychange',visibility);draw();
 return {dispose(){disposed=true;cancelAnimationFrame(raf);observer.disconnect();document.removeEventListener('visibilitychange',visibility);}};
}
