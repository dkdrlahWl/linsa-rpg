export const COSTUME_PRICE=5_000_000;
export const COSTUME_ATTACK_BONUS=1;
export const COSTUMES=Object.freeze([
  {id:'crimson-dragon',classId:'warrior',name:'붉은 용기사'},
  {id:'starlight-mage',classId:'mage',name:'별빛 마도사'},
  {id:'snowmoon-ranger',classId:'archer',name:'설월 궁수'},
  {id:'blackmoon-assassin',classId:'rogue',name:'흑월 암살자'},
  {id:'golden-captain',classId:'pirate',name:'황금 함장'},
  {id:'bluemoon-priest',classId:'priest',name:'청월 사제'},
  {id:'frost-crown-knight',classId:'warrior',name:'서리왕관 기사',motionLayout:'frost-crown-knight',portraitMask:null,atlas:'costumes/frost-crown-knight-motion-v1.webp',portrait:'costumes/frost-crown-knight-portrait-v2.webp'},
  {id:'rose-queen-mage',classId:'mage',name:'장미여왕 마도사',motionLayout:'rose-queen-mage',portraitMask:null,atlas:'costumes/rose-queen-mage-motion-v1.webp',portrait:'costumes/rose-queen-mage-portrait-v2.webp'},
  {id:'forest-fairy-ranger',classId:'archer',name:'숲의 요정 궁수',motionLayout:'forest-fairy-ranger',portraitMask:null,atlas:'costumes/forest-fairy-ranger-motion-v1.webp',portrait:'costumes/forest-fairy-ranger-portrait-v2.webp'},
  {id:'violet-moon-ninja',classId:'rogue',name:'자월 닌자',motionLayout:'violet-moon-ninja',portraitMask:null,atlas:'costumes/violet-moon-ninja-motion-v1.webp',portrait:'costumes/violet-moon-ninja-portrait-v2.webp'},
  {id:'azure-naval-admiral',classId:'pirate',name:'푸른해군 제독',motionLayout:'azure-naval-admiral',portraitMask:null,atlas:'costumes/azure-naval-admiral-motion-v1.webp',portrait:'costumes/azure-naval-admiral-portrait-v2.webp'},
  {id:'dawn-saint',classId:'priest',name:'여명의 성녀',motionLayout:'dawn-saint',portraitMask:null,atlas:'costumes/dawn-saint-motion-v1.webp',portrait:'costumes/dawn-saint-portrait-v2.webp',renderBodyHeight:157},
  {id:'obsidian-ember-samurai',classId:'warrior',name:'흑염 사무라이',motionLayout:'obsidian-ember-samurai',portraitMask:null,atlas:'costumes/obsidian-ember-samurai-motion-v1.webp',portrait:'costumes/obsidian-ember-samurai-portrait-v2.webp'},
  {id:'clockwork-alchemist',classId:'mage',name:'태엽 연금술사',motionLayout:'clockwork-alchemist',portraitMask:null,atlas:'costumes/clockwork-alchemist-motion-v1.webp',portrait:'costumes/clockwork-alchemist-portrait-v2.webp'},
  {id:'desert-sun-archer',classId:'archer',name:'사막 태양 궁수',motionLayout:'desert-sun-archer',portraitMask:null,atlas:'costumes/desert-sun-archer-motion-v1.webp',portrait:'costumes/desert-sun-archer-portrait-v2.webp'},
  {id:'phantom-harlequin',classId:'rogue',name:'환영 광대',motionLayout:'phantom-harlequin',portraitMask:null,atlas:'costumes/phantom-harlequin-motion-v1.webp',portrait:'costumes/phantom-harlequin-portrait-v2.webp'},
  {id:'ghost-ship-captain',classId:'pirate',name:'유령선 선장',motionLayout:'ghost-ship-captain',portraitMask:null,atlas:'costumes/ghost-ship-captain-motion-v1.webp',portrait:'costumes/ghost-ship-captain-portrait-v2.webp'},
  {id:'sakura-shrine-maiden',classId:'priest',name:'벚꽃 무녀',motionLayout:'sakura-shrine-maiden',portraitMask:null,atlas:'costumes/sakura-shrine-maiden-motion-v1.webp',portrait:'costumes/sakura-shrine-maiden-portrait-v2.webp',renderBodyHeight:180},
  {"id":"sunrose-empress","authoredWalk":true,"price":10000000,"classId":"warrior","name":"태양장미 여제","motionLayout":"sunrose-empress","portraitMask":null,"atlas":"costumes/sunrose-empress-motion-twolegs-v1.webp","portrait":"costumes/sunrose-empress-portrait-approved-20261025.webp","approvedIdle":true,"twoLegWalk":true},
  {"id":"astral-tea-mage","authoredWalk":true,"price":10000000,"classId":"mage","name":"별다방 마도사","motionLayout":"astral-tea-mage","portraitMask":null,"atlas":"costumes/astral-tea-mage-motion-twolegs-v1.webp","portrait":"costumes/astral-tea-mage-portrait-approved-20261025.webp","approvedIdle":true,"twoLegWalk":true},
  {"id":"aurora-huntress","authoredWalk":true,"price":10000000,"classId":"archer","name":"극광 매사냥꾼","motionLayout":"aurora-huntress","portraitMask":null,"atlas":"costumes/aurora-huntress-motion-twolegs-v1.webp","portrait":"costumes/aurora-huntress-portrait-approved-20261025.webp","approvedIdle":true,"twoLegWalk":true},
  {"id":"moonjewel-bladedancer","authoredWalk":true,"price":10000000,"classId":"rogue","name":"월광보석 쌍검무희","motionLayout":"moonjewel-bladedancer","portraitMask":null,"atlas":"costumes/moonjewel-bladedancer-motion-twolegs-v1.webp","portrait":"costumes/moonjewel-bladedancer-portrait-approved-20261025.webp","approvedIdle":true,"twoLegWalk":true},
  {"id":"scarlet-sky-pilot","authoredWalk":true,"price":10000000,"classId":"pirate","name":"홍련 비공정 조종사","motionLayout":"scarlet-sky-pilot","portraitMask":null,"atlas":"costumes/scarlet-sky-pilot-motion-twolegs-v1.webp","portrait":"costumes/scarlet-sky-pilot-portrait-approved-20261025.webp","approvedIdle":true,"twoLegWalk":true},
  {"id":"opal-dream-priest","authoredWalk":true,"price":10000000,"classId":"priest","name":"오팔 꿈사제","motionLayout":"opal-dream-priest","portraitMask":null,"atlas":"costumes/opal-dream-priest-motion-twolegs-v1.webp","portrait":"costumes/opal-dream-priest-portrait-approved-20261025.webp","approvedIdle":true,"twoLegWalk":true},
  {"id":"storm-lion-valkyrie","classId":"warrior","name":"뇌전 사자 발키리","price":20000000,"portrait":"costumes/storm-lion-valkyrie-portrait-approved-20261025.webp","atlas":"costumes/storm-lion-valkyrie-motion-twolegs-v1.webp","motionLayout":"storm-lion-valkyrie","portraitMask":null,"approvedIdle":true,"authoredWalk":true,"twoLegWalk":true},
  {"id":"glacier-crystal-librarian","classId":"mage","name":"빙정 서고의 마도사","price":20000000,"portrait":"costumes/glacier-crystal-librarian-portrait-approved-20261025.webp","atlas":"costumes/glacier-crystal-librarian-motion-twolegs-v1.webp","motionLayout":"glacier-crystal-librarian","portraitMask":null,"approvedIdle":true,"authoredWalk":true,"twoLegWalk":true},
  {"id":"autumn-fox-archer","classId":"archer","name":"단풍 구미호 궁수","price":20000000,"portrait":"costumes/autumn-fox-archer-portrait-approved-20261025.webp","atlas":"costumes/autumn-fox-archer-motion-twolegs-v1.webp","motionLayout":"autumn-fox-archer","portraitMask":null,"approvedIdle":true,"authoredWalk":true,"twoLegWalk":true},
  {"id":"raven-masquerade","classId":"rogue","name":"흑익 가면 암살자","price":20000000,"portrait":"costumes/raven-masquerade-portrait-approved-20261025.webp","atlas":"costumes/raven-masquerade-motion-twolegs-v1.webp","motionLayout":"raven-masquerade","portraitMask":null,"approvedIdle":true,"authoredWalk":true,"twoLegWalk":true},
  {"id":"abyssal-pearl-corsair","classId":"pirate","name":"심해 진주 해적","price":20000000,"portrait":"costumes/abyssal-pearl-corsair-portrait-approved-20261025.webp","atlas":"costumes/abyssal-pearl-corsair-motion-twolegs-v1.webp","motionLayout":"abyssal-pearl-corsair","portraitMask":null,"approvedIdle":true,"authoredWalk":true,"twoLegWalk":true},
  {"id":"golden-sun-oracle","classId":"priest","name":"황금 태양의 신탁자","price":20000000,"portrait":"costumes/golden-sun-oracle-portrait-approved-20261025.webp","atlas":"costumes/golden-sun-oracle-motion-twolegs-v1.webp","motionLayout":"golden-sun-oracle","portraitMask":null,"approvedIdle":true,"authoredWalk":true,"twoLegWalk":true},
  {"id":"swan-lake-knight","classId":"warrior","name":"백조의 호수 기사","price":30000000,"portrait":"costumes/swan-lake-knight-portrait-approved-30m-20261025.webp","atlas":"costumes/swan-lake-knight-motion-twolegs-v1.webp","motionLayout":"swan-lake-knight","portraitMask":null,"approvedIdle":true,"authoredWalk":true,"twoLegWalk":true},
  {"id":"sapphire-night-mage","classId":"mage","name":"천일야화 마도사","price":30000000,"portrait":"costumes/sapphire-night-mage-portrait-approved-30m-20261025.webp","atlas":"costumes/sapphire-night-mage-motion-twolegs-v1.webp","motionLayout":"sapphire-night-mage","portraitMask":null,"approvedIdle":true,"authoredWalk":true,"twoLegWalk":true},
  {"id":"jade-peacock-ranger","classId":"archer","name":"비취 공작 궁수","price":30000000,"portrait":"costumes/jade-peacock-ranger-portrait-approved-30m-20261025.webp","atlas":"costumes/jade-peacock-ranger-motion-twolegs-v1.webp","motionLayout":"jade-peacock-ranger","portraitMask":null,"approvedIdle":true,"authoredWalk":true,"twoLegWalk":true},
  {"id":"crimson-butterfly-dancer","classId":"rogue","name":"홍접 비단 무희","price":30000000,"portrait":"costumes/crimson-butterfly-dancer-portrait-approved-30m-20261025.webp","atlas":"costumes/crimson-butterfly-dancer-motion-twolegs-v1.webp","motionLayout":"crimson-butterfly-dancer","portraitMask":null,"approvedIdle":true,"authoredWalk":true,"twoLegWalk":true},
  {"id":"sugar-ribbon-captain","classId":"pirate","name":"설탕왕국 총사","price":30000000,"portrait":"costumes/sugar-ribbon-captain-portrait-approved-30m-20261025.webp","atlas":"costumes/sugar-ribbon-captain-motion-twolegs-v1.webp","motionLayout":"sugar-ribbon-captain","portraitMask":null,"approvedIdle":true,"authoredWalk":true,"twoLegWalk":true},
  {"id":"wisteria-sanctuary-priest","classId":"priest","name":"등꽃 성녀","price":30000000,"portrait":"costumes/wisteria-sanctuary-priest-portrait-approved-30m-20261025.webp","atlas":"costumes/wisteria-sanctuary-priest-motion-twolegs-v1.webp","motionLayout":"wisteria-sanctuary-priest","portraitMask":null,"approvedIdle":true,"authoredWalk":true,"twoLegWalk":true},
].map(c=>Object.freeze({...c,price:c.price??COSTUME_PRICE,attackBonus:COSTUME_ATTACK_BONUS,motionLayout:c.motionLayout||c.classId,portraitMask:c.portraitMask===null?null:`costumes/${c.classId}-portrait-mask.svg`,atlas:c.atlas||`costumes/${c.classId}-motion-v2.webp`,portrait:c.portrait||`costumes/${c.classId}-portrait-v1.webp`})));
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
