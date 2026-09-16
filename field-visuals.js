/* F1: region encounter paintings and bounded, confirmed-hit-only presentation. */
(()=>{'use strict';
 const style=document.createElement('style');style.textContent='#arena .damage-pop{left:50%!important;top:42%!important;z-index:8;pointer-events:none;text-shadow:0 2px 3px #000,0 0 10px #000}';document.head.append(style);
 const sheets=new Map(),frames=new Map(),backs=new Map(),base='/linsa-rpg/art/';
 const palette=['#172017','#282018','#131f2b','#21120e','#35383d','#161221'];
 const fx=new Image();fx.src=base+'world-boss/fx-v2.webp';
 function load(region){if(sheets.has(region))return sheets.get(region);const im=new Image();im.src=base+'field-region-'+region+'-F1.webp';sheets.set(region,im);return im;}
 function frame(index){if(frames.has(index))return frames.get(index);const im=load(Math.floor(index/6));if(!im.complete||!im.naturalWidth)return null;
  const n=index%6,sw=im.width/3,sh=im.height/2,cv=document.createElement('canvas');cv.width=cv.height=500;
  // Inset excludes authored atlas separators and adjacent encounters.
  cv.getContext('2d').drawImage(im,(n%3)*sw+8,Math.floor(n/3)*sh+8,sw-16,sh-16,0,0,500,500);frames.set(index,cv);return cv;
 }
 function backdrop(index,w,h,im){const key=index+':'+w+':'+h;if(backs.has(key))return backs.get(key);const cv=document.createElement('canvas');cv.width=w;cv.height=h;const c=cv.getContext('2d'),size=Math.min(w,h*.69),x=(w-size)/2,y=h*.14;
  c.fillStyle=palette[Math.floor(index/6)];c.fillRect(0,0,w,h);
  // Extend scenery edges rather than stretching or duplicating the monster.
  c.save();c.filter='blur(12px) brightness(.65)';c.drawImage(im,0,0,500,18,-15,-15,w+30,y+30);c.drawImage(im,0,482,500,18,-15,y+size-15,w+30,h-y-size+30);
  if(x>0){c.drawImage(im,0,0,16,500,-15,y-15,x+30,size+30);c.drawImage(im,484,0,16,500,x+size-15,y-15,x+30,size+30);}c.restore();
  c.drawImage(im,x,y,size,size);const shade=c.createLinearGradient(0,0,0,h);shade.addColorStop(0,'#05080cc9');shade.addColorStop(.18,'#05080c00');shade.addColorStop(.69,'#05080c00');shade.addColorStop(1,'#05080cee');c.fillStyle=shade;c.fillRect(0,0,w,h);
  if(backs.size>=4)backs.delete(backs.keys().next().value);backs.set(key,{cv,x,y,size});return backs.get(key);
 }
 function draw(c,index,w,h,hitAge=Infinity,crit=false,reduced=false){const im=frame(index);c.clearRect(0,0,w,h);if(!im){c.fillStyle=palette[Math.floor(index/6)]||'#111';c.fillRect(0,0,w,h);return null;}
  const bg=backdrop(index,w,h,im),duration=reduced?130:280,on=hitAge>=0&&hitAge<duration,fade=on?1-hitAge/duration:0;
  c.drawImage(bg.cv,0,0);const x=w*.5,y=bg.y+bg.size*.49;
  if(on){c.save();c.beginPath();c.rect(bg.x,bg.y,bg.size,bg.size);c.clip();if(!reduced){const bump=Math.sin(hitAge*.1)*fade*Math.min(4,w*.008);c.drawImage(im,bg.x+bump,bg.y,bg.size,bg.size);}
   c.globalCompositeOperation='screen';c.globalAlpha=fade*(crit?.85:.65);
   if(fx.complete&&fx.naturalWidth){const size=bg.size*(crit?.70:.50);c.drawImage(fx,fx.width/2,0,fx.width/2,fx.height/2,x-size/2,y-size/2,size,size);}
   c.globalAlpha=fade;c.strokeStyle=crit?'#fff2a0':'#eaf6ff';c.lineWidth=Math.max(2,w*.009)*fade;c.shadowColor=crit?'#ffac36':'#bce4ff';c.shadowBlur=12;
   const reach=bg.size*(crit?.26:.20);c.beginPath();c.moveTo(x-reach,y+reach*.65);c.lineTo(x+reach,y-reach*.65);if(crit){c.moveTo(x-reach*.8,y-reach*.6);c.lineTo(x+reach*.8,y+reach*.6);}c.stroke();c.restore();
  }
  return {x:bg.x,y:bg.y,width:bg.size,height:bg.size,centerX:x,centerY:y};
 }
 window.RinguFieldVisual={draw,frame,load};
})();

/* World 2 uses independent background paintings and full boss cutouts. */
(()=>{const old=window.RinguFieldVisual.draw,cache=new Map(),base='/linsa-rpg/art/world2/';
function asset(name){if(cache.has(name))return cache.get(name);const im=new Image();im.decoding='async';im.src=base+name+'.webp';cache.set(name,im);if(cache.size>12){const first=cache.keys().next().value;if(first!==name)cache.delete(first);}return im;}
window.RinguFieldVisual.draw=function(c,index,w,h,hitAge=Infinity,crit=false,reduced=false){
 if(index<36)return old(c,index,w,h,hitAge,crit,reduced);
 const n=index-36,bg=asset('bg-'+(Math.floor(n/6)+1)),boss=asset('boss-'+(n+1));c.clearRect(0,0,w,h);
 if(bg.complete&&bg.naturalWidth){const scale=Math.max(w/bg.width,h/bg.height),bw=bg.width*scale,bh=bg.height*scale;c.drawImage(bg,(w-bw)/2,(h-bh)/2,bw,bh);}
 const size=Math.min(w*.88,h*.69),x=(w-size)/2,y=h*.14,on=hitAge>=0&&hitAge<(reduced?130:280),fade=on?1-hitAge/(reduced?130:280):0,bump=on&&!reduced?Math.sin(hitAge*.1)*fade*Math.min(4,w*.008):0;
 if(boss.complete&&boss.naturalWidth)c.drawImage(boss,x+bump,y,size,size);
 const hit=asset('../world-boss/fx-v2');
 if(on&&hit.complete&&hit.naturalWidth){c.save();c.globalCompositeOperation='screen';c.globalAlpha=fade*(crit?.85:.65);const reach=size*(crit?.45:.32);c.drawImage(hit,hit.width/2,0,hit.width/2,hit.height/2,w*.5-reach/2,y+size*.60-reach/2,reach,reach);c.restore();}
 return {x,y,width:size,height:size,centerX:w*.5,centerY:y+size*.5};
};})();
