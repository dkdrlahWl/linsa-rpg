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
 // 2026-11-09 도현(7인 성채 연결 지연): 차례제는 차례인 사람이 그 순간 폴링하지 않으면 6틱 뒤 전원이 동시에 저장해 충돌이 다시 났다.
 // 이제 방마다 저장자는 한 명뿐: 마지막으로 저장한 사람이 임대(writerUntil)를 갖고, 임대가 살아 있는 동안 다른 사람은 저장하지 않는다
 // (입력은 frame_snapshot이 이미 큐에 넣었으므로 잃지 않는다). 저장자가 나가거나 임대가 끝나면 다음 폴링한 사람이 저장자가 된다.
 const writer=typeof room.writer==='string'?room.writer:null,until=Number(room.writerUntil)||0;
 if(writer&&writer!==userId&&until>Number(now)&&(Array.isArray(room.members)?room.members:[]).some(m=>m&&m.id===writer&&!m.left))return true;
 return false;
}
export const COOP_WRITER_LEASE_MS=1500;
// Stamp the writer lease on a world about to be saved (shared dungeons only).
export function stampCoopWriter(world,userId,now){
 if(!world||!['exploration','citadel'].includes(world.mode)||world.status!=='fighting')return world;
 world.writer=userId;world.writerUntil=Number(now)+COOP_WRITER_LEASE_MS;return world;
}
