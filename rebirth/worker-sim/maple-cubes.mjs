import {UNIVERSAL_POOLS} from './universal-cube-pools.mjs?v=adv300-20261027';
const rule=(name,table,maxGrade,up,same,extra={})=>({name,table,maxGrade,up:[0,0,...up,0],same,pity:[],choose:false,gold:0,...extra});
export const CUBES={
 cube:rule('레드 큐브','red',4,[.060000002444,.018,0],[1,1,1],{pity:[0,0,25,83,0]}),
 highCube:rule('블랙 큐브','black',5,[1,.07,.028],[1,1,1],{choose:true,pity:[0,0,0,42,107]}),
 primeCube:rule('프라임 큐브','black',5,[1,.105,.042],[1,1,1],{prime:true,choose:true,pity:[0,0,0,42,107]}),
};
export const cubeLineRates=(kind,grade)=>Array.isArray(CUBES[kind].same)?CUBES[kind].same:CUBES[kind].same[grade];
export function cubeCost(){return 0;}
export function cubeTable(kind,item,grade=item.grade){
 const rule=CUBES[kind];if(!rule||grade<2||grade>rule.maxGrade)throw Error('INVALID_CUBE_GRADE');
 return {level:null,universal:true,rows:Array.from({length:3},(_,i)=>({current:UNIVERSAL_POOLS[grade],...(i?{lower:UNIVERSAL_POOLS[grade-1]}:{})}))};
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
 return {key:row.key,value:row.value,grade:current?grade:grade-1,...(row.key==='crit'?{critBalanceVersion:2}:{})};
}
const signature=lines=>JSON.stringify(lines.map(l=>[l.key,l.value,l.grade]));
export function rerollCube(kind,item,grade,random){
 const rule=CUBES[kind],length=item.lines.length;
 if(rule.prime&&(grade<3||length!==3))throw Error('PRIME_EPIC_REQUIRED');
 for(let attempt=0;attempt<256;attempt++){
  const lines=Array.from({length},(_,i)=>rollCubeLine(kind,item,grade,i,random));
  if(signature(lines)!==signature(item.lines))return lines;
 }
 // Abort the transaction rather than charge for an identical result under a broken RNG.
 throw Error('CUBE_RANDOM_RETRY');
}
export function cubeUpgrade(state,kind,grade,random){
 const rule=CUBES[kind];if(!rule||grade>rule.maxGrade||grade<2)throw Error('INVALID_CUBE_GRADE');
 if(rule.choose&&grade<3)return 3;
 if(grade===rule.maxGrade)return grade;
 state.cubePity??={};
 const key=kind+':'+grade,failures=state.cubePity[key]||0,limit=rule.pity[grade];
 const up=(limit&&failures>=limit)||random()<rule.up[grade];
 if(limit)state.cubePity[key]=up?0:failures+1;
 return grade+Number(!!up);
}


// 운영자 지정 큐브 보정: state.cubeBoost={remaining,chance,keys}. 남은 횟수 동안 각 줄이 chance 확률로 지정 옵션(현재 등급 수치)으로 바뀐다.
export function applyCubeBoost(boost,lines,grade,lock,random){
 if(!boost||!(boost.remaining>0))return lines;
 const keys=Array.isArray(boost.keys)?boost.keys:['boss','attack','crit'],pool=(UNIVERSAL_POOLS[grade]||[]).filter(x=>keys.includes(x.key));
 if(!pool.length)return lines;
 return lines.map((line,i)=>{if(i===lock||random()>=(Number(boost.chance)||0))return line;const row=pool[Math.floor(random()*pool.length)];return {key:row.key,value:row.value,grade,...(row.key==='crit'?{critBalanceVersion:2}:{})};});
}

// 운영자 지정 결과: state.cubeForce={kind,in,keys}. 해당 큐브를 in번째 쓸 때 keys 순서대로 그 등급 수치로 나온다.
export function applyCubeForce(state,kind,lines,grade){
 const f=state.cubeForce;if(!f||f.kind!==kind||!(f.in>0))return lines;
 f.in--;if(f.in>0)return lines;
 delete state.cubeForce;
 const pool=UNIVERSAL_POOLS[grade]||[];
 const forced=lines.map((line,i)=>{const row=pool.find(x=>x.key===f.keys?.[i]);return row?{key:row.key,value:row.value,grade,...(row.key==='crit'?{critBalanceVersion:2}:{})}:line;});
 return forced;
}
