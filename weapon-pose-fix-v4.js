/* Portrait-only ready stance. Battle poses and item stats are unchanged. */
(() => {
  'use strict';
  const geometry = new WeakMap();
  function weaponGeometry(socket) {
    if (geometry.has(socket)) return geometry.get(socket);
    const cv=socket.im,ctx=cv.getContext('2d'),w=cv.width,h=cv.height;
    const pixels=ctx.getImageData(0,0,w,h).data;
    let count=0,totalX=0,totalY=0;
    // Measure the blade's direction once, relative to its authored handle anchor.
    // A single rotation for the entire diagonal atlas is not a hand socket.
    for(let y=0;y<Math.floor(h*.34);y++)for(let x=0;x<w;x++){
      if(pixels[(y*w+x)*4+3]<160)continue;
      count++;totalX+=x;totalY+=y;
    }
    const angle=count?Math.atan2(totalY/count-socket.v*h,totalX/count-socket.u*w):-Math.PI/2;
    const result={angle};geometry.set(socket,result);return result;
  }
  // Palm centres measured in the original 1254px hero atlas, not fingertips.
  const palms={male:[[181,646],[548,650]],female:[[734,653],[1078,660]]};
  function palm(female,left,W,H){
    const box=female?[700,88,424,1120]:[138,40,472,1172];
    const point=palms[female?'female':'male'][left?1:0];
    return{x:W/2+(point[0]-box[0]-box[2]/2)/box[3]*H,y:(point[1]-box[1])/box[3]*H};
  }
  const stanceBodies=new Map();
  function closedGripBody(art,body,female,dual){
    const key=String(female)+':'+String(dual);
    if(stanceBodies.has(key))return stanceBodies.get(key);
    if(!art.images?.['hero-combat-v1']?.naturalWidth)return body.canvas;
    // Reuse this same character's closed combat fist; no painted placeholder hand.
    const sample=document.createElement('canvas');sample.width=640;sample.height=1100;
    const pose=art.battleHero(sample.getContext('2d'),{playerGender:female?'female':'male',equippedAura:-1},{},()=>0,0,320,1050,1000,{pose:2});
    if(!pose)return body.canvas;
    const fist=document.createElement('canvas');fist.width=90;fist.height=115;
    fist.getContext('2d').drawImage(sample,pose.handX-45,pose.handY-65,90,115,0,0,90,115);
    const canvas=document.createElement('canvas');canvas.width=body.canvas.width;canvas.height=body.canvas.height;
    const c=canvas.getContext('2d');c.drawImage(body.canvas,0,0);
    for(const left of (dual?[false,true]:[false])){
      const hand=palm(female,left,canvas.width,canvas.height);
      c.save();c.globalCompositeOperation='destination-out';c.beginPath();
      c.ellipse(hand.x,hand.y+13,36,43,0,0,Math.PI*2);c.fill();c.restore();
      c.save();c.translate(hand.x,hand.y);if(left)c.scale(-1,1);
      // Match the sampled palm (45,65) exactly to the weapon socket.
      c.drawImage(fist,-45,-65);c.restore();
    }
    stanceBodies.set(key,canvas);return canvas;
  }
  function install(){
    const art=window.RinguArt;
    if(!art?.assembledBody||!art?.weaponSocket||!art?.sprite||art.__weaponPoseV5)return;
    const previous=art.hero;
    art.__weaponPoseV5=true;art.__weaponPoseV4=true;
    art.hero=function(ctx,s,equipment,indexOf,time,x,y,height){
      const female=s?.playerGender==='female',body=art.assembledBody(female);
      if(!body)return previous(ctx,s,equipment,indexOf,time,x,y,height);
      const W=body.canvas.width,H=body.canvas.height,scale=height/H;
      const bx=x-W/2*scale,by=y-height;
      function ground(cx,cy,rx,ry){ctx.save();const shade=ctx.createRadialGradient(cx,cy,0,cx,cy,rx);shade.addColorStop(0,'#0009');shade.addColorStop(1,'#0000');ctx.translate(cx,cy);ctx.scale(1,ry/rx);ctx.fillStyle=shade;ctx.translate(-cx,-cy);ctx.beginPath();ctx.arc(cx,cy,rx,0,Math.PI*2);ctx.fill();ctx.restore();}
      ground(x,y-5,height*.19,height*.025);
      if(s.equippedAura>=0)art.aura(ctx,s.equippedAura,time,x,y-height*.46,Math.min(height*.88,ctx.canvas.width-40),height*1.08,s.remodelFx===false?0:1.5);
      const weapon=equipment?.['무기'],socket=weapon&&art.weaponSocket(weapon,indexOf);
      const displayBody=socket?closedGripBody(art,body,female,socket.dual):body.canvas;
      ctx.drawImage(displayBody,bx,by,W*scale,height);
      const grips=[];
      if(socket){
        const model=weaponGeometry(socket);
        const hold=left=>{
          const hand=palm(female,left,W,H),hx=bx+hand.x*scale,hy=by+hand.y*scale;
          const h=height*(socket.gauntlet?.14:.46),w=h*socket.w/socket.h;
          // Blade up and slightly outward, safely clear of the torso and face.
          const rotation=socket.gauntlet?.25:-1.98-model.angle;
          ctx.save();ctx.translate(hx,hy);if(left)ctx.scale(-1,1);ctx.rotate(rotation);
          ctx.drawImage(socket.im,-socket.u*w,-socket.v*h,w,h);ctx.restore();
          // Repaint opaque fingers only; the transparent grip opening retains the hilt.
          ctx.save();ctx.beginPath();ctx.ellipse(hx,hy+5*scale,24*scale,32*scale,0,0,Math.PI*2);ctx.clip();
          ctx.drawImage(displayBody,bx,by,W*scale,height);ctx.restore();
          grips.push({x:hx,y:hy,left,rotation});
        };
        hold(false);if(socket.dual)hold(true);
      }
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
      return {grips};
    };
  }
  window.addEventListener('ringu-ready',install,{once:true});
  if(window.RinguArt?.ready)window.RinguArt.ready.then(install);
  install();
})();
