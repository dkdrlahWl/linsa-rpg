// 2026-11-05 낚시 리뉴얼(연출): 살아있는 2.5D 낚시터.
// - WebGL 물결: 풍경 그림의 물(푸른 픽셀)만 일렁이고, 찌 주변에 물결 고리가 퍼진다.
// - 2D 효과: 낚시터별 떠다니는 입자, 빛줄기, 물고기 그림자, 물보라, 입질 "!", 낚은 물고기가 튀어 오르는 연출, 카메라 흔들림.
// 서버·판정과 무관한 순수 화면 연출이다. 장면(.fishing-scene)이 다시 그려져도 같은 효과 상태를 이어 붙인다.
// 새 그림이 생기면 FISHING_FX_ART에 경로만 넣으면 된다(없으면 기본 연출).
export const FISHING_FX_ART={
 // 예: brook:{foreground:'fishing/scene-brook-fg.webp'} — 화면 맨 앞(갈대·바위)에 얹는 투명 PNG/WebP, 시차 이동.
 // bobber:'fishing/bobber.webp' — 찌 그림(투명 배경, 정사각).
};
const SPOT_FX={
 brook:{kind:'petal',count:22,tint:'255,214,232',rays:'255,244,200'},
 moon:{kind:'firefly',count:26,tint:'190,225,255',rays:'170,200,255'},
 canyon:{kind:'leaf',count:20,tint:'255,150,80',rays:'255,210,150'},
 coral:{kind:'sparkle',count:24,tint:'255,240,200',rays:'255,220,170'},
 abyss:{kind:'bubble',count:24,tint:'220,190,255',rays:'200,170,255'},
 palace:{kind:'bubble',count:22,tint:'255,200,190',rays:'255,200,180'},
 volcano:{kind:'ember',count:30,tint:'255,140,70',rays:'255,150,90'},
 origin:{kind:'sparkle',count:28,tint:'160,250,255',rays:'150,240,255'},
 glacier:{kind:'firefly',count:30,tint:'235,250,255',rays:'180,240,255'},
 galaxy:{kind:'sparkle',count:34,tint:'255,200,250',rays:'255,170,240'},
};
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const rand=(a,b)=>a+Math.random()*(b-a);

