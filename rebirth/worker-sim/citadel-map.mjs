// Shared deterministic region geometry. Rendering, movement, the server and the
// prediction worker all consume the same tiles.
// Tile codes: '0' solid, '1' path/corridor floor, '2' room/area floor.
// Each biome has its own generator so regions differ in structure, not only colour:
//  0 forest   – open meadows linked by winding trails, tree clumps
//  1 cave     – cellular-automata caverns
//  2 temple   – symmetric nave, pillared hall, side chapels
//  3 crypt    – lattice of burial rooms joined by narrow passages
//  4 prison   – long cell-block corridors lined with cells
//  5 barracks – parade ground surrounded by furnished halls
//  6 royal    – open palace garden with wings, hedges and fountains
//  7 corridor – one long winding dark passage with side chambers
export const CITADEL_MAP_VERSION='citadel-map-218';
const SIZE=64,CELL=100;
const DIRS=[[1,0],[-1,0],[0,1],[0,-1]];

function makeRandom(seed){let state=seed>>>0;return ()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);}

function canvas(){
 const grid=Array.from({length:SIZE},()=>Array(SIZE).fill('0'));
 const inside=(x,y)=>x>=2&&y>=2&&x<SIZE-2&&y<SIZE-2;
 const set=(x,y,t)=>{if(inside(x,y))grid[y][x]=t;};
 const get=(x,y)=>grid[y]?.[x]??'0';
 const rect=(x,y,w,h,t='2')=>{for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)set(xx,yy,t);};
 const ellipse=(cx,cy,rx,ry,t='2')=>{for(let y=Math.floor(cy-ry);y<=Math.ceil(cy+ry);y++)for(let x=Math.floor(cx-rx);x<=Math.ceil(cx+rx);x++)if(((x-cx)/rx)**2+((y-cy)/ry)**2<=1)set(x,y,t);};
 // Paths never overwrite room floor, so rooms keep their own floor style.
 const brush=(cx,cy,r,t='1')=>{for(let y=Math.floor(cy-r);y<=Math.ceil(cy+r);y++)for(let x=Math.floor(cx-r);x<=Math.ceil(cx+r);x++)if((x-cx)**2+(y-cy)**2<=r*r&&get(x,y)==='0')set(x,y,t);};
 const lineBrush=(a,b,r,t='1',bend=0)=>{const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,steps=Math.ceil(len*3);for(let i=0;i<=steps;i++){const k=i/steps,s=Math.sin(k*Math.PI)*bend;brush(a.x+dx*k-dy/len*s,a.y+dy*k+dx/len*s,r,t);}};
 // Axis-aligned corridor of an exact width (in tiles), L-shaped.
 const corridor=(a,b,width=2,t='1',horizontalFirst=true)=>{
  const carve=(x,y)=>{for(let i=0;i<width;i++)for(let j=0;j<width;j++)if(get(x+i,y+j)==='0')set(x+i,y+j,t);};
  let x=Math.round(a.x),y=Math.round(a.y);const tx=Math.round(b.x),ty=Math.round(b.y);
  const across=()=>{while(x!==tx){carve(x,y);x+=Math.sign(tx-x);}carve(x,y);};
  const down=()=>{while(y!==ty){carve(x,y);y+=Math.sign(ty-y);}carve(x,y);};
  if(horizontalFirst){across();down();}else{down();across();}
 };
 return {grid,inside,set,get,rect,ellipse,brush,lineBrush,corridor};
}
const floor=t=>t==='1'||t==='2';
// Breadth-first distance field over floor tiles.
function distances(grid,sx,sy){
 const dist=new Int32Array(SIZE*SIZE).fill(-1),queue=new Int32Array(SIZE*SIZE);let head=0,tail=0;
 if(!floor(grid[sy]?.[sx]))return dist;
 dist[sy*SIZE+sx]=0;queue[tail++]=sy*SIZE+sx;
 while(head<tail){const at=queue[head++],x=at%SIZE,y=(at-x)/SIZE;for(const [dx,dy] of DIRS){const nx=x+dx,ny=y+dy,i=ny*SIZE+nx;if(nx>=0&&ny>=0&&nx<SIZE&&ny<SIZE&&dist[i]<0&&floor(grid[ny][nx])){dist[i]=dist[at]+1;queue[tail++]=i;}}}
 return dist;
}
const open=(grid,x,y,r=1)=>{for(let yy=y-r;yy<=y+r;yy++)for(let xx=x-r;xx<=x+r;xx++)if(!floor(grid[yy]?.[xx]))return false;return true;};
// Rooms are boxes centred on a floor tile, so the centre tile is always floor.
const boxAt=(id,x,y,k=3)=>({id,x:x-k,y:y-k,w:2*k+1,h:2*k+1});
const rectRoom=(id,x,y,w,h)=>({id,x,y,w,h});
const centre=r=>({x:Math.floor(r.x+r.w/2),y:Math.floor(r.y+r.h/2)});
// Solid obstacles are only kept when every listed point stays connected.
function tryObstacle(c,cells,keep){
 const saved=cells.map(([x,y])=>c.get(x,y));
 for(const [x,y] of cells)c.set(x,y,'0');
 const [sx,sy]=keep[0],dist=distances(c.grid,sx,sy);
 if(keep.every(([x,y])=>dist[y*SIZE+x]>=0))return true;
 cells.forEach(([x,y],i)=>c.set(x,y,saved[i]));return false;
}
const reachableAll=(grid,points)=>{const dist=distances(grid,points[0].x,points[0].y);return points.every(p=>dist[p.y*SIZE+p.x]>=0);};
// Keep only the component containing (sx,sy); unreachable pockets become solid.
function pruneUnreachable(c,sx,sy){const dist=distances(c.grid,sx,sy);for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++)if(floor(c.grid[y][x])&&dist[y*SIZE+x]<0)c.grid[y][x]='0';return dist;}
// Pick the reachable open tile farthest from the start.
function farthest(c,dist,r=2,predicate=()=>true){let best=null,bestD=-1;for(let y=4;y<SIZE-4;y++)for(let x=4;x<SIZE-4;x++){const d=dist[y*SIZE+x];if(d>bestD&&open(c.grid,x,y,r)&&predicate(x,y)){best={x,y};bestD=d;}}return best;}
// Spread resident zones over every reachable sector of the map.
function sectorRooms(c,dist,firstId,step=10,k=3){
 const rooms=[];let id=firstId;
 for(let sy=2;sy<SIZE-2;sy+=step)for(let sx=2;sx<SIZE-2;sx+=step){
  let best=null,score=-1;
  for(let y=sy;y<Math.min(SIZE-2,sy+step);y++)for(let x=sx;x<Math.min(SIZE-2,sx+step);x++){if(dist[y*SIZE+x]<0)continue;let n=0;for(let yy=y-2;yy<=y+2;yy++)for(let xx=x-2;xx<=x+2;xx++)if(floor(c.grid[yy]?.[xx]))n++;if(n>score){score=n;best={x,y};}}
  if(best&&score>=12)rooms.push(boxAt(id++,best.x,best.y,k));
 }
 return rooms;
}

