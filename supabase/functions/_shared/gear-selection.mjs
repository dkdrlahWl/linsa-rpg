// Conditional selection within an already selected rarity and equipment slot.
// Equal attack values receive equal weight. Rare and below remain uniform.
export function gearWeights(candidates,rarity){
 const attacks=[...new Set(candidates.map(it=>it.baseAtk))].sort((a,b)=>a-b);
 return candidates.map(it=>rarity>=3?attacks.length-attacks.indexOf(it.baseAtk):1);
}
export function selectGear(candidates,rarity,roll){
 if(!candidates.length)return undefined;
 const weights=gearWeights(candidates,rarity),total=weights.reduce((a,b)=>a+b,0);
 let remaining=roll*total;
 for(let i=0;i<candidates.length;i++){remaining-=weights[i];if(remaining<0)return candidates[i];}
 return candidates[candidates.length-1];
}
