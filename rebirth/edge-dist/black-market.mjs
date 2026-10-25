// 암시장: 한국시간 00시·12시·18시에 진열 3개가 바뀐다. 모든 계정이 같은 진열을 본다.
// 진열은 주기 ID를 시드로 결정적으로 뽑으므로 서버와 화면이 따로 계산해도 같다.
// 구매 제한(재고)은 계정별·주기별로 state.blackMarket에 저장한다.
import {bossSalePrice} from './shop-model.mjs';

export const BLACK_MARKET_NPC=Object.freeze({name:'벨록',title:'암시장 상인',line:'쉿… 이번 물건은 이번 판에만 풀어.',sub:'정해진 시간마다 물건이 바뀌어. 놓치면 다음은 장담 못 해.'});
export const BLACK_MARKET_HOURS=Object.freeze([0,12,18]);
export const BLACK_MARKET_SLOTS=3;
export const MATERIAL_CAP=1000000;

// 일반 상품: 가중치 합 95 (보스장비 5%는 따로 판정)
export const BLACK_MARKET_GOODS=Object.freeze([
 {id:'cube',kind:'material',name:'레드 큐브',price:100000,stock:10,weight:14},
 {id:'highCube',kind:'material',name:'블랙 큐브',price:400000,stock:10,weight:12},
 {id:'primeCube',kind:'material',name:'프라임 큐브',price:500000,stock:10,weight:7},
 {id:'scroll',kind:'material',name:'잠재 해금 주문서',price:1000000,stock:2,weight:12},
 {id:'potentialLock',kind:'material',name:'잠재 잠금석',price:2000000,stock:2,weight:10},
 {id:'dungeonKey',kind:'material',name:'던전 열쇠',price:5000000,stock:1,weight:8},
 {id:'fragment',kind:'material',name:'장비 파편',price:5000,stock:500,weight:15},
 {id:'luckPotion',kind:'potion',name:'행운 물약',price:4000000,stock:1,weight:9},
 {id:'diamond',kind:'diamond',name:'다이아',price:250000,stock:3,weight:8},
].map(Object.freeze));

// 보스장비: 한 주기에 1개가 진열될 확률 5%. 레벨이 높을수록, 160제부터 크게 낮다. 무기는 다른 부위 1개의 절반.
export const BLACK_MARKET_BOSS_CHANCE=.05;
export const BLACK_MARKET_BOSS_LEVELS=Object.freeze([[100,22],[110,18],[120,15],[130,13],[140,11],[150,9],[160,5],[170,3.5],[180,2],[190,1],[200,.5]].map(Object.freeze));
export const BLACK_MARKET_BOSS_SLOT_WEIGHTS=Object.freeze([.5,1,1,1,1,1,1,1,1]);

export function blackMarketBossPrice(level,slot){
 // 2026-10-18: 모든 무기 가격 20% 추가 인상(170~190제는 50% 인상 뒤 적용)
 if(level===200)return slot===0?600000000*1.2:300000000*1.2;
 // 170~190제 무기는 기본가(셀리아 판매가 2배)에서 50% 추가
 const price=bossSalePrice({boss:true,level,slot})*2;
 // 2026-10-18: 무기 제외 부위도 20% 인상
 return slot===0?Math.round(price*(level>=170?1.5:1)*1.2):Math.round(price*1.2);
}

const KST=9*3600000,HOUR=3600000;
export function blackMarketRotation(now=Date.now()){
 const k=new Date(now+KST),hour=k.getUTCHours(),startHour=[...BLACK_MARKET_HOURS].reverse().find(h=>hour>=h);
 const day=Date.UTC(k.getUTCFullYear(),k.getUTCMonth(),k.getUTCDate());
 const next=BLACK_MARKET_HOURS.find(h=>h>startHour);
 const start=day+startHour*HOUR-KST,end=day+(next??24)*HOUR-KST;
 const id=k.toISOString().slice(0,10)+'-'+String(startHour).padStart(2,'0');
 return {id,start,end};
}

function seeded(text){
 let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}
 let a=h>>>0;
 return ()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};
}
function weighted(list,weightOf,random){
 const total=list.reduce((n,x)=>n+weightOf(x),0);let r=random()*total;
 for(const x of list){r-=weightOf(x);if(r<0)return x;}
 return list[list.length-1];
}
const SLOT_NAMES=['무기','투구','갑옷','바지','장갑','신발','반지','귀걸이','펜던트'];
function bossOffer(random){
 const [level]=weighted(BLACK_MARKET_BOSS_LEVELS,x=>x[1],random);
 const slot=weighted(BLACK_MARKET_BOSS_SLOT_WEIGHTS.map((w,i)=>i),i=>BLACK_MARKET_BOSS_SLOT_WEIGHTS[i],random);
 return {id:'boss-'+level+'-'+slot,kind:'boss',name:level+'제 보스장비 '+SLOT_NAMES[slot],level,slot,price:blackMarketBossPrice(level,slot),stock:1};
}

// 한 주기의 진열 3개. 같은 상품은 한 진열에 두 번 나오지 않는다.
// key가 있으면 계정별 진열(캐릭터 이름 기준), 없으면 공통 진열.
export function blackMarketOffers(rotationId,key=''){
 const random=seeded('linsa-black-market|'+rotationId+(key?'|'+key:''));
 const offers=[];
 const bossSlot=random()<BLACK_MARKET_BOSS_CHANCE?Math.floor(random()*BLACK_MARKET_SLOTS):-1;
 let pool=[...BLACK_MARKET_GOODS];
 for(let i=0;i<BLACK_MARKET_SLOTS;i++){
  if(i===bossSlot){offers.push(bossOffer(random));continue;}
  const good=weighted(pool,g=>g.weight,random);pool=pool.filter(g=>g!==good);
  offers.push({id:good.id,kind:good.kind,name:good.name,price:good.price,stock:good.stock});
 }
 return offers;
}

