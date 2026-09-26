// Canvas-native animation: ornaments are visual only; one pulse owns one hit.
export function drawFourth(g,e,time,player,allies=[],atlas){
 const sprite=(col,x,y,w,h,angle=0,anchorX=.5,anchorY=.5)=>{if(!atlas?.complete||!atlas.naturalWidth)return false;const rects=[[0,0,320,793],[320,0,518,793],[852,0,220,793],[1072,0,558,793],[1630,0,353,793]],q=rects[col];g.save();g.translate(x,y);g.rotate(angle);g.drawImage(atlas,...q,-w*anchorX,-h*anchorY,w,h);g.restore();return true;};
 const owner=e.orbit?(e.owner?allies.find(a=>a.id===e.owner)||player:player):e;
 const r=e.size/2,age=Math.max(0,time-e.start),phase=time*(e.classId==='rogue'?.5:.42);
 const colors={warrior:['#fff0b2','#d4a951'],mage:['#ffc583','#bc664c'],archer:['#d5efb0','#6baf82'],rogue:['#d9ceff','#9b83b5'],pirate:['#baeff0','#509dbe']},[light,dark]=colors[e.classId];
 g.save();g.translate(owner.x,owner.y);g.strokeStyle=dark;g.lineWidth=3;g.globalAlpha=.18;g.beginPath();g.ellipse(0,0,r,r*.78,0,0,Math.PI*2);g.stroke();
 if(e.orbit){
  const n=e.classId==='warrior'?6:8;
  for(let i=0;i<n;i++){const a=phase+i*Math.PI*2/n,rr=r*(.7+.12*Math.sin(phase*.7+i));g.save();g.translate(Math.cos(a)*rr,Math.sin(a)*rr*.78);g.rotate(a+Math.PI/2);g.globalAlpha=.7;g.fillStyle=light;g.strokeStyle=dark;g.lineWidth=4;
   if(sprite(e.classId==='warrior'?0:3,0,-15,e.classId==='warrior'?100:200,e.classId==='warrior'?280:240)){}
   else if(e.classId==='warrior'){g.beginPath();g.moveTo(0,-90);g.lineTo(16,25);g.lineTo(0,46);g.lineTo(-16,25);g.closePath();g.fill();g.stroke();g.fillStyle='#bba46c';g.fillRect(-28,30,56,7);g.fillRect(-5,37,10,34);}
   else{g.beginPath();g.arc(0,0,73,-1.9,1.3);g.quadraticCurveTo(14,3,-24,-67);g.closePath();g.fill();g.stroke();}
   g.restore();g.globalAlpha=.3;g.strokeStyle=light;g.lineWidth=12;g.beginPath();g.ellipse(0,0,rr,rr*.78,0,a-.85,a);g.stroke();
  }
 }else{
  const n=e.classId==='archer'?12:6;
  const impactAt=e.impact??e.start+2,flight=Math.max(.1,impactAt-e.start),fall=Math.min(1,age/flight),impactAge=Math.max(0,time-impactAt),landed=time>=impactAt;
  for(let i=0;i<n;i++){const a=i*2.399+e.pulse*.93,rr=i===0?0:r*Math.sqrt(i/n)*.82,x=Math.cos(a)*rr,y=Math.sin(a)*rr*.78;
   g.save();g.translate(x,y);g.strokeStyle=light;g.fillStyle=dark;
   // A fixed ground marker anchors the descending head/tip to its landing point.
   g.globalAlpha=landed?.3:.18;g.beginPath();g.ellipse(0,0,35,17,0,0,Math.PI*2);g.fill();
   if(!landed){const drop=(1-fall*fall)*340;g.globalAlpha=.88;
    const textured=sprite(e.classId==='archer'?2:e.classId==='mage'?1:4,-drop*.3,-drop,e.classId==='archer'?55:180,e.classId==='archer'?210:250,0,e.classId==='mage'?.65:.5,e.classId==='archer'?.96:e.classId==='mage'?.8:.78);
    if(!textured){g.lineWidth=e.classId==='archer'?5:16;g.beginPath();g.moveTo(-drop*.3-25,-drop-90);g.lineTo(-drop*.3,-drop);g.stroke();}
   }else{const fade=Math.max(0,1-impactAge/4),spread=impactAge/4,wide=e.classId==='archer'?65:125;
    g.globalAlpha=.8*fade;g.lineWidth=7;g.beginPath();g.ellipse(0,0,18+spread*wide,9+spread*wide*.48,0,0,Math.PI*2);g.stroke();
    g.globalAlpha=.55*fade;g.fillStyle=light;g.beginPath();g.ellipse(0,0,45*(1-spread)+8,22*(1-spread)+4,0,0,Math.PI*2);g.fill();
    if(e.classId==='archer'){g.globalAlpha=.8*fade;sprite(2,0,0,40,125,0,.5,.96);}
    else for(let j=0;j<6;j++){const spark=j*Math.PI/3+e.pulse*.7,reach=20+spread*95;g.globalAlpha=.7*fade;g.lineWidth=5;g.beginPath();g.moveTo(Math.cos(spark)*reach*.6,Math.sin(spark)*reach*.4);g.lineTo(Math.cos(spark)*reach,Math.sin(spark)*reach*.65);g.stroke();}
   }
   g.restore();
  }
 }
 g.restore();
}
