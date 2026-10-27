import {isCitadel} from './citadel-zero.mjs';
import {EXPLORATIONS} from './exploration-data.mjs';
import {EXPLORATION_REWARDS,EXPLORATION_REWARD_KEYS,explorationRewardCount,explorationGearLevelFor} from './exploration-reward-data.mjs?v=gear200-20261025';
import {CLASSES,selectDesign,rollBaseStats} from './data.mjs';
import {makeItem,addItem,halfWeaponSlot} from './engine.mjs';
export const EXPLORATION_COMPANION_TICKET_CHANCE=.25;
export function grantExplorationChest(input,room,ctx){
 if(isCitadel(room))throw Error('CITADEL_REWARDS_DISABLED');
 const theme=EXPLORATIONS[room.tier],rates=EXPLORATION_REWARDS[room.tier];if(!theme||!rates||room.status!=='won'||room.cleared!==theme.floors)throw Error('COOP_CHEST_NOT_READY');
 const state=structuredClone(input),reward={type:'coop',mode:'exploration',tier:room.tier,name:theme.name,won:true,cleared:room.cleared,gold:rates.gold,cube:0,highCube:0,scroll:0,potentialLock:0,items:[],seconds:room.tick/10};
 state.gold+=reward.gold;state.materials??={};
 for(const key of EXPLORATION_REWARD_KEYS){if(!rates[key])continue;reward[key]=ctx.random()<rates[key]?explorationRewardCount(rates,key):0;state.materials[key]=(state.materials[key]||0)+reward[key];}
 // Admin one-shot override (set in DB): next clear drops this exact boss item instead of the random roll.
 // slot is the SLOTS index (0 = weapon); 'weapon' is accepted as an alias.
 const forced=state.adminNextExplorationGear;delete state.adminNextExplorationGear;
 if(forced||ctx.random()<rates.bossGear){
  const level=forced?.level??explorationGearLevelFor(rates,ctx.random),classId=forced?.classId??CLASSES[Math.floor(ctx.random()*CLASSES.length)].id,slot=forced?Number(forced.slot==='weapon'?0:forced.slot)||0:halfWeaponSlot(ctx.random),design=selectDesign(level,classId,slot,true,ctx.random);
  const item={...makeItem(level,classId,slot,true,ctx,design.weaponVariant),...design};item.baseStats=rollBaseStats(item,ctx.random);
  state.items??=[];state.collection??=[];if(state.items.length>=300)reward.stored=1;addItem(state,item);reward.items.push(item);
 }
 // 동료 소환권(기존 보상 판정 순서를 바꾸지 않도록 마지막에 굴림): 모든 테마 동일하게 클리어당 25% (열쇠가 횟수를 제한한다).
 if(ctx.random()<EXPLORATION_COMPANION_TICKET_CHANCE){state.companions=state.companions&&typeof state.companions==='object'?state.companions:{};state.companions.tickets=(Number.isInteger(state.companions.tickets)&&state.companions.tickets>=0?state.companions.tickets:0)+1;reward.companionTicket=1;}
 state.exploration??={cleared:[],best:{}};if(!state.exploration.cleared.includes(room.tier))state.exploration.cleared.push(room.tier);state.exploration.best[room.tier]=Math.min(state.exploration.best[room.tier]||Infinity,room.tick/10);state.lastReward=reward;
 return {state,reward};
}
