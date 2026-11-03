// 2026-11-03 도현: 셀리아 마일리지.
// 셀리아에게 소모품을 사거나 팔 때, 보스장비를 팔 때 오간 골드의 1%가 마일리지로 쌓인다(1마일리지 = 1골드 기준 가치).
// 마일리지 상점에서 마일리지로 재료·소환권 등을 산다. 가격은 마일리지 단위.
// 2026-11-03 도현: 마일리지 상점 가격 전부 절반.
export const MILEAGE_RATE=0.01;
export const MILEAGE_MAX=9_000_000_000_000;
export const MILEAGE_SHOP=Object.freeze([
 {id:'cube',name:'레드 큐브',key:'cube',cost:100000},
 {id:'highCube',name:'블랙 큐브',key:'highCube',cost:250000},
 {id:'addCube',name:'에디셔널 큐브',key:'addCube',cost:500000},
 {id:'bonusFlame',name:'추가옵션 불꽃',key:'bonusFlame',cost:2500000},
 {id:'potentialLock',name:'잠재 잠금석',key:'potentialLock',cost:2500000},
 {id:'primeCube',name:'프라임 큐브',key:'primeCube',cost:5000000},
 {id:'dungeonKey',name:'던전 열쇠',key:'dungeonKey',cost:5000000},
 {id:'companionTicket',name:'동료 소환권',key:'companionTicket',cost:10000000},
 {id:'tribeTicket',name:'종족 주사위',key:'tribeTicket',cost:15000000},
 {id:'ringuHair',name:'링구의 머리카락',key:'ringuHair',cost:50000000},
].map(Object.freeze));
const fail=code=>{throw new Error(code);};
export const mileageCount=s=>Number.isSafeInteger(s?.mileage)&&s.mileage>=0?s.mileage:0;
// 골드 거래액의 1%(내림)를 적립하고 적립량을 돌려준다.
export function mileageEarn(s,gold){
 const add=Math.floor(Math.max(0,Number(gold)||0)*MILEAGE_RATE);
 if(add>0)s.mileage=Math.min(MILEAGE_MAX,mileageCount(s)+add);
 return add;
}
export function mileageBuy(s,args,{normalizeCompanions,normalizeTribe}){
 const offer=MILEAGE_SHOP.find(o=>o.id===args?.id);if(!offer)fail('INVALID_MILEAGE_ITEM');
 const quantity=args.quantity===undefined?1:args.quantity;
 if(!Number.isSafeInteger(quantity)||quantity<1||quantity>1000)fail('INVALID_MILEAGE_QUANTITY');
 const cost=offer.cost*quantity,have=mileageCount(s);
 if(have<cost)fail('INSUFFICIENT_MILEAGE');
 s.mileage=have-cost;
 if(offer.key==='companionTicket')normalizeCompanions(s).tickets+=quantity;
 else if(offer.key==='tribeTicket')normalizeTribe(s).tickets+=quantity;
 else {s.materials=s.materials||{};s.materials[offer.key]=(Number(s.materials[offer.key])||0)+quantity;}
 return {type:'mileageBuy',id:offer.id,name:offer.name,quantity,cost,mileage:s.mileage};
}
