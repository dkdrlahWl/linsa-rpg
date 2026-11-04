import {costumeShop} from './costume-ui.mjs?v=shop-tabs-122';
import {skillLookShop} from './skill-look-ui.mjs';
import {bossSalePrice,bossSaleBlock} from './shop-model.mjs?v=shop-price-20261013b';
import {consumableView} from './consumable-ui.mjs?v=nored-20261105';
import {blackMarketShop,blackMarketMerchant} from './black-market-ui.mjs?v=bm8-20261018';
import {MILEAGE_SHOP,mileageCount,VIP_TIERS,vipTier,vipNext,celiaVolume,mileagePrice} from './mileage.mjs?v=lock450-20261104';
import {TITLE_BY_ID} from './titles-data.mjs';
const titleName=id=>id&&TITLE_BY_ID[id]?'「'+TITLE_BY_ID[id].name+'」':'없음';
import {currencyIconURL} from './currency-icons.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number(n).toLocaleString('ko-KR');
export function shopView(s,D,art,page='boss',lookClass=s.classId){
 if(page==='skilllook'){
  return `<section class="boss-shop" data-currency-label="gold"><div class="shop-heading"><span>셀리아의 상점</span><h1>상점</h1></div>${shopCategories(page)}${skillLookShop(s,lookClass)}</section>`;
 }
 const blackMarket=page==='blackmarket',costume=page==='costume',consumable=page==='consumable',mileage=page==='mileage',category=blackMarket?'blackmarket':consumable?'consumable':mileage?'mileage':costume?'costume':'boss';
 return `<section class="boss-shop" data-currency-label="gold"><div class="shop-heading"><span>셀리아의 상점</span><h1>상점</h1></div>${shopCategories(category)}${blackMarket?blackMarketMerchant()+blackMarketShop(s,D,art):`<div class="shop-merchant"><div class="shop-npc-copy"><small>${mileage?'단골 손님 감사 상점':consumable?'모험을 돕는 소모품':costume?'직업별 특별 의상':'보스장비 수집가'}</small><h2>셀리아</h2><p>${mileage?'마일리지로 골라봐!':consumable?'물약과 큐브를 골라봐!':costume?'새로운 의상을 골라봐!':'좋은 보스장비 있어?'}</p><span>${mileage?`거래할 때마다 ${(vipTier(s).rate*100).toLocaleString('ko-KR')}%씩 적립해줄게.`:consumable?'모험과 장비 강화에 필요한 소모품이야.':costume?'마음에 드는 코스튬으로 모험해봐.':'가져온 장비를 골드로 바꿔줄게.'}</span></div><img src="shop/celia-v1.webp" alt="상점 주인 셀리아의 상반신" class="shop-npc" fetchpriority="high"></div>${mileage?mileageShop(s):consumable?consumableView(s,true):costume?costumeShop(s):bossShop(s,D,art)}`}</section>`;
}
function shopCategories(category){return `<nav class="shop-categories" aria-label="상점 카테고리">${[['boss','보스장비'],['costume','코스튬'],['skilllook','스킬 외형'],['consumable','소모품'],['mileage','마일리지'],['blackmarket','암시장']].map(([id,label])=>`<button type="button" data-action="shopCategory" data-arg="${id}" aria-pressed="${category===id}" data-illustrated="1" class="${category===id?'active':''}"><img class="shop-category-art" src="${id==='mileage'?currencyIconURL('mileage'):`shop/celia-premium/category-${id}.webp`}" alt=""><span>${label}</span></button>`).join('')}</nav>`;}
function bossShop(s,D,art){
 const items=s.items.filter(it=>it.boss===true).sort((a,b)=>b.level-a.level||a.slot-b.slot);
 return `<section class="shop-sale-section"><header><div><small>판매 전용</small><h2>보스장비 판매</h2></div><span>보유 ${items.length}개</span></header><div class="shop-price-guide"><div><span>무기</span><strong>나머지 부위 판매가의 2배</strong></div><div><span>나머지 부위</span><strong>10~100제: 10레벨당 300,000 G</strong></div><p>110~150제: 10레벨마다 2,000,000 G 증가 · 160~190제: 3,000,000 G 증가<br>90제 무기 5,400,000 G · 나머지 부위 2,700,000 G<br>190제 무기 50,000,000 G · 나머지 부위 25,000,000 G<br>200제 무기 400,000,000 G · 나머지 부위 200,000,000 G<br>강화·잠재와 관계없이 장비 레벨 기준 · 수수료 없음</p></div><div class="shop-gear-list">${items.length?items.map(it=>{const reason=bossSaleBlock(s,it);return `<article class="shop-gear-card">${art(it)}<div><small>Lv.${it.level} · ${esc(D.SLOTS[it.slot])}</small><strong>${esc(D.gearName(it))}</strong><span>${esc(D.CLASSES.find(c=>c.id===it.classId)?.name||'')} · ${it.stars||0}성</span><b>${fmt(bossSalePrice(it))} G</b></div><button data-action="shopSellPick" data-arg="${esc(it.id)}" data-illustrated="1" ${reason?'disabled':''}>${reason||'판매'}</button></article>`;}).join(''):'<div class="shop-empty"><strong>판매할 보스장비가 없어.</strong><p>보스장비를 얻으면 이곳에서 판매할 수 있어요.</p></div>'}</div><p class="shop-note">보스장비만 표시됩니다. 장착·잠금·파괴·큐브 옵션 선택 중인 장비는 판매할 수 없습니다.</p></section>`;
}

