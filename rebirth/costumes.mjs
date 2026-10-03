export const COSTUME_PRICE=5_000_000;
export const COSTUME_ATTACK_BONUS=1;
export const COSTUMES=Object.freeze([
  {id:'crimson-dragon',classId:'warrior',name:'붉은 용기사'},
  {id:'starlight-mage',classId:'mage',name:'별빛 마도사'},
  {id:'snowmoon-ranger',classId:'archer',name:'설월 궁수'},
  {id:'blackmoon-assassin',classId:'rogue',name:'흑월 암살자'},
  {id:'golden-captain',classId:'pirate',name:'황금 함장'},
  {id:'bluemoon-priest',classId:'priest',name:'청월 사제'},
  {id:'frost-crown-knight',classId:'warrior',name:'서리왕관 기사',motionLayout:'frost-crown-knight',portraitMask:null,atlas:'costumes/frost-crown-knight-motion-v1.webp',portrait:'costumes/frost-crown-knight-portrait-v1.webp'},
  {id:'rose-queen-mage',classId:'mage',name:'장미여왕 마도사',motionLayout:'rose-queen-mage',portraitMask:null,atlas:'costumes/rose-queen-mage-motion-v1.webp',portrait:'costumes/rose-queen-mage-portrait-v1.webp'},
  {id:'forest-fairy-ranger',classId:'archer',name:'숲의 요정 궁수',motionLayout:'forest-fairy-ranger',portraitMask:null,atlas:'costumes/forest-fairy-ranger-motion-v1.webp',portrait:'costumes/forest-fairy-ranger-portrait-v1.webp'},
  {id:'violet-moon-ninja',classId:'rogue',name:'자월 닌자',motionLayout:'violet-moon-ninja',portraitMask:null,atlas:'costumes/violet-moon-ninja-motion-v1.webp',portrait:'costumes/violet-moon-ninja-portrait-v1.webp'},
  {id:'azure-naval-admiral',classId:'pirate',name:'푸른해군 제독',motionLayout:'azure-naval-admiral',portraitMask:null,atlas:'costumes/azure-naval-admiral-motion-v1.webp',portrait:'costumes/azure-naval-admiral-portrait-v1.webp'},
  {id:'dawn-saint',classId:'priest',name:'여명의 성녀',motionLayout:'dawn-saint',portraitMask:null,atlas:'costumes/dawn-saint-motion-v1.webp',portrait:'costumes/dawn-saint-portrait-v1.webp'},
].map(c=>Object.freeze({...c,price:COSTUME_PRICE,attackBonus:COSTUME_ATTACK_BONUS,motionLayout:c.motionLayout||c.classId,portraitMask:c.portraitMask===null?null:`costumes/${c.classId}-portrait-mask.svg`,atlas:c.atlas||`costumes/${c.classId}-motion-v2.webp`,portrait:c.portrait||`costumes/${c.classId}-portrait-v1.webp`})));
export function costumeById(id,classId){return COSTUMES.find(c=>c.id===id&&(!classId||c.classId===classId))||null;}
// Ownership bonuses include every class and do not require equipping the costume.
export function costumeAttackBonus(s){return [...new Set(Array.isArray(s.costumes)?s.costumes:[])].reduce((total,id)=>total+(costumeById(id)?.attackBonus||0),0);}
export function equippedCostume(s){return Array.isArray(s.costumes)&&s.costumes.includes(s.equippedCostume)?costumeById(s.equippedCostume,s.classId):null;}
export function normalizeCostumes(s){s.costumes=[...new Set((Array.isArray(s.costumes)?s.costumes:[]).filter(id=>costumeById(id)))];s.equippedCostume=equippedCostume(s)?.id||null;return s;}
export function costumeCommand(s,command,id){
  const fail=code=>{throw new Error(code);};
  if(s.battle||s.coopRoom||s.partyRoom)fail('BATTLE_IN_PROGRESS');
  normalizeCostumes(s);
  if(command==='costumeUnequip'){s.equippedCostume=null;return {type:'costumeUnequip'};}
  const c=costumeById(id);if(!c)fail('INVALID_COSTUME');
  if(command==='costumeBuy'){
    if(s.costumes.includes(id))fail('COSTUME_OWNED');
    if(!(s.gold>=c.price))fail('INSUFFICIENT_GOLD');
    if(!s.isAdmin)s.gold-=c.price;
    s.costumes.push(id);return {type:'costumeBuy',id,gold:c.price};
  }
  if(command!=='costumeEquip')fail('INVALID_COMMAND');
  if(!s.costumes.includes(id))fail('COSTUME_NOT_OWNED');
  if(c.classId!==s.classId)fail('COSTUME_CLASS_MISMATCH');
  s.equippedCostume=id;return {type:'costumeEquip',id};
}
