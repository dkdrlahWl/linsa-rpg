// Canvas-native animation: ornaments are visual only; one pulse owns one hit.
export function drawFourth(g,e,time,player,allies=[],atlas){
 const sprite=(col,x,y,w,h,angle=0)=>{if(!atlas?.complete||!atlas.naturalWidth)return false;const rects=[[0,0,320,793],[320,0,518,793],[852,0,220,793],[1072,0,558,793],[1630,0,353,793]],q=rects[col];g.save();g.translate(x,y);g.rotate(angle);g.drawImage(atlas,...q,-w/2,-h/2,w,h);g.restore();return true;};
 const owner=e.orbit?(e.owner?allies.find(a=>a.id===e.owner)||player:player):e;
 const r=e.size/2,age=Math.max(0,time-e.start),phase=time*.14;
 const colors={warrior:['#fff0b2','#d4a951'],mage:['#ffc583','#bc664c'],archer:['#d5efb0','#6baf82'],rogue:['#d9ceff','#9b83b5'],pirate:['#baeff0','#509dbe']},[light,dark]=colors[e.classId];
 g.save();g.translate(owner.x,owner.y);g.strokeStyle=dark;g.lineWidth=3;g.globalAlpha=.18;g.beginPath();g.ellipse(0,0,r,r*.78,0,0,Math.PI*2);g.stroke();
 if(e.orbit){
  const n=e.classId==='warrior'?6:8;
  for(let i=0;i<n;i++){const a=phase+i*Math.PI*2/n,rr=r*(.7+.12*Math.sin(phase*.7+i));g.save();g.translate(Math.cos(a)*rr,Math.sin(a)*rr*.78);g.rotate(a+Math.PI/2);g.globalAlpha=.7;g.fillStyle=light;g.strokeStyle=dark;g.lineWidth=4;
   if(sprite(e.classId==='warrior'?0:3,0,-15,e.classId==='warrior'?100:200,e.classId==='warrior'?280:240)){}
   else if(e.classId==='warrior'){g.beginPath();g.moveTo(0,-90);g.lineTo(16,25);g.lineTo(0,46);g.lineTo(-16,25);g.closePath();g.fill();g.stroke();g.fillStyle='#bba46c';g.fillRect(-28,30,56,7);g.fillRect(-5,37,10,34);}
   else{g.beginPath();g.arc(0,0,73,-1.9,1.3);g.quadraticCurveTo(14,3,-24,-67);g.closePath();g.fill();g.stroke();}
   g.restore();g.globalAlpha=.19;g.strokeStyle=light;g.lineWidth=12;g.beginPath();g.ellipse(0,0,rr,rr*.78,0,a-.42,a);g.stroke();
  }
 }else{
  const n=e.classId==='archer'?12:6;
  for(let i=0;i<n;i++){const a=(i*2.399+e.pulse*.93),rr=r*Math.sqrt((i+.7)/n)*.88,x=Math.cos(a)*rr,y=Math.sin(a)*rr*.78,fall=(age/5+i*.13)%1;
   g.save();g.translate(x,y);g.globalAlpha=.66;g.strokeStyle=light;g.fillStyle=dark;g.lineWidth=e.classId==='archer'?4:9;
   const dropArt=(1-fall)*220;const textured=sprite(e.classId==='archer'?2:e.classId==='mage'?1:4,-dropArt*.25,-dropArt*.7,e.classId==='archer'?55:170,e.classId==='archer'?210:250);
   if(textured){}
   else if(e.classId==='archer'){const drop=(1-fall)*290;g.beginPath();g.moveTo(-drop*.25,-drop-60);g.lineTo(0,-drop);g.stroke();g.beginPath();g.moveTo(0,-drop);g.lineTo(-11,-drop-21);g.lineTo(9,-drop-23);g.closePath();g.fillStyle=light;g.fill();}
   else{const drop=(1-fall)*250;g.globalAlpha=.35;g.beginPath();g.moveTo(-drop*.6,-drop*1.1);g.lineTo(0,0);g.stroke();g.globalAlpha=.78;g.beginPath();g.arc(-drop*.6,-drop*1.1,e.classId==='mage'?24:17,0,Math.PI*2);g.fill();g.stroke();}
   g.globalAlpha=.25*(1-fall);g.lineWidth=5;g.beginPath();g.ellipse(0,0,25+fall*95,13+fall*50,0,0,Math.PI*2);g.stroke();g.restore();
  }
 }
 g.restore();
}