// 2026-11-03 도현: 셀리아 마일리지 상점. 소모품 구매·판매, 보스장비 판매 금액의 1%가 쌓인다.
const MILEAGE_ART={tribeTicket:'tribes/polished-v1/ticket-transparent-v2.webp'};
const short=n=>n>=1e8?(n/1e8).toLocaleString('ko-KR',{maximumFractionDigits:1})+'억':fmt(n);
function vipCard(s){
 const t=vipTier(s),next=vipNext(s),v=celiaVolume(s),pct=next?Math.min(100,Math.floor((v-t.need)/(next.need-t.need)*100)):100;
 const table=VIP_TIERS.filter(x=>x.level>0).map(x=>`<tr class="${x.level===t.level?'on':''}"><td>VIP ${x.level} · ${esc(x.name)}</td><td>${short(x.need)} G</td><td>${(x.rate*100).toFixed(1).replace(/\.0$/,'')}%</td><td><img class="vip-table-title" src="titles/${x.title}.svg?v=celia-title-style-v2" alt="${esc(titleName(x.title))}"></td></tr>`).join('');
 return `<section class="vip-card vip-${t.level}"><div class="vip-head"><div class="vip-badge"><img src="titles-src/plates/vip${Math.max(1,t.level)}.webp?v=celia-title-style-v2" alt=""><span>VIP <b>${t.level}</b></span></div><div><small>셀리아 VIP</small><h3>${esc(t.name)}</h3><p>누적 거래 <b>${fmt(v)} G</b> · 마일리지 적립 <b>${(t.rate*100).toFixed(1).replace(/\.0$/,'')}%</b></p></div></div>${next?`<div class="vip-bar"><i style="width:${pct}%"></i></div><p class="vip-next">다음 등급 <b>VIP ${next.level} ${esc(next.name)}</b>까지 ${fmt(next.need-v)} G</p>`:'<p class="vip-next">최고 등급이에요!</p>'}<div class="vip-gift">${t.title?`<img class="vip-title-preview" src="titles/${t.title}.svg?v=celia-title-style-v2" alt="${esc(titleName(t.title))}">`:'거래를 쌓고 첫 VIP 칭호를 받아보세요'}</div><details><summary>등급표 보기</summary><table class="vip-table"><tr><th>등급</th><th>누적 거래</th><th>적립률</th><th>칭호</th></tr>${table}</table><p class="note">누적 거래 = 셀리아에게 소모품 구매·판매, 보스장비 판매한 골드 합계. 등급에 오르면 칭호가 자동으로 생겨요(칭호 1개당 치명타 피해 +0.5%).</p></details></section>`;
}
function mileageShop(s){
 const have=mileageCount(s),t=vipTier(s);
 const tiles=MILEAGE_SHOP.map(o=>{const price=mileagePrice(s,o),can=have>=price,ten=have>=mileagePrice(s,o,10);return `<article class="mileage-tile${can?'':' poor'}"><img src="${MILEAGE_ART[o.key]||currencyIconURL(o.key)}" alt=""><strong>${esc(o.name)}</strong><b class="mileage-price"><img class="mileage-currency-art" src="${currencyIconURL('mileage')}" alt="마일리지" width="22" height="22">${fmt(price)}</b><div class="mileage-buy"><button data-action="mileageBuy" data-arg="${o.id}:1" data-write class="gold"${can?'':' disabled data-unavailable'}>1개</button><button data-action="mileageBuy" data-arg="${o.id}:10" data-write${ten?'':' disabled data-unavailable'}>10개</button></div></article>`;}).join('');
 return `${vipCard(s)}<section class="shop-sale-section mileage-shop"><header><div><small>셀리아 마일리지</small><h2>마일리지 상점</h2></div><span class="mileage-wallet"><img class="mileage-currency-art" src="${currencyIconURL('mileage')}" alt="마일리지" width="22" height="22"><b>${fmt(have)}</b></span></header><p class="shop-note">셀리아에게 <b>소모품을 사거나 팔 때</b>, <b>보스장비를 팔 때</b> 오간 골드의 <b>${(t.rate*100).toFixed(1).replace(/\.0$/,'')}%</b>가 마일리지로 쌓여요. VIP 등급이 오를수록 적립률이 올라가요 (VIP 10 최대 10%).</p><div class="mileage-grid">${tiles}</div></section>`;
}
