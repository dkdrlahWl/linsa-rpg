import {BONUS_FLAME,REROLL_STONE} from './gear-refine.mjs';
// 2026-11-03 도현: 링구의 머리카락 — 상점 1억 G. 거래 불가 장비에 바르면 거래 1회 가능(횟수 제한 없음).
export const RINGU_HAIR = Object.freeze({id:'ringuHair',name:'링구의 머리카락',price:100000000,art:'currencies/ringu-hair-v1.webp',description:'거래 불가 장비를 1회 거래 가능하게'});
export const LUCK_POTION = Object.freeze({id:'luckPotion',name:'행운 물약',price:5000000,duration:300000,cooldown:0,bonus:.5,art:'consumables/luck-potion-v1.webp',description:'일일보스, 주간보스, 레이드 보상 적용됨'});
export const SHOP_CONSUMABLES = Object.freeze([LUCK_POTION, Object.freeze({id:'cube',name:'레드 큐브',price:200000,art:'currencies/cube-red-v2.webp',description:'장비 잠재능력 재설정'}), Object.freeze({id:'highCube',name:'블랙 큐브',price:500000,art:'currencies/cube-black-v2.webp',description:'장비 잠재능력 재설정 · 이전 / 이후 선택'}), BONUS_FLAME,  REROLL_STONE, RINGU_HAIR]); // 2026-11-04 도현: 에디셔널 큐브 상점 판매 중단 · 추가옵션 불꽃은 500만 G, 주 3개 (탐험가 제작·교환소·마일리지로 공급)
// 2026-10-25: 상점 되팔기 (개당 판매가)
export const SELL_PRICES=Object.freeze({cube:50000});
// 2026-11-04 도현: 상점 하루 구매 한도 (연금술사 제작이 주 공급원이 되도록)
export const SHOP_DAILY_LIMITS=Object.freeze({cube:50});
const shopDay=now=>new Date(now+9*3600e3).toISOString().slice(0,10);
// 2026-11-04 도현: 상점 주간 구매 한도 (월요일 00시 KST 초기화)
export const SHOP_WEEKLY_LIMITS=Object.freeze({bonusFlame:3});
const shopWeek=now=>{const d=new Date(now+9*3600e3);d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d.toISOString().slice(0,10);};
export function shopBoughtWeek(state,id,now=Date.now()){const w=shopWeek(now);return state?.shopWeekly?.week===w?(state.shopWeekly.bought?.[id]||0):0;}
export const shopWeeklyLeft=(state,id,now=Date.now())=>SHOP_WEEKLY_LIMITS[id]?Math.max(0,SHOP_WEEKLY_LIMITS[id]-shopBoughtWeek(state,id,now)):Infinity;
export function shopBoughtToday(state,id,now=Date.now()){const d=shopDay(now);return state?.shopDaily?.day===d?(state.shopDaily.bought?.[id]||0):0;}
export const shopDailyLeft=(state,id,now=Date.now())=>SHOP_DAILY_LIMITS[id]?Math.max(0,SHOP_DAILY_LIMITS[id]-shopBoughtToday(state,id,now)):Infinity;
export const shopSellLimit=(state,id)=>SELL_PRICES[id]?Math.max(0,Math.min(shopConsumableCount(state,id),Math.floor((Number.MAX_SAFE_INTEGER-(Number(state?.gold)||0))/SELL_PRICES[id]))):0;
// 2026-11-03 도현: 21시(KST)부터 상점에서 블랙 큐브 구매 불가.
export const HIGH_CUBE_SHOP_END=Date.UTC(2026,10,3,12);
// 2026-11-05 도현: 레드 큐브도 상점 판매 중단 (블랙 큐브는 11/3부터 중단)
export const shopConsumableOpen=(id,now=Date.now())=>!(id==='cube'||(id==='highCube'&&now>=HIGH_CUBE_SHOP_END));
export const shopConsumableList=(now=Date.now())=>SHOP_CONSUMABLES.filter(item=>shopConsumableOpen(item.id,now));
export const shopConsumable=id=>SHOP_CONSUMABLES.find(item=>item.id===id);
export function shopConsumableCount(state,id){return id===LUCK_POTION.id?potionCount(state):Math.max(0,Number.isSafeInteger(state?.materials?.[id])?state.materials[id]:0);}
export function shopPurchaseLimit(state,id){
 const item=shopConsumable(id);if(!item)return 0;
 const room=Math.max(0,1000000-shopConsumableCount(state,id));
 const affordable=Math.max(0,Math.floor((Number(state?.gold)||0)/item.price));
 return Math.min(room,affordable,id===LUCK_POTION.id?1:1000000,shopDailyLeft(state,id),shopWeeklyLeft(state,id));
}
export function potionCount(state){return Math.max(0,Number.isSafeInteger(state?.consumables?.luckPotion)?state.consumables.luckPotion:0);}
export function luckStatus(state,now=Date.now()){
 const remaining=Math.max(0,Number(state?.buffs?.luckUntil||0)-now),cooldown=0;
 return {active:remaining>0,remaining,cooldown};
}
// 2026-10-13: 일보·주보·성채 보스 장비 실제 드롭률 배율 (확률 안내 표기는 기존 값 유지)
export const BOSS_GEAR_RATE_SCALE=0.7;
export function rewardChance(chance,state,now){return Math.min(1,Math.max(0,chance)*(luckStatus(state,now).active?1+LUCK_POTION.bonus:1));}
export function consumableCommand(state,command,id,now,quantity=1){
 const item=shopConsumable(id);
 if(!item)throw Error('INVALID_CONSUMABLE');
 if(command==='consumableBuy'&&!shopConsumableOpen(id,now))throw Error('CONSUMABLE_NOT_SOLD');
 const count=shopConsumableCount(state,id);
 if(command==='consumableSell'){
  const price=SELL_PRICES[id];if(!price)throw Error('INVALID_CONSUMABLE');
  if(!Number.isSafeInteger(quantity)||quantity<1)throw Error('INVALID_CONSUMABLE_QUANTITY');
  if(quantity>count)throw Error('INSUFFICIENT_CONSUMABLE');
  const total=price*quantity;
  state.materials={...state.materials,[id]:count-quantity};
  state.gold=(Number(state.gold)||0)+total;
  return {type:command,id,quantity,gold:total};
 }
 if(command==='consumableBuy'){
  if(!Number.isSafeInteger(quantity)||quantity<1||(id===LUCK_POTION.id&&quantity!==1))throw Error('INVALID_CONSUMABLE_QUANTITY');
  if(quantity>1000000-count)throw Error('INVENTORY_CONSUMABLE_LIMIT');
  if(SHOP_DAILY_LIMITS[id]&&quantity>shopDailyLeft(state,id,now))throw Error('SHOP_DAILY_LIMIT');
  if(SHOP_WEEKLY_LIMITS[id]&&quantity>shopWeeklyLeft(state,id,now))throw Error('SHOP_WEEKLY_LIMIT');
  const total=item.price*quantity;
  if(state.gold<total)throw Error('INSUFFICIENT_GOLD');
  state.gold-=total;
  if(id===LUCK_POTION.id)state.consumables={...state.consumables,luckPotion:count+quantity};
  else state.materials={...state.materials,[id]:count+quantity};
  if(SHOP_DAILY_LIMITS[id]){const d=shopDay(now);if(state.shopDaily?.day!==d)state.shopDaily={day:d,bought:{}};state.shopDaily.bought[id]=(state.shopDaily.bought[id]||0)+quantity;}
  if(SHOP_WEEKLY_LIMITS[id]){const w=shopWeek(now);if(state.shopWeekly?.week!==w)state.shopWeekly={week:w,bought:{}};state.shopWeekly.bought[id]=(state.shopWeekly.bought[id]||0)+quantity;}
  return {type:command,id,quantity,gold:total};
 }
 if(id!==LUCK_POTION.id)throw Error('INVALID_CONSUMABLE');
 if(command!=='consumableUse')throw Error('INVALID_CONSUMABLE');
 if(count<1)throw Error('INSUFFICIENT_CONSUMABLE');
 state.consumables={...state.consumables,luckPotion:count-1};
 state.buffs={...state.buffs,luckUntil:Math.max(now,Number(state.buffs?.luckUntil)||0)+LUCK_POTION.duration};
 state.consumableReady={...state.consumableReady,luckPotion:0};
 return {type:command,id,until:state.buffs.luckUntil,readyAt:state.consumableReady.luckPotion};
}
