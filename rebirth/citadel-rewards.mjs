// Citadel boss chests (server-side rolls). Each of the six bosses drops one personal chest per member.
import {isCitadel} from './citadel-zero.mjs';
import {CLASSES,selectDesign,rollBaseStats} from './data.mjs';
import {makeItem,addItem,halfWeaponSlot} from './engine.mjs';
import {professionFragmentBoost} from './profession-model.mjs';
// lock = 잠재 잠금석, scroll = 잠재 해금 주문서 (1 each on success); fragment guaranteed; gear = boss gear chance,
// gear chance is applied exactly as shown in the lobby (no BOSS_GEAR_RATE_SCALE);
// gear level uniform over the 10-level tiers 100..max; weapon slot at half weight.
// 2026-11-04 도현: 성채 보상 — 파편 10 유지(3→10 복구, 직업 파편 레시피 수요), 블랙 큐브 확률 1/3, 잠재 잠금석 1/6 (원래의 1/3에서 다시 절반) (주문서·장비는 그대로).
// 2026-11-05 도현: 블랙 큐브 확률 다시 반토막 + 전 보스 1개.
export const CITADEL_BOSS_REWARDS=[
 {lock:.0167,scroll:.1,highCube:.0333,highCubeCount:1,fragment:10,gear:.04,max:110},
 {lock:.025,scroll:.15,highCube:.0417,highCubeCount:1,fragment:10,gear:.05,max:130},
 {lock:.0333,scroll:.2,highCube:.05,highCubeCount:1,fragment:10,gear:.05,max:140},
 {lock:.0417,scroll:.25,highCube:.0583,highCubeCount:1,fragment:10,gear:.05,max:160},
 {lock:.05,scroll:.3,highCube:.0667,highCubeCount:1,fragment:10,gear:.05,max:170},
 {lock:.0583,scroll:.35,highCube:.075,highCubeCount:1,fragment:10,gear:.05,max:190},
];
// 2026-11-05 도현: 보스별 입장 보상 — 보스 장비·파편 위주(파편은 처음 값의 절반), 뒤 보스일수록 크게 증가. 입장 제한 없음. 보스 장비 레벨은 min~max 10단위 균등 (최대 190제).
export const CITADEL_SOLO_REWARDS=[
 {lock:0,scroll:.05,highCube:.02,highCubeCount:1,fragment:10,gear:.10,min:100,max:150},
 {lock:.01,scroll:.10,highCube:.04,highCubeCount:1,fragment:20,gear:.15,min:130,max:170},
 {lock:.02,scroll:.18,highCube:.07,highCubeCount:1,fragment:35,gear:.22,min:150,max:180},
 {lock:.035,scroll:.28,highCube:.10,highCubeCount:1,fragment:55,gear:.30,min:160,max:190},
 {lock:.05,scroll:.40,highCube:.15,highCubeCount:1,fragment:80,gear:.40,min:170,max:190},
 {lock:.08,scroll:.55,highCube:.22,highCubeCount:2,fragment:125,gear:.55,min:180,max:190},
];
export const citadelGearLevel=(max,random,min=100)=>min+10*Math.floor(random()*((max-min)/10+1));
export function citadelPendingChests(state,room,userId){
 const member=room?.members?.find(m=>m.id===userId&&!m.left);if(!member)return [];
 const claims=state?.citadelClaims?.room===room.id?state.citadelClaims.bosses||[]:[];
 return [...new Set(member.citadelChests||[])].filter(b=>Number.isInteger(b)&&b>=1&&b<=6&&!claims.includes(b)).sort((a,b)=>a-b);
}
export function grantCitadelChests(input,room,userId,ctx){
 if(!isCitadel(room))throw Error('COOP_CHEST_NOT_READY');
 const bosses=citadelPendingChests(input,room,userId);if(!bosses.length)throw Error('COOP_CHEST_NOT_READY');
 const state=structuredClone(input);state.materials??={};state.items??=[];state.collection??=[];
 const reward={type:'citadelChest',bosses,potentialLock:0,scroll:0,highCube:0,fragment:0,items:[]};
 for(const boss of bosses){
  const r=(room.citadelBoss?CITADEL_SOLO_REWARDS:CITADEL_BOSS_REWARDS)[boss-1];
  if(r.lock>0&&ctx.random()<r.lock)reward.potentialLock++;
  if(ctx.random()<r.scroll)reward.scroll++;
  // 2026-11-03 도현: 성채 보스 상자 블랙 큐브(보스별 20~45% · 1~3개, 6보스 다 깨면 최대 12개).
  if(ctx.random()<r.highCube)reward.highCube+=r.highCubeCount;
  reward.fragment+=Math.round(r.fragment*professionFragmentBoost(state));
  if(ctx.random()<r.gear){
   const level=r.levels?r.levels[Math.floor(ctx.random()*r.levels.length)]:citadelGearLevel(r.max,ctx.random,r.min??100),classId=CLASSES[Math.floor(ctx.random()*CLASSES.length)].id,slot=halfWeaponSlot(ctx.random),design=selectDesign(level,classId,slot,true,ctx.random);
   const item={...makeItem(level,classId,slot,true,ctx,design.weaponVariant),...design};item.baseStats=rollBaseStats(item,ctx.random);
   if(state.items.length>=1000)reward.stored=(reward.stored||0)+1;addItem(state,item);reward.items.push(item);
  }
 }
 for(const key of ['potentialLock','scroll','highCube','fragment'])state.materials[key]=(state.materials[key]||0)+reward[key];
 const prior=state.citadelClaims?.room===room.id?state.citadelClaims.bosses||[]:[];
 state.citadelClaims={room:room.id,bosses:[...prior,...bosses].sort((a,b)=>a-b)};
 state.citadelEver=[...new Set([...(state.citadelEver||[]),...bosses])].sort((a,b)=>a-b);
 // 2026-11-05 도현: 보스별 입장은 링탐처럼 오름차순 해금 — 처치한 보스 기록(다음 보스 입장 조건).
 if(room.citadelBoss)state.citadelBossClear=[...new Set([...(state.citadelBossClear||[]),...bosses])].sort((a,b)=>a-b);state.citadelMaxFloor=Math.max(state.citadelMaxFloor||0,room.floor||0);
 state.lastReward=reward;
 return {state,reward};
}
