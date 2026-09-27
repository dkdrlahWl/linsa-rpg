// Four painted frames per spell. The glow shows the combat radius without a solid wall of light.
const sheets=new Map();
const heightBySlot={1:960,2:900,3:850,4:1150,5:1280};
const colors={1:'#ffe5a0',2:'#baffdf',3:'#badfff',4:'#ffe1a0',5:'#fff0bd'};

function sheet(slot){
  if(!sheets.has(slot)){
    const img=new Image();
    img.src=new URL(`./tower/priest-skill-${slot}-v2.png`,import.meta.url).href;
    sheets.set(slot,img);
  }
  return sheets.get(slot);
}

export function preparePriestSkillArt(){
  return Promise.all([1,2,3,4,5].map(slot=>sheet(slot).decode().catch(()=>{})));
}

export function drawPriestSkillArt(g,e,time,options={}){
  const slot=Math.max(1,Math.min(5,e.slot||1)),img=sheet(slot);
  if(!img.complete||!img.naturalWidth)return false;
  const age=Math.max(0,Math.min(1,(time-e.start)/Math.max(1,e.end-e.start)));
  const frame=options.frame??Math.min(3,Math.floor(age*4));
  const sourceWidth=img.width/4,height=(heightBySlot[slot]||560)*(options.scale||1);
  const width=height*sourceWidth/img.height,color=colors[slot],impact=frame===2?1:.6;
  const opacity=(options.opacity??(slot===5?.94:.91))*Math.min(1,(1-age)*4+.12);
  g.save();
  if(!options.frame){
    const radius=Math.min(1500,Math.max(height*.42,(e.size||height)*.48));
    const pool=g.createRadialGradient(e.x,e.y,0,e.x,e.y,radius);
    pool.addColorStop(0,color+'75');pool.addColorStop(.42,color+'30');pool.addColorStop(1,color+'00');
    g.globalCompositeOperation='screen';g.globalAlpha=opacity*.55;
    g.fillStyle=pool;g.beginPath();g.ellipse(e.x,e.y,radius,radius*.36,0,0,Math.PI*2);g.fill();
    g.globalAlpha=opacity*.37*impact;g.strokeStyle=color;g.lineWidth=height*.009;g.shadowColor=color;g.shadowBlur=height*.075;
    for(let i=0;i<12;i++){
      const a=i*Math.PI*2/12+time*.018,r=width*(.30+(i%3)*.11);
      const x=e.x+Math.cos(a)*r,y=e.y-height*.42+Math.sin(a)*height*.36;
      const d=height*(.018+(i%4)*.006);
      g.beginPath();g.moveTo(x-d,y);g.lineTo(x+d,y);g.moveTo(x,y-d);g.lineTo(x,y+d);g.stroke();
    }
  }
  g.globalCompositeOperation='source-over';g.globalAlpha=opacity;
  g.shadowColor=color;g.shadowBlur=height*.055*impact;
  g.drawImage(img,frame*sourceWidth,0,sourceWidth,img.height,e.x-width/2,e.y-height*.84,width,height);
  if(frame===2&&!options.frame){g.globalCompositeOperation='screen';g.globalAlpha=opacity*.22;g.drawImage(img,frame*sourceWidth,0,sourceWidth,img.height,e.x-width*.55,e.y-height*.88,width*1.1,height*1.1);}
  g.restore();
  return true;
}
