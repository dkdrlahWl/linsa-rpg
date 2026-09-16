/* Presentation queue owns no rewards: items already committed by economy RPC. */
(()=>{'use strict';
const base='/linsa-rpg/art/world2/';let run=null,subscribed=false;
window.RinguFallenReveal=function(item,done){
 if(!subscribed){window.RinguSession?.onEnded?.(()=>{if(run){run.timers.forEach(clearTimeout);cancelAnimationFrame(run.frame);run=null;}document.getElementById('fallenReveal')?.remove();});subscribed=true;}
 const g=window.RinguCore,f=g.fn,$=id=>document.getElementById(id),esc=x=>f.escapeHtml(String(x??'')),t=window.RinguWorld2?.template(item);
 if(!t){done();return;}
 let modal=$('fallenReveal');if(!modal){modal=document.createElement('div');modal.id='fallenReveal';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','fallenRevealName');document.body.append(modal);}
 if(run){run.timers.forEach(clearTimeout);cancelAnimationFrame(run.frame);}
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,owner=window.RinguSession.account?.id;
 const r={timers:[],frame:0,owner};run=r;
 const valid=()=>run===r&&window.RinguSession.active!==false&&window.RinguSession.account?.id===owner;
 const later=(fn,time)=>r.timers.push(setTimeout(()=>{if(valid())fn();},reduced?Math.min(700,time/8):time));
 modal.className='fallen-reveal active';modal.innerHTML='<div class="fallen-chamber"></div><canvas class="fallen-particles"></canvas><img class="fallen-halo" src="'+base+'fx-halo.webp" alt=""><img class="fallen-rift" src="'+base+'fx-rift.webp" alt=""><img class="fallen-wave" src="'+base+'fx-wave.webp" alt=""><img class="fallen-wings" src="'+base+'fx-wings.webp" alt=""><div class="fallen-object"><img src="'+base+t.art+'.webp" alt="'+esc(item.name)+'"></div><div class="fallen-information"><small class="fallen-grade">타락</small><div class="fallen-rank">'+t.roman+' · '+esc(t.series)+'</div><h2 id="fallenRevealName">'+esc(item.name)+'</h2><p class="fallen-slot">'+esc(item.slot)+'</p><strong class="fallen-attack">공격력 '+f.itemAtk(item).toLocaleString('ko-KR')+'</strong><p class="fallen-options">'+f.optionText(item)+'</p><button class="fallen-confirm" disabled>확인</button></div>';
 const canvas=modal.querySelector('canvas'),ctx=canvas.getContext('2d'),feather=new Image(),shard=new Image();feather.src=base+'fx-feather.webp';shard.src=base+'fx-shard.webp';
 const width=Math.min(720,innerWidth),height=Math.min(1080,innerHeight);canvas.width=width;canvas.height=height;
 const born=performance.now(),particles=Array.from({length:reduced?8:30},(_,i)=>({angle:i*2.39996,radius:.3+(i%7)*.075,size:7+(i%5)*4,speed:.25+(i%4)*.1,kind:i%3}));let last=0;
 function paint(now){if(!valid())return;if(document.hidden||now-last<50){r.frame=requestAnimationFrame(paint);return;}last=now;ctx.clearRect(0,0,width,height);const elapsed=(now-born)/1000;
  for(let i=0;i<particles.length;i++){const p=particles[i],a=p.angle+elapsed*p.speed,implode=elapsed<3?Math.max(0,1-elapsed/3):1;
   const x=elapsed<3?width*.5+Math.cos(a)*width*p.radius*implode:(i*97%width),y=elapsed<3?height*.43+Math.sin(a)*height*p.radius*implode:((elapsed*18+i*53)%height),im=p.kind===1?shard:feather;
   ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.globalAlpha=elapsed<3?.6:.2;if(im.complete&&im.naturalWidth)ctx.drawImage(im,-p.size/2,-p.size/2,p.size,p.size);ctx.restore();
  }r.frame=requestAnimationFrame(paint);
 }
 r.frame=requestAnimationFrame(paint);window.RinguAudio?.effect('fallen-heartbeat');
 later(()=>modal.classList.add('halo'),450);
 later(()=>{modal.classList.add('collapse');window.RinguAudio?.effect('fallen-crack');},2450);
 later(()=>{modal.classList.add('impact');window.RinguAudio?.effect('fallen-impact');},3100);
 later(()=>modal.classList.add('silhouette'),3400);
 later(()=>modal.classList.add('unsealed'),4100);
 later(()=>modal.classList.add('grade'),4850);
 later(()=>modal.classList.add('details'),5300);
 later(()=>{modal.classList.add('ready');const button=modal.querySelector('button');button.disabled=false;button.focus();},6100);
 modal.querySelector('button').onclick=()=>{if(!valid()||modal.querySelector('button').disabled)return;r.timers.forEach(clearTimeout);cancelAnimationFrame(r.frame);run=null;modal.className='fallen-reveal';modal.innerHTML='';done();};
};
document.addEventListener('keydown',e=>{if(!run)return;if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();}if(e.key==='Tab'){e.preventDefault();document.querySelector('#fallenReveal button:not(:disabled)')?.focus();}},true);
window.RinguSession?.onEnded?.(()=>{if(run){run.timers.forEach(clearTimeout);cancelAnimationFrame(run.frame);run=null;}document.getElementById('fallenReveal')?.remove();});
})();
