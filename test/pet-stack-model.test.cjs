const {test}=require('node:test');
const a=require('node:assert/strict');
const m=require('../pet-stack-model.js');
const data=Object.fromEntries(Array.from({length:25},(_,i)=>{const id='p'+i;return [id,{id,grade:1+Math.floor(i/5),tierInGrade:i%5+1}]}));
const state=()=>({ownedPets:[],petSummonExp:140,petStone:10000});
test('fresh account initializes empty inventory',()=>{const s={};m.normalize(s,data);a.deepEqual(s.ownedPets,[]);});
test('duplicate copies grow at 1/2/4/7/12 without inventory proliferation',()=>{
 const s=state();for(let i=1;i<=1200;i++){m.add(s,data,'p0');a.equal(s.ownedPets.length,1);a.equal(s.ownedPets[0].level,m.level(i));}
 a.equal(s.ownedPets[0].copies,1200);a.equal(m.sale(s.ownedPets[0],data),1200);
});
test('migration preserves equipped UID, lock, represented value and survives reload',()=>{
 const s=state();s.ownedPets=[{uid:'a',petId:'p0',level:2},{uid:'b',petId:'p0',level:4,locked:true},{uid:'c',petId:'p0',level:5,copies:15}];s.equippedPet='b';
 m.normalize(s,data);a.equal(s.ownedPets.length,1);a.equal(s.ownedPets[0].copies,24);a.equal(s.ownedPets[0].uid,'b');a.equal(s.ownedPets[0].locked,true);
 const saved=JSON.stringify(s);m.normalize(s,data);a.equal(JSON.stringify(s),saved);const restored=JSON.parse(saved);m.normalize(restored,data);a.deepEqual(restored,s);
});
test('maxed species excluded, grade and species probabilities renormalize',()=>{
 const s=state();m.normalize(s,data);a.ok(Math.abs(m.pool(s,data).reduce((v,p)=>v+p.probability,0)-1)<1e-12);
 for(let i=0;i<5;i++)s.ownedPets.push({petId:'p'+i,level:5});
 let pool=m.pool(s,data);a.ok(pool.every(p=>p.grade>1));a.ok(Math.abs(pool.filter(p=>p.grade===2).reduce((v,p)=>v+p.probability,0)-.25/(1-.722))<1e-12);
 s.ownedPets.push({petId:'p5',level:5});pool=m.pool(s,data);a.ok(pool.every(p=>p.petId!=='p5'));a.ok(Math.abs(pool.reduce((v,p)=>v+p.probability,0)-1)<1e-12);
});
test('selling max-level pet makes it eligible again, all max gives no draw',()=>{
 const s=state();s.ownedPets=Object.keys(data).map(petId=>({petId,level:5}));m.normalize(s,data);a.deepEqual(m.pool(s,data),[]);a.equal(m.pick([]),null);
 s.ownedPets=s.ownedPets.filter(p=>p.petId!=='p0');const pool=m.pool(s,data);a.deepEqual(pool,[{petId:'p0',grade:1,probability:1}]);
});
test('legacy low summon XP cannot deadlock after all unlocked pets maxed',()=>{
 const s=state();s.petSummonExp=0;s.ownedPets=Object.keys(data).slice(0,5).map(petId=>({petId,level:5}));a.ok(m.pool(s,data).every(p=>p.grade===2));
});
test('unknown future records archived once and unsafe values rejected',()=>{
 const s=state();s.ownedPets=[{petId:'future',uid:'q'}];m.normalize(s,data);m.normalize(s,data);a.equal(s.petStackUnknown.length,1);
 a.throws(()=>m.pick(m.pool(s,data),()=>1),/INVALID/);
 a.throws(()=>m.sale({petId:'p24',level:5,copies:Number.MAX_SAFE_INTEGER},data),/OVERFLOW/);
});
