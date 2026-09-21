import { equipmentIdentity } from "./equipment.mjs?v=equipment-alpha-3";
export { WEAPON_TYPES, weaponVariant, equipmentKey, equipmentFromKey, equipmentType, equipmentIdentity, EQUIPMENT_CATALOG } from "./equipment.mjs?v=equipment-alpha-3";
// Shared public balance data. The server is authoritative for RNG and ownership.
export const VERSION = "rebirth-1";
export const OFFLINE_SECONDS = 21600;
export const CLASSES = [
  {
    id: "warrior",
    name: "전사",
    stat: "STR",
    weapon: "대검",
    skill: "철벽",
    color: "#dc945b",
  },
  {
    id: "mage",
    name: "마법사",
    stat: "INT",
    weapon: "지팡이",
    skill: "마력 해방",
    color: "#9ca3ff",
  },
  {
    id: "archer",
    name: "궁수",
    stat: "DEX",
    weapon: "활",
    skill: "집중 사격",
    color: "#91c99b",
  },
  {
    id: "rogue",
    name: "도적",
    stat: "LUK",
    weapon: "단검",
    skill: "그림자 습격",
    color: "#c28bee",
  },
  {
    id: "pirate",
    name: "해적",
    stat: "DEX",
    weapon: "권총",
    skill: "속사",
    color: "#7ac9dc",
  },
];
export const SLOTS = [
  "무기",
  "투구",
  "갑옷",
  "바지",
  "장갑",
  "신발",
  "반지",
  "귀걸이",
  "펜던트",
];
export const CLASS_SKILLS = {
  warrior: { damage: 1.3, guard: 0.18, seconds: 8, description: "8초 동안 받는 피해 82% 감소 · 공격 30% 증가" },
  mage: { damage: 2.2, guard: 0.7, seconds: 6, description: "6초 동안 공격 120% 증가 · 받는 피해 30% 감소" },
  archer: { damage: 1.4, guard: 0.55, crit: 1, seconds: 7, description: "7초 동안 확정 치명타 · 공격 40% 증가 · 받는 피해 45% 감소" },
  rogue: { damage: 1.9, guard: 0.05, seconds: 4, description: "4초 동안 공격 90% 증가 · 받는 피해 95% 감소" },
  pirate: { damage: 1.65, guard: 0.5, seconds: 8, description: "8초 동안 공격 65% 증가 · 받는 피해 50% 감소" },
};
export const ADVANCEMENTS = {warrior:"가디언",mage:"아크메이지",archer:"레인저",rogue:"나이트워커",pirate:"캡틴"};
export const EXPEDITION = {name:"여명의 폐허",background:"ui/dawn-ruins.svg"};
export const DUNGEONS = {
  relic: {name:"여명의 파수꾼",art:"ui/dawn-sentinel.svg",fullArt:true,seconds:180,reward:"일반 200레벨 장비 1개 · 5,000 G · 파편 30개"},
  cube: { name: "수정의 시험", art: "bosses-1.svg", spriteX:50, spriteY:0, seconds: 120, reward: "일반 큐브 3개" },
  material: { name: "고대 제련소", art: "bosses-1.svg", spriteX:0, spriteY:0, seconds: 120, reward: "장비 파편 30개" },
};
export const TIERS = [1, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200];
export const RARITIES = ["레어", "에픽", "유니크", "레전드리"];
const names = [
  "초록 들판",
  "달빛 숲",
  "잊힌 광산",
  "붉은 협곡",
  "망자의 성",
  "서리 설원",
  "검은 사막",
  "하늘 신전",
  "시간의 균열",
  "심연 왕좌",
];
const areas = [
  ["새싹 언덕", "바람길", "수호자의 뜰"],
  ["이끼 정원", "고목의 길", "달의 연못"],
  ["입구 갱도", "수정 굴", "폐광 심층"],
  ["붉은 절벽", "재의 골짜기", "용암 심장"],
  ["낡은 성문", "망령 회랑", "왕의 무덤"],
  ["눈바람 길", "얼음 동굴", "빙하 정상"],
  ["모래바람 길", "매몰된 도시", "태양 무덤"],
  ["구름 계단", "빛의 회랑", "별빛 제단"],
  ["멈춘 거리", "뒤틀린 시계", "영원의 틈"],
  ["검은 성문", "공허의 길", "멸신의 왕좌"],
];
const bosses = [
  ["초목왕 모루", "거목 수호자", "들판의 군주"],
  ["달그림자 루엔", "고목왕 아르벨", "월광 사슴왕"],
  ["강철 거인", "수정 포식자", "광산왕 크로투스"],
  ["화염 사냥개", "용암 거신", "재의 군주"],
  ["유령 기사", "망령 여왕", "불멸의 왕"],
  ["설원 포식자", "빙결 마녀", "빙룡 이스라"],
  ["모래 군주", "태양 수호자", "사막왕 라칸"],
  ["타락한 사제", "천공 심판자", "성역의 주인"],
  ["시계 거인", "균열의 군주", "시간왕 크로노스"],
  ["심연 기사", "공허 포식자", "멸신왕 벨제리온"],
];
export const REGIONS = names.map((name, i) => ({
  id: i,
  name,
  level: i === 0 ? 1 : i * 20,
  background: `region-${i}.svg`,
  stages: areas[i],
}));
export const STAGES = REGIONS.flatMap((r) =>
  r.stages.map((name, j) => ({
    id: r.id * 3 + j,
    name,
    region: r.id,
    level: Math.max(1, r.level + j * 6),
    star: j === 2 && r.id >= 2 ? (r.id - 1) * 15 : 0,
    xp: Math.round(12 * 1.53 ** r.id * (1 + j * 0.12)),
    gold: 2 + r.id * 0.08,
    hp: Math.round(70 * 1.8 ** r.id * (1 + j * 0.22)),
    attack: Math.round(3 * 1.6 ** r.id),
    dropLevel: TIERS[r.id],
  })),
);
const monsterNames = [
  "씨앗 슬라임", "주황 버섯", "클로버 토끼", "도토리 딱정벌레", "새싹 뿌리", "이끼 골렘",
  "달빛 나방", "푸른 등불", "별무늬 버섯", "졸린 부엉이", "은빛 아기사슴", "초승달 그루터기",
  "광석 두더지", "수정 박쥐", "곡괭이 도깨비", "구리 거미", "보석 게", "탄광 로봇",
  "불씨 도마뱀", "화산 달팽이", "잿빛 여우", "용암 달걀", "숯불 유령", "불꽃 풍뎅이",
  "촛불 유령", "녹슨 갑옷", "보랏빛 박쥐", "유령 고양이", "낡은 해골", "장미 가고일",
  "눈송이 여우", "얼음 펭귄", "서리 슬라임", "눈사람 기사", "푸른 물개", "고드름 거북",
  "모래 전갈", "사막 선인장", "금빛 쇠똥구리", "작은 미라", "모래여우", "항아리 정령",
  "구름 양", "별빛 참새", "빛의 체스병", "날개 달린 성배", "황금 사자", "천공 해파리",
  "시계 쥐", "태엽 토끼", "모래시계 정령", "톱니 드론", "별무리 고양이", "균열 도마뱀",
  "공허 슬라임", "심연 새끼용", "검은 갑옷", "보라 가오리", "눈알 촉수", "일식 여우",
];
export const MONSTERS = monsterNames.map((name,id)=>({id,name,stage:Math.floor(id/2),
  art:`monsters-${Math.floor(id/12)}.svg`,x:(id%4)*100/3,y:Math.floor((id%12)/4)*50}));
