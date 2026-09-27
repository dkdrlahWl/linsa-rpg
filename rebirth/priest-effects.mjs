// Holy skills are painted on canvas so a missing texture cannot hide them.
const TAU=Math.PI*2;
const clamp=n=>Math.max(0,Math.min(1,n));
const palette={1:['#fff4b4','#ffca62'],2:['#d9fff6','#6bf6cc'],3:['#f3faff','#9bd8ff'],4:['#fff1bd','#ffc865'],5:['#fffdf0','#ffe09a']};

function ring(g,r,phase,color,width,alpha=1){
 g.save();g.rotate(phase);g.globalAlpha*=alpha;g.strokeStyle=color;g.lineWidth=width;g.shadowColor=color;g.shadowBlur=width*2;
 g.beginPath();g.ellipse(0,0,r,r*.37,0,0,TAU);g.stroke();
 for(let i=0;i<12;i++){const a=i*TAU/12,x=Math.cos(a)*r,y=Math.sin(a)*r*.37;g.beginPath();g.moveTo(x*.89,y*.89);g.lineTo(x*1.11,y*1.11);g.stroke();}
 g.restore();
}
function star(g,x,y,r,color,alpha=1){
 g.save();g.translate(x,y);g.globalAlpha*=alpha;g.fillStyle=color;g.shadowColor=color;g.shadowBlur=r*2;
 g.beginPath();g.moveTo(0,-r);g.quadraticCurveTo(r*.12,-r*.12,r,0);g.quadraticCurveTo(r*.12,r*.12,0,r);g.quadraticCurveTo(-r*.12,r*.12,-r,0);g.quadraticCurveTo(-r*.12,-r*.12,0,-r);g.fill();g.restore();
}
function beam(g,x,y,width,height,color,alpha=1){
 g.save();g.translate(x,y);g.globalAlpha*=alpha;g.globalCompositeOperation='screen';
 const fade=g.createLinearGradient(0,-height,0,0);fade.addColorStop(0,'#ffffff00');fade.addColorStop(.42,color+'4d');fade.addColorStop(.82,'#fffef0b3');fade.addColorStop(1,'#ffffff00');
 g.fillStyle=fade;g.shadowColor=color;g.shadowBlur=width;
 g.beginPath();g.moveTo(-width*.22,0);g.lineTo(-width/2,-height);g.lineTo(width/2,-height);g.lineTo(width*.22,0);g.closePath();g.fill();
 g.fillStyle='#fffef0';g.globalAlpha*=.56;g.fillRect(-width*.045,-height*.9,width*.09,height*.83);g.restore();
}
function wing(g,side,size,color,spread){
 g.save();g.scale(side,1);g.rotate(-spread);g.fillStyle=color;g.shadowColor='#fff5cf';g.shadowBlur=32;
 for(let i=0;i<7;i++){const angle=-.55+i*.12,len=size*(1-i*.055);g.save();g.rotate(angle);g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(len*.72,-len*.18,len,-len*.10);g.quadraticCurveTo(len*.58,len*.11,0,0);g.fill();g.restore();}
 g.restore();
}
function angel(g,size,age,color){
 g.save();g.translate(0,-size*.40);g.globalAlpha*=.78*(1-age*.45);g.globalCompositeOperation='screen';
 wing(g,-1,size*.38,color,.13+age*.12);wing(g,1,size*.38,color,.13+age*.12);
 const glow=g.createRadialGradient(0,0,0,0,0,size*.20);glow.addColorStop(0,'#fffef0d9');glow.addColorStop(1,'#fffef000');g.fillStyle=glow;g.beginPath();g.arc(0,0,size*.20,0,TAU);g.fill();
 g.strokeStyle='#fff8d0';g.lineWidth=Math.max(3,size*.007);g.shadowColor='#ffe9a0';g.shadowBlur=28;g.beginPath();g.ellipse(0,-size*.19,size*.075,size*.025,0,0,TAU);g.stroke();
 star(g,0,-size*.09,size*.045,'#ffffff');g.restore();
}

export function drawHoly(g,e,time){
 const slot=e.slot||1,colors=palette[slot]||palette[1],duration=Math.max(1,e.end-e.start),age=clamp((time-e.start)/duration),appear=clamp((time-e.start+2)/4),fade=clamp((e.end-time)/7),opacity=Math.max(.18,appear*fade),size=Math.min(1500,e.size||500),pulse=1+Math.sin(time*.55)*.045,pulseIndex=e.pulse||0;
 g.save();g.globalCompositeOperation='screen';g.globalAlpha=opacity;g.translate(e.x,e.y);
 const base=size*(slot===1?.32:slot===3?.43:.45)*pulse,centerY=-size*(slot>=4?.25:.14);
 const aura=g.createRadialGradient(0,centerY,0,0,centerY,size*.58);aura.addColorStop(0,'#ffffffc9');aura.addColorStop(.18,colors[0]+'99');aura.addColorStop(.65,colors[1]+'55');aura.addColorStop(1,colors[1]+'00');g.fillStyle=aura;g.beginPath();g.arc(0,centerY,size*.58,0,TAU);g.fill();
 ring(g,base,time*.025,colors[0],Math.max(5,size*.012),.95);
 ring(g,base*.76,-time*.04,colors[1],Math.max(3,size*.006),.72);
 for(let i=0;i<18;i++){const a=i*2.399+pulseIndex*.53,r=base*(.27+(i%7)/10),x=Math.cos(a+time*.012)*r,y=Math.sin(a+time*.012)*r*.38-size*.10;star(g,x,y,size*(i%4===0?.021:.010),i%3===0?'#ffffff':colors[0],.45+.35*Math.sin(time*.15+i));}
 if(slot===1){
  beam(g,0,0,size*.20,size*.72,colors[0],.95);star(g,0,-size*.42,size*.09,'#ffffff');
  for(let i=-1;i<=1;i++)beam(g,i*size*.18,-size*.06,size*.065,size*.44,colors[1],.55);
 }else if(slot===2){
  for(let i=0;i<6;i++){const a=i*TAU/6+time*.018,x=Math.cos(a)*base*.64,y=Math.sin(a)*base*.25;star(g,x,y-size*.25,size*.035,'#eafff6');}
  g.strokeStyle='#dffff3';g.lineWidth=Math.max(5,size*.012);g.shadowColor='#8affd0';g.shadowBlur=28;g.beginPath();g.moveTo(0,-size*.49);g.lineTo(0,-size*.20);g.moveTo(-size*.10,-size*.35);g.lineTo(size*.10,-size*.35);g.stroke();
 }else if(slot===3){
  g.strokeStyle=colors[0];g.lineWidth=Math.max(6,size*.013);g.shadowColor='#b4e9ff';g.shadowBlur=30;g.beginPath();g.ellipse(0,-size*.20,base*.92,base*.52,0,Math.PI,TAU);g.stroke();
  for(let i=0;i<9;i++){const a=i*TAU/9;star(g,Math.cos(a)*base*.84,Math.sin(a)*base*.33-size*.24,size*.025,'#ffffff');}
 }else{
  for(let i=0;i<(slot===5?9:6);i++){const a=i*2.399+pulseIndex*.7,r=base*(.25+(i%4)*.15);beam(g,Math.cos(a)*r,Math.sin(a)*r*.38,size*.065,size*(slot===5?.78:.56),colors[0],.45+.2*Math.sin(time*.2+i));}
  angel(g,size*(slot===5?1:.78),age,colors[0]);
  star(g,0,-size*.52,size*.085,'#ffffff');
 }
 g.restore();
}
