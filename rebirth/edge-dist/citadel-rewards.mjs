// Citadel boss chests (server-side rolls). Each of the six bosses drops one personal chest per member.
import {isCitadel} from './citadel-zero.mjs';
import {CLASSES,selectDesign,rollBaseStats} from './data.mjs';
import {makeItem,addItem,halfWeaponSlot} from './engine.mjs';
// lock = 잠재 잠금석, scroll = 잠재 해금 주문서 (1 each on success); fragment guaranteed; gear = boss gear chance,
// gear chance is applied exactly as shown in the lobby (no BOSS_GEAR_RATE_SCALE);
// gear level uniform over the 10-level tiers 100..max; weapon slot at half weight.
export const CITADEL_BOSS_REWARDS=[
 {lock:.10,scroll:.10,fragment:10,gear:.04,max:110},
 {lock:.15,scroll:.15,fragment:10,gear:.05,max:130},
 {lock:.20,scroll:.20,fragment:10,gear:.05,max:140},
 {lock:.25,scroll:.25,fragment:10,gear:.05,max:160},
 {lock:.30,scroll:.30,fragment:10,gear:.05,max:170},
 {lock:.35,scroll:.35,fragment:10,gear:.05,max:190},
];
export const citadelGearLevel=(max,random)=>100+10*Math.floor(random()*((max-100)/10+1));
export function citadelPendingChests(state,room,userId){
 const member=room?.members?.find(m=>m.id===userId&&!m.left);if(!member)return [];
 const claims=state?.citadelClaims?.room===room.id?state.citadelClaims.bosses||[]:[];
 return [...new Set(member.citadelChests||[])].filter(b=>Number.isInteger(b)&&b>=1&&b<=6&&!claims.includes(b)).sort((a,b)=>a-b);
}
export function grantCitadelChests(input,room,userId,ctx){
 if(!isCitadel(room))throw Error('COOP_CHEST_NOT_READY');
 const bosses=citadelPendingChests(input,room,userId);if(!bosses.length)throw Error('COOP_CHEST_NOT_READY');
 const state=structuredClone(input);state.materials??={};state.items??=[];state.collection??=[];
 const reward={type:'citadelChest',bosses,potentialLock:0,scroll:0,fragment:0,items:[]};
 for(const boss of bosses){
  const r=CITADEL_BOSS_REWARDS[boss-1];
  if(ctx.random()<r.lock)reward.potentialLock++;
  if(ctx.random()<r.scroll)reward.scroll++;
  reward.fragment+=r.fragment;
  if(ctx.random()<r.gear){
   const level=citadelGearLevel(r.max,ctx.random),classId=CLASSES[Math.floor(ctx.random()*CLASSES.length)].id,slot=halfWeaponSlot(ctx.random),design=selectDesign(level,classId,slot,true,ctx.random);
   const item={...makeItem(level,classId,slot,true,ctx,design.weaponVariant),...design};item.baseStats=rollBaseStats(item,ctx.random);
   if(state.items.length>=300)reward.stored=(reward.stored||0)+1;addItem(state,item);reward.items.push(item);
  }
 }
 for(const key of ['potentialLock','scroll','fragment'])state.materials[key]=(state.materials[key]||0)+reward[key];
 const prior=state.citadelClaims?.room===room.id?state.citadelClaims.bosses||[]:[];
 state.citadelClaims={room:room.id,bosses:[...prior,...bosses].sort((a,b)=>a-b)};
 state.citadelEver=[...new Set([...(state.citadelEver||[]),...bosses])].sort((a,b)=>a-b);state.citadelMaxFloor=Math.max(state.citadelMaxFloor||0,room.floor||0);
 state.lastReward=reward;
 return {state,reward};
}
