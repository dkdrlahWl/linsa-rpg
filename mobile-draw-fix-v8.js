/* Compact summon results: the live renderer creates .rm-drop-card, not .draw-card. */
(() => {
  'use strict';
  if (window.__ringuCompactDrawV10) return;

  const style = document.createElement('style');
  style.id = 'ringu-mobile-draw-fix-v8';
  style.textContent = `
@keyframes ringu-summon-arrive {
  0% {opacity:0;transform:translateY(12px) scale(.82);}
  72% {opacity:1;transform:translateY(-2px) scale(1.025);}
  100% {opacity:1;transform:none;}
}
#drawResultModal.show #drawResultGrid > .ringu-summon-reveal {
  animation:ringu-summon-arrive 280ms cubic-bezier(.2,.75,.25,1) var(--ringu-reveal-delay,0ms) both;
  transform-origin:center;
}
@media (prefers-reduced-motion:reduce) {
  #drawResultModal.show #drawResultGrid > .ringu-summon-reveal {animation:none!important;}
}

@media (max-width:768px) {
  #drawResultModal.show {
    padding:8px!important;
    padding-top:max(8px,env(safe-area-inset-top))!important;
    padding-bottom:max(8px,env(safe-area-inset-bottom))!important;
    box-sizing:border-box!important;
    overflow-x:hidden!important;overflow-y:auto!important;
    overscroll-behavior:contain;
  }
  #drawResultModal > .modal {
    display:flex!important;flex-direction:column!important;
    width:100%!important;max-width:720px!important;min-width:0!important;
    height:auto!important;min-height:0!important;
    max-height:calc(100vh - 16px)!important;
    max-height:calc(100dvh - 16px - env(safe-area-inset-top) - env(safe-area-inset-bottom))!important;
    margin:0!important;padding:10px!important;box-sizing:border-box!important;
    overflow:hidden!important;
  }
  #drawResultModal > .modal > h3 {
    flex:0 0 auto!important;margin:0 0 10px!important;
    font-size:18px!important;line-height:1.3!important;
  }
  #drawResultModal #drawResultGrid {
    display:grid!important;
    grid-template-columns:repeat(var(--ringu-result-columns,5),minmax(0,1fr))!important;
    grid-auto-flow:row!important;grid-auto-rows:max-content!important;
    flex:0 1 auto!important;min-height:0!important;
    width:100%!important;min-width:0!important;max-width:100%!important;
    max-height:calc(100vh - 150px)!important;
    max-height:calc(100dvh - 150px - env(safe-area-inset-top) - env(safe-area-inset-bottom))!important;
    gap:6px 4px!important;margin:0!important;padding:2px!important;
    box-sizing:border-box!important;
    overflow-x:hidden!important;overflow-y:auto!important;
    overscroll-behavior:contain;-webkit-overflow-scrolling:touch;
    touch-action:pan-y pinch-zoom;
    align-content:start!important;align-items:stretch!important;
    justify-content:stretch!important;justify-items:stretch!important;
    scrollbar-gutter:auto!important;
  }
  #drawResultModal #drawResultGrid > :is(.rm-drop-card,.draw-card) {
    display:grid!important;grid-template-columns:minmax(0,1fr)!important;
    grid-template-rows:64px 22px 26px 16px!important;gap:2px!important;
    grid-column:auto!important;grid-row:auto!important;
    position:relative!important;float:none!important;
    width:auto!important;min-width:0!important;max-width:100%!important;
    height:auto!important;min-height:0!important;
    margin:0!important;padding:4px 2px!important;box-sizing:border-box!important;
    border-radius:7px!important;text-align:center!important;overflow:hidden!important;
    align-items:center!important;justify-items:center!important;
  }
  #drawResultModal #drawResultGrid > :is(.rm-drop-card,.draw-card) .rm-item-art {
    grid-row:1!important;display:block!important;position:relative!important;
    width:100%!important;max-width:64px!important;min-width:0!important;
    height:64px!important;max-height:64px!important;
    margin:0 auto!important;
    background-size:contain!important;background-position:center!important;
    background-repeat:no-repeat!important;
    transform:none!important;clip-path:none!important;
  }
  #drawResultModal #drawResultGrid > :is(.rm-drop-card,.draw-card) :is(img,canvas) {
    display:block!important;width:auto!important;height:auto!important;
    max-width:100%!important;max-height:64px!important;
    object-fit:contain!important;margin:0 auto!important;
  }
  #drawResultModal #drawResultGrid > :is(.rm-drop-card,.draw-card) > small {
    grid-row:2!important;display:block!important;
    width:100%!important;min-width:0!important;max-width:100%!important;
    height:auto!important;min-height:0!important;max-height:22px!important;
    margin:0!important;padding:0!important;
    font-size:8px!important;line-height:11px!important;
    white-space:normal!important;overflow-wrap:anywhere!important;overflow:hidden!important;
  }
  #drawResultModal #drawResultGrid > :is(.rm-drop-card,.draw-card) > strong {
    grid-row:3!important;display:-webkit-box!important;
    -webkit-box-orient:vertical!important;-webkit-line-clamp:2!important;
    width:100%!important;min-width:0!important;max-width:100%!important;
    height:auto!important;min-height:0!important;max-height:26px!important;
    margin:0!important;padding:0!important;
    font-size:9px!important;line-height:12px!important;
    white-space:normal!important;word-break:keep-all!important;
    overflow-wrap:anywhere!important;overflow:hidden!important;text-overflow:ellipsis!important;
  }
  #drawResultModal #drawResultGrid > .rm-drop-card > span:not(.rm-item-art) {
    grid-row:4!important;display:block!important;
    width:100%!important;min-width:0!important;max-width:100%!important;
    margin:0!important;padding:0!important;
    font-size:11px!important;line-height:16px!important;
    white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;
  }
  #drawResultModal > .modal > .modal-actions {
    flex:0 0 auto!important;position:static!important;margin:10px 0 0!important;
  }
  #drawResultModal > .modal > .modal-actions > button {
    min-height:44px!important;padding:10px!important;font-size:13px!important;
  }
}
@media (max-width:360px) {
  #drawResultModal #drawResultGrid {column-gap:3px!important;}
  #drawResultModal #drawResultGrid > :is(.rm-drop-card,.draw-card) {
    grid-template-rows:54px 22px 24px 16px!important;
  }
  #drawResultModal #drawResultGrid > :is(.rm-drop-card,.draw-card) .rm-item-art {
    height:54px!important;max-height:54px!important;max-width:54px!important;
  }
  #drawResultModal #drawResultGrid > :is(.rm-drop-card,.draw-card) :is(img,canvas) {max-height:54px!important;}
  #drawResultModal #drawResultGrid > :is(.rm-drop-card,.draw-card) > strong {font-size:8px!important;line-height:11px!important;}
}
`;
  document.head.append(style);

  const revealed = new WeakSet();
  let observedGrid = null;
  // Explicitly refreshed by the result renderer.
  function update() {
    if (!observedGrid) return;
    const cards = Array.from(observedGrid.children).filter(el =>
      el.matches('.rm-drop-card,.draw-card'));
    // An empty/rebuilding grid must not be mistaken for a one-item summon.
    const columns = cards.length ? Math.min(5, cards.length) : 5;
    const value = String(columns);
    if (observedGrid.style.getPropertyValue('--ringu-result-columns') !== value) {
      observedGrid.style.setProperty('--ringu-result-columns', value);
    }
    observedGrid.dataset.ringuResultCount = String(cards.length);
    cards.forEach((card,index) => {
      if (!revealed.has(card)) {
        revealed.add(card);
        card.style.setProperty('--ringu-reveal-delay', String(Math.min(index,9)*70)+'ms');
        card.classList.add('ringu-summon-reveal');
      }
      const name = card.querySelector('strong');
      if (name && !name.hasAttribute('title')) name.title = name.textContent.trim();
    });
  }
  function attach() {
    const grid = document.getElementById('drawResultGrid');
    if (!grid) return;
    if (observedGrid !== grid) {

      observedGrid = grid;
      // Only inserted/removed cards are observed; style/title writes cannot loop.

    }
    update();
  }
  window.__ringuCompactDrawV10 = { refresh:attach };
  window.addEventListener('ringu-ready', attach);
  window.addEventListener('load', attach, { once:true });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach, { once:true });
  }
  attach();
})();
