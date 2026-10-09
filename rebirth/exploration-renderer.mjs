import {dungeonTile,dungeonSeen} from './exploration-dungeon.mjs';
const palettes=[
 {void:'#101923',wall:'#273d49',edge:'#536b6d',floor:'#475856',room:'#56665e',light:'#87a799',accent:'#a8ddb0'},
 {void:'#21141f',wall:'#49303c',edge:'#89525a',floor:'#61504c',room:'#705a4e',light:'#af8365',accent:'#f4af65'},
 {void:'#15152c',wall:'#313448',edge:'#686989',floor:'#454962',room:'#555c79',light:'#939bbd',accent:'#b5c6ff'},
];
export function drawExplorationDungeon(renderer,b,image){
 const g=renderer.g,d=b.dungeon;if(!d)return false;
 const p=palettes[b.tier]||palettes[0],loaded=image.complete&&image.naturalWidth>0;
 if(renderer.dungeonLayer?.id!==d.id||renderer.dungeonLayer.loaded!==loaded){
  // One half-resolution background per renderer, released/replaced between floors.
  const canvas=document.createElement('canvas');canvas.width=canvas.height=1600;const c=canvas.getContext('2d');c.scale(.5,.5);
  c.fillStyle=p.void;c.fillRect(0,0,3200,3200);
  const floor=new Path2D();for(let y=0;y<32;y++)for(let x=0;x<32;x++)if(d.tiles[y][x]!=='0')floor.rect(x*100,y*100,100,100);
  c.save();c.clip(floor);c.fillStyle=p.floor;c.fillRect(0,0,3200,3200);
  for(const r of d.rooms){c.fillStyle=p.room;c.fillRect(r.x*100,r.y*100,r.w*100,r.h*100);}
  if(loaded){c.globalAlpha=.24;c.drawImage(image,0,0,3200,3200);c.globalAlpha=1;}
  for(let y=0;y<32;y++)for(let x=0;x<32;x++)if(d.tiles[y][x]!=='0'){
   c.strokeStyle='#07131a24';c.lineWidth=2;c.strokeRect(x*100+2,y*100+2,96,96);
   const hash=(x*83+y*137+b.floor*23)%19;
   if(hash<4){c.strokeStyle=p.light+'38';c.lineWidth=2;c.beginPath();c.moveTo(x*100+17,y*100+58);c.lineTo(x*100+43,y*100+49);c.lineTo(x*100+63,y*100+57);c.stroke();}
  }
  c.restore();
  // Rock faces and bright floor outlines make solid walls and doorways readable.
  for(let y=0;y<32;y++)for(let x=0;x<32;x++)if(d.tiles[y][x]==='0'){
   const adjacent=[[0,1],[0,-1],[1,0],[-1,0]].some(([dx,dy])=>d.tiles[y+dy]?.[x+dx]&&d.tiles[y+dy][x+dx]!=='0');if(!adjacent)continue;
   c.fillStyle=p.wall;c.fillRect(x*100+3,y*100+3,94,94);c.strokeStyle=p.edge;c.lineWidth=4;c.strokeRect(x*100+9,y*100+9,82,82);
   c.fillStyle='#05091248';c.fillRect(x*100+5,y*100+67,90,28);
   if(d.tiles[y+1]?.[x]&&d.tiles[y+1][x]!=='0'){c.fillStyle=p.edge;c.fillRect(x*100,y*100+86,100,14);}
  }
  c.save();c.clip(floor);c.strokeStyle=p.accent+'78';c.lineWidth=6;c.stroke(floor);c.restore();
  renderer.dungeonLayer={id:d.id,canvas,loaded};
 }
 g.drawImage(renderer.dungeonLayer.canvas,0,0,3200,3200);
 // The stair exists physically from entry; it activates only after all enemies die.
 const {x,y}=b.exit;g.save();g.translate(x,y);g.fillStyle='#121b27';g.strokeStyle=b.exitOpen?'#a0ffd1':'#75828d';g.lineWidth=5;g.fillRect(-70,-62,140,124);g.strokeRect(-70,-62,140,124);
 for(let i=0;i<5;i++){g.fillStyle=b.exitOpen?['#4e927d','#6ea992'][i%2]:['#46515b','#5b6870'][i%2];g.fillRect(-56+i*7,-46+i*20,112-i*14,13);}
 g.font='bold 26px sans-serif';g.textAlign='center';g.fillStyle=b.exitOpen?'#ccffe3':'#ccd3d9';g.fillText(b.status==='won'?'보상 상자':b.exitOpen?'다음 층 ↑':'계단 잠김',0,-90);g.restore();
 return true;
}
export function drawExplorationFog(g,b,camera,width,height){
 const d=b.dungeon;if(!d)return;
 g.fillStyle='#0b101cf2';const left=Math.max(0,Math.floor(camera.x/100)),right=Math.min(31,Math.ceil((camera.x+width)/100)),top=Math.max(0,Math.floor(camera.y/100)),bottom=Math.min(31,Math.ceil((camera.y+height)/100));
 for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++)if(d.seen[y][x]!=='1')g.fillRect(x*100,y*100,101,101);
}
export function drawExplorationMinimap(g,b,player){
 const d=b.dungeon;if(!d)return;const x=790,y=20,size=190,scale=size/32;
 g.save();g.fillStyle='#111221e8';g.fillRect(x-8,y-8,size+16,size+36);g.strokeStyle='#abc3d0';g.lineWidth=2;g.strokeRect(x-8,y-8,size+16,size+36);
 for(let row=0;row<32;row++)for(let col=0;col<32;col++)if(d.seen[row][col]==='1'&&d.tiles[row][col]!=='0'){
  g.fillStyle=d.tiles[row][col]==='2'?'#424c61':'#65738a';g.fillRect(x+col*scale,y+row*scale,scale+.3,scale+.3);
  g.strokeStyle='#e1e3d3';g.lineWidth=1;for(const [dx,dy] of [[0,-1],[0,1],[-1,0],[1,0]])if(!d.tiles[row+dy]?.[col+dx]||d.tiles[row+dy][col+dx]==='0'){
   g.beginPath();if(dx){const px=x+(col+(dx>0?1:0))*scale;g.moveTo(px,y+row*scale);g.lineTo(px,y+(row+1)*scale);}else{const py=y+(row+(dy>0?1:0))*scale;g.moveTo(x+col*scale,py);g.lineTo(x+(col+1)*scale,py);}g.stroke();
  }
 }
 const dot=(m,color,r)=>{g.fillStyle=color;g.beginPath();g.arc(x+m.x/3200*size,y+m.y/3200*size,r,0,Math.PI*2);g.fill();};
 for(const e of b.monsters||[])if(dungeonSeen(d,e.x,e.y))dot(e,e.boss?'#ffc963':'#ff747d',e.boss?4:2.4);
 for(const m of b.allies||[])dot(m,'#84e2d0',3);dot(player,'#ffffff',3.6);
 if(dungeonSeen(d,b.exit.x,b.exit.y))dot(b.exit,b.exitOpen?'#85ffc1':'#b1a79b',4);
 g.fillStyle='#d7dfeb';g.font='bold 15px sans-serif';g.textAlign='left';g.fillText((b.explorationFloor||b.floor)+'F · 탐색 지도',x,y+size+20);g.restore();
}