// 운영자가 특정 계정의 현재 진열 1칸을 보스장비로 바꿀 때 쓰는 값.
// state.blackMarketSpecial={rotation,index,level,slot,classId} 또는 그 배열(주기별 예약). 해당 주기에만 적용된다.
export function blackMarketSpecialFor(state,rotationId){const list=[].concat(state?.blackMarketSpecial||[]);return list.find(x=>x&&x.rotation===rotationId)||null;}
const CLASS_NAMES={warrior:'전사',mage:'마법사',archer:'궁수',rogue:'도적',pirate:'해적',priest:'사제'};
export function blackMarketOffersFor(state,rotationId){
 const sp=blackMarketSpecialFor(state,rotationId),shared=sp&&sp.shared===true;
 const offers=blackMarketOffers(rotationId,shared?'':String(state?.name||''));
 if(sp&&sp.rotation===rotationId&&Number.isInteger(sp.index)&&sp.index>=0&&sp.index<offers.length&&Number.isInteger(sp.level)&&Number.isInteger(sp.slot)){
  // 200제 보스장비는 무기를 빼고 전부 공용이라 직업을 붙이지 않는다.
  const cls=CLASS_NAMES[sp.classId]&&!(sp.level>=200&&sp.slot!==0)?sp.classId:undefined;
  offers[sp.index]={id:'boss-'+sp.level+'-'+sp.slot+(cls?'-'+cls:''),kind:'boss',name:sp.level+'제 '+(cls?CLASS_NAMES[cls]+' ':'')+'보스장비 '+SLOT_NAMES[sp.slot],level:sp.level,slot:sp.slot,classId:cls,price:blackMarketBossPrice(sp.level,sp.slot),stock:1,special:true};
 }
 return offers;
}
// 계정별 진열로 바뀐 뒤의 구매 기록은 'rotation:i' 키로 저장한다(공통 진열 시절 기록과 분리).
export function blackMarketStateKey(state,rotationId){const sp=blackMarketSpecialFor(state,rotationId);return sp&&sp.shared===true?rotationId:rotationId+':i';}
export function blackMarketBought(state,rotationId){
 const bm=state?.blackMarket;
 return bm&&bm.rotation===blackMarketStateKey(state,rotationId)&&bm.bought&&typeof bm.bought==='object'?bm.bought:{};
}
export function blackMarketRemaining(state,rotationId,index){
 const offer=blackMarketOffersFor(state,rotationId)[index];if(!offer)return 0;
 return Math.max(0,offer.stock-(Number(blackMarketBought(state,rotationId)[index])||0));
}
export function blackMarketOwned(state,offer){
 if(offer.kind==='material')return Math.max(0,Number(state?.materials?.[offer.id])||0);
 if(offer.kind==='potion')return Math.max(0,Number(state?.consumables?.luckPotion)||0);
 if(offer.kind==='diamond')return Math.max(0,Number(state?.fishing?.diamonds)||0);
 return 0;
}
// 지금 살 수 있는 최대 수량(재고·골드·보유 한도 기준)
export function blackMarketLimit(state,rotationId,index){
 const offer=blackMarketOffersFor(state,rotationId)[index];if(!offer)return 0;
 const remaining=blackMarketRemaining(state,rotationId,index);
 const affordable=Math.floor((Number(state?.gold)||0)/offer.price);
 const room=offer.kind==='boss'?1:Math.max(0,MATERIAL_CAP-blackMarketOwned(state,offer));
 return Math.max(0,Math.min(remaining,affordable,room));
}

// 서버 구매 처리. makeBossItem(level,slot)은 엔진이 넘겨주는 장비 생성 함수다.
export function blackMarketBuy(state,args,now,makeBossItem){
 const rotation=blackMarketRotation(now);
 if(args?.rotation!==rotation.id)throw Error('BLACK_MARKET_EXPIRED');
 const index=args?.index,quantity=args?.quantity??1;
 if(!Number.isInteger(index)||index<0||index>=BLACK_MARKET_SLOTS)throw Error('INVALID_BLACK_MARKET_ITEM');
 const offer=blackMarketOffersFor(state,rotation.id)[index];
 if(!Number.isSafeInteger(quantity)||quantity<1)throw Error('INVALID_BLACK_MARKET_QUANTITY');
 if(quantity>blackMarketRemaining(state,rotation.id,index))throw Error('BLACK_MARKET_SOLD_OUT');
 if(offer.kind!=='boss'&&quantity>MATERIAL_CAP-blackMarketOwned(state,offer))throw Error('INVENTORY_CONSUMABLE_LIMIT');
 const total=offer.price*quantity;
 if(!state.isAdmin){if((Number(state.gold)||0)<total)throw Error('INSUFFICIENT_GOLD');state.gold-=total;}
 let item=null;
 if(offer.kind==='material')state.materials={...state.materials,[offer.id]:blackMarketOwned(state,offer)+quantity};
 else if(offer.kind==='potion')state.consumables={...state.consumables,luckPotion:blackMarketOwned(state,offer)+quantity};
 else if(offer.kind==='diamond')state.fishing={...state.fishing,diamonds:blackMarketOwned(state,offer)+quantity};
 else item=makeBossItem(offer.level,offer.slot,offer.classId);
 const bought={...blackMarketBought(state,rotation.id)};bought[index]=(Number(bought[index])||0)+quantity;
 state.blackMarket={rotation:blackMarketStateKey(state,rotation.id),bought};
 return {type:'blackMarketBuy',rotation:rotation.id,index,id:offer.id,name:offer.name,quantity,gold:total,item};
}
