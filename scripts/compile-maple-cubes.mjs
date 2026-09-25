import fs from 'node:fs';
const path=new URL('../rebirth/maple-cube-tables.json',import.meta.url);
const raw=JSON.parse(fs.readFileSync(path));
const rates={red:[null,[1,.1,.01],[1,.1,.01],[1,.1,.01],[1,.1,.01]],black:[null,[1,.2,.05],[1,.2,.05],[1,.2,.05],[1,.2,.05]],strange:[null,[1,.000999,.000999],[1,.009901,.009901]],master:[null,[1,.166667,.166667],[1,.047619,.047619],[1,.011858,.011858]],artisan:[null,[1,.166667,.166667],[1,.079994,.079994],[1,.016959,.016959],[1,.001996,.001996]]};
function supported(text){
 const m=text.match(/^(STR|DEX|INT|LUK|공격력|최대 HP|방어력|크리티컬 확률|보스 몬스터 데미지|메소 획득량|획득 경험치) \+(\d+(?:\.\d+)?)(%)?$/);
 if(!m)return null;
 let key={공격력:'attack','최대 HP':'hp',방어력:'defense','크리티컬 확률':'crit','보스 몬스터 데미지':'boss','메소 획득량':'goldGain','획득 경험치':'xpGain'}[m[1]]||m[1];
 if(!m[3])key={hp:'flatHP',attack:'flatAttack',defense:'flatDefense'}[key]||'flat'+key;
 return {key,value:Number(m[2])};
}
const compiled={retrieved:raw.retrieved,source:raw.endpoint,parts:[1,6,7,9,11,10,18,17,19],lookup:{},pools:{}};
const poolIndex=new Map();
for(const [lookup,hash]of Object.entries(raw.lookup)){
 const [type,rank,part,level]=lookup.split(':');if(!rates[type]||hash==='unavailable')continue;
 const tables=raw.tables[hash],grade=Number(rank)+1;
 const result=tables.map((rows,line)=>{
 let split=0;
 if(line){let sum=0,best=Infinity;for(let i=0;i<=rows.length;i++){const error=Math.abs(sum-(1-rates[type][rank][line])*100);if(error<best){best=error;split=i;}if(i<rows.length)sum+=rows[i].weight;}if(best>.02)throw Error('Cannot split '+lookup+' '+line+' '+best);}
 const map=group=>{const entries=group.flatMap(row=>{const s=supported(row.text);return s?[{...s,weight:row.weight}]:[]});const sum=entries.reduce((n,r)=>n+r.weight,0);if(!sum)throw Error('Empty supported pool '+lookup);return entries.map(r=>({...r,weight:r.weight/sum}));};
 return line?{lower:map(rows.slice(0,split)),current:map(rows.slice(split))}:{current:map(rows)};
 });
 const serial=JSON.stringify(result);let index=poolIndex.get(serial)??-1;
 if(index<0){index=Object.keys(compiled.pools).length;compiled.pools[index]=result;poolIndex.set(serial,index);}
 compiled.lookup[lookup]=index;
}
fs.writeFileSync(new URL('../rebirth/maple-cube-pools.mjs',import.meta.url),'// Generated from Nexon published option probabilities. Unsupported game effects removed; each rank is renormalized.\nexport default '+JSON.stringify(compiled)+';\n');
console.log('Compiled',Object.keys(compiled.lookup).length,'tables into',Object.keys(compiled.pools).length,'pools');

