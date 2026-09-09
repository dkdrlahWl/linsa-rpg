(()=>{'use strict';
if(document.getElementById('ringu-mobile-draw-fix-v8'))return;
const style=document.createElement('style');style.id='ringu-mobile-draw-fix-v8';style.textContent=`
@media (max-width:768px){
 #drawResultModal{padding:6px!important;overflow:hidden!important}
 #drawResultModal>.modal,#drawResultModal .modal.draw-result{width:calc(100vw - 12px)!important;max-width:calc(100vw - 12px)!important;max-height:calc(100dvh - 12px)!important;padding:9px!important;overflow:hidden!important;display:flex!important;flex-direction:column!important;box-sizing:border-box!important}
 #drawResultModal .modal>h3{margin:0 0 7px!important;font-size:17px!important;line-height:1.2!important;flex:0 0 auto!important}
 #drawResultModal #drawResultGrid.draw-result-grid,#drawResultModal #drawResultGrid{display:grid!important;grid-template-columns:repeat(var(--ringu-cols,5),minmax(0,1fr))!important;grid-auto-flow:row!important;grid-auto-columns:minmax(0,1fr)!important;width:100%!important;min-width:0!important;max-width:100%!important;gap:4px!important;padding:1px!important;margin:0!important;overflow:hidden!important;box-sizing:border-box!important;align-content:start!important;justify-content:stretch!important;justify-items:stretch!important}
 #drawResultModal #drawResultGrid>.draw-card{grid-column:auto!important;grid-row:auto!important;float:none!important;position:relative!important;display:grid!important;grid-template-rows:60px 24px 24px!important;width:auto!important;min-width:0!important;max-width:none!important;height:112px!important;min-height:112px!important;margin:0!important;padding:4px 2px!important;overflow:hidden!important;box-sizing:border-box!important;border-radius:7px!important;text-align:center!important;justify-items:center!important;align-items:start!important}
 #drawResultModal #drawResultGrid>.draw-card .rm-item-art{display:block!important;width:58px!important;height:58px!important;max-width:100%!important;max-height:58px!important;margin:0 auto!important;background-size:contain!important;background-position:center!important;background-repeat:no-repeat!important;transform:none!important;clip-path:none!important;overflow:hidden!important}
 #drawResultModal #drawResultGrid>.draw-card .gear-icon{display:block!important;width:58px!important;height:58px!important;max-width:58px!important;max-height:58px!important;margin:0 auto!important;transform:scale(.44)!important;transform-origin:center!important;overflow:hidden!important}
 #drawResultModal #drawResultGrid>.draw-card .ringu-result-icon{display:block!important;width:50px!important;height:50px!important;max-width:50px!important;max-height:50px!important;margin:4px auto 0!important;transform:none!important;overflow:hidden!important}
 #drawResultModal #drawResultGrid>.draw-card img,#drawResultModal #drawResultGrid>.draw-card canvas{display:block!important;width:auto!important;height:auto!important;max-width:96%!important;max-height:58px!important;object-fit:contain!important;margin:0 auto!important;transform:none!important}
 #drawResultModal #drawResultGrid>.draw-card strong{display:-webkit-box!important;-webkit-box-orient:vertical!important;-webkit-line-clamp:2!important;width:100%!important;min-width:0!important;max-width:100%!important;height:23px!important;min-height:23px!important;margin:1px 0 0!important;padding:0 1px!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:normal!important;word-break:keep-all!important;overflow-wrap:anywhere!important;box-sizing:border-box!important;font-size:7px!important;line-height:10px!important}
 #drawResultModal #drawResultGrid>.draw-card small{display:block!important;width:100%!important;min-width:0!important;max-width:100%!important;height:23px!important;margin:0!important;padding:0 1px!important;overflow:hidden!important;white-space:normal!important;word-break:keep-all!important;overflow-wrap:anywhere!important;box-sizing:border-box!important;font-size:6px!important;line-height:9px!important}
 #drawResultModal #drawResultGrid>.draw-card .new-badge{position:absolute!important;top:2px!important;left:2px!important;font-size:6px!important;line-height:1!important;padding:2px 3px!important;z-index:5!important}
 #drawResultModal .modal-actions{flex:0 0 auto!important;margin-top:7px!important;position:relative!important;z-index:10!important}
 #drawResultModal .modal-actions button{padding:9px!important;font-size:12px!important}
}
@media (max-width:360px){
 #drawResultModal #drawResultGrid{gap:3px!important}
 #drawResultModal #drawResultGrid>.draw-card{grid-template-rows:54px 22px 22px!important;height:101px!important;min-height:101px!important;padding:3px 1px!important}
 #drawResultModal #drawResultGrid>.draw-card .rm-item-art,#drawResultModal #drawResultGrid>.draw-card .gear-icon{width:52px!important;height:52px!important;max-width:52px!important;max-height:52px!important}
 #drawResultModal #drawResultGrid>.draw-card .gear-icon{transform:scale(.40)!important}
 #drawResultModal #drawResultGrid>.draw-card .ringu-result-icon{width:46px!important;height:46px!important;max-width:46px!important;max-height:46px!important}
 #drawResultModal #drawResultGrid>.draw-card strong{font-size:6.5px!important;line-height:9px!important;height:21px!important;min-height:21px!important}
 #drawResultModal #drawResultGrid>.draw-card small{font-size:5.5px!important;line-height:8px!important;height:21px!important}
}
`;
document.head.append(style);
function normalize(){
 if(!matchMedia('(max-width:768px)').matches)return;
 const modal=document.getElementById('drawResultModal'),grid=document.getElementById('drawResultGrid');if(!grid)return;
 const cards=[...grid.children].filter(el=>el.classList?.contains('draw-card')),count=cards.length,cols=count>=6?5:Math.max(1,count);
 grid.style.setProperty('--ringu-cols',String(cols));
 grid.style.setProperty('display','grid','important');
 grid.style.setProperty('grid-template-columns','repeat('+cols+',minmax(0,1fr))','important');
 grid.style.setProperty('grid-auto-flow','row','important');
 grid.style.setProperty('width','100%','important');
 grid.style.setProperty('max-width','100%','important');
 grid.style.setProperty('overflow','hidden','important');
 cards.forEach(card=>{
  card.style.setProperty('grid-column','auto','important');
  card.style.setProperty('grid-row','auto','important');
  card.style.setProperty('width','auto','important');
  card.style.setProperty('min-width','0','important');
  card.style.setProperty('max-width','none','important');
  card.style.setProperty('overflow','hidden','important');
 });
 if(modal){modal.style.setProperty('overflow','hidden','important');const box=modal.querySelector('.modal');if(box)box.style.setProperty('overflow','hidden','important');}
}
function schedule(){requestAnimationFrame(()=>{normalize();setTimeout(normalize,30);setTimeout(normalize,100);setTimeout(normalize,260)});}
window.addEventListener('ringu-ready',schedule);window.addEventListener('resize',schedule);
document.addEventListener('click',e=>{if(e.target.closest('[onclick^="drawItems("],.draw'))schedule()},true);
const start=()=>{const grid=document.getElementById('drawResultGrid');if(!grid)return schedule();new MutationObserver(schedule).observe(grid,{childList:true});schedule()};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();setTimeout(start,1200);
})();