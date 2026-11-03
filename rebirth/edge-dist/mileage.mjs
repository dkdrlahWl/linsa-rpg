// 2026-11-03 도현: 셀리아 마일리지.
// 셀리아에게 소모품을 사거나 팔 때, 보스장비를 팔 때 오간 골드의 1%(VIP 등급에 따라 최대 10%)가 마일리지로 쌓인다(1마일리지 = 1골드 기준 가치).
// 마일리지 상점에서 마일리지로 재료·소환권 등을 산다. 가격은 마일리지 단위.
// 2026-11-03 도현: 마일리지 상점 가격 전부 절반. 이후 마일리지 1 ≈ 골드 2 기준으로 잠금석 100만·프라임 100만·동료 소환권 400만 조정. 프라임 큐브는 마일리지 상점에서만 판매(암시장 제외).
export const MILEAGE_RATE=0.01;
export const MILEAGE_MAX=9_000_000_000_000;
export const MILEAGE_SHOP=Object.freeze([
 {id:'cube',name:'레드 큐브',key:'cube',cost:100000},
 {id:'highCube',name:'블랙 큐브',key:'highCube',cost:250000},
 {id:'addCube',name:'에디셔널 큐브',key:'addCube',cost:500000},
 {id:'bonusFlame',name:'추가옵션 불꽃',key:'bonusFlame',cost:2500000},
 {id:'potentialLock',name:'잠재 잠금석',key:'potentialLock',cost:1000000},
 {id:'primeCube',name:'프라임 큐브',key:'primeCube',cost:1000000},
 {id:'dungeonKey',name:'던전 열쇠',key:'dungeonKey',cost:5000000},
 {id:'companionTicket',name:'동료 소환권',key:'companionTicket',cost:4000000},
 {id:'tribeTicket',name:'종족 주사위',key:'tribeTicket',cost:15000000},
 {id:'ringuHair',name:'링구의 머리카락',key:'ringuHair',cost:50000000},
].map(Object.freeze));
const fail=code=>{throw new Error(code);};
export const mileageCount=s=>Number.isSafeInteger(s?.mileage)&&s.mileage>=0?s.mileage:0;
// 골드 거래액의 1%(내림)를 적립하고 적립량을 돌려준다.
export function mileageEarn(s,gold){
 // 적립률은 이번 거래 전 VIP 등급 기준.
 const amount=Math.max(0,Math.floor(Number(gold)||0)),add=Math.floor(amount*mileageRate(s));
 if(add>0)s.mileage=Math.min(MILEAGE_MAX,mileageCount(s)+add);
 // VIP 누적 거래액(골드)도 같은 거래에서 함께 쌓는다.
 if(amount>0)s.celiaVolume=Math.min(MILEAGE_MAX,celiaVolume(s)+amount);
 return add;
}

// ── 셀리아 VIP (2026-11-03 도현) ──
// 셀리아와의 누적 거래액(소모품 구매·판매 + 보스장비 판매 골드)으로 등급이 오른다.
// 2026-11-03 도현: 할인 대신 등급이 오를수록 마일리지 적립률이 오른다(1% → VIP 10 최대 10%, VIP 10 = 누적 1,000억). 등급마다 칭호(titles-data.mjs의 vip1~vip6).
export const VIP_TIERS=Object.freeze([
 {level:0,name:'일반',need:0,rate:.01,title:null},
 {level:1,name:'브론즈',need:100_000_000,rate:.015,title:'vip1'},
 {level:2,name:'실버',need:500_000_000,rate:.02,title:'vip2'},
 {level:3,name:'골드',need:2_000_000_000,rate:.025,title:'vip3'},
 {level:4,name:'플래티넘',need:5_000_000_000,rate:.03,title:'vip4'},
 {level:5,name:'다이아몬드',need:10_000_000_000,rate:.04,title:'vip5'},
 {level:6,name:'마스터',need:20_000_000_000,rate:.05,title:'vip6'},
 {level:7,name:'그랜드마스터',need:30_000_000_000,rate:.06,title:'vip7'},
 {level:8,name:'레전드',need:50_000_000_000,rate:.07,title:'vip8'},
 {level:9,name:'셀리아의 귀빈',need:70_000_000_000,rate:.085,title:'vip9'},
 {level:10,name:'셀리아의 단골',need:100_000_000_000,rate:.10,title:'vip10'},
].map(Object.freeze));
export const celiaVolume=s=>Number.isSafeInteger(s?.celiaVolume)&&s.celiaVolume>=0?s.celiaVolume:0;
export function vipTier(s){const v=celiaVolume(s);let t=VIP_TIERS[0];for(const x of VIP_TIERS)if(v>=x.need)t=x;return t;}
export const vipNext=s=>VIP_TIERS[vipTier(s).level+1]||null;
export const mileagePrice=(s,offer,quantity=1)=>offer.cost*quantity;
export const mileageRate=s=>vipTier(s).rate;
export function mileageBuy(s,args,{normalizeCompanions,normalizeTribe}){
 const offer=MILEAGE_SHOP.find(o=>o.id===args?.id);if(!offer)fail('INVALID_MILEAGE_ITEM');
 const quantity=args.quantity===undefined?1:args.quantity;
 if(!Number.isSafeInteger(quantity)||quantity<1||quantity>1000)fail('INVALID_MILEAGE_QUANTITY');
 const cost=mileagePrice(s,offer,quantity),have=mileageCount(s);
 if(have<cost)fail('INSUFFICIENT_MILEAGE');
 s.mileage=have-cost;
 if(offer.key==='companionTicket')normalizeCompanions(s).tickets+=quantity;
 else if(offer.key==='tribeTicket')normalizeTribe(s).tickets+=quantity;
 else {s.materials=s.materials||{};s.materials[offer.key]=(Number(s.materials[offer.key])||0)+quantity;}
 return {type:'mileageBuy',id:offer.id,name:offer.name,quantity,cost,mileage:s.mileage,vip:vipTier(s).level};
}
