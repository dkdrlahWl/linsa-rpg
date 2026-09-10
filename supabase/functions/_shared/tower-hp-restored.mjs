// S3: restore original tower HP. Stone dungeon HP is authoritative in ringu_party.
import {execute as executeBase,initialState,balance} from './economy.mjs';
export {initialState,balance};
const VERSION='ORIGINAL_S3';
// Never mutate balance.towerFloors: the original balance.json is the source of truth.
export function execute(snapshot,command,args,context){
 let input=snapshot;
 const battle=snapshot.serverBattle;
 if(battle?.type==='tower'&&battle.hpVersion==='TH3'){
  const floor=balance.towerFloors[battle.stage-1];
  if(!floor||!Number.isSafeInteger(battle.hp)||battle.hp<0)throw Error('INVALID_STATE');
  // Restore the fraction left in an ongoing TH3 fight, once; keep its clock and progress.
  input={...snapshot,serverBattle:{...battle,hp:Math.min(floor.hp,battle.hp*3),hpVersion:VERSION}};
 }
 const result=executeBase(input,command,args,context);
 if(result.state.serverBattle?.type==='tower')result.state.serverBattle.hpVersion=VERSION;
 return result;
}
