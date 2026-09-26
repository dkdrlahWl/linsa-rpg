const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
// Only positions are copied between simulation steps; inventory, effects and
// combat state remain owned by the prediction world.
export function motionSnapshot(room){
 const point=a=>({id:a.id,x:a.x,y:a.y});
 return {enemy:point(room.enemy),members:room.members.map(point),monsters:(room.monsters||[]).map(point)};
}
export function interpolateActor(actor,previous,fraction){
 if(!previous)return actor;
 const f=clamp(fraction,0,1);
 return {...actor,x:previous.x+(actor.x-previous.x)*f,y:previous.y+(actor.y-previous.y)*f};
}
// Preserve the last rendered position when authoritative replay changes the
// world. Decay only the correction, so fresh movement/dashes remain responsive.
export class CoopMotion {
 constructor(){this.points=new Map();this.generation=0;this.last=0;}
 reconcile(){this.generation++;}
 begin(now){this.seconds=this.last?clamp((now-this.last)/1000,0,.05):0;this.last=now;this.active=new Set();}
 sample(id,actor,local=false){
  this.active.add(id);let p=this.points.get(id);
  if(!p){p={x:actor.x,y:actor.y,dx:0,dy:0,generation:this.generation};this.points.set(id,p);}
  if(p.generation!==this.generation){
   p.dx=p.x-actor.x;p.dy=p.y-actor.y;p.generation=this.generation;
  }else{
   const distance=Math.hypot(p.dx,p.dy),limit=(local?300:500)*this.seconds;
   const factor=distance?Math.min(1-Math.exp(-this.seconds/.18),limit/distance):0;
   p.dx*=1-factor;p.dy*=1-factor;
  }
  p.x=clamp(actor.x+p.dx,120,3080);p.y=clamp(actor.y+p.dy,120,3080);
  return {...actor,x:p.x,y:p.y};
 }
 end(){for(const id of this.points.keys())if(!this.active.has(id))this.points.delete(id);}
}
