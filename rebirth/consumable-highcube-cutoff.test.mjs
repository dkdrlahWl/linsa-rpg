// node rebirth/consumable-highcube-cutoff.test.mjs — 2026-11-03 21시(KST)부터 상점 블랙 큐브 구매 불가
import assert from 'node:assert/strict';
import {consumableCommand,shopConsumableList,HIGH_CUBE_SHOP_END} from './consumables.mjs';
assert.equal(new Date(HIGH_CUBE_SHOP_END).toISOString(),'2026-11-03T12:00:00.000Z');
const s={gold:10_000_000,materials:{}};
consumableCommand(s,'consumableBuy','highCube',HIGH_CUBE_SHOP_END-1,1);assert.equal(s.materials.highCube,1);
assert.throws(()=>consumableCommand(s,'consumableBuy','highCube',HIGH_CUBE_SHOP_END,1),/CONSUMABLE_NOT_SOLD/);
consumableCommand(s,'consumableBuy','cube',HIGH_CUBE_SHOP_END,1);assert.equal(s.materials.cube,1);
assert.ok(shopConsumableList(HIGH_CUBE_SHOP_END-1).some(i=>i.id==='highCube'));
assert.ok(!shopConsumableList(HIGH_CUBE_SHOP_END).some(i=>i.id==='highCube'));
console.log('PASS highCube shop cutoff 21:00 KST');
