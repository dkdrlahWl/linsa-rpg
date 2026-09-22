// Stable equipment identity shared by client, drops, crafting and server storage.
// Column order in each artwork atlas: three weapons, then eight armor/accessory slots.
export const WEAPON_TYPES = {"warrior": ["검", "도끼", "창"], "mage": ["지팡이", "마도서", "완드"], "archer": ["활", "석궁", "장궁"], "rogue": ["단검", "아대", "쌍검"], "pirate": ["권총", "너클", "대포"]};
const NOUNS = {"warrior": ["장검", "전투도끼", "장창", "전투투구", "흉갑", "판금각반", "철장갑", "전투장화", "인장반지", "전공귀걸이", "수호패"], "mage": ["마력지팡이", "마도서", "완드", "마법모자", "로브", "마법바지", "주문장갑", "마법신", "마력반지", "비전귀걸이", "주술목걸이"], "archer": ["곡궁", "석궁", "장궁", "깃털모자", "사냥조끼", "정찰바지", "궁수장갑", "숲길장화", "명중반지", "깃털귀걸이", "추적목걸이"], "rogue": ["단검", "갈퀴아대", "쌍검", "은신두건", "암살자재킷", "잠행바지", "그림자장갑", "무음신발", "암호반지", "침묵귀걸이", "비밀부적"], "pirate": ["화승권총", "너클", "휴대대포", "선장모자", "항해외투", "갑판바지", "선원장갑", "항해장화", "닻반지", "나침귀걸이", "해도목걸이"]};
const ORDINARY_TITLES = ["첫 여정", "철새의 노래", "부서진 달", "잊힌 맹세", "유리바람", "붉은 새벽", "먼 별의 길", "침묵의 정원", "황혼의 기도", "영원의 문", "용의 숨결"];
const BOSS_TITLES = ["거목의 심장", "월광의 유산", "크로투스의 비밀", "재의 잔향", "왕가의 유언", "빙룡의 꿈", "라칸의 보물", "천공의 심판", "멈춘 운명", "멸신의 증표", "태초의 파편"];
const LEVELS = [1,...Array.from({length:20},(_,i)=>(i+1)*10)];
export function weaponVariant(item) {
  return item.slot === 0 && Number.isInteger(item.weaponVariant) && item.weaponVariant >= 0 && item.weaponVariant < 3 ? item.weaponVariant : 0;
}
export const equipmentTierLevel = item => Math.max(1,Math.floor(Math.min(200,item.level)/10)*10);
export function equipmentKey(item) {
  if(Number.isInteger(item.design))return ["v3",equipmentTierLevel(item),item.classId,item.slot,!!item.boss,item.design].join(":");
  const key = [equipmentTierLevel(item), item.classId, item.slot, !!item.boss].join(":");
  // Variant zero intentionally retains the original key; no loss of existing discoveries.
  return item.slot === 0 && weaponVariant(item) ? key + ":" + weaponVariant(item) : key;
}
export function equipmentFromKey(key) {
  if(key.startsWith("v3:")){const [,level,classId,slot,boss,design]=key.split(":");return designItem(Number(level),classId,Number(slot),boss==="true",Number(design));}
  const [level,classId,slot,boss,variant] = key.split(":");
  return {level:Number(level),classId,slot:Number(slot),boss:boss === "true",weaponVariant:Number(variant)||0};
}
export function equipmentType(item) {
  return item.slot === 0 ? WEAPON_TYPES[item.classId]?.[weaponVariant(item)] || "무기" : ["무기","투구","갑옷","바지","장갑","신발","반지","귀걸이","펜던트"][item.slot];
}
export function equipmentIdentity(item) {
  if(Number.isInteger(item.design))return designIdentity(item);
  const column = item.slot === 0 ? weaponVariant(item) : item.slot + 2;
  const tier = Math.max(0, LEVELS.indexOf(equipmentTierLevel(item)));
  const artTier = Math.floor(Math.min(200,item.level)/20);
  const row = Math.max(0, Math.min(9, artTier - (item.boss ? 1 : 0)));
  const titles = item.boss ? BOSS_TITLES : ORDINARY_TITLES;
  const title = titles[(tier - (item.boss ? 1 : 0) + column * 3 + titles.length) % titles.length];
  const noun = NOUNS[item.classId]?.[column] || equipmentType(item);
  return {
    key: equipmentKey(item),
    name: `${title} ${noun}`,
    art: item.level === 200 && !item.boss ? "equipment/dawn-200-alpha-v3.png" : `equipment/${item.classId}-${item.boss ? "boss" : "normal"}${item.classId === "warrior" || (item.boss && ["mage","archer"].includes(item.classId)) ? "-alpha-v3.png" : ".webp"}`,
    column: item.classId === "rogue" && !item.boss && item.level !== 200 && column >= 7 ? column+1 : column,
    columns: item.classId === "rogue" && !item.boss && item.level !== 200 ? 12 : 11,
    row: item.level === 200 && !item.boss ? Object.keys(WEAPON_TYPES).indexOf(item.classId) : (row + column * 3) % 10,
    rows: item.level === 200 && !item.boss ? 5 : 10,
    type: equipmentType(item),
  };
}
const CLASSES=Object.keys(WEAPON_TYPES);
const LEVEL_NAMES=["새싹","개척지","월광","고목","갱도","수정","협곡","화산","망령","왕릉","서리","빙하","사막","태양","천공","성역","시계","균열","심연","멸신","여명"];
const EPITHETS=["척후병의","수호자의","방랑기사의","정복자의","심판자의","군주의"];
const PATTERNS=[[0,0,2,1,2,1],[1,1,0,2,0,2],[2,0,2,1,0,1]];
export const designCount=(level,classId,slot,boss=false)=>4+(LEVELS.indexOf(level)+CLASSES.indexOf(classId)*2+slot+Number(boss))%3;
export const designWeights=count=>({4:[60,28,11,1],5:[50,28,15,6,1],6:[44,26,16,9,4,1]})[count];
export function designItem(level,classId,slot,boss,design){const tier=LEVELS.indexOf(level),ci=CLASSES.indexOf(classId);const variant=slot===0?PATTERNS[(tier+ci+Number(boss))%3][design]:0;return {level,classId,slot,boss,design,weaponVariant:variant};}
export function selectDesign(level,classId,slot,boss,random=Math.random,variant){let list=Array.from({length:designCount(level,classId,slot,boss)},(_,i)=>designItem(level,classId,slot,boss,i));if(slot===0&&variant!==undefined){const filtered=list.filter(it=>it.weaponVariant===variant);if(filtered.length)list=filtered;}const weights=designWeights(designCount(level,classId,slot,boss));let roll=random()*list.reduce((n,it)=>n+weights[it.design],0);for(const it of list){roll-=weights[it.design];if(roll<0)return it;}return list.at(-1);}
export function designIdentity(item){const tier=LEVELS.indexOf(equipmentTierLevel(item)),ci=CLASSES.indexOf(item.classId);let index=0;for(const boss of [false,true]){for(const level of LEVELS){if(boss===!!item.boss&&level===equipmentTierLevel(item)){index+=item.design;const column=item.slot===0?weaponVariant(item):item.slot+2;return {key:equipmentKey(item),name:`${LEVEL_NAMES[tier]} ${item.boss?"지배자 ":""}${EPITHETS[(item.design+item.slot+ci)%6]} ${NOUNS[item.classId][column]}`,...designArt(item),type:equipmentType(item)};}index+=designCount(level,item.classId,item.slot,boss);}}}
export const EQUIPMENT_CATALOG=CLASSES.flatMap(classId=>Array.from({length:9},(_,slot)=>[false,true].flatMap(boss=>LEVELS.flatMap(level=>Array.from({length:designCount(level,classId,slot,boss)},(_,design)=>designItem(level,classId,slot,boss,design))))).flat());

function designArt(item){const old={...item,level:item.level===200?190:item.level};delete old.design;const art=equipmentIdentity(old);return {art:art.art,column:art.column,row:(art.row+item.design)%art.rows,columns:art.columns,rows:art.rows};}
