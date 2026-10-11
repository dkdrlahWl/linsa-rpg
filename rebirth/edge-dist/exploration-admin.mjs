import {isCitadel,CITADEL_CONTENT} from './citadel-zero.mjs';
import {EXPLORATIONS,explorationFloor} from './exploration-data.mjs';
export function adminExplorationFloor(room,user,floor,admin){
 if(admin!==true)throw Error('BETA_DISABLED');
 if(!(isCitadel(room)||room?.mode==='exploration')||room.status!=='fighting'||room.entryWaiting||!room.members.some(m=>m.id===user&&!m.left))throw Error('COOP_NOT_READY');
 if(!Number.isInteger(floor)||floor<1||floor>(isCitadel(room)?CITADEL_CONTENT:EXPLORATIONS[room.tier]).floors)throw Error('INVALID_EXPLORATION_FLOOR');
 const world=structuredClone(room);world.floor=floor;delete world._net;delete world._queuedInputs;delete world.chest;
 world.members.find(m=>m.id===user).hp=world.members.find(m=>m.id===user).power.hp;
 explorationFloor(world);return world;
}
