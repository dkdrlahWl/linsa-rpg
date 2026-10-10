// Deterministic tile geometry shared by the server and prediction worker.
export const DUNGEON_VERSION='exploration-dungeon-192';
const SIZE=32,CELL=100;
const directions=[[-1,0],[1,0],[0,-1],[0,1]];
export const dungeonTile=(d,x,y)=>d?.tiles[Math.floor(y/CELL)]?.[Math.floor(x/CELL)]||'0';
export const dungeonSeen=(d,x,y)=>!d||d.seen?.[Math.floor(y/CELL)]?.[Math.floor(x/CELL)]==='1';
export function makeExplorationArena(tier,floor,seed=1){
 const tiles=Array.from({length:SIZE},(_,y)=>Array.from({length:SIZE},(_,x)=>x>=9&&x<23&&y>=9&&y<23?'2':'0').join(''));
 // Virtual spawn zones share one continuous floor, without interior walls.
 const rooms=[{id:3,x:13,y:18,w:6,h:5},{id:4,x:9,y:10,w:5,h:7},{id:1,x:18,y:10,w:5,h:7},{id:2,x:13,y:9,w:6,h:7}];
 return {id:'exploration-arena-196:'+tier+':'+floor+':'+seed,arena:true,size:SIZE,cell:CELL,tiles,rooms,start:{x:1600,y:2050},exit:{x:1600,y:1350},seen:Array.from({length:SIZE},()=> '1'.repeat(SIZE))};
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
 return [[-radius,-radius],[radius,-radius],[-radius,radius],[radius,radius]].every(([a,b])=>dungeonTile(d,x+a,y+b)!=='0');
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
 for(let i=0;i<=steps;i++)if(dungeonTile(d,a.x+(b.x-a.x)*i/steps,a.y+(b.y-a.y)*i/steps)==='0')return false;
 return true;
}
const paths=new Map();
export function dungeonRoute(d,from,target){
 if(!d||dungeonSight(d,from,target))return target;
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
