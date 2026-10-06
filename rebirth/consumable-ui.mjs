import {LUCK_POTION,potionCount,luckStatus} from './consumables.mjs?v=luck-potion-175';
export const potionTime=ms=>{const seconds=Math.ceil(Math.max(0,ms)/1000);return Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');};
export function consumableView(state,shop=false){
 const status=luckStatus(state),blocked=!!(state.battle||state.coopRoom||state.partyRoom);
 return `<section class="consumable-panel"><header><h3>${shop?'소모품 상점':'내 소모품'}</h3><span>행운 물약 ${potionCount(state).toLocaleString('ko-KR')}개 보유</span></header><article class="consumable-card" data-no-currency-art><img class="consumable-art" src="${LUCK_POTION.art}" alt="초록빛 행운 물약"><div><h3>행운 물약</h3><strong>5분간 행운 +50%</strong><p>${LUCK_POTION.description}</p><p class="consumable-detail">확률형 보상 획득 확률 ×1.5 · 최대 100%<br>지속시간 5분 · 재사용 대기시간 5분</p><div class="consumable-times"><span>효과 <b data-luck-duration>${potionTime(status.remaining)}</b></span><span>쿨타임 <b data-luck-cooldown>${potionTime(status.cooldown)}</b></span></div>${shop?'<b class="consumable-price">5,000,000 G</b>':''}<button class="gold" data-action="${shop?'consumableBuyPick':'consumableUse'}" data-arg="luckPotion" ${shop?(blocked||state.gold<LUCK_POTION.price?'disabled':''):(blocked||!potionCount(state)||status.cooldown||status.active?'disabled':'')}>${shop?'구매':status.cooldown?'재사용 대기 중':'사용'}</button></div></article><p class="note">${shop?'구매한 물약은 가방 → 소모품에서 사용하세요.':'보스 입장 전에 사용하세요. 로그아웃 중에도 지속시간과 쿨타임이 흐릅니다.'}</p></section>`;
}
export function updateLuckTimers(state,now=Date.now(),root=document){
 const status=luckStatus(state,now);
 for(const node of root.querySelectorAll('[data-luck-duration]'))node.textContent=potionTime(status.remaining);
 for(const node of root.querySelectorAll('[data-luck-cooldown]'))node.textContent=potionTime(status.cooldown);
 for(const button of root.querySelectorAll('[data-action="consumableUse"]')){button.disabled=!!(state?.battle||state?.coopRoom||state?.partyRoom||!potionCount(state)||status.cooldown||status.active);button.textContent=status.cooldown?'재사용 대기 중':'사용';}
 const host=root.querySelector('.tower-hud')||root.querySelector('.fantasy-player-strip');
 let bar=root.querySelector('.luck-buff-status');
 if(!bar&&host){bar=root.createElement('div');bar.className='luck-buff-status';bar.setAttribute('role','status');bar.innerHTML=`<img src="${LUCK_POTION.art}" alt=""><strong>행운 +50%</strong><span>효과 <b data-luck-duration></b></span><span>쿨타임 <b data-luck-cooldown></b></span>`;host.append(bar);}
 if(bar){bar.hidden=!status.active&&!status.cooldown;bar.querySelector('[data-luck-duration]').textContent=potionTime(status.remaining);bar.querySelector('[data-luck-cooldown]').textContent=potionTime(status.cooldown);bar.querySelector('strong').textContent=status.active?'행운 +50%':'행운 물약';}
}
