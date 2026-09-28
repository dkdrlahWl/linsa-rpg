// Retain native details state when server sync replaces a page or dialog.
const scopes = new Map();
let mounted = new WeakMap();
function entries(root) {
  const counts = new Map();
  const keys = new Map();
  return [...root.querySelectorAll('details')].map(node => {
    const parent = node.parentElement?.closest('details');
    const summary = [...node.children].find(child => child.tagName === 'SUMMARY');
    const label = node.dataset.disclosureKey || node.id || summary?.textContent.trim().replace(/\s+/g, ' ') || 'details';
    const base = (parent && keys.get(parent) || '') + '/' + label;
    const occurrence = counts.get(base) || 0;
    counts.set(base, occurrence + 1);
    const key = base + '#' + occurrence;
    keys.set(node, key);
    return [key, node];
  });
}
export function replacePreservingDetails(root, scope, html) {
  const previous = mounted.get(root);
  if (previous) {
    const states = scopes.get(previous) || new Map();
    for (const [key, node] of entries(root)) states.set(key, node.open);
    scopes.delete(previous);
    scopes.set(previous, states);
  }
  root.innerHTML = html;
  mounted.set(root, scope);
  const saved = scopes.get(scope);
  if (saved) for (const [key, node] of entries(root)) {
    if (saved.has(key)) node.open = saved.get(key);
  }
  while (scopes.size > 80) scopes.delete(scopes.keys().next().value);
}
export function clearDisclosureState() {
  scopes.clear();
  mounted = new WeakMap();
}
