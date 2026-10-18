import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {initialState,execute,makeItem} from './engine.mjs';
import {bossSalePrice,bossSaleBlock} from './shop-model.mjs';
const ctx={now:0,random:()=>.5,uuid:randomUUID};
const state=()=>{const s=initialState('warrior','판매테스트',ctx);s.hunting=false;s.gold=100;s.items=[];s.equipped={};return s;};
const prices=[300000,600000,900000,1200000,1500000,1800000,2100000,2400000,2700000,3000000,5000000,7000000,9000000,11000000,13000000,16000000,19000000,22000000,25000000,100000000];
for(let i=0;i<prices.length;i++)for(let slot=0;slot<9;slot++)assert.equal(bossSalePrice({boss:true,level:(i+1)*10,slot}),prices[i]*(slot===0?2:1));
let s=state();const weapon=makeItem(90,'warrior',0,true,ctx),armor=makeItem(90,'mage',1,true,ctx),normal=makeItem(90,'warrior',0,false,ctx);s.items=[weapon,armor,normal];
let r=execute(s,'shopSell',{id:weapon.id,price:999999999},ctx);assert.equal(r.state.gold,5400100);assert.equal(r.state.items.length,2);assert.equal(r.events.find(e=>e.type==='shopSell').gold,5400000);assert.throws(()=>execute(r.state,'shopSell',{id:weapon.id},ctx),/ITEM_NOT_FOUND/);
r=execute(r.state,'shopSell',{id:armor.id},ctx);assert.equal(r.state.gold,8100100);assert.equal(r.state.items[0].id,normal.id);assert.throws(()=>execute(s,'shopSell',{id:normal.id},ctx),/SHOP_BOSS_ONLY/);
for(const patch of [{locked:true},{broken:true}]){const t=state(),it={...weapon,...patch};t.items=[it];assert.ok(bossSaleBlock(t,it));assert.throws(()=>execute(t,'shopSell',{id:it.id},ctx),/ITEM_PROTECTED/);}
for(const flag of ['battle','coopRoom','partyRoom','pendingCube','equipped']){const t=state();t.items=[weapon];t[flag]=flag==='pendingCube'?{id:weapon.id}:flag==='equipped'?{0:weapon.id}:flag==='battle'?{kind:'tower'}:'room';assert.ok(bossSaleBlock(t,weapon));assert.throws(()=>execute(t,'shopSell',{id:weapon.id},ctx));}
const bound=state();bound.items=[{...weapon,bound:true,stars:25,lines:[{key:'attackPct',value:35,grade:4}]}];assert.equal(execute(bound,'shopSell',{id:weapon.id},ctx).state.gold,5400100);
assert.equal(s.items.length,3);assert.equal(s.gold,100);
console.log('PASS boss-only sales, 9 slots/20 levels, protected items, forged price, duplicate sale, exact gold, input preserved');

for(let slot=0;slot<9;slot++){
 const s=state(),it=makeItem(200,'warrior',slot,true,ctx);s.items=[it];
 const value=slot===0?200000000:100000000,result=execute(s,'shopSell',{id:it.id,price:1},ctx);
 assert.equal(result.state.gold,100+value);assert.equal(result.state.items.length,0);assert.equal(result.events.find(e=>e.type==='shopSell').gold,value);
}
console.log('PASS level-200 sales: weapon 200M, other eight slots 100M, actual gold credit and removal');
