// Painted motifs sit over terrain using screen blending; animation follows the
// authoritative impact tick, so a projectile arrives exactly when damage lands.
const columns={warrior:0,mage:1,archer:2,rogue:3,pirate:4};
const palettes={warrior:['#ff8c44','#ffe2a1'],mage:['#9b83ff','#c5faff'],archer:['#88e9b0','#f2ffcf'],rogue:['#b17bff','#ffc4f3'],pirate:['#ffb44c','#a8f1ed']};
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const mix=(a,b,t)=>a+(b-a)*t;
export function drawSecondSequence(g,e,time,atlas,ghost){
 const [color,light]=palettes[e.classId],col=columns[e.classId],age=Math.max(0,time-e.start),angle=e.angle||0;
 const origin={x:e.fromX,y:e.fromY-45},target={x:e.x,y:e.y-45};
 const sprite=(row,x,y,w,h=w,rotation=0,alpha=1)=>{
  if(!atlas?.complete||!atlas.naturalWidth)return;
  const sw=atlas.naturalWidth/5,sh=atlas.naturalHeight/3;
  g.save();g.globalCompositeOperation='screen';g.globalAlpha=alpha;g.translate(x,y);g.rotate(rotation);g.drawImage(atlas,col*sw,row*sh,sw,sh,-w/2,-h/2,w,h);g.restore();
 };
 const line=(points,width,alpha,shade=color)=>{g.save();g.globalAlpha=alpha;g.strokeStyle=shade;g.lineWidth=width;g.lineCap='round';g.lineJoin='round';g.beginPath();points.forEach((p,i)=>i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y));g.stroke();g.restore();};
 const ring=(x,y,r,alpha)=>{g.save();g.globalAlpha=alpha;g.strokeStyle=color;g.lineWidth=3;g.beginPath();g.ellipse(x,y,r,r*.55,0,0,Math.PI*2);g.stroke();g.restore();};
 const sparks=(x,y,progress,count=12,r=180)=>{for(let j=0;j<count;j++){const a=j*2.399+(e.pulse||0)*.7,reach=(18+progress*r)*(0.65+0.35*Math.sin(j*13));line([{x:x+Math.cos(a)*reach*.6,y:y+Math.sin(a)*reach*.7},{x:x+Math.cos(a)*reach,y:y+Math.sin(a)*reach}],j%3===0?4:2,(1-progress)*.75,j%2?color:light);}};
 const impact=e.impact??e.start,flight=clamp((time-e.start)/Math.max(1,impact-e.start)),landed=time>=impact,fade=clamp((e.end-time)/Math.max(1,e.end-impact));
 g.save();
 if(e.phase==='charge'){
  const progress=clamp(age/(e.end-e.start-5)),fadeOut=clamp((e.end-time)/5),r=110;
  if(e.classId==='mage'){
   ring(origin.x,origin.y+40,145,.2*fadeOut);
   for(let i=0;i<8;i++)if(age<5+i*4){const a=i*Math.PI/4+age*.018;const x=origin.x+Math.cos(a)*r,y=origin.y+Math.sin(a)*r*.7-60;sprite(1,x,y,95,72,a+.5,.75*fadeOut);}
  }else if(e.classId==='archer'&&age<7){
   const aim=1-clamp(age/6);ring(target.x,target.y+40,55+aim*85,.65);line([{x:origin.x,y:origin.y},{x:target.x,y:target.y}],2,.18);
   sprite(0,origin.x,origin.y-40,180,180,angle,.6*clamp(age/3));
   for(let i=0;i<4;i++){const a=i*Math.PI/2+age*.06,rr=55+aim*70;line([{x:target.x+Math.cos(a)*rr,y:target.y+Math.sin(a)*rr},{x:target.x+Math.cos(a)*(rr+20),y:target.y+Math.sin(a)*(rr+20)}],3,.7,light);}
  }else if(e.classId==='rogue'){
   ring(target.x,target.y+40,130,.12*fadeOut);sprite(0,target.x,target.y,140,140,0,.18*fadeOut);
  }else if(e.classId==='warrior'){
   const end={x:mix(origin.x,target.x,progress),y:mix(origin.y,target.y,progress)+40};line([{x:origin.x,y:origin.y+40},end],4,.25*fadeOut);
  }
  g.restore();return;
 }
 if(e.classId==='warrior'){
  if(e.pulse===0){sprite(1,target.x,target.y,520,370,angle-.25+flight*.4,(landed?fade:flight)*.95);}
  else if(!e.final){
   const points=Array.from({length:9},(_,i)=>{const t=i/8,side=i===0||i===8?0:Math.sin(i*2.7+e.pulse)*28;return{x:mix(origin.x,target.x,t)-Math.sin(angle)*side,y:mix(origin.y,target.y,t)+Math.cos(angle)*side+40};});
   line(points,13,(landed?fade:flight)*.3);line(points,4,(landed?fade:flight)*.9,light);
   const q=points[Math.min(8,e.pulse+1)];sprite(2,q.x,q.y-55,170+e.pulse*13,200+e.pulse*10,0,(landed?fade:flight)*.7);
   if(landed){sprite(2,target.x,target.y,270,330,0,fade*.8);sparks(target.x,target.y,1-fade,9,130);}
  }else if(landed){sprite(2,target.x,target.y-30,500*(1+.12*(1-fade)),570,0,fade);ring(target.x,target.y+45,90+(1-fade)*240,fade*.7);sparks(target.x,target.y,1-fade,18,270);}
 }else if(e.classId==='rogue'){
  const side=e.pulse%2?-1:1,theta=side*Math.PI/4,reach=e.final?260:210;
  const from={x:target.x-Math.cos(theta)*reach,y:target.y-Math.sin(theta)*reach},to={x:target.x+Math.cos(theta)*reach,y:target.y+Math.sin(theta)*reach};
  const travel=landed?1:flight,x=mix(from.x,to.x,travel),y=mix(from.y,to.y,travel);
  if(!e.final){
   if(ghost){g.save();g.globalAlpha=.45*(landed?fade:1);ghost(x,y+45,side===1?1:7,.5*(landed?fade:1));g.restore();}
   line([from,{x,y}],16,.2*(landed?fade:1));line([from,{x,y}],3,.75*(landed?fade:1),light);
  }
  sprite(e.final?2:1,target.x,target.y,e.final?460:340,e.final?460:340,side*.12,(landed?fade:flight)*.9);
  if(landed)sparks(target.x,target.y,1-fade,e.final?18:7,e.final?210:100);
 }else{
  let from={...origin},bend=0;
  if(e.classId==='mage'){const a=(e.pulse%8)*Math.PI/4;from={x:origin.x+Math.cos(a)*110,y:origin.y+Math.sin(a)*80-60};bend=(e.pulse%2?-1:1)*110;}
  if(e.classId==='pirate')bend=(e.pulse%2?-1:1)*(e.close?200:90);
  const dx=target.x-from.x,dy=target.y-from.y,len=Math.hypot(dx,dy)||1,control={x:(from.x+target.x)/2-dy/len*bend,y:(from.y+target.y)/2+dx/len*bend};
  const point=t=>({x:(1-t)**2*from.x+2*(1-t)*t*control.x+t*t*target.x,y:(1-t)**2*from.y+2*(1-t)*t*control.y+t*t*target.y});
  if(!e.final&&!landed){
   const p=point(flight),tail=point(Math.max(0,flight-.24)),points=Array.from({length:7},(_,i)=>point(Math.max(0,flight-.3)+i/6*Math.min(.3,flight)));
   line(points,e.classId==='archer'&&e.pulse===0?17:8,.2);line(points,3,.8,light);
   const rotation=Math.atan2(p.y-tail.y,p.x-tail.x);sprite(1,p.x,p.y,e.classId==='archer'?(e.pulse===0?340:210):e.classId==='mage'?210:150,e.classId==='mage'?125:100,rotation,.98);
   if(e.classId==='pirate')sprite(0,from.x,from.y,140,120,angle,.6*(1-flight));
  }
  if(landed){
   const size=e.final?(e.classId==='mage'?480:430):(e.classId==='archer'&&e.pulse===0?290:180);
   sprite(2,target.x,target.y,size*(1+.16*(1-fade)),size,0,fade*(e.final?1:.75));
   sparks(target.x,target.y,1-fade,e.final?18:7,e.final?230:100);
   if(e.final)ring(target.x,target.y+40,65+(1-fade)*190,fade*.6);
   if(e.classId==='archer'){const a=Math.atan2(dy,dx);line([{x:target.x-Math.cos(a)*100,y:target.y-Math.sin(a)*100},{x:target.x+Math.cos(a)*280,y:target.y+Math.sin(a)*280}],e.pulse===0?7:3,fade*.8,light);}
  }else if(e.final){ring(target.x,target.y+30,130-60*flight,.35);sprite(0,target.x,target.y,150+flight*100,150+flight*100,0,flight*.4);}
 }
 g.restore();
}
