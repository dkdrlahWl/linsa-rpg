import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {execute,initialState} from './engine.mjs';
import {consumableShopView,consumableSellView} from './consumable-ui.mjs';
const ctx={now:Date.parse('2026-10-25T10:00:00Z'),random:Math.random,uuid:randomUUID};
let s=initialState('warrior','판매',ctx);s.hunting=false;s.materials.cube=10;const g=s.gold;
s=execute(s,'consumableSell',{id:'cube',quantity:4},ctx).state;
assert.equal(s.materials.cube,6);assert.equal(s.gold,g+200000);
assert.throws(()=>execute(s,'consumableSell',{id:'cube',quantity:7},ctx),/INSUFFICIENT_CONSUMABLE/);
assert.throws(()=>execute(s,'consumableSell',{id:'cube',quantity:0},ctx),/INVALID_CONSUMABLE_QUANTITY/);
assert.throws(()=>execute(s,'consumableSell',{id:'highCube',quantity:1},ctx),/INVALID_CONSUMABLE/);
const shop=consumableShopView(s);assert.equal((shop.match(/data-action="consumableSellPick"/g)||[]).length,1);assert.match(shop,/consumableSellPick" data-arg="cube"/);
assert.match(consumableSellView(s,'cube'),/보유 6개[\s\S]*판매가 50,000 G/);
console.log('PASS red cube sells at 50,000 G each, owned-count cap, only red cube has a sell button');
// 숲 지렁이 600개 묶음 구매가 서버 검증을 통과해야 함.
{let f=initialState('warrior','미끼',ctx);f.hunting=false;f.gold=1e6;f=execute(f,'fishBaitBuy',{bait:'worm',count:600,currency:'gold'},ctx).state;assert.equal(f.fishing.bait.worm,620);assert.equal(f.gold,1e6-60000);console.log('PASS worm 600 pack buy');}
