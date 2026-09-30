import {drawPriestSkillArt,preparePriestSkillArt} from './priest-skill-art.mjs?v=priest-perf-86';
const overlays=new WeakMap();
export function playHolyOverlay(arena,slot){
  void preparePriestSkillArt();
  overlays.get(arena)?.remove();
  const canvas=document.createElement('canvas');canvas.width=600;canvas.height=525;
  canvas.className='skill-sequence-overlay';arena.append(canvas);overlays.set(arena,canvas);
  const g=canvas.getContext('2d'),start=performance.now(),duration=slot>=4?8000:1800;
  let last=-Infinity;
  const render=now=>{
    if(!canvas.isConnected||now-start>duration){canvas.remove();return;}
    if(now-last>=1000/30){
      last=now;g.clearRect(0,0,600,525);g.save();g.scale(.75,.75);
      const t=(now-start)/100,age=Math.floor(t/10)*10;
      drawPriestSkillArt(g,{slot,x:400,y:590,start:slot>=4?age:0,end:slot>=4?age+12:18},t,{scale:.82});
      g.restore();
    }
    requestAnimationFrame(render);
  };
  requestAnimationFrame(render);
}
