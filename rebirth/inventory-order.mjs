// Keep the displayed bag order independent from the server's item array order.
export function inventoryGroups(items, classes, ownClassId, equippedIds, filterClass = "", filterSlot = "") {
  const classOrder = new Map(classes.map((entry, index) => [entry.id, index]));
  const equipped = new Set(equippedIds);
  const visible = items.filter((item) =>
    (filterClass === "" || item.classId === filterClass) &&
    (filterSlot === "" || item.slot === Number(filterSlot))
  );
  visible.sort((a, b) =>
    Number(equipped.has(b.id)) - Number(equipped.has(a.id)) ||
    Number(b.classId === ownClassId) - Number(a.classId === ownClassId) ||
    (classOrder.get(a.classId) ?? Infinity) - (classOrder.get(b.classId) ?? Infinity) ||
    a.slot - b.slot ||
    Number(b.locked) - Number(a.locked) ||
    b.stars - a.stars ||
    b.level - a.level ||
    b.grade - a.grade
  );

  const groups = [];
  for (const item of visible) {
    let classGroup = groups.at(-1);
    if (!classGroup || classGroup.classId !== item.classId) {
      classGroup = { classId: item.classId, count: 0, slots: [] };
      groups.push(classGroup);
    }
    let slotGroup = classGroup.slots.at(-1);
    if (!slotGroup || slotGroup.slot !== item.slot) {
      slotGroup = { slot: item.slot, items: [] };
      classGroup.slots.push(slotGroup);
    }
    slotGroup.items.push(item);
    classGroup.count++;
  }
  return groups;
}
