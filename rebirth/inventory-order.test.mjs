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
assert.deepEqual(groups[0].slots[1].items.map(({ id }) => id), ["mage-equipped", "mage-helm", "mage-stronger"]);
assert.deepEqual(groups.map(({ count }) => count), [5, 2, 1]);
assert.deepEqual(inventoryGroups(items, classes, "mage", [], "warrior", "1").flatMap((group) => group.slots.flatMap((slot) => slot.items.map((it) => it.id))), ["warrior-helm"]);
assert.deepEqual(items.map(({ id }) => id), ["mage-gloves", "warrior-helm", "archer-weapon", "mage-weapon", "warrior-weapon", "mage-helm", "mage-equipped", "mage-stronger"]);
console.log("PASS: own class first, class and slot grouping, item priority, filters, original order preserved.");
