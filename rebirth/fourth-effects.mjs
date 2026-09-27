import {FOURTH_SKILLS} from './fourth-job.mjs?v=priest-raids-27';
const TAU=Math.PI*2;
const palette={mage:['#ffd397','#ef9853'],archer:['#e4ffca','#9be3a1'],pirate:['#d6fbff','#72d5f2']};
// Independent, continuous visual rain. These samples never call combat damage.
const barrage={mage:{spacing:.34,width:150,height:205,row:0},archer:{spacing:.17,width:40,height:170,row:1},pirate:{spacing:.28,width:140,height:190,row:2}};
const unit=n=>{n=Math.imul(n^n>>>16,0x45d9f3b);n=Math.imul(n^n>>>16,0x45d9f3b);return ((n^n>>>16)>>>0)/4294967296;};
export const fourthCastStart=e=>e.start-(e.pulse||0)*FOURTH_SKILLS[e.classId].interval;
export function fourthAreaEffects(effects){
 const casts=new Map();
 for(const e of effects)if(e.kind==='fourth'&&!e.orbit&&barrage[e.classId]){
  const key=[e.owner||'',e.classId,e.x,e.y,fourthCastStart(e)].join(':');
  if(!casts.has(key)||e.start>casts.get(key).start)casts.set(key,e);
 }
 return [...casts.values()];
}
export function fourthBarrage(e,time){
 const cfg=barrage[e.classId];if(!cfg)return [];
 const sk=FOURTH_SKILLS[e.classId],start=fourthCastStart(e),lastImpact=start+4+(sk.hits-1)*sk.interval;
 const age=time-start,seed=Math.floor(start*13+e.x*3+e.y*7+cfg.row*1009),particles=[];
 const lastLaunch=lastImpact-3.6;
 const from=Math.max(0,Math.floor((age-9)/cfg.spacing)),to=Math.floor(Math.min(age,lastLaunch-start)/cfg.spacing);
 for(let i=from;i<=to;i++){
  const random=k=>unit(seed+i*7919+k*104729),launch=start+i*cfg.spacing;
  const flight=2.6+random(1)*1.6,impact=launch+flight,impactAge=time-impact,life=3.4;
  if(impactAge>=life)continue;
  const a=i*2.399963+random(2)*.65,rr=e.size/2*Math.sqrt(random(3))*.93;
  const progress=Math.max(0,Math.min(1,(time-launch)/flight));
  particles.push({id:i,x:Math.cos(a)*rr,y:Math.sin(a)*rr,launch,impact,impactAge,life,drop:(1-progress*progress)*(330+random(4)*190),scale:.74+random(5)*.42,tilt:(random(6)-.5)*.12});
 }
 return particles;
}
export function drawFourthGround(g,e,time){
 if(!barrage[e.classId])return;
 const r=e.size/2,sk=FOURTH_SKILLS[e.classId],start=fourthCastStart(e),end=start+4+(sk.hits-1)*sk.interval+4;
 const fade=Math.min(1,Math.max(0,(time-start+1)/2),Math.max(0,(end-time)/3));
 const [light,dark]=palette[e.classId];
 g.save();g.translate(e.x,e.y);
 // World-space circle exactly matches the unchanged Euclidean damage radius.
 g.fillStyle=dark;g.globalAlpha=.085*fade;g.beginPath();g.arc(0,0,r,0,TAU);g.fill();
 g.strokeStyle=dark;g.globalAlpha=.55*fade;g.lineWidth=5;g.stroke();
 g.strokeStyle=light;g.globalAlpha=.36*fade;g.lineWidth=2;g.beginPath();g.arc(0,0,r-8,0,TAU);g.stroke();
 for(let i=0;i<20;i++){const a=i*TAU/20;g.beginPath();g.moveTo(Math.cos(a)*(r-18),Math.sin(a)*(r-18));g.lineTo(Math.cos(a)*r,Math.sin(a)*r);g.stroke();}
 g.restore();
}
// Canvas-native animation: ornaments are visual only; one pulse owns one hit.
export function drawFourth(g,e,time,player,allies=[],atlas,impactAtlas){
 const sprite=(col,x,y,w,h,angle=0,anchorX=.5,anchorY=.5)=>{if(!atlas?.complete||!atlas.naturalWidth)return false;const rects=[[0,0,320,793],[320,0,518,793],[852,0,220,793],[1072,0,558,793],[1630,0,353,793]],q=rects[col];g.save();g.translate(x,y);g.rotate(angle);g.drawImage(atlas,...q,-w*anchorX,-h*anchorY,w,h);g.restore();return true;};
 const owner=e.orbit?(e.owner?allies.find(a=>a.id===e.owner)||player:player):e;
 const r=e.size/2,age=Math.max(0,time-e.start),phase=time*(e.classId==='rogue'?.5:.42);
 const colors={warrior:['#fff0b2','#d4a951'],mage:['#ffc583','#bc664c'],archer:['#d5efb0','#6baf82'],rogue:['#d9ceff','#9b83b5'],pirate:['#baeff0','#509dbe']},[light,dark]=colors[e.classId];
 g.save();g.translate(owner.x,owner.y);
 if(e.orbit){g.strokeStyle=dark;g.lineWidth=3;g.globalAlpha=.18;g.beginPath();g.ellipse(0,0,r,r*.78,0,0,Math.PI*2);g.stroke();}
 if(e.orbit){
  const n=e.classId==='warrior'?6:8;
  for(let i=0;i<n;i++){const a=phase+i*Math.PI*2/n,rr=r*(.7+.12*Math.sin(phase*.7+i));g.save();g.translate(Math.cos(a)*rr,Math.sin(a)*rr*.78);g.rotate(a+Math.PI/2);g.globalAlpha=.7;g.fillStyle=light;g.strokeStyle=dark;g.lineWidth=4;
   if(sprite(e.classId==='warrior'?0:3,0,-15,e.classId==='warrior'?100:200,e.classId==='warrior'?280:240)){}
   else if(e.classId==='warrior'){g.beginPath();g.moveTo(0,-90);g.lineTo(16,25);g.lineTo(0,46);g.lineTo(-16,25);g.closePath();g.fill();g.stroke();g.fillStyle='#bba46c';g.fillRect(-28,30,56,7);g.fillRect(-5,37,10,34);}
   else{g.beginPath();g.arc(0,0,73,-1.9,1.3);g.quadraticCurveTo(14,3,-24,-67);g.closePath();g.fill();g.stroke();}
   g.restore();g.globalAlpha=.3;g.strokeStyle=light;g.lineWidth=12;g.beginPath();g.ellipse(0,0,rr,rr*.78,0,a-.85,a);g.stroke();
  }
 }else{
  const cfg=barrage[e.classId];
  for(const p of fourthBarrage(e,time)){
   g.save();g.translate(p.x,p.y);
   if(p.impactAge<0){
    const approach=1-Math.min(1,p.drop/500);
    g.globalAlpha=.12+approach*.2;g.fillStyle=light;g.beginPath();g.ellipse(0,0,14+approach*16,8+approach*9,0,0,TAU);g.fill();
    g.globalAlpha=.88;
    sprite(e.classId==='archer'?2:e.classId==='mage'?1:4,-p.drop*.22,-p.drop,cfg.width*p.scale,cfg.height*p.scale,p.tilt,e.classId==='mage'?.65:.5,e.classId==='archer'?.96:e.classId==='mage'?.8:.78);
   }else{
    const age=p.impactAge/p.life,frame=Math.min(3,Math.floor(age*4));
    g.globalAlpha=Math.min(1,(1-age)*2.5)*.88;
    if(impactAtlas?.complete&&impactAtlas.naturalWidth){
     const cw=impactAtlas.width/4,ch=impactAtlas.height/3,w=(e.classId==='archer'?155:e.classId==='pirate'?250:245)*p.scale,h=w*ch/cw;
     g.drawImage(impactAtlas,frame*cw,cfg.row*ch,cw,ch,-w/2,-h*.79,w,h);
    }
   }
   g.restore();
  }

 }
 g.restore();
}
