import {EXPLORATIONS} from './exploration-data.mjs';
export function grantExplorationChest(input,room,ctx){
 const theme=EXPLORATIONS[room.tier];if(!theme||room.status!=='won'||room.cleared!==theme.floors)throw Error('COOP_CHEST_NOT_READY');
 const state=structuredClone(input),reward={type:'coop',mode:'exploration',tier:room.tier,name:theme.name,won:true,cleared:room.cleared,gold:theme.gold,cube:theme.cube,highCube:theme.highCube,items:[],seconds:room.tick/10};
 state.gold+=reward.gold;state.materials??={};for(const k of ['cube','highCube'])state.materials[k]=(state.materials[k]||0)+reward[k];
 state.exploration??={cleared:[],best:{}};if(!state.exploration.cleared.includes(room.tier))state.exploration.cleared.push(room.tier);state.exploration.best[room.tier]=Math.min(state.exploration.best[room.tier]||Infinity,room.tick/10);state.lastReward=reward;
 return {state,reward};
}
