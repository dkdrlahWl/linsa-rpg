/* Original generated raster artwork + live, frame-driven aura effects. */
(()=>{'use strict';
 const images={},names=['worlds','monsters','heroes','hero-combat-v1','tower','pets',...Array.from({length:7},(_,i)=>'gear-'+i)];
 names.push('monsters-left-matte-v1','monsters-unified-v2','pets-cutouts-v2','consumables-v1');
 const ready=Promise.all(names.map(name=>new Promise(resolve=>{const im=new Image();im.onload=()=>resolve();im.onerror=()=>{console.warn('Art unavailable',name);resolve()};im.src='/linsa-rpg/art/'+name+'.png';images[name]=im}))).then(prepareMonsters);
 const monsterFrames=[];
 function prepareMonsters(){
  const modern=!!images['monsters-unified-v2']?.naturalWidth,im=modern?images['monsters-unified-v2']:images['monsters-left-matte-v1'];if(!im.naturalWidth)return;
  const c=document.createElement('canvas');c.width=im.width;c.height=im.height;
  const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(im,0,0);
  const data=ctx.getImageData(0,0,c.width,c.height),p=data.data,w=c.width,h=c.height,n=w*h;
  // Extract connected silhouettes before cropping: the authored figures cross grid lines.
  if(modern){
   // Remove the magenta matte, including enclosed gaps between limbs.
   for(let j=0;j<p.length;j+=4)if(p[j]>200&&p[j+2]>200&&p[j+1]<100)p[j+3]=0;
  }
  for(let i=0;!modern&&i<n;i++){const j=i*4,slime=i%w<w*.155&&Math.floor(i/w)<h*.163;
   const green=slime?p[j+1]>230&&p[j]<30&&p[j+2]<30&&p[j+1]-Math.max(p[j],p[j+2])>210:p[j+1]>205&&p[j]<100&&p[j+2]<100&&p[j+1]-Math.max(p[j],p[j+2])>125;
   if(green)p[j+3]=0;
  }
  const labels=new Int32Array(n),queue=new Int32Array(n),parts=[];let label=0;
  for(let seed=0;seed<n;seed++){
   if(labels[seed]||p[seed*4+3]<32)continue;
   label++;let head=0,tail=1,sx=0,sy=0,x0=w,y0=h,x1=0,y1=0;queue[0]=seed;labels[seed]=label;
   while(head<tail){const v=queue[head++],x=v%w,y=Math.floor(v/w);sx+=x;sy+=y;x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);
    for(const next of [x?v-1:-1,x<w-1?v+1:-1,y?v-w:-1,y<h-1?v+w:-1])if(next>=0&&!labels[next]&&p[next*4+3]>=32){labels[next]=label;queue[tail++]=next;}
   }
   if(tail>=24)parts.push({label,count:tail,x0,x1,y0,y1,cx:sx/tail,cy:sy/tail});
  }
  const groups=Array.from({length:36},()=>[]);
  for(const part of parts){const col=Math.min(5,Math.floor(part.cx/w*6)),row=Math.min(5,Math.floor(part.cy/h*6));groups[row*6+col].push(part);}
  groups.forEach((group,index)=>{
   if(!group.length)return;
   const x0=Math.min(...group.map(p=>p.x0)),x1=Math.max(...group.map(p=>p.x1)),y0=Math.min(...group.map(p=>p.y0)),y1=Math.max(...group.map(p=>p.y1));
   const cv=document.createElement('canvas');cv.width=x1-x0+1;cv.height=y1-y0+1;
   const cc=cv.getContext('2d'),out=cc.createImageData(cv.width,cv.height),keep=new Set(group.map(p=>p.label));
   for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const v=y*w+x;if(!keep.has(labels[v]))continue;const j=v*4,k=((y-y0)*cv.width+x-x0)*4;out.data.set(p.subarray(j,j+4),k);}
   // Despill only the cutout boundary, retaining green creatures' actual body colour.
   const rgba=out.data,alpha=new Uint8Array(cv.width*cv.height);for(let i=0;i<alpha.length;i++)alpha[i]=rgba[i*4+3];
   for(let y=0;y<cv.height;y++)for(let x=0;x<cv.width;x++){const i=y*cv.width+x,j=i*4;if(!alpha[i])continue;let edge=false;for(const d of [-2,-1,1,2])if(x+d<0||x+d>=cv.width||y+d<0||y+d>=cv.height||!alpha[i+d]||!alpha[i+d*cv.width])edge=true;if(edge&&modern&&Math.min(rgba[j],rgba[j+2])>rgba[j+1]+45){rgba[j]=Math.min(rgba[j],rgba[j+1]+25);rgba[j+2]=Math.min(rgba[j+2],rgba[j+1]+35);}if(edge&&!modern&&rgba[j+1]-Math.max(rgba[j],rgba[j+2])>65)rgba[j+1]=Math.max(rgba[j],rgba[j+2])+35;}
   cc.putImageData(out,0,0);monsterFrames[index]=cv;
  });
 }
 function monster(ctx,index,x,y,maxWidth,maxHeight){
  const cv=monsterFrames[index];if(!cv)return;
  const scale=Math.min(maxWidth/cv.width,maxHeight/cv.height),w=cv.width*scale,h=cv.height*scale;
  ctx.drawImage(cv,x-w/2,y-h,w,h);
  return {x:x-w/2,y:y-h,width:w,height:h};
 }
 const slots=['무기','투구','갑옷','바지','신발','반지','귀걸이'];
 const gearRows=[[0,190,340,501,681,820,927,1086],[0,188,340,492,660,799,924,1086],[0,175,324,489,669,807,923,1086],[0,180,324,490,683,814,929,1086],[0,175,322,490,669,806,935,1086],[0,166,319,473,639,787,921,1086],[0,162,321,491,664,800,925,1086]];
 let petFrames=null;
 function preparePets(){
  if(petFrames)return petFrames;const im=images['pets-cutouts-v2'];if(!im?.naturalWidth)return [];
  const cv=document.createElement('canvas');cv.width=im.width;cv.height=im.height;const ctx=cv.getContext('2d',{willReadFrequently:true});ctx.drawImage(im,0,0);const d=ctx.getImageData(0,0,cv.width,cv.height),p=d.data,w=cv.width,h=cv.height,n=w*h,labels=new Int32Array(n),queue=new Int32Array(n),groups=Array.from({length:25},()=>[]);let id=0;
  for(let j=0;j<p.length;j+=4)if(p[j]>200&&p[j+2]>200&&p[j+1]<100)p[j+3]=0;
  for(let v=0;v<n;v++){if(labels[v]||p[v*4+3]<48)continue;id++;let head=0,tail=1,sx=0,sy=0,x0=w,y0=h,x1=0,y1=0;queue[0]=v;labels[v]=id;while(head<tail){const u=queue[head++],x=u%w,y=Math.floor(u/w);sx+=x;sy+=y;x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);for(const q of [u-w,u+w,x?u-1:-1,x<w-1?u+1:-1])if(q>=0&&q<n&&!labels[q]&&p[q*4+3]>=48){labels[q]=id;queue[tail++]=q;}}if(tail>=30)groups[Math.min(4,Math.floor(sy/tail/h*5))*5+Math.min(4,Math.floor(sx/tail/w*5))].push({id,tail,x0,x1,y0,y1});}
  petFrames=groups.map(parts=>{if(!parts.length)return null;const largest=Math.max(...parts.map(p=>p.tail));parts=parts.filter(p=>p.tail>=largest*.01);const x0=Math.min(...parts.map(p=>p.x0)),y0=Math.min(...parts.map(p=>p.y0)),x1=Math.max(...parts.map(p=>p.x1)),y1=Math.max(...parts.map(p=>p.y1)),keep=new Set(parts.map(p=>p.id)),out=document.createElement('canvas');out.width=x1-x0+9;out.height=y1-y0+9;const c=out.getContext('2d'),data=c.createImageData(out.width,out.height);for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const v=y*w+x;if(keep.has(labels[v]))data.data.set(p.subarray(v*4,v*4+4),((y-y0+4)*out.width+x-x0+4)*4);}c.putImageData(data,0,0);return out;});return petFrames;
 }
 function frame(name,index,cols,rows){if(name==='pets'){const im=preparePets()[index];return im?{im,x:0,y:0,w:im.width,h:im.height}:null;}const im=images[name];if(!im?.complete||!im.naturalWidth)return null;const r=Math.floor(index/cols),line=name.startsWith('gear-')?gearRows[Number(name.slice(-1))]:null;return {im,x:index%cols*im.width/cols,y:line?line[r]*im.height/1086:r*im.height/rows,w:im.width/cols,h:line?(line[r+1]-line[r])*im.height/1086:im.height/rows};}
 function sprite(ctx,name,index,cols,rows,x,y,w,h){const f=frame(name,index,cols,rows);if(f){if(name==='pets'){const scale=Math.min(w/f.w,h/f.h),dw=f.w*scale,dh=f.h*scale;ctx.drawImage(f.im,x+(w-dw)/2,y+(h-dh)/2,dw,dh);}else ctx.drawImage(f.im,f.x+.8,f.y+.8,f.w-1.6,f.h-1.6,x,y,w,h);}}
 const gearCutouts=new Map();
 function prepareGear(grade){
  if(gearCutouts.has(grade))return gearCutouts.get(grade);
  const im=images['gear-'+grade];if(!im?.naturalWidth)return null;
  const cv=document.createElement('canvas');cv.width=im.width;cv.height=im.height;const ctx=cv.getContext('2d',{willReadFrequently:true});ctx.drawImage(im,0,0);
  const p=ctx.getImageData(0,0,cv.width,cv.height).data,w=cv.width,h=cv.height,n=w*h,labels=new Int32Array(n),queue=new Int32Array(n),groups=Array.from({length:70},()=>[]);let id=0;
  // The two common chest pieces physically touch at their sleeve tips in the source.
  if(grade===0){const seam=Math.round(w*.296);for(let y=Math.floor(h*340/1086);y<Math.ceil(h*501/1086);y++)for(let x=seam-1;x<=seam+1;x++)p[(y*w+x)*4+3]=0;}
  for(let seed=0;seed<n;seed++){
   if(labels[seed]||p[seed*4+3]<48)continue;id++;let head=0,tail=1,x0=w,y0=h,x1=0,y1=0,sx=0,sy=0;queue[0]=seed;labels[seed]=id;
   while(head<tail){const v=queue[head++],x=v%w,y=Math.floor(v/w);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);sx+=x;sy+=y;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy,next=yy*w+xx;if(xx<0||xx>=w||yy<0||yy>=h||labels[next]||p[next*4+3]<48)continue;labels[next]=id;queue[tail++]=next;}
   }
   if(tail<24)continue;
   const cy=sy/tail/h*1086,row=gearRows[grade].findIndex((v,i)=>i<7&&cy>=v&&cy<gearRows[grade][i+1]),col=Math.min(9,Math.floor(sx/tail/w*10));
   if(row>=0)groups[row*10+col].push({id,count:tail,x0,x1,y0,y1});
  }
  const result=groups.map(group=>{
   if(!group.length)return null;
   const largest=Math.max(...group.map(g=>g.count));group=group.filter(g=>g.count>=Math.max(24,largest*.012));
   const x0=Math.min(...group.map(g=>g.x0)),x1=Math.max(...group.map(g=>g.x1)),y0=Math.min(...group.map(g=>g.y0)),y1=Math.max(...group.map(g=>g.y1));
   const out=document.createElement('canvas');out.width=x1-x0+5;out.height=y1-y0+5;const c=out.getContext('2d'),d=c.createImageData(out.width,out.height),keep=new Set(group.map(g=>g.id));
   for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const v=y*w+x;if(keep.has(labels[v]))d.data.set(p.subarray(v*4,v*4+4),((y-y0+2)*out.width+x-x0+2)*4);}
   c.putImageData(d,0,0);return out;
  });gearCutouts.set(grade,result);return result;
 }
 function gearImage(grade,row,col){const cv=prepareGear(grade)?.[row*10+col];if(!cv)return '';return cv.previewURL??=(cv.toDataURL());}
 function icon(it,index=0){const grade=Math.max(0,Math.min(6,Number(it.rarity)||0)),row=Math.max(0,slots.indexOf(it.slot)),col=row===0&&grade===6?(index===0?1:0):Math.max(0,Math.min(9,index)),url=gearImage(grade,row,col);return '<span class="rm-item-art" data-gear-cutout="'+grade+':'+row+':'+col+'" role="img" aria-label="'+slots[row]+' 외형" style="background-image:url('+url+');background-size:contain!important;background-position:center!important;background-repeat:no-repeat"></span>';}
 ready.then(()=>document.querySelectorAll('[data-gear-cutout]').forEach(el=>{const [g,r,c]=el.dataset.gearCutout.split(':').map(Number);el.style.backgroundImage='url('+gearImage(g,r,c)+')';}));
 const colors=['#ff536d','#ffad51','#ffe5a2','#7df0b3','#7bcdff','#8281ff','#cc88ff','#e5f1ff','#efb7ff'];
 // Procedural aura, not a looping background picture. Every particle has its own phase.
 function aura(ctx,index,time,x,y,w,h,intensity=1){if(index<0||intensity<=0)return;index=Math.min(8,index);const t=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?0:time/1000,c=colors[index];ctx.save();ctx.translate(x,y);ctx.globalCompositeOperation='lighter';
  // Soft colour volume makes the animated ribbons readable on dark portraits.
  ctx.save();ctx.scale(w*.48,h*.5);const halo=ctx.createRadialGradient(0,0,.12,0,0,1);halo.addColorStop(0,'transparent');halo.addColorStop(.56,c+Math.round(Math.min(.26,.14*intensity)*255).toString(16).padStart(2,'0'));halo.addColorStop(1,'transparent');ctx.fillStyle=halo;ctx.fillRect(-1,-1,2,2);ctx.restore();
  const wind=index===0||index===1,ice=index===4,voidAura=index===5||index===6,angel=index===2||index===7;
  const count=wind?30:voidAura?26:20;
  for(let i=0;i<count;i++){const phase=(t*(wind?.35:.13)+i*.618)%1,side=i%2?1:-1,seed=Math.sin(i*47.23),spread=w*(.26+.10*Math.sin(t*.9+i*2)),px=side*spread+Math.sin(t*(ice?1.5:.7)+i)*w*.07,py=h*.45-phase*h*.91;
   const a=Math.sin(phase*Math.PI)*(.2+.3*(i%3)/2)*intensity,r=wind?(4+10*(1-phase)):2+i%4;
   const glow=ctx.createRadialGradient(px,py,0,px,py,r*3);glow.addColorStop(0,index===8?`hsla(${(i*39+t*40)%360},100%,80%,${a})`:c+Math.round(a*255).toString(16).padStart(2,'0'));glow.addColorStop(1,'transparent');ctx.fillStyle=glow;ctx.fillRect(px-r*3,py-r*3,r*6,r*6);
   if(wind){ctx.beginPath();ctx.moveTo(px,py);ctx.quadraticCurveTo(px+side*12+seed*5,py-18,px+Math.sin(t*2+i)*16,py-38);ctx.strokeStyle=c;ctx.globalAlpha=a;ctx.lineWidth=2+(1-phase)*3;ctx.stroke();ctx.globalAlpha=1;}
   else{ctx.globalAlpha=a*1.6;ctx.fillStyle=index===8?`hsl(${i*39+t*30},90%,80%)`:'#f6eeff';ctx.fillRect(px,py,1.7,1.7);ctx.globalAlpha=1;}
  }
  for(let side of [-1,1]){ctx.beginPath();ctx.moveTo(side*w*.14,h*.48);ctx.bezierCurveTo(side*w*(.55+.035*Math.sin(t)),h*.12,side*w*.13,-h*.14,side*w*(.3+.035*Math.sin(t*.8)),-h*.42);ctx.strokeStyle=c;ctx.globalAlpha=.30*intensity;ctx.lineWidth=4;ctx.shadowColor=c;ctx.shadowBlur=24;ctx.stroke();ctx.shadowBlur=0;}
  if(angel)for(let side of [-1,1])for(let j=0;j<7;j++){const sway=Math.sin(t*.8+j*.18)*.025;ctx.beginPath();ctx.moveTo(side*w*.2,-h*.08+j*4);ctx.quadraticCurveTo(side*w*(.5+sway),-h*.40+j*9,side*w*(.36+sway),-h*.48+j*13);ctx.strokeStyle=c;ctx.globalAlpha=(.3-j*.026)*intensity;ctx.lineWidth=4;ctx.stroke();}
  if(ice||voidAura){const beat=Math.floor(t*6);for(let s of [-1,1])if((beat+(s+1))%5===0){ctx.beginPath();for(let j=0;j<7;j++){const px=s*w*.35+Math.sin(j*91+beat*13)*12,py=-h*.3+j*h*.11;if(j===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);}ctx.strokeStyle=c;ctx.globalAlpha=.55*intensity;ctx.lineWidth=1;ctx.stroke();}}
  // Each aura has its own silhouette and motion, not merely a recoloured ring.
  if(index===1||index===8)for(let j=0;j<3;j++){ctx.beginPath();for(let k=0;k<70;k++){const a=k/69*Math.PI*2+t*(index===8?.4:.85)+j*2.1,xx=Math.cos(a)*w*(.35+j*.02),yy=Math.sin(a)*h*.15+(j-1)*h*.18;k?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy)}ctx.strokeStyle=index===8?`hsl(${j*110+t*28},90%,75%)`:c;ctx.lineWidth=1.5;ctx.globalAlpha=.30*intensity;ctx.stroke()}
  if(index===3)for(let j=0;j<10;j++){const a=j*.628+t*.25,xx=Math.cos(a)*w*.37,yy=Math.sin(a*1.3)*h*.39;ctx.save();ctx.translate(xx,yy);ctx.rotate(a);ctx.fillStyle=c;ctx.globalAlpha=.55*intensity;ctx.beginPath();ctx.ellipse(0,0,2.5,7,0,0,Math.PI*2);ctx.fill();ctx.restore()}
  if(index===4)for(let j=0;j<8;j++){const a=j*Math.PI/4+t*.15;ctx.save();ctx.translate(Math.cos(a)*w*.36,Math.sin(a)*h*.4);ctx.rotate(a);ctx.strokeStyle='#cafaff';ctx.globalAlpha=.6*intensity;ctx.lineWidth=1.2;for(let k=0;k<3;k++){ctx.rotate(Math.PI/3);ctx.beginPath();ctx.moveTo(-6,0);ctx.lineTo(6,0);ctx.stroke()}ctx.restore()}
  if(index===5){ctx.globalAlpha=.42*intensity;ctx.strokeStyle='#a1a7ff';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(0,-h*.06,w*.33,h*.38,Math.sin(t*.2)*.25,t*.15,t*.15+Math.PI*1.8);ctx.stroke()}
  if(index===6){ctx.globalAlpha=.6*intensity;ctx.strokeStyle='#d5a1ff';ctx.lineWidth=1.7;for(const side of [-1,1]){ctx.beginPath();for(let j=0;j<11;j++){const xx=side*w*.35+Math.sin(j*4.7+Math.floor(t*8))*9,yy=-h*.43+j*h*.085;j?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy)}ctx.stroke()}}
  ctx.globalAlpha=.20*intensity;ctx.strokeStyle=c;ctx.lineWidth=1.1;ctx.beginPath();ctx.ellipse(0,h*.48,w*.37,h*.055,0,0,Math.PI*2);ctx.stroke();ctx.restore();
 }
 const bodyCache=new Map(),weaponCache=new Map(),W=520,H=1000;
 // Base appearance is deliberately independent of every non-weapon equipment slot.
 function assembledBody(female){if(bodyCache.has(female))return bodyCache.get(female);const im=images.heroes;if(!im.naturalWidth)return null;const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;const cx=canvas.getContext('2d'),box=female?[700,88,424,1120]:[138,40,472,1172],width=box[2]/box[3]*H;cx.drawImage(im,...box.map(v=>v*im.width/1254),(W-width)/2,0,width,H);const body={canvas,hand:{x:W/2+(female?36-212:38-236)/box[3]*H,y:(female?577:628)/box[3]*H}};bodyCache.set(female,body);return body;}
 // Authored handle anchors in the 1448x1086 source atlas, relative to each column.
 // The atlas has unequal row heights: a single percentage cannot align all items.
 const gripPixels=[
 [[38,148],[38,145],[24,155],[18,158],[25,151],[25,151],[35,150],[30,160],[28,153],[31,153]],
 [[29,147],[35,151],[19,151],[17,151],[20,150],[26,152],[30,150],[21,151],[25,148],[23,152]],
 [[33,139],[30,140],[24,145],[21,144],[25,141],[25,140],[26,134],[27,139],[31,135],[26,140]],
 [[36,142],[34,142],[28,142],[26,143],[29,143],[25,142],[29,137],[19,139],[29,130],[27,137]],
 [[31,139],[31,139],[20,140],[23,137],[20,140],[27,139],[25,136],[29,137],[35,130],[25,138]],
 [[50,119],[29,132],[21,132],[63,113],[41,120],[35,122],[39,124],[35,130],[31,116],[31,129]],
 [[47,120],[33,129],[24,132],[62,110],[39,115],[36,119],[40,123],[34,129],[35,117],[31,128]]
 ];
 function weaponSocket(it,indexOf){const grade=Math.max(0,Math.min(6,Number(it.rarity)||0)),index=Math.max(0,Math.min(9,indexOf(it))),dual=grade<5?index===6:grade===5&&index===7,sourceIndex=grade===6?(index===0?1:0):dual?1:index,key=grade+':'+index;
  if(weaponCache.has(key))return weaponCache.get(key);const f=frame('gear-'+grade,sourceIndex,10,7);if(!f)return null;
  const canvas=document.createElement('canvas');canvas.width=Math.ceil(f.w);canvas.height=Math.ceil(f.h);const c=canvas.getContext('2d',{willReadFrequently:true});
  // Crossed inventory illustrations are not wearable geometry. Dual wield uses
  // two complete matching-grade blades, one independently socketed in each hand.
  c.drawImage(f.im,f.x+.8,f.y+.8,f.w-1.6,f.h-1.6,0,0,canvas.width,canvas.height);
  const [ax,ay]=gripPixels[grade][sourceIndex],sy=ay*f.im.height/1086,sx=ax*f.im.width/1448,p=c.getImageData(0,0,canvas.width,canvas.height).data;let weight=0,totalX=0,totalY=0;
  // Snap within the authored grip window to opaque shaft pixels, never the blade tip.
  for(let y=Math.max(0,Math.round(sy)-2);y<Math.min(canvas.height,Math.round(sy)+3);y++)for(let x=Math.max(0,Math.round(sx)-13);x<Math.min(canvas.width,Math.round(sx)+14);x++){const alpha=p[(y*canvas.width+x)*4+3];if(alpha>220){const w=1/(1+Math.abs(x-sx)*.12);weight+=w;totalX+=x*w;totalY+=y*w;}}
  const px=weight?totalX/weight:sx,py=weight?totalY/weight:sy,result={im:canvas,x:0,y:0,w:canvas.width,h:canvas.height,index,sourceIndex,dual,gauntlet:grade===5&&index===3,u:px/canvas.width,v:py/canvas.height,pivotAlpha:p[(Math.round(py)*canvas.width+Math.round(px))*4+3]||0};
  // Keep the connected weapon around its handle; neighbouring atlas fragments are not gear.
  const data=c.getImageData(0,0,canvas.width,canvas.height),seen=new Uint8Array(canvas.width*canvas.height),queue=[Math.round(py)*canvas.width+Math.round(px)];seen[queue[0]]=1;
  for(let q=0;q<queue.length;q++){const n=queue[q],x=n%canvas.width,y=Math.floor(n/canvas.width);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=x+dx,ny=y+dy,k=ny*canvas.width+nx;if(nx<0||ny<0||nx>=canvas.width||ny>=canvas.height||seen[k]||data.data[k*4+3]<12)continue;seen[k]=1;queue.push(k)}}
  for(let n=0;n<seen.length;n++)if(!seen[n])data.data[n*4+3]=0;c.putImageData(data,0,0);
  weaponCache.set(key,result);return result;
 }
 function heldWeapon(ctx,it,indexOf,x,y,height,angle,mirror=false){const f=weaponSocket(it,indexOf);if(!f)return;const h=height*(f.gauntlet?.15:.46),w=h*f.w/f.h;ctx.save();ctx.translate(x,y);if(mirror)ctx.scale(-1,1);ctx.rotate(f.gauntlet?angle-2.2:angle);
  ctx.drawImage(f.im,-f.u*w,-f.v*h,w,h);ctx.restore();return {x,y};
 }
 function foregroundGrip(ctx,body,x,y,height){const scale=height/H,h=body.hand;ctx.save();ctx.beginPath();ctx.ellipse(x+(h.x-W/2)*scale,y-height+h.y*scale,20*scale,27*scale,0,0,Math.PI*2);ctx.clip();ctx.drawImage(body.canvas,x-W/2*scale,y-height,W*scale,height);ctx.restore();}
 function hero(ctx,s,equipment,indexOf,time,x,y,height){const female=s.playerGender==='female',body=assembledBody(female);if(!body)return;const scale=height/H;
  if(s.equippedAura>=0)aura(ctx,s.equippedAura,time,x,y-height*.46,Math.min(height*.88,ctx.canvas.width-40),height*1.08,s.remodelFx===false?0:1.5);
  ctx.drawImage(body.canvas,x-W/2*scale,y-height,W*scale,height);
  const weapon=equipment['무기'];if(weapon){heldWeapon(ctx,weapon,indexOf,x+(body.hand.x-W/2)*scale,y-height+body.hand.y*scale,height,2.60);foregroundGrip(ctx,body,x,y,height);if(weaponSocket(weapon,indexOf)?.dual){const other={...body,hand:{x:W-body.hand.x,y:body.hand.y}};heldWeapon(ctx,weapon,indexOf,x+(other.hand.x-W/2)*scale,y-height+other.hand.y*scale,height,2.60,true);foregroundGrip(ctx,other,x,y,height);}}
  if(s.equippedPet&&s.ownedPets){const p=s.ownedPets.find(p=>p.uid===s.equippedPet);if(p){const ix=Object.keys(window.RinguCore?.PET_DATA||{}).sort().indexOf(p.petId);if(ix>=0){const size=Math.min(height*.25,ctx.canvas.width*.25),pad=20,px=Math.max(pad,Math.min(x+height*.27,ctx.canvas.width-size-pad)),py=Math.max(pad,Math.min(y-size,ctx.canvas.height-size-pad));sprite(ctx,'pets',ix,5,5,px,py,size,size);ctx.canvas.dataset.petBounds=JSON.stringify({x:px,y:py,width:size,height:size});}}}else delete ctx.canvas.dataset.petBounds;
 }
 // Runtime silhouette clips: the generated sheet remains unmodified on disk.
 // Each outline excludes the opaque atlas backdrop and neighbouring poses.
 const silhouettes=[
 [[149,46],[171,54],[184,72],[173,91],[178,103],[163,114],[165,130],[185,142],[192,192],[205,227],[218,254],[238,281],[235,294],[226,298],[215,285],[199,267],[183,245],[176,267],[196,311],[207,370],[202,402],[215,469],[240,482],[240,494],[185,495],[177,481],[174,424],[159,371],[141,323],[114,368],[91,408],[77,462],[75,486],[68,502],[42,503],[42,481],[52,433],[57,382],[74,327],[83,276],[91,242],[62,231],[40,215],[42,190],[52,153],[63,135],[105,113],[123,104],[119,88],[113,76],[127,56]],
 [[413,68],[440,73],[453,92],[447,109],[431,131],[433,144],[455,175],[475,190],[500,191],[519,184],[530,192],[530,203],[510,211],[465,220],[420,215],[412,247],[425,276],[466,310],[492,331],[496,375],[486,408],[500,468],[528,480],[528,490],[475,490],[466,478],[459,411],[438,370],[400,339],[377,374],[350,403],[307,466],[300,484],[302,500],[280,504],[253,494],[252,480],[271,439],[301,397],[320,351],[335,308],[349,271],[336,249],[330,279],[332,297],[326,307],[316,297],[314,281],[320,240],[320,203],[335,162],[361,139],[389,124],[393,109],[385,90],[396,76]],
 [[669,57],[696,62],[704,82],[697,99],[683,118],[685,133],[708,151],[714,197],[725,230],[747,252],[749,270],[741,276],[731,265],[708,246],[687,223],[683,259],[701,292],[725,334],[730,379],[725,409],[737,477],[764,490],[764,500],[718,503],[704,491],[697,426],[676,372],[645,334],[620,373],[602,410],[581,469],[602,482],[600,490],[554,493],[543,485],[544,472],[563,419],[574,378],[595,324],[605,287],[601,248],[588,252],[590,278],[593,293],[585,304],[573,298],[568,285],[571,263],[568,222],[576,184],[589,150],[627,128],[646,115],[642,98],[636,83],[646,67]],
 [[925,85],[949,92],[958,109],[950,126],[937,148],[936,163],[952,179],[962,222],[983,248],[1009,258],[1019,267],[1014,278],[1005,276],[994,267],[965,251],[947,238],[940,267],[955,290],[982,319],[992,345],[987,389],[977,416],[982,466],[1000,477],[998,486],[952,486],[939,478],[935,454],[941,409],[932,374],[908,343],[874,371],[853,408],[829,468],[816,499],[788,503],[782,490],[789,461],[811,403],[818,366],[845,304],[850,266],[849,227],[845,185],[818,172],[800,158],[799,139],[812,115],[842,96],[867,85],[875,83],[889,88],[891,98],[881,106],[868,102],[845,120],[824,141],[861,146],[882,154],[900,142],[901,121],[892,107],[909,93]],
 [[1236,110],[1261,117],[1276,135],[1267,153],[1252,173],[1243,182],[1255,207],[1280,234],[1312,267],[1339,280],[1344,292],[1338,299],[1325,295],[1305,283],[1270,263],[1243,244],[1220,229],[1212,253],[1220,284],[1260,308],[1297,334],[1309,349],[1304,388],[1305,432],[1315,478],[1337,484],[1341,493],[1290,497],[1279,487],[1271,420],[1253,384],[1206,362],[1161,358],[1123,390],[1084,427],[1053,474],[1034,494],[1008,494],[1004,483],[1017,455],[1048,415],[1070,380],[1110,337],[1136,303],[1140,273],[1130,260],[1129,284],[1118,289],[1110,280],[1109,260],[1116,230],[1115,211],[1133,188],[1162,171],[1201,155],[1202,132],[1218,118]],
 [[1439,69],[1463,76],[1480,94],[1473,112],[1458,135],[1451,143],[1470,170],[1470,204],[1471,232],[1487,270],[1487,287],[1476,294],[1465,285],[1450,269],[1432,251],[1440,280],[1471,311],[1494,341],[1504,379],[1503,412],[1513,475],[1528,482],[1528,494],[1484,495],[1470,483],[1463,430],[1442,390],[1425,370],[1411,407],[1396,444],[1384,477],[1382,498],[1358,502],[1351,492],[1354,470],[1373,425],[1380,380],[1389,342],[1384,311],[1376,287],[1370,239],[1373,186],[1386,150],[1407,131],[1411,108],[1406,91],[1421,79]]
 ];
 const femaleSilhouettes=[
 [[149,28],[170,37],[179,55],[172,73],[160,91],[164,107],[181,135],[188,173],[204,211],[220,237],[220,263],[210,263],[198,242],[179,213],[174,241],[188,268],[198,310],[207,356],[202,388],[217,452],[237,459],[239,469],[192,467],[179,454],[173,400],[152,353],[136,314],[119,357],[94,397],[77,445],[72,470],[62,473],[42,470],[41,449],[50,405],[56,352],[76,308],[87,274],[91,233],[61,216],[47,196],[47,173],[57,147],[52,123],[34,132],[42,105],[72,84],[102,65],[118,40]],
 [[408,47],[433,52],[442,69],[435,91],[420,113],[424,135],[451,164],[477,181],[499,180],[514,173],[518,187],[514,198],[484,201],[443,198],[421,191],[414,224],[420,256],[450,285],[485,323],[495,348],[493,383],[501,443],[527,451],[529,461],[480,461],[467,449],[460,386],[438,348],[401,323],[375,352],[349,383],[308,444],[302,461],[310,468],[302,472],[275,470],[255,460],[256,445],[280,401],[305,362],[329,310],[345,265],[349,241],[334,236],[326,263],[319,268],[314,256],[318,235],[325,207],[327,180],[309,178],[299,169],[306,146],[300,122],[318,105],[351,86],[369,64]],
 [[666,40],[689,47],[700,64],[691,83],[678,99],[681,112],[701,138],[708,175],[724,208],[743,229],[745,244],[738,253],[728,246],[710,227],[688,204],[683,235],[699,266],[718,296],[730,338],[727,374],[739,449],[763,459],[764,469],[719,469],[707,457],[699,396],[677,348],[646,308],[622,347],[602,382],[584,443],[603,452],[600,461],[551,459],[544,450],[550,426],[565,380],[576,347],[596,294],[610,262],[600,225],[589,238],[590,259],[579,273],[570,267],[568,249],[576,209],[578,179],[558,171],[552,154],[562,127],[584,109],[615,92],[634,64]],
 [[870,40],[880,45],[880,58],[870,66],[859,62],[838,78],[817,98],[849,114],[873,122],[894,111],[896,88],[912,59],[935,61],[947,78],[940,99],[928,115],[933,133],[947,158],[960,189],[985,218],[1014,225],[1017,239],[1008,246],[998,239],[974,227],[948,206],[939,244],[957,272],[983,302],[990,328],[984,373],[978,409],[986,441],[998,444],[998,455],[951,455],[940,443],[939,416],[942,376],[931,346],[907,316],[878,343],[853,381],[830,439],[815,468],[789,470],[783,457],[794,426],[812,378],[821,343],[848,277],[852,246],[848,207],[843,160],[822,150],[799,130],[798,104],[812,80],[844,60]],
 [[1236,85],[1257,92],[1271,111],[1263,130],[1249,147],[1243,163],[1255,187],[1285,212],[1314,237],[1341,245],[1344,259],[1334,265],[1324,257],[1300,246],[1268,229],[1240,211],[1220,199],[1211,227],[1224,254],[1267,283],[1296,310],[1309,328],[1302,368],[1304,407],[1315,447],[1337,454],[1338,466],[1291,465],[1279,452],[1272,390],[1256,356],[1211,336],[1164,332],[1127,362],[1090,399],[1056,445],[1035,463],[1007,461],[1005,449],[1020,423],[1051,385],[1081,346],[1119,309],[1146,266],[1151,235],[1137,222],[1127,225],[1120,211],[1124,192],[1100,190],[1096,173],[1112,150],[1106,137],[1134,119],[1172,114],[1198,102],[1215,88]],
 [[1432,47],[1456,51],[1473,67],[1473,85],[1460,103],[1449,118],[1455,134],[1470,161],[1470,190],[1484,230],[1488,246],[1478,255],[1465,246],[1451,231],[1432,215],[1438,246],[1467,278],[1494,315],[1502,344],[1500,380],[1513,446],[1528,454],[1528,465],[1484,466],[1472,454],[1463,399],[1444,360],[1425,341],[1411,376],[1395,413],[1383,445],[1382,467],[1358,470],[1352,459],[1356,438],[1373,393],[1380,347],[1389,308],[1384,279],[1376,246],[1375,201],[1354,190],[1350,168],[1364,138],[1360,117],[1381,90],[1406,74]]
 ];
 const poseHands=[[[123,231],[520,196],[582,291],[882,93],[1335,290],[1480,280]],[[123,201],[510,184],[577,262],[873,52],[1336,252],[1480,243]]];
 const poseRoots=[150,390,650,905,1175,1430],poseAngles=[.05,-.1,-.4,-1.45,1.35,.8];
 const femaleCrownExtras={3:[[[877,89],[883,67],[895,51],[915,49],[936,57],[948,74],[949,95],[935,118]],[[798,119],[800,94],[849,56],[869,36],[885,39],[897,50],[893,64],[880,73],[865,69],[827,104]]],5:[[[1405,87],[1410,59],[1429,39],[1446,38],[1464,46],[1478,62],[1475,87],[1457,108]]]};
 const motionFrames=new Map();
 // Chroma coverage is evaluated only inside each sprite's silhouette at upload time.
 // This is an in-memory rendering mask; the generated bitmap is never rewritten.
 const hairAreas=[[35,28,180,164],[294,45,444,197],[550,45,704,186],[795,49,950,204],[1090,76,1275,229],[1325,38,1480,216]];
 function atlasCoverage(c,w,h,hair=null,x0=0,y0=0){const pixels=c.getImageData(0,0,w,h),p=pixels.data;for(let i=0;i<p.length;i+=4){const low=Math.min(p[i],p[i+1],p[i+2]),high=Math.max(p[i],p[i+1],p[i+2]),x=(i/4)%w+x0,y=Math.floor(i/4/w)+y0,protect=hair&&x>=hair[0]&&x<=hair[2]&&y>=hair[1]&&y<=hair[3];if(protect){if(high-low<2&&low>195)p[i+3]=0;}else if(high-low<23&&low>175)p[i+3]*=Math.max(0,1-(low-175)/18);}
  // Strip neutral matte residue at the silhouette edge, never interior silver highlights.
  const alpha=new Uint8Array(w*h);for(let i=0;i<alpha.length;i++)alpha[i]=p[i*4+3];
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const v=y*w+x,j=v*4,low=Math.min(p[j],p[j+1],p[j+2]),high=Math.max(p[j],p[j+1],p[j+2]);if(!alpha[v]||low<=175||high-low>=23)continue;for(const d of [-2,-1,1,2])if(x+d<0||x+d>=w||y+d<0||y+d>=h||!alpha[v+d]||!alpha[v+d*w]){p[j+3]=0;break;}}
  c.putImageData(pixels,0,0);
 }
