/* Whole-character appearances. Data lives here; combat rules never read it. */
(() => {
 'use strict';
 const definitions=window.RinguCostumeCatalog.products;
 const images=new Map(),pending=new Map(),geometry=new WeakMap(),failures=new Map();
 let activeId=null;
 const MAX_RESIDENT=2;
 function trim(){while(images.size>MAX_RESIDENT){const victim=[...images.keys()].find(id=>id!==activeId);if(!victim)break;images.delete(victim);}}
 function load(id){
  if(images.has(id)){const im=images.get(id);images.delete(id);images.set(id,im);return Promise.resolve(im);}
  if(pending.has(id))return pending.get(id);
  const def=Object.hasOwn(definitions,id)&&definitions[id];if(!def)return Promise.reject(new Error('UNKNOWN_COSTUME'));
  if((failures.get(id)||0)>Date.now())return Promise.reject(new Error('COSTUME_ART_RETRY_LATER'));
  const promise=new Promise((resolve,reject)=>{const im=new Image();
   const fail=()=>{pending.delete(id);failures.set(id,Date.now()+3000);reject(new Error('COSTUME_ART_UNAVAILABLE'));};
   im.onload=()=>{if(def.frames.some(f=>f.box[0]+f.box[2]>im.naturalWidth||f.box[1]+f.box[3]>im.naturalHeight))return fail();images.set(id,im);pending.delete(id);failures.delete(id);trim();resolve(im);};im.onerror=fail;im.src='/linsa-rpg/art/'+def.asset;});
  pending.set(id,promise);return promise;
 }
 function bladeAngle(socket){
  if(geometry.has(socket))return geometry.get(socket);
  const im=socket.im,p=im.getContext('2d').getImageData(0,0,im.width,im.height).data;
  let count=0,sx=0,sy=0;
  for(let y=0;y<im.height*.34;y++)for(let x=0;x<im.width;x++)if(p[(y*im.width+x)*4+3]>160){sx+=x;sy+=y;count++;}
  const angle=count?Math.atan2(sy/count-socket.v*im.height,sx/count-socket.u*im.width):-Math.PI/2;geometry.set(socket,angle);return angle;
 }
 const angles=[-.9,-.15,1.94,-2.2,.15,.9];
 function draw(ctx,id,{x,y,height,pose=null,mirror=false,equipment={},indexOf=()=>0,time=0,state={}}){
  const def=Object.hasOwn(definitions,id)&&definitions[id],im=images.get(id);if(!def||!im||![x,y,height,time].every(Number.isFinite)||height<=0||(pose!==null&&!Number.isFinite(pose)))return null;
  const battle=pose!==null,index=battle?Math.max(0,Math.min(5,Math.floor(pose)))+1:0,f=def.frames[index],u=height/def.height;
  const art=window.RinguArt,box=f.box,root=f.root,hand=f.hand;
  ctx.save();try{ctx.translate(x,y);if(mirror)ctx.scale(-1,1);ctx.scale(u,u);
  if(state.equippedAura>=0)art.aura(ctx,state.equippedAura,time,0,-def.height*.46,def.height*.78,def.height*1.06,state.remodelFx===false?0:1.35);
  const body=()=>ctx.drawImage(im,...box,box[0]-root[0],box[1]-root[1],box[2],box[3]);body();
  const weapon=battle&&equipment['무기'],socket=weapon&&art.weaponSocket(weapon,indexOf);
  if(socket&&hand){
   const h=def.height*(socket.gauntlet?.15:.46),w=h*socket.w/socket.h;
   ctx.save();try{ctx.translate(hand[0]-root[0],hand[1]-root[1]);ctx.rotate(socket.gauntlet?0:angles[index-1]-bladeAngle(socket));
   ctx.drawImage(socket.im,-socket.u*w,-socket.v*h,w,h);}finally{ctx.restore();}
   // Same sprite's fingers occlude its hilt. Cloak/body/fingers share one transform.
   ctx.save();try{ctx.beginPath();ctx.ellipse(hand[0]-root[0],hand[1]-root[1],11,14,0,0,Math.PI*2);ctx.clip();body();}finally{ctx.restore();}
  }
  }finally{ctx.restore();}return {pose,rootX:x,rootY:y,handX:hand?x+(mirror?-1:1)*(hand[0]-root[0])*u:null,handY:hand?y+(hand[1]-root[1])*u:null};
 }
 window.RinguCostumeArt={definitions,load,draw,isReady:id=>images.has(id),setActive:async id=>{if(id!==null&&!Object.hasOwn(definitions,id))throw Error('UNKNOWN_COSTUME');activeId=id;if(id!==null)await load(id);trim();},cacheInfo:()=>({resident:images.size,pending:pending.size,maxResident:MAX_RESIDENT})};
})();
