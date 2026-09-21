// Stable equipment identity shared by client, drops, crafting and server storage.
// Column order in each artwork atlas: three weapons, then eight armor/accessory slots.
export const WEAPON_TYPES = {"warrior": ["검", "도끼", "창"], "mage": ["지팡이", "마도서", "완드"], "archer": ["활", "석궁", "장궁"], "rogue": ["단검", "아대", "쌍검"], "pirate": ["권총", "너클", "대포"]};
const NOUNS = {"warrior": ["장검", "전투도끼", "장창", "전투투구", "흉갑", "판금각반", "철장갑", "전투장화", "인장반지", "전공귀걸이", "수호패"], "mage": ["마력지팡이", "마도서", "완드", "마법모자", "로브", "마법바지", "주문장갑", "마법신", "마력반지", "비전귀걸이", "주술목걸이"], "archer": ["곡궁", "석궁", "장궁", "깃털모자", "사냥조끼", "정찰바지", "궁수장갑", "숲길장화", "명중반지", "깃털귀걸이", "추적목걸이"], "rogue": ["단검", "갈퀴아대", "쌍검", "은신두건", "암살자재킷", "잠행바지", "그림자장갑", "무음신발", "암호반지", "침묵귀걸이", "비밀부적"], "pirate": ["화승권총", "너클", "휴대대포", "선장모자", "항해외투", "갑판바지", "선원장갑", "항해장화", "닻반지", "나침귀걸이", "해도목걸이"]};
const ORDINARY_TITLES = ["첫 여정", "철새의 노래", "부서진 달", "잊힌 맹세", "유리바람", "붉은 새벽", "먼 별의 길", "침묵의 정원", "황혼의 기도", "영원의 문", "용의 숨결"];
const BOSS_TITLES = ["거목의 심장", "월광의 유산", "크로투스의 비밀", "재의 잔향", "왕가의 유언", "빙룡의 꿈", "라칸의 보물", "천공의 심판", "멈춘 운명", "멸신의 증표", "태초의 파편"];
const LEVELS = [1,20,40,60,80,100,120,140,160,180,200];
export function weaponVariant(item) {
  return item.slot === 0 && Number.isInteger(item.weaponVariant) && item.weaponVariant >= 0 && item.weaponVariant < 3 ? item.weaponVariant : 0;
}
export function equipmentKey(item) {
  const key = [item.level, item.classId, item.slot, !!item.boss].join(":");
  // Variant zero intentionally retains the original key; no loss of existing discoveries.
  return item.slot === 0 && weaponVariant(item) ? key + ":" + weaponVariant(item) : key;
}
export function equipmentFromKey(key) {
  const [level,classId,slot,boss,variant] = key.split(":");
  return {level:Number(level),classId,slot:Number(slot),boss:boss === "true",weaponVariant:Number(variant)||0};
}
export function equipmentType(item) {
  return item.slot === 0 ? WEAPON_TYPES[item.classId]?.[weaponVariant(item)] || "무기" : ["무기","투구","갑옷","바지","장갑","신발","반지","귀걸이","펜던트"][item.slot];
}
export function equipmentIdentity(item) {
  const column = item.slot === 0 ? weaponVariant(item) : item.slot + 2;
  const tier = Math.max(0, LEVELS.indexOf(item.level));
  const row = Math.max(0, Math.min(9, tier - (item.boss ? 1 : 0)));
  const titles = item.boss ? BOSS_TITLES : ORDINARY_TITLES;
  const title = titles[(tier - (item.boss ? 1 : 0) + column * 3 + titles.length) % titles.length];
  const noun = NOUNS[item.classId]?.[column] || equipmentType(item);
  return {
    key: equipmentKey(item),
    name: `${title} ${noun}`,
    art: item.level === 200 && !item.boss ? "equipment/dawn-200.svg" : `equipment/${item.classId}-${item.boss ? "boss" : "normal"}.svg`,
    column: item.classId === "rogue" && !item.boss && item.level !== 200 && column >= 7 ? column+1 : column,
    columns: item.classId === "rogue" && !item.boss && item.level !== 200 ? 12 : 11,
    row: item.level === 200 && !item.boss ? Object.keys(WEAPON_TYPES).indexOf(item.classId) : (row + column * 3) % 10,
    rows: item.level === 200 && !item.boss ? 5 : 10,
    type: equipmentType(item),
  };
}
export const EQUIPMENT_CATALOG = Object.keys(WEAPON_TYPES).flatMap(classId =>
  [false,true].flatMap(boss => (boss ? LEVELS.slice(1) : LEVELS).flatMap(level =>
    Array.from({length:11},(_,column) => ({level,classId,boss,slot:column<3?0:column-2,weaponVariant:column<3?column:0}))
  ))
);
