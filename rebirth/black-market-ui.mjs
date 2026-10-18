import {BLACK_MARKET_NPC,BLACK_MARKET_GOODS,BLACK_MARKET_BOSS_LEVELS,BLACK_MARKET_BOSS_CHANCE,blackMarketBossPrice,blackMarketRotation,blackMarketOffersFor,blackMarketRemaining,blackMarketLimit,blackMarketOwned} from './black-market.mjs?v=bm4-20261018';
import {currencyIconURL} from './currency-icons.mjs?v=shop-clean-105';
import {LUCK_POTION} from './consumables.mjs?v=shop-cubes-185';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n).toLocaleString('ko-KR');
// Portrait cutout is contained within the merchant slot at every viewport.
export const BLACK_MARKET_NPC_ART='shop/black-market-bellok-v1.webp';
const kstTime=ms=>{const d=new Date(ms+9*3600000);return String(d.getUTCHours()).padStart(2,'0')+':00';};
const blocked=s=>!!(s.battle||s.coopRoom||s.partyRoom);

export function blackMarketMerchant(){
 return `<div class="shop-merchant black-market-merchant"><div class="shop-npc-copy"><small>${esc(BLACK_MARKET_NPC.title)}</small><h2>${esc(BLACK_MARKET_NPC.name)}</h2><p>${esc(BLACK_MARKET_NPC.line)}</p><span>${esc(BLACK_MARKET_NPC.sub)}</span></div><div class="black-market-npc-slot"><img src="${BLACK_MARKET_NPC_ART}" alt="암시장 상인 ${esc(BLACK_MARKET_NPC.name)}" width="1024" height="1536" decoding="async" fetchpriority="high"></div></div>`;
}

function offerArt(s,D,art,offer){
 if(offer.kind==='boss'){const it=D.designItem(offer.level,offer.classId||s.classId,offer.slot,true,0);return art(it);}
 const src=offer.kind==='potion'?LUCK_POTION.art:currencyIconURL(offer.id);
 return `<img class="consumable-shop-art" src="${src}" alt="${esc(offer.name)}">`;
}
function offerTitle(D,offer){return offer.kind==='boss'?`Lv.${offer.level} 보스장비 · ${esc(D.SLOTS[offer.slot])}`:esc(offer.name);}

export function blackMarketCard(s,D,art,rotationId,offer,index,confirm=false){
 const remaining=blackMarketRemaining(s,rotationId,index),limit=blackMarketLimit(s,rotationId,index),boss=offer.kind==='boss';
 const owned=boss?'':`<span class="consumable-owned">보유 ${fmt(blackMarketOwned(s,offer))}개</span>`;
 const note=boss?`<p>${offer.classId?esc(D.CLASSES.find(c=>c.id===offer.classId)?.name||'')+' 전용 장비':offer.level===200&&offer.slot!==0?'전 직업 공통 장비':'내 직업 장비로 지급'} · 기본 수치는 구매 시 결정</p>`:'';
 const quantity=confirm&&offer.stock>1?`<div class="consumable-quantity"><label for="bm-buy-quantity">구매 수량</label><div><input id="bm-buy-quantity" data-bm-index="${index}" type="number" inputmode="numeric" min="1" max="${limit}" value="${Math.min(1,limit)||1}"><button type="button" data-action="blackMarketBuyMax" data-arg="${index}">최대</button></div><strong id="bm-buy-total"></strong><small id="bm-buy-error" role="alert"></small></div>`:'';
 const button=confirm?`<button class="gold" data-action="blackMarketBuyConfirm" data-arg="${index}" ${limit<1||blocked(s)?'disabled':''}>구매</button>`:`<button class="gold" data-action="blackMarketBuyPick" data-arg="${index}" ${remaining<1||blocked(s)?'disabled':''}>${remaining<1?'품절':'구매'}</button>`;
 return `<article class="consumable-shop-card black-market-card${boss?' black-market-boss':''}${remaining<1?' sold-out':''}" data-no-currency-art>${offerArt(s,D,art,offer)}<h3>${offerTitle(D,offer)}</h3>${owned}${note}<b class="consumable-price">${fmt(offer.price)} G <small>/ 1개</small></b><span class="consumable-affordable">남은 수량 ${fmt(remaining)} / ${fmt(offer.stock)}</span>${quantity}${button}</article>`;
}

