export const LUCK_POTION = Object.freeze({id:'luckPotion',name:'행운 물약',price:5000000,duration:300000,cooldown:300000,bonus:.5,art:'consumables/luck-potion-v1.webp',description:'일일보스, 주간보스, 레이드 보상 적용됨'});
export function potionCount(state){return Math.max(0,Number.isSafeInteger(state?.consumables?.luckPotion)?state.consumables.luckPotion:0);}
export function luckStatus(state,now=Date.now()){
 const remaining=Math.max(0,Number(state?.buffs?.luckUntil||0)-now),cooldown=Math.max(0,Number(state?.consumableReady?.luckPotion||0)-now);
 return {active:remaining>0,remaining,cooldown};
}
export function rewardChance(chance,state,now){return Math.min(1,Math.max(0,chance)*(luckStatus(state,now).active?1+LUCK_POTION.bonus:1));}
export function consumableCommand(state,command,id,now){
 if(id!==LUCK_POTION.id)throw Error('INVALID_CONSUMABLE');
 const count=potionCount(state);
 if(command==='consumableBuy'){
  if(state.gold<LUCK_POTION.price)throw Error('INSUFFICIENT_GOLD');
  if(count>=1000000)throw Error('INVENTORY_CONSUMABLE_LIMIT');
  state.gold-=LUCK_POTION.price;
  state.consumables={...state.consumables,luckPotion:count+1};
  return {type:command,id,quantity:1,gold:LUCK_POTION.price};
 }
 if(command!=='consumableUse')throw Error('INVALID_CONSUMABLE');
 if(luckStatus(state,now).cooldown>0||luckStatus(state,now).active)throw Error('ITEM_CONSUMABLE_COOLDOWN');
 if(count<1)throw Error('INSUFFICIENT_CONSUMABLE');
 state.consumables={...state.consumables,luckPotion:count-1};
 state.buffs={...state.buffs,luckUntil:now+LUCK_POTION.duration};
 state.consumableReady={...state.consumableReady,luckPotion:now+LUCK_POTION.cooldown};
 return {type:command,id,until:state.buffs.luckUntil,readyAt:state.consumableReady.luckPotion};
}
