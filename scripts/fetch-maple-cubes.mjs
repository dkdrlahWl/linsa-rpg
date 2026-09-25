import fs from 'node:fs';
import crypto from 'node:crypto';
const root=new URL('../rebirth/',import.meta.url);
const types=['red','black','strange','master','artisan'];
const parts=[1,6,7,9,11,10,18,17,19];
const levels=[1,...Array.from({length:20},(_,i)=>(i+1)*10)];
const endpoint='https://maplestory.nexon.com/Guide/OtherProbability/cube/GetSearchProbList';
const clean=s=>s.replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').trim();
const out={retrieved:'2026-09-25',endpoint,types:{},tables:{},lookup:{}};
const path=new URL('maple-cube-tables.json',root);
if(fs.existsSync(path))Object.assign(out,JSON.parse(fs.readFileSync(path,'utf8')));
for(const type of types){
 const html=await (await fetch('https://maplestory.nexon.com/Guide/OtherProbability/cube/'+type)).text();
 const id=html.match(/var CubeItemID = "(\d+)"/)?.[1];
 if(!id){console.log('NO TYPE',type);continue;}
 out.types[type]={id,url:'https://maplestory.nexon.com/Guide/OtherProbability/cube/'+type};
 fs.mkdirSync(new URL('test-artifacts/cube-sources/',root),{recursive:true});
 fs.writeFileSync(new URL('test-artifacts/cube-sources/'+type+'.html',root),html);
 const max=type==='strange'||type==='strangeaddi'?2:type==='master'?3:4;
 const jobs=[]; for(let grade=1;grade<=max;grade++)for(const part of parts)for(const level of levels)jobs.push({grade,part,level});
 let done=0;
 async function worker(){
 while(jobs.length){
 const {grade,part,level}=jobs.shift(),key=[type,grade,part,level].join(':');
 if(out.lookup[key])continue;
 const res=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','X-Requested-With':'XMLHttpRequest'},body:new URLSearchParams({nCubeItemID:id,nGrade:grade,nPartsType:part,nReqLev:level})});
 if(!res.ok)throw Error(res.status);
 const text=await res.text();
 const tables=[...text.matchAll(/<table class="cube_data[^"]*">([\s\S]*?)<\/table>/g)].map(m=>[...m[1].matchAll(/<tr[^>]*>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/g)].map(r=>({text:clean(r[1]),weight:Number(clean(r[2]).replace('%',''))})));
 if(!tables.length&&text.includes('해당하는 장비 아이템이 없습니다')){out.lookup[key]='unavailable';continue;}
 if(tables.length!==3||tables.some(t=>!t.length||t.some(r=>!Number.isFinite(r.weight)))){fs.writeFileSync(path,JSON.stringify(out));throw Error('Bad table '+key);}
 const serial=JSON.stringify(tables),hash=crypto.createHash('sha256').update(serial).digest('hex').slice(0,20);
 out.tables[hash]=tables;out.lookup[key]=hash;
 if(++done%100===0){fs.writeFileSync(path,JSON.stringify(out));console.log(type,done);}
 }}
 await Promise.all(Array.from({length:3},worker));
 fs.writeFileSync(path,JSON.stringify(out));console.log('DONE',type,id,Object.keys(out.tables).length);
}