export function blackMarketShop(s,D,art,now=Date.now()){
 const rotation=blackMarketRotation(now),offers=blackMarketOffersFor(s,rotation.id);
 return `<section class="consumable-panel consumable-shop-panel black-market-panel" data-bm-rotation="${rotation.id}" data-bm-end="${rotation.end}"><header><h3>오늘의 암시장</h3><span>다음 진열 ${kstTime(rotation.end)} 교체</span></header><div class="consumable-shop-grid black-market-grid">${offers.map((offer,i)=>blackMarketCard(s,D,art,rotation.id,offer,i)).join('')}</div><p class="note">매일 12시 · 18시 · 24시(한국시간)에 3개씩 새로 진열됩니다. 진열 상품은 모든 모험가에게 같고, 남은 수량은 계정마다 따로 계산됩니다. 교체 시간이 지나면 이전 상품은 살 수 없어요.</p>${blackMarketCatalog()}</section>`;
}

const man=n=>n>=100000000?(n/100000000)+'억':n>=10000?fmt(n/10000)+'만':fmt(n);
export function blackMarketCatalog(){
 const goods=BLACK_MARKET_GOODS.map(g=>`<tr><td>${esc(g.name)}</td><td>${fmt(g.stock)}개</td><td>${fmt(g.price)} G</td></tr>`).join('');
 const boss=BLACK_MARKET_BOSS_LEVELS.map(([level])=>`<tr><td>${level}제</td><td>${man(blackMarketBossPrice(level,0))} G</td><td>${man(blackMarketBossPrice(level,1))} G</td></tr>`).join('');
 return `<section class="black-market-catalog"><h4>암시장 진열 상품 목록</h4><p>진열될 때마다 아래 상품 중 3개가 겹치지 않게 나옵니다.</p><table><thead><tr><th>상품</th><th>진열 수량</th><th>가격(1개)</th></tr></thead><tbody>${goods}</tbody></table><h4>보스장비 <small>(진열 확률 ${BLACK_MARKET_BOSS_CHANCE*100}% · 1개 진열 · 레벨이 높을수록 드묾)</small></h4><table><thead><tr><th>레벨</th><th>무기</th><th>나머지 부위</th></tr></thead><tbody>${boss}</tbody></table></section>`;
}
export function blackMarketPurchaseView(s,D,art,index,now=Date.now()){
 const rotation=blackMarketRotation(now),offer=blackMarketOffersFor(s,rotation.id)[index];
 return offer?blackMarketCard(s,D,art,rotation.id,offer,index,true):'';
}

export function updateBlackMarketPurchase(s,root,now=Date.now()){
 const input=root.querySelector('#bm-buy-quantity');
 const button=root.querySelector('[data-action="blackMarketBuyConfirm"]');if(!button)return;
 const index=Number(button.dataset.arg),rotation=blackMarketRotation(now),offer=blackMarketOffersFor(s,rotation.id)[index];if(!offer)return;
 const limit=blackMarketLimit(s,rotation.id,index),quantity=input?Number(input.value):1;
 if(input)input.max=String(limit);
 const valid=Number.isSafeInteger(quantity)&&quantity>=1&&quantity<=limit;
 const total=root.querySelector('#bm-buy-total'),error=root.querySelector('#bm-buy-error');
 if(total)total.textContent='총 '+fmt(valid?offer.price*quantity:0)+' G';
 if(error)error.textContent=valid?'':limit?'1~'+fmt(limit)+'개까지 입력해 주세요.':'구매 가능한 수량이 없습니다.';
 button.disabled=!valid||blocked(s);
}
