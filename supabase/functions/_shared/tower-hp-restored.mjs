// Tower HP migration preserves the remaining health fraction of active fights.
import {execute as executeBase,initialState,balance} from './economy.mjs';
export {initialState,balance};
const VERSION='TOWER_GAPS_25';
const ORIGINAL_HP=[7500,12000,18000,27000,37500,51000,67500,87000,105000,127500,157500,187500,217500,247500,285000,322500,360000,405000,450000,495000,540000,585000,630000,690000,750000,780000,810000,840000,870000,900000];
// ABYSS_FINAL_HP_680K: only the final World 1 boss changes; rewards are untouched.
const ABYSS_FINAL_HP=680000;
const abyssFinal=balance.bossRegions[5]?.bosses[5];
if(abyssFinal?.name!=='공허의 지배자')throw Error('INVALID_ABYSS_FINAL_BOSS');
abyssFinal.hp=ABYSS_FINAL_HP;
// W2_FINAL_HP_V1: approved final-boss HP only. Other bosses and rewards stay unchanged.
const WORLD2_FINAL_HP=[
 {region:6,id:'w2-boss-06',previous:665000,hp:925000},
 {region:7,id:'w2-boss-12',previous:870000,hp:2305000},
 {region:8,id:'w2-boss-18',previous:1280000,hp:2922000},
 {region:9,id:'w2-boss-24',previous:1700000,hp:5770000},
 {region:10,id:'w2-boss-30',previous:2100000,hp:8680000}
];
for(const change of WORLD2_FINAL_HP){
 const boss=balance.bossRegions[change.region]?.bosses[5];
 if(boss?.id!==change.id)throw Error('INVALID_WORLD2_FINAL_BOSS');
 boss.hp=change.hp;
}
export function execute(snapshot,command,args,context){
 let input=snapshot;
 const battle=snapshot.serverBattle;
 if(battle?.type==='tower'&&battle.hpVersion!==VERSION){
  const floor=balance.towerFloors[battle.stage-1];
  const previous=ORIGINAL_HP[battle.stage-1]/(battle.hpVersion==='TH3'?3:1);
  if(!floor||!previous||!Number.isSafeInteger(battle.hp)||battle.hp<0)throw Error('INVALID_STATE');
  input={...snapshot,serverBattle:{...battle,hp:Math.min(floor.hp,Math.round(battle.hp/previous*floor.hp)),hpVersion:VERSION}};
 }
 // Older saves without abyssBalanceVersion are migrated directly by executeBase.
 // Already-migrated 500k fights retain their remaining fraction exactly once.
 if(snapshot.abyssFinalHpVersion!==1&&snapshot.abyssBalanceVersion===1&&snapshot.regionIndex===5&&snapshot.bossIndex===5&&snapshot.serverCombat){
  const combat=snapshot.serverCombat;
  if(!Number.isSafeInteger(combat.hp)||combat.hp<0)throw Error('INVALID_STATE');
  input={...input,serverCombat:{...combat,hp:Math.min(ABYSS_FINAL_HP,Math.ceil(combat.hp*ABYSS_FINAL_HP/500000))}};
 }
 // Apply before online/offline settlement, once per save; keep time and progress.
 if(snapshot.world2FinalHpVersion!==1&&snapshot.bossIndex===5&&snapshot.serverCombat){
  const change=WORLD2_FINAL_HP.find(x=>x.region===snapshot.regionIndex);
  if(change){
   const combat=snapshot.serverCombat;
   if(!Number.isSafeInteger(combat.hp)||combat.hp<0)throw Error('INVALID_STATE');
   input={...input,serverCombat:{...combat,hp:Math.min(change.hp,Math.ceil(combat.hp*change.hp/change.previous))}};
  }
 }
 const result=executeBase(input,command,args,context);
 result.state.abyssFinalHpVersion=1;
 result.state.world2FinalHpVersion=1;
 if(result.state.serverBattle?.type==='tower')result.state.serverBattle.hpVersion=VERSION;
 return result;
}