function motionFrame(female,pose){const key=Number(female)*6+pose;if(motionFrames.has(key))return motionFrames.get(key);const im=images['hero-combat-v1'];if(!im?.naturalWidth)return null;const polygons=[(female?femaleSilhouettes:silhouettes)[pose],...(female?femaleCrownExtras[pose]||[]:[])],points=polygons.flat(),row=female?512:0,x0=Math.min(...points.map(p=>p[0]))-1,y0=Math.min(...points.map(p=>p[1]))-1,x1=Math.max(...points.map(p=>p[0]))+1,y1=Math.max(...points.map(p=>p[1]))+1;const canvas=document.createElement('canvas');canvas.width=x1-x0;canvas.height=y1-y0;const c=canvas.getContext('2d');c.beginPath();for(const polygon of polygons){polygon.forEach(([x,y],i)=>i?c.lineTo(x-x0,y-y0):c.moveTo(x-x0,y-y0));c.closePath();}c.clip();c.drawImage(im,x0*im.width/1536,(y0+row)*im.height/1024,canvas.width*im.width/1536,canvas.height*im.height/1024,0,0,canvas.width,canvas.height);atlasCoverage(c,canvas.width,canvas.height,female?hairAreas[pose]:null,x0,y0);const result={canvas,x0,y0};motionFrames.set(key,result);return result;}
 function battleHero(ctx,s,equipment,indexOf,time,x,y,height,motion={pose:0}){const female=s.playerGender==='female',pose=motion.pose||0,m=motionFrame(female,pose);if(!m)return;const u=height/(female?450:460),root=poseRoots[pose],baseline=female?473:503;const hand=poseHands[Number(female)][pose],px=v=>x+(v-root)*u,py=v=>y+(v-baseline)*u;
  if(s.equippedAura>=0)aura(ctx,s.equippedAura,time,x,y-height*.46,height*.78,height*1.06,s.remodelFx===false?0:1.35);
  ctx.drawImage(m.canvas,px(m.x0),py(m.y0),m.canvas.width*u,m.canvas.height*u);
  const weapon=equipment['무기'];if(weapon){heldWeapon(ctx,weapon,indexOf,px(hand[0]),py(hand[1]),height,poseAngles[pose]);
   // Repaint exactly the same pose's grip on top of the handle, not a free-floating hand.
   ctx.save();ctx.beginPath();ctx.ellipse(px(hand[0]),py(hand[1]),10*u,12*u,0,0,Math.PI*2);ctx.clip();ctx.drawImage(m.canvas,px(m.x0),py(m.y0),m.canvas.width*u,m.canvas.height*u);ctx.restore();}
  return {handX:px(hand[0]),handY:py(hand[1]),pose};
 }
 window.RinguArt={ready,images,monster,monsterFrames,prepareGear,frame,sprite,icon,aura,hero,battleHero,colors,assembledBody,weaponSocket};
})();
