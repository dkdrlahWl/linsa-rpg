const TAU=Math.PI*2,rigs=new WeakMap();

// Each foot has its own swing and stance. Half a cycle exchanges the lead foot.
export function walkingPose(walk,direction,bodyHeight){
 const phase=(Number(walk)||0)*TAU/8,angle=direction*Math.PI/4;
 const forward={x:Math.cos(angle),y:Math.sin(angle)*.45};
 const across={x:-Math.sin(angle),y:Math.cos(angle)*.3};
 const feet=[-1,1].map(side=>{
  const step=Math.sin(phase)*side,lift=Math.max(0,Math.cos(phase)*side)*bodyHeight*.045;
  const hip={x:across.x*side*bodyHeight*.055,y:-bodyHeight*.18+across.y*side*bodyHeight*.055};
  const foot={x:hip.x+forward.x*step*bodyHeight*.115,y:forward.y*step*bodyHeight*.115-lift};
  return {side,step,lift,hip,knee:{x:hip.x+(foot.x-hip.x)*.45,y:(hip.y+foot.y)*.5-lift*.35},foot,thickness:1+.45*Math.abs(Math.cos(angle)),depth:forward.y*step+across.y*side*.15};
 });
 return {feet:feet.sort((a,b)=>a.depth-b.depth),bob:Math.abs(Math.sin(phase*2))*bodyHeight*.012};
}

function walkingRig(source,r,body,robe){
 let cached=rigs.get(source);if(!cached){cached=new Map();rigs.set(source,cached);}
 const key=[r.x,r.y,r.w,r.h,...body,robe].join(':');if(cached.has(key))return cached.get(key);
 const canvas=document.createElement('canvas');canvas.width=Math.ceil(r.w);canvas.height=Math.ceil(r.h);
 const g=canvas.getContext('2d',{willReadFrequently:true});g.drawImage(source,r.x,r.y,r.w,r.h,0,0,r.w,r.h);
 const [height,anchor,foot]=body,length=height*.18;
 // Reuse the painted boot, including its colours and outlines, for both limbs.
 const data=g.getImageData(0,0,canvas.width,canvas.height).data;
 const width=height*.09,columns=new Float64Array(canvas.width);
 for(let y=Math.max(0,Math.floor(foot-height*.045));y<Math.min(canvas.height,Math.ceil(foot));y++)for(let x=0;x<canvas.width;x++)columns[x]+=data[(y*canvas.width+x)*4+3];
 // Sample an actual boot, not the transparent gap between the two boots.
 let center=anchor,best=-1;
 for(let x=Math.max(0,Math.floor(anchor-height*.35));x<Math.min(canvas.width,Math.ceil(anchor+height*.35));x++){
  let score=0;for(let k=Math.max(0,Math.floor(x-width/2));k<Math.min(canvas.width,Math.ceil(x+width/2));k++)score+=columns[k];
  score-=Math.abs(x-anchor)*.01;if(score>best){best=score;center=x;}
 }
 const leg=document.createElement('canvas');leg.width=Math.ceil(width);leg.height=Math.ceil(length);
 const q=leg.getContext('2d');q.drawImage(canvas,center-width/2,foot-length,width,length,0,0,leg.width,leg.height);
 const fade=q.createLinearGradient(0,0,0,leg.height);fade.addColorStop(0,'#0000');fade.addColorStop(.38,'#000');fade.addColorStop(1,'#000');q.globalCompositeOperation='destination-in';q.fillStyle=fade;q.fillRect(0,0,leg.width,leg.height);
 q.fillStyle='#000';q.beginPath();q.roundRect(0,0,leg.width,leg.height,leg.width*.3);q.fill();
 // Remove BOTH original legs, including their outlines. Erasing a boot-shaped
 // clone at the average foot centre left the two standing legs on the torso.
 g.globalCompositeOperation='destination-out';g.fillStyle='#000';
 const cutoff=foot-height*(robe?.06:.15),halfWidth=height*.42;
 // The mask follows the hip-to-boot silhouette. Its narrow top preserves
 // garments; the wide bottom includes the offset feet in side/attack poses.
 g.beginPath();g.moveTo(anchor-height*.22,cutoff);
 g.lineTo(anchor+height*.22,cutoff);
 g.lineTo(anchor+halfWidth,foot-height*.065);
 g.lineTo(anchor+halfWidth,foot+height*.05);
 g.lineTo(anchor-halfWidth,foot+height*.05);
 g.lineTo(anchor-halfWidth,foot-height*.065);g.closePath();g.fill();
 g.globalCompositeOperation='source-over';
 const rig={canvas,leg,height,anchor,foot,length,width};cached.set(key,rig);return rig;
}

// Rotate the width axis perpendicular to the limb. A horizontal shear makes
// diagonal/side strides collapse into thin strips as the foot moves forward.
export function walkingLimbTransform(a,b,sourceLength){
 const dx=b.x-a.x,dy=b.y-a.y,distance=Math.hypot(dx,dy)||1;
 return [dy/distance,-dx/distance,dx/sourceLength,dy/sourceLength,a.x,a.y];
}

function limb(g,rig,pose){
 const {leg,length,width}=rig,middle=leg.height/2;
 const points=[pose.hip,pose.knee,pose.foot];
 for(let i=0;i<2;i++){
  const a=points[i],b=points[i+1],h=length/2;
  const thickness=width*pose.thickness;
  g.save();g.transform(...walkingLimbTransform(a,b,h));
  g.drawImage(leg,0,i*middle,leg.width,middle,-thickness/2,0,thickness,h+.3);g.restore();
 }
}

export function drawWalkingSprite(g,source,r,body,scale,walk,direction,robe=false){
 const rig=walkingRig(source,r,body,robe),pose=walkingPose(walk,direction,rig.height);
 g.save();g.scale(scale,scale);
 for(const foot of pose.feet)limb(g,rig,foot);
 // A single torso layer covers the joints, preserving coats and ghost opacity.
 g.drawImage(rig.canvas,-rig.anchor,-rig.foot-pose.bob);
 g.restore();
}
