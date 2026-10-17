// Keep the displayed bag order independent from the server's item array order.
// 200레벨 보스 방어구·장신구는 전 직업 공통: 내 직업 장비로 정렬·필터한다.
const commonGear = (item) => !!item?.boss && Number(item.level) >= 200 && Number(item.slot) !== 0;
export function inventoryGroups(items, classes, ownClassId, equippedIds, filterClass = "", filterSlot = "") {
  const classOf = (item) => commonGear(item) ? ownClassId : item.classId;
  const classOrder = new Map(classes.map((entry, index) => [entry.id, index]));
  const equipped = new Set(equippedIds);
  const visible = items.filter((item) =>
    (filterClass === "" || item.classId === filterClass || commonGear(item)) &&
    (filterSlot === "" || item.slot === Number(filterSlot))
  );
  visible.sort((a, b) =>
    Number(equipped.has(b.id)) - Number(equipped.has(a.id)) ||
    Number(classOf(b) === ownClassId) - Number(classOf(a) === ownClassId) ||
    (classOrder.get(classOf(a)) ?? Infinity) - (classOrder.get(classOf(b)) ?? Infinity) ||
    a.slot - b.slot ||
    Number(b.locked) - Number(a.locked) ||
    b.stars - a.stars ||
    b.level - a.level ||
    b.grade - a.grade
  );

  const groups = [];
  for (const item of visible) {
    let classGroup = groups.at(-1);
    if (!classGroup || classGroup.classId !== classOf(item)) {
      classGroup = { classId: classOf(item), count: 0, slots: [] };
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
