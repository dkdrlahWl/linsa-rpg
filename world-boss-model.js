/* WB1 pure rules: no DOM, network, economy writes, or random combat damage. */
((root,factory)=>{const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RinguWorldBossModel=api;})(typeof window==='object'?window:globalThis,()=>{
 'use strict';
 const MOVE_MS=180,LIMIT_MS=420000;
 const patterns=[['낙화',360,'쉬움'],['모서리 폭발',400,'쉬움'],['일직선 강타',400,'쉬움'],['추적 낙인',560,'보통'],['십자 균열',600,'보통'],['교차 폭발',500,'보통'],['휩쓰는 불길',600,'보통'],['조여오는 벽',640,'보통'],['연속 유성',840,'어려움'],['삼중 추적',960,'어려움'],['멸망의 포효',1300,'어려움']];
 const directions={w:[0,-1],a:[-1,0],s:[0,1],d:[1,0]};
 const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
 function destination(x,y,key){const d=directions[key];if(!d)return null;const nx=x+d[0],ny=y+d[1];return nx<0||nx>7||ny<0||ny>7?null:{x:nx,y:ny};}
 function positionAt(origin,moves,time){let p={x:origin.x,y:origin.y};for(const m of moves){if(m.at+MOVE_MS<=time)p={x:m.x,y:m.y};}return p;}
 function interpolate(origin,moves,time){let p={x:origin.x,y:origin.y};for(const m of moves){if(time<m.at)break;const t=clamp((time-m.at)/MOVE_MS,0,1);if(t<1)return{x:p.x+(m.x-p.x)*t,y:p.y+(m.y-p.y)*t};p={x:m.x,y:m.y};}return p;}
 function hitDamage(wave,position,seenAt){return seenAt>wave.hitAt-100?0:wave.tiles.includes(position.x+position.y*8)?wave.damage:0;}
 function safeTiles(wave){const blocked=new Set(wave.tiles);return Array.from({length:64},(_,i)=>i).filter(i=>!blocked.has(i));}
 function contribution(member,room){const total=room.members.reduce((n,m)=>n+Number(m.damage),0);return total?Number(member?.damage||0)/total*100:0;}
 function reviveProgress(target,members,time){if(target.hp>0||target.revived||!target.present)return 0;let progress=0;
  for(const h of members)if(h.id!==target.id&&h.hp>0&&h.present&&!h.background&&time-h.seenAt<2000&&h.x===target.x&&h.y===target.y)progress=Math.max(progress,clamp((time-Math.max(h.stillAt,target.deadAt))/3000,0,1));return progress;}
 return{MOVE_MS,LIMIT_MS,patterns,directions,clamp,destination,positionAt,interpolate,hitDamage,safeTiles,contribution,reviveProgress};
});
