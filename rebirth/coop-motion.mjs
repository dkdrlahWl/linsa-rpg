const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
// Reconcile against the displayed position at the snapshot's time, not the
// current predicted position. Otherwise every response rewinds local movement.
export class CoopMotion {
 constructor(){this.points=new Map();this.history=[];this.correction={x:0,y:0};this.lastAccept=0;this.interval=300;}
 accept(room,now,lag=0){
  if(this.lastAccept)this.interval=clamp(this.interval*.6+(now-this.lastAccept)*.4,100,1200);
  this.lastAccept=now;
  const me=room.members.find(m=>m.id===room.me),at=now-clamp(lag/2,0,1000);
  const sample=this.history.reduce((best,p)=>!best||Math.abs(p.at-at)<Math.abs(best.at-at)?p:best,null);
  if(sample){this.correction.x=clamp(me.x-sample.x,-350,350);this.correction.y=clamp(me.y-sample.y,-350,350);}
  for(const [id,p] of [['enemy',room.enemy],...room.members.map(m=>[m.id,m])]){
   const old=this.points.get(id);if(!old){this.points.set(id,{x:p.x,y:p.y,fromX:p.x,fromY:p.y,targetX:p.x,targetY:p.y,at:now});continue;}
   if(id===room.me)continue;
   Object.assign(old,{fromX:old.x,fromY:old.y,targetX:p.x,targetY:p.y,at:now});
  }
 }
 local(id,actor,input,dt,now,speed){
  const p=this.points.get(id)||{x:actor.x,y:actor.y};
  const connected=now-this.lastAccept<2000,seconds=Math.min(50,Math.max(0,dt))/1000;
  const limit=(Math.hypot(input[0],input[1])>.01?speed*.35:220)*seconds;
  const distance=Math.hypot(this.correction.x,this.correction.y),factor=distance?Math.min(1-Math.exp(-seconds/0.24),limit/distance):0;
  const dx=this.correction.x*factor,dy=this.correction.y*factor;
  p.x=clamp(p.x+(connected?input[0]*speed*seconds:0)+dx,120,3080);
  p.y=clamp(p.y+(connected?input[1]*speed*seconds:0)+dy,120,3080);
  this.correction.x-=dx;this.correction.y-=dy;this.points.set(id,p);
  this.history.push({at:now,x:p.x,y:p.y});while(this.history.length&&this.history[0].at<now-2500)this.history.shift();
  return {...actor,x:p.x,y:p.y};
 }
 remote(id,actor,now){
  const p=this.points.get(id);if(!p)return actor;
  const t=clamp((now-p.at)/this.interval,0,1.25);
  p.x=clamp(p.fromX+(p.targetX-p.fromX)*t,120,3080);p.y=clamp(p.fromY+(p.targetY-p.fromY)*t,120,3080);
  return {...actor,x:p.x,y:p.y};
 }
}
