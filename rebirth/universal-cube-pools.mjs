// All levels, jobs, equipment parts and cube colours share each option-grade pool.
// Alternate values split their ability's probability. Epic+ attack% and boss%
// each retain 60% of their former probability; other abilities share the remainder.
const stats=(prefix,value)=>Object.fromEntries(['STR','DEX','INT','LUK'].map(k=>[prefix+k,value]));
const pool=(options,reduceDamage=false)=>{
 const entries=Object.entries(options),reduced=reduceDamage?entries.filter(([key])=>key==='attack'||key==='boss').length:0;
 const otherShare=(1-.6*reduced/entries.length)/(entries.length-reduced);
 return entries.flatMap(([key,values])=>{
  const a=Array.isArray(values)?values:[values],restricted=reduceDamage&&(key==='attack'||key==='boss');
  const chance=restricted?0.6/entries.length:otherShare;
  return a.map(value=>({key,value,weight:chance/a.length}));
 });
};
export const UNIVERSAL_POOLS={
 1:pool({...stats('flat',6),flatHP:60,flatAttack:6,flatDefense:60}),
 2:pool({...stats('flat',12),flatHP:120,flatAttack:12,flatDefense:120,...stats('',3),attack:3,hp:3,defense:3,crit:4}),
 3:pool({...stats('',6),attack:6,hp:6,defense:6,crit:8},true),
 4:pool({...stats('',9),attack:9,hp:9,crit:9,boss:30,...stats('flat',32)},true),
 5:pool({...stats('',12),attack:12,hp:12,crit:12,flatAttack:32,boss:[35,40],goldGain:20},true),
};