// ---------- 0: forest ----------
function forest(c,random){
 const pts=[];
 for(let gy=0;gy<4;gy++)for(let gx=0;gx<3;gx++)pts.push({x:Math.round(8+gx*21+(random()-.5)*8),y:Math.round(8+gy*15.5+(random()-.5)*6),rx:4+Math.floor(random()*3),ry:3+Math.floor(random()*3)});
 for(const p of pts){c.ellipse(p.x,p.y,p.rx,p.ry,'2');for(let i=0;i<3;i++){const a=random()*Math.PI*2;c.ellipse(p.x+Math.cos(a)*p.rx*.8,p.y+Math.sin(a)*p.ry*.8,2+random()*2,2+random()*1.5,'2');}}
 // Minimum spanning trails plus two loops.
 const linked=[0],edges=[];
 while(linked.length<pts.length){let best=null;for(const i of linked)for(let j=0;j<pts.length;j++)if(!linked.includes(j)){const d=Math.hypot(pts[i].x-pts[j].x,pts[i].y-pts[j].y);if(!best||d<best.d)best={i,j,d};}linked.push(best.j);edges.push([best.i,best.j]);}
 edges.push([1,4],[7,10]);
 for(const [a,b] of edges)c.lineBrush(pts[a],pts[b],1.6+random()*.6,'1',(random()-.5)*7);
 const start=pts[9],rooms=pts.map((p,i)=>boxAt(i===9?3:i+10,p.x,p.y));
 let dist=pruneUnreachable(c,start.x,start.y);
 // Exit: the clearing farthest along the trails.
 let exitIndex=0;pts.forEach((p,i)=>{if(dist[p.y*SIZE+p.x]>dist[pts[exitIndex].y*SIZE+pts[exitIndex].x])exitIndex=i;});
 rooms[exitIndex].id=0;
 // Tree clumps inside clearings.
 const keep=pts.map(p=>[p.x,p.y]);keep.unshift(keep.splice(9,1)[0]);
 for(const p of pts)for(let i=0;i<2;i++){const a=random()*Math.PI*2,r=Math.max(2.5,Math.min(p.rx,p.ry)-1),x=Math.round(p.x+Math.cos(a)*r),y=Math.round(p.y+Math.sin(a)*r);if(Math.hypot(x-p.x,y-p.y)<3.5)continue;const cells=[[x,y],[x+1,y],[x,y+1],[x+1,y+1]];if(cells.every(([xx,yy])=>c.get(xx,yy)==='2'))tryObstacle(c,cells,keep);}
 return {rooms,start:{x:start.x,y:start.y},exit:{x:pts[exitIndex].x,y:pts[exitIndex].y}};
}
// ---------- 1: cave ----------
function cave(c,random){
 for(let attempt=0;attempt<12;attempt++){
  let cells=Array.from({length:SIZE},(_,y)=>Array.from({length:SIZE},(_,x)=>x<3||y<3||x>=SIZE-3||y>=SIZE-3?1:random()<.475?1:0));
  for(let it=0;it<5;it++)cells=cells.map((row,y)=>row.map((v,x)=>{if(x<3||y<3||x>=SIZE-3||y>=SIZE-3)return 1;let n=0;for(let yy=y-1;yy<=y+1;yy++)for(let xx=x-1;xx<=x+1;xx++)n+=cells[yy][xx];return n>=5?1:0;}));
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++)c.grid[y][x]=cells[y][x]?'0':'2';
  // Start near the lower-left corner in a wide pocket.
  let start=null;for(let r=0;r<60&&!start;r++)for(let y=SIZE-6;y>=4&&!start;y--)for(let x=4;x<SIZE-4;x++)if(Math.abs(x-6)+Math.abs(SIZE-6-y)<=r&&open(c.grid,x,y,1)){start={x,y};break;}
  if(!start)continue;
  const dist=pruneUnreachable(c,start.x,start.y);let count=0;for(const v of dist)if(v>=0)count++;
  if(count<1000)continue;
  const exit=farthest(c,dist,2);if(!exit)continue;
  // Narrow chokepoints become two tiles wide for four-player movement.
  for(let y=3;y<SIZE-3;y++)for(let x=3;x<SIZE-3;x++)if(c.grid[y][x]==='2'&&!open(c.grid,x,y,1)&&random()<.35){for(const [dx,dy] of DIRS)if(c.grid[y+dy][x+dx]==='0'&&x+dx>2&&y+dy>2&&x+dx<SIZE-3&&y+dy<SIZE-3)c.grid[y+dy][x+dx]='1';}
  const d2=distances(c.grid,start.x,start.y);
  const rooms=sectorRooms(c,d2,10).filter(r=>Math.hypot(centre(r).x-start.x,centre(r).y-start.y)>6&&Math.hypot(centre(r).x-exit.x,centre(r).y-exit.y)>6);
  rooms.push(boxAt(3,start.x,start.y,2),boxAt(0,exit.x,exit.y,3));
  return {rooms,start,exit};
 }
 throw Error('CITADEL_CAVE_GENERATION');
}
// ---------- 2: temple ----------
function temple(c,random){
 const mid=32,rooms=[];
 const entry=rectRoom(3,mid-5,52,11,8);c.rect(entry.x,entry.y,entry.w,entry.h,'2');rooms.push(entry);
 const hall={x:mid-12,y:19,w:25,h:16};c.rect(hall.x,hall.y,hall.w,hall.h,'2');rooms.push(rectRoom(10,hall.x,hall.y,hall.w,hall.h));
 const altar=rectRoom(0,mid-6,5,13,9);c.rect(altar.x,altar.y,altar.w,altar.h,'2');rooms.push(altar);
 c.rect(mid-2,35,5,17,'1');c.rect(mid-1,14,3,5,'1');
 // Mirrored side chapels and cloister walks.
 const ch=6+Math.floor(random()*2),cw=7+Math.floor(random()*3);let id=11;
 for(const side of [-1,1]){
  const cx=side<0?5:SIZE-5-cw;
  for(const y of [8,24,40]){const r=rectRoom(id++,cx,y,cw,ch);c.rect(r.x,r.y,r.w,r.h,'2');rooms.push(r);}
  const walk=side<0?cx+Math.floor(cw/2)-1:cx+Math.floor(cw/2)-1;c.rect(walk,8,3,40,'1');
  c.corridor({x:side<0?cx+cw:mid-12-1,y:27},{x:side<0?mid-12:cx,y:27},3,'1');
  c.corridor({x:side<0?cx+cw:mid+3,y:43},{x:side<0?mid-2:cx,y:43},2,'1');
  c.corridor({x:side<0?cx+cw:mid+7,y:10},{x:side<0?mid-6:cx,y:10},2,'1');
 }
 // Two pillar rows inside the hall, mirrored.
 const keep=[[mid,56],[mid,9],[mid,27],...rooms.map(r=>[centre(r).x,centre(r).y])];
 for(let x=hall.x+2;x<hall.x+hall.w-2;x+=4)for(const y of [hall.y+3,hall.y+hall.h-4])if(Math.abs(x-mid)>2){tryObstacle(c,[[x,y]],keep);tryObstacle(c,[[2*mid-x,y]],keep);}
 for(const y of [entry.y+2,entry.y+entry.h-3])for(const x of [entry.x+2,entry.x+entry.w-3])tryObstacle(c,[[x,y]],keep);
 return {rooms,start:centre(entry),exit:centre(altar)};
}
// ---------- 3: crypt ----------
function crypt(c,random){
 const cols=5,rowsN=5,span=12,rooms=[],cellsArr=[];
 for(let gy=0;gy<rowsN;gy++)for(let gx=0;gx<cols;gx++){
  const w=4+Math.floor(random()*4),h=4+Math.floor(random()*3),x=3+gx*span+Math.floor(random()*(span-w-1)),y=3+gy*span+Math.floor(random()*(span-h-1));
  const r=rectRoom(0,Math.min(x,SIZE-3-w),Math.min(y,SIZE-3-h),w,h);cellsArr.push(r);c.rect(r.x,r.y,r.w,r.h,'2');
 }
 // Randomised depth-first maze over the room lattice plus a few loops.
 const seen=new Set([0]),stack=[0],links=[];
 while(stack.length){const at=stack.at(-1),gx=at%cols,gy=Math.floor(at/cols),next=DIRS.map(([dx,dy])=>[gx+dx,gy+dy]).filter(([x,y])=>x>=0&&y>=0&&x<cols&&y<rowsN&&!seen.has(y*cols+x)).map(([x,y])=>y*cols+x);
  if(!next.length){stack.pop();continue;}const n=next[Math.floor(random()*next.length)];seen.add(n);links.push([at,n]);stack.push(n);}
 for(let i=0;i<4;i++){const a=Math.floor(random()*cols*rowsN),b=a+(random()<.5?1:cols);if(b<cols*rowsN&&(b===a+cols||b%cols!==0))links.push([a,b]);}
 for(const [a,b] of links)c.corridor(centre(cellsArr[a]),centre(cellsArr[b]),2,'1',random()<.5);
 const startIndex=cols*(rowsN-1),start=centre(cellsArr[startIndex]);
 const dist=distances(c.grid,start.x,start.y);let exitIndex=0;cellsArr.forEach((r,i)=>{const p=centre(r);if(dist[p.y*SIZE+p.x]>dist[centre(cellsArr[exitIndex]).y*SIZE+centre(cellsArr[exitIndex]).x])exitIndex=i;});
 cellsArr.forEach((r,i)=>{r.id=i===startIndex?3:i===exitIndex?0:i+10;rooms.push(r);});
 // Sarcophagi in larger burial rooms.
 const keep=rooms.map(r=>[centre(r).x,centre(r).y]);
 for(const r of rooms)if(r.w>=6&&r.h>=5&&r.id!==3)for(let x=r.x+1;x<r.x+r.w-1;x+=3){const y=r.y+1;if(Math.abs(x-centre(r).x)>0)tryObstacle(c,[[x,y]],keep);}
 return {rooms,start,exit:centre(cellsArr[exitIndex])};
}
// ---------- 4: prison ----------
function prison(c,random){
 const rooms=[],wings=[14,31,48],left=6,right=SIZE-7;let id=10;
 wings.forEach((y,wi)=>{
  c.rect(left,y,right-left+1,3,'1');
  // Cells above and below the corridor, each with a one-tile door.
  for(let x=left+1;x<right-4;x+=5){
   for(const side of [-1,1]){
    const h=3+Math.floor(random()*2),cy=side<0?y-1-h:y+4;
    if(cy<3||cy+h>SIZE-3)continue;
    const r=rectRoom(id++,x,cy,4,h);c.rect(r.x,r.y,r.w,r.h,'2');rooms.push(r);
    c.set(x+1+Math.floor(random()*2),side<0?y-1:y+3,'1');
   }
  }
  // Guard rooms at alternate ends join the wings into one serpentine block.
  const endX=wi%2===0?right-1:left-6;const guard=rectRoom(id++,Math.max(3,Math.min(SIZE-10,endX)),y-2,7,7);c.rect(guard.x,guard.y,guard.w,guard.h,'2');rooms.push(guard);
 });
 c.rect(right-3,14,3,37,'1');c.rect(left,31,3,20,'1');
 // Cell doors the corridor rect overwrote are fine; ensure the vertical joins hit guard rooms.
 const start=rectRoom(3,left-1,55,8,6);c.rect(start.x,start.y,start.w,start.h,'2');rooms.push(start);c.rect(left,50,3,6,'1');
 const exit=rectRoom(0,right-8,3,9,8);c.rect(exit.x,exit.y,exit.w,exit.h,'2');rooms.push(exit);c.rect(right-3,10,3,5,'1');
 return {rooms,start:centre(start),exit:centre(exit)};
}
// ---------- 5: barracks ----------
function barracks(c,random){
 const rooms=[],mid=32;
 const yard=rectRoom(10,mid-11,22,23,16);c.rect(yard.x,yard.y,yard.w,yard.h,'1');rooms.push(yard);
 const gate=rectRoom(3,mid-4,53,9,7);c.rect(gate.x,gate.y,gate.w,gate.h,'2');rooms.push(gate);c.rect(mid-1,38,3,15,'1');
 const hq=rectRoom(0,mid-7,3,15,10);c.rect(hq.x,hq.y,hq.w,hq.h,'2');rooms.push(hq);c.rect(mid-1,13,3,9,'1');
 // Halls on both flanks, each opening onto the parade ground.
 let id=11;const halls=[];
 for(const side of [-1,1])for(const [y,h] of [[5,12],[20,12],[36,14]]){
  const w=12+Math.floor(random()*3),x=side<0?3:SIZE-3-w;const r=rectRoom(id++,x,y,w,h);c.rect(r.x,r.y,r.w,r.h,'2');rooms.push(r);halls.push(r);
  const doorY=Math.min(r.y+r.h-3,Math.max(r.y+1,26));
  if(r.y+r.h>=22&&r.y<=37)c.corridor({x:side<0?r.x+r.w:yard.x+yard.w,y:doorY},{x:side<0?yard.x:r.x,y:doorY},3,'1');
  else c.corridor({x:side<0?r.x+r.w:mid+2,y:r.y+Math.floor(r.h/2)},{x:side<0?mid-1:r.x,y:r.y+Math.floor(r.h/2)},2,'1');
 }
 // Beds and tables in rows with a clear central aisle.
 const keep=[[centre(gate).x,centre(gate).y],...rooms.map(r=>[centre(r).x,centre(r).y])];
 for(const r of halls){const aisle=centre(r).y;for(let x=r.x+1;x<r.x+r.w-1;x+=3)for(let y=r.y+1;y<r.y+r.h-1;y+=3)if(Math.abs(y-aisle)>1)tryObstacle(c,[[x,y],[x+1,y]],keep);}
 // Training dummies on the parade ground.
 for(let i=0;i<6;i++){const x=yard.x+3+Math.floor(random()*(yard.w-6)),y=yard.y+3+Math.floor(random()*(yard.h-6));if(Math.abs(x-mid)>2)tryObstacle(c,[[x,y]],keep);}
 return {rooms,start:centre(gate),exit:centre(hq)};
}
// ---------- 6: royal garden ----------
function royal(c,random){
 const mid=32;c.rect(4,4,SIZE-8,SIZE-8,'2');
 // Cobbled avenues (kept clear) and a ring road.
 const avenue=(x,y,w,h)=>c.rect(x,y,w,h,'1');
 avenue(mid-1,4,3,SIZE-8);avenue(4,mid-1,SIZE-8,3);avenue(12,12,3,40);avenue(SIZE-15,12,3,40);avenue(12,12,40,3);avenue(12,SIZE-15,40,3);
 const start={x:mid,y:SIZE-7},exit={x:mid,y:7};
 const isPath=(x,y)=>c.get(x,y)==='1';
 const keepPts=[[start.x,start.y],[exit.x,exit.y],[mid,mid-4],[13,13],[SIZE-14,SIZE-14],[13,SIZE-14],[SIZE-14,13]];
 const place=cells=>{if(cells.some(([x,y])=>isPath(x,y)||c.get(x,y)!=='2'))return false;return tryObstacle(c,cells,keepPts);};
 // Palace wings: large solid buildings in the four garden quarters.
 for(const [qx,qy] of [[17,17],[35,17],[17,35],[35,35]]){const w=7+Math.floor(random()*4),h=5+Math.floor(random()*3),ox=qx+Math.floor(random()*(11-w)),oy=qy+Math.floor(random()*(10-h)),cells=[];for(let y=oy;y<oy+h;y++)for(let x=ox;x<ox+w;x++)cells.push([x,y]);place(cells);}
 // Fountain at the centre crossing: a ring with the avenues passing around it.
 for(let y=mid-2;y<=mid+2;y++)for(let x=mid-2;x<=mid+2;x++)if((x-mid)**2+(y-mid)**2<=4.5)c.set(x,y,'0');
 c.rect(mid-4,mid-4,9,2,'1');c.rect(mid-4,mid+3,9,2,'1');c.rect(mid-4,mid-4,2,9,'1');c.rect(mid+3,mid-4,2,9,'1');
 // Hedge rows and small pavilions.
 for(let i=0;i<26;i++){const horizontal=random()<.5,len=4+Math.floor(random()*5),x=5+Math.floor(random()*(SIZE-14)),y=5+Math.floor(random()*(SIZE-14)),cells=[];for(let k=0;k<len;k++)cells.push(horizontal?[x+k,y]:[x,y+k]);place(cells);}
 for(let i=0;i<5;i++){const x=6+Math.floor(random()*(SIZE-16)),y=6+Math.floor(random()*(SIZE-16)),cells=[];for(let yy=y;yy<y+3;yy++)for(let xx=x;xx<x+3;xx++)cells.push([xx,yy]);place(cells);}
 const dist=pruneUnreachable(c,start.x,start.y);
 const rooms=sectorRooms(c,dist,10,13,3).filter(r=>Math.hypot(centre(r).x-start.x,centre(r).y-start.y)>5&&Math.hypot(centre(r).x-exit.x,centre(r).y-exit.y)>5);
 rooms.push(boxAt(3,start.x,start.y,2),boxAt(0,exit.x,exit.y,2));
 return {rooms,start,exit};
}
// ---------- 7: dark corridor ----------
function darkCorridor(c,random){
 // A long serpentine passage sweeping the whole map, with chambers at the turns.
 const rooms=[],way=[];let id=10;const left=7+Math.floor(random()*3),right=SIZE-8-Math.floor(random()*3);
 const bands=[57,45,33,21,9];
 bands.forEach((y,i)=>{const fromLeft=i%2===0;way.push({x:fromLeft?left:right,y});way.push({x:Math.round((left+right)/2+(random()-.5)*10),y:y+Math.round((random()-.5)*4)});way.push({x:fromLeft?right:left,y});});
 for(let i=0;i<way.length-1;i++)c.lineBrush(way[i],way[i+1],1.5,'1',(random()-.5)*(way[i].y===way[i+1].y?0:3)+(i%3===1?(random()-.5)*6:0));
 const start=way[0],exit=way.at(-1);
 c.ellipse(start.x,start.y,3,2.5,'2');rooms.push(boxAt(3,start.x,start.y,2));
 for(let i=1;i<way.length-1;i++){const p=way[i];c.ellipse(p.x,p.y,3.5+random()*1.5,3+random(),'2');rooms.push(boxAt(id++,p.x,p.y,3));
  // Dead-end side passages with small shrines.
  if(random()<.6){const dir=p.y>32?-1:1,len=4+random()*3,bx=Math.round(Math.max(5,Math.min(SIZE-6,p.x+(random()-.5)*8))),by=Math.round(Math.max(5,Math.min(SIZE-6,p.y+dir*len)));c.lineBrush(p,{x:bx,y:by},1.1,'1');c.ellipse(bx,by,2.2,2,'2');rooms.push(boxAt(id++,bx,by,2));}
 }
 c.ellipse(exit.x,exit.y,4.5,3.5,'2');rooms.push(boxAt(0,exit.x,exit.y,3));
 const dist=pruneUnreachable(c,start.x,start.y);
 return {rooms:rooms.filter(r=>dist[centre(r).y*SIZE+centre(r).x]>=0),start,exit};
}
// ---------- boss arenas ----------
function bossArena(c,stage,random){
 const cx=31,cy=28,start=rectRoom(3,26,47,11,9);
 c.rect(start.x,start.y,start.w,start.h,'2');c.rect(cx-1,40,3,8,'1');
 const kind=stage.boss,keep=[[centre(start).x,centre(start).y],[cx,cy]];
 if(kind==='harbingers'||kind==='shadow'){
  c.rect(cx-14,cy-12,29,25,'2');
  // Pillars hug the walls well outside the 6-tile combat core.
  for(let x=cx-12;x<=cx+12;x+=4)for(const y of [cy-10,cy+10])if(Math.abs(x-cx)>2)tryObstacle(c,[[x,y]],keep);
  for(let y=cy-6;y<=cy+6;y+=4)for(const x of [cx-12,cx+12])tryObstacle(c,[[x,y]],keep);
 }else if(kind==='avatar'){
  for(let y=cy-13;y<=cy+13;y++)for(let x=cx-14;x<=cx+14;x++)if(Math.abs(x-cx)+Math.abs(y-cy)<=19)c.set(x,y,'2');
 }else{
  c.ellipse(cx,cy,14,13,'2');
  // Natural arenas get ragged rims.
  for(let i=0;i<40;i++){const a=random()*Math.PI*2,r=12.5+random()*1.5,x=Math.round(cx+Math.cos(a)*r),y=Math.round(cy+Math.sin(a)*r*13/14);if(Math.abs(x-cx)>1)c.set(x,y,'0');}
  if(kind==='serpents')for(let i=0;i<16;i++){if(i%4===0)continue;const a=i/16*Math.PI*2+.1,x=Math.round(cx+Math.cos(a)*11),y=Math.round(cy+Math.sin(a)*10);tryObstacle(c,[[x,y]],keep);}
 }
 pruneUnreachable(c,centre(start).x,centre(start).y);
 return {rooms:[start,rectRoom(0,cx-14,cy-13,29,27)],start:centre(start),exit:{x:cx,y:cy}};
}
const GENERATORS=[forest,cave,temple,crypt,prison,barracks,royal,darkCorridor];
export function buildCitadelRegion(stage,floorNumber,seed,version){
 const random=makeRandom((seed^Math.imul(floorNumber,2654435761))>>>0);
 const c=canvas();
 const layout=stage.boss?bossArena(c,stage,random):GENERATORS[stage.biome](c,random);
 // Regular regions are also rotated/mirrored at random, so layouts differ every run.
 if(!stage.boss){const turn=Math.floor(random()*8),T=(x,y)=>{let a=x,b=y;if(turn&4)a=SIZE-1-a;for(let i=0;i<(turn&3);i++)[a,b]=[SIZE-1-b,a];return [a,b];};
  const old=c.grid.map(r=>[...r]);for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++){const [a,b]=T(x,y);c.grid[b][a]=old[y][x];}
  const tp=p=>{const [x,y]=T(p.x,p.y);return {x,y};};
  layout.start=tp(layout.start);layout.exit=tp(layout.exit);
  layout.rooms=layout.rooms.map(r=>{const cc=centre(r),[cx,cy]=T(cc.x,cc.y),odd=(turn&3)%2===1,w=odd?r.h:r.w,h=odd?r.w:r.h;return {id:r.id,x:cx-Math.floor(w/2),y:cy-Math.floor(h/2),w,h};});}
 // Never leave a resident zone or the exit disconnected.
 if(!reachableAll(c.grid,[layout.start,layout.exit,...layout.rooms.map(centre)]))throw Error('CITADEL_MAP_DISCONNECTED');
 const point=p=>({x:(p.x+.5)*CELL,y:(p.y+.5)*CELL});
 return {id:version+':'+CITADEL_MAP_VERSION+':'+floorNumber+':'+(seed>>>0),size:SIZE,cell:CELL,tiles:c.grid.map(r=>r.join('')),rooms:layout.rooms,start:point(layout.start),exit:point(layout.exit),seen:Array(SIZE).fill('0'.repeat(SIZE)),citadel:true,shadowWalls:[],biome:stage.biome,boss:stage.boss||null,bossArena:!!stage.boss};
}
