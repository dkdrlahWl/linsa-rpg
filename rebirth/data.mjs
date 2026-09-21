import { equipmentIdentity } from "./equipment.mjs?v=potential-balance-6";
export { equipmentTierLevel, WEAPON_TYPES, weaponVariant, equipmentKey, equipmentFromKey, equipmentType, equipmentIdentity, EQUIPMENT_CATALOG } from "./equipment.mjs?v=potential-balance-6";
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
 warrior:{name:'철벽',type:'buff',damage:1.10,guard:.60,seconds:5,cooldown:24,description:'5초 피해 +10% · 받는 피해 40% 감소'},
 mage:{name:'마력 해방',type:'buff',damage:1.18,guard:.85,seconds:5,cooldown:28,description:'5초 피해 +18% · 받는 피해 15% 감소'},
 archer:{name:'집중 사격',type:'buff',damage:1.08,guard:.85,critAdd:.10,seconds:5,cooldown:24,description:'5초 피해 +8% · 치명 확률 +10%p · 받는 피해 15% 감소'},
 rogue:{name:'그림자 습격',type:'buff',damage:1.15,guard:.50,seconds:4,cooldown:22,description:'4초 피해 +15% · 받는 피해 50% 감소'},
 pirate:{name:'속사',type:'buff',damage:1.12,guard:.80,seconds:5,cooldown:26,description:'5초 피해 +12% · 받는 피해 20% 감소'},
};
export const SECOND_SKILLS = {
 warrior:{name:'대지 분쇄',type:'attack',hits:1,damage:1.5,seconds:0,cooldown:28,description:'즉시 150% 피해 1타 · 치명타·보공 적용'},
 mage:{name:'마력의 결계',type:'buff',damage:1.05,guard:.95,seconds:6,cooldown:32,description:'6초 피해 +5% · 받는 피해 5% 감소'},
 archer:{name:'약점 포착',type:'buff',damage:1,guard:1,critAdd:.10,critDamageAdd:.15,seconds:6,cooldown:30,description:'6초 치명 확률 +10%p · 치명 피해 +15%p'},
 rogue:{name:'그림자 처형',type:'attack',hits:2,damage:.9,critAdd:.10,seconds:0,cooldown:30,description:'즉시 90% 피해 2타 · 이 스킬 치명 확률 +10%p'},
 pirate:{name:'전투 지휘',type:'buff',damage:1.04,guard:.95,seconds:6,cooldown:30,description:'6초 피해 +4% · 받는 피해 5% 감소'},
};
export const RAID_BOSSES = [
 {id:100,name:'녹왕 그란디어',raid:true,region:2,hp:350000,attack:90,seconds:180,patternEvery:15,patternMultiplier:2.5,pattern:'수정 뿌리 폭발',art:'ui/raid-stag.webp',fullArt:true,gold:10000,fragment:40,cube:6,highCubeChance:0,gearLevel:60,dropChance:.10,recommended:'입문 · 4인 기준 / Lv.60 일반 9부위 5성 권장'},
 {id:101,name:'용광군주 카르가스',raid:true,region:6,hp:2400000,attack:180,seconds:240,patternEvery:18,patternMultiplier:3,pattern:'용광로 대분출',art:'ui/raid-crab.webp',fullArt:true,gold:40000,fragment:100,cube:12,highCubeChance:.25,gearLevel:140,dropChance:.10,recommended:'심화 · 4인 기준 / Lv.140 일반 9부위 10성 권장'},
];
export const raidBoss = id => RAID_BOSSES.find(b=>b.id===Number(id));
export const ADVANCEMENTS = {warrior:"가디언",mage:"아크메이지",archer:"레인저",rogue:"나이트워커",pirate:"캡틴"};
export const EXPEDITION = {name:"여명의 폐허",background:"ui/dawn-ruins.svg"};
export const DUNGEONS = {
  relic: {name:"여명의 파수꾼",art:"ui/dawn-sentinel.svg",fullArt:true,seconds:180,reward:"일반 200레벨 장비 1개 · 20,000 G · 파편 60개"},
  cube: { name: "수정의 시험", art: "bosses-1.svg", spriteX:50, spriteY:0, seconds: 120, reward: "일반 큐브 10개" },
  material: { name: "고대 제련소", art: "bosses-1.svg", spriteX:0, spriteY:0, seconds: 120, reward: "장비 파편 100개" },
};
export const TIERS = [1, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200];
export const RARITIES = ["일반", "희귀", "레어", "에픽", "유니크", "레전더리"];
export const POTENTIAL_RANGES = [[1,2],[3,4],[5,6],[7,8],[9,10],[11,12]];
export const POTENTIAL_MAX = POTENTIAL_RANGES.map(([,max])=>max);
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
    gold: (20 + r.id * 35) * .30,
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
const BOSS_BALANCE = [{"id":0,"hp":2093,"attack":8,"target":40,"stars":0,"gear":1,"boss":false,"slots":1,"pot":false},{"id":1,"hp":4185,"attack":7,"target":55,"stars":1,"gear":1,"boss":false,"slots":5,"pot":false},{"id":2,"hp":11063,"attack":8,"target":75,"stars":2,"gear":1,"boss":false,"slots":9,"pot":false},{"id":3,"hp":27005,"attack":38,"target":71,"stars":3,"gear":20,"boss":false,"slots":9,"pot":false},{"id":4,"hp":34929,"attack":37,"target":83,"stars":3,"gear":20,"boss":false,"slots":9,"pot":false},{"id":5,"hp":43824,"attack":35,"target":95,"stars":3,"gear":20,"boss":false,"slots":9,"pot":false},{"id":6,"hp":61684,"attack":67,"target":77,"stars":5,"gear":40,"boss":false,"slots":9,"pot":false},{"id":7,"hp":74900,"attack":66,"target":89,"stars":5,"gear":40,"boss":false,"slots":9,"pot":false},{"id":8,"hp":89087,"attack":58,"target":101,"stars":5,"gear":40,"boss":false,"slots":9,"pot":false},{"id":9,"hp":110609,"attack":104,"target":83,"stars":6,"gear":60,"boss":false,"slots":9,"pot":false},{"id":10,"hp":130754,"attack":101,"target":95,"stars":6,"gear":60,"boss":false,"slots":9,"pot":false},{"id":11,"hp":151948,"attack":88,"target":107,"stars":6,"gear":60,"boss":false,"slots":9,"pot":false},{"id":12,"hp":170027,"attack":134,"target":89,"stars":8,"gear":80,"boss":false,"slots":9,"pot":false},{"id":13,"hp":197368,"attack":126,"target":101,"stars":8,"gear":80,"boss":false,"slots":9,"pot":false},{"id":14,"hp":225758,"attack":114,"target":113,"stars":8,"gear":80,"boss":false,"slots":9,"pot":false},{"id":15,"hp":242888,"attack":156,"target":95,"stars":10,"gear":100,"boss":false,"slots":9,"pot":false},{"id":16,"hp":278246,"attack":154,"target":107,"stars":10,"gear":100,"boss":false,"slots":9,"pot":false},{"id":17,"hp":314654,"attack":140,"target":119,"stars":10,"gear":100,"boss":false,"slots":9,"pot":false},{"id":18,"hp":321784,"attack":184,"target":101,"stars":11,"gear":120,"boss":false,"slots":9,"pot":false},{"id":19,"hp":364956,"attack":175,"target":113,"stars":11,"gear":120,"boss":false,"slots":9,"pot":false},{"id":20,"hp":409177,"attack":157,"target":125,"stars":11,"gear":120,"boss":false,"slots":9,"pot":false},{"id":21,"hp":499608,"attack":202,"target":107,"stars":13,"gear":140,"boss":true,"slots":9,"pot":true},{"id":22,"hp":561491,"attack":201,"target":119,"stars":13,"gear":140,"boss":true,"slots":9,"pot":true},{"id":23,"hp":624556,"attack":181,"target":131,"stars":13,"gear":140,"boss":true,"slots":9,"pot":true},{"id":24,"hp":625999,"attack":228,"target":113,"stars":14,"gear":160,"boss":true,"slots":9,"pot":true},{"id":25,"hp":698625,"attack":220,"target":125,"stars":14,"gear":160,"boss":true,"slots":9,"pot":true},{"id":26,"hp":772431,"attack":204,"target":137,"stars":14,"gear":160,"boss":true,"slots":9,"pot":true},{"id":27,"hp":795328,"attack":253,"target":119,"stars":16,"gear":180,"boss":true,"slots":9,"pot":true},{"id":28,"hp":881972,"attack":245,"target":131,"stars":16,"gear":180,"boss":true,"slots":9,"pot":true},{"id":29,"hp":979174,"attack":220,"target":143,"stars":16,"gear":180,"boss":true,"slots":9,"pot":true}];
export const BOSSES = bosses.flatMap((list, r) =>
  list.map((name, j) => ({
    id: r * 3 + j,
    name,
    region: r,
    level: r === 9 && j === 2 ? 200 : Math.max(5, r * 20 + j * 6),
    hp: BOSS_BALANCE[r*3+j].hp,
    recommended: BOSS_BALANCE[r*3+j],
    gold: Math.round(4000*(r+1)*(j===2?2.5:1)),
    cubes: j===2?12:4,
    attack: BOSS_BALANCE[r*3+j].attack,
    seconds: 180,
    weekly: j === 2,
    art: `bosses-${Math.floor(r/2)}.svg`,
    spriteX: j*50,
    spriteY: r%2*100,
    gearLevel: TIERS[Math.min(10, r + 1)],
    dropChance: j === 2 ? 0.18 : 0.08,
    material: j === 2 ? 12 : 4,
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
  flatHP: "최대 HP",
  flatSTR: "STR", flatDEX: "DEX", flatINT: "INT", flatLUK: "LUK",
  goldGain: "골드 획득", xpGain: "경험치 획득",
};
export const OPTION_WEIGHTS = {STR:2, DEX:2, INT:2, LUK:2, attack:2, hp:14, crit:6, boss:3, defense:15, flatSTR:9, flatDEX:9, flatINT:9, flatLUK:9, flatHP:12, goldGain:2, xpGain:2};
export const FLAT_RANGES = [[1,5],[6,10],[11,17],[18,26],[27,38],[39,55]];
export const FLAT_HP_RANGES = [[10,40],[41,90],[91,170],[171,280],[281,420],[421,600]];
export const GAIN_RANGES = [[0.1,0.1],[0.2,0.2],[0.3,0.4],[0.5,0.6],[0.7,0.8],[0.9,1]];
export const GAIN_MAX = GAIN_RANGES.map(([,max])=>max);
export function optionRange(key, grade) {
  if (key === "flatHP") return {min:FLAT_HP_RANGES[grade][0],max:FLAT_HP_RANGES[grade][1],step:1};
  if (key.startsWith("flat")) return {min:FLAT_RANGES[grade][0],max:FLAT_RANGES[grade][1],step:1};
  if (key === "goldGain" || key === "xpGain") return {min:GAIN_RANGES[grade][0],max:GAIN_RANGES[grade][1],step:0.1};
  return {min:POTENTIAL_RANGES[grade][0],max:POTENTIAL_RANGES[grade][1],step:1};
}
export function optionUnit(key) { return key.startsWith("flat") ? "" : key === "crit" ? "%p" : "%"; }
export function rollOptionKey(random) {
  let r = random() * 100;
  for (const [key,weight] of Object.entries(OPTION_WEIGHTS)) { r -= weight; if (r < 0) return key; }
  return "xpGain";
}
export const STAR_SUCCESS = [
  0.95, 0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5, 0.45, 0.4, 0.35, 0.3,
  0.3, 0.3, 0.27, 0.24, 0.21, 0.18, 0.12, 0.08, 0.05, 0.03, 0.01,
];
export const CUBE_UP = [0.20, 0.02, 0.002, 0.0002, 0.00002, 0];
export const HIGH_CUBE_UP = CUBE_UP.map(p=>p*2);
export const LINE_WEIGHTS = [0.7, 0.27, 0.03];
export const EQUIP_DROP = 0.0045;
export const FIELD_BOSS_DROP = 0.0001;
export function equipmentLevelRange(base){return base>=200?{min:190,max:200}:{min:base,max:base===1?19:base+19};}
export function rollEquipmentLevel(base,random=Math.random){const {min,max}=equipmentLevelRange(base);return min+Math.min(max-min,Math.floor(random()**2*(max-min+1)));}
export const QUALITY_COST = {fragment:50,gold:1500};
export const QUALITY_BANDS = [{min:0,max:49,chance:.70},{min:50,max:79,chance:.25},{min:80,max:94,chance:.045},{min:95,max:99,chance:.0049},{min:100,max:100,chance:.0001}];
export function rollQuality(random=Math.random){let roll=random();for(const band of QUALITY_BANDS){if(roll<band.chance)return band.min+Math.min(band.max-band.min,Math.floor(roll/band.chance*(band.max-band.min+1)));roll-=band.chance;}return 100;}
export const itemQuality = item => Number.isInteger(item.quality)&&item.quality>=0&&item.quality<=100?item.quality:50;
export const qualityMultiplier = item => 0.9+itemQuality(item)*0.002;
export const salvageYield = item => 4+Math.floor(item.level/20)+(item.boss?10:0);
export const CUBE_DROP = 0.008/3;
export const SCROLL_DROP = 0.0007;
export const FRAGMENT_DROP = 0.035;
export const SUPPLY_EXCHANGE = {cube:{fragment:10,gold:500},highCube:{fragment:50,gold:2500},scroll:{fragment:20,gold:500},expand:{fragment:150,gold:7500}};
export const XP_SCALE = 5; // Calibrated by simulation before release, not a client multiplier.
export function xpNeeded(level) {
  return Math.round((100 + level ** 2.4 * 4) * XP_SCALE);
}
export function gearAttributes(item,stars=item.stars) {
 const growth=1+stars*.055+Math.max(0,stars-15)**1.4*.025;
 const base=(5+item.level**1.28)*(item.boss?1.22:1)*qualityMultiplier(item);
 return {attack:base*(item.slot===0?.9:.11)*growth+stars,stat:Math.floor((2+item.level*.5)*growth*qualityMultiplier(item))+stars,hp:item.level*4+(item.slot>=1&&item.slot<=5?stars*Math.max(2,Math.ceil(item.level*.35)):0),defense:item.level*.2};
}
export function starCost(item) {
  return Math.round(
    100 * (1 + item.level / 25) ** 1.3 * (item.stars + 1) ** 1.35 * (1 + Math.max(0,item.stars-15)*0.5),
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
export function optionPool() {
  return Object.keys(OPTIONS);
}
export function optionValue(key, grade, random = Math.random) {
  if (!Object.hasOwn(OPTIONS, key) || !POTENTIAL_MAX[grade]) throw new Error("INVALID_POTENTIAL");
  const {min,max,step} = optionRange(key, grade), count = Math.round((max-min)/step)+1;
  return Math.round((min + Math.min(count-1, Math.floor(random()*count))*step)*10)/10;
}
// The item grade is a derived sorting hint only; each slot owns its permanent grade.
export function normalizePotentialItem(item) {
  if (!item) return item;
  item.quality=itemQuality(item);
  if (item.potentialVersion !== 3) {
    const grade = item.potentialVersion === 2 ? (item.grade || 0) : Math.min(5, (item.grade || 0) + 2);
    item.lines = (item.lines || []).map(line => ({...line, grade:line.grade ?? grade}));
    item.potentialVersion = 3;
  }
  item.grade = Math.max(0, ...item.lines.map(line => line.grade));
  return item;
}
export function normalizePotentialState(state) {
  if (!state) return state;
  for (const item of state.items || []) normalizePotentialItem(item);
  for (const mail of state.mailbox || []) normalizePotentialItem(mail.item);
  const pending = state.pendingCube;
  if (pending) {
    if (pending.potentialVersion !== 3) {
      pending.high ??= true;
      normalizePotentialItem(pending);
    }
    const item = state.items.find(item => item.id === pending.id);
    if (item) {
      pending.previousGrades ??= item.lines.map(line => line.grade);
      item.lines.forEach((line,i) => line.grade = Math.max(line.grade, pending.lines[i]?.grade ?? line.grade));
      normalizePotentialItem(item);
    }
  }
  return state;
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
