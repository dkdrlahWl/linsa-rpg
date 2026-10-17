import assert from 'node:assert/strict';
import {consumableCommand,shopPurchaseLimit} from './consumables.mjs';
import {consumablePurchaseView,consumableShopView,updateConsumablePurchase} from './consumable-ui.mjs';
import {initialState,execute} from './engine.mjs';
for(const [id,price] of [['cube',200000],['highCube',500000]]){
 const s={gold:price*25,materials:{[id]:5}};
 assert.equal(shopPurchaseLimit(s,id),25);
 const reward=consumableCommand(s,'consumableBuy',id,0,25);
 assert.equal(s.gold,0);assert.equal(s.materials[id],30);assert.equal(reward.quantity,25);assert.equal(reward.gold,price*25);
 for(const quantity of [0,-1,1.5,Infinity,NaN,'3',1000001]){
  const invalid={gold:price*100,materials:{}};const before=structuredClone(invalid);
  assert.throws(()=>consumableCommand(invalid,'consumableBuy',id,0,quantity));assert.deepEqual(invalid,before);
 }
 const capped={gold:price*100,materials:{[id]:999998}};assert.equal(shopPurchaseLimit(capped,id),2);
 assert.throws(()=>consumableCommand(capped,'consumableBuy',id,0,3),/INVENTORY_CONSUMABLE_LIMIT/);
 const poor={gold:price*2-1,materials:{}};assert.equal(shopPurchaseLimit(poor,id),1);
 assert.throws(()=>consumableCommand(poor,'consumableBuy',id,0,2),/INSUFFICIENT_GOLD/);assert.deepEqual(poor.materials,{});
 const state={gold:price*3,materials:{}};
 assert.match(consumablePurchaseView(state,id),/id="shop-buy-quantity"/);assert.match(consumablePurchaseView(state,id),/max="3"/);
 assert.match(consumableShopView(state),/구매 가능/);
 const input={dataset:{consumable:id},value:'2'},total={},error={},button={};
 const root={querySelector:selector=>({'#shop-buy-quantity':input,'#shop-buy-total':total,'#shop-buy-error':error,'[data-action="consumableBuyConfirm"]':button}[selector])};
 updateConsumablePurchase(state,root);assert.equal(button.disabled,false);assert.equal(total.textContent,'총 '+(price*2).toLocaleString('ko-KR')+' G');
 input.value='4';updateConsumablePurchase(state,root);assert.equal(button.disabled,true);
 input.value='1.5';updateConsumablePurchase(state,root);assert.equal(button.disabled,true);
 state.gold=0;input.value='1';updateConsumablePurchase(state,root);assert.equal(button.disabled,true);assert.equal(input.max,'0');
}
const ctx={now:100000,random:()=>.5,uuid:()=>crypto.randomUUID()},state=initialState('warrior','대량구매',ctx);state.hunting=false;state.gold=2000000;
const buy=execute(state,'consumableBuy',{id:'cube',quantity:10,price:1},ctx);assert.equal(buy.state.gold,0);assert.equal(buy.state.materials.cube,(state.materials.cube||0)+10);assert.equal(buy.events.find(e=>e.type==='consumableBuy').gold,2000000);
assert.throws(()=>consumableCommand({gold:10000000},'consumableBuy','luckPotion',0,2),/INVALID_CONSUMABLE_QUANTITY/);
console.log('PASS red/black bulk totals and caps, malformed/decimal/excess quantities, live total/button validation and engine integration with authoritative prices');
