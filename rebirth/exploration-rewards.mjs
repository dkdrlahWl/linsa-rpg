import {EXPLORATIONS} from './exploration-data.mjs';
import {EXPLORATION_REWARDS,explorationGearLevel} from './exploration-reward-data.mjs';
import {CLASSES,SLOTS,selectDesign,rollBaseStats} from './data.mjs';
import {makeItem,addItem} from './engine.mjs';
export function grantExplorationChest(input,room,ctx){
 const theme=EXPLORATIONS[room.tier],rates=EXPLORATION_REWARDS[room.tier];if(!theme||!rates||room.status!=='won'||room.cleared!==theme.floors)throw Error('COOP_CHEST_NOT_READY');
 const state=structuredClone(input),reward={type:'coop',mode:'exploration',tier:room.tier,name:theme.name,won:true,cleared:room.cleared,gold:rates.gold,cube:0,highCube:0,scroll:0,potentialLock:0,items:[],seconds:room.tick/10};
 state.gold+=reward.gold;state.materials??={};
 for(const key of ['scroll','highCube','potentialLock']){reward[key]=ctx.random()<rates[key]?1:0;state.materials[key]=(state.materials[key]||0)+reward[key];}
 if(ctx.random()<rates.bossGear){
  const level=explorationGearLevel(ctx.random),classId=CLASSES[Math.floor(ctx.random()*CLASSES.length)].id,slot=Math.floor(ctx.random()*SLOTS.length),design=selectDesign(level,classId,slot,true,ctx.random);
  const item={...makeItem(level,classId,slot,true,ctx,design.weaponVariant),...design};item.baseStats=rollBaseStats(item,ctx.random);
  state.items??=[];state.collection??=[];if(state.items.length>=300)reward.stored=1;addItem(state,item);reward.items.push(item);
 }
 state.exploration??={cleared:[],best:{}};if(!state.exploration.cleared.includes(room.tier))state.exploration.cleared.push(room.tier);state.exploration.best[room.tier]=Math.min(state.exploration.best[room.tier]||Infinity,room.tick/10);state.lastReward=reward;
 return {state,reward};
}
