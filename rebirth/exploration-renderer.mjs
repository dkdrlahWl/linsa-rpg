import {CITADEL_BIOMES,citadelAsset,citadelStage} from './citadel-zero.mjs';
import {dungeonSeen} from './exploration-dungeon.mjs';
export const explorationTerrainSource=(tier,floor=1)=>tier===3?citadelAsset('terrain',citadelStage(floor).biome):'exploration/terrain-'+tier+'-193.webp';
const moods=[{base:'#242a25',fog:'#101c25',glow:'#70eeb0'},{base:'#2b211e',fog:'#211520',glow:'#ff963f'},{base:'#292838',fog:'#13182c',glow:'#a4b0ff'}];
function cell(g,im,index,x,y,width,height=width,flip=false){
 const sw=im.naturalWidth/3,sh=im.naturalHeight/2;
 g.save();g.translate(x,y);if(flip)g.scale(-1,1);
 g.drawImage(im,(index%3)*sw,Math.floor(index/3)*sh,sw,sh,-width/2,-height/2,width,height);g.restore();
}
function floorPattern(im){
 // Mirrored texture edges join without a tile outline or repeated rectangular seams.
 const tile=document.createElement('canvas');tile.width=tile.height=800;const g=tile.getContext('2d'),sw=im.naturalWidth/3,sh=im.naturalHeight/2;
 for(let y=0;y<2;y++)for(let x=0;x<2;x++){g.save();g.translate(x*400+(x?400:0),y*400+(y?400:0));g.scale(x?-1:1,y?-1:1);g.drawImage(im,0,0,sw,sh,0,0,400,400);g.restore();}
 return tile;
}
export function drawExplorationDungeon(renderer,b,im,heart){
 const g=renderer.g,d=b.dungeon;if(!d)return false;const size=d.size||32,world=size*100;
 if(d.arena){const arena=renderer.arenaImage?.(b.tier);g.fillStyle=(moods[b.tier]||moods[0]).fog;g.fillRect(-5000,-5000,13000,13000);if(arena?.complete&&arena.naturalWidth)g.drawImage(arena,d.arenaBounds?.x??900,d.arenaBounds?.y??900,d.arenaBounds?.width??1400,d.arenaBounds?.height??1400);drawExplorationHearts(g,b,d,heart);return true;}
 const biome=CITADEL_BIOMES[d.biome],mood=d.citadel?{base:biome.color,fog:biome.color,glow:biome.light}:moods[b.tier]||moods[0],loaded=im.complete&&im.naturalWidth>0;
 if(renderer.dungeonLayer?.id!==d.id||renderer.dungeonLayer.loaded!==loaded){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=Math.min(2048,world/2);const c=canvas.getContext('2d');c.scale(canvas.width/world,canvas.height/world);c.fillStyle=mood.base;c.fillRect(0,0,world,world);
  const pattern=loaded?c.createPattern(floorPattern(im),'repeat'):mood.base;
  c.fillStyle=pattern;c.fillRect(0,0,world,world);c.fillStyle=mood.fog+'e8';c.fillRect(0,0,world,world);
  const floor=new Path2D();for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(d.tiles[y][x]!=='0')floor.rect(x*100,y*100,100,100);
  c.save();c.clip(floor);c.fillStyle=pattern;c.fillRect(0,0,world,world);
  for(const r of d.rooms){const x=(r.x+r.w/2)*100,y=(r.y+r.h/2)*100,light=c.createRadialGradient(x,y,30,x,y,460);light.addColorStop(0,'#ffe2aa16');light.addColorStop(1,'#ffe2aa00');c.fillStyle=light;c.fillRect(r.x*100,r.y*100,r.w*100,r.h*100);}
  c.restore();
  if(loaded){
   // Keep painted solid terrain inside the same blocked cells used for collision.
   c.save();const blocked=new Path2D();for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(d.tiles[y][x]==='0')blocked.rect(x*100,y*100,100,100);c.clip(blocked);
   for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(d.tiles[y][x]==='0'){
    const adjacent=[[0,1],[0,-1],[1,0],[-1,0]].some(([dx,dy])=>d.tiles[y+dy]?.[x+dx]&&d.tiles[y+dy][x+dx]!=='0');if(!adjacent)continue;
    const hash=(x*83+y*137+(b.explorationFloor||b.floor)*23)%101,width=168+hash%19;
    c.save();c.shadowColor='#00000090';c.shadowBlur=18;c.shadowOffsetY=14;cell(c,im,1+hash%2,x*100+50+(hash%9-4),y*100+48+(hash%11-5),width,165+hash%17,hash%3===0);c.restore();
   }
   for(const r of d.rooms){
    for(const [i,x,y] of [[3,r.x-.5,r.y+1],[4,r.x+r.w+.5,r.y+r.h-1]]){
     if(d.tiles[Math.floor(y)]?.[Math.floor(x)]!=='0')continue;
     const glow=c.createRadialGradient(x*100,y*100,0,x*100,y*100,160);glow.addColorStop(0,mood.glow+'28');glow.addColorStop(1,mood.glow+'00');c.fillStyle=glow;c.fillRect(x*100-160,y*100-160,320,320);cell(c,im,i,x*100,y*100,200,215);
    }
   }
   c.restore();
  }
  renderer.dungeonLayer={id:d.id,canvas,loaded};
 }
 g.drawImage(renderer.dungeonLayer.canvas,0,0,world,world);
 if(d.citadel){g.save();g.fillStyle='#503874bb';for(const wall of d.shadowWalls||[])g.fillRect(wall.x,wall.y,100,100);for(const trap of b.traps||[]){if(!dungeonSeen(d,trap.x,trap.y))continue;g.strokeStyle='#b19cad';g.lineWidth=4;g.beginPath();g.arc(trap.x,trap.y,45,0,Math.PI*2);g.stroke();}g.restore();}
 if(loaded&&b.status!=='won'){const {x,y}=b.exit;g.save();if(b.exitOpen){const glow=g.createRadialGradient(x,y,0,x,y,180);glow.addColorStop(0,mood.glow+'55');glow.addColorStop(1,mood.glow+'00');g.fillStyle=glow;g.fillRect(x-180,y-180,360,360);}cell(g,im,5,x,y,235,235);g.font='bold 24px sans-serif';g.textAlign='center';g.lineWidth=5;g.strokeStyle='#10141b';g.fillStyle=b.exitOpen?'#ccffe3':'#d9d5cb';const label=b.status==='won'?'보상 상자':b.exitOpen?'다음 층 ↑':'계단 잠김';g.strokeText(label,x,y-135);g.fillText(label,x,y-135);g.restore();}
 drawExplorationHearts(g,b,d,heart);
 return true;
}
export function drawExplorationFog(g,b,camera,width,height,renderer){
 const d=b.dungeon;if(!d||d.arena)return;const size=d.size||32,world=size*100;const key=d.id+':'+d.seen.join('');
 if(renderer.dungeonFog?.key!==key){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=world/4;const c=canvas.getContext('2d');c.scale(.25,.25);const path=new Path2D();
  for(let y=0;y<size;y++){let start=-1;for(let x=0;x<=size;x++){if(x<size&&d.seen[y][x]!=='1'){if(start<0)start=x;}else if(start>=0){path.rect(start*100-1,y*100-1,(x-start)*100+2,102);start=-1;}}}
  c.filter='blur(7px)';c.fillStyle=(moods[b.tier]||moods[0]).fog+'fa';c.fill(path);renderer.dungeonFog={key,canvas};
 }
 g.drawImage(renderer.dungeonFog.canvas,0,0,world,world);
}
const minimapLayers=new WeakMap();
export function drawExplorationMinimap(g,b,player){
 const d=b.dungeon;if(!d)return;const x=790,y=20,size=190,world=d.size*100,scale=size/d.size;
 g.save();g.fillStyle='#111221e8';g.fillRect(x-8,y-8,size+16,size+36);g.strokeStyle='#abc3d0';g.lineWidth=2;g.strokeRect(x-8,y-8,size+16,size+36);
 const key=d.id+':'+d.seen.join('');let layer=minimapLayers.get(g);
 if(layer?.key!==key){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=size;const c=canvas.getContext('2d');
 for(let row=0;row<d.size;row++)for(let col=0;col<d.size;col++)if(d.seen[row][col]==='1'&&d.tiles[row][col]!=='0'){
  c.fillStyle=d.tiles[row][col]==='2'?'#424c61':'#65738a';c.fillRect(col*scale,row*scale,scale+.3,scale+.3);
  c.strokeStyle='#e1e3d3';c.lineWidth=1;for(const [dx,dy] of [[0,-1],[0,1],[-1,0],[1,0]])if(!d.tiles[row+dy]?.[col+dx]||d.tiles[row+dy][col+dx]==='0'){
   c.beginPath();if(dx){const px=(col+(dx>0?1:0))*scale;c.moveTo(px,row*scale);c.lineTo(px,(row+1)*scale);}else{const py=(row+(dy>0?1:0))*scale;c.moveTo(col*scale,py);c.lineTo((col+1)*scale,py);}c.stroke();
  }
 }
  layer={key,canvas};minimapLayers.set(g,layer);
 }
 g.drawImage(layer.canvas,x,y);
 const dot=(m,color,r)=>{g.fillStyle=color;g.beginPath();g.arc(x+m.x/world*size,y+m.y/world*size,r,0,Math.PI*2);g.fill();};
 for(const h of b.hearts||[])if(dungeonSeen(d,h.x,h.y))dot(h,'#ffb0d0',3);
 for(const e of b.monsters||[])if(dungeonSeen(d,e.x,e.y))dot(e,e.boss?'#ffc963':'#ff747d',e.boss?4:2.4);
 for(const m of b.allies||[])dot(m,'#84e2d0',3);dot(player,'#ffffff',3.6);
 const goal=b.status==='won'&&b.chest?b.chest:b.exit;if(dungeonSeen(d,goal.x,goal.y))dot(goal,b.status==='won'?'#ffd472':b.exitOpen?'#85ffc1':'#b1a79b',4);
 g.fillStyle='#d7dfeb';g.font='bold 15px sans-serif';g.textAlign='left';g.fillText((b.explorationFloor||b.floor)+'F · 탐색 지도',x,y+size+20);g.restore();
}

function drawExplorationHearts(g,b,d,heart){
 if(heart?.complete&&heart.naturalWidth){for(const h of b.hearts||[]){if(!dungeonSeen(d,h.x,h.y))continue;g.save();const bob=Math.sin((b.tick||0)*.12+h.id)*6;g.shadowColor='#ff588e';g.shadowBlur=16;g.drawImage(heart,h.x-42,h.y-62-bob,84,84);g.shadowBlur=0;g.font='bold 23px sans-serif';g.textAlign='center';g.strokeStyle='#17212c';g.lineWidth=4;g.fillStyle='#ffbed1';g.strokeText('+10%',h.x,h.y+43);g.fillText('+10%',h.x,h.y+43);g.restore();}}
}
