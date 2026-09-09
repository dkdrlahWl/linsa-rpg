(()=>{'use strict';
if(document.getElementById('ringu-mobile-draw-fix-v6'))return;
const style=document.createElement('style');style.id='ringu-mobile-draw-fix-v6';style.textContent=`
#drawResultModal{overflow:hidden!important}
#drawResultModal .modal{display:flex!important;flex-direction:column!important;overflow:hidden!important;box-sizing:border-box!important}
#drawResultGrid{width:100%!important;min-width:0!important;box-sizing:border-box!important;overflow-y:auto!important;overflow-x:hidden!important;align-content:start!important;justify-items:stretch!important;scrollbar-gutter:stable!important}
#drawResultGrid .draw-card{position:relative!important;box-sizing:border-box!important;width:100%!important;min-width:0!important;max-width:100%!important;overflow:hidden!important;text-align:center!important;display:grid!important;grid-template-rows:112px auto auto!important;align-items:start!important;justify-items:stretch!important}
#drawResultGrid .draw-card>.rm-item-art,#drawResultGrid .draw-card .rm-item-art{display:block!important;justify-self:center!important;align-self:center!important;width:100%!important;max-width:104px!important;height:104px!important;max-height:104px!important;margin:0 auto!important;background-size:contain!important;background-position:center!important;background-repeat:no-repeat!important;transform:none!important;clip-path:none!important;overflow:hidden!important}
#drawResultGrid .draw-card>.gear-icon,#drawResultGrid .draw-card .gear-icon{display:block!important;justify-self:center!important;align-self:center!important;max-width:96px!important;max-height:96px!important;margin:0 auto!important;transform:scale(.78)!important;transform-origin:center center!important;overflow:hidden!important}
#drawResultGrid .draw-card>.ringu-result-icon,#drawResultGrid .draw-card .ringu-result-icon{justify-self:center!important;align-self:center!important;max-width:88px!important;max-height:88px!important;margin:0 auto!important;transform:none!important;overflow:hidden!important}
#drawResultGrid .draw-card img,#drawResultGrid .draw-card canvas{display:block!important;justify-self:center!important;align-self:center!important;width:auto!important;height:auto!important;max-width:94%!important;max-height:104px!important;object-fit:contain!important;margin:0 auto!important;transform:none!important}
#drawResultGrid .draw-card strong{display:-webkit-box!important;-webkit-box-orient:vertical!important;-webkit-line-clamp:2!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:normal!important;word-break:keep-all!important;overflow-wrap:anywhere!important;max-width:100%!important;min-height:28px!important;margin:5px 0 0!important;padding:0 2px!important}
#drawResultGrid .draw-card small{display:block!important;max-width:100%!important;overflow:hidden!important;white-space:normal!important;word-break:keep-all!important;overflow-wrap:anywhere!important;margin-top:3px!important}
#drawResultModal .modal-actions{flex:0 0 auto!important;margin-top:8px!important;position:relative!important;z-index:3!important}
@media(max-width:768px){
 #drawResultModal{padding:10px!important;overflow:hidden!important}
 #drawResultModal .modal{width:calc(100vw - 20px)!important;max-width:calc(100vw - 20px)!important;max-height:calc(100dvh - 20px)!important;padding:12px!important;overflow:hidden!important}
 #drawResultModal .modal>h3{flex:0 0 auto!important;margin-bottom:8px!important}
 #drawResultGrid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important;padding:3px!important;max-height:calc(100dvh - 190px)!important;overflow-y:auto!important;overflow-x:hidden!important}
 #drawResultGrid .draw-card{grid-template-rows:118px auto auto!important;min-height:190px!important;padding:8px 5px!important}
 #drawResultGrid .draw-card>.rm-item-art,#drawResultGrid .draw-card .rm-item-art{width:100%!important;max-width:112px!important;height:112px!important;max-height:112px!important}
 #drawResultGrid .draw-card>.gear-icon,#drawResultGrid .draw-card .gear-icon{max-width:104px!important;max-height:104px!important;transform:scale(.72)!important}
 #drawResultGrid .draw-card>.ringu-result-icon,#drawResultGrid .draw-card .ringu-result-icon{width:76px!important;height:76px!important;max-width:76px!important;max-height:76px!important}
 #drawResultGrid .draw-card img,#drawResultGrid .draw-card canvas{max-width:92%!important;max-height:112px!important}
 #drawResultGrid .draw-card strong{font-size:10px!important;line-height:13px!important;min-height:27px!important}
 #drawResultGrid .draw-card small{font-size:8px!important;line-height:11px!important}
}
@media(max-width:360px){
 #drawResultGrid{gap:6px!important}
 #drawResultGrid .draw-card{grid-template-rows:104px auto auto!important;min-height:176px!important;padding:7px 4px!important}
 #drawResultGrid .draw-card>.rm-item-art,#drawResultGrid .draw-card .rm-item-art{max-width:98px!important;height:98px!important;max-height:98px!important}
 #drawResultGrid .draw-card>.gear-icon,#drawResultGrid .draw-card .gear-icon{max-width:92px!important;max-height:92px!important;transform:scale(.68)!important}
 #drawResultGrid .draw-card img,#drawResultGrid .draw-card canvas{max-height:98px!important}
}
`;
document.head.append(style);
function normalize(){const grid=document.getElementById('drawResultGrid');if(!grid)return;grid.querySelectorAll('.draw-card').forEach(card=>{card.style.maxWidth='100%';card.style.minWidth='0';card.style.overflow='hidden';card.querySelectorAll('.rm-item-art,.gear-icon,.ringu-result-icon,img,canvas').forEach(el=>{el.style.maxWidth='100%';});});}
window.addEventListener('ringu-ready',normalize);document.addEventListener('click',e=>{if(e.target.closest('[onclick^="drawItems("],.draw'))setTimeout(normalize,120)});setTimeout(normalize,500);setTimeout(normalize,1800);
})();