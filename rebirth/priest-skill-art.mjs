// Four painted frames per spell. The combat radius never controls art size.
const sheets=new Map();
const heightBySlot={1:620,2:560,3:500,4:670,5:730};

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
  const width=height*sourceWidth/img.height;
  g.save();
  g.globalAlpha=(options.opacity??(slot===5?.83:.86))*Math.min(1,(1-age)*4+.12);
  g.drawImage(img,frame*sourceWidth,0,sourceWidth,img.height,e.x-width/2,e.y-height*.84,width,height);
  g.restore();
  return true;
}
