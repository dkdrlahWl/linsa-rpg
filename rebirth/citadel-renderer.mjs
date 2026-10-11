// Dark Citadel terrain: crisp 16 px pixel-art tiles drawn procedurally per biome,
// three-quarter wall faces, prop sprites for free-standing obstacles and baked
// torch light. One 1024×1024 layer per region; drawn with smoothing disabled.
import {dungeonFloorTile} from './exploration-dungeon.mjs';
const T=16;
const hex=c=>{const n=parseInt(c.slice(1),16);return [(n>>16)&255,(n>>8)&255,n&255];};
const PAL=[
 {name:'forest',void:'#13241a',room:['#4f7a3a','#5c8a42','#456c33','#6e9e4c'],path:['#8a6f48','#7b623f','#9a7d52','#6b5536'],top:['#1d3a24','#24472b','#2c5533'],face:['#2c5533','#386b3c','#4c8547'],cap:'#5c9a52',mortar:'#14281a',accent:'#f2d45c',accent2:'#e86a8a',trunk:['#4a3220','#5a3d26','#6e4b2e'],outdoor:true,light:0},
 {name:'cave',void:'#0e0f13',room:['#4a4542','#534d49','#403b39','#5d5651'],path:['#57504a','#4d4741','#625a53','#433d38'],top:['#1d1c21','#24232a','#2a2930'],face:['#3d3a42','#4a4650','#575360'],cap:'#6b6675',mortar:'#1a191e',accent:'#71c0c6',accent2:'#b6f3f6',light:.42},
 {name:'temple',void:'#150f19',room:['#6b5470','#5e4a63','#3e2f43','#806785'],path:['#574459','#4d3c50','#634e66','#3a2c3d'],top:['#211a26','#2a2030','#30253a'],face:['#4c3e54','#5a4a62','#6a5873'],cap:'#7a6884',mortar:'#2f2536',accent:'#f0b35a',accent2:'#ffe2a0',light:.3},
 {name:'crypt',void:'#0c1016',room:['#4f5a6b','#465061','#2d3541','#5f6b7d'],path:['#3e4757','#363f4d','#465062','#2a313c'],top:['#151b23','#1c232d','#212935'],face:['#323c4a','#3a4554','#465264'],cap:'#56637a',mortar:'#222a35',accent:'#e8d58a',accent2:'#d9d2bd',light:.45},
 {name:'prison',void:'#0d1410',room:['#46574c','#3e4d43','#27322b','#55685b'],path:['#4b5148','#43483f','#545a50','#363b33'],top:['#161e19','#1d2620','#222c25'],face:['#34413a','#3c4a40','#485749'],cap:'#55665a',mortar:'#222b25',accent:'#5e7a3e',accent2:'#8a8f94',light:.45},
 {name:'barracks',void:'#170f12',room:['#7a5634','#6b4b2e','#3f2a19','#8c6540'],path:['#77706a','#6a635d','#45403c','#857d76'],top:['#231719','#2b1e22','#33242a'],face:['#5e322b','#6e3b32','#7e463b'],cap:'#8a5a4b',mortar:'#3a2420',accent:'#b03a2e',accent2:'#e6c27a',light:.25},
 {name:'royal',void:'#1b2a1a',room:['#5f8a45','#6b9a4c','#557d3e','#78a858'],path:['#b3a58c','#a39478','#6e6352','#c2b59c'],top:['#4a5a7a','#3e4c68','#56688a'],face:['#b5a585','#c9b99a','#d8caa9'],cap:'#e3d7b8',mortar:'#7d725d',accent:'#e86a8a',accent2:'#f2d45c',outdoor:true,light:0},
 {name:'corridor',void:'#07060d',room:['#2f2a45','#28243c','#1a1729','#38325a'],path:['#34304f','#2c2843','#3c375a','#211d33'],top:['#0d0b17','#120f1f','#161326'],face:['#231e37','#2a2440','#332c4e'],cap:'#3d3560',mortar:'#151225',accent:'#8580df',accent2:'#c4b8ff',light:.5},
];
const RGB=PAL.map(p=>Object.fromEntries(Object.entries(p).map(([k,v])=>[k,Array.isArray(v)?v.map(x=>typeof x==='string'?hex(x):x):typeof v==='string'&&v.startsWith('#')?hex(v):v])));
const hash=(x,y,s=0)=>{let h=Math.imul(x+374761393*s,668265263)^Math.imul(y+s,2246822519);h=Math.imul(h^(h>>>13),3266489917);return ((h^(h>>>16))>>>0)/4294967296;};
const isFloor=t=>dungeonFloorTile(t);
// Smooth value noise so large surfaces read as patches, not static.
const smooth=t=>t*t*(3-2*t);
function vnoise(x,y,size,seed){const gx=Math.floor(x/size),gy=Math.floor(y/size),fx=smooth(x/size-gx),fy=smooth(y/size-gy);const a=hash(gx,gy,seed),b=hash(gx+1,gy,seed),c=hash(gx,gy+1,seed),d=hash(gx+1,gy+1,seed);return (a*(1-fx)+b*fx)*(1-fy)+(c*(1-fx)+d*fx)*fy;}
const texture=(px,py,seed)=>vnoise(px,py,10,seed)*.62+vnoise(px,py,3,seed+1)*.25+hash(px>>1,py>>1,seed+2)*.13;
// Small solid groups surrounded by floor become prop sprites instead of walls.
function solidGroups(d){
 const n=d.size,id=new Int32Array(n*n).fill(-1),groups=[];
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){if(isFloor(d.tiles[y][x])||id[y*n+x]>=0)continue;const cells=[],q=[[x,y]];id[y*n+x]=groups.length;let edge=false;
  while(q.length){const [cx,cy]=q.pop();cells.push([cx,cy]);if(cx<=1||cy<=1||cx>=n-2||cy>=n-2)edge=true;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=cx+dx,ny=cy+dy;if(nx<0||ny<0||nx>=n||ny>=n)continue;if(!isFloor(d.tiles[ny][nx])&&id[ny*n+nx]<0){id[ny*n+nx]=groups.length;q.push([nx,ny]);}}}
  let x0=n,x1=0,y0=n,y1=0;for(const [cx,cy] of cells){x0=Math.min(x0,cx);x1=Math.max(x1,cx);y0=Math.min(y0,cy);y1=Math.max(y1,cy);}
  groups.push({cells,edge,size:cells.length,x0,x1,y0,y1});}
 return {id,groups};
}
function paintPixels(d,P,pixels,propOf,buildingOf){
 const n=d.size,W=n*T,tile=(x,y)=>d.tiles[y]?.[x]??'0',floorAt=(x,y)=>isFloor(tile(x,y));
 const put=(i,c,k=1)=>{pixels[i*4]=c[0]*k;pixels[i*4+1]=c[1]*k;pixels[i*4+2]=c[2]*k;pixels[i*4+3]=255;};
 for(let ty=0;ty<n;ty++)for(let tx=0;tx<n;tx++){
  const t=tile(tx,ty),floor=isFloor(t)||propOf(tx,ty),wallN=!floorAt(tx,ty-1)&&!propOf(tx,ty-1),wallW=!floorAt(tx-1,ty)&&!propOf(tx-1,ty);
  const face=!floor&&floorAt(tx,ty+1),building=buildingOf(tx,ty);
  for(let ly=0;ly<T;ly++)for(let lx=0;lx<T;lx++){
   const px=tx*T+lx,py=ty*T+ly,i=py*W+px,h=texture(px,py,P.seed),h2=hash(tx,ty,P.seed+7);let c,k=1;
   if(floor){
    const path=t==='1',pal=path?P.path:P.room;
    c=floorPattern(P,path,lx,ly,tx,ty,px,py,h,h2,pal);
    if(wallN&&ly<4)k*=.55+ly*.11;if(wallW&&lx<2)k*=.75+lx*.1;
   }else if(building){c=buildingPattern(P,face,lx,ly,tx,ty,h);}
   else if(face)c=facePattern(P,lx,ly,tx,ty,h,h2);
   else c=topPattern(P,lx,ly,tx,ty,h,floorAt,px,py);
   put(i,c,k);
  }
 }
}
const dirt=(pal,h)=>h<.35?pal[3]:h<.55?pal[1]:h<.78?pal[0]:pal[2];
function floorPattern(P,path,lx,ly,tx,ty,px,py,h,h2,pal){
 const name=P.name;
 if(name==='forest'&&path)return dirt(pal,h);
 if(name==='forest'||(name==='royal'&&!path)){ // grass with sparse blades and flowers
  if(hash(px>>1,py>>1,P.seed+3)>.993&&vnoise(px,py,24,P.seed+4)>.55)return hash(px,py,9)>.5?P.accent:P.accent2;
  if(hash(px,py,P.seed+5)>.97&&ly%3!==0)return pal[2];
  return h<.38?pal[2]:h<.55?pal[0]:h<.72?pal[1]:pal[3];
 }
 if(name==='cave'){const c=h<.38?pal[2]:h<.6?pal[0]:h<.82?pal[1]:pal[3];return hash(px>>2,py>>2,P.seed+5)>.95&&h>.5?pal[3]:c;}
 if((name==='royal'||name==='barracks')&&path){ // cobbles
  const ox=(Math.floor(py/4)%2)*2,cx=(px+ox)%4,cy=py%4;if(cx===0||cy===0)return pal[2];return h<.45?pal[0]:h<.8?pal[1]:pal[3];
 }
 if(name==='barracks'){ // wooden planks
  const row=Math.floor(ly/4),seam=ly%4===0,end=(lx+row*5+Math.floor(h2*8))%16===0;if(seam||end)return pal[2];if((lx===2||lx===13)&&ly%4===2)return pal[2];return h<.5?pal[0]:h<.85?pal[1]:pal[3];
 }
 if(name==='temple'){ // polished 8 px tiles
  const gx=lx%8,gy=ly%8,checker=((lx>>3)+(ly>>3)+tx+ty)%2;if(gx===0||gy===0)return pal[2];if(gx===1||gy===1)return pal[3];return checker?(h<.75?pal[0]:pal[3]):(h<.75?pal[1]:pal[0]);
 }
 if(name==='corridor'){ // dark slabs with faint runes
  const gx=lx%8,gy=ly%8;if(gx===0||gy===0)return pal[2];if(h2>.86&&(lx===4||ly===11)&&lx>2&&lx<13&&ly>2&&ly<13)return P.accent;return h<.55?pal[0]:h<.9?pal[1]:pal[3];
 }
 // crypt / prison flagstones: irregular slabs per tile
 const split=4+Math.floor(h2*8),vertical=hash(tx,ty,P.seed+11)>.5;
 const grout=lx===0||ly===0||(vertical?lx===split&&ly>0:ly===split&&lx>0);
 if(grout)return pal[2];
 if(name==='prison'){if(vnoise(px,py,6,P.seed+13)>.78)return P.accent;if(h2<.08&&lx>3&&lx<12&&ly>4&&ly<11)return [46,74,82];}
 if(name==='crypt'&&h2>.94&&lx>4&&lx<11&&ly===7)return P.accent2;
 return h<.5?pal[0]:h<.88?pal[1]:pal[3];
}
function topPattern(P,lx,ly,tx,ty,h,floorAt,px,py){
 const name=P.name;
 if(name==='forest'){const leaf=vnoise(px,py,5,P.seed+2);return leaf<.4?P.top[0]:leaf<.7?P.top[1]:P.top[2];}
 if(name==='royal'){const leaf=vnoise(px,py,5,P.seed+2);return leaf<.45?[36,74,38]:leaf<.8?[47,94,47]:[63,122,58];}
 if(name==='cave'){const v=vnoise(px,py,6,P.seed+4);return v<.45?P.top[0]:v<.8?P.top[1]:P.top[2];}
 // masonry tops: flat dark with a rim where they meet floor sideways
 if((floorAt(tx-1,ty)&&lx===0)||(floorAt(tx+1,ty)&&lx===T-1)||(floorAt(tx,ty-1)&&ly===0))return P.face[2];
 return h<.6?P.top[1]:P.top[2];
}
function facePattern(P,lx,ly,tx,ty,h,h2){
 const name=P.name;
 if(name==='forest'){ // canopy edge then trunks (crowns are drawn over this)
  if(ly<8)return h<.5?P.face[0]:P.face[1];
  const trunk=(lx+Math.floor(h2*6))%8;if(trunk>=3&&trunk<=5)return trunk===5?P.trunk[0]:P.trunk[1+(h>.6?1:0)];return ly>13?P.top[0]:P.top[1];
 }
 if(ly<2)return ly===0?P.cap:P.face[2];
 if(name==='cave'){const v=(lx*7+Math.floor(h2*16))%5===0;return v?P.face[0]:ly>12?P.face[0]:h<.55?P.face[1]:P.face[2];}
 if(name==='royal')return ly>13?[30,58,30]:h<.45?[47,94,47]:h<.85?[58,112,57]:[79,138,69];
 // bricks 8×4, staggered
 const row=Math.floor((ly-2)/4),off=row%2?4:0;if((ly-2)%4===3||(lx+off)%8===7)return P.mortar;
 if(ly>13)return P.face[0];
 return h<.55?P.face[1]:h<.9?P.face[0]:P.face[2];
}
function buildingPattern(P,face,lx,ly,tx,ty,h){
 if(face){ // palace facade: cream stone with arched windows
  if(ly<2)return P.cap;const win=(tx%3===1)&&lx>=5&&lx<=10&&ly>=5&&ly<=12;if(win)return ly<7&&(lx===5||lx===10)?P.face[1]:[58,74,106];
  if((ly-2)%5===4)return P.mortar;return h<.65?P.face[1]:P.face[2];
 }
 // slate roof
 const row=Math.floor(ly/4),off=row%2?3:0;if(ly%4===3||(lx+off)%6===5)return [44,54,76];return h<.55?P.top[0]:h<.85?P.top[1]:P.top[2];
}
// ---- prop sprites (pixel rectangles on the 16 px grid) ----
function px(g,x,y,w,h,c){g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function crown(g,cx,cy,r,trunk){
 if(trunk){px(g,cx-2,cy+2,4,r,'#4a3220');px(g,cx-1,cy+2,1,r,'#6e4b2e');}
 g.fillStyle='#163020';g.beginPath();g.arc(cx,cy+1,r,0,7);g.fill();
 g.fillStyle='#24472b';g.beginPath();g.arc(cx-1,cy-1,r-2,0,7);g.fill();
 g.fillStyle='#386b3c';g.beginPath();g.arc(cx-3,cy-3,Math.max(2,r-5),0,7);g.fill();
 g.fillStyle='#4c8547';g.beginPath();g.arc(cx-4,cy-5,Math.max(1.5,r-8),0,7);g.fill();
}
function drawProp(g,P,group,d,random){
 const x=group.x0*T,y=group.y0*T,w=(group.x1-group.x0+1)*T,h=(group.y1-group.y0+1)*T,name=P.name;
 if(name==='forest'){crown(g,x+w/2,y+h/2-4,Math.max(w,h)*.55,true);return;}
 if(name==='royal'){
  if(Math.abs(group.x0+group.x1-64)<=1&&Math.abs(group.y0+group.y1-64)<=1){ // fountain at the centre crossing
   const cx=x+w/2,cy=y+h/2;g.fillStyle='#8f8572';g.beginPath();g.arc(cx,cy,w/2,0,7);g.fill();g.fillStyle='#5ab0d8';g.beginPath();g.arc(cx,cy,w/2-5,0,7);g.fill();
   for(let i=0;i<10;i++){const a=i*.63;px(g,cx+Math.cos(a)*(w/3),cy+Math.sin(a)*(h/3),2,1,'#bfe8f7');}
   px(g,cx-3,cy-8,6,12,'#c9b99a');px(g,cx-1,cy-12,2,4,'#e3f6ff');return;
  }
  for(const [cx,cy] of group.cells){const X=cx*T,Y=cy*T;px(g,X,Y+2,T,T-2,'#2f5e2f');px(g,X,Y,T,4,'#4f8a45');px(g,X,Y+T-3,T,3,'#1f401f');for(let i=0;i<6;i++)px(g,X+Math.floor(random()*14),Y+4+Math.floor(random()*8),2,2,random()<.5?'#3a7039':'#25502a');if(random()<.25)px(g,X+6,Y+1,2,2,'#e86a8a');}
  return;
 }
 if(name==='temple'||name==='corridor'||(d.boss&&(name==='crypt'||name==='barracks'||name==='prison'))){ // pillar
  const cx=x+w/2;px(g,x+1,y+h-3,w-2,3,'#00000088');px(g,cx-5,y-10,10,h+7,P.faceHex[1]);px(g,cx-5,y-10,2,h+7,P.faceHex[2]);px(g,cx+3,y-10,2,h+7,P.faceHex[0]);px(g,cx-7,y-13,14,4,P.capHex);px(g,cx-7,y+h-5,14,3,P.capHex);
  if(name==='corridor')px(g,cx-1,y-4,2,6,'#a99cff');return;
 }
 if(name==='crypt'){ // sarcophagus
  px(g,x+2,y+1,w-4,h-1,'#5f6b7d');px(g,x+3,y+2,w-6,3,'#7a879b');px(g,x+2,y+h-3,w-4,2,'#3a4554');px(g,x+w/2-1,y+4,2,7,'#d9d2bd');px(g,x+w/2-3,y+6,6,2,'#d9d2bd');return;
 }
 if(name==='barracks'){
  if(group.size===1){const cx=x+w/2;px(g,cx-1,y+3,2,13,'#6e4b2e');px(g,cx-5,y+6,10,2,'#6e4b2e');px(g,cx-3,y,6,8,'#c9a26b');px(g,cx-2,y+1,4,2,'#8a6a3e');return;} // training dummy
  px(g,x+1,y+2,w-2,h-3,'#4a3220');px(g,x+2,y+3,w-4,h-6,'#8a8f94');px(g,x+2,y+3,6,h-6,'#e6dfcc');px(g,x+9,y+3,w-11,h-6,'#7e2f28');px(g,x+1,y+h-3,w-2,2,'#2b1e22');return; // bunk
 }
 if(name==='prison'){px(g,x+2,y+2,w-4,h-3,'#2a312c');for(let i=x+3;i<x+w-2;i+=3)px(g,i,y+1,1,h-2,'#8a8f94');px(g,x+2,y+1,w-4,1,'#a8adb2');return;}
 if(name==='cave'){px(g,x+2,y+6,w-4,h-6,'#3d3a42');px(g,x+3,y+5,w-6,2,'#575360');for(let i=0;i<3;i++){const cx=x+3+i*4;px(g,cx,y+2+i%2*2,3,9,'#71c0c6');px(g,cx,y+2+i%2*2,1,9,'#b6f3f6');}return;}
 px(g,x+2,y+3,w-4,h-4,P.faceHex[1]);px(g,x+3,y+2,w-6,3,P.capHex);
}
function decorate(g,d,P,random){
 const n=d.size,tile=(x,y)=>d.tiles[y]?.[x]??'0',floorAt=(x,y)=>isFloor(tile(x,y));
 const glows=[];
 for(let ty=1;ty<n-1;ty++)for(let tx=1;tx<n-1;tx++){
  const X=tx*T,Y=ty*T,h=hash(tx,ty,P.seed+21);
  if(!floorAt(tx,ty)&&floorAt(tx,ty+1)){ // wall faces: torches, banners, cells, niches
   if(P.light&&h<.13&&tx%2===0){const flame=P.name==='corridor'?'#a99cff':P.name==='cave'?'#71c0c6':'#ffb347';px(g,X+7,Y+5,2,6,'#5a3d26');px(g,X+6,Y+3,4,3,flame);px(g,X+7,Y+2,2,2,'#fff2c0');glows.push([X+8,Y+4,P.name==='corridor'?'167,150,255':P.name==='cave'?'113,192,198':'255,170,80']);}
   else if(P.name==='barracks'&&h>.9){px(g,X+4,Y+3,8,10,'#b03a2e');px(g,X+4,Y+3,8,1,'#e6c27a');px(g,X+7,Y+6,2,4,'#e6c27a');}
   else if(P.name==='temple'&&h>.92){px(g,X+3,Y+3,10,10,'#3a2c3d');px(g,X+5,Y+5,6,6,'#806785');}
   else if(P.name==='prison'&&h>.88){for(let i=3;i<14;i+=3)px(g,X+i,Y+3,1,10,'#8a8f94');px(g,X+2,Y+3,12,1,'#a8adb2');}
   else if(P.name==='crypt'&&h>.9){px(g,X+4,Y+4,8,8,'#222a35');px(g,X+6,Y+6,4,3,'#d9d2bd');px(g,X+6,Y+7,1,1,'#222a35');px(g,X+9,Y+7,1,1,'#222a35');}
  }
  if(!floorAt(tx,ty))continue;
  if(P.name==='forest'&&h>.94){px(g,X+3+Math.floor(h*90)%9,Y+6,1,3,'#2c5533');px(g,X+5+Math.floor(h*70)%7,Y+9,1,2,'#2c5533');}
  if(P.name==='crypt'&&h>.965){px(g,X+4,Y+9,7,2,'#d9d2bd');px(g,X+4,Y+8,2,2,'#d9d2bd');px(g,X+9,Y+10,2,2,'#d9d2bd');}
  if(P.name==='cave'&&h>.96)px(g,X+5,Y+8,4,3,'#625a53');
  if(P.name==='temple'&&h>.985){px(g,X+6,Y+8,4,6,'#3a2c3d');px(g,X+7,Y+5,2,3,'#f0b35a');glows.push([X+8,Y+6,'240,179,90']);}
  if(P.name==='corridor'&&h>.975){px(g,X+7,Y+7,2,2,'#c4b8ff');glows.push([X+8,Y+8,'133,128,223']);}
  if(P.name==='barracks'&&h>.985&&!floorAt(tx,ty-1)){px(g,X+3,Y+1,10,8,'#6b4b2e');px(g,X+3,Y+1,10,2,'#8c6540');px(g,X+3,Y+4,10,1,'#3f2a19');}
  if(P.name==='royal'&&tile(tx,ty)==='2'&&h>.97){px(g,X+6,Y+6,3,3,'#f2d45c');px(g,X+7,Y+7,1,1,'#e86a8a');}
 }
 // Outdoor regions: tree crowns over the woodland, drawn top to bottom.
 if(P.name==='forest'||P.name==='royal'){
  for(let ty=1;ty<n-1;ty++)for(let tx=1;tx<n-1;tx++){
   if(floorAt(tx,ty))continue;
   if(P.name==='royal'&&!(tx<4||ty<4||tx>n-5||ty>n-5))continue;
   let nearFloor=false;for(let yy=ty-2;yy<=ty+2&&!nearFloor;yy++)for(let xx=tx-2;xx<=tx+2;xx++)if(floorAt(xx,yy)){nearFloor=true;break;}
   if(!nearFloor&&hash(tx,ty,P.seed+33)>.35)continue;
   const h=hash(tx,ty,P.seed+31),cx=tx*T+8+Math.round((h-.5)*6),cy=ty*T+7+Math.round((hash(ty,tx,P.seed+32)-.5)*6),r=9+Math.floor(h*4);
   crown(g,cx,cy,r,floorAt(tx,ty+1));
  }
 }
 g.save();g.globalCompositeOperation='lighter';
 for(const [x,y,rgb] of glows){const gr=g.createRadialGradient(x,y,1,x,y,40);gr.addColorStop(0,'rgba('+rgb+',.28)');gr.addColorStop(1,'rgba('+rgb+',0)');g.fillStyle=gr;g.fillRect(x-40,y-40,80,80);}
 g.restore();
}
export function buildCitadelLayer(d){
 const P={...(RGB[d.biome]||RGB[0]),seed:(d.biome+1)*977};const src=PAL[d.biome]||PAL[0];
 P.faceHex=src.face;P.capHex=src.cap;P.mortarHex=src.mortar;
 const n=d.size,W=n*T,canvas=document.createElement('canvas');canvas.width=canvas.height=W;const g=canvas.getContext('2d');
 const {id,groups}=solidGroups(d);
 const propLimit=P.name==='royal'?12:6;
 const isProp=gi=>gi>=0&&!groups[gi].edge&&groups[gi].size<=propLimit;
 const isBuilding=gi=>gi>=0&&P.name==='royal'&&!groups[gi].edge&&groups[gi].size>propLimit;
 const propOf=(x,y)=>x>=0&&y>=0&&x<n&&y<n&&isProp(id[y*n+x]);
 const buildingOf=(x,y)=>x>=0&&y>=0&&x<n&&y<n&&isBuilding(id[y*n+x]);
 const image=g.createImageData(W,W);paintPixels(d,P,image.data,propOf,buildingOf);g.putImageData(image,0,0);
 let state=(d.biome*2654435761^n)>>>0;const random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
 decorate(g,d,P,random);
 groups.map((gr,i)=>({gr,i})).filter(({i})=>isProp(i)).sort((a,b)=>a.gr.y1-b.gr.y1).forEach(({gr})=>drawProp(g,P,gr,d,random));
 return canvas;
}
export const citadelVoid=biome=>PAL[biome]?.void||'#101010';
export function drawCitadelWorld(renderer,b,image){
 const d=b.dungeon;if(!d)return;const g=renderer.g,world=d.size*d.cell;
 if(renderer.citadelLayer?.id!==d.id)renderer.citadelLayer={id:d.id,canvas:buildCitadelLayer(d)};
 g.save();g.imageSmoothingEnabled=false;g.fillStyle=citadelVoid(d.biome);g.fillRect(-4000,-4000,world+8000,world+8000);g.drawImage(renderer.citadelLayer.canvas,0,0,world,world);g.restore();
 const t=(b.tick||0)/10;
 for(const trap of b.traps||[]){g.save();const s=6.25,x=Math.round(trap.x/s)*s,y=Math.round(trap.y/s)*s;g.fillStyle='#2a2430';g.fillRect(x-40,y-40,80,80);g.fillStyle='#55505e';g.fillRect(x-34,y-34,68,68);g.fillStyle='#c9c3d6';for(let i=-2;i<=2;i++)for(let j=-2;j<=2;j++)if((i+j)%2===0)g.fillRect(x+i*13-3,y+j*13-3,6,6);g.restore();}
 if(b.exit&&b.status!=='won'){const {x,y}=b.exit,open=b.exitOpen;g.save();
  for(let i=0;i<5;i++){g.fillStyle=['#1a1620','#2a2430','#3a3342','#4a4352','#5a5262'][i];g.fillRect(x-70+i*6,y-50+i*20,140-i*12,22);}
  if(open){const pulse=.55+.25*Math.sin(t*3);g.globalCompositeOperation='lighter';const gr=g.createRadialGradient(x,y,10,x,y,160);gr.addColorStop(0,'rgba(156,233,201,'+pulse*.55+')');gr.addColorStop(1,'rgba(156,233,201,0)');g.fillStyle=gr;g.fillRect(x-160,y-160,320,320);}
  g.globalCompositeOperation='source-over';g.strokeStyle=open?'#9ce9c9':'#7a6a88';g.lineWidth=6;g.strokeRect(x-76,y-56,152,112);g.restore();}
}
// Screen-space ambience for dark regions: a soft light pool around the player.
export function drawCitadelAmbience(g,b,height,scale){
 const P=PAL[b.dungeon?.biome];if(!P||!P.light)return;
 const cx=500,cy=height/2+85*scale,r=Math.max(1000,height)*.75;
 const gr=g.createRadialGradient(cx,cy,r*.18,cx,cy,r);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(0,0,0,'+P.light+')');
 g.save();g.fillStyle=gr;g.fillRect(0,0,1000,height);g.restore();
}
let miniCache=null;
export function drawCitadelMap(g,b,player){
 const d=b.dungeon;if(!d)return;const size=140,x=846,y=16;
 if(miniCache?.id!==d.id){const c=document.createElement('canvas');c.width=c.height=d.size;const m=c.getContext('2d');m.fillStyle='#0b0f14';m.fillRect(0,0,d.size,d.size);for(let row=0;row<d.size;row++)for(let col=0;col<d.size;col++)if(dungeonFloorTile(d.tiles[row][col])){m.fillStyle=d.tiles[row][col]==='1'?'#8f8a72':'#b9b394';m.fillRect(col,row,1,1);}miniCache={id:d.id,canvas:c};}
 g.save();g.fillStyle='#0b0f14d9';g.fillRect(x-6,y-6,size+12,size+12);g.strokeStyle='#b0a378';g.lineWidth=2;g.strokeRect(x-6,y-6,size+12,size+12);g.imageSmoothingEnabled=false;g.globalAlpha=.9;g.drawImage(miniCache.canvas,x,y,size,size);g.globalAlpha=1;
 const dot=(p,color,r)=>{g.fillStyle=color;g.beginPath();g.arc(x+p.x/(d.size*d.cell)*size,y+p.y/(d.size*d.cell)*size,r,0,Math.PI*2);g.fill();};
 for(const e of b.monsters||[])if(e.hp>0&&e.boss)dot(e,'#ff6b5e',3.5);
 if(b.exit)dot(b.exit,b.exitOpen?'#9ce9c9':'#8b789c',4);for(const ally of b.allies||[])dot(ally,'#7ccfd7',2.5);dot(player,'#fff',3.2);g.restore();
}
