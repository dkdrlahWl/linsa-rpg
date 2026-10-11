// Shared deterministic region geometry. Rendering and movement consume the same tiles.
export function buildCitadelRegion(stage,floor,seed,version){
 let state=(seed^Math.imul(floor,2654435761))>>>0;
 const random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
 const size=64,cell=100,grid=Array.from({length:size},()=>Array(size).fill('0')),rooms=[];
 const natural=stage.biome<2,forest=stage.biome===0;
 const ellipse=(cx,cy,rx,ry,type='2')=>{for(let y=Math.max(2,Math.floor(cy-ry));y<=Math.min(size-3,Math.ceil(cy+ry));y++)for(let x=Math.max(2,Math.floor(cx-rx));x<=Math.min(size-3,Math.ceil(cx+rx));x++)if(((x-cx)/rx)**2+((y-cy)/ry)**2<=1)grid[y][x]=type;};
 const room=(cx,cy,rx,ry,id)=>{const r={id,x:cx-rx,y:cy-ry,w:rx*2+1,h:ry*2+1};rooms.push(r);
  if(natural||stage.boss)ellipse(cx,cy,rx,ry);
  else for(let y=cy-ry;y<=cy+ry;y++)for(let x=cx-rx;x<=cx+rx;x++)if(!(Math.abs(x-cx)===rx&&Math.abs(y-cy)===ry))grid[y][x]='2';
  return r;
 };
 const center=r=>({x:r.x+(r.w-1)/2,y:r.y+(r.h-1)/2});
 const join=(a,b,bend=0)=>{a=center(a);b=center(b);const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),steps=Math.ceil(len*3),width=forest?2.5:stage.biome===1?2.1:1.8;
  for(let i=0;i<=steps;i++){const t=i/steps,s=Math.sin(t*Math.PI)*bend;ellipse(a.x+dx*t-dy/len*s,a.y+dy*t+dx/len*s,width,width,'1');}
 };
 if(stage.boss){const start=room(31,51,5,4,3),arena=room(31,28,14,13,0);join(start,arena);}
 else{
  const anchors=[[10,53],[15,39],[10,22],[23,11],[36,23],[28,39],[43,52],[53,36],[52,12]];
  for(let i=0;i<anchors.length;i++){const [ax,ay]=anchors[i],cx=ax+Math.floor(random()*5)-2,cy=ay+Math.floor(random()*5)-2,rx=4+Math.floor(random()*3),ry=4+Math.floor(random()*3);room(cx,cy,rx,ry,i===0?3:i===anchors.length-1?0:i+4);}
  for(let i=1;i<rooms.length;i++)join(rooms[i-1],rooms[i],natural?(random()-.5)*6:0);
  join(rooms[1],rooms[5],natural?-3:0);join(rooms[4],rooms[8],natural?3:0);
  // Small lateral pockets create landmarks and encounters without a square room grid.
  if(natural)for(const r of rooms){const c=center(r);for(let i=0;i<3;i++){const a=random()*Math.PI*2;ellipse(c.x+Math.cos(a)*3,c.y+Math.sin(a)*3,2.5+random()*2,2.5+random()*2);}}
 }
 const point=r=>{const c=center(r);return {x:(c.x+.5)*cell,y:(c.y+.5)*cell};};
 return {id:version+':'+floor+':'+(seed>>>0),size,cell,tiles:grid.map(r=>r.join('')),rooms,start:point(rooms.find(r=>r.id===3)),exit:point(rooms.find(r=>r.id===0)),seen:Array(size).fill('0'.repeat(size)),citadel:true,shadowWalls:[],biome:stage.biome,bossArena:!!stage.boss};
}
