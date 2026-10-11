import {startCoop,advanceCoop,coopClientView} from './coop-model.mjs';
import {explorationFloor,EXPLORATIONS} from './exploration-data.mjs';
for(const tier of [0,2]){for(const floor of [1,EXPLORATIONS[tier].floors]){
 let w=startCoop({id:'soak',owner:'p0',mode:'exploration',tier,status:'waiting',members:['warrior','mage','archer','priest'].map((classId,i)=>({id:'p'+i,classId,advanced:true,power:{attack:1,hp:1e12,defense:1e9,boss:1,crit:.3,critDamage:1.6,cadence:1,firstJob:true,advancement:4,level:200}}))},0);
 w.entryWaiting=false;w.floor=floor;explorationFloor(w);for(const e of w.monsters){e.hp*=1000;e.maxHp*=1000;}w.floorDeadline=1e9;
 for(const [i,m] of w.members.entries()){m.entryMoved=true;}
 let peakView=0,peakStore=0,worst=0,total=0,n=0;
 for(let tick=6;tick<=900;tick+=6){
  const frames=[];for(let i=0;i<4;i++){const delay=[2,5,8,11][i];for(let t=Math.max(0,tick-delay-12);t<tick-delay;t++)frames.push({user:'p'+i,tick:t,input:[Math.sin(t/20+i),Math.cos(t/25+i),1|(t%60===0?122:0)]});}
  const t0=performance.now();w=advanceCoop({...w,_queuedInputs:frames},'p0',{frames:[]},tick*100);const dt=performance.now()-t0;worst=Math.max(worst,dt);total+=dt;n++;
  const store=JSON.stringify(w).length;peakStore=Math.max(peakStore,store);
  const view=JSON.stringify(coopClientView({...w,me:'p0'},2)).length;peakView=Math.max(peakView,view);
 }
 console.log({tier,floor,avgMs:(total/n).toFixed(1),worstMs:worst.toFixed(1),peakStoreKB:(peakStore/1024).toFixed(0),peakViewKB:(peakView/1024).toFixed(0),points:w._net.points.length,dungeonKB:(JSON.stringify(w.dungeon).length/1024).toFixed(0)});
}}
{
 let w=startCoop({id:'soak',owner:'p0',mode:'exploration',tier:2,status:'waiting',members:['warrior','mage','archer','priest'].map((classId,i)=>({id:'p'+i,classId,advanced:true,power:{attack:1,hp:1e12,defense:1e9,boss:1,crit:.3,critDamage:1.6,cadence:1,firstJob:true,advancement:4,level:200}}))},0);
 w.entryWaiting=false;w.floor=12;explorationFloor(w);for(const e of w.monsters){e.hp*=1000;e.maxHp*=1000;}w.floorDeadline=1e9;
 for(let tick=6;tick<=300;tick+=6){const frames=[];for(let i=0;i<4;i++)for(let t=Math.max(0,tick-14);t<tick-2;t++)frames.push({user:'p'+i,tick:t,input:[Math.sin(t/20+i),Math.cos(t/25+i),1|(t%60===0?122:0)]});w=advanceCoop({...w,_queuedInputs:frames},'p0',{frames:[]},tick*100);}
 const sz=o=>JSON.stringify(o)?.length||0;
 console.log('top-level',Object.entries(w).map(([k,v])=>[k,sz(v)]).sort((a,b)=>b[1]-a[1]).slice(0,10));
 console.log('net',{points:sz(w._net.points),frames:sz(w._net.frames),perPoint:sz(w._net.points[0]),nframes:w._net.frames.length});
 const p=w._net.points[0];console.log('point keys',Object.entries(p).map(([k,v])=>[k,sz(v)]).sort((a,b)=>b[1]-a[1]).slice(0,8));
 console.log('member',sz(w.members[0]),Object.entries(w.members[0]).map(([k,v])=>[k,sz(v)]).sort((a,b)=>b[1]-a[1]).slice(0,6));
 console.log('monster',sz(w.monsters[0]),w.monsters.length);
}