export const BOSSES = bosses.flatMap((list, r) =>
  list.map((name, j) => ({
    id: r * 3 + j,
    name,
    region: r,
    level: r === 9 && j === 2 ? 200 : Math.max(5, r * 20 + j * 6),
    hp: Math.round(1700 * 1.95 ** r * (1 + j * 0.55)),
    attack: Math.round((14 + r * 24) * (1 + j * 0.2)),
    seconds: 180,
    weekly: j === 2,
    art: `bosses-${Math.floor(r/2)}.svg`,
    spriteX: j*50,
    spriteY: r%2*100,
    gearLevel: TIERS[Math.min(10, r + 1)],
    dropChance: j === 2 ? 0.18 : 0.08,
    material: j === 2 ? 4 : 1,
    patternEvery: [15, 12, 20][j],
    patternMultiplier: [3, 2.5, 4][j],
    pattern: ["내려찍기", "연속 포격", "멸절의 파동"][j],
  })),
);
export const MATERIALS = {
  fragment: "장비 파편",
  scroll: "잠재 부여 주문서",
  expand: "잠재 확장석",
  cube: "일반 큐브",
  highCube: "상급 큐브",
};
export const OPTIONS = {
  STR: "STR",
  DEX: "DEX",
  INT: "INT",
  LUK: "LUK",
  attack: "공격력",
  hp: "최대 HP",
  crit: "치명타 확률",
  boss: "보스 피해",
  defense: "방어력",
};
export const STAR_SUCCESS = [
  0.95, 0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5, 0.45, 0.4, 0.35, 0.3,
  0.3, 0.3, 0.27, 0.24, 0.21, 0.18, 0.12, 0.08, 0.05, 0.03, 0.01,
];
export const CUBE_UP = [0.015, 0.002, 0.0003, 0];
export const HIGH_CUBE_UP = [0.03, 0.004, 0.0006, 0];
export const LINE_WEIGHTS = [0.7, 0.27, 0.03];
export const EQUIP_DROP = 0.0008;
export const CUBE_DROP = 0.00012;
export const SCROLL_DROP = 0.000025;
export const XP_SCALE = 5; // Calibrated by simulation before release, not a client multiplier.
export function xpNeeded(level) {
  return Math.round((100 + level ** 2.4 * 4) * XP_SCALE);
}
export function starCost(item) {
  return Math.round(
    150 * (1 + item.level / 25) ** 1.3 * (item.stars + 1) ** 1.65,
  );
}
export function starOdds(stars) {
  if (stars >= 25) return { success: 0, keep: 1, down: 0, destroy: 0 };
  const success = STAR_SUCCESS[stars],
    destroy = stars >= 20 ? Math.min(0.12, 0.025 + (stars - 20) * 0.018) : 0;
  const floor = stars < 10 || stars === 10 || stars === 15;
  return {
    success,
    keep: floor ? 1 - success : 0,
    down: floor ? 0 : 1 - success - destroy,
    destroy,
  };
}
export function optionPool(slot) {
  return slot === 0
    ? ["STR", "DEX", "INT", "LUK", "attack", "boss"]
    : slot >= 6
      ? ["STR", "DEX", "INT", "LUK", "hp", "crit"]
      : ["STR", "DEX", "INT", "LUK", "hp", "defense"];
}
export function optionValue(key, grade) {
  return ["hp", "defense", "boss"].includes(key)
    ? [3, 6, 9, 12][grade]
    : key === "crit"
      ? [1, 2, 3, 4][grade]
      : [1, 3, 6, 9][grade];
}
export function gearName(item) {
  return equipmentIdentity(item).name;
}
export function gearArt(item) {
  return equipmentIdentity(item).art;
}
export function dayKey(ms) {
  return new Date(ms + 9 * 3600000).toISOString().slice(0, 10);
}
export function weekKey(ms) {
  const d = new Date(ms + 9 * 3600000);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
