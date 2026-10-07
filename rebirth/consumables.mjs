export const LUCK_POTION = Object.freeze({id:'luckPotion',name:'행운 물약',price:5000000,duration:300000,cooldown:300000,bonus:.5,art:'consumables/luck-potion-v1.webp',description:'일일보스, 주간보스, 레이드 보상 적용됨'});
export const SHOP_CONSUMABLES = Object.freeze([LUCK_POTION, Object.freeze({id:'cube',name:'레드 큐브',price:200000,art:'currencies/cube-red-v2.png',description:'장비 잠재능력 재설정'}), Object.freeze({id:'highCube',name:'블랙 큐브',price:500000,art:'currencies/cube-black-v2.png',description:'장비 잠재능력 재설정 · 이전 / 이후 선택'})]);
export const shopConsumable=id=>SHOP_CONSUMABLES.find(item=>item.id===id);
export function shopConsumableCount(state,id){return id===LUCK_POTION.id?potionCount(state):Math.max(0,Number.isSafeInteger(state?.materials?.[id])?state.materials[id]:0);}
export function potionCount(state){return Math.max(0,Number.isSafeInteger(state?.consumables?.luckPotion)?state.consumables.luckPotion:0);}
export function luckStatus(state,now=Date.now()){
 const remaining=Math.max(0,Number(state?.buffs?.luckUntil||0)-now),cooldown=Math.max(0,Number(state?.consumableReady?.luckPotion||0)-now);
 return {active:remaining>0,remaining,cooldown};
}
export function rewardChance(chance,state,now){return Math.min(1,Math.max(0,chance)*(luckStatus(state,now).active?1+LUCK_POTION.bonus:1));}
export function consumableCommand(state,command,id,now){
 const item=shopConsumable(id);
 if(!item)throw Error('INVALID_CONSUMABLE');
 const count=shopConsumableCount(state,id);
 if(command==='consumableBuy'){
  if(state.gold<item.price)throw Error('INSUFFICIENT_GOLD');
  if(count>=1000000)throw Error('INVENTORY_CONSUMABLE_LIMIT');
  state.gold-=item.price;
  if(id===LUCK_POTION.id)state.consumables={...state.consumables,luckPotion:count+1};
  else state.materials={...state.materials,[id]:count+1};
  return {type:command,id,quantity:1,gold:item.price};
 }
 if(id!==LUCK_POTION.id)throw Error('INVALID_CONSUMABLE');
 if(command!=='consumableUse')throw Error('INVALID_CONSUMABLE');
 if(luckStatus(state,now).cooldown>0||luckStatus(state,now).active)throw Error('ITEM_CONSUMABLE_COOLDOWN');
 if(count<1)throw Error('INSUFFICIENT_CONSUMABLE');
 state.consumables={...state.consumables,luckPotion:count-1};
 state.buffs={...state.buffs,luckUntil:now+LUCK_POTION.duration};
 state.consumableReady={...state.consumableReady,luckPotion:now+LUCK_POTION.cooldown};
 return {type:command,id,until:state.buffs.luckUntil,readyAt:state.consumableReady.luckPotion};
}
