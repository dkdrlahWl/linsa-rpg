(()=>{'use strict';
if(document.getElementById('ringu-mobile-draw-fix-v7'))return;
const style=document.createElement('style');
style.id='ringu-mobile-draw-fix-v7';
style.textContent=`
@media (max-width:768px){
  #drawResultModal{padding:8px!important;overflow:hidden!important;overscroll-behavior:contain!important}
  #drawResultModal .modal.draw-result,#drawResultModal .modal{
    display:flex!important;flex-direction:column!important;
    width:calc(100vw - 16px)!important;max-width:calc(100vw - 16px)!important;
    max-height:calc(100dvh - 16px)!important;margin:0!important;padding:12px!important;
    overflow:hidden!important;box-sizing:border-box!important;
  }
  #drawResultModal .modal>h3{flex:0 0 auto!important;margin:0 0 10px!important}
  #drawResultModal #drawResultGrid.draw-result-grid,#drawResultModal #drawResultGrid{
    display:grid!important;
    grid-template-columns:repeat(2,minmax(0,1fr))!important;
    grid-auto-flow:row!important;
    width:100%!important;min-width:0!important;max-width:100%!important;
    gap:8px!important;padding:2px!important;margin:0!important;
    box-sizing:border-box!important;
    max-height:calc(100dvh - 188px)!important;
    overflow-y:auto!important;overflow-x:clip!important;
    align-content:start!important;justify-content:stretch!important;justify-items:stretch!important;
    scrollbar-gutter:auto!important;
  }
  #drawResultModal #drawResultGrid>.draw-card{
    position:relative!important;display:grid!important;
    grid-template-rows:108px minmax(28px,auto) auto!important;
    width:100%!important;min-width:0!important;max-width:100%!important;
    min-height:178px!important;margin:0!important;padding:7px 5px!important;
    box-sizing:border-box!important;overflow:hidden!important;
    text-align:center!important;align-items:start!important;justify-items:center!important;
  }
  #drawResultModal #drawResultGrid>.draw-card>.rm-item-art,
  #drawResultModal #drawResultGrid>.draw-card .rm-item-art{
    display:block!important;width:100%!important;height:104px!important;
    max-width:104px!important;max-height:104px!important;
    margin:0 auto!important;justify-self:center!important;align-self:center!important;
    background-size:contain!important;background-position:center!important;background-repeat:no-repeat!important;
    transform:none!important;clip-path:none!important;overflow:hidden!important;
  }
  #drawResultModal #drawResultGrid>.draw-card>.gear-icon,
  #drawResultModal #drawResultGrid>.draw-card .gear-icon{
    display:block!important;width:94px!important;height:94px!important;
    max-width:94px!important;max-height:94px!important;
    margin:0 auto!important;justify-self:center!important;align-self:center!important;
    transform:scale(.66)!important;transform-origin:center!important;overflow:hidden!important;
  }
  #drawResultModal #drawResultGrid>.draw-card>.ringu-result-icon,
  #drawResultModal #drawResultGrid>.draw-card .ringu-result-icon{
    display:block!important;width:72px!important;height:72px!important;
    max-width:72px!important;max-height:72px!important;
    margin:0 auto!important;justify-self:center!important;align-self:center!important;
    transform:none!important;overflow:hidden!important;
  }
  #drawResultModal #drawResultGrid>.draw-card img,
  #drawResultModal #drawResultGrid>.draw-card canvas{
    display:block!important;width:auto!important;height:auto!important;
    max-width:90%!important;max-height:104px!important;object-fit:contain!important;
    margin:0 auto!important;justify-self:center!important;align-self:center!important;transform:none!important;
  }
  #drawResultModal #drawResultGrid>.draw-card strong{
    display:-webkit-box!important;-webkit-box-orient:vertical!important;-webkit-line-clamp:2!important;
    width:100%!important;max-width:100%!important;min-width:0!important;min-height:27px!important;
    margin:4px 0 0!important;padding:0 3px!important;box-sizing:border-box!important;
    overflow:hidden!important;text-overflow:ellipsis!important;white-space:normal!important;
    word-break:keep-all!important;overflow-wrap:anywhere!important;
    font-size:10px!important;line-height:13px!important;
  }
  #drawResultModal #drawResultGrid>.draw-card small{
    display:block!important;width:100%!important;max-width:100%!important;min-width:0!important;
    margin:3px 0 0!important;padding:0 2px!important;box-sizing:border-box!important;
    overflow:hidden!important;white-space:normal!important;word-break:keep-all!important;overflow-wrap:anywhere!important;
    font-size:8px!important;line-height:11px!important;
  }
  #drawResultModal .modal-actions{flex:0 0 auto!important;margin-top:8px!important;position:relative!important;z-index:5!important}
}
@media (max-width:360px){
  #drawResultModal #drawResultGrid{gap:6px!important}
  #drawResultModal #drawResultGrid>.draw-card{grid-template-rows:96px minmax(27px,auto) auto!important;min-height:164px!important;padding:6px 4px!important}
  #drawResultModal #drawResultGrid>.draw-card>.rm-item-art,#drawResultModal #drawResultGrid>.draw-card .rm-item-art{height:92px!important;max-width:92px!important;max-height:92px!important}
  #drawResultModal #drawResultGrid>.draw-card>.gear-icon,#drawResultModal #drawResultGrid>.draw-card .gear-icon{width:84px!important;height:84px!important;max-width:84px!important;max-height:84px!important;transform:scale(.62)!important}
  #drawResultModal #drawResultGrid>.draw-card img,#drawResultModal #drawResultGrid>.draw-card canvas{max-height:92px!important}
}
`;
document.head.append(style);

function normalize(){
  if(!window.matchMedia('(max-width:768px)').matches)return;
  const modal=document.getElementById('drawResultModal'),grid=document.getElementById('drawResultGrid');
  if(!grid)return;
  if(modal){modal.style.overflow='hidden';const box=modal.querySelector('.modal');if(box)box.style.overflow='hidden';}
  grid.style.setProperty('grid-template-columns','repeat(2,minmax(0,1fr))','important');
  grid.style.setProperty('overflow-x','clip','important');
  grid.style.setProperty('max-width','100%','important');
  grid.querySelectorAll('.draw-card').forEach(card=>{
    card.style.setProperty('width','100%','important');
    card.style.setProperty('min-width','0','important');
    card.style.setProperty('max-width','100%','important');
    card.style.setProperty('overflow','hidden','important');
  });
}
function schedule(){requestAnimationFrame(()=>{normalize();setTimeout(normalize,60);setTimeout(normalize,220)});}
window.addEventListener('ringu-ready',schedule);
window.addEventListener('resize',schedule);
document.addEventListener('click',e=>{if(e.target.closest('[onclick^="drawItems("],.draw'))schedule();},true);
const observer=new MutationObserver(m=>{if(m.some(x=>x.target?.id==='drawResultGrid'||x.target?.closest?.('#drawResultGrid')))schedule();});
const startObserver=()=>{const grid=document.getElementById('drawResultGrid');if(grid)observer.observe(grid,{childList:true,subtree:true});schedule();};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startObserver,{once:true});else startObserver();
setTimeout(startObserver,1200);
})();