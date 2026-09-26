import assert from 'node:assert/strict';
import {drawFourth} from './fourth-effects.mjs';
// Canvas rejects negative ellipse radii and aborts the animation frame.
const g=new Proxy({}, {get:(_,key)=>key==='ellipse'?((x,y,rx,ry)=>{assert.ok(Number.isFinite(rx)&&rx>=0);assert.ok(Number.isFinite(ry)&&ry>=0);}):()=>{}});
for(const classId of ['warrior','rogue','mage','archer','pirate']){
 for(let time=0;time<12;time+=.1)drawFourth(g,{classId,orbit:['warrior','rogue'].includes(classId),x:0,y:0,size:1440,start:0,impact:0,end:8,pulse:0},time,{x:0,y:0});
}
console.log('PASS all five fourth skills: no invalid radii throughout wave effect lifetime');
