// Painted boss art and exact warning geometry, without large rune textures.
export const finalRaidArt=(tier,kind)=>`tower/${kind==='map'?'raid-map-'+tier:'raid-boss-'+tier+'-portrait'}-v2.webp`;
const FINAL_VISUALS={
 4:{light:'#e9d4ff',glow:'#ae64ff',size:460,lift:15},
 5:{light:'#fff4c9',glow:'#ffc355',size:510,lift:8},
 6:{light:'#fff0be',glow:'#ff7836',size:650,lift:0},
};
export const raidBossSource=tier=>Number(tier)>=4?finalRaidArt(tier,'boss'):'tower/'+(Number(tier)===2?'boss-raid-2-v2':'boss-raid-'+tier)+'.webp';
const clamp=n=>Math.max(0,Math.min(1,n));
export function drawFinalRaidBoss(g,im,tier,enemy,time,{casting,attacking,hurt,attackStart,walk,moving,lowDetail}){
 const look=FINAL_VISUALS[tier],breath=Math.sin(time*.23),stride=moving?Math.sin(walk*.65):0;
 const pulse=attacking?Math.sin(Math.PI*clamp((time-attackStart)/6)):0;
 const lift=look.lift*(1+breath*.35)+Math.abs(stride)*6;
 const aspect=im.naturalWidth/im.naturalHeight;
 const width=look.size*Math.min(1,aspect),height=width/aspect;
 g.save();
 g.translate(enemy.x,enemy.y-lift);
 g.rotate(stride*.028+(casting?-.018:pulse*.06));
 g.scale(1+breath*.012+(casting?.022:0),1+breath*.018-pulse*.035);
 if(casting&&!lowDetail){g.shadowColor=look.glow;g.shadowBlur=16;}
 if(hurt)g.globalAlpha=.92;
 g.drawImage(im,-width/2,-height,width,height);
 g.restore();
}
export function drawFinalRaidJudgment(g,tier,enemy,time,at,roaring){
 const age=time-at,look=FINAL_VISUALS[tier];
 if(!look||!Number.isFinite(age)||age<0||age>=12)return;
 const progress=age/12;
 g.save();g.translate(enemy.x,enemy.y);
 g.strokeStyle=look.glow;g.lineWidth=roaring?42:24;
 for(let i=0;i<(roaring?3:2);i++){
  const wave=progress-i*.14;
  if(wave<0)continue;
  g.globalAlpha=(1-progress)*.55;g.beginPath();g.arc(0,0,130+wave*3600,0,Math.PI*2);g.stroke();
 }
 g.restore();
}
function finalRaidGround(g,h,time,progress,look){
 const active=time>=h.at;
 if(h.basic)return;
 g.save();
 g.translate(h.x,h.y);
 g.strokeStyle=look.glow;
 g.fillStyle=look.light;
 g.globalAlpha=active?.8:.3+progress*.35;
 g.lineWidth=active?10:5;
 if(h.type==='line'){
  const length=Math.hypot(h.tx-h.x,h.ty-h.y);
  g.rotate(Math.atan2(h.ty-h.y,h.tx-h.x));
  g.beginPath();g.rect(0,-h.width/2,length,h.width);g.clip();
  if(active){
   const beam=g.createLinearGradient(0,-h.width/2,0,h.width/2);
   beam.addColorStop(0,look.glow+'00');beam.addColorStop(.5,look.light);beam.addColorStop(1,look.glow+'00');
   g.fillStyle=beam;g.fillRect(0,-h.width/2,length,h.width);
  }
  g.beginPath();
  for(let x=50+(time*28)%220;x<length;x+=220){
   const w=h.width*(h.label==='용의 숨결'?.34:.23);
   g.moveTo(x-32,-w);g.lineTo(x+22,0);g.lineTo(x-32,w);
  }
  g.stroke();
 }else{
  const radius=h.r>=3200?h.inner||0:h.r;
  if(radius){
   g.setLineDash([18,25]);g.beginPath();g.arc(0,0,radius-12,time*.08,time*.08+Math.PI*2);g.stroke();g.setLineDash([]);
  }
  if(h.share){
   // Inward arrows keep stack markers distinct from spread circles.
   g.strokeStyle='#8bf3ff';g.lineWidth=10;g.beginPath();g.arc(0,0,h.r-18,0,Math.PI*2);g.stroke();
   for(let i=0;i<4;i++){
    g.save();g.rotate(i*Math.PI/2);
    g.beginPath();g.moveTo(h.r*.66,-27);g.lineTo(h.r*.42,0);g.lineTo(h.r*.66,27);g.stroke();g.restore();
   }
  }
  if(h.label==='성검 낙하'||h.label?.startsWith('분담 운석')){
   const height=(1-progress)*h.r*1.4;
   g.translate(0,-height);
   g.beginPath();
   if(h.share){
    g.moveTo(0,55);g.lineTo(-56,0);g.lineTo(-20,-62);g.lineTo(46,-46);g.lineTo(65,16);
   }else{
    g.moveTo(0,66);g.lineTo(-14,34);g.lineTo(-14,-36);g.lineTo(-43,-36);
    g.lineTo(-43,-48);g.lineTo(-7,-48);g.lineTo(-7,-77);g.lineTo(7,-77);
    g.lineTo(7,-48);g.lineTo(43,-48);g.lineTo(43,-36);g.lineTo(14,-36);g.lineTo(14,34);
   }
   g.closePath();g.fill();g.stroke();
  }
 }
 g.restore();
}
// Keep the full party's damage visible in a small number of totals.
export function raidDamageRows(numbers,time,limit=8){
 const active=numbers.filter(n=>n.end>time&&n.kind!=='incoming'&&n.kind!=='heal').sort((a,b)=>a.start-b.start||a.id-b.id);
 const size=Math.max(1,Math.ceil(active.length/limit)),rows=[];
 for(let i=0;i<active.length;i+=size){
  const hits=active.slice(i,i+size),last=hits.at(-1);
  rows.push({...last,value:hits.reduce((sum,n)=>sum+n.value,0),end:Math.max(...hits.map(n=>n.end)),kind:hits.some(n=>n.kind==='critical')?'critical':'outgoing'});
 }
 return rows;
}
export function raidDanger(room,tick=room.tick){
 const warnings=(room.hazards||[]).filter(h=>h.warningOnly&&tick<h.end);
 const h=warnings.sort((a,b)=>a.at-b.at)[0];
 return h?{label:h.label,seconds:Math.max(0,(h.at-tick)/10),kind:h.kind}:null;
}
export function drawRaidWarning(g,h,time,overlay=false,tier=null){
 if(overlay&&h.warningOnly)return;
 const active=time>=h.at,progress=clamp((time-(h.start??h.at-12))/Math.max(1,h.at-(h.start??h.at-12)));
 g.save();g.lineWidth=active?8:h.basic?6:8;g.strokeStyle=active?'#fff0b9':h.basic?'#ffab86':'#ff4158';
 g.fillStyle=h.warningOnly?'#c91f3b18':active?'#ff453e85':h.basic?'#ff594b55':'#e51d4355';
 let labelX=h.x,labelY=h.y;
 if(h.type==='line'){
  const angle=Math.atan2(h.ty-h.y,h.tx-h.x),len=Math.hypot(h.tx-h.x,h.ty-h.y);
  g.save();g.translate(h.x,h.y);g.rotate(angle);if(!overlay)g.fillRect(0,-h.width/2,len,h.width);g.strokeRect(0,-h.width/2,len,h.width);
  if(!overlay){g.fillStyle='#ff9f8755';g.fillRect(0,-h.width/2,len*progress,h.width);}g.restore();labelX=(h.x+h.tx)/2;labelY=(h.y+h.ty)/2;
 }else{
  g.beginPath();g.arc(h.x,h.y,h.r,0,Math.PI*2);
  if(h.inner){g.moveTo(h.x+h.inner,h.y);g.arc(h.x,h.y,h.inner,0,Math.PI*2,true);}
  if(!overlay)g.fill('evenodd');g.stroke();
  if(h.r<3200){g.beginPath();g.arc(h.x,h.y,h.r,-Math.PI/2,-Math.PI/2+progress*Math.PI*2);g.strokeStyle='#fff0c0';g.lineWidth=8;g.stroke();}
  if(h.inner){g.beginPath();g.arc(h.x,h.y,h.inner,0,Math.PI*2);g.strokeStyle='#b5ffcf';g.lineWidth=6;g.stroke();}
 }
 if(!overlay&&FINAL_VISUALS[tier])finalRaidGround(g,h,time,progress,FINAL_VISUALS[tier]);
 if(overlay&&!h.warningOnly&&h.r!==4500){
  const text=(h.label||'강력 공격')+(active?'':' '+Math.max(0,(h.at-time)/10).toFixed(1)+'초');
  g.font='bold 36px system-ui';g.textAlign='center';g.lineWidth=7;g.strokeStyle='#280d18';g.fillStyle='#fff0ed';g.strokeText(text,labelX,labelY);g.fillText(text,labelX,labelY);
 }
 g.restore();
}
export function drawRaidShotWarning(g,q,time){
 if(q.side!=='enemy'||time>=q.at)return;
 const length=720,angle=Math.atan2(q.dy,q.dx);g.save();g.translate(q.x,q.y);g.rotate(angle);
 g.strokeStyle='#ff415899';g.fillStyle='#ff415870';g.lineWidth=6;g.setLineDash([24,18]);g.beginPath();g.moveTo(65,0);g.lineTo(length,0);g.stroke();g.setLineDash([]);
 g.beginPath();g.moveTo(length+20,0);g.lineTo(length-16,-16);g.lineTo(length-16,16);g.closePath();g.fill();g.restore();
}
export function drawRaidProjectile(g,q,x,y,tier,time){
 const look=FINAL_VISUALS[tier];
 if(look){
  const r=q.r||34;
  g.save();g.translate(x,y);g.rotate(Math.atan2(q.dy,q.dx));
  g.fillStyle=look.glow+'88';g.beginPath();g.moveTo(-r*2.5,0);g.lineTo(0,-r*.65);g.lineTo(0,r*.65);g.fill();
  g.fillStyle=look.light;g.beginPath();
  if(tier===4){
   const wing=r*(.65+.25*Math.sin(time*2+q.id));
   g.moveTo(-r*.45,0);g.bezierCurveTo(r,-wing*1.8,r*.95,-wing*.5,r*.4,0);
   g.bezierCurveTo(r*.95,wing*.5,r,wing*1.8,-r*.45,0);
  }else{
   g.moveTo(r,0);g.lineTo(0,-r*.67);g.lineTo(-r,0);g.lineTo(-r*.2,r*.7);
  }
  g.closePath();g.fill();g.restore();return;
 }
 const r=q.r||34;g.save();g.lineCap='round';g.lineWidth=r*.9;g.strokeStyle='#ff3e5870';
 g.beginPath();g.moveTo(x-q.dx*.8,y-q.dy*.8);g.lineTo(x,y);g.stroke();
 g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fillStyle='#ff354ed9';g.fill();g.lineWidth=4;g.strokeStyle='#ffd6c0';g.stroke();
 g.beginPath();g.arc(x,y,r*.35,0,Math.PI*2);g.fillStyle='#fff1cd';g.fill();g.restore();
}
