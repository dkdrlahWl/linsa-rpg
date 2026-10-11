// Compact replies apply only to the exact snapshot held by the client.
// Receipts, revision conflicts and older clients retain full authoritative state.
export function fishingStateReply(before,after,result,baseRevision,compact){
 if(compact!==true||!Number.isSafeInteger(baseRevision)||baseRevision!==before.revision||after.revision!==before.revision+1||!before.state||!after.state)return {state:after.state,revision:after.revision,result};
 const changes={},remove=[];
 for(const [key,value] of Object.entries(after.state))if(JSON.stringify(value)!==JSON.stringify(before.state[key]))changes[key]=value;
 for(const key of Object.keys(before.state))if(!Object.hasOwn(after.state,key))remove.push(key);
 return {statePatch:{baseRevision,changes,remove},revision:after.revision,result};
}
export function applyFishingPatch(state,revision,patch){
 if(!state||revision!==patch?.baseRevision||!patch.changes||!Array.isArray(patch.remove))throw Error('STATE_PATCH_MISMATCH');
 const next={...state,...patch.changes};for(const key of patch.remove)delete next[key];return next;
}
