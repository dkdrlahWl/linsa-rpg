/* Equipment-independent portraits. Weapons are rendered only by battleHero. */
(() => {
  'use strict';
  function install(){
    const art=window.RinguArt;
    if(!art?.assembledBody||!art?.sprite||art.__weaponPoseV5)return;
    const previous=art.hero;
    art.__weaponPoseV5=true;art.__weaponPoseV4=true;
    art.hero=function(ctx,s,equipment,indexOf,time,x,y,height){
      const female=s?.playerGender==='female',body=art.assembledBody(female);
      if(!body)return previous(ctx,s,{},indexOf,time,x,y,height);
      const W=body.canvas.width,H=body.canvas.height,scale=height/H;
      const bx=x-W/2*scale,by=y-height;
      function ground(cx,cy,rx,ry){ctx.save();const shade=ctx.createRadialGradient(cx,cy,0,cx,cy,rx);shade.addColorStop(0,'#0009');shade.addColorStop(1,'#0000');ctx.translate(cx,cy);ctx.scale(1,ry/rx);ctx.fillStyle=shade;ctx.translate(-cx,-cy);ctx.beginPath();ctx.arc(cx,cy,rx,0,Math.PI*2);ctx.fill();ctx.restore();}
      ground(x,y-5,height*.19,height*.025);
      if(s.equippedAura>=0)art.aura(ctx,s.equippedAura,time,x,y-height*.46,Math.min(height*.88,ctx.canvas.width-40),height*1.08,s.remodelFx===false?0:1.5);
      ctx.drawImage(body.canvas,bx,by,W*scale,height);
      // Retain the same pet placement and aura; never mutate account state.
      if(s.equippedPet&&s.ownedPets){
        const p=s.ownedPets.find(p=>p.uid===s.equippedPet);
        if(p){const ix=Object.keys(window.RinguCore?.PET_DATA||{}).sort().indexOf(p.petId);
          if(ix>=0){const size=Math.min(height*.25,ctx.canvas.width*.25),pad=20,px=Math.max(pad,Math.min(x+height*.27,ctx.canvas.width-size-pad)),py=Math.max(pad,Math.min(y-size,ctx.canvas.height-size-pad));
            ground(px+size/2,py+size-4,size*.44,size*.065);
            art.sprite(ctx,'pets',ix,5,5,px,py,size,size);
            ctx.canvas.dataset.petBounds=JSON.stringify({x:px,y:py,width:size,height:size});
          }
        }
      }else delete ctx.canvas.dataset.petBounds;
      return {grips:[]};
    };
  }
  window.addEventListener('ringu-ready',install,{once:true});
  if(window.RinguArt?.ready)window.RinguArt.ready.then(install);
  install();
})();
