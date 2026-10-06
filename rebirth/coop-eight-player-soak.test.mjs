import assert from 'node:assert/strict';
import {startCoop,advanceCoop,coopClientView} from './coop-model.mjs';

const classes=['warrior','mage','archer','rogue','pirate','priest','warrior','priest'];
let packets=0,peakBytes=0,peakPoints=0;
const began=performance.now();
// Twenty five-minute fights, all four raids. Delayed, duplicated and reordered
// packets retain each player's ten-Hz input; no timing-dependent combat rules.
for(let round=0;round<20;round++){
  const seed=startCoop({id:'repeat-'+round,owner:'p0',mode:'raid',tier:round%4,status:'waiting',members:classes.map((classId,i)=>({id:'p'+i,classId,advanced:true,power:{attack:1,hp:100000,defense:1e9,boss:1,crit:.3,critDamage:1.6,cadence:1,firstJob:true,advancement:4,level:200}}))},0);
  seed.entryWaiting=false;seed.members.forEach((m,i)=>Object.assign(m,{entryMoved:true,x:1350+i%4*150,y:1400+Math.floor(i/4)*150}));
  let server=seed,previousTick=0;
  const all=Array.from({length:3000},(_,tick)=>classes.map((_,i)=>({user:'p'+i,tick,input:[tick%80<40?.1:-.1,i%2?.1:0,1|(tick%120===0?8:0)|(tick%180===0?2:0)|(tick%250===0?16:0)|(tick%320===0?32:0)|(tick%420===0?64:0)]}))).flat();
  for(let tick=6;tick<=3000;tick+=6){
    const arrived=[];
    for(let i=0;i<8;i++){
      const delay=3+(i+round)%9; // 0.3–1.1 seconds.
      arrived.push(...all.slice(Math.max(0,tick-delay-12)*8,Math.max(0,tick-delay)*8).filter(f=>f.user==='p'+i));
    }
    server=advanceCoop({...server,_queuedInputs:[...arrived.reverse(),...arrived.slice(0,4)]},'p0',{frames:[]},tick*100);packets+=8;
    assert.ok(server.tick>=previousTick,'simulation cannot stall/regress');previousTick=server.tick;
    if(server._net){
      peakPoints=Math.max(peakPoints,server._net.points.length);
      assert.ok(server._net.points.length<=6);assert.ok(server._net.frames.length<=8*46);
      if(tick%300===0){const bytes=JSON.stringify(server).length;peakBytes=Math.max(peakBytes,bytes);assert.ok(bytes<500000,'history stays bounded');}
    }
    if(server.status!=='fighting')break;
  }
  // Every raid reaches its five-minute cap after repeated late input replays.
  const view=coopClientView({...server,me:'p0'},2);
  assert.equal(view._net,undefined);assert.equal(view._queuedInputs,undefined);
  assert.ok(['fighting','lost','won'].includes(server.status));
  assert.equal(server.status,'lost');assert.equal(server.tick,3000);
}
console.log('PASS 8 players × 20 full raids (100 simulated minutes), delayed/duplicate/reordered packets and bounded history', {packets,peakPoints,peakBytes,seconds:((performance.now()-began)/1000).toFixed(2)});
