// Shared policy for authenticated cooperative snapshots. No gameplay or reward rules.
export function coopInputWire(args){
 if(args?.wire!==2)return null;
 const known=Array.isArray(args.known)?args.known.slice(0,256).filter(r=>Array.isArray(r)&&r.length===2&&r.every(Number.isSafeInteger)&&r[0]>=0&&r[0]<=r[1]):[];
 return {wire:2,cache:typeof args.cache==='string'?args.cache.slice(0,64):'',known};
}
export function deferCoopWrite(room,now,queueInput,userId){
 // Inputs were already durably queued by frame_snapshot. Only coalesce shared
 // dungeon writes; entry readiness, death settlement, rewards and boss rooms
 // keep their existing immediate path. Local simulation still advances at 10 Hz.
 if(!queueInput||!room||!['exploration','citadel'].includes(room.mode)||room.status!=='fighting'||room.entryWaiting||room.pendingOutcome||!Number.isFinite(room.started)||!Number.isFinite(room.tick))return false;
 const lag=Math.floor((Number(now)-room.started)/100)-room.tick;
 if(!userId)return lag<3; // 사용자 구분 없는 호출은 예전 규칙 그대로
 if(lag<2)return true;
 // 2026-11-04 링탐 연결 지연: 4명이 동시에 같은 방을 저장하면 SAVE_CONFLICT가 연쇄로 나서 요청이 2~8초씩 밀렸다.
 // 2틱 이상 밀리면 이번 차례인 한 명만 저장하고(차례는 3틱마다 돌아감), 6틱 이상 밀리면(차례인 사람이 끊긴 경우) 누구나 저장한다.
 if(lag>=6)return false;
 const active=(Array.isArray(room.members)?room.members:[]).filter(m=>m&&!m.left).map(m=>m.id);
 if(active.length<2||!active.includes(userId))return false;
 return active[Math.floor(room.tick/3)%active.length]!==userId;
}
