const TAU=Math.PI*2;
const colors={warrior:'#ffbb50',mage:'#b28aff',archer:'#82f3ac',rogue:'#bc9aff',pirate:'#66e5df'};
const atlases=new Map(),lights=new Map(),seals=new Map(),blasts=new Map();
const clamp=n=>Math.max(0,Math.min(1,n));
const smooth=n=>{n=clamp(n);return n*n*(3-2*n);};
const out=n=>1-(1-clamp(n))**3;
const mix=(a,b,t)=>a+(b-a)*t;
export const fifthAsset=cls=>'tower/fifth-'+cls+'-v1.webp';
// All raster work happens at load time. Animation uses cached images and paths.
export async function prepareFifthArt(classes,image){
 await Promise.all([...new Set(classes)].filter(c=>colors[c]).map(async cls=>{
  if(atlases.has(cls))return;
  const im=image(fifthAsset(cls));try{await im.decode();}catch{return;}
  const frames=[];
  for(let cell=0;cell<4;cell++){
   const canvas=document.createElement('canvas');canvas.width=canvas.height=384;
   const g=canvas.getContext('2d',{willReadFrequently:true});
   g.drawImage(im,cell%2*im.width/2,Math.floor(cell/2)*im.height/2,im.width/2,im.height/2,0,0,384,384);
   const d=g.getImageData(0,0,384,384).data;let l=383,t=383,r=0,b=0;
   for(let y=0;y<384;y++)for(let x=0;x<384;x++)if(d[(y*384+x)*4+3]>12){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
   frames.push({im:canvas,x:l,y:t,w:Math.max(1,r-l+1),h:Math.max(1,b-t+1)});
  }
  atlases.set(cls,frames);
  const light=document.createElement('canvas');light.width=light.height=128;
  const g=light.getContext('2d'),gradient=g.createRadialGradient(64,64,0,64,64,64);
  gradient.addColorStop(0,'#ffffffcc');gradient.addColorStop(.14,colors[cls]+'a0');gradient.addColorStop(.48,colors[cls]+'38');gradient.addColorStop(1,colors[cls]+'00');
  g.fillStyle=gradient;g.fillRect(0,0,128,128);lights.set(cls,light);
  if(cls==='mage'){
   const seal=document.createElement('canvas');seal.width=seal.height=768;const q=seal.getContext('2d');q.translate(384,384);q.strokeStyle='#d8c0ff';q.lineWidth=4;
   for(const radius of [320,290,170,135,52]){q.beginPath();q.arc(0,0,radius,0,TAU);q.stroke();}
   for(let side=0;side<2;side++){q.beginPath();for(let i=0;i<3;i++){const a=-Math.PI/2+side*Math.PI+i*TAU/3,x=Math.cos(a)*290,y=Math.sin(a)*290;i?q.lineTo(x,y):q.moveTo(x,y);}q.closePath();q.stroke();}
   q.lineWidth=3;for(let i=0;i<12;i++){q.save();q.rotate(i*TAU/12);q.beginPath();q.moveTo(0,-190);q.lineTo(-12,-213);q.lineTo(0,-237);q.lineTo(12,-213);q.closePath();q.moveTo(0,-247);q.lineTo(0,-270);q.stroke();q.restore();}
   q.fillStyle='#eee1ff';q.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4,r=i%2?13:40;const x=Math.cos(a)*r,y=Math.sin(a)*r;i?q.lineTo(x,y):q.moveTo(x,y);}q.closePath();q.fill();seals.set(cls,seal);
  }
  if(cls==='warrior'){
   const wall=document.createElement('canvas');wall.width=1024;wall.height=640;const q=wall.getContext('2d'),f=frames[3];
   for(let row=0;row<2;row++)for(let col=0;col<3;col++){const scale=Math.min(460/f.w,430/f.h),w=f.w*scale,h=f.h*scale;q.drawImage(f.im,f.x,f.y,f.w,f.h,(col+.5)*1024/3-w/2,(row+.5)*320-h/2,w,h);}
   blasts.set(cls,wall);
  }
 }));
}
function dimensions(cls,cell,w,h){const f=atlases.get(cls)?.[cell];if(!f)return [w,h];const scale=Math.min(w/f.w,h/f.h);return [f.w*scale,f.h*scale];}
function sprite(g,cls,cell,x,y,w,h,angle=0,alpha=1,flip=1){
 const f=atlases.get(cls)?.[cell];if(!f||alpha<=0)return;
 const [dw,dh]=dimensions(cls,cell,w,h);
 g.save();g.translate(x,y);g.rotate(angle);g.scale(flip,1);g.globalAlpha*=clamp(alpha);
 g.drawImage(f.im,f.x,f.y,f.w,f.h,-dw/2,-dh/2,dw,dh);g.restore();
}
function glow(g,cls,x,y,size,alpha=1){const im=lights.get(cls);if(!im||alpha<=0)return;g.save();g.globalCompositeOperation='lighter';g.globalAlpha*=clamp(alpha);g.drawImage(im,x-size/2,y-size/2,size,size);g.restore();}
function ring(g,cls,x,y,r,alpha,width=5,flat=.62){if(r<=0||alpha<=0)return;g.save();g.globalAlpha*=clamp(alpha);g.strokeStyle=colors[cls];g.lineWidth=width;g.beginPath();g.ellipse(x,y,r,r*flat,0,0,TAU);g.stroke();g.restore();}
function sparks(g,e,x,y,age,large=false){
 if(age<0||age>=7)return;
 const fade=(1-age/7)**2,count=large?12:g.globalAlpha<.6?3:5,seed=(e.pulse||0)*2.399;
 g.save();g.globalCompositeOperation='lighter';g.globalAlpha*=fade;g.strokeStyle=colors[e.classId];g.lineCap='round';
 for(let i=0;i<count;i++){
  const angle=i*TAU/count+seed,speed=(large?75:30)*(1+(i%3)*.2),distance=out(age/7)*speed*3,tail=15+speed*.22;
  const px=x+Math.cos(angle)*distance,py=y+Math.sin(angle)*distance*.65-age*7;
  g.lineWidth=large?5:3;g.beginPath();g.moveTo(px,py);g.lineTo(px-Math.cos(angle)*tail,py-Math.sin(angle)*tail*.65);g.stroke();
 }g.restore();
}
const pulseAt=e=>e.classId==='pirate'?(e.final?80:12+e.pulse*5):e.classId==='archer'?8+e.pulse*2:0;
function shipAnchor(e,index,t){
 const a=-Math.PI*.82+index*Math.PI*.32,settle=out((t-index*1.2)/7),drift=(1-settle)*260;
 return {x:e.x+Math.cos(a)*(e.radius*.65+drift),y:e.y+Math.sin(a)*(e.radius*.43+drift*.3)-170+Math.sin(t*.13+index)*5};
}
function curvePoint(route,t){const s=1-t;return {x:s*s*route.from.x+2*s*t*route.control.x+t*t*route.to.x,y:s*s*route.from.y+2*s*t*route.control.y+t*t*route.to.y};}
// Projectile head and trail share this curve, including its exact landing point.
export function fifthFlight(e,time){
 const p=clamp((time-e.start)/Math.max(1,e.impact-e.start)),ship=e.classId==='pirate',index=(e.pulse||0)%3;
 const castStart=e.impact-pulseAt(e),from=ship?shipAnchor(e,index,e.start-castStart):{x:e.fromX+(e.pulse%2?24:-24),y:e.fromY-135};
 const to={x:e.x,y:e.y-(ship?0:95)},dx=to.x-from.x,dy=to.y-from.y,len=Math.max(1,Math.hypot(dx,dy));
 const curve=ship?-150:(e.pulse%2?1:-1)*Math.min(190,len*.28);
 const control=ship?{x:(from.x+to.x)/2,y:Math.min(from.y,to.y)-150}:{x:(from.x+to.x)/2-dy/len*curve,y:(from.y+to.y)/2+dx/len*curve};
 const route={from,to,control},progress=p**1.25,point=curvePoint(route,progress);
 const tx=2*(1-progress)*(control.x-from.x)+2*progress*(to.x-control.x),ty=2*(1-progress)*(control.y-from.y)+2*progress*(to.y-control.y);
 return {...route,point,progress,angle:Math.atan2(ty,tx)+Math.PI/2};
}
function flight(g,e,time){
 const f=fifthFlight(e,time),ship=e.classId==='pirate';
 g.save();g.lineCap='round';g.globalCompositeOperation='lighter';
 for(let layer=0;layer<2;layer++){
  g.globalAlpha*=layer?.55:.75;g.strokeStyle=layer?'#fffbe7':colors[e.classId];g.lineWidth=layer?3:ship?15:8;g.beginPath();
  for(let i=0;i<=7;i++){const p=curvePoint(f,Math.max(0,f.progress-.3)+Math.min(.3,f.progress)*i/7);if(i===0)g.moveTo(p.x,p.y);else g.lineTo(p.x,p.y);}g.stroke();
 }g.restore();
 const [w,h]=dimensions(e.classId,1,ship?80:62,ship?135:190);
 const tip=ship?.32:.45,x=f.point.x-Math.sin(f.angle)*h*tip,y=f.point.y+Math.cos(f.angle)*h*tip;
 glow(g,e.classId,f.point.x,f.point.y,ship?150:90,.5);sprite(g,e.classId,1,x,y,w,h,f.angle,1);
 if(ship){const muzzle=1-smooth((time-e.start)/1.8);sprite(g,e.classId,2,f.from.x,f.from.y,210,135,f.angle-Math.PI/2,muzzle*.75);}
}
export function fifthFields(effects,time){
 const fields=effects.filter(e=>e.kind==='fifth-field'&&e.start<=time&&e.end>time);
 return fields.map(e=>{if(e.mode!=='tracking')return e;const pulses=effects.filter(p=>p.kind==='fifth'&&p.owner===e.owner&&p.classId===e.classId&&p.start>=e.start&&p.start<=time);const last=pulses.at(-1);return last?{...e,x:last.x,y:last.y}:e;});
}
export function drawFifthGround(g,e,time,opacity=1){
 if(e.mode==='homing')return;
 const fade=smooth((time-e.start)/5)*smooth((e.end-time)/5),r=e.radius,color=colors[e.classId];
 g.save();g.translate(e.x,e.y);g.globalAlpha=fade*opacity;
 if(e.mode==='line'){
  g.rotate(e.angle);g.fillStyle=color;g.globalAlpha*=.035;g.fillRect(0,-e.width/2,e.length,e.width);
  g.globalAlpha=fade*opacity*.55;g.strokeStyle=color;g.lineWidth=4;g.strokeRect(0,-e.width/2,e.length,e.width);
  g.globalAlpha*=.35;g.setLineDash([22,28]);g.beginPath();g.moveTo(0,0);g.lineTo(e.length,0);g.stroke();
 }else{
  g.fillStyle=color;g.globalAlpha*=.028;g.beginPath();g.arc(0,0,r,0,TAU);g.fill();
  g.globalAlpha=fade*opacity*.65;g.strokeStyle=color;g.lineWidth=4;g.stroke();
  if(e.classId==='mage'){
   sprite(g,e.classId,0,0,0,r*1.96,r*1.96,(time-e.start)*.009,.8);
   const seal=seals.get(e.classId);if(seal){g.save();g.rotate(-(time-e.start)*.006);g.globalAlpha=fade*opacity*.6;g.drawImage(seal,-r*.62,-r*.62,r*1.24,r*1.24);g.restore();}
   glow(g,e.classId,0,0,r*.95,.13);
   g.globalAlpha=fade*opacity*.35;g.lineWidth=2;g.beginPath();g.arc(0,0,r-30,0,TAU);g.stroke();
  }else if(e.classId==='rogue')sprite(g,e.classId,0,0,0,r*1.9,r*1.9,-(time-e.start)*.004,.2);
 }g.restore();
}
function field(g,e,time){
 const t=time-e.start,fade=smooth(t/5)*smooth((e.end-time)/5);g.globalAlpha*=fade;
 if(e.classId==='warrior'&&t<11){
  const lift=smooth(t/6),release=1-smooth((t-7)/4);
  glow(g,e.classId,e.fromX,e.fromY-95,330,lift*release*.4);
  for(let i=0;i<6;i++){const a=i*TAU/6,x=e.fromX+Math.cos(a)*130,y=e.fromY-95+Math.sin(a)*55-lift*110;sprite(g,e.classId,0,x,y,32,155,0,lift*release*.7);}
 }else if(e.classId==='mage'&&t<71){
  const charge=smooth(t/9),collapse=smooth((t-55)/12),size=mix(285+Math.sin(t*.25)*8,60,collapse),x=e.x,y=e.y-430+collapse*245;
  glow(g,e.classId,x,y,mix(480,210,collapse),charge*(.45+collapse*.2));sprite(g,e.classId,1,x,y,size,size,t*.018,charge*(1-collapse));
  const vortexSize=mix(180,340,smooth((t-48)/10))*(1-collapse*.75);
  sprite(g,e.classId,2,x,y,vortexSize,vortexSize,-t*.045,charge*smooth((t-48)/10)*(1-smooth((t-66)/4))*.85);
  g.save();const ambientOpacity=g.globalAlpha;g.globalCompositeOperation='lighter';g.strokeStyle=colors.mage;g.lineWidth=3;
  const count=g.globalAlpha<.6?4:7;
  for(let i=0;i<count;i++){const phase=(t*.055+i/count)%1,a=i*TAU/count+t*.03,radius=(1-phase)*(220+collapse*120),px=x+Math.cos(a+phase*2)*radius,py=y+Math.sin(a+phase*2)*radius*.65;
   g.globalAlpha=ambientOpacity*charge*Math.sin(phase*Math.PI)*.55;g.beginPath();g.moveTo(px,py);g.lineTo(px+Math.cos(a+phase*2)*16,py+Math.sin(a+phase*2)*12);g.stroke();
  }g.restore();
 }else if(e.classId==='archer'){
  const facing=Math.cos(e.angle)>=0?1:-1,charge=smooth(t/7),end=smooth((e.end-time)/5);
  glow(g,e.classId,e.fromX+facing*55,e.fromY-120,200,charge*end*.35);sprite(g,e.classId,0,e.fromX+facing*55,e.fromY-125,165,230,0,charge*end*.65,facing);
 }else if(e.classId==='rogue'&&t<8){sprite(g,e.classId,0,e.fromX,e.fromY-110,170,170,0,Math.sin(clamp(t/8)*Math.PI)*.7);
 }else if(e.classId==='pirate'){
  for(let i=0;i<3;i++){const p=shipAnchor(e,i,t),appear=smooth((t-i*1.2)/6),last=12+i*5+Math.floor(Math.max(0,t-12-i*5)/15)*15,recoil=t>=last&&t-last<2?Math.sin((t-last)/2*Math.PI)*14:0;
   sprite(g,e.classId,0,p.x+(p.x<e.x?-recoil:recoil),p.y,400,245,0,appear*.56);glow(g,e.classId,p.x,p.y+45,320,appear*.1);
  }
 }
}
function warrior(g,e,time){
 const age=time-e.impact,dx=(e.targetX??e.x+Math.cos(e.angle)*e.length*.5)-e.x,dy=(e.targetY??e.y+Math.sin(e.angle)*e.length*.5)-e.y;
 const along=Math.max(0,Math.min(e.length,dx*Math.cos(e.angle)+dy*Math.sin(e.angle))),side=Math.max(-e.width/2,Math.min(e.width/2,-dx*Math.sin(e.angle)+dy*Math.cos(e.angle)));
 const x=e.x+Math.cos(e.angle)*along-Math.sin(e.angle)*side,y=e.y+Math.sin(e.angle)*along+Math.cos(e.angle)*side;
 if(e.pulse===0){
  const travel=clamp((time-e.start)/(e.impact-e.start)),[width,height]=dimensions(e.classId,0,650,1800),tipY=y-(1-travel**3)*1100,alpha=age<0?smooth(travel*3):1-smooth((age-1)/3);
  glow(g,e.classId,x,tipY-90,250,alpha*.45);sprite(g,e.classId,0,x,tipY-height/2,width,height,Math.PI,alpha);
  if(age>=0){
   const fade=1-smooth((age-2)/5),spread=out(age/2),wall=blasts.get(e.classId);
   if(wall){g.save();g.translate(e.x,e.y);g.rotate(e.angle);g.beginPath();g.rect(0,-e.width/2,e.length,e.width);g.clip();g.globalAlpha*=fade*.78;g.drawImage(wall,e.length*(1-spread)/2,-e.width*(.6+.4*spread)/2,e.length*spread,e.width*(.6+.4*spread));g.restore();}
   glow(g,e.classId,x,y-30,700,fade*.35);sprite(g,e.classId,3,x,y-85,1200,1000,0,fade*.65);ring(g,e.classId,x,y,80+out(age/7)*620,fade,8);sparks(g,e,x,y,age,true);
  }
 }else{
  const progress=clamp((time-e.start)/6),along=progress*e.length,width=e.width*.8;
  g.save();g.translate(e.x,e.y);g.rotate(e.angle);g.globalAlpha*=Math.sin(progress*Math.PI)*(age<0?.4:.7);g.strokeStyle=colors.warrior;g.lineWidth=18;g.lineCap='round';
  g.beginPath();g.moveTo(along-90,-width/2);g.quadraticCurveTo(along+150,0,along-90,width/2);g.stroke();g.strokeStyle='#fff5c4';g.lineWidth=5;g.stroke();g.restore();
  if(age>=0){const fade=(1-clamp(age/7))**2;glow(g,e.classId,x,y-45,330,fade*.5);sprite(g,e.classId,2,x,y-75,390,330,0,fade*.55);sparks(g,e,x,y,age);}
 }
}
function mage(g,e,time){
 const age=time-e.impact;
 if(!e.final){
  if(age<0){const p=clamp((time-e.start)/4);ring(g,e.classId,e.x,e.y-185,190*(1-p)+25,Math.sin(p*Math.PI)*.55,4,.72);}
  else{const fade=1-clamp(age/7);glow(g,e.classId,e.x,e.y-185,190+out(age/7)*150,fade*fade*.55);ring(g,e.classId,e.x,e.y,120+out(age/4)*(e.radius-120),fade*.38,7,1);sparks(g,e,e.x,e.y-170,age);}return;
 }
 if(age<0){const p=clamp((time-e.start)/4);glow(g,e.classId,e.x,e.y-185,180*(1-p)+80,.7);ring(g,e.classId,e.x,e.y-185,280*(1-p)+20,.6,7,.75);return;}
 const grow=out(age/2),fade=1-smooth((age-2)/5),diameter=e.radius*2;
 g.save();g.beginPath();g.arc(e.x,e.y,e.radius,0,TAU);g.clip();glow(g,e.classId,e.x,e.y,diameter*(.25+.75*grow),fade*.45);sprite(g,e.classId,3,e.x,e.y,diameter*(.2+.8*grow),diameter*(.2+.8*grow),0,fade*.9);g.restore();
 ring(g,e.classId,e.x,e.y,100+grow*(e.radius-100),fade,14*(1-grow)+5,1);sparks(g,e,e.x,e.y-75,age,true);
}
function rogue(g,e,time){
 const age=time-e.impact,side=e.pulse%2?1:-1,angle=side*Math.PI*.24;
 if(e.final){
  if(age<0){const p=smooth((time-e.start)/4);sprite(g,e.classId,3,e.x-side*(1-p)*240,e.y-105-(1-p)*180,450+120*p,450+120*p,angle,p*.7);glow(g,e.classId,e.x,e.y-100,260,p*.45);}
  else{const fade=(1-clamp(age/7))**2;sprite(g,e.classId,3,e.x+side*out(age/7)*100,e.y-105,590,590,angle,fade*.9);sparks(g,e,e.x,e.y-85,age,true);ring(g,e.classId,e.x,e.y,80+out(age/7)*620,fade*.5,5);}return;
 }
 const p=clamp((time-e.start)/4),travel=age<0?smooth(p):1+out(age/3)*.25,from={x:e.x+side*450,y:e.y-175-side*100},to={x:e.x,y:e.y-110},fade=age<0?smooth(p*4)*(1-.15*p):.85*(1-smooth(age/3));
 for(let i=2;i>=0;i--){const t=Math.max(0,travel-i*.13);sprite(g,e.classId,1,mix(from.x,to.x,t),mix(from.y,to.y,t),150,210,0,fade*(i===0?.6:.12),-side);}
 if(age>=0){const fade=(1-clamp(age/7))**2;sprite(g,e.classId,2,e.x,e.y-105,380+out(age/7)*85,380+out(age/7)*85,angle,fade*.75);sparks(g,e,e.x,e.y-95,age);}
}
function projectileImpact(g,e,time){
 const age=time-e.impact,ship=e.classId==='pirate',y=e.y-(ship?0:95);
 if(age<0){flight(g,e,time);return;}
 const fade=(1-clamp(age/7))**2,grow=out(age/3),size=ship?(e.final?650:300):(e.final?280:190);
 glow(g,e.classId,e.x,y,size*1.2,fade*.65);sprite(g,e.classId,3,e.x,y-(ship?45:0),size*(.65+grow*.35),size*(.65+grow*.35),0,fade*(ship?.72:.68));sparks(g,e,e.x,y,age,ship&&e.final);
 if(ship)ring(g,e.classId,e.x,e.y,35+grow*(e.final?700:240),fade*.7,e.final?9:5);
}
export function drawFifth(g,e,time,opacity=1){
 if(time<e.start||time>=e.end||!colors[e.classId])return;
 g.save();g.globalAlpha=opacity;
 if(e.kind==='fifth-field')field(g,e,time);else if(e.classId==='warrior')warrior(g,e,time);else if(e.classId==='mage')mage(g,e,time);else if(e.classId==='rogue')rogue(g,e,time);else projectileImpact(g,e,time);
 g.restore();
}
// Cosmetic pose and brief impact feedback do not pause input or simulation.
export function fifthPose(field,time){
 if(!field)return null;const t=time-field.start;if(t<0||t>field.end-field.start)return null;let age,lunge=0;
 if(field.classId==='warrior'&&t<14){age=t<8?.18+smooth(t/8)*.15:t<10?.33:t<11?.62:.62+smooth((t-11)/3)*.37;lunge=t>=10?Math.sin(clamp((t-10)/4)*Math.PI)*24:0;}
 else if(field.classId==='mage'&&t<71)age=t<60?.25+Math.sin(t*.12)*.025:.3+smooth((t-60)/10)*.65;
 else if(field.classId==='archer'&&t<48)age=t<8?.12+smooth(t/8)*.38:.5+(t-8)%2*.15;
 else if(field.classId==='rogue'&&t<8)age=.15+smooth(t/8)*.3;
 else if(field.classId==='pirate'&&t<13)age=.16+smooth(t/12)*.7;
 return age===undefined?null:{age,lunge};
}
export function fifthFeedback(effects,time,owner){
 let strength=0,phase=0;
 for(const e of effects){if(e.kind!=='fifth'||e.owner!==owner)continue;const age=time-e.impact;if(age<0||age>1.6)continue;
  const weight=e.classId==='warrior'&&e.pulse===0?8:e.final&&e.classId==='mage'?10:e.final&&e.classId==='rogue'?5:e.final&&e.classId==='pirate'?6:0,value=weight*(1-smooth(age/1.6));
  if(value>strength){strength=value;phase=age;}
 }return {x:Math.sin(phase*19)*strength,y:Math.sin(phase*27)*strength*.65};
}

export function resolveFifthVisual(e,target,time,landings){
 const key=e.classId+':'+(e.owner||'self')+':'+e.start+':'+e.pulse;
 let point=landings.get(key);
 if(target&&(!point||!point.landed)){point={x:target.x,y:target.y,end:e.end,landed:time>=e.impact};landings.set(key,point);}
 return point&&['homing','tracking'].includes(e.mode)?{...e,x:point.x,y:point.y}:point&&e.mode==='line'?{...e,targetX:point.x,targetY:point.y}:e;
}
