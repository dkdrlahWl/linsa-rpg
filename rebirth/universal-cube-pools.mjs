// All levels, jobs, equipment parts and cube colours share each option-grade pool.
// Alternate values split their ability's probability. Epic+ attack% and boss%
// each retain 60% of their former probability. Epic+ critical options retain
// half their previous probability; redistribute only to other non-damage options.
const stats=(prefix,value)=>Object.fromEntries(['STR','DEX','INT','LUK'].map(k=>[prefix+k,value]));
const pool=(options,reduceDamage=false)=>{
 const entries=Object.entries(options),reduced=reduceDamage?entries.filter(([key])=>key==='attack'||key==='boss').length:0;
 const otherShare=(1-.6*reduced/entries.length)/(entries.length-reduced);
 const criticalKeys=new Set(['crit','critDamage']);
 const criticalCount=reduceDamage?entries.filter(([key])=>criticalKeys.has(key)).length:0;
 const redistributed=otherShare*.5*criticalCount/Math.max(1,entries.length-reduced-criticalCount);
 return entries.flatMap(([key,values])=>{
  const a=Array.isArray(values)?values:[values],restricted=reduceDamage&&(key==='attack'||key==='boss');
  const chance=restricted?0.6/entries.length:reduceDamage&&criticalKeys.has(key)?otherShare*.5:otherShare+redistributed;
  return a.map(value=>({key,value,weight:chance/a.length}));
 });
};
export const UNIVERSAL_POOLS={
 1:pool({...stats('flat',6),flatHP:60,flatAttack:6,flatDefense:20}),
 2:pool({...stats('flat',12),flatHP:120,flatAttack:12,flatDefense:40,...stats('',3),attack:3,hp:3,defense:3,crit:2}),
 3:pool({...stats('',6),attack:6,hp:6,defense:6,crit:4},true),
 4:pool({...stats('',9),attack:9,hp:9,crit:4.5,boss:30,...stats('flat',32)},true),
 5:pool({...stats('',12),attack:12,hp:12,crit:6,flatAttack:32,boss:[35,40],goldGain:20},true),
};
