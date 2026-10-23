import {LUCK_POTION,SHOP_CONSUMABLES,shopConsumable,shopConsumableCount,potionCount,luckStatus,shopPurchaseLimit} from './consumables.mjs?v=shop-cubes-185';
export const potionTime=ms=>{const seconds=Math.ceil(Math.max(0,ms)/1000);return Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');};
export function consumableView(state,shop=false){
 if(shop)return consumableShopView(state);
 const status=luckStatus(state),blocked=!!(state.battle||state.coopRoom||state.partyRoom);
 return `<section class="consumable-panel"><header><h3>${shop?'소모품 상점':'내 소모품'}</h3><span>행운 물약 ${potionCount(state).toLocaleString('ko-KR')}개 보유</span></header><article class="consumable-card" data-no-currency-art><img class="consumable-art" src="${LUCK_POTION.art}" alt="초록빛 행운 물약"><div><h3>행운 물약</h3><strong>5분간 행운 +50%</strong><p>${LUCK_POTION.description}</p><p class="consumable-detail">확률형 보상 획득 확률 ×1.5 · 최대 100%<br>1개당 남은 시간 +5분 · 효과 +50% 유지</p><div class="consumable-times"><span>효과 <b data-luck-duration>${potionTime(status.remaining)}</b></span></div>${shop?'<b class="consumable-price">5,000,000 G</b>':''}<button class="gold" data-action="${shop?'consumableBuyPick':'consumableUse'}" data-arg="luckPotion" ${shop?(blocked||state.gold<LUCK_POTION.price?'disabled':''):(blocked||!potionCount(state)?'disabled':'')}>${shop?'구매':status.active?'시간 +5분':'사용'}</button></div></article><p class="note">${shop?'구매한 물약은 가방 → 소모품에서 사용하세요.':'보스 입장 전에 사용하세요. 사용할 때마다 남은 시간에 5분씩 누적됩니다. 로그아웃 중에도 지속시간이 흐릅니다.'}</p></section>`;
}
export function updateLuckTimers(state,now=Date.now(),root=document){
 const status=luckStatus(state,now);
 for(const node of root.querySelectorAll('[data-luck-duration]'))node.textContent=potionTime(status.remaining);
 for(const node of root.querySelectorAll('[data-luck-cooldown]'))node.textContent=potionTime(status.cooldown);
 for(const button of root.querySelectorAll('[data-action="consumableUse"]')){button.disabled=!!(state?.battle||state?.coopRoom||state?.partyRoom||!potionCount(state));button.textContent=status.active?'시간 +5분':'사용';}
 const host=root.querySelector('.tower-hud')||root.querySelector('.fantasy-player-strip');
 let bar=root.querySelector('.luck-buff-status');
 if(!bar&&host){bar=root.createElement('div');bar.className='luck-buff-status';bar.setAttribute('role','status');bar.innerHTML=`<img src="${LUCK_POTION.art}" alt=""><strong>행운 +50%</strong><span>효과 <b data-luck-duration></b></span>`;host.append(bar);}
 if(bar){bar.hidden=!status.active&&!status.cooldown;bar.querySelector('[data-luck-duration]').textContent=potionTime(status.remaining);bar.querySelector('strong').textContent=status.active?'행운 +50%':'행운 물약';}
}

export function consumableShopCard(state,item,confirm=false){
 const blocked=!!(state.battle||state.coopRoom||state.partyRoom),potion=item.id===LUCK_POTION.id,limit=shopPurchaseLimit(state,item.id);
 return `<article class="consumable-shop-card" data-no-currency-art><img class="consumable-shop-art" src="${item.art}" alt="${item.name}"><h3>${item.name}</h3><span class="consumable-owned">보유 ${shopConsumableCount(state,item.id).toLocaleString('ko-KR')}개</span><p>${potion?'5분간 행운 +50%':item.description}</p>${potion?`<details><summary>효과 자세히</summary><p>${item.description}<br>확률형 보상 확률 ×1.5 · 최대 100%<br>1개당 남은 시간 +5분 · 효과 +50% 유지</p></details>`:''}<b class="consumable-price">${item.price.toLocaleString('ko-KR')} G <small>/ 1개</small></b>${!potion?`<span class="consumable-affordable">구매 가능 ${limit.toLocaleString('ko-KR')}개</span>`:''}${confirm&&!potion?`<div class="consumable-quantity"><label for="shop-buy-quantity">구매 수량</label><div><input id="shop-buy-quantity" data-consumable="${item.id}" type="number" inputmode="numeric" min="1" max="${limit}" step="1" value="${limit?1:0}" ${blocked||!limit?'disabled':''}><button type="button" data-action="consumableBuyMax" data-arg="${item.id}" ${blocked||!limit?'disabled':''}>최대</button></div><p id="shop-buy-total" aria-live="polite">총 ${(limit?item.price:0).toLocaleString('ko-KR')} G</p><p id="shop-buy-error" class="note" aria-live="polite"></p></div>`:''}<button class="gold" data-action="${confirm?'consumableBuyConfirm':'consumableBuyPick'}" data-arg="${item.id}" ${blocked||!limit?'disabled':''}>${confirm?'구매 확정':'구매'}</button></article>`;
}
export function consumableShopView(state){
 return `<section class="consumable-panel consumable-shop-panel"><header><h3>소모품 상점</h3></header><div class="consumable-shop-grid">${SHOP_CONSUMABLES.map(item=>consumableShopCard(state,item)).join('')}</div><p class="note">물약은 가방 → 소모품에서, 큐브는 장비 → 잠재에서 사용하세요.</p></section>`;
}
export function consumablePurchaseView(state,id){const item=shopConsumable(id);return item?consumableShopCard(state,item,true):'';}

export function updateConsumablePurchase(state,root=document){
 const input=root.querySelector('#shop-buy-quantity');if(!input)return;
 const item=shopConsumable(input.dataset.consumable);if(!item)return;
 const limit=shopPurchaseLimit(state,item.id),quantity=Number(input.value);
 input.max=String(limit);
 const valid=Number.isSafeInteger(quantity)&&quantity>=1&&quantity<=limit;
 const total=root.querySelector('#shop-buy-total'),error=root.querySelector('#shop-buy-error');
 if(total)total.textContent='총 '+(Number.isSafeInteger(quantity)&&quantity>0&&quantity<=1000000?item.price*quantity:0).toLocaleString('ko-KR')+' G';
 if(error)error.textContent=valid?'':limit?'1~'+limit.toLocaleString('ko-KR')+'개까지 입력해 주세요.':'구매 가능한 수량이 없습니다.';
 const button=root.querySelector('[data-action="consumableBuyConfirm"]');
 if(button)button.disabled=!valid||!!(state.battle||state.coopRoom||state.partyRoom);
}
