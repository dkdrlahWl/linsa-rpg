import assert from "node:assert/strict";
import { inventoryGroups } from "./inventory-order.mjs";

const classes = ["warrior", "mage", "archer", "rogue", "pirate"].map((id) => ({ id }));
const item = (id, classId, slot, stars = 0, extra = {}) => ({ id, classId, slot, stars, level: 20, grade: 1, locked: false, ...extra });
const items = [
  item("mage-gloves", "mage", 4),
  item("warrior-helm", "warrior", 1),
  item("archer-weapon", "archer", 0),
  item("mage-weapon", "mage", 0, 25),
  item("warrior-weapon", "warrior", 0),
  item("mage-helm", "mage", 1, 18, { locked: true }),
  item("mage-equipped", "mage", 1, 0),
  item("mage-stronger", "mage", 1, 25),
];
const groups = inventoryGroups(items, classes, "mage", ["mage-equipped"]);
assert.deepEqual(groups.map(({ classId }) => classId), ["mage", "warrior", "archer"]);
assert.deepEqual(groups[0].slots.map(({ slot }) => slot), [0, 1, 4]);
assert.deepEqual(groups[0].slots[1].items.map(({ id }) => id), ["mage-equipped", "mage-stronger", "mage-helm"]);
assert.deepEqual(groups.map(({ count }) => count), [5, 2, 1]);
assert.deepEqual(inventoryGroups(items, classes, "mage", [], "warrior", "1").flatMap((group) => group.slots.flatMap((slot) => slot.items.map((it) => it.id))), ["warrior-helm"]);
assert.deepEqual(items.map(({ id }) => id), ["mage-gloves", "warrior-helm", "archer-weapon", "mage-weapon", "warrior-weapon", "mage-helm", "mage-equipped", "mage-stronger"]);
{
  const gear = [
    item("lv150-25", "warrior", 3, 25, { level: 150, boss: true }),
    item("lv200-0", "warrior", 3, 0, { level: 200, boss: true }),
    item("lv200-normal", "warrior", 3, 22, { level: 200 }),
    item("preset", "warrior", 3, 0, { level: 100, boss: true }),
    item("worn", "warrior", 3, 0, { level: 90 }),
    item("weapon", "warrior", 0, 0, { level: 90 }),
  ];
  const presets = { warrior: { active: 0, list: [null, { 3: "preset" }, null] } };
  const [warrior] = inventoryGroups(gear, classes, "warrior", ["worn"], "", "", presets);
  assert.deepEqual(warrior.slots.map(({ slot }) => slot), [0, 3]);
  assert.deepEqual(warrior.slots[1].items.map(({ id }) => id), ["worn", "preset", "lv200-0", "lv150-25", "lv200-normal"]);
}
console.log("PASS: own class first, one header per slot, equipped/preset/boss/level priority, filters, original order preserved.");
