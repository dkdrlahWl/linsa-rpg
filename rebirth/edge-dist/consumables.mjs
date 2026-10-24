import {BONUS_FLAME,REROLL_STONE} from './gear-refine.mjs';
export const LUCK_POTION = Object.freeze({id:'luckPotion',name:'행운 물약',price:5000000,duration:300000,cooldown:0,bonus:.5,art:'consumables/luck-potion-v1.webp',description:'일일보스, 주간보스, 레이드 보상 적용됨'});
export const SHOP_CONSUMABLES = Object.freeze([LUCK_POTION, Object.freeze({id:'cube',name:'레드 큐브',price:200000,art:'currencies/cube-red-v2.webp',description:'장비 잠재능력 재설정'}), Object.freeze({id:'highCube',name:'블랙 큐브',price:500000,art:'currencies/cube-black-v2.webp',description:'장비 잠재능력 재설정 · 이전 / 이후 선택'}), Object.freeze({id:'addCube',name:'에디셔널 큐브',price:1000000,art:'currencies/cube-additional-v1.webp',description:'에디셔널 잠재능력 재설정 · 이전 / 이후 선택'}), BONUS_FLAME, REROLL_STONE]);
export const shopConsumable=id=>SHOP_CONSUMABLES.find(item=>item.id===id);
export function shopConsumableCount(state,id){return id===LUCK_POTION.id?potionCount(state):Math.max(0,Number.isSafeInteger(state?.materials?.[id])?state.materials[id]:0);}
export function shopPurchaseLimit(state,id){
 const item=shopConsumable(id);if(!item)return 0;
 const room=Math.max(0,1000000-shopConsumableCount(state,id));
 const affordable=Math.max(0,Math.floor((Number(state?.gold)||0)/item.price));
 return Math.min(room,affordable,id===LUCK_POTION.id?1:1000000);
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
 const count=shopConsumableCount(state,id);
 if(command==='consumableBuy'){
  if(!Number.isSafeInteger(quantity)||quantity<1||(id===LUCK_POTION.id&&quantity!==1))throw Error('INVALID_CONSUMABLE_QUANTITY');
  if(quantity>1000000-count)throw Error('INVENTORY_CONSUMABLE_LIMIT');
  const total=item.price*quantity;
  if(state.gold<total)throw Error('INSUFFICIENT_GOLD');
  state.gold-=total;
  if(id===LUCK_POTION.id)state.consumables={...state.consumables,luckPotion:count+quantity};
  else state.materials={...state.materials,[id]:count+quantity};
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
