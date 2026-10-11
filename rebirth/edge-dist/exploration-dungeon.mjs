// Deterministic tile geometry shared by the server and prediction worker.
export const DUNGEON_VERSION='citadel-path-216';
export const dungeonFloorTile=tile=>tile==='1'||tile==='2'||tile==='3';
const SIZE=32,CELL=100;
const directions=[[-1,0],[1,0],[0,-1],[0,1]];
export const dungeonTile=(d,x,y)=>d?.tiles[Math.floor(y/(d.cell||CELL))]?.[Math.floor(x/(d.cell||CELL))]||'0';
export const dungeonSeen=(d,x,y)=>!d||d.citadel||d.seen?.[Math.floor(y/CELL)]?.[Math.floor(x/CELL)]==='1';
const arenaFloors=[
 [[.30,.17],[.63,.17],[.77,.22],[.84,.35],[.86,.55],[.76,.68],[.72,.83],[.55,.90],[.35,.82],[.22,.72],[.18,.56],[.20,.35]],
 [[.40,.13],[.62,.13],[.76,.20],[.83,.33],[.85,.52],[.83,.67],[.70,.80],[.56,.85],[.38,.81],[.22,.71],[.16,.52],[.19,.34],[.28,.22]],
 [[.41,.17],[.65,.18],[.80,.29],[.85,.46],[.81,.65],[.69,.79],[.53,.87],[.35,.79],[.22,.67],[.16,.48],[.22,.31]]
];
function insidePolygon(points,x,y){let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const [a,b]=points[i],[c,d]=points[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)inside=!inside;}return inside;}
export function makeExplorationArena(tier,floor,seed=1){
 const width=tier===0?2800:1400,bounds={x:(3200-width)/2,y:(3200-width)/2,width,height:width},polygon=arenaFloors[tier]||arenaFloors[0];
 const onFloor=(x,y)=>insidePolygon(polygon,(x-bounds.x)/width,(y-bounds.y)/width);
 const tiles=Array.from({length:SIZE},(_,y)=>Array.from({length:SIZE},(_,x)=>onFloor((x+.5)*CELL,(y+.5)*CELL)?'2':'0').join(''));
 const zone=(id,left,top,right,bottom)=>({id,x:Math.floor((bounds.x+left*width)/CELL)-1,y:Math.floor((bounds.y+top*width)/CELL)-1,w:Math.ceil((right-left)*width/CELL)+2,h:Math.ceil((bottom-top)*width/CELL)+2,spawnBounds:{left:bounds.x+left*width,top:bounds.y+top*width,right:bounds.x+right*width,bottom:bounds.y+bottom*width}});
 const rooms=[zone(3,.36,.65,.64,.79),zone(4,.22,.30,.42,.58),zone(1,.60,.30,.78,.58),zone(2,.42,.20,.60,.40)];
 return {id:'exploration-terrain-202:'+tier+':'+floor+':'+seed,arena:true,arenaBounds:bounds,arenaPolygon:polygon,size:SIZE,cell:CELL,tiles,rooms,start:{x:1600,y:bounds.y+.70*width},exit:{x:1600,y:bounds.y+.43*width},seen:Array.from({length:SIZE},()=> '1'.repeat(SIZE))};
}
export function makeExplorationDungeon(tier,floor,seed=1){
 let n=(seed^Math.imul(floor,2654435761)^Math.imul(tier+1,1597334677))>>>0;
 const random=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
 const grid=Array.from({length:SIZE},()=>Array(SIZE).fill('0'));
 const slots=[[2,3],[13,2],[23,3],[3,22],[13,14],[23,23]];
 const rooms=slots.map(([x,y],i)=>({x,y,w:6+(random()>.5?1:0),h:6+(random()>.5?1:0),id:i}));
 for(const r of rooms)for(let y=r.y;y<r.y+r.h;y++)for(let x=r.x;x<r.x+r.w;x++)grid[y][x]='2';
 const centers=rooms.map(r=>[r.x+Math.floor(r.w/2),r.y+Math.floor(r.h/2)]);
 const carve=(x,y)=>{for(let a=0;a<2;a++)for(let b=0;b<2;b++)if(grid[y+b]?.[x+a]==='0')grid[y+b][x+a]='1';};
 const corridor=(a,b)=>{let [x,y]=centers[a];const [tx,ty]=centers[b],horizontal=random()>.5;
  const across=()=>{while(x!==tx){carve(x,y);x+=Math.sign(tx-x);}carve(x,y);};
  const down=()=>{while(y!==ty){carve(x,y);y+=Math.sign(ty-y);}carve(x,y);};
  if(horizontal){across();down();}else{down();across();}
 };
 // Every room is connected; branches and a loop give each floor a route to explore.
 for(const [a,b] of [[3,4],[4,1],[1,0],[1,2],[4,5],[3,0]])corridor(a,b);
 if(floor%2===0)corridor(2,5);
 const turns=(floor+tier)%4;
 const turnPoint=([x,y])=>{for(let i=0;i<turns;i++)[x,y]=[SIZE-1-y,x];return [x,y];};
 let rotated=grid;for(let i=0;i<turns;i++)rotated=Array.from({length:SIZE},(_,y)=>Array.from({length:SIZE},(_,x)=>rotated[SIZE-1-x][y]));
 const point=i=>{const [x,y]=turnPoint(centers[i]);return {x:(x+.5)*CELL,y:(y+.5)*CELL};};
 const transformedRooms=rooms.map(r=>{const corners=[[r.x,r.y],[r.x+r.w-1,r.y+r.h-1]].map(turnPoint);return {id:r.id,x:Math.min(...corners.map(p=>p[0])),y:Math.min(...corners.map(p=>p[1])),w:turns%2?r.h:r.w,h:turns%2?r.w:r.h};});
 return {id:DUNGEON_VERSION+':'+tier+':'+floor+':'+(seed>>>0),size:SIZE,cell:CELL,tiles:rotated.map(row=>row.join('')),rooms:transformedRooms,start:point(3),exit:point(2),seen:Array(SIZE).fill('0'.repeat(SIZE))};
}
export function dungeonWalkable(d,x,y,radius=30){
 if(!d)return x>=120&&x<=3080&&y>=120&&y<=3080;
 if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(radius)||radius<0)return false;
 if(d.arenaPolygon){const r=d.arenaBounds;return [[-radius,-radius],[radius,-radius],[-radius,radius],[radius,radius]].every(([a,b])=>insidePolygon(d.arenaPolygon,(x+a-r.x)/r.width,(y+b-r.y)/r.height));}
 const cell=d.cell||CELL;
 // Every tile touched by the character body must be floor, including its edges.
 for(let yy=Math.floor((y-radius)/cell);yy<=Math.floor((y+radius)/cell);yy++)for(let xx=Math.floor((x-radius)/cell);xx<=Math.floor((x+radius)/cell);xx++)if(!dungeonFloorTile(d.tiles[yy]?.[xx]))return false;
 return true;
}
export function dungeonMove(d,actor,dx,dy,radius=30){
 const steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/25));
 for(let i=0;i<steps;i++){const x=actor.x+dx/steps,y=actor.y+dy/steps;
  if(dungeonWalkable(d,x,actor.y,radius))actor.x=x;
  if(dungeonWalkable(d,actor.x,y,radius))actor.y=y;
 }
 return actor;
}
export function dungeonSight(d,a,b){
 if(!d)return true;
 const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/35));
 for(let i=0;i<=steps;i++)if(['0','3'].includes(dungeonTile(d,a.x+(b.x-a.x)*i/steps,a.y+(b.y-a.y)*i/steps)))return false;
 return true;
}
const paths=new Map();
export function dungeonRoute(d,from,target){
 if(!d||dungeonSight(d,from,target))return target;
 const SIZE=d.size||32,CELL=d.cell||100;
 const tx=Math.floor(target.x/CELL),ty=Math.floor(target.y/CELL),key=d.id+':'+tx+':'+ty;
 let costs=paths.get(key);
 if(!costs){
  costs=new Int16Array(SIZE*SIZE).fill(-1);const queue=new Int16Array(SIZE*SIZE);let head=0,tail=0;
  if(dungeonTile(d,target.x,target.y)==='0')return from;
  queue[tail++]=ty*SIZE+tx;costs[ty*SIZE+tx]=0;
  while(head<tail){const at=queue[head++],x=at%SIZE,y=Math.floor(at/SIZE);for(const [dx,dy] of directions){const nx=x+dx,ny=y+dy,index=ny*SIZE+nx;if(nx>=0&&nx<SIZE&&ny>=0&&ny<SIZE&&d.tiles[ny][nx]!=='0'&&costs[index]<0){costs[index]=costs[at]+1;queue[tail++]=index;}}}
  if(paths.size>=128)paths.delete(paths.keys().next().value);paths.set(key,costs);
 }
 const x=Math.floor(from.x/CELL),y=Math.floor(from.y/CELL);let best=costs[y*SIZE+x],point=from;
 for(const [dx,dy] of directions){const nx=x+dx,ny=y+dy,index=ny*SIZE+nx;if(nx>=0&&nx<SIZE&&ny>=0&&ny<SIZE&&costs[index]>=0&&(best<0||costs[index]<best)){best=costs[index];point={x:(nx+.5)*CELL,y:(ny+.5)*CELL};}}
 return point;
}
export function revealDungeon(w){
 const d=w.dungeon;if(!d||d.arena||d.citadel)return;
 const SIZE=d.size||32,CELL=d.cell||100;
 const seen=d.seen.map(row=>row.split(''));
 for(const m of w.members){if(m.left||m.hp<=0)continue;const x=Math.floor(m.x/CELL),y=Math.floor(m.y/CELL);
  for(let yy=Math.max(0,y-6);yy<=Math.min(SIZE-1,y+6);yy++)for(let xx=Math.max(0,x-6);xx<=Math.min(SIZE-1,x+6);xx++){
   if((xx-x)**2+(yy-y)**2>36)continue;
   // Exploration is monotonic: previously revealed cells need no ray cast.
   if(seen[yy][xx]!=='1'&&dungeonSight(d,m,{x:(xx+.5)*CELL,y:(yy+.5)*CELL}))seen[yy][xx]='1';
   // Reveal the wall outline directly beside a visible floor tile.
   if(seen[yy][xx]==='1'&&d.tiles[yy][xx]!=='0')for(const [dx,dy] of directions)if(d.tiles[yy+dy]?.[xx+dx]==='0')seen[yy+dy][xx+dx]='1';
  }
 }
 d.seen=seen.map(row=>row.join(''));
}
