export {THIRD_SKILLS,THIRD_NAMES,ADVANCEMENT_BOSSES,firstJobUnlocked,jobStage,nextTrialStage} from './advancement.mjs?v=motion-world-1';
import {balanceWorld,journeyXP} from './journey-balance.mjs?v=motion-world-1';
export {BALANCE_VERSION,levelHours,DAILY_TASKS} from './journey-balance.mjs?v=motion-world-1';
import { CUBES, rollCubeLine } from './maple-cubes.mjs?v=motion-world-1';
export { CUBES, cubeLineRates, cubeCost, cubeTable } from './maple-cubes.mjs?v=motion-world-1';
import { equipmentIdentity, equipmentKey, normalizeEquipment, equipmentFromKey } from "./equipment.mjs?v=motion-world-1";
export { normalizeEquipment, equipmentTierLevel, WEAPON_TYPES, weaponVariant, equipmentKey, equipmentFromKey, equipmentType, equipmentIdentity, EQUIPMENT_CATALOG, designCount, designWeights, selectDesign, designItem } from "./equipment.mjs?v=motion-world-1";
// Shared public balance data. The server is authoritative for RNG and ownership.
export const VERSION = "rebirth-1";
export const OFFLINE_SECONDS = 21600;
export const FIELD_XP_MULTIPLIER = 2.5;
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
  cube: { name: "수정의 시험", art: "bosses-1.svg", spriteX:50, spriteY:0, seconds: 120, reward: "레드 큐브 25개 · 블랙 큐브 3개" },
  material: { name: "고대 제련소", art: "bosses-1.svg", spriteX:0, spriteY:0, seconds: 120, reward: "장비 파편 200개" },
};
export const TIERS = [1, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200];
export const RARITIES = ["일반", "노멀", "레어", "에픽", "유니크", "레전더리"];
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
    xp: Math.round(12 * 1.53 ** r.id * (1 + j * 0.12)) * FIELD_XP_MULTIPLIER,
    gold: (20 + r.id * 35) * .15,
    hp: r.id===0 ? [90,360,900][j] : Math.round([90,2300,5200,8500,12000,16000,20500,26000,32000,39000][r.id]*(1+j*.20)),
    attack: r.id===0 ? [8,55,180][j] : Math.round([8,520,1050,1600,2150,2750,3350,3950,4650,5300][r.id]*(1+j*.12)),
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
  cube: "레드 큐브",
  highCube: "블랙 큐브",
  ...Object.fromEntries(Object.entries(CUBES).map(([key,c])=>[key,c.name])),
};
// One claim per Korean calendar day. The cycle advances on a successful claim.
export const ATTENDANCE_REWARDS = [
  {gold:2000,fragment:10},
  {cube:3},
  {gold:3000,fragment:20},
  {fragment:23},
  {gold:5000,cube:5},
  {highCube:1,fragment:30},
  {gold:20000,fragment:100,highCube:3},
];
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
  flatHP: "최대 HP", flatAttack:"공격력", flatDefense:"방어력",
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
export const STAR_SUCCESS = [.95,.95,.9,.9,.85,.8,.75,.7,.65,.6,.55,.5,.45,.4,.35,.3,.28,.25,.22,.2,.18,.16,.14,.12,.1];
export const CUBE_UP = CUBES.cube.up;
export const HIGH_CUBE_UP = CUBES.highCube.up;
export const LINE_WEIGHTS = [0.7, 0.27, 0.03];
export const EQUIP_DROP = 0.00065;
export const FIELD_BOSS_DROP = 0;
export function equipmentLevelRange(base){const min=base>=200?200:Math.max(1,Math.floor(base/10)*10);return {min,max:min};}
export function rollEquipmentLevel(base,random=Math.random){const {min,max}=equipmentLevelRange(base);return min===max?min:random()<Math.SQRT1_2?min:max;}
export const itemQuality = item => Number.isInteger(item.quality)&&item.quality>=0&&item.quality<=100?item.quality:50;
export const qualityMultiplier = item => 0.9+itemQuality(item)*0.002;
export const salvageYield = item => 4+Math.floor(item.level/20)+(item.boss?10:0);
export const CUBE_DROP = 0.0001;
export const SCROLL_DROP = 0;
export const FRAGMENT_DROP = 0.01;
export const XP_SCALE = 5; // Legacy save conversion reference; journeyXP controls new progression.
export function xpNeeded(level) {
  return journeyXP(level);
}
export function gearStatRanges(item) {
 const base={attack:(5+item.level**1.28)*(item.slot===0?.9:.11),stat:2+item.level*.5,hp:item.level*4,defense:item.level*.2};
 const low=Number.isInteger(item.design)?(item.boss?2.8+item.design*.45:.75+item.design*.3):(item.boss?2:.85),high=Number.isInteger(item.design)?low+.16:(item.boss?2.5:1.4);
 return Object.fromEntries(Object.entries(base).map(([key,value])=>[key,{min:Math.max(1,Math.floor(value*low)),max:Math.max(1,Math.ceil(value*high))}]));
}
export function rollBaseStats(item,random=Math.random) {
 return Object.fromEntries(Object.entries(gearStatRanges(item)).map(([key,r])=>{
  const u=random(),fraction=u<.75?u/.75*.5:u<.99?.5+(u-.75)/.24*.4:.9+(u-.99)/.01*.1;
  return [key,r.min+Math.min(r.max-r.min,Math.floor(fraction*(r.max-r.min+1)))];
 }));
}
export function gearAttributes(item,stars=item.stars) {
 const growth=1+stars*.055+Math.max(0,stars-15)**1.4*.025;
 if(item.baseStats){const b=item.baseStats;return {attack:b.attack*growth+stars,stat:Math.floor(b.stat*growth)+stars,hp:b.hp+(item.slot>=1&&item.slot<=5?stars*Math.max(2,Math.ceil(item.level*.35)):0),defense:b.defense};}
 const base=(5+item.level**1.28)*(item.boss?1.9:1)*qualityMultiplier(item);
 return {attack:base*(item.slot===0?.9:.11)*growth+stars,stat:Math.floor((2+item.level*.5)*growth*qualityMultiplier(item)*(item.boss?1.9:1))+stars,hp:Math.floor(item.level*4*(item.boss?1.9:1))+(item.slot>=1&&item.slot<=5?stars*Math.max(2,Math.ceil(item.level*.35)):0),defense:item.level*.2*(item.boss?1.9:1)};
}
export function starCost(item) {
  return Math.round(
    45 * (1 + item.level / 25) ** 1.3 * (item.stars + 1) ** 1.35 * (1 + Math.max(0,item.stars-15)*0.5),
  );
}
export function starOdds(stars) {
 const success=stars>=25?0:STAR_SUCCESS[stars];return {success,keep:1-success,down:0,destroy:0};
}
export function optionPool() {
  return Object.keys(OPTIONS);
}
export function optionValue(key, grade, random = Math.random) {
  if (!Object.hasOwn(OPTIONS, key) || !POTENTIAL_MAX[grade]) throw new Error("INVALID_POTENTIAL");
  const {min,max,step} = optionRange(key, grade), count = Math.round((max-min)/step)+1;
  return Math.round((min + Math.min(count-1, Math.floor(random()*count))*step)*10)/10;
}
// Version 4: one equipment rank; legacy options are preserved until rerolled.
export function fillPotentialLines(item, random) {
  item.lines ||= [];
  item.grade = item.lines.length ? Math.max(2, Math.min(5, item.grade || 2)) : 2;
  if (!random) {
    let seed=2166136261;
    for(const c of String(item.id||[item.level,item.classId,item.slot].join(':'))) seed=Math.imul(seed^c.charCodeAt(0),16777619);
    random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  }
  while(item.lines.length<3) item.lines.push(rollCubeLine('cube',item,item.grade,item.lines.length,random));
  return item;
}
export function normalizePotentialItem(item) {
  if (!item) return item;
  // Preserve identity, stars, rolls' relative positions, potentials and locks.
  if (Number.isFinite(item.level)) {
    const level=Math.max(1,Math.floor(Math.min(200,item.level)/10)*10);
    if(level!==item.level){
      const before=item.baseStats?gearStatRanges(item):null;
      item.level=level;
      if(before){const after=gearStatRanges(item);for(const key of Object.keys(after)){
        const fraction=Math.max(0,Math.min(1,(item.baseStats[key]-before[key].min)/(before[key].max-before[key].min||1)));
        item.baseStats[key]=Math.round(after[key].min+fraction*(after[key].max-after[key].min));
      }}
    }
    item.levelVersion=1;
  }
  if(!item.baseStats && Number.isFinite(item.level)) {
    const q=qualityMultiplier(item),boss=item.boss?1.9:1;
    item.baseStats={attack:(5+item.level**1.28)*boss*q*(item.slot===0?.9:.11),stat:(2+item.level*.5)*q*boss,hp:Math.floor(item.level*4*boss),defense:item.level*.2*boss};
    item.legacyBaseStats=true;
  }
  delete item.quality;
  normalizeEquipment(item);
  if (item.potentialVersion !== 3 && item.potentialVersion !== 4) {
    const grade = item.potentialVersion === 2 ? (item.grade || 0) : Math.min(5, (item.grade || 0) + 2);
    item.lines = (item.lines || []).map(line => ({...line, grade:line.grade ?? grade}));
    item.potentialVersion = 3;
  }
  if(item.potentialVersion!==4){item.grade=item.lines.length?Math.max(2,...item.lines.map(line=>line.grade||0)):0;item.potentialVersion=4;}
  item.grade=item.lines.length?Math.max(2,Math.min(5,item.grade||2)):0;
  return fillPotentialLines(item);
}
export function normalizePotentialState(state) {
  if (!state) return state;
  for (const item of state.items || []) normalizePotentialItem(item);
  for (const mail of state.mailbox || []) normalizePotentialItem(mail.item);
  state.collection=[...new Set([...(state.collection||[]).map(key=>equipmentKey(equipmentFromKey(key))),...(state.items||[]).map(equipmentKey),...(state.mailbox||[]).map(mail=>equipmentKey(mail.item))])];
  if(Object.values(state.bossMaterials||{}).some(n=>n>0)){state.retiredBossMaterials={...(state.retiredBossMaterials||{}),...state.bossMaterials};}state.bossMaterials={};
  if(state.battle?.kind==='dungeon'){state.battle=null;state.hunting=false;}
  state.cubePity??={};
  state.materials??={};
  state.materials.fragment=(state.materials.fragment||0)+(state.materials.expand||0)*20+(state.materials.scroll||0)*3;
  delete state.materials.expand;delete state.materials.scroll;
  for(const [old,key,ratio] of [["strangeCube","cube",1],["masterCube","cube",2],["artisanCube","highCube",1],["silverCube","highCube",1],["goldCube","highCube",2]]){state.materials[key]=(state.materials[key]||0)+(state.materials[old]||0)*ratio;delete state.materials[old];}
  if(["silverCube","goldCube"].includes(state.pendingCube?.kind))state.pendingCube.kind="highCube";
  for(const key of Object.keys(CUBES))state.materials[key]??=0;
  const pending=state.pendingCube;
  if(pending && pending.potentialVersion!==4){
    const item=state.items.find(x=>x.id===pending.id);
    pending.kind=pending.high===false?'cube':'highCube';
    pending.grade=Math.max(2,pending.grade||0,...(pending.lines||[]).map(l=>l.grade||0));
    pending.previousGrade=item?.grade||pending.grade;
    pending.potentialVersion=4;
    pending.legacy=true;
    if(item)item.grade=Math.max(item.grade,pending.grade);
  }
  if(pending){const item=state.items.find(x=>x.id===pending.id);if(item){const migrated=fillPotentialLines({...item,id:item.id+':pending',grade:pending.grade,lines:pending.lines||[]});pending.grade=migrated.grade;pending.lines=migrated.lines;}}
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

balanceWorld(STAGES,BOSSES,RAID_BOSSES);
