// 2026-11-04 도현: 전문 직업 — 연금술사·탐험가·어부·광부. 계정당 1개, 처음 선택 무료, 변경은 7일 쿨타임 + 1억 G + 숙련도 초기화.
// 제작은 횟수 제한 없음(하위 재료 + 골드만 소모). 제작자는 "가공업자": 남의 원재료를 사서 가공해 되파는 구조라 레시피가 싸고 서버 수요 전체를 감당한다.
// 2026-11-04 도현: 모든 레시피 1회 이익(기준가 − 재료 기준가 − 골드) = 20만으로 통일 → 직업 재료 4종 시세가 같은 수준(약 20만)으로 수렴.
// (이전: 원가 = 기준가의 90%) 기준가 = 토큰 교환소(레드 10만·블랙 40만·파편 2만·다이아 20만), 프라임 150만·초월석 1,000만은 시장 추정.
// 2026-11-04 도현: 채집 보너스는 직업당 1개, Lv.10 기준 하루 약 300만 G 가치로 맞춤 (Lv.1은 절반, 숙련도 따라 선형 증가).
// 연금술사 사냥 레드 큐브 드랍률 ×8.5, 광부 사냥 파편 드랍률 ×3.5 (엔드 사냥터 0.04%·0.6% 기준), 탐험가 링탐 블랙 큐브 개수 +20%(링탐 블랙 큐브 반토막에 맞춰 10→20%), 어부 낚시 다이아 +50%.
// 숙련도 = 제작 횟수. Lv.n→n+1에 n×10. 레벨이 오르면 채집 보너스 50%→100%. 제작 비용은 전 구간 동일. (추가 제작 확률은 2026-11-04 삭제)
// 2026-11-04 도현: 전체 오픈 (17:21).
export const PROFESSION_OPEN=true;
export const professionOpenFor=s=>PROFESSION_OPEN||s?.isAdmin===true;
// 직업 재료: 사냥터에서 직업과 무관하게 랜덤 드랍, 제작 1회당 1개 소모, 거래 가능.
export const JOB_MATERIAL_DROP=0.011; // 2026-11-04 도현: 처치당 1.1% — 20시간(9,000마리) 사냥 시 4종 합계 약 100개
export const JOB_MATERIALS=Object.freeze({alchemist:'essence',explorer:'mapPiece',fisher:'pearl',miner:'ore'});
export const JOB_MATERIAL_KEYS=Object.freeze(Object.values(JOB_MATERIALS));
export const PROFESSION_MAX_LEVEL=10;
// 2026-11-04 도현: 직업당 최대 2명 (8명 서버, 3명 → 2명). 인원은 서버(edge)가 DB에서 세어 args.taken으로 넣는다(관리자·테스터 제외).
export const PROFESSION_SLOTS=2;
export const PROFESSION_CHANGE_COOLDOWN=7*86400000;
export const PROFESSION_CHANGE_COST=100000000;
export const PROFESSION_BONUS_CRAFT_PER_LEVEL=0; // 2026-11-04 도현: 추가 제작 확률 삭제
// 2026-11-04 도현: 열쇠 파편 50+620만 → 파편 120+480만, 잠금석 기준가 200만 → 450만, 레시피 파편 20+블랙 2+레드 4+245만 (원가 405만 = 90%)
// 2026-11-04 도현: 파편 소모처 강화 — 파편 레시피의 파편 개수를 크게 늘리고 그만큼 골드를 줄임(1회 이익 20만 유지, 파편 2만 기준).
// 열쇠 파편 300 + 180만, 보물찾기 10→50, 불꽃 10→100, 잠금석 20→60, 초월석 20→150.
export const PROFESSIONS=Object.freeze([
 Object.freeze({id:'alchemist',name:'연금술사',icon:'⚗️',blurb:'큐브 가공',
  gather:{cube:7.5},
  recipes:[
   {id:'primeCube',name:'프라임 큐브',out:{primeCube:1},cost:{highCube:1,cube:2},gold:700000},
   {id:'addCube',name:'에디셔널 큐브',out:{addCube:1},cost:{cube:2},gold:600000},
  ]}),
 Object.freeze({id:'explorer',name:'탐험가',icon:'🗝️',blurb:'입장권·불꽃 가공',
  gather:{highCube:.2},
  recipes:[
   {id:'dungeonKey',name:'던전 열쇠',out:{dungeonKey:1},cost:{fragment:300},gold:1800000},
   {id:'treasureTicket',name:'보물찾기 티켓',out:{treasureTicket:1},cost:{fragment:50},gold:800000},
   {id:'bonusFlame',name:'추가옵션 불꽃',out:{bonusFlame:1},cost:{fragment:100,cube:3},gold:2500000},
  ]}),
 Object.freeze({id:'fisher',name:'어부',icon:'🎣',blurb:'소환권 가공',
  gather:{diamond:.5},
  recipes:[
   {id:'companionTicket',name:'동료 소환권',out:{companionTicket:1},cost:{diamond:3,cube:2},gold:3000000},
   {id:'pickupTicket',name:'픽업 소환권',out:{pickupTicket:1},cost:{diamond:8},gold:4200000},
  ]}),
 Object.freeze({id:'miner',name:'광부',icon:'⛏️',blurb:'강화 재료 가공',
  gather:{fragment:2.5},
  recipes:[
   {id:'potentialLock',name:'잠재 잠금석',out:{potentialLock:1},cost:{fragment:60,highCube:2,cube:4},gold:1900000},
   {id:'transcendStone',name:'초월석',out:{transcendStone:1},cost:{fragment:150,highCube:3},gold:5600000},
  ]}),
].map(p=>Object.freeze({...p,recipes:Object.freeze(p.recipes.map(Object.freeze))})));
export const RESOURCE_NAMES=Object.freeze({essence:'마력 정수',mapPiece:'고대 지도 조각',pearl:'심해 진주',ore:'원석',fragment:'장비 파편',cube:'레드 큐브',highCube:'블랙 큐브',primeCube:'프라임 큐브',addCube:'에디셔널 큐브',potentialLock:'잠재 잠금석',dungeonKey:'던전 열쇠',bonusFlame:'추가옵션 불꽃',transcendStone:'초월석',diamond:'다이아',companionTicket:'동료 소환권',pickupTicket:'픽업 소환권',treasureTicket:'보물찾기 티켓'});
export const professionById=id=>PROFESSIONS.find(p=>p.id===id)||null;
const fail=code=>{throw new Error(code);};
export function normalizeProfession(s){
 const p=s.profession&&typeof s.profession==='object'&&professionById(s.profession.id)?s.profession:null;
 if(!p){if(s.profession!==undefined&&s.profession!==null)delete s.profession;return null;}
 p.level=Number.isInteger(p.level)&&p.level>=1?Math.min(PROFESSION_MAX_LEVEL,p.level):1;
 p.xp=Number.isInteger(p.xp)&&p.xp>=0?p.xp:0;
 p.crafted=Number.isInteger(p.crafted)&&p.crafted>=0?p.crafted:0;
 p.bonus=Number.isInteger(p.bonus)&&p.bonus>=0?p.bonus:0;
 p.chosenAt=Number.isSafeInteger(p.chosenAt)?p.chosenAt:0;
 return p;
}
// 2026-11-04 도현: Lv.10까지 총 10,000회 제작. Lv.n→n+1 필요 = 10000×n/45 (222, 444, … 2,000).
export const PROFESSION_TOTAL_CRAFTS=10000;
export const professionXpNeeded=level=>Math.round(PROFESSION_TOTAL_CRAFTS*level/45);
export const professionLevel=s=>normalizeProfession(s)?.level||0;
export const professionOf=s=>{const p=normalizeProfession(s);return p?professionById(p.id):null;};
// 2026-11-04 도현: 제작 비용은 숙련도와 무관하게 전 구간 동일. 숙련도는 추가 제작 확률만 올린다.
export const professionCostMultiplier=()=>1;
export const professionBonusChance=()=>0;
// 채집 보너스 실효 배율: Lv.1 50% → Lv.10 100% of the listed bonus. Returns the multiplier (1 + bonus×scale), or 1 when not that profession.
export function professionGather(s,key){
 const p=normalizeProfession(s);if(!p)return 1;
 const def=professionById(p.id),bonus=def?.gather?.[key];if(!bonus)return 1;
 const scale=0.5+0.5*(p.level-1)/(PROFESSION_MAX_LEVEL-1);
 return 1+bonus*scale;
}
// 재료 보관 위치(거래소와 같은 규칙)
// 소수 배율 개수: 기대값이 정확히 맞도록 확률적 반올림
export const gatherAmount=(s,key,n,random)=>{const x=n*professionGather(s,key),f=Math.floor(x);return x>f?f+(random()<x-f?1:0):f;}; // 보너스 없으면 난수 안 씀(판정 순서 유지)
export function resourcePath(key){
 if(key==='diamond')return ['fishing','diamonds'];
 if(key==='companionTicket')return ['companions','tickets'];
 if(key==='pickupTicket')return ['companions','pickupTickets'];
 if(key==='treasureTicket')return ['treasure','tickets'];
 return ['materials',key];
}
export function resourceCount(s,key){const [a,b]=resourcePath(key);const v=s?.[a]?.[b];return Number.isSafeInteger(v)&&v>=0?v:0;}
export function resourceAdd(s,key,n){
 const [a,b]=resourcePath(key);
 if(!s[a]||typeof s[a]!=='object'||Array.isArray(s[a]))s[a]={};
 s[a][b]=resourceCount(s,key)+n;
 return s[a][b];
}
export function recipeCost(recipe,level,count=1,professionId=null){
 const m=professionCostMultiplier(level);
 const cost={};
 const jm=professionId?JOB_MATERIALS[professionId]:null;if(jm)cost[jm]=count;
 for(const [k,v] of Object.entries(recipe.cost))cost[k]=(cost[k]||0)+Math.ceil(v*m)*count;
 return {materials:cost,gold:Math.ceil(recipe.gold*m)*count};
}
export function recipeMaxCount(s,profession,recipe){
 const level=professionLevel(s),unit=recipeCost(recipe,level,1,profession?.id);
 let max=1000;
 for(const [k,v] of Object.entries(unit.materials))if(v>0)max=Math.min(max,Math.floor(resourceCount(s,k)/v));
 if(unit.gold>0)max=Math.min(max,Math.floor((Number(s.gold)||0)/unit.gold));
 return Math.max(0,max);
}
export function professionCommand(s,command,args,now,random){
 if(!professionOpenFor(s))fail('PROFESSION_LOCKED');
 if(command==='professionChoose'){
  const def=professionById(args?.id)||fail('INVALID_PROFESSION');
  const cur=normalizeProfession(s);
  const taken=Number(args?.taken?.[def.id])||0;
  if(!s.isAdmin&&!s.isTester&&cur?.id!==def.id&&taken>=PROFESSION_SLOTS)fail('PROFESSION_FULL');
  if(cur){
   if(cur.id===def.id)fail('PROFESSION_SAME');
   if(now-cur.chosenAt<PROFESSION_CHANGE_COOLDOWN)fail('PROFESSION_COOLDOWN');
   if((Number(s.gold)||0)<PROFESSION_CHANGE_COST)fail('INSUFFICIENT_GOLD');
   s.gold-=PROFESSION_CHANGE_COST;
  }
  s.profession={id:def.id,level:1,xp:0,crafted:0,bonus:0,chosenAt:now};
  return {type:command,id:def.id,name:def.name,changed:!!cur,gold:cur?PROFESSION_CHANGE_COST:0};
 }
 if(command==='professionCraft'){
  const p=normalizeProfession(s)||fail('PROFESSION_REQUIRED');
  const def=professionById(p.id),recipe=def.recipes.find(r=>r.id===args?.recipe)||fail('INVALID_RECIPE');
  const count=args?.count==='max'?recipeMaxCount(s,def,recipe):args?.count;
  if(!Number.isInteger(count)||count<1||count>1000)fail('INVALID_CRAFT_COUNT');
  const cost=recipeCost(recipe,p.level,count,def.id);
  for(const [k,v] of Object.entries(cost.materials))if(resourceCount(s,k)<v)fail('INSUFFICIENT_MATERIAL');
  if((Number(s.gold)||0)<cost.gold)fail('INSUFFICIENT_GOLD');
  for(const [k,v] of Object.entries(cost.materials))resourceAdd(s,k,-v);
  s.gold-=cost.gold;
  const bonus=0;
  const made={};for(const [k,v] of Object.entries(recipe.out)){made[k]=v*(count+bonus);resourceAdd(s,k,made[k]);}
  // 숙련도: 제작 1회 = 1
  p.crafted+=count;p.bonus+=bonus;p.xp+=count;
  let ups=0;while(p.level<PROFESSION_MAX_LEVEL&&p.xp>=professionXpNeeded(p.level)){p.xp-=professionXpNeeded(p.level);p.level++;ups++;}
  if(p.level>=PROFESSION_MAX_LEVEL)p.xp=0;
  return {type:command,recipe:recipe.id,name:recipe.name,count,bonus,made,cost,level:p.level,levelUps:ups,xp:p.xp,xpNeeded:p.level>=PROFESSION_MAX_LEVEL?0:professionXpNeeded(p.level)};
 }
 fail('UNKNOWN_COMMAND');
}
// 사냥 정산: 직업 재료 드랍 (총 개수는 호출부에서 굴리고, 종류는 4종 중 랜덤).
export function rollJobMaterials(count,random){
 const out={};for(let i=0;i<count;i++){const k=JOB_MATERIAL_KEYS[Math.floor(random()*JOB_MATERIAL_KEYS.length)];out[k]=(out[k]||0)+1;}
 return out;
}
