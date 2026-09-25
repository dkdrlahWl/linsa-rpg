import TABLES from './maple-cube-pools.mjs?v=shops-1';
const rule=(name,table,maxGrade,up,same,extra={})=>({name,table,maxGrade,up:[0,0,...up,0],same,pity:[],choose:false,gold:0,...extra});
export const CUBES={
 cube:rule('레드 큐브','red',5,[.060000002444,.018,.003],[1,.1,.01],{pity:[0,0,25,83,500]}),
 highCube:rule('블랙 큐브','black',5,[.150000001275,.035,.014],[1,.2,.05],{choose:true,pity:[0,0,10,42,107]}),
 primeCube:rule('프라임 큐브','black',5,[0,0,0],[1,.2,.05],{prime:true}),
};
export const cubeLineRates=(kind,grade)=>Array.isArray(CUBES[kind].same)?CUBES[kind].same:CUBES[kind].same[grade];
export function cubeCost(){return 0;}
export function cubeTable(kind,item,grade=item.grade){
 const rule=CUBES[kind];if(!rule||grade<2||grade>rule.maxGrade)throw Error('INVALID_CUBE_GRADE');
 const prefix=[rule.table,grade-1,TABLES.parts[item.slot]].join(':')+':';
 let level=item.level,index=TABLES.lookup[prefix+level];
 if(index===undefined){
  // This game's original gear includes combinations absent from Maple. Explicit nearest-level mapping.
  const levels=Object.keys(TABLES.lookup).filter(k=>k.startsWith(prefix)).map(k=>Number(k.slice(prefix.length)));
  level=levels.sort((a,b)=>Math.abs(a-item.level)-Math.abs(b-item.level)||a-b)[0];
  index=TABLES.lookup[prefix+level];
 }
 if(index===undefined)throw Error('CUBE_TABLE_UNAVAILABLE');
 return {level,rows:TABLES.pools[index]};
}
function weighted(pool,random){
 let r=random()*pool.reduce((n,x)=>n+x.weight,0);
 for(const option of pool){r-=option.weight;if(r<0)return option;}
 return pool.at(-1);
}
export function rollCubeLine(kind,item,grade,index,random){
 const table=cubeTable(kind,item,grade),rate=cubeLineRates(kind,grade)[index];
 const current=index===0||random()<rate;
 const row=weighted(table.rows[index][current?'current':'lower'],random);
 return {key:row.key,value:row.value,grade:current?grade:grade-1};
}
const signature=lines=>JSON.stringify(lines.map(l=>[l.key,l.value]));
export function rerollCube(kind,item,grade,random){
 const rule=CUBES[kind],length=item.lines.length;
 if(rule.prime&&(grade!==5||length<2))throw Error('PRIME_LEGENDARY_REQUIRED');
 for(let attempt=0;attempt<256;attempt++){
  const lines=Array.from({length},(_,i)=>rule.prime&&i===0?structuredClone(item.lines[0]):rollCubeLine(kind,item,grade,i,random));
  if(signature(lines)!==signature(item.lines))return lines;
 }
 // Abort the transaction rather than charge for an identical result under a broken RNG.
 throw Error('CUBE_RANDOM_RETRY');
}
export function cubeUpgrade(state,kind,grade,random){
 const rule=CUBES[kind];if(!rule||grade>rule.maxGrade||grade<2)throw Error('INVALID_CUBE_GRADE');
 if(rule.prime&&grade!==5)throw Error('PRIME_LEGENDARY_REQUIRED');
 if(grade===rule.maxGrade)return grade;
 state.cubePity??={};
 const key=kind+':'+grade,failures=state.cubePity[key]||0,limit=rule.pity[grade];
 const up=(limit&&failures>=limit)||random()<rule.up[grade];
 if(limit)state.cubePity[key]=up?0:failures+1;
 return grade+Number(!!up);
}

