// Stable equipment identity shared by client, drops, crafting and server storage.
// Column order in each artwork atlas: three weapons, then eight armor/accessory slots.
export const WEAPON_TYPES = {"warrior": ["검", "도끼", "창"], "mage": ["지팡이", "마도서", "완드"], "archer": ["활", "석궁", "장궁"], "rogue": ["단검", "아대", "쌍검"], "pirate": ["권총", "너클", "대포"]};
const NOUNS = {"warrior": ["장검", "전투도끼", "장창", "전투투구", "흉갑", "판금각반", "철장갑", "전투장화", "인장반지", "전공귀걸이", "수호패"], "mage": ["마력지팡이", "마도서", "완드", "마법모자", "로브", "마법바지", "주문장갑", "마법신", "마력반지", "비전귀걸이", "주술목걸이"], "archer": ["곡궁", "석궁", "장궁", "깃털모자", "사냥조끼", "정찰바지", "궁수장갑", "숲길장화", "명중반지", "깃털귀걸이", "추적목걸이"], "rogue": ["단검", "갈퀴아대", "쌍검", "은신두건", "암살자재킷", "잠행바지", "그림자장갑", "무음신발", "암호반지", "침묵귀걸이", "비밀부적"], "pirate": ["화승권총", "너클", "휴대대포", "선장모자", "항해외투", "갑판바지", "선원장갑", "항해장화", "닻반지", "나침귀걸이", "해도목걸이"]};
const ORDINARY_TITLES = ["첫 여정", "철새의 노래", "부서진 달", "잊힌 맹세", "유리바람", "붉은 새벽", "먼 별의 길", "침묵의 정원", "황혼의 기도", "영원의 문", "용의 숨결"];
const BOSS_TITLES = ["거목의 심장", "월광의 유산", "크로투스의 비밀", "재의 잔향", "왕가의 유언", "빙룡의 꿈", "라칸의 보물", "천공의 심판", "멈춘 운명", "멸신의 증표", "태초의 파편"];
const LEVELS = Array.from({length:20},(_,i)=>(i+1)*10);
export function weaponVariant(item) {
  return item.slot === 0 && Number.isInteger(item.weaponVariant) && item.weaponVariant >= 0 && item.weaponVariant < 3 ? item.weaponVariant : 0;
}
export const equipmentTierLevel = item => Math.max(10,Math.floor(Math.min(200,item.level)/10)*10);
export function canonicalDesign(item){return item.boss?2:Math.abs(Number.isInteger(item.design)?item.design:weaponVariant(item))%2;}
export function normalizeEquipment(item){if(!item||!item.classId)return item;item.design=canonicalDesign(item);item.weaponVariant=item.slot===0?item.design:0;item.catalogVersion=5;return item;}
export function equipmentKey(item){return ['v5',equipmentTierLevel(item),item.classId,item.slot,canonicalDesign(item)].join(':');}
export function equipmentFromKey(key){const p=key.split(':');if(p[0]==='v5')return designItem(+p[1],p[2],+p[3],+p[4]===2,+p[4]);if(p[0]==='v3')return designItem(+p[1],p[2],+p[3],p[4]==='true',+p[5]);return designItem(+p[0],p[1],+p[2],p[3]==='true',+p[4]||0);}
export function equipmentType(item) {
  return item.slot === 0 ? WEAPON_TYPES[item.classId]?.[weaponVariant(item)] || "무기" : ["무기","투구","갑옷","바지","장갑","신발","반지","귀걸이","펜던트"][item.slot];
}
function legacyIdentity(item) {

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
export const designCount=(level,classId,slot,boss=false)=>boss?1:2;
export const designWeights=count=>count===1?[100]:[50,50];
export function designItem(level,classId,slot,boss,design=0){return normalizeEquipment({level:Math.max(10,Math.floor(Math.min(200,level)/10)*10),classId,slot,boss,design});}
export function selectDesign(level,classId,slot,boss,random=Math.random){return designItem(level,classId,slot,boss,boss?2:Math.min(1,Math.floor(random()*2)));}
export function designIdentity(item){const level=equipmentTierLevel(item),design=canonicalDesign(item),column=item.slot===0?design:item.slot+2;const art=legacyIdentity({...item,level,design:undefined,weaponVariant:item.slot===0?design:0});return {...art,key:equipmentKey(item),name:level+'레벨 '+(item.boss?'토벌자의 ':design===0?'개척자의 ':'수호자의 ')+NOUNS[item.classId][column],row:(Math.floor((level-10)/20)+(design===1?5:0)+column*3)%art.rows,type:equipmentType({...item,weaponVariant:design})};}
export const equipmentIdentity=designIdentity;
export const EQUIPMENT_CATALOG=CLASSES.flatMap(classId=>LEVELS.flatMap(level=>Array.from({length:9},(_,slot)=>Array.from({length:3},(_,design)=>designItem(level,classId,slot,design===2,design))).flat()));
