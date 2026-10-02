export const COSTUME_PRICE=5_000_000;
export const COSTUMES=Object.freeze([
  {id:'crimson-dragon',classId:'warrior',name:'붉은 용기사'},
  {id:'starlight-mage',classId:'mage',name:'별빛 마도사'},
  {id:'snowmoon-ranger',classId:'archer',name:'설월 궁수'},
  {id:'blackmoon-assassin',classId:'rogue',name:'흑월 암살자'},
  {id:'golden-captain',classId:'pirate',name:'황금 함장'},
  {id:'bluemoon-priest',classId:'priest',name:'청월 사제'},
].map(c=>Object.freeze({...c,price:COSTUME_PRICE,atlas:`costumes/${c.classId}-v1.webp`,portrait:`costumes/${c.classId}-portrait-v1.webp`})));
export function costumeById(id,classId){return COSTUMES.find(c=>c.id===id&&(!classId||c.classId===classId))||null;}
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
