// Conditional selection within an already selected rarity and equipment slot.
// Epic retains original slot ranks; legendary and mythic share series ranks.
// Rank I has weight 1 and X has weight 10. Other rarities retain their rules.
import './gear-sets.js';
export function gearWeights(candidates,rarity){
 const attacks=[...new Set(candidates.map(it=>it.baseAtk))].sort((a,b)=>a-b);
 return candidates.map(it=>globalThis.RinguGearSets.rank(it)?.rank ?? (rarity>=3?attacks.length-attacks.indexOf(it.baseAtk):1));
}
export function selectGear(candidates,rarity,roll){
 if(!candidates.length)return undefined;
 const weights=gearWeights(candidates,rarity),total=weights.reduce((a,b)=>a+b,0);
 let remaining=roll*total;
 for(let i=0;i<candidates.length;i++){remaining-=weights[i];if(remaining<0)return candidates[i];}
 return candidates[candidates.length-1];
}
