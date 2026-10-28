// Keep the displayed bag order independent from the server's item array order.
// 200레벨 보스 방어구·장신구는 전 직업 공통: 내 직업 장비로 정렬·필터한다.
const commonGear = (item) => !!item?.boss && Number(item.level) >= 200 && Number(item.slot) !== 0;
// 장비 슬롯(E1·E2·E3)에 등록된 장비 id 모음. gearPresets = {classId:{active, list:[{slot:id}|null ×3]}}
export function presetItemIds(gearPresets) {
  const ids = new Set();
  if (!gearPresets || typeof gearPresets !== "object") return ids;
  for (const preset of Object.values(gearPresets)) {
    for (const loadout of Array.isArray(preset?.list) ? preset.list : []) {
      if (loadout && typeof loadout === "object") for (const id of Object.values(loadout)) if (id) ids.add(id);
    }
  }
  return ids;
}
// 정렬: 내 직업 → 직업 순서 → 부위 → (부위 안에서) 장착 → 슬롯 등록 → 보스장비 → 레벨 → 스타포스 → 잠재 등급 → 잠금
export function inventoryGroups(items, classes, ownClassId, equippedIds, filterClass = "", filterSlot = "", gearPresets = null) {
  const classOf = (item) => commonGear(item) ? ownClassId : item.classId;
  const classOrder = new Map(classes.map((entry, index) => [entry.id, index]));
  const equipped = new Set(equippedIds);
  const inPreset = presetItemIds(gearPresets);
  const visible = items.filter((item) =>
    (filterClass === "" || item.classId === filterClass || commonGear(item)) &&
    (filterSlot === "" || item.slot === Number(filterSlot))
  );
  const flag = (set, item) => Number(set.has(item.id));
  visible.sort((a, b) =>
    Number(classOf(b) === ownClassId) - Number(classOf(a) === ownClassId) ||
    (classOrder.get(classOf(a)) ?? Infinity) - (classOrder.get(classOf(b)) ?? Infinity) ||
    a.slot - b.slot ||
    flag(equipped, b) - flag(equipped, a) ||
    flag(inPreset, b) - flag(inPreset, a) ||
    Number(!!b.boss) - Number(!!a.boss) ||
    (b.level || 0) - (a.level || 0) ||
    (b.stars || 0) - (a.stars || 0) ||
    (b.grade || 0) - (a.grade || 0) ||
    Number(!!b.locked) - Number(!!a.locked)
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
