// All levels, jobs, equipment parts and cube colours share each option-grade pool.
// One equal draw per ability type; alternate values split that ability's probability.
const stats=(prefix,value)=>Object.fromEntries(['STR','DEX','INT','LUK'].map(k=>[prefix+k,value]));
const pool=options=>Object.entries(options).flatMap(([key,values])=>{
 const a=Array.isArray(values)?values:[values];
 return a.map(value=>({key,value,weight:1/Object.keys(options).length/a.length}));
});
export const UNIVERSAL_POOLS={
 1:pool({...stats('flat',6),flatHP:60,flatAttack:6,flatDefense:60}),
 2:pool({...stats('flat',12),flatHP:120,flatAttack:12,flatDefense:120,...stats('',3),attack:3,hp:3,defense:3,crit:4}),
 3:pool({...stats('',6),attack:6,hp:6,defense:6,crit:8}),
 4:pool({...stats('',9),attack:9,hp:9,crit:9,boss:30,...stats('flat',32)}),
 5:pool({...stats('',12),attack:12,hp:12,crit:12,flatAttack:32,boss:[35,40],goldGain:20}),
};
