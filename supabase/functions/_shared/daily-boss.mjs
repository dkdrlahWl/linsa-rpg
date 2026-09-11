import {stats} from './economy.mjs';
export const HP=10_000_000_000;
export const DURATION=10_000;
export const PROBABILITIES=[
 [8,10,14,19,22,27],[9,11,14,19,21,26],
 [11,12,15,18,20,24],[12,13,15,18,19,23],
 [14,14,15,17,19,21],[15,15,15,17,18,20],
 [17,16,16,16,17,18],[18,17,16,16,16,17]
];
// Integer rejection sampling avoids modulo bias for both 1/1000 and 1/100.
export function randomInt(limit,draw=()=>crypto.getRandomValues(new Uint32Array(1))[0]){
 if(!Number.isInteger(limit)||limit<1||limit>4294967296)throw Error('INVALID_RANDOM');
 const ceiling=Math.floor(4294967296/limit)*limit;let n;
 do {n=draw();if(!Number.isInteger(n)||n<0||n>=4294967296)throw Error('INVALID_RANDOM');}while(n>=ceiling);
 return n%limit;
}
export function planBattle(state,costumePercent,random){
 const power=stats(state,costumePercent),hits=[];
 for(let tick=1;tick<=10;tick++){
  const crit=random()*100<power.critChance;
  const damage=Math.max(1,Math.floor(power.attack*(crit?1+power.critDamage/100:1)));
  if(!Number.isSafeInteger(damage)||!Number.isSafeInteger(hits.reduce((n,h)=>n+h.damage,0)+damage))throw Error('INVALID_STATE');
  hits.push({at:tick*1000,damage,crit});
 }
 return hits;
}
