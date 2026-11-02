// Shared policy for authenticated cooperative snapshots. No gameplay or reward rules.
export function coopInputWire(args){
 if(args?.wire!==2)return null;
 const known=Array.isArray(args.known)?args.known.slice(0,256).filter(r=>Array.isArray(r)&&r.length===2&&r.every(Number.isSafeInteger)&&r[0]>=0&&r[0]<=r[1]):[];
 return {wire:2,cache:typeof args.cache==='string'?args.cache.slice(0,64):'',known};
}
export function deferCoopWrite(room,now,queueInput){
 // Inputs were already durably queued by frame_snapshot. Only coalesce shared
 // dungeon writes; entry readiness, death settlement, rewards and boss rooms
 // keep their existing immediate path. Local simulation still advances at 10 Hz.
 if(!queueInput||!room||!['exploration','citadel'].includes(room.mode)||room.status!=='fighting'||room.entryWaiting||room.pendingOutcome||!Number.isFinite(room.started)||!Number.isFinite(room.tick))return false;
 return Math.floor((Number(now)-room.started)/100)-room.tick<3;
}
