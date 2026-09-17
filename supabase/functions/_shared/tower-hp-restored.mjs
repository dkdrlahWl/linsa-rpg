// Tower HP migration preserves the remaining health fraction of active fights.
import {execute as executeBase,initialState,balance} from './economy.mjs';
export {initialState,balance};
const VERSION='TOWER_GAPS_25';
const ORIGINAL_HP=[7500,12000,18000,27000,37500,51000,67500,87000,105000,127500,157500,187500,217500,247500,285000,322500,360000,405000,450000,495000,540000,585000,630000,690000,750000,780000,810000,840000,870000,900000];
export function execute(snapshot,command,args,context){
 let input=snapshot;
 const battle=snapshot.serverBattle;
 if(battle?.type==='tower'&&battle.hpVersion!==VERSION){
  const floor=balance.towerFloors[battle.stage-1];
  const previous=ORIGINAL_HP[battle.stage-1]/(battle.hpVersion==='TH3'?3:1);
  if(!floor||!previous||!Number.isSafeInteger(battle.hp)||battle.hp<0)throw Error('INVALID_STATE');
  input={...snapshot,serverBattle:{...battle,hp:Math.min(floor.hp,Math.round(battle.hp/previous*floor.hp)),hpVersion:VERSION}};
 }
 const result=executeBase(input,command,args,context);
 if(result.state.serverBattle?.type==='tower')result.state.serverBattle.hpVersion=VERSION;
 return result;
}
