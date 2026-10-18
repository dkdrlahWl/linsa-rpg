import {BLACK_MARKET_NPC,blackMarketRotation,blackMarketOffers,blackMarketRemaining,blackMarketLimit,blackMarketOwned} from './black-market.mjs?v=bm1-20261018';
import {currencyIconURL} from './currency-icons.mjs?v=shop-clean-105';
import {LUCK_POTION} from './consumables.mjs?v=shop-cubes-185';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n).toLocaleString('ko-KR');
// NPC 그림은 이 경로에 넣으면 자동으로 표시된다. 파일이 없으면 빈 칸으로 남는다.
export const BLACK_MARKET_NPC_ART='shop/black-market-npc.webp';
const kstTime=ms=>{const d=new Date(ms+9*3600000);return String(d.getUTCHours()).padStart(2,'0')+':00';};
const blocked=s=>!!(s.battle||s.coopRoom||s.partyRoom);

export function blackMarketMerchant(){
 return `<div class="shop-merchant black-market-merchant"><div class="shop-npc-copy"><small>${esc(BLACK_MARKET_NPC.title)}</small><h2>${esc(BLACK_MARKET_NPC.name)}</h2><p>${esc(BLACK_MARKET_NPC.line)}</p><span>${esc(BLACK_MARKET_NPC.sub)}</span></div><div class="black-market-npc-slot" aria-hidden="true"><img src="${BLACK_MARKET_NPC_ART}" alt="" onerror="this.remove()"></div></div>`;
}

function offerArt(s,D,art,offer){
 if(offer.kind==='boss'){const it=D.designItem(offer.level,s.classId,offer.slot,true,0);return art(it);}
 const src=offer.kind==='potion'?LUCK_POTION.art:currencyIconURL(offer.id);
 return `<img class="consumable-shop-art" src="${src}" alt="${esc(offer.name)}">`;
}
function offerTitle(D,offer){return offer.kind==='boss'?`Lv.${offer.level} 보스장비 · ${esc(D.SLOTS[offer.slot])}`:esc(offer.name);}

export function blackMarketCard(s,D,art,rotationId,offer,index,confirm=false){
 const remaining=blackMarketRemaining(s,rotationId,index),limit=blackMarketLimit(s,rotationId,index),boss=offer.kind==='boss';
 const owned=boss?'':`<span class="consumable-owned">보유 ${fmt(blackMarketOwned(s,offer))}개</span>`;
 const note=boss?`<p>${offer.level===200&&offer.slot!==0?'전 직업 공통 장비':'내 직업 장비로 지급'} · 기본 수치는 구매 시 결정</p>`:'';
 const quantity=confirm&&offer.stock>1?`<div class="consumable-quantity"><label for="bm-buy-quantity">구매 수량</label><div><input id="bm-buy-quantity" data-bm-index="${index}" type="number" inputmode="numeric" min="1" max="${limit}" value="${Math.min(1,limit)||1}"><button type="button" data-action="blackMarketBuyMax" data-arg="${index}">최대</button></div><strong id="bm-buy-total"></strong><small id="bm-buy-error" role="alert"></small></div>`:'';
 const button=confirm?`<button class="gold" data-action="blackMarketBuyConfirm" data-arg="${index}" ${limit<1||blocked(s)?'disabled':''}>구매</button>`:`<button class="gold" data-action="blackMarketBuyPick" data-arg="${index}" ${remaining<1||blocked(s)?'disabled':''}>${remaining<1?'품절':'구매'}</button>`;
 return `<article class="consumable-shop-card black-market-card${boss?' black-market-boss':''}${remaining<1?' sold-out':''}" data-no-currency-art>${offerArt(s,D,art,offer)}<h3>${offerTitle(D,offer)}</h3>${owned}${note}<b class="consumable-price">${fmt(offer.price)} G <small>/ 1개</small></b><span class="consumable-affordable">남은 수량 ${fmt(remaining)} / ${fmt(offer.stock)}</span>${quantity}${button}</article>`;
}

export function blackMarketShop(s,D,art,now=Date.now()){
 const rotation=blackMarketRotation(now),offers=blackMarketOffers(rotation.id);
 return `<section class="consumable-panel consumable-shop-panel black-market-panel" data-bm-rotation="${rotation.id}" data-bm-end="${rotation.end}"><header><h3>오늘의 암시장</h3><span>다음 진열 ${kstTime(rotation.end)} 교체</span></header><div class="consumable-shop-grid black-market-grid">${offers.map((offer,i)=>blackMarketCard(s,D,art,rotation.id,offer,i)).join('')}</div><p class="note">매일 12시 · 18시 · 24시(한국시간)에 3개씩 새로 진열됩니다. 진열 상품은 모든 모험가에게 같고, 남은 수량은 계정마다 따로 계산됩니다. 교체 시간이 지나면 이전 상품은 살 수 없어요.</p></section>`;
}

export function blackMarketPurchaseView(s,D,art,index,now=Date.now()){
 const rotation=blackMarketRotation(now),offer=blackMarketOffers(rotation.id)[index];
 return offer?blackMarketCard(s,D,art,rotation.id,offer,index,true):'';
}

export function updateBlackMarketPurchase(s,root,now=Date.now()){
 const input=root.querySelector('#bm-buy-quantity');
 const button=root.querySelector('[data-action="blackMarketBuyConfirm"]');if(!button)return;
 const index=Number(button.dataset.arg),rotation=blackMarketRotation(now),offer=blackMarketOffers(rotation.id)[index];if(!offer)return;
 const limit=blackMarketLimit(s,rotation.id,index),quantity=input?Number(input.value):1;
 if(input)input.max=String(limit);
 const valid=Number.isSafeInteger(quantity)&&quantity>=1&&quantity<=limit;
 const total=root.querySelector('#bm-buy-total'),error=root.querySelector('#bm-buy-error');
 if(total)total.textContent='총 '+fmt(valid?offer.price*quantity:0)+' G';
 if(error)error.textContent=valid?'':limit?'1~'+fmt(limit)+'개까지 입력해 주세요.':'구매 가능한 수량이 없습니다.';
 button.disabled=!valid||blocked(s);
}
