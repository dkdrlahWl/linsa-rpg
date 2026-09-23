import {TOWER_FLOORS,TOWER_CLASSES,towerFacing,facingVector} from './tower-model.mjs?v=tower-motion-26';
const cache=new Map();
export const asset=name=>'tower/'+name+'.webp';
export function image(src){if(!cache.has(src)){const im=new Image();im.src=src;cache.set(src,im);}return cache.get(src);}
const mix=(a,b,t)=>a+(b-a)*t;
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const format=n=>Math.floor(n).toLocaleString('ko-KR');
// The current artwork is front-facing. These eight projections turn the stance,
// lunge, trail and effects together without rotating a standing character flat.
const views=[{flip:1,width:.86,lean:.09},{flip:1,width:.94,lean:.045},{flip:1,width:1,lean:0},{flip:-1,width:.94,lean:-.045},{flip:-1,width:.86,lean:-.09},{flip:-1,width:.82,lean:-.055},{flip:1,width:.80,lean:0},{flip:1,width:.82,lean:.055}];

export class TowerRenderer {
  constructor(canvas){
    this.canvas=canvas;this.g=canvas.getContext('2d',{alpha:false});this.trail=[];this.last=0;this.camera=null;
    this.resize=new ResizeObserver(entries=>{const r=entries[0].contentRect;if(r.width&&r.height){canvas.width=1000;canvas.height=Math.round(1000*r.height/r.width);}});this.resize.observe(canvas);
  }
  dispose(){this.resize.disconnect();}
  sprite(src,columns,rows,frame,x,y,w,h,flip=1,rotation=0,alpha=1,width=1,lean=0){
    const im=image(src);if(!im.complete||!im.naturalWidth)return;
    const g=this.g,sw=im.width/columns,sh=im.height/rows;
    g.save();g.translate(x,y);g.rotate(rotation);g.scale(flip*width,1);g.transform(1,0,lean,1,0,0);g.globalAlpha=alpha;
    g.drawImage(im,(frame%columns)*sw,Math.floor(frame/columns)*sh,sw,sh,-w/2,-h*.84,w,h);g.restore();
  }
  effect(kind,x,y,w,h=w,angle=0,alpha=1){
    const im=image(asset('effects'));if(!im.complete||!im.naturalWidth)return;
    const frame={slash:0,bolt:1,impact:2,rune:3}[kind]??0,g=this.g,sw=im.width/2,sh=im.height/2;
    g.save();g.translate(x,y);g.rotate(angle);g.globalAlpha=clamp(alpha);
    g.drawImage(im,frame%2*sw,Math.floor(frame/2)*sh,sw,sh,-w/2,-h/2,w,h);g.restore();
  }
  background(){
    const bg=image(asset('arena'));
    if(!this.backdrop&&bg.complete&&bg.naturalWidth){
      this.backdrop=document.createElement('canvas');this.backdrop.width=1000;this.backdrop.height=1200;
      const g=this.backdrop.getContext('2d');g.drawImage(bg,0,0,1000,1200);
      g.fillStyle='#07131b25';g.fillRect(0,0,1000,1200);
      const shade=g.createRadialGradient(500,600,260,500,600,800);
      shade.addColorStop(0,'#02080d00');shade.addColorStop(1,'#02080dad');g.fillStyle=shade;g.fillRect(0,0,1000,1200);
    }
    if(this.backdrop)this.g.drawImage(this.backdrop,0,0);else{this.g.fillStyle='#101921';this.g.fillRect(0,0,1000,1200);}
  }
  hazard(h,time){
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
      g.restore();
    }else{
      // Even-odd fill preserves the real safe centre of the ring attacks.
      const shape=()=>{g.beginPath();g.arc(h.x,h.y,h.r,0,Math.PI*2);if(h.inner){g.moveTo(h.x+h.inner,h.y);g.arc(h.x,h.y,h.inner,0,Math.PI*2,true);}};
      shape();g.fill('evenodd');g.stroke();
      g.save();shape();g.clip('evenodd');this.effect('rune',h.x,h.y,h.r*2,h.r*2,time*.014,active?.95:.48);g.restore();
      g.beginPath();g.arc(h.x,h.y,h.r,-Math.PI/2,-Math.PI/2+Math.PI*2*progress);g.lineWidth=7;g.strokeStyle='#ffdbac';g.stroke();
      if(h.inner){g.beginPath();g.arc(h.x,h.y,h.inner,0,Math.PI*2);g.lineWidth=4;g.strokeStyle='#c5ffe5';g.stroke();}
    }
    g.restore();
  }
  shadow(x,y,width){const g=this.g;g.save();g.fillStyle='#0005';g.beginPath();g.ellipse(x,y,width,width*.23,0,0,Math.PI*2);g.fill();g.restore();}
  draw(b,previous,player,fraction,now,input,hint){
    const g=this.g,f=TOWER_FLOORS[b.floor-1],c=TOWER_CLASSES[b.classId],time=b.tick+fraction;
    const scale=Math.min(1,this.canvas.height/780),viewWidth=1000/scale,viewHeight=this.canvas.height/scale;
    const limit=(v,size,world)=>size>=world?(world-size)/2:clamp(v,0,world-size);
    const target={x:limit(player.x-viewWidth/2,viewWidth,1000),y:limit(mix(player.y-130,b.enemy.y-150,.3)-viewHeight/2,viewHeight,1200)};
    if(!this.camera)this.camera=target;
    const follow=1-Math.exp(-Math.min(100,now-this.last)/95);this.last=now;
    this.camera.x=mix(this.camera.x,target.x,follow);this.camera.y=mix(this.camera.y,target.y,follow);
    g.fillStyle='#08131c';g.fillRect(0,0,this.canvas.width,this.canvas.height);
    g.save();g.scale(scale,scale);g.translate(-this.camera.x,-this.camera.y);this.background();
    for(const hazard of b.hazards)this.hazard(hazard,time);
    const enemy={x:mix(previous.enemy.x,b.enemy.x,fraction),y:mix(previous.enemy.y,b.enemy.y,fraction)};
    const moving=Math.hypot(input[0],input[1])>.01,dashing=b.tick<(b.dashUntil||0)||hint.dash>now;
    const casting=b.tick<b.skillUntil||hint.skill>now,attacking=b.tick<b.attackUntil||hint.attack>now;
    const attackAge=clamp((time-(b.attackStart??(b.attackUntil-6)))/6),skillAge=clamp((time-(b.skillStart??(b.skillUntil-8)))/8);
    const moveDir=towerFacing(input[0],input[1],b.player.dir??6);
    const dir=attacking?(b.player.attackDir??towerFacing(enemy.x-player.x,enemy.y-player.y,moveDir)):casting?(b.player.skillDir??moveDir):moving?moveDir:(b.player.dir??6);
    const view=views[dir],forward=facingVector(dir);
    const pose=casting?3:attacking?2:moving||dashing?1:0;
    const stride=moving?Math.sin(((b.player.walk||0)+fraction)*2.25):0;
    const bob=moving&&!dashing?Math.abs(stride)*5:Math.sin(now/600)*1.2;
    this.shadow(enemy.x,enemy.y-4,100);this.shadow(player.x,player.y,58);
    // A small, constant marker makes the player easy to track during effects.
    g.save();g.beginPath();g.ellipse(player.x,player.y,43,19,0,0,Math.PI*2);g.fillStyle='#78ffe823';g.fill();g.lineWidth=3;g.strokeStyle='#a5ffdf';g.stroke();g.restore();
    if((input[2]&1)&&Math.hypot(player.x-b.enemy.x,player.y-b.enemy.y)>c.range){
      g.save();g.beginPath();g.arc(player.x,player.y,c.range,0,Math.PI*2);g.strokeStyle='#fff1bc80';g.lineWidth=2;g.setLineDash([9,12]);g.stroke();g.restore();
    }
    if(dashing&&(!this.trail.length||now-this.trail.at(-1).at>28))this.trail.push({x:player.x,y:player.y,at:now,dir});
    this.trail=this.trail.filter(p=>now-p.at<180).slice(-6);
    for(const p of this.trail){const v=views[p.dir];this.sprite(asset('hero-'+b.classId),2,2,1,p.x,p.y,220,220,v.flip,0,.23*(1-(now-p.at)/180),v.width,v.lean);}
    const drawPlayer=()=>{
      const swing=attacking?Math.sin(attackAge*Math.PI)*.12*view.flip:casting?Math.sin(skillAge*Math.PI)*.055*view.flip:stride*.032;
      const lunge=attacking?Math.sin(attackAge*Math.PI)*16:0;
      const alpha=b.tick<b.invulnerableUntil?.7+.25*Math.sin(now/35):1;
      this.sprite(asset('hero-'+b.classId),2,2,pose,player.x+forward.x*lunge,player.y+forward.y*lunge*.7+bob,220,220,view.flip,swing,alpha,view.width,view.lean+stride*.018);
      if(b.tick<b.guardUntil)this.effect('rune',player.x,player.y-30,210,150,-time*.04,.55);
    };
    const drawBoss=()=>{
      const windup=b.tick<b.enemyCastUntil,frame=windup?1:b.tick<b.enemyAttackUntil?2:0;
      const bossDir=windup?(b.enemy.castDir??b.enemy.dir??2):frame===2?(b.enemyAttackDir??b.enemy.dir??2):(b.enemy.dir??2),v=views[bossDir],toward=facingVector(bossDir);
      const bossAge=clamp((time-(b.enemyAttackStart??(b.enemyAttackUntil-6)))/6),pulse=frame===2?Math.sin(bossAge*Math.PI):0;
      const step=Math.sin(((b.enemy.walk||0)+fraction)*1.3),angle=windup?Math.sin(time*.4)*.035:frame===2?Math.sin(bossAge*Math.PI)*.055*v.flip:step*.014;
      const castPulse=windup?Math.sin(clamp((time-(b.enemyCastStart??(b.enemyCastUntil-10)))/10)*Math.PI):0;
      this.sprite(asset('boss-'+f.art),3,1,frame,enemy.x+toward.x*pulse*24,enemy.y+toward.y*pulse*15+Math.abs(step)*2,345,345,v.flip,angle,b.tick<(b.enemyHurtUntil||0)?.82:1,v.width,v.lean+step*.012);
      if(windup)this.effect('rune',enemy.x+toward.x*100,enemy.y-105+toward.y*42,105+castPulse*50,105+castPulse*50,time*.03,.35+castPulse*.28);
    };
    if(player.y<enemy.y){drawPlayer();drawBoss();}else{drawBoss();drawPlayer();}
    for(const q of b.projectiles){
      if(b.tick<q.at)continue;
      const old=previous.projectiles.find(p=>p.id===q.id)||{x:q.x-q.dx,y:q.y-q.dy};
      const x=mix(old.x,q.x,fraction),y=mix(old.y,q.y,fraction),enemyShot=q.side==='enemy';
      g.save();if(enemyShot){g.shadowColor='#ff594e';g.shadowBlur=16;g.filter='sepia(1) saturate(5) hue-rotate(320deg)';}
      this.effect('bolt',x,y,enemyShot?100:90,55,Math.atan2(q.dy,q.dx));g.restore();
    }
    for(const e of b.effects){const age=clamp((time-e.start)/(e.end-e.start));g.save();if(e.hostile)g.filter='sepia(1) saturate(5) hue-rotate(315deg)';this.effect(e.kind,e.x,e.y,e.size*(.7+Math.sin(age*Math.PI/2)*.55),undefined,(e.angle||0)+(e.kind==='slash'?age*.38:0),1-age*.9);g.restore();}
    for(const n of b.numbers){
      const age=time-n.start,fade=clamp((n.end-time)/2),incoming=n.kind==='incoming';
      g.save();g.globalAlpha=fade;g.font=`800 ${n.kind==='critical'?48:incoming?42:36}px system-ui`;g.textAlign='center';g.lineWidth=6;g.strokeStyle='#071017';
      g.fillStyle=incoming?'#ff9994':n.kind==='heal'?'#8cffbb':n.kind==='critical'?'#ffe092':'#fff';
      const value=(n.kind==='heal'?'+':incoming?'−':'')+format(n.value),y=n.y-age*6,x=n.x+((n.id%3)-1)*22;
      g.strokeText(value,x,y);g.fillText(value,x,y);g.restore();
    }
    g.restore();
    if(b.hp/b.power.hp<.3){g.save();g.lineWidth=18;g.strokeStyle='#ee575a'+(Math.floor(80+Math.sin(now/250)*30).toString(16));g.strokeRect(0,0,this.canvas.width,this.canvas.height);g.restore();}
  }
}
