// Painted boss art and exact warning geometry, without large rune textures.
export const raidBossSource=tier=>'tower/'+(Number(tier)===2?'raid-boss-2-portrait':'boss-raid-'+tier)+'.webp';
const clamp=n=>Math.max(0,Math.min(1,n));
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
export function drawRaidWarning(g,h,time,overlay=false){
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
export function drawRaidProjectile(g,q,x,y){
 const r=q.r||34;g.save();g.lineCap='round';g.lineWidth=r*.9;g.strokeStyle='#ff3e5870';
 g.beginPath();g.moveTo(x-q.dx*.8,y-q.dy*.8);g.lineTo(x,y);g.stroke();
 g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fillStyle='#ff354ed9';g.fill();g.lineWidth=4;g.strokeStyle='#ffd6c0';g.stroke();
 g.beginPath();g.arc(x,y,r*.35,0,Math.PI*2);g.fillStyle='#fff1cd';g.fill();g.restore();
}
