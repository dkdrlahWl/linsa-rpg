import assert from 'node:assert/strict';
import {ROD_TIPS,fishingSceneMotion} from './fishing-motion.mjs';
for(const [width,height] of [[302,220],[374,310],[930,450]]){
 const size=width*(width<700?.46:.31),angler={left:width*.02,top:height-44-size,size};
 for(const [phase,pose] of [['casting',1],['casting',2],['waiting',0],['bite',3],['hooking',3],['reeling',4],['caught',5]]){
  for(let time=0;time<2000;time+=50){
   const m=fishingSceneMotion({width,height,angler,phase,pose,elapsed:time,time});
   for(const p of [m.tip,m.end,m.control])assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));
   assert.ok(m.tip.x>=0&&m.tip.x<=width&&m.tip.y>=0&&m.tip.y<=height,'rod tip stays inside scene');
   assert.ok(m.end.x>=8&&m.end.x<=width-8&&m.end.y>=8&&m.end.y<=height-8,'float stays inside scene');
   assert.equal(m.visible,phase!=='caught');
   assert.ok(m.control.y>=(m.tip.y+m.end.y)/2,'slack sags downward rather than forming an upward arch');
  }
 }
 const waiting=fishingSceneMotion({width,height,angler,phase:'waiting',pose:0,reduced:true});
 assert.equal(waiting.tip.x,angler.left+ROD_TIPS[0][0]*size);
 assert.ok(Math.abs(waiting.tip.y-(angler.top+ROD_TIPS[0][1]*size))<1e-9);
 const landing=fishingSceneMotion({width,height,angler,phase:'casting',pose:2,elapsed:900,reduced:true});
 assert.ok(Math.abs(landing.end.x-width*.64)<1e-9);
 assert.ok(Math.abs(landing.end.y-height*.67)<1e-9);
 assert.equal(fishingSceneMotion({width,height,angler,phase:'missed'}).visible,false);
}
console.log('PASS rod anchors, casting landing, sag, clipping bounds at phone and desktop sizes');
