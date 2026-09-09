(()=>{'use strict';
if(document.getElementById('ringu-mobile-draw-fix-v7'))return;
const style=document.createElement('style');
style.id='ringu-mobile-draw-fix-v7';
style.textContent=`
@media (max-width:768px){
  #drawResultModal{padding:6px!important;overflow:hidden!important;overscroll-behavior:contain!important}
  #drawResultModal .modal.draw-result,#drawResultModal .modal{
    display:flex!important;flex-direction:column!important;
    width:calc(100vw - 12px)!important;max-width:calc(100vw - 12px)!important;
    max-height:calc(100dvh - 12px)!important;margin:0!important;padding:10px!important;
    overflow:hidden!important;box-sizing:border-box!important;
  }
  #drawResultModal .modal>h3{flex:0 0 auto!important;margin:0 0 8px!important;font-size:18px!important}
  #drawResultModal #drawResultGrid.draw-result-grid,#drawResultModal #drawResultGrid{
    display:grid!important;
    grid-template-columns:repeat(var(--ringu-draw-cols,5),minmax(0,1fr))!important;
    grid-auto-flow:row!important;
    width:100%!important;min-width:0!important;max-width:100%!important;
    gap:5px!important;padding:1px!important;margin:0!important;
    box-sizing:border-box!important;
    max-height:none!important;
    overflow:hidden!important;
    align-content:start!important;justify-content:stretch!important;justify-items:stretch!important;
  }
  #drawResultModal #drawResultGrid>.draw-card{
    position:relative!important;display:grid!important;
    grid-template-rows:64px 28px 24px!important;
    width:100%!important;min-width:0!important;max-width:100%!important;
    min-height:122px!important;height:122px!important;margin:0!important;padding:5px 3px!important;
    box-sizing:border-box!important;overflow:hidden!important;
    text-align:center!important;align-items:start!important;justify-items:center!important;
    border-radius:8px!important;
  }
  #drawResultModal #drawResultGrid>.draw-card>.rm-item-art,
  #drawResultModal #drawResultGrid>.draw-card .rm-item-art{
    display:block!important;width:100%!important;height:62px!important;
    max-width:62px!important;max-height:62px!important;
    margin:0 auto!important;justify-self:center!important;align-self:center!important;
    background-size:contain!important;background-position:center!important;background-repeat:no-repeat!important;
    transform:none!important;clip-path:none!important;overflow:hidden!important;
  }
  #drawResultModal #drawResultGrid>.draw-card>.gear-icon,
  #drawResultModal #drawResultGrid>.draw-card .gear-icon{
    display:block!important;width:62px!important;height:62px!important;
    max-width:62px!important;max-height:62px!important;
    margin:0 auto!important;justify-self:center!important;align-self:center!important;
    transform:scale(.48)!important;transform-origin:center!important;overflow:hidden!important;
  }
  #drawResultModal #drawResultGrid>.draw-card>.ringu-result-icon,
  #drawResultModal #drawResultGrid>.draw-card .ringu-result-icon{
    display:block!important;width:54px!important;height:54px!important;
    max-width:54px!important;max-height:54px!important;
    margin:0 auto!important;justify-self:center!important;align-self:center!important;
    transform:none!important;overflow:hidden!important;
  }
  #drawResultModal #drawResultGrid>.draw-card img,
  #drawResultModal #drawResultGrid>.draw-card canvas{
    display:block!important;width:auto!important;height:auto!important;
    max-width:94%!important;max-height:62px!important;object-fit:contain!important;
    margin:0 auto!important;justify-self:center!important;align-self:center!important;transform:none!important;
  }
  #drawResultModal #drawResultGrid>.draw-card strong{
    display:-webkit-box!important;-webkit-box-orient:vertical!important;-webkit-line-clamp:2!important;
    width:100%!important;max-width:100%!important;min-width:0!important;min-height:24px!important;
    margin:1px 0 0!important;padding:0 1px!important;box-sizing:border-box!important;
    overflow:hidden!important;text-overflow:ellipsis!important;white-space:normal!important;
    word-break:keep-all!important;overflow-wrap:anywhere!important;
    font-size:8px!important;line-height:11px!important;
  }
  #drawResultModal #drawResultGrid>.draw-card small{
    display:block!important;width:100%!important;max-width:100%!important;min-width:0!important;
    margin:0!important;padding:0 1px!important;box-sizing:border-box!important;
    overflow:hidden!important;white-space:normal!important;word-break:keep-all!important;overflow-wrap:anywhere!important;
    font-size:7px!important;line-height:10px!important;
  }
  #drawResultModal #drawResultGrid>.draw-card .new-badge{font-size:7px!important;padding:2px 4px!important;top:3px!important;left:3px!important}
  #drawResultModal .modal-actions{flex:0 0 auto!important;margin-top:7px!important;position:relative!important;z-index:5!important}
  #drawResultModal .modal-actions button{padding:10px!important;font-size:12px!important}
}
@media (max-width:390px){
  #drawResultModal .modal.draw-result,#drawResultModal .modal{padding:8px!important}
  #drawResultModal .modal>h3{font-size:16px!important;margin-bottom:6px!important}
  #drawResultModal #drawResultGrid{gap:3px!important}
  #drawResultModal #drawResultGrid>.draw-card{grid-template-rows:56px 26px 22px!important;min-height:108px!important;height:108px!important;padding:4px 2px!important}
  #drawResultModal #drawResultGrid>.draw-card>.rm-item-art,#drawResultModal #drawResultGrid>.draw-card .rm-item-art{height:54px!important;max-width:54px!important;max-height:54px!important}
  #drawResultModal #drawResultGrid>.draw-card>.gear-icon,#drawResultModal #drawResultGrid>.draw-card .gear-icon{width:54px!important;height:54px!important;max-width:54px!important;max-height:54px!important;transform:scale(.43)!important}
  #drawResultModal #drawResultGrid>.draw-card>.ringu-result-icon,#drawResultModal #drawResultGrid>.draw-card .ringu-result-icon{width:48px!important;height:48px!important;max-width:48px!important;max-height:48px!important}
  #drawResultModal #drawResultGrid>.draw-card img,#drawResultModal #drawResultGrid>.draw-card canvas{max-height:54px!important}
  #drawResultModal #drawResultGrid>.draw-card strong{font-size:7px!important;line-height:10px!important;min-height:22px!important}
  #drawResultModal #drawResultGrid>.draw-card small{font-size:6px!important;line-height:9px!important}
}
`;
document.head.append(style);

function normalize(){
  if(!window.matchMedia('(max-width:768px)').matches)return;
  const modal=document.getElementById('drawResultModal'),grid=document.getElementById('drawResultGrid');
  if(!grid)return;
  const count=grid.querySelectorAll(':scope > .draw-card').length;
  const cols=count<=1?1:count<=3?count:5;
  grid.style.setProperty('--ringu-draw-cols',String(cols));
  grid.style.setProperty('grid-template-columns','repeat('+cols+',minmax(0,1fr))','important');
  grid.style.setProperty('overflow','hidden','important');
  grid.style.setProperty('overflow-x','hidden','important');
  grid.style.setProperty('overflow-y','hidden','important');
  grid.style.setProperty('max-width','100%','important');
  if(modal){modal.style.setProperty('overflow','hidden','important');const box=modal.querySelector('.modal');if(box)box.style.setProperty('overflow','hidden','important');}
  grid.querySelectorAll('.draw-card').forEach(card=>{
    card.style.setProperty('width','100%','important');
    card.style.setProperty('min-width','0','important');
    card.style.setProperty('max-width','100%','important');
    card.style.setProperty('overflow','hidden','important');
  });
}
function schedule(){requestAnimationFrame(()=>{normalize();setTimeout(normalize,50);setTimeout(normalize,180)});}
window.addEventListener('ringu-ready',schedule);
window.addEventListener('resize',schedule);
document.addEventListener('click',e=>{if(e.target.closest('[onclick^="drawItems("],.draw'))schedule();},true);
const observer=new MutationObserver(m=>{if(m.some(x=>x.target?.id==='drawResultGrid'||x.target?.closest?.('#drawResultGrid')))schedule();});
const startObserver=()=>{const grid=document.getElementById('drawResultGrid');if(grid)observer.observe(grid,{childList:true,subtree:true});schedule();};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startObserver,{once:true});else startObserver();
setTimeout(startObserver,1200);
})();