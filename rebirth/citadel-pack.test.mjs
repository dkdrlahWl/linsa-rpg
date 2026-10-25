import {startCoop,advanceCoop} from './coop-model.mjs';
import {packCitadelWorld,unpackCitadelWorld} from './citadel-zero.mjs';
import {explorationFloor} from './exploration-data.mjs';
import assert from 'node:assert/strict';
const p={hp:100000,attack:5000,defense:2000,crit:.3,critDamage:1.6,cadence:1,boss:1,level:200,advancement:4,firstJob:true};
let w=startCoop({mode:'citadel',tier:0,status:'waiting',owner:'p0',id:'c',members:['warrior','mage','priest','rogue'].map((c,i)=>({id:'p'+i,name:'n'+i,classId:c,power:p,advanced:true,advancement:4,ready:true}))},Date.now()-5000);
for(const floor of [1,5,7,12,20]){w.floor=floor;explorationFloor(w);
 const raw=JSON.stringify(w),packed=packCitadelWorld(w),back=unpackCitadelWorld(JSON.parse(JSON.stringify(packed)));
 assert.deepEqual(JSON.parse(JSON.stringify(back)),JSON.parse(raw));
 console.log('floor',floor,'monsters',w.monsters.length,'raw',raw.length,'packed',JSON.stringify(packed).length);}
assert.equal(packCitadelWorld({mode:'exploration',dungeon:{a:1}}).dungeon.a,1,'non-citadel worlds are untouched');
console.log('PASS citadel storage: terrain stripped on save and rebuilt identically on read');
// 2026-10-25: 몬스터 압축 — 전투 중 매 틱 저장/복원해도 결과가 원본 시뮬레이션과 완전히 같아야 한다.
{
 const mk=()=>{let x=startCoop({mode:'citadel',tier:0,status:'waiting',owner:'p0',id:'c2',members:['warrior','mage','priest','rogue'].map((c,i)=>({id:'p'+i,name:'n'+i,classId:c,power:{...p,attack:50000},advanced:true,advancement:4,ready:true}))},1e12);x.entryWaiting=false;return x;};
 let a=mk(),b=mk();let maxRaw=0,maxPacked=0;
 for(let tick=1;tick<=600;tick++){
  const frames=['p0','p1','p2','p3'].map((u,i)=>({user:u,tick,input:[Math.sin(tick/25+i)*.6,Math.cos(tick/31+i)*.6,tick%7===0?1:0]}));
  a=advanceCoop({...a,_queuedInputs:frames},'p0',{frames:[]},a.started+tick*100);
  b=advanceCoop({...b,_queuedInputs:frames},'p0',{frames:[]},b.started+tick*100);
  const packed=JSON.stringify(packCitadelWorld(b));b=unpackCitadelWorld(JSON.parse(packed));
  maxRaw=Math.max(maxRaw,JSON.stringify(a).length);maxPacked=Math.max(maxPacked,packed.length);
  assert.equal(JSON.stringify(b),JSON.stringify(JSON.parse(JSON.stringify(a))),'tick '+tick);
  if(a.status!=='fighting')break;
 }
 console.log('PASS 600-tick packed simulation identical',{maxRaw,maxPacked});
}
