import MOTION_LAYOUT from './motion-layout.mjs?v=motion-world-1';
import {towerEncounter,TOWER_FLOORS,TOWER_CLASSES,towerFacing,facingVector,TOWER_SIZE} from './tower-model.mjs?v=motion-world-1';
const cache=new Map(),spriteBounds=new WeakMap();
function frameBounds(im,cols,rows){let cached=spriteBounds.get(im);if(cached)return cached;const c=document.createElement("canvas");c.width=im.width;c.height=im.height;const g=c.getContext("2d",{willReadFrequently:true});g.drawImage(im,0,0);const result=[];for(let f=0;f<cols*rows;f++){const x=Math.floor(f%cols*c.width/cols),y=Math.floor(Math.floor(f/cols)*c.height/rows),w=Math.floor((f%cols+1)*c.width/cols)-x,h=Math.floor((Math.floor(f/cols)+1)*c.height/rows)-y,d=g.getImageData(x,y,w,h).data;let l=w,r=0,t=h,b=0;for(let j=0;j<h;j++)for(let i=0;i<w;i++)if(d[(j*w+i)*4+3]>20){l=Math.min(l,i);r=Math.max(r,i);t=Math.min(t,j);b=Math.max(b,j);}result.push(r>=l&&b>=t?{x:x+l,y:y+t,w:r-l+1,h:b-t+1}:{x,y,w,h});}spriteBounds.set(im,result);return result;}
export const asset=name=>'tower/'+name+'.webp';
export const motionAsset=name=>'tower/'+name+'.png';
export function image(src){if(!cache.has(src)){const im=new Image();im.src=src;cache.set(src,im);}return cache.get(src);}
const mix=(a,b,t)=>a+(b-a)*t;
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const format=n=>Math.floor(n).toLocaleString('ko-KR');
// Each new atlas has eight hand-drawn ready poses followed by eight attack poses.
// Direction order matches towerFacing: E, SE, S, SW, W, NW, N, NE.
const directional=(name,dir,attack=false)=>[asset(name+'-directions'),4,4,(attack?8:0)+dir];
const cleanAtlases=new WeakMap();
const tintedAtlases=new WeakMap();
function tintedAtlas(im,filter){
  if(filter==='none')return im;
  let variants=tintedAtlases.get(im);if(!variants){variants=new Map();tintedAtlases.set(im,variants);}
  if(!variants.has(filter)){const canvas=document.createElement('canvas');canvas.width=im.naturalWidth;canvas.height=im.naturalHeight;const g=canvas.getContext('2d');g.filter=filter;g.drawImage(im,0,0);variants.set(filter,canvas);}
  return variants.get(filter);
}
// Some painted poses overlap a neighbouring atlas cell. Isolate the actual
// character in each cell so stray weapon tips and hair never appear beside it.
function cleanDirectionalAtlas(im,layout=null){
  if(cleanAtlases.has(im))return cleanAtlases.get(im);
  try{
    const canvas=document.createElement('canvas');canvas.width=im.naturalWidth;canvas.height=im.naturalHeight;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(im,0,0);
    const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),data=pixels.data;
    const regions=layout?.frames||Array.from({length:16},(_,i)=>({x:i%4*canvas.width/4,y:Math.floor(i/4)*canvas.height/4,w:canvas.width/4,h:canvas.height/4}));
    for(const region of regions){
      const sw=Math.floor(region.w),sh=Math.floor(region.h),size=sw*sh,ox=Math.floor(region.x),oy=Math.floor(region.y),groups=[null];
      const labels=new Int32Array(size),queue=new Int32Array(size),mask=new Uint8Array(size);
      for(let y=0;y<sh;y++)for(let x=0;x<sw;x++)mask[y*sw+x]=data[((oy+y)*canvas.width+ox+x)*4+3]>8?1:0;
      for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){
        const start=y*sw+x;if(labels[start]||!mask[start])continue;
        const id=groups.length,g={size:0,minX:x,maxX:x,minY:y,maxY:y};groups.push(g);
        let first=0,last=0;queue[last++]=start;labels[start]=id;
        while(first<last){
          const p=queue[first++],px=p%sw,py=Math.floor(p/sw);g.size++;
          g.minX=Math.min(g.minX,px);g.maxX=Math.max(g.maxX,px);
          g.minY=Math.min(g.minY,py);g.maxY=Math.max(g.maxY,py);
          let q=p-1;if(px&&mask[q]&&!labels[q]){labels[q]=id;queue[last++]=q;}
          q=p+1;if(px<sw-1&&mask[q]&&!labels[q]){labels[q]=id;queue[last++]=q;}
          q=p-sw;if(py&&mask[q]&&!labels[q]){labels[q]=id;queue[last++]=q;}
          q=p+sw;if(py<sh-1&&mask[q]&&!labels[q]){labels[q]=id;queue[last++]=q;}
        }
      }
      if(groups.length<3)continue;
      let main=1;for(let id=2;id<groups.length;id++)if(groups[id].size>groups[main].size)main=id;
      const keep=groups.map((g,id)=>{
        if(id===main)return true;if(!g)return false;
        const border=g.minX<=6||g.maxX>=sw-7||g.minY<=6||g.maxY>=sh-7;
        return g.size>=groups[main].size*(border?.28:.012);
      });
      for(let p=0;p<size;p++)if(labels[p]&&!keep[labels[p]]){
        data[((oy+Math.floor(p/sw))*canvas.width+ox+p%sw)*4+3]=0;
      }
    }
    ctx.putImageData(pixels,0,0);cleanAtlases.set(im,canvas);return canvas;
  }catch{cleanAtlases.set(im,im);return im;}
}

