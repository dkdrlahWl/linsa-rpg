(()=>{'use strict';
function install(){
 const art=window.RinguArt;if(!art?.assembledBody||!art?.weaponSocket||!art?.sprite||art.__weaponPoseV4)return false;
 art.__weaponPoseV4=true;
 const fallback=art.hero;
 art.hero=function(ctx,s,equipment,indexOf,time,x,y,height){
  const female=s?.playerGender==='female',body=art.assembledBody(female);if(!body)return fallback(ctx,s,equipment,indexOf,time,x,y,height);
  const W=body.canvas.width,H=body.canvas.height,scale=height/H;
  if(s.equippedAura>=0)art.aura(ctx,s.equippedAura,time,x,y-height*.46,Math.min(height*.88,ctx.canvas.width-40),height*1.08,s.remodelFx===false?0:1.5);
  ctx.drawImage(body.canvas,x-W/2*scale,y-height,W*scale,height);
  const weapon=equipment?.['무기'];
  if(weapon){
   const socket=art.weaponSocket(weapon,indexOf);
   if(socket){
    const drawHeld=(hand,mirror=false)=>{
     const handX=x+(hand.x-W/2)*scale,handY=y-height+hand.y*scale;
     // The atlas grip pivot sits too low inside several weapon cutouts. Offset the
     // weapon itself upward while keeping the repainted hand at the real hand socket.
     const weaponX=handX+(mirror?-1:1)*1.5*scale;
     const weaponY=handY-42*scale;
     const h=height*(socket.gauntlet?.15:.33),w=h*socket.w/socket.h;
     ctx.save();ctx.translate(weaponX,weaponY);if(mirror)ctx.scale(-1,1);
     const angle=2.38;ctx.rotate(socket.gauntlet?angle-2.2:angle);
     ctx.drawImage(socket.im,-socket.u*w,-socket.v*h,w,h);ctx.restore();
     // Repaint the actual hand over the corrected handle so it reads as a real grip.
     ctx.save();ctx.beginPath();ctx.ellipse(handX,handY,18*scale,24*scale,0,0,Math.PI*2);ctx.clip();
     ctx.drawImage(body.canvas,x-W/2*scale,y-height,W*scale,height);ctx.restore();
    };
    drawHeld(body.hand,false);
    if(socket.dual)drawHeld({x:W-body.hand.x,y:body.hand.y},true);
   }
  }
  if(s.equippedPet&&s.ownedPets){const p=s.ownedPets.find(p=>p.uid===s.equippedPet);if(p){const ix=Object.keys(window.RinguCore?.PET_DATA||{}).sort().indexOf(p.petId);if(ix>=0){const size=Math.min(height*.25,ctx.canvas.width*.25),pad=20,px=Math.max(pad,Math.min(x+height*.27,ctx.canvas.width-size-pad)),py=Math.max(pad,Math.min(y-size,ctx.canvas.height-size-pad));art.sprite(ctx,'pets',ix,5,5,px,py,size,size);ctx.canvas.dataset.petBounds=JSON.stringify({x:px,y:py,width:size,height:size});}}}else delete ctx.canvas.dataset.petBounds;
 };
 try{window.RinguCore?.fn?.renderEquipment?.()}catch{}
 return true;
}
window.addEventListener('ringu-ready',install,{once:true});
setTimeout(install,0);setTimeout(install,1200);setTimeout(install,3000);
})();