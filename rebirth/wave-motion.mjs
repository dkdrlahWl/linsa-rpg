// Small cached mesh animations: preserve each painted creature's face while
// alternating its feet, wings or body. No per-enemy pixel processing per frame.
const caches=new Map(),preparations=new Map();
const idle=()=>new Promise(resolve=>window.requestIdleCallback?requestIdleCallback(resolve,{timeout:1000}):setTimeout(resolve,0));
const modes=['walk','walk','crawl','beast','beast','hop','beast','float','crawl','heavy','fly','slither','walk','heavy','float','crawl','beast','fly','float','beast','crawl','walk','crawl','hop','walk','float','beast','heavy','beast','fly'];
function triangle(g,im,s,d){
 const [a,b,c]=s,[p,q,r]=d,det=a.x*(b.y-c.y)+b.x*(c.y-a.y)+c.x*(a.y-b.y);if(Math.abs(det)<.001)return;
 const solve=(v1,v2,v3)=>[(v1*(b.y-c.y)+v2*(c.y-a.y)+v3*(a.y-b.y))/det,(v1*(c.x-b.x)+v2*(a.x-c.x)+v3*(b.x-a.x))/det,(v1*(b.x*c.y-c.x*b.y)+v2*(c.x*a.y-a.x*c.y)+v3*(a.x*b.y-b.x*a.y))/det];
 const x=solve(p.x,q.x,r.x),y=solve(p.y,q.y,r.y);
 g.save();g.beginPath();g.moveTo(p.x,p.y);g.lineTo(q.x,q.y);g.lineTo(r.x,r.y);g.closePath();g.clip();g.transform(x[0],y[0],x[1],y[1],x[2],y[2]);g.drawImage(im,0,0);g.restore();
}
async function build(im,mode){
 const base=document.createElement('canvas');base.width=256;base.height=256;const g=base.getContext('2d'),scale=220/Math.max(im.naturalWidth,im.naturalHeight),iw=im.naturalWidth*scale,ih=im.naturalHeight*scale;g.drawImage(im,(256-iw)/2,238-ih,iw,ih);
 const frames=[];
 for(let f=0;f<12;f++){
  await idle();
  const frame=document.createElement('canvas');frame.width=256;frame.height=256;const h=frame.getContext('2d'),phase=f/12*Math.PI*2;
  const deform=(x,y)=>{const u=(x-128)/110,v=Math.max(0,Math.min(1,(y-(238-ih))/ih)),step=Math.sin(phase),legs=Math.max(0,(v-.58)/.42);let dx=0,dy=0;
   if(mode==='fly'){dy=Math.cos(phase)*(Math.abs(u)**1.6)*9;dx=Math.sin(phase)*u*3;}
   else if(mode==='float'){dx=Math.sin(phase+v*2)*2*v;dy=Math.sin(phase)*2;}
   else if(mode==='slither'){dx=Math.sin(phase+v*5)*6*v;dy=Math.cos(phase+u)*2;}
   else if(mode==='hop'){dy=-Math.max(0,step)*7*(1-legs*.35);dx=step*u*2;}
   else{const side=Math.sin(phase+(u<0?0:Math.PI));dx=side*legs*(mode==='heavy'?2:mode==='crawl'?4:5);dy=-Math.max(0,side)*legs*5+Math.cos(phase*2)*(1-legs)*(mode==='heavy'?1:2);}
   return {x:x+dx,y:y+dy};};
  for(let y=0;y<256;y+=32)for(let x=0;x<256;x+=32){const a={x,y},b={x:x+32,y},c={x:x+32,y:y+32},d={x,y:y+32};triangle(h,base,[a,b,c],[deform(a.x,a.y),deform(b.x,b.y),deform(c.x,c.y)]);triangle(h,base,[a,c,d],[deform(a.x,a.y),deform(c.x,c.y),deform(d.x,d.y)]);}
  frames.push(frame);
 }
 return {base,frames};
}
export function drawWaveCreature(g,im,e,time,size){
 if(!im.complete||!im.naturalWidth)return;
 const mode=modes[e.species%30];let atlas=caches.get(im.src);
 if(!atlas){void prepareWaveCreature(im,e.species);const gscale=220/Math.max(im.naturalWidth,im.naturalHeight);g.save();g.translate(e.x,e.y);g.scale(e.face||1,1);g.drawImage(im,-im.naturalWidth*gscale*size/512,-im.naturalHeight*gscale*size/256,im.naturalWidth*gscale*size/256,im.naturalHeight*gscale*size/256);g.restore();return;}
 const moving=e.moving,frame=Math.floor(((e.walk||0)+(moving?time%1:0))*2.0)%12,src=moving?atlas.frames[frame]:atlas.base;
 const windup=(e.strike||e.skill)&&time<(e.attackStart||0),age=Math.max(0,Math.min(1,(time-(e.attackStart||0))/4)),lunge=time<(e.attackUntil||0)?Math.sin(age*Math.PI)*18:0;
 const bob=['fly','float'].includes(mode)?Math.sin(time*.22+e.id)*4:0;
 g.save();g.translate(e.x+Math.cos(e.attackAngle||0)*lunge,e.y+Math.sin(e.attackAngle||0)*lunge+bob);g.scale(e.face||1,1);if(windup)g.rotate(-.035*Math.sin(time*.7));g.drawImage(src,-size*.58,-size*1.02,size*1.16,size*1.16);g.restore();
}

export function prepareWaveCreature(im,species){
 if(caches.has(im.src))return Promise.resolve();
 if(!preparations.has(im.src))preparations.set(im.src,(async()=>{try{await im.decode();const atlas=await build(im,modes[species%30]);caches.set(im.src,atlas);if(caches.size>8)caches.delete(caches.keys().next().value);}catch{}finally{preparations.delete(im.src);}})());
 return preparations.get(im.src);
}
