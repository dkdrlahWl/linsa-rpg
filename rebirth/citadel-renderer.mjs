import {dungeonFloorTile} from './exploration-dungeon.mjs';
const ready=im=>im?.complete&&im.naturalWidth>0;
function pattern(im,index){
 const tile=document.createElement('canvas');tile.width=tile.height=640;const g=tile.getContext('2d'),w=im.naturalWidth/4,h=im.naturalHeight/2;
 for(let y=0;y<2;y++)for(let x=0;x<2;x++){g.save();g.translate(x*320+(x?320:0),y*320+(y?320:0));g.scale(x?-1:1,y?-1:1);g.drawImage(im,index%4*w+3,Math.floor(index/4)*h+3,w-6,h-6,0,0,320,320);g.restore();}return tile;
}
function prop(g,im,index,x,y,width){const sw=im.naturalWidth/4,sh=im.naturalHeight/4;g.drawImage(im,index%4*sw,Math.floor(index/4)*sh,sw,sh,x-width/2,y-width*.85,width,width);}
export function drawCitadelWorld(renderer,b,image){
 const d=b.dungeon;if(!d)return;const g=renderer.g,world=d.size*d.cell,ground=image('citadel/ground-217.webp'),props=image('citadel/props-217.webp'),loaded=ready(ground)&&ready(props);
 if(renderer.citadelLayer?.id!==d.id||renderer.citadelLayer.loaded!==loaded){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=2560;const c=canvas.getContext('2d');c.scale(canvas.width/world,canvas.height/world);c.imageSmoothingEnabled=false;
  const forest=d.biome===0,natural=d.biome<2,index=[0,2,3,4,5,6,7,3][d.biome];
  c.fillStyle=loaded?c.createPattern(pattern(ground,forest?1:2),'repeat'):'#253025';c.fillRect(0,0,world,world);
  if(!forest){c.fillStyle=natural?'#15181a55':'#11131bcc';c.fillRect(0,0,world,world);}
  const floor=new Path2D();for(let y=0;y<d.size;y++)for(let x=0;x<d.size;x++)if(dungeonFloorTile(d.tiles[y][x]))floor.rect(x*d.cell,y*d.cell,d.cell,d.cell);
  c.save();c.shadowColor='#070c0c';c.shadowBlur=natural?22:8;c.lineWidth=natural?28:42;c.strokeStyle=forest?'#39482b':natural?'#33322c':'#6e6872';if(natural){c.fillStyle=forest?'#77714c':'#4b463e';c.fill(floor);}else c.stroke(floor);c.restore();
  c.save();c.clip(floor);c.fillStyle=loaded?c.createPattern(pattern(ground,index),'repeat'):'#746646';c.fillRect(0,0,world,world);c.restore();
  // Whole scenery sprites occupy blocked terrain; no clipping trees into tile strips.
  if(loaded)for(let y=2;y<d.size-2;y+=2)for(let x=2;x<d.size-2;x+=2){
   const hash=(Math.imul(x+17,73856093)^Math.imul(y+31,19349663))>>>0,width=forest?260+hash%70:180+hash%60,px=x*d.cell+hash%55,py=y*d.cell+hash%45;
   let blocked=true;for(let row=Math.floor((py-width*.85)/d.cell);row<=Math.floor((py+width*.15)/d.cell);row++)for(let col=Math.floor((px-width/2)/d.cell);col<=Math.floor((px+width/2)/d.cell);col++)if(d.tiles[row]?.[col]!=='0')blocked=false;
   if(!blocked)continue;const index=forest?(hash%7===0?8:hash%3):natural?4+hash%3:hash%3===0?13:7;
   if(!natural&&hash%4!==0)continue;prop(c,props,index,px,py,width);
  }
  renderer.citadelLayer={id:d.id,loaded,canvas};
 }
 g.fillStyle='#1a241d';g.fillRect(-5000,-5000,16000,16000);g.drawImage(renderer.citadelLayer.canvas,0,0,world,world);
 for(const trap of b.traps||[]){g.strokeStyle='#ae789c';g.lineWidth=3;g.beginPath();g.arc(trap.x,trap.y,42,0,Math.PI*2);g.stroke();}
 if(b.exit&&b.status!=='won'){const {x,y}=b.exit;g.save();g.strokeStyle=b.exitOpen?'#9ce9c9':'#9987a4';g.lineWidth=5;g.beginPath();g.ellipse(x,y,95,45,0,0,Math.PI*2);g.stroke();if(ready(props))prop(g,props,d.biome===1?15:14,x,y,220);g.restore();}
}
export function drawCitadelMap(g,b,player){
 const d=b.dungeon;if(!d)return;const size=132,x=850,y=18,s=size/d.size;g.save();g.fillStyle='#121b20cc';g.fillRect(x-7,y-7,size+14,size+14);g.fillStyle='#92917a';for(let row=0;row<d.size;row++)for(let col=0;col<d.size;col++)if(dungeonFloorTile(d.tiles[row][col]))g.fillRect(x+col*s,y+row*s,s+.2,s+.2);
 const dot=(p,color,r)=>{g.fillStyle=color;g.beginPath();g.arc(x+p.x/(d.size*d.cell)*size,y+p.y/(d.size*d.cell)*size,r,0,Math.PI*2);g.fill();};
 if(b.exit)dot(b.exit,b.exitOpen?'#e9d98b':'#8b789c',3);for(const ally of b.allies||[])dot(ally,'#7ccfd7',2.5);dot(player,'#fff',3);g.restore();
}