// ── WebGL 물결 ──
const VERT='attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;v.y=1.-v.y;gl_Position=vec4(p,0.,1.);}';
const FRAG=`precision mediump float;varying vec2 v;uniform sampler2D img;uniform vec4 cover;uniform float t;uniform vec2 res;uniform vec4 rip[4];uniform vec2 cam;uniform vec3 skyOrb;
vec4 tex(vec2 s){return texture2D(img,cover.xy+s*cover.zw);}
void main(){
 vec2 s=v+cam;
 vec2 world=cover.xy+s*cover.zw;
 vec4 c0=tex(s);
 // Source-image masks keep the whole dock still, including on narrow phone crops.
 float aboveDock=1.-smoothstep(.53,.63,world.y);
 float green=smoothstep(.015,.12,c0.g-max(c0.r*.90,c0.b*.91));
 float blossom=smoothstep(.025,.19,max(c0.r,c0.b)-c0.g)*smoothstep(.22,.58,max(c0.r,c0.b));
 float leafySide=1.-smoothstep(.40,.63,world.x);
 float foliage=max(green,blossom*.8)*aboveDock*max(leafySide,1.-smoothstep(.15,.32,world.y));
 float breeze=sin(t*.68+world.y*8.)*.65+sin(t*1.37+world.x*23.+world.y*11.)*.35;
 vec2 wind=vec2(breeze*.0042,sin(t*.9+world.x*13.)*.0015)*foliage;
 float sky=(1.-smoothstep(.28,.48,world.y))*smoothstep(.30,.52,world.x);
 float cloudTone=1.-smoothstep(.22,.52,max(c0.r,max(c0.g,c0.b))-min(c0.r,min(c0.g,c0.b)));
 float stillOrb=skyOrb.z>0.?smoothstep(skyOrb.z,skyOrb.z+.035,length(world-skyOrb.xy)):1.;
 vec2 cloud=vec2(sin(world.y*9.+t*.12)*.005,cos(world.x*10.+t*.10)*.0017)*sky*cloudTone*stillOrb;
 float openWater=smoothstep(.42,.53,world.y)*smoothstep(.36,.47,world.x);
 float water=smoothstep(-.025,.13,max(c0.b-c0.r*.85,c0.g-c0.r*.94))*openWater;
 vec2 o=wind+cloud+vec2(sin(v.y*70.+t*1.7)*.0018+sin(v.x*23.+t*.9)*.0011,cos(v.x*48.+t*1.3)*.0014+sin(v.y*31.-t*1.1)*.0009)*water;
 float ring=0.;
 for(int i=0;i<4;i++){vec4 r=rip[i];if(r.w<=0.)continue;vec2 d=(v-r.xy)*vec2(res.x/res.y,2.6);float dist=length(d),age=t-r.z;float wave=sin(dist*90.-age*9.)*exp(-dist*7.)*exp(-age*1.4)*step(dist,age*.16);ring+=wave*r.w;o+=normalize(d+1e-4)*wave*.006*r.w;}
 vec4 c=tex(s+o);
 float caustic=pow(max(0.,sin((v.x*38.+sin(v.y*26.+t*1.2)*1.6+t*.6))*sin(v.y*44.-t*.8+sin(v.x*17.)*1.3)),6.);
 c.rgb+=water*(caustic*.10+ring*.20)*vec3(.85,.97,1.);
 c.rgb+=water*.025*sin(t*.7+v.x*6.);
 float star=smoothstep(.78,.96,max(c0.r,max(c0.g,c0.b)))*sky*stillOrb;
 c.rgb+=star*.035*sin(t*1.3+world.x*137.+world.y*193.);
 c.rgb+=foliage*.008*sin(t*.65+world.x*7.);
 gl_FragColor=vec4(c.rgb,1.);
}`;
function makeWater(canvas){
 const gl=canvas.getContext('webgl',{premultipliedAlpha:false,antialias:false,alpha:false,powerPreference:'low-power'});if(!gl)return null;
 const sh=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
 const prog=gl.createProgram();gl.attachShader(prog,sh(gl.VERTEX_SHADER,VERT));gl.attachShader(prog,sh(gl.FRAGMENT_SHADER,FRAG));gl.linkProgram(prog);
 if(!gl.getProgramParameter(prog,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(prog));gl.useProgram(prog);
 const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
 const loc=gl.getAttribLocation(prog,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
 const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);
 for(const [k,val] of [[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,k,val);
 const u=n=>gl.getUniformLocation(prog,n);
 return {gl,u:{cover:u('cover'),t:u('t'),res:u('res'),rip:u('rip'),cam:u('cam'),skyOrb:u('skyOrb')},src:'',ready:false,
  upload(img){if(this.src===img.currentSrc&&this.ready)return;if(!img.complete||!img.naturalWidth)return;try{gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,img);this.src=img.currentSrc;this.ready=true;}catch{this.ready=false;}},
 };
}
// object-fit:cover + object-position 을 텍스처 좌표로 그대로 옮긴다.
function coverRect(img,w,h){
 if(img.dataset.anchored){const dw=parseFloat(img.style.width),dh=parseFloat(img.style.height);if(dw>0&&dh>0)return [-parseFloat(img.style.left)/dw,-parseFloat(img.style.top)/dh,w/dw,h/dh];}
 const iw=img.naturalWidth,ih=img.naturalHeight,scale=Math.max(w/iw,h/ih),vw=w/scale/iw,vh=h/scale/ih;
 const pos=getComputedStyle(img).objectPosition.split(' ').map(x=>parseFloat(x)/100),px=Number.isFinite(pos[0])?pos[0]:.5,py=Number.isFinite(pos[1])?pos[1]:.5;
 return [(1-vw)*px,(1-vh)*py,vw,vh];
}

// Canvas fallback uses the same painted image and source masks when WebGL is unavailable.
function atmosphereLayers(art,spot){
 const w=art.naturalWidth,h=art.naturalHeight,base=document.createElement('canvas');base.width=w;base.height=h;
 const bc=base.getContext('2d',{willReadFrequently:true});bc.drawImage(art,0,0);
 try{
  const original=bc.getImageData(0,0,w,h),leaves=new ImageData(new Uint8ClampedArray(original.data),w,h),clouds=new ImageData(new Uint8ClampedArray(original.data),w,h);
  const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
  for(let i=0;i<original.data.length;i+=4){
   const x=(i/4%w)/w,y=Math.floor(i/4/w)/h,r=original.data[i]/255,g=original.data[i+1]/255,b=original.data[i+2]/255;
   const green=smooth(.015,.12,g-Math.max(r*.90,b*.91)),blossom=smooth(.025,.19,Math.max(r,b)-g)*smooth(.22,.58,Math.max(r,b));
   const leaf=Math.max(green,blossom*.8)*(1-smooth(.53,.63,y))*Math.max(1-smooth(.40,.63,x),1-smooth(.15,.32,y));
   const orb=spot==='moon'?smooth(.17,.205,Math.hypot(x-.8,y-.16)):1;
   const sky=(1-smooth(.28,.48,y))*smooth(.30,.52,x)*(1-smooth(.22,.52,Math.max(r,g,b)-Math.min(r,g,b)))*smooth(.45,.75,Math.max(r,g,b))*orb;
   leaves.data[i+3]=Math.round(leaf*255);clouds.data[i+3]=Math.round(sky*180);
  }
  const layer=data=>{const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').putImageData(data,0,0);return c;};
  return {leaves:layer(leaves),clouds:layer(clouds)};
 }catch{return null;}
}

class FishingFx{
 constructor(){
  this.scene=null;this.water=null;this.glCanvas=null;this.fx=null;this.ctx=null;this.raf=0;this.particles=[];this.drops=[];this.rings=[];this.shadows=[];this.pops=[];this.jump=null;
  this.phase='';this.lastCatch='';this.spot='';this.ripples=[];this.shake=0;this.start=performance.now();this.pointer={x:0,y:0,tx:0,ty:0};
  this.onMove=e=>{const r=this.scene?.getBoundingClientRect();if(!r)return;const p=e.touches?.[0]||e;this.pointer.tx=((p.clientX-r.left)/r.width-.5)*2;this.pointer.ty=((p.clientY-r.top)/r.height-.5)*2;};
  this.onVis=()=>{if(!document.hidden)this.loop();};
  addEventListener('pointermove',this.onMove,{passive:true});document.addEventListener('visibilitychange',this.onVis);
  this.loop();
 }
 dispose(){cancelAnimationFrame(this.raf);this.raf=0;removeEventListener('pointermove',this.onMove);document.removeEventListener('visibilitychange',this.onVis);this.glCanvas?.remove();this.fx?.remove();this.scene=null;}
 attach(scene){
  this.scene=scene;const art=scene.querySelector('.fishing-scene-art');
  if(!this.glCanvas&&!this.glFailed){this.glCanvas=document.createElement('canvas');this.glCanvas.className='fishing-fx-water';try{this.water=makeWater(this.glCanvas);}catch(error){console.warn('fishing water renderer',error);this.water=null;}if(!this.water){this.glFailed=true;this.glCanvas=document.createElement('canvas');this.glCanvas.className='fishing-fx-water';this.fallbackWater=this.glCanvas.getContext('2d');}}
  if(this.glCanvas&&art)art.after(this.glCanvas);
  if(!this.fx){this.fx=document.createElement('canvas');this.fx.className='fishing-fx-layer';this.ctx=this.fx.getContext('2d');}
  const notice=scene.querySelector('.fishing-catch-notice');notice?notice.before(this.fx):scene.append(this.fx);
  const spot=scene.dataset.site||'brook';if(spot!==this.spot){this.spot=spot;this.particles=[];this.shadows=[];}
  scene.classList.add('fishing-fx-on');
 }
 size(){
  const s=this.scene,w=s.clientWidth,h=s.clientHeight,dpr=Math.min(devicePixelRatio||1,this.fallbackWater?1:1.5);
  for(const c of [this.glCanvas,this.fx]){if(!c)continue;const cw=Math.round(w*dpr),ch=Math.round(h*dpr);if(c.width!==cw||c.height!==ch){c.width=cw;c.height=ch;}}
  return {w,h,dpr};
 }
 bobber(){const b=this.scene.querySelector('.fishing-bobber');const x=parseFloat(b?.style.left),y=parseFloat(b?.style.top);return Number.isFinite(x)&&Number.isFinite(y)?{x,y,visible:b.style.visibility==='visible'}:null;}
 loop(){
  cancelAnimationFrame(this.raf);
  const tick=()=>{
   if(document.hidden){this.raf=0;return;}
   const scene=document.querySelector('.fishing-play .fishing-scene');
   if(!scene){this.raf=requestAnimationFrame(tick);return;}
   if(scene!==this.scene||!scene.contains(this.fx))this.attach(scene);
   try{this.frame();}catch(e){console.warn('fishing fx',e);}
   this.raf=requestAnimationFrame(tick);
  };
  this.raf=requestAnimationFrame(tick);
 }
 events(now,bob,w,h){
  const s=this.scene,phase=s.dataset.phase||'idle';
  if(phase!==this.phase){
   const prev=this.phase;this.phase=phase;
   if(phase==='waiting'&&prev==='casting'&&bob)this.splash(bob.x,bob.y,14,1);
   if(phase==='bite'&&bob){this.splash(bob.x,bob.y,26,1.6);this.pops.push({x:bob.x,y:bob.y-46,at:now,text:'!'});this.shake=now;}
   if(phase==='landing'&&bob)this.splash(bob.x,bob.y,34,2);
  }
  // 낚은 결과: 장면이 새로 그려지면서 생기는 결과 그림을 잡아 튀어 오르게 한다.
  const res=s.querySelector('.fishing-result-fish'),key=res?.getAttribute('src')||'';
  if(res&&key&&key!==this.lastCatch&&phase==='caught'){
   this.lastCatch=key;const img=new Image();img.src=key;const from=bob||{x:w*.62,y:h*.68};
   const big=Number(s.dataset.rarityTier||0);
   // 0.75초 동안 물속에서 버둥대다가(등급이 높을수록 크고 오래) 물 밖으로 튀어 오른다.
   // 오토 낚시: 짧게 튀어 올라 1초 동안 또렷이 보여 준 뒤 사라지고, 그동안 다음 던지기를 기다린다.
   const auto=!!this.isAuto?.(),fight=auto?250:420+big*160,flyMs=auto?350:650,T=auto?fight+flyMs+1000+200:fight+1300+big*450;
   this.jump={img,at:now,auto,flyMs,T,fight,from,to:{x:w*.55,y:h*.48},color:s.dataset.rarity||'#ffe7a6',big,name:s.dataset.rarityName||'',title:res.getAttribute('alt')?.replace(/^잡은 /,'')||''};
   res.classList.add('fishing-fx-hidden');
  }
  if(!res)this.lastCatch='';
 }
 splash(x,y,n,power){
  for(let i=0;i<n;i++){const a=rand(Math.PI*1.05,Math.PI*1.95);this.drops.push({x,y,vx:Math.cos(a)*rand(.6,2.4)*power,vy:Math.sin(a)*rand(1.6,4)*power,life:rand(.5,.9),age:0,r:rand(1,2.6)});}
  this.rings.push({x,y,age:0,max:rand(40,60)*power});
  this.ripples.unshift({x,y,t:(performance.now()-this.start)/1000,amp:Math.min(1.4,power*.6)});this.ripples.length=Math.min(4,this.ripples.length);
 }
 frame(){
  const now=performance.now(),t=(now-this.start)/1000,dt=Math.min(.05,(now-(this.prev||now))/1000);this.prev=now;
  const {w,h,dpr}=this.size(),still=reduced(),bob=this.bobber();
  this.events(now,bob,w,h);
  const p=this.pointer;p.x+=(p.tx-p.x)*.04;p.y+=(p.ty-p.y)*.04;
  const camX=still?0:Math.sin(t*.13)*.004+p.x*.006,camY=still?0:Math.cos(t*.11)*.003+p.y*.004;
  // 카메라 흔들림(입질·낚아올림)
  const sk=Math.max(0,1-(now-this.shake)/380),shx=sk?(Math.random()-.5)*7*sk:0,shy=sk?(Math.random()-.5)*5*sk:0;
  const angler=this.scene.querySelector('.fishing-angler');if(angler&&!still)angler.style.translate=this.scene.querySelector('.fishing-scene-art')?.dataset.anchored?'0px 0px':`${(-p.x*6).toFixed(1)}px ${(-p.y*3).toFixed(1)}px`;
  this.scene.style.setProperty('--fx-shake',`${shx.toFixed(1)}px ${shy.toFixed(1)}px`);
  // WebGL 물
  const art=this.scene.querySelector('.fishing-scene-art');
  if(this.water&&art){
   const W=this.water,gl=W.gl;W.upload(art);
   if(W.ready){
    gl.viewport(0,0,this.glCanvas.width,this.glCanvas.height);
    gl.uniform3fv(W.u.skyOrb,this.spot==='moon'?[.80,.16,.17]:[0,0,0]);
    gl.uniform4fv(W.u.cover,coverRect(art,w,h));gl.uniform1f(W.u.t,still?0:t);gl.uniform2f(W.u.res,w,h);gl.uniform2f(W.u.cam,art.dataset.anchored?0:camX,art.dataset.anchored?0:camY);
    const rip=new Float32Array(16);this.ripples.forEach((r,i)=>{rip.set([r.x/w,r.y/h,r.t,t-r.t<4?r.amp:0],i*4);});
    // 찌가 떠 있는 동안은 잔잔한 고리가 계속 퍼진다.
    if(bob?.visible&&!still&&(!this.ripples[0]||t-this.ripples[0].t>(this.phase==='bite'?.45:1.9)))this.ripples.unshift({x:bob.x,y:bob.y,t,amp:this.phase==='bite'?1.1:.45}),this.ripples.length=Math.min(4,this.ripples.length);
    gl.uniform4fv(W.u.rip,rip);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    this.glCanvas.classList.add('ready');
   }
  }
  if(this.fallbackWater&&art?.complete&&art.naturalWidth&&now-(this.fallbackAt||0)>33){
   this.fallbackAt=now;const c=this.fallbackWater,l=parseFloat(art.style.left)||0,top=parseFloat(art.style.top)||0,iw=parseFloat(art.style.width)||w,ih=parseFloat(art.style.height)||h;
   if(this.atmosphereSrc!==art.currentSrc){this.atmosphereSrc=art.currentSrc;this.atmosphereLayers=atmosphereLayers(art,this.spot);}
   c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);c.drawImage(art,l,top,iw,ih);
   if(!still){
    const left=Math.max(0,l+iw*.45),start=Math.max(0,top+ih*.48),sourceScale=art.naturalWidth/iw;
    for(let y=start;y<h;y+=6){const row=Math.min(6,h-y),wave=Math.sin(y*.065+t*1.4)*1.6+Math.sin(y*.021-t*.8)*.8;
     c.drawImage(art,(left-l-wave)*sourceScale,(y-top)*sourceScale,(w-left)*sourceScale,row*sourceScale,left,y,w-left,row);
    }
    const layers=this.atmosphereLayers;
    if(layers){c.drawImage(layers.leaves,l+Math.sin(t*.72)*w*.0023,top+Math.sin(t*.93)*h*.0008,iw,ih);c.drawImage(layers.clouds,l+Math.sin(t*.11)*w*.004,top+Math.cos(t*.09)*h*.001,iw,ih);}
   }
   this.glCanvas.classList.add('ready');
  }
  // 2D 효과
  const c=this.ctx;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);if(still&&!this.jump)return;
  const cfg=SPOT_FX[this.spot]||SPOT_FX.brook;
  this.rays(c,w,h,t,cfg);
  this.fishShadows(c,w,h,t,dt,bob);
  this.ambient(c,w,h,t,dt,cfg);
  this.splashes(c,dt);
  this.drawPops(c,now);
  this.drawJump(c,now,w,h);
 }
 rays(c,w,h,t,cfg){
  c.save();c.globalCompositeOperation='lighter';
  for(let i=0;i<4;i++){const x=w*(.15+i*.24)+Math.sin(t*.2+i)*w*.04,a=.05+.035*Math.sin(t*.5+i*1.7);const g=c.createLinearGradient(x,0,x+w*.12,h*.75);g.addColorStop(0,`rgba(${cfg.rays},${a})`);g.addColorStop(1,`rgba(${cfg.rays},0)`);c.fillStyle=g;c.beginPath();c.moveTo(x-w*.03,0);c.lineTo(x+w*.05,0);c.lineTo(x+w*.22,h*.75);c.lineTo(x+w*.04,h*.75);c.closePath();c.fill();}
  c.restore();
 }
 fishShadows(c,w,h,t,dt,bob){
  if(!this.shadows.length)for(let i=0;i<4;i++)this.shadows.push({x:rand(.2,.95)*w,y:rand(.7,.93)*h,a:rand(0,6.28),s:rand(.7,1.25),v:rand(14,26)});
  const target=bob&&['waiting','bite'].includes(this.phase)?bob:null;
  c.save();
  this.shadows.forEach((f,i)=>{
   let tx=f.x+Math.cos(f.a)*40,ty=f.y+Math.sin(f.a)*14;
   if(target&&i===0){tx=target.x;ty=target.y+10;}
   const d=Math.hypot(tx-f.x,ty-f.y)||1,want=Math.atan2(ty-f.y,tx-f.x);
   f.a+=Math.atan2(Math.sin(want-f.a),Math.cos(want-f.a))*Math.min(1,dt*(target&&i===0?3:.6))+(target&&i===0?0:Math.sin(t*.7+i)*dt*.6);
   const speed=f.v*(target&&i===0?(this.phase==='bite'?3.2:d<30?.15:1.1):1);
   f.x+=Math.cos(f.a)*speed*dt;f.y+=Math.sin(f.a)*speed*dt*.45;
   if(f.y<h*.62){f.y=h*.62;f.a=-f.a;}if(f.y>h*.97){f.y=h*.97;f.a=-f.a;}if(f.x<-40)f.x=w+30;if(f.x>w+40)f.x=-30;
   const len=26*f.s,wig=Math.sin(t*9+i)*.25;
   c.save();c.translate(f.x,f.y);c.rotate(Math.atan2(Math.sin(f.a)*.45,Math.cos(f.a)));c.scale(1,.42);c.fillStyle='rgba(6,22,34,.30)';
   c.beginPath();c.ellipse(0,0,len,len*.42,0,0,Math.PI*2);c.fill();
   c.beginPath();c.moveTo(-len*.85,0);c.lineTo(-len*1.45,-len*.42+wig*len*.4);c.lineTo(-len*1.45,len*.42+wig*len*.4);c.closePath();c.fill();c.restore();
  });
  c.restore();
 }
 ambient(c,w,h,t,dt,cfg){
  this.particles=this.particles.filter(q=>!q.dead);const list=this.particles;
  while(list.filter(q=>!q.burst).length<cfg.count)list.push(this.spawn(cfg,w,h,list.length===0?null:true));
  c.save();
  for(const q of list){
   q.age+=dt;q.x+=q.vx*dt+Math.sin(t*q.f+q.ph)*q.sway*dt;q.y+=q.vy*dt;q.rot+=q.vr*dt;
   if(q.y<-20||q.y>h+20||q.x<-30||q.x>w+30||q.age>q.life){if(q.burst){q.dead=true;continue;}Object.assign(q,this.spawn(cfg,w,h,false));}
   const fade=Math.min(1,q.age/.6,(q.life-q.age)/.8);
   if(q.burst){c.save();c.globalCompositeOperation='lighter';c.fillStyle=q.burst;c.globalAlpha=Math.max(0,1-q.age/q.life);c.beginPath();c.arc(q.x,q.y,q.r,0,Math.PI*2);c.fill();c.restore();continue;}
   if(cfg.kind==='petal'||cfg.kind==='leaf'){c.save();c.translate(q.x,q.y);c.rotate(q.rot);c.scale(1,Math.abs(Math.sin(t*2+q.ph))*.7+.3);c.fillStyle=`rgba(${cfg.tint},${.75*fade})`;c.beginPath();c.ellipse(0,0,q.r*1.6,q.r*.8,0,0,Math.PI*2);c.fill();c.restore();}
   else if(cfg.kind==='bubble'){c.strokeStyle=`rgba(${cfg.tint},${.5*fade})`;c.lineWidth=1;c.beginPath();c.arc(q.x,q.y,q.r*1.4,0,Math.PI*2);c.stroke();c.fillStyle=`rgba(255,255,255,${.35*fade})`;c.beginPath();c.arc(q.x-q.r*.5,q.y-q.r*.5,q.r*.35,0,Math.PI*2);c.fill();}
   else{c.save();c.globalCompositeOperation='lighter';const tw=cfg.kind==='sparkle'?(Math.sin(t*4+q.ph)*.5+.5):(Math.sin(t*1.6+q.ph)*.4+.6);const g=c.createRadialGradient(q.x,q.y,0,q.x,q.y,q.r*4);g.addColorStop(0,`rgba(${cfg.tint},${.9*fade*tw})`);g.addColorStop(1,`rgba(${cfg.tint},0)`);c.fillStyle=g;c.beginPath();c.arc(q.x,q.y,q.r*4,0,Math.PI*2);c.fill();c.restore();}
  }
  c.restore();
 }
 spawn(cfg,w,h,anywhere){
  const k=cfg.kind,q={age:0,ph:rand(0,6.28),f:rand(.5,1.4),rot:rand(0,6.28),vr:rand(-1.5,1.5),r:rand(1.6,3.4),life:rand(6,12)};
  if(k==='petal'||k==='leaf')Object.assign(q,{x:rand(-.1,1)*w,y:anywhere?rand(0,h):-10,vx:rand(8,22),vy:rand(14,30),sway:rand(12,30)});
  else if(k==='bubble')Object.assign(q,{x:rand(0,w),y:anywhere?rand(h*.4,h):h+10,vx:0,vy:-rand(10,26),sway:rand(6,14),r:rand(1.4,3.2)});
  else if(k==='ember')Object.assign(q,{x:rand(0,w),y:anywhere?rand(0,h):h+10,vx:rand(-6,6),vy:-rand(18,40),sway:rand(10,24),r:rand(.9,2)});
  else if(k==='firefly')Object.assign(q,{x:rand(0,w),y:rand(h*.25,h*.9),vx:rand(-8,8),vy:rand(-5,5),sway:rand(10,20),r:rand(1,1.8)});
  else Object.assign(q,{x:rand(0,w),y:rand(h*.35,h*.95),vx:rand(-3,3),vy:rand(-4,1),sway:rand(3,8),r:rand(.8,1.6),life:rand(2,5)});
  return q;
 }
 splashes(c,dt){
  c.save();
  this.drops=this.drops.filter(d=>(d.age+=dt)<d.life);
  for(const d of this.drops){d.x+=d.vx;d.y+=d.vy;d.vy+=9.8*dt*3;const a=1-d.age/d.life;c.fillStyle=`rgba(225,248,255,${.85*a})`;c.beginPath();c.arc(d.x,d.y,d.r,0,Math.PI*2);c.fill();}
  this.rings=this.rings.filter(r=>(r.age+=dt)<1.1);
  for(const r of this.rings){const k=r.age/1.1,rad=8+r.max*k;c.strokeStyle=`rgba(230,250,255,${.7*(1-k)})`;c.lineWidth=2*(1-k)+.5;c.beginPath();c.ellipse(r.x,r.y,rad,rad*.32,0,0,Math.PI*2);c.stroke();}
  c.restore();
 }
 drawPops(c,now){
  this.pops=this.pops.filter(p=>now-p.at<1100);
  for(const p of this.pops){const k=(now-p.at)/1100,s=k<.18?k/.18*1.35:1.35-Math.min(.35,(k-.18)*1.2),a=k>.75?1-(k-.75)/.25:1;
   c.save();c.translate(p.x,p.y-k*10);c.scale(s,s);c.globalAlpha=a;c.font='900 42px system-ui,sans-serif';c.textAlign='center';c.textBaseline='middle';c.lineWidth=7;c.strokeStyle='#5a1d00';c.strokeText(p.text,0,0);c.fillStyle='#ffd34d';c.fillText(p.text,0,0);c.restore();}
 }
 drawJump(c,now,w,h){
  const j=this.jump;if(!j)return;const el=now-j.at,F=j.fight,T=j.T;
  // 다음 낚시를 던지면(오토 포함) 연출을 0.3초 안에 접는다.
  if(this.phase!=='caught'&&!j.ending)j.ending=now;const endFade=j.ending?Math.max(0,1-(now-j.ending)/300):1;
  if(el>=T||endFade<=0){const done=j;this.jump=null;if(!done.auto)this.scene.querySelector('.fishing-result-fish')?.classList.remove('fishing-fx-hidden');return;}
  // 1) 버둥대기: 찌 자리에서 그림자가 크게 요동치고 물보라가 계속 튄다.
  c.save();c.globalAlpha=endFade;
  if(el<F){
   const k=el/F,x=j.from.x+Math.sin(el/55)*10*(1+j.big*.3),y=j.from.y+6+Math.cos(el/70)*4,len=(18+j.big*7)*(.8+.2*Math.sin(el/40));
   c.save();c.translate(x,y);c.rotate(Math.sin(el/90)*.9);c.scale(1,.45);c.fillStyle=`rgba(4,18,30,${.35+.2*k})`;c.beginPath();c.ellipse(0,0,len,len*.45,0,0,Math.PI*2);c.fill();c.restore();
   if(Math.random()<.5+j.big*.08)this.splash(x+rand(-8,8),y,3+j.big,0.7+j.big*.12);
   if(el%240<20)this.shake=now-200;
   c.restore();return;
  }
  const e2=el-F,k=e2/(T-F);
  if(e2<30&&!j.launched){j.launched=true;this.splash(j.from.x,j.from.y,36+j.big*8,1.8+j.big*.25);this.shake=now;if(j.big>=4)j.flash=now;}
  // 2) 튀어 오르기 → 3) 공중에서 빛나며 보여주기 → 4) 사라짐
  const fly=Math.min(1,e2/j.flyMs),ease=1-(1-fly)**3;
  const x=j.from.x+(j.to.x-j.from.x)*ease,y=j.from.y+(j.to.y-j.from.y)*ease-Math.sin(fly*Math.PI)*h*.14;
  const size=Math.min(w,h)*(.14+.08*ease+.014*j.big)*(1+.05*Math.sin(now/120)),rot=(1-ease)*-1.6+Math.sin(now/260)*.07,a=(j.auto?Math.min(1,(T-el)/200):k>.85?1-(k-.85)/.15:1)*endFade;
  if(j.flash){const fk=(now-j.flash)/500;if(fk<1){c.save();c.fillStyle=`rgba(255,255,255,${.55*(1-fk)})`;c.fillRect(0,0,w,h);c.restore();}}
  c.save();c.globalAlpha=a;c.globalCompositeOperation='lighter';
  const glow=c.createRadialGradient(x,y,0,x,y,size*(1.1+j.big*.12));glow.addColorStop(0,j.color+'cc');glow.addColorStop(1,j.color+'00');c.fillStyle=glow;c.beginPath();c.arc(x,y,size*(1.1+j.big*.12),0,Math.PI*2);c.fill();
  if(fly>=1&&j.big>=2){c.translate(x,y);c.rotate(now/(1600-j.big*120));const n=8+j.big*3;for(let i=0;i<n;i++){c.rotate(Math.PI*2/n);c.fillStyle=j.color+(j.big>=4?'55':'2e');c.beginPath();c.moveTo(0,0);c.lineTo(size*(1.8+j.big*.2),-size*.11);c.lineTo(size*(1.8+j.big*.2),size*.11);c.fill();}}
  c.restore();
  // 높은 등급: 반짝이 소나기
  if(fly>=1&&j.big>=3&&Math.random()<.25+j.big*.08){const an=rand(0,6.28),r=size*rand(.6,1.6);this.particles.push({x:x+Math.cos(an)*r,y:y+Math.sin(an)*r,vx:rand(-10,10),vy:rand(-30,-8),sway:4,f:1,ph:0,rot:0,vr:0,r:rand(1.2,2.4),age:0,life:1.2,burst:j.color});}
  c.save();c.globalAlpha=a;c.translate(x,y);c.rotate(rot);
  if(j.img.complete&&j.img.naturalWidth){const r=j.img.naturalWidth/j.img.naturalHeight,dw=r>=1?size*2:size*2*r,dh=r>=1?size*2/r:size*2;c.shadowColor=j.color;c.shadowBlur=14+j.big*5;c.drawImage(j.img,-dw/2,-dh/2,dw,dh);}
  c.restore();
  if(fly<1&&Math.random()<.7)this.drops.push({x,y,vx:rand(-1,1),vy:rand(0,1.5),life:.5,age:0,r:rand(1,2.2)});
  // 등급 이름 배너
  if(fly>=1&&(j.name||j.title)){const bk=Math.min(1,(e2-j.flyMs)/(j.auto?120:260)),bs=bk<1?.6+.55*bk:1.15-Math.min(.15,(e2-j.flyMs-260)/1200);
   c.save();c.globalAlpha=a*bk;c.translate(w/2,Math.min(h*.78,y+size*1.35));c.scale(bs,bs);c.textAlign='center';c.textBaseline='middle';
   if(j.name){c.font=`900 ${16+j.big*2}px system-ui,sans-serif`;c.lineWidth=5;c.strokeStyle='#08131c';const label=j.big>=4?'★ '+j.name+' ★':j.name;c.strokeText(label,0,-14);c.fillStyle=j.color;c.fillText(label,0,-14);}
   if(j.title){c.font='800 15px system-ui,sans-serif';c.lineWidth=4;c.strokeStyle='#08131c';c.strokeText(j.title,0,10);c.fillStyle='#fff6df';c.fillText(j.title,0,10);}
   c.restore();}
  c.restore();
 }
}
let fx=null;
export function startFishingFx(opts={}){if(!fx)fx=new FishingFx();else if(!fx.raf)fx.loop();if(opts.isAuto)fx.isAuto=opts.isAuto;}
// 낚은 물고기 연출이 끝나는 시각(performance.now 기준). 오토 낚시는 이 시각까지 다음 던지기를 미룬다.
export const fishingFxBusyUntil=()=>fx?.jump&&!fx.jump.ending?fx.jump.at+fx.jump.T:0;
export function stopFishingFx(){fx?.dispose();fx=null;}
