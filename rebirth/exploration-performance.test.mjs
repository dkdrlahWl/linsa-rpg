import assert from 'node:assert/strict';
import {makeExplorationDungeon,revealDungeon,dungeonWalkable,dungeonSight} from './exploration-dungeon.mjs';
import {startCoop,advanceCoop,coopClientView} from './coop-model.mjs';
import {drawExplorationMinimap,drawExplorationFog} from './exploration-renderer.mjs';
const SIZE=32,CELL=100,directions=[[-1,0],[1,0],[0,-1],[0,1]];
const legacy={revealDungeon:function(w){
 const d=w.dungeon;if(!d)return;
 const seen=d.seen.map(row=>row.split(''));
 for(const m of w.members){if(m.left||m.hp<=0)continue;const x=Math.floor(m.x/CELL),y=Math.floor(m.y/CELL);
  for(let yy=Math.max(0,y-6);yy<=Math.min(SIZE-1,y+6);yy++)for(let xx=Math.max(0,x-6);xx<=Math.min(SIZE-1,x+6);xx++){
   if(Math.hypot(xx-x,yy-y)>6)continue;
   const p={x:(xx+.5)*CELL,y:(yy+.5)*CELL};if(dungeonSight(d,m,p))seen[yy][xx]='1';
   // Reveal the wall outline directly beside a visible floor tile.
   if(seen[yy][xx]==='1'&&d.tiles[yy][xx]!=='0')for(const [dx,dy] of directions)if(d.tiles[yy+dy]?.[xx+dx]==='0')seen[yy+dy][xx+dx]='1';
  }
 }
 d.seen=seen.map(row=>row.join(''));
}
};
// Compare complete visibility masks along four independent routes, including walls.
let oldMs=0,newMs=0;
for(let tier=0;tier<3;tier++)for(let floor=1;floor<=12;floor++){
 const d=makeExplorationDungeon(tier,floor,712+floor),members=d.rooms.slice(0,4).map(r=>({x:(r.x+2.5)*100,y:(r.y+2.5)*100,hp:100}));
 const old={dungeon:structuredClone(d),members:structuredClone(members)},next=structuredClone(old);
 for(let i=0;i<100;i++){
  for(let j=0;j<4;j++){const m=old.members[j],x=m.x+Math.sin(i+j)*20,y=m.y+Math.cos(i+j)*20;if(dungeonWalkable(d,x,y)){m.x=x;m.y=y;}Object.assign(next.members[j],m);}
  let t=performance.now();legacy.revealDungeon(old);oldMs+=performance.now()-t;t=performance.now();revealDungeon(next);newMs+=performance.now()-t;
  assert.deepEqual(next.dungeon.seen,old.dungeon.seen);
 }
}
// Canvas cache correctness: unchanged visibility reuses terrain; movement dots remain live.
let canvases=0,fills=0,images=0;
const context=()=>new Proxy({}, {get:(o,k)=>o[k]??(()=>{if(k==='fillRect')fills++;if(k==='drawImage')images++;}),set:(o,k,v)=>(o[k]=v,true)});
globalThis.document={createElement:()=>{canvases++;return {getContext:context};}};
globalThis.Path2D=class{rect(){}};
const g=context(),d=makeExplorationDungeon(0,1,11),b={dungeon:d,tier:0,floor:1,exit:d.exit},renderer={};revealDungeon({dungeon:d,members:[{...d.start,hp:100}]});
drawExplorationMinimap(g,b,d.start);const initial=fills;for(let i=0;i<60;i++)drawExplorationMinimap(g,b,{x:d.start.x+i,y:d.start.y});assert.equal(canvases,1);assert.equal(fills-initial,60,'only background drawn each subsequent frame');
drawExplorationFog(g,b,null,1000,1000,renderer);assert.equal(renderer.dungeonFog.canvas.width,800);const c=canvases;drawExplorationFog(g,b,null,1000,1000,renderer);assert.equal(canvases,c);
d.seen[0]='1'+d.seen[0].slice(1);drawExplorationMinimap(g,b,d.start);assert.equal(canvases,c+1);
// Four participants, repeated delayed/duplicated/reordered input for every theme.
let packets=0,peakBytes=0;const began=performance.now();
for(let round=0;round<6;round++){
 let server=startCoop({id:'soak-'+round,owner:'p0',mode:'exploration',tier:round%3,status:'waiting',members:['warrior','mage','archer','priest'].map((classId,i)=>({id:'p'+i,classId,name:'테스트'+i,advanced:true,power:{attack:1,hp:1e9,defense:1e9,boss:1,crit:.3,critDamage:1.6,cadence:1,firstJob:true,advancement:4,level:200}}))},0);
 server.entryWaiting=false;server.members.forEach(m=>m.entryMoved=true);let prior=0;
 for(let tick=6;tick<=1800;tick+=6){
  const frames=[];for(let i=0;i<4;i++){const delay=[2,5,8,11][i];for(let t=Math.max(0,tick-delay-12);t<tick-delay;t++)frames.push({user:'p'+i,tick:t,input:[t%60<30?.2:-.2,i%2?.1:0,1|(t%60===0?122:0)]});}
  server=advanceCoop({...server,_queuedInputs:[...frames.reverse(),...frames.slice(0,4)]},'p0',{frames:[]},tick*100);packets+=4;
  assert.ok(server.tick>prior,'clock must progress with delayed inputs');prior=server.tick;assert.ok(server._net.points.length<=6);assert.ok(server._net.frames.length<=4*46);
  const view=coopClientView({...server,me:'p0'},2);assert.equal(view._net,undefined);assert.equal(view._queuedInputs,undefined);peakBytes=Math.max(peakBytes,JSON.stringify(view).length);
  if(server.status!=='fighting')break;
 }
 assert.equal(server.tick,1800);assert.ok(['fighting','lost'].includes(server.status));
}
console.log('PASS 4 players × 6 exploration runs, 18 simulated minutes, 0.2–1.1s delayed/duplicate/reordered input', {packets,peakBytes,seconds:((performance.now()-began)/1000).toFixed(2),visibilityBeforeMs:oldMs.toFixed(1),visibilityAfterMs:newMs.toFixed(1)});
