// TH3: one-third tower HP only; the existing engine retains all authority and rewards.
import {execute as executeBase,initialState,balance} from './economy.mjs';
export {initialState,balance};
const VERSION='TH3';
// ES modules evaluate once per isolate. Do not reapply this in execute().
for(const floor of balance.towerFloors)floor.hp=Math.max(1,Math.floor(floor.hp/3));
export function execute(snapshot,command,args,context){
 let input=snapshot;
 const battle=snapshot.serverBattle;
 if(battle?.type==='tower'&&battle.hpVersion!==VERSION){
  const floor=balance.towerFloors[battle.stage-1];
  if(!floor||!Number.isSafeInteger(battle.hp)||battle.hp<0)throw Error('INVALID_STATE');
  // Preserve remaining-HP fraction and timer. No record or reward is reset.
  input={...snapshot,serverBattle:{...battle,hp:Math.min(floor.hp,Math.max(1,Math.floor(battle.hp/3))),hpVersion:VERSION}};
 }
 const result=executeBase(input,command,args,context);
 if(result.state.serverBattle?.type==='tower')result.state.serverBattle.hpVersion=VERSION;
 return result;
}
