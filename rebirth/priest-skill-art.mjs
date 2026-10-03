// Four painted frames per spell. The glow shows the combat radius without a solid wall of light.
const sheets=new Map();
const renderSheets=new Map();
function renderSheet(slot,img){
  if(renderSheets.has(slot))return renderSheets.get(slot);
  // The source art already contains glow. Keep a bounded raster for repeated draws.
  const canvas=document.createElement('canvas');
  canvas.height=Math.min(512,img.naturalHeight);
  canvas.width=Math.round(img.naturalWidth*canvas.height/img.naturalHeight/4)*4;
  canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
  renderSheets.set(slot,canvas);return canvas;
}
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
  const slot=Math.max(1,Math.min(5,e.slot||1)),source=sheet(slot);
  if(!source.complete||!source.naturalWidth)return false;
  const img=renderSheet(slot,source);
  const age=Math.max(0,Math.min(1,(time-e.start)/Math.max(1,e.end-e.start)));
  const frame=options.frame??(slot===5?(time-e.start<2?0:time-e.start<4?1:2):Math.min(3,Math.floor(age*4)));
  const sourceWidth=img.width/4,height=(heightBySlot[slot]||560)*(options.scale||1);
  const width=height*sourceWidth/img.height,color=colors[slot],impact=frame===2?1:.6;
  const opacity=(options.opacity??(slot===5?.94:.91))*(slot===5?1:Math.min(1,(1-age)*4+.12));
  g.save();
  if(options.frame===undefined){
    const radius=Math.min(1500,Math.max(height*.42,(e.size||height)*.48));
    const pool=g.createRadialGradient(e.x,e.y,0,e.x,e.y,radius);
    pool.addColorStop(0,color+'75');pool.addColorStop(.42,color+'30');pool.addColorStop(1,color+'00');
    g.globalCompositeOperation='screen';g.globalAlpha=opacity*.55;
    g.fillStyle=pool;g.beginPath();g.ellipse(e.x,e.y,radius,radius*.36,0,0,Math.PI*2);g.fill();
    g.globalAlpha=opacity*.37*impact;g.strokeStyle=color;g.lineWidth=height*.009;g.shadowColor=color;g.shadowBlur=0;
    for(let i=0;i<6;i++){
      const a=i*Math.PI*2/6+time*.018,r=width*(.30+(i%3)*.11);
      const x=e.x+Math.cos(a)*r,y=e.y-height*.42+Math.sin(a)*height*.36;
      const d=height*(.018+(i%4)*.006);
      g.beginPath();g.moveTo(x-d,y);g.lineTo(x+d,y);g.moveTo(x,y-d);g.lineTo(x,y+d);g.stroke();
    }
  }
  g.globalCompositeOperation='source-over';g.globalAlpha=opacity;
  g.shadowColor=color;g.shadowBlur=0;
  g.drawImage(img,frame*sourceWidth,0,sourceWidth,img.height,e.x-width/2,e.y-height*.84,width,height);
  if(frame===2&&options.frame===undefined){g.globalCompositeOperation='screen';g.globalAlpha=opacity*.22;g.drawImage(img,frame*sourceWidth,0,sourceWidth,img.height,e.x-width*.55,e.y-height*.88,width*1.1,height*1.1);}
  g.restore();
  return true;
}

export function drawPriestRangeAura(g,e,time){
  if(e.slot<2||e.start>time||e.end<=time)return;
  const radius=Math.max(1,(e.size||0)/2),color=colors[e.slot]||colors[2];
  const fade=Math.min(1,(time-e.start+2)/5,(e.end-time)/6);
  if(fade<=0)return;
  g.save();g.translate(e.x,e.y);g.globalCompositeOperation='screen';
  const fill=g.createRadialGradient(0,0,radius*.12,0,0,radius);
  fill.addColorStop(0,color+'08');fill.addColorStop(.72,color+'19');fill.addColorStop(1,color+'34');
  g.globalAlpha=fade;g.fillStyle=fill;g.beginPath();g.arc(0,0,radius,0,Math.PI*2);g.fill();
  g.strokeStyle=color;g.shadowColor=color;g.shadowBlur=0;g.lineWidth=11;
  g.globalAlpha=fade*(.52+Math.sin(time*.55)*.08);
  g.beginPath();g.arc(0,0,radius,0,Math.PI*2);g.stroke();
  g.globalAlpha=fade*.24;g.lineWidth=34;g.beginPath();g.arc(0,0,radius-20,0,Math.PI*2);g.stroke();
  for(let i=0;i<8;i++){
    const a=i*2.399+time*.015,r=radius*(.32+(i%6)*.11);
    const x=Math.cos(a)*r,y=Math.sin(a)*r;
    const size=8+(i%4)*3;
    g.globalAlpha=fade*(.24+(i%3)*.12);g.lineWidth=3+(i%2);
    g.beginPath();g.moveTo(x-size,y);g.lineTo(x+size,y);g.moveTo(x,y-size);g.lineTo(x,y+size);g.stroke();
  }
  g.restore();
}

export function drawPriestBuffAura(g,actor,time,areas=[]){
  const active=[];
  const area=areas.filter(e=>e.slot>=2&&Math.hypot(actor.x-e.x,actor.y-e.y)<=(e.size||0)/2).sort((a,b)=>b.start-a.start)[0];
  if(area)active.push(area.slot);
  else if(actor.purifiedUntil>time)active.push(2);
  if(actor.shield>0&&(actor.shieldPermanent||actor.shieldUntil>time)&&!active.includes(3))active.push(3);
  if(actor.holyAttackUntil>time&&!active.includes(4))active.push(4);
  if(actor.holyReductionUntil>time&&!active.includes(5))active.push(5);
  if(!active.length)return;
  g.save();g.globalCompositeOperation='screen';
  active.forEach((slot,j)=>{
    const color=colors[slot],radius=58+j*18;
    g.strokeStyle=color;g.shadowColor=color;g.shadowBlur=0;g.lineWidth=5;g.globalAlpha=.48;
    g.beginPath();g.ellipse(actor.x,actor.y,radius,radius*.37,0,0,Math.PI*2);g.stroke();
    for(let i=0;i<4;i++){
      const a=i*Math.PI/2+time*.045*(j%2?-1:1),rise=(time*9+i*23)%135;
      const x=actor.x+Math.cos(a)*(40+j*12),y=actor.y-20-rise;
      g.globalAlpha=.35+.35*(1-rise/135);g.fillStyle=color;g.beginPath();g.arc(x,y,3+i%3,0,Math.PI*2);g.fill();
    }
  });
  g.restore();
}
