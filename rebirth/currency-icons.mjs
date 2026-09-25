// Generated raster artwork is embedded in the SVG asset containers.
const currencyKeys = {
  '골드': 'gold', G: 'gold', '장비 파편': 'fragment', '파편': 'fragment',
  '잠재 부여 주문서': 'scroll', '주문서': 'scroll',
  '잠재 확장석': 'expand', '확장석': 'expand',
  '레드 큐브':'cube', '블랙 큐브':'highCube', '프라임 큐브':'primeCube',
  '일반 큐브': 'cube', '큐브': 'cube', '상급 큐브': 'highCube',
  '지역 재료': 'boss', '보스 재료': 'boss',
};
const labels = /레드 큐브|블랙 큐브|프라임 큐브|상급 큐브|일반 큐브|잠재 부여 주문서|잠재 확장석|장비 파편|지역 재료|보스 재료|확장석|주문서|파편|큐브|골드|\bG\b/g;
const ignored = 'script,style,textarea,select,option,[data-currency-label],.damage';
const cubeArt={cube:"cube-red-v2.png",highCube:"cube-black-v2.png",primeCube:"cube-prime-v2.png"};
export const currencyIconURL = key => new URL("./currencies/"+(cubeArt[key]||key+".svg"),import.meta.url).href;
const iconURL=currencyIconURL;

// Keep the original readable names, amounts, and button behavior. Decorate
// rendered text only, so inputs, account names and stored data are unchanged.
function decorate(root) {
  if (root.nodeType === Node.TEXT_NODE) {
    const parent = root.parentElement;
    if (!parent || parent.closest(ignored) || parent.closest('.identity,.brand')) return;
    const value = root.nodeValue;
    labels.lastIndex = 0;
    if (!labels.test(value)) return;
    labels.lastIndex = 0;
    const fragment = document.createDocumentFragment();
    let offset = 0;
    for (const match of value.matchAll(labels)) {
      fragment.append(document.createTextNode(value.slice(offset, match.index)));
      const label = document.createElement('span');
      label.className = 'resource-label';
      label.dataset.currencyLabel = currencyKeys[match[0]];
      const icon = document.createElement('img');
      icon.src = iconURL(currencyKeys[match[0]]);
      icon.alt = '';
      icon.width = 24;
      icon.height = 24;
      icon.decoding = 'async';
      label.append(icon, document.createTextNode(match[0]));
      fragment.append(label);
      offset = match.index + match[0].length;
    }
    fragment.append(document.createTextNode(value.slice(offset)));
    root.replaceWith(fragment);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE || root.closest(ignored)) return;
  for (const child of [...root.childNodes]) decorate(child);
}

export function installCurrencyIcons() {
  const options = { childList: true, subtree: true, characterData: true };
  const observer = new MutationObserver(records => {
    observer.disconnect();
    try {
      for (const record of records) {
        if (record.type === 'characterData') decorate(record.target);
        else for (const node of record.addedNodes) {
          if (node.isConnected) decorate(node);
        }
      }
    } finally { observer.observe(document.body, options); }
  });
  decorate(document.body);
  observer.observe(document.body, options);
}
