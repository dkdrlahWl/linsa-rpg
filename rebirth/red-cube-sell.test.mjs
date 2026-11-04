// 2026-11-05 도현: 상점 되팔기 삭제 — 레드 큐브 포함 어떤 소모품도 상점에 팔 수 없다.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {execute,initialState} from './engine.mjs';
import {consumableShopView} from './consumable-ui.mjs';
import {SELL_PRICES} from './consumables.mjs';
const ctx={now:Date.parse('2026-11-05T10:00:00Z'),random:Math.random,uuid:randomUUID};
let s=initialState('warrior','판매',ctx);s.hunting=false;s.materials.cube=10;
assert.deepEqual(SELL_PRICES,{});
assert.throws(()=>execute(s,'consumableSell',{id:'cube',quantity:1},ctx),/INVALID_CONSUMABLE/);
assert.equal((consumableShopView(s).match(/data-action="consumableSellPick"/g)||[]).length,0);
console.log('PASS shop sell-back removed');
