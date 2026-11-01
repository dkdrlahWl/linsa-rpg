// Individually generated fantasy emblems, shared by all header instances.
export const TOP_BUTTON_ART=Object.freeze(Object.fromEntries([
 'arena','wheel','title','bank','investment','market','attendance','mail','ranking','menu',
 'warrior3d','exploration','citadel','raid','daily','weekly','training','tower','advancement',
].map(key=>[key,`ui/top-buttons/${key}-v1.webp`])));
export const BOSS_BUTTON_KEYS=Object.freeze({warrior3d:'warrior3d',exploration:'exploration',coop:'exploration',citadel:'citadel',raid:'raid',daily:'daily',weekly:'weekly',training:'training',tower:'tower',advancement:'advancement'});
const headerKey=(action,arg)=>action==='tab'?({investment:'investment',market:'market'}[arg]):({attendance:'attendance',systemInbox:'mail',ranking:'ranking',gameMenu:'menu'}[action]);
export function topNavArt(action,arg){const key=headerKey(action,arg);return key?`<img class="menu-art nav-custom-art top-nav-icon" src="${TOP_BUTTON_ART[key]}" alt="" width="28" height="28" decoding="async">`:'';}