export class TowerRenderer {
  constructor(canvas){
    this.mobileActors=matchMedia('(pointer: coarse)');
    this.canvas=canvas;this.g=canvas.getContext('2d',{alpha:false});this.trail=[];this.steps=[];this.lastStep=0;this.last=0;this.camera=null;
    this.particles=[];this.shockwaves=[];this.seenEvents=new Set();this.shake=0;this.flash=0;this.zoom=0;
    this.resize=new ResizeObserver(entries=>{const r=entries[0].contentRect;if(r.width&&r.height){this.viewHeight=Math.round(1000*r.height/r.width);const width=Math.min(1000,Math.max(480,Math.round(r.width*Math.min(devicePixelRatio||1,1.5))));if(canvas.width!==width||canvas.height!==Math.round(width*r.height/r.width)){canvas.width=width;canvas.height=Math.round(width*r.height/r.width);}}});this.resize.observe(canvas);
  }
  dispose(){this.resize.disconnect();}
  sprite(src,columns,rows,frame,x,y,w,h,flip=1,rotation=0,alpha=1,width=1,lean=0){
    const im=image(src);if(!im.complete||!im.naturalWidth)return;
    const actorScale=this.mobileActors.matches?1.5:1;w*=actorScale;h*=actorScale;
    const g=this.g,source=src.endsWith('-directions.webp')?cleanDirectionalAtlas(im):im,sw=source.width/columns,sh=source.height/rows;
    g.save();g.translate(x,y);g.rotate(rotation);g.scale(flip*width,1);g.transform(1,0,lean,1,0,0);g.globalAlpha=alpha;
    const frames=frameBounds(source,columns,rows),r=frames[((frame%frames.length)+frames.length)%frames.length],scale=Math.min(w/Math.max(...frames.map(v=>v.w)),h/Math.max(...frames.map(v=>v.h)));g.drawImage(source,r.x,r.y,r.w,r.h,-r.w*scale/2,-r.h*scale,r.w*scale,r.h*scale);g.restore();
  }
  actor(classId,dir,moving,acting,age,walk,x,y,alpha=1){let name='hero-'+classId+'-motion-v4',layout=MOTION_LAYOUT[classId],rows=[2,1,0,1,2,3,4,3],row=rows[dir]+(acting?5:0);if(classId==='warrior'&&acting){if(dir===0||dir===4){name='hero-warrior-east-v4';layout=MOTION_LAYOUT.warriorEast;row=0;}else row=({1:6,2:5,3:6,5:7,6:8,7:7})[dir];}const im=image(asset(name));if(!layout||!im.complete||!im.naturalWidth){this.sprite(...directional('hero-'+classId,dir,acting),x,y,92,92,1,0,alpha);return;}const frame=acting?Math.min(7,Math.floor(age*9)):moving?Math.floor(walk*1.05)%8:0,r=layout.frames[row*8+frame],flip=([3,4,5].includes(dir)?-1:1)*(classId==='mage'&&((!acting&&[1,2].includes(row))||(acting&&row===7&&frame===4)||(acting&&row===6&&![3,5,6].includes(frame)))?-1:1),scale=(this.mobileActors.matches?140:104)/layout.bodyHeight,g=this.g;g.save();g.translate(x,y);g.scale(flip,1);g.globalAlpha=alpha;g.drawImage(cleanDirectionalAtlas(im,layout),r.x,r.y,r.w,r.h,-r.w*scale/2,-r.foot*scale,r.w*scale,r.h*scale);g.restore();}
  thirdSprite(col,frame,x,y,w,h,angle=0,alpha=.8){const im=image(asset('third-job-atlas'));if(!im.complete||!im.naturalWidth)return;const g=this.g,sw=im.width/5,sh=im.height/4;g.save();g.translate(x,y);g.rotate(angle);g.globalAlpha=alpha;g.drawImage(im,col*sw,frame*sh,sw,sh,-w/2,-h/2,w,h);g.restore();}
  strip(src,frame,x,y,w,h,angle=0,alpha=1,filter='none'){
    const im=image(src);if(!im.complete||!im.naturalWidth)return;
    const g=this.g,source=tintedAtlas(im,filter),sw=source.width/4;
    g.save();g.translate(x,y);g.rotate(angle);g.globalAlpha=clamp(alpha);
    g.drawImage(source,Math.max(0,Math.min(3,frame))*sw,0,sw,source.height,-w/2,-h/2,w,h);g.restore();
  }
  effect(kind,x,y,w,h=w,angle=0,alpha=1){
    const im=image(asset('effects'));if(!im.complete||!im.naturalWidth)return;
    const frame={slash:0,bolt:1,impact:2,rune:3}[kind]??0,g=this.g,sw=im.width/2,sh=im.height/2;
    g.save();g.translate(x,y);g.rotate(angle);g.globalAlpha=clamp(alpha);
    g.drawImage(im,frame%2*sw,Math.floor(frame/2)*sh,sw,sh,-w/2,-h/2,w,h);g.restore();
  }
  background(){
    const bg=image(motionAsset('arena-overhead-v3'));
    if(!this.backdrop&&bg.complete&&bg.naturalWidth){
      this.backdrop=document.createElement('canvas');this.backdrop.width=TOWER_SIZE.width;this.backdrop.height=TOWER_SIZE.height;
      const g=this.backdrop.getContext('2d');g.drawImage(bg,0,0,TOWER_SIZE.width,TOWER_SIZE.height);
      g.fillStyle='#1b100908';g.fillRect(0,0,TOWER_SIZE.width,TOWER_SIZE.height);
      const shade=g.createRadialGradient(1600,1600,900,1600,1600,2400);
      shade.addColorStop(0,'#160d0700');shade.addColorStop(1,'#120b0755');g.fillStyle=shade;g.fillRect(0,0,TOWER_SIZE.width,TOWER_SIZE.height);
    }
    if(this.backdrop)this.g.drawImage(this.backdrop,0,0);else{this.g.fillStyle='#101921';this.g.fillRect(0,0,TOWER_SIZE.width,TOWER_SIZE.height);}
  }
  hazard(h,time){
    const bossScale=this.mobileActors.matches?1.5:1;
    const g=this.g,active=time>=h.at,progress=clamp(1-(h.at-time)/12);
    g.save();g.lineWidth=active?7:4;g.strokeStyle=active?'#fff0b9':'#ff8575';
    g.fillStyle=active?'#ff753c99':'#ed3e4248';
    if(h.type==='line'){
      const angle=Math.atan2(h.ty-h.y,h.tx-h.x),len=Math.hypot(h.tx-h.x,h.ty-h.y);
      g.translate(h.x,h.y);g.rotate(angle);
      g.fillRect(0,-h.width/2,len,h.width);g.strokeRect(0,-h.width/2,len,h.width);
      g.fillStyle=active?'#ffe1a873':'#ffaf8052';g.fillRect(0,-h.width/2,len*progress,h.width);
      g.save();g.beginPath();g.rect(0,-h.width/2,len,h.width);g.clip();
      for(let x=h.width/2;x<len;x+=h.width*1.7)this.effect('rune',x,0,h.width,h.width,0,active?.85:.5);
      if(active)this.strip(motionAsset('attack-beam-v2'),Math.min(3,Math.floor((time-h.at)*1.4)),len/2,0,len,h.width*2.5*bossScale,0,.78);
      g.restore();
    }else{
      // Even-odd fill preserves the real safe centre of the ring attacks.
      const shape=()=>{g.beginPath();g.arc(h.x,h.y,h.r,0,Math.PI*2);if(h.inner){g.moveTo(h.x+h.inner,h.y);g.arc(h.x,h.y,h.inner,0,Math.PI*2,true);}};
      shape();g.fill('evenodd');g.stroke();
      g.save();shape();g.clip('evenodd');this.effect('rune',h.x,h.y,h.r*2,h.r*2,time*.014,active?.95:.48);
      if(active)this.strip(motionAsset('attack-burst-v2'),Math.min(3,Math.floor((time-h.at)*1.4)),h.x,h.y,h.r*2.1*bossScale,h.r*2.1*bossScale,0,.72);g.restore();
      g.beginPath();g.arc(h.x,h.y,h.r,-Math.PI/2,-Math.PI/2+Math.PI*2*progress);g.lineWidth=7;g.strokeStyle='#ffdbac';g.stroke();
      if(h.inner){g.beginPath();g.arc(h.x,h.y,h.inner,0,Math.PI*2);g.lineWidth=4;g.strokeStyle='#c5ffe5';g.stroke();}
    }
    g.restore();
  }
  shadow(x,y,width){width*=this.mobileActors.matches?1.5:1;const g=this.g;g.save();g.fillStyle='#0005';g.beginPath();g.ellipse(x,y,width,width*.23,0,0,Math.PI*2);g.fill();g.restore();}
  impact(n,now){
    const incoming=n.kind==='incoming',critical=n.kind==='critical',heal=n.kind==='heal';
    const colors=heal?['#a4ffbb','#5ee6cc']:incoming?['#ffdcc6','#ff694e']:critical?['#fff8cc','#ffbe4c']:['#ffffff','#ffdc89'];
    const count=heal?10:critical?42:incoming?28:24;
    for(let i=0;i<count;i++){
      const angle=Math.PI*2*i/count+(Math.random()-.5)*.4,speed=(critical?8:6)*(0.45+Math.random()*.9);
      this.particles.push({x:n.x,y:n.y+28,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-1,life:260+Math.random()*280,at:now,size:2+Math.random()*4,color:colors[i%2]});
    }
    this.particles=this.particles.slice(-180);
    this.shockwaves.push({x:n.x,y:n.y+28,at:now,color:colors[1],size:critical?240:incoming?175:155});
    this.shockwaves=this.shockwaves.slice(-12);
    if(!heal){this.shake=Math.max(this.shake,critical?18:incoming?13:8);this.flash=Math.max(this.flash,critical?.3:incoming?.22:.16);this.zoom=Math.max(this.zoom,critical?.014:.008);}
  }
  drawImpacts(now,dt){
    const g=this.g,step=Math.min(2,dt/16.7);
    this.particles=this.particles.filter(p=>now-p.at<p.life);
    for(const p of this.particles){
      p.x+=p.vx*step;p.y+=p.vy*step;p.vx*=.965;p.vy=p.vy*.965+.11*step;
      const fade=1-(now-p.at)/p.life;
      g.save();g.globalAlpha=fade;g.strokeStyle=p.color;g.lineWidth=p.size*fade;g.lineCap='round';
      g.beginPath();g.moveTo(p.x,p.y);g.lineTo(p.x-p.vx*2.5,p.y-p.vy*2.5);g.stroke();g.restore();
    }
    this.shockwaves=this.shockwaves.filter(r=>now-r.at<380);
    for(const r of this.shockwaves){
      const age=(now-r.at)/380;
      this.effect('impact',r.x,r.y-10,r.size*(.95+age),r.size*(.95+age),age*.3,(1-age)*.7);
      g.save();g.globalAlpha=(1-age)*.85;g.strokeStyle=r.color;g.lineWidth=(1-age)*9+1;
      g.beginPath();g.ellipse(r.x,r.y,24+r.size*age,8+r.size*.38*age,0,0,Math.PI*2);g.stroke();g.restore();
    }
  }
  draw(b,previous,player,fraction,now,input,hint){
    const g=this.g,f=towerEncounter(b),c=TOWER_CLASSES[b.classId],time=b.tick+fraction;
    const height=this.viewHeight||1200;g.setTransform(this.canvas.width/1000,0,0,this.canvas.height/height,0,0);
    const dt=this.last?Math.min(50,now-this.last):16;
    for(const n of b.numbers)if(!this.seenEvents.has(n.id)){this.seenEvents.add(n.id);this.impact(n,now);}
    if(this.seenEvents.size>300)this.seenEvents=new Set([...this.seenEvents].slice(-150));
    const scale=Math.min(.7,Math.max(.46,height/3000)),viewWidth=1000/scale,viewHeight=height/scale;
    const limit=(v,size,world)=>size>=world?(world-size)/2:clamp(v,0,world-size);
    const pairFocus=mix(player.y-65,b.enemy.y-80,.24);
    const verticalFocus=mix(pairFocus,player.y-35,clamp((height-1000)/950));
    const target={x:limit(mix(player.x,b.enemy.x,.12)-viewWidth/2,viewWidth,TOWER_SIZE.width),y:limit(verticalFocus-viewHeight/2,viewHeight,TOWER_SIZE.height)};
    if(!this.camera)this.camera=target;
    const follow=1-Math.exp(-Math.min(100,dt)/135);this.last=now;
    this.camera.x=mix(this.camera.x,target.x,follow);this.camera.y=mix(this.camera.y,target.y,follow);
    g.fillStyle='#08131c';g.fillRect(0,0,1000,height);
    this.shake*=Math.exp(-dt/90);this.flash*=Math.exp(-dt/85);this.zoom*=Math.exp(-dt/110);
    const jx=(Math.random()-.5)*this.shake,jy=(Math.random()-.5)*this.shake;
    g.save();g.translate(500+jx,height/2+jy);g.scale(scale*(1+this.zoom),scale*(1+this.zoom));
    g.translate(-this.camera.x-viewWidth/2,-this.camera.y-viewHeight/2);this.background();
    for(const hazard of b.hazards)this.hazard(hazard,time);
    const enemy={x:mix(previous.enemy.x,b.enemy.x,fraction),y:mix(previous.enemy.y,b.enemy.y,fraction)};
    const moving=Math.hypot(input[0],input[1])>.01,dashing=b.tick<(b.dashUntil||0)||hint.dash>now;
    const casting=b.tick<b.skillUntil||hint.skill>now,attacking=b.tick<b.attackUntil||hint.attack>now;
    const attackAge=clamp((time-(b.attackStart??(b.attackUntil-6)))/6),skillAge=clamp((time-(b.skillStart??(b.skillUntil-8)))/8);
    const moveDir=towerFacing(input[0],input[1],b.player.dir??6);
    const dir=casting?(b.player.skillDir??moveDir):attacking?(b.player.attackDir??towerFacing(enemy.x-player.x,enemy.y-player.y,moveDir)):moving?moveDir:(b.player.dir??6);
    const forward=facingVector(dir);
    const stride=moving?Math.sin(((b.player.walk||0)+fraction)*2.25):0;
    const bob=moving&&!dashing?Math.abs(stride)*5:Math.sin(now/600)*1.2;
    if(moving&&!dashing&&now-this.lastStep>120){this.lastStep=now;this.steps.push({x:player.x,y:player.y+3,at:now});}
    this.steps=this.steps.filter(step=>now-step.at<420).slice(-8);
    for(const step of this.steps){g.save();g.globalAlpha=(1-(now-step.at)/420)*.27;g.fillStyle='#ecce9b';g.beginPath();g.ellipse(step.x,step.y,12,5,0,0,Math.PI*2);g.fill();g.restore();}
    this.shadow(enemy.x,enemy.y-4,66);this.shadow(player.x,player.y,25);
    // A small, constant marker makes the player easy to track during effects.
    g.save();g.beginPath();g.ellipse(player.x,player.y,26,10,0,0,Math.PI*2);g.fillStyle='#78ffe81d';g.fill();g.lineWidth=2;g.strokeStyle='#a5ffdf99';g.stroke();g.restore();
    if((input[2]&1)&&Math.hypot(player.x-b.enemy.x,player.y-b.enemy.y)>c.range){
      g.save();g.beginPath();g.arc(player.x,player.y,c.range,0,Math.PI*2);g.strokeStyle='#fff1bc80';g.lineWidth=2;g.setLineDash([9,12]);g.stroke();g.restore();
    }
    if(dashing&&(!this.trail.length||now-this.trail.at(-1).at>28))this.trail.push({x:player.x,y:player.y,at:now,dir});
    this.trail=this.trail.filter(p=>now-p.at<180).slice(-6);
    for(const p of this.trail)this.sprite(...directional('hero-'+b.classId,p.dir),p.x,p.y,92,92,1,0,.23*(1-(now-p.at)/180));
    const drawPlayer=()=>{
      const lunge=attacking?Math.sin(attackAge*Math.PI)*(b.classId==='rogue'?20:14):0;
      const alpha=b.tick<b.invulnerableUntil?.7+.25*Math.sin(now/35):1;
      const x=player.x+forward.x*lunge,y=player.y+forward.y*lunge*.7+bob;
      this.actor(b.classId,dir,moving||dashing,attacking||casting,casting?skillAge:attackAge,(b.player.walk||0)+fraction,x,y,alpha);
      if(b.tick<b.guardUntil)this.effect('rune',player.x,player.y-20,110,80,-time*.04,.55);
    };
    const drawBoss=()=>{
      if(b.chest){const x=b.chest.x,y=b.chest.y,opening=b.chest.openAt!==undefined,frame=opening?Math.min(3,Math.floor((now-b.chest.openAt)/160)):0;this.shadow(x,y,62);const im=image(asset('reward-chest'));if(im.complete&&im.naturalWidth){const sw=im.width/4;g.save();g.shadowColor='#f9d47d';g.shadowBlur=12;g.drawImage(im,frame*sw,0,sw,im.height,x-110,y-170,220,190);g.restore();}g.save();g.fillStyle='#fff2c0';g.font='bold 22px sans-serif';g.textAlign='center';g.fillText(opening?'상자 여는 중…':'가까이서 공격해 열기',x,y-185);g.restore();return;}

      const windup=b.tick<b.enemyCastUntil,frame=windup?1:b.tick<b.enemyAttackUntil?2:0;
      const bossDir=windup?(b.enemy.castDir??b.enemy.dir??2):frame===2?(b.enemyAttackDir??b.enemy.dir??2):(b.enemy.dir??2),toward=facingVector(bossDir);
      const bossAge=clamp((time-(b.enemyAttackStart??(b.enemyAttackUntil-6)))/6),pulse=frame===2?Math.sin(bossAge*Math.PI):0;
      const step=Math.sin(((b.enemy.walk||0)+fraction)*1.3),angle=windup?Math.sin(time*.4)*.02:frame===2?Math.sin(bossAge*Math.PI)*.035:step*.012;
      const castPulse=windup?Math.sin(clamp((time-(b.enemyCastStart??(b.enemyCastUntil-10)))/10)*Math.PI):0;
      this.sprite(asset('boss-'+f.art),3,1,frame,enemy.x+toward.x*pulse*24,enemy.y+toward.y*pulse*15+Math.abs(step)*2,245,245,[3,4,5].includes(bossDir)?-1:1,angle,b.tick<(b.enemyHurtUntil||0)?.82:1);
      if(windup)this.effect('rune',enemy.x+toward.x*75,enemy.y-75+toward.y*32,75+castPulse*35,75+castPulse*35,time*.03,.35+castPulse*.28);
    };
    const actors=[{y:player.y,draw:drawPlayer},{y:enemy.y,draw:drawBoss},...(b.allies||[]).map(m=>({y:m.y,draw:()=>{
      const attacking=b.tick<(m.attackUntil||0),casting=b.tick<(m.skillUntil||0),dir=(casting?m.skillDir:attacking?m.attackDir:m.dir)??6,alpha=m.hp>0?1:.35;
      this.shadow(m.x,m.y,25);this.actor(m.classId,dir,m.moving,attacking||casting,clamp((time-(casting?m.skillStart:m.attackStart))/(casting?8:6)),(m.walk||0)+fraction,m.x,m.y,alpha);
      if(b.tick<(m.guardUntil||0))this.effect('rune',m.x,m.y-20,110,80,-time*.04,.55);
      g.save();g.font='bold 20px sans-serif';g.textAlign='center';g.fillStyle='#b9ffe0';g.fillText(m.name,m.x,m.y-150);g.fillStyle='#25312d';g.fillRect(m.x-40,m.y-139,80,6);g.fillStyle='#70dfa7';g.fillRect(m.x-40,m.y-139,80*Math.max(0,m.hp/m.power.hp),6);g.restore();
    }}))];actors.sort((a,b)=>a.y-b.y).forEach(a=>a.draw());
    for(const q of b.projectiles){
      if(b.tick<q.at)continue;
      const old=previous.projectiles.find(p=>p.id===q.id)||{x:q.x-q.dx,y:q.y-q.dy};
      const x=mix(old.x,q.x,fraction),y=mix(old.y,q.y,fraction),enemyShot=q.side==='enemy';
      const cls=q.classId||b.classId,src=enemyShot?motionAsset('attack-beam-v2'):motionAsset(cls==='pirate'?'attack-beam-v2':'attack-bolt-v2');
      const filter=enemyShot?'hue-rotate(330deg)':cls==='mage'?'hue-rotate(72deg)':cls==='archer'?'hue-rotate(-95deg)':'none';
      this.strip(src,Math.floor((time-q.at)*2)%4,x,y,enemyShot?125*(this.mobileActors.matches?1.5:1):cls==='pirate'?140:120,enemyShot?60*(this.mobileActors.matches?1.5:1):62,Math.atan2(q.dy,q.dx),.95,filter);
    }
    for(const e of b.effects){
      // Hostile impacts are already drawn once by their active hazard.
      if(e.hostile)continue;
      const age=clamp((time-e.start)/(e.end-e.start)),frame=Math.min(3,Math.floor(age*4));
      if(e.kind==='second'){const col={warrior:0,mage:1,archer:2,rogue:3,pirate:4}[e.classId]??0,im=image(asset('second-job-atlas'));if(im.complete&&im.naturalWidth){const sw=im.width/5,sh=im.height/4,owner=e.follow?(e.owner?(b.allies||[]).find(a=>a.id===e.owner)||player:player):e;g.save();g.globalAlpha=.75;g.drawImage(im,col*sw,frame*sh,sw,sh,owner.x-e.size/2,owner.y-e.size*.4,e.size,e.size*.8);g.restore();}continue;}
      if(e.kind==='third'){const col={warrior:0,mage:1,archer:2,rogue:3,pirate:4}[e.classId]??0;const size=Math.min(900,e.size);if(e.volley){const x=mix(e.fromX,e.x,Math.min(1,age*2)),y=mix(e.fromY,e.y,Math.min(1,age*2));this.thirdSprite(col,frame,x,y,280,220,Math.atan2(e.y-e.fromY,e.x-e.fromX),.85);}else this.thirdSprite(col,frame,e.x,e.y,size,size*.8,e.classId==='rogue'?e.angle:0,.65);continue;}
      if(e.kind==='rune'){this.effect('rune',e.x,e.y,e.size,e.size,-time*.04,1-age);continue;}
      const src=e.hostile?'attack-burst-v2':b.classId==='warrior'?(e.kind==='slash'?'attack-slash-v2':'attack-burst-v2'):b.classId==='mage'?'attack-burst-v2':b.classId==='archer'?'attack-bolt-v2':b.classId==='rogue'?'attack-slash-v2':'attack-beam-v2';
      const filter=e.hostile?'hue-rotate(330deg)':b.classId==='mage'?'hue-rotate(75deg)':b.classId==='archer'?'hue-rotate(-95deg)':b.classId==='rogue'?'hue-rotate(225deg)':'none';
      this.strip(motionAsset(src),frame,e.x,e.y,e.size*1.8,e.size*1.3,(e.angle||0)+(e.kind==='slash'?age*.45:0),1-age*.75,filter);
    }
    this.drawImpacts(now,dt);
    for(const n of b.numbers){
      const age=time-n.start,fade=clamp((n.end-time)/2),incoming=n.kind==='incoming';
      g.save();g.globalAlpha=fade;g.font=`900 ${Math.round((n.kind==='critical'?52:incoming?43:38)*(1+Math.max(0,1-age/3)*.25))}px system-ui`;g.textAlign='center';g.lineWidth=7;g.strokeStyle='#071017';
      g.fillStyle=incoming?'#ff9994':n.kind==='heal'?'#8cffbb':n.kind==='critical'?'#ffe092':'#fff';
      const value=(n.kind==='heal'?'+':incoming?'−':'')+format(n.value),y=n.y-age*8,x=n.x+((n.id%3)-1)*22;
      g.shadowColor=n.kind==='critical'?'#ffae34':incoming?'#f74c4c':'#ffffff';g.shadowBlur=12;
      g.strokeText(value,x,y);g.fillText(value,x,y);g.restore();
    }
    g.restore();
    if(this.flash>.01){g.save();g.fillStyle=`rgba(255,238,204,${this.flash*.38})`;g.fillRect(0,0,1000,height);g.restore();}
    if(b.hp/b.power.hp<.3){g.save();g.lineWidth=18;g.strokeStyle='#ee575a'+(Math.floor(80+Math.sin(now/250)*30).toString(16));g.strokeRect(0,0,1000,height);g.restore();}
  }
}

