const {test}=require('node:test');
const a=require('node:assert/strict');
const m=require('../pet-stack-model.js');
const data=Object.fromEntries(Array.from({length:25},(_,i)=>{const id='p'+i;return [id,{id,grade:1+Math.floor(i/5),tierInGrade:i%5+1}]}));
const state=()=>({ownedPets:[],petSummonExp:140,petStone:10000});
test('fresh account initializes empty inventory',()=>{const s={};m.normalize(s,data);a.deepEqual(s.ownedPets,[]);});
test('duplicate copies grow at 1/2/4/7/12 without inventory proliferation',()=>{
 const s=state();for(let i=1;i<=1200;i++){m.add(s,data,'p0');a.equal(s.ownedPets.length,1);a.equal(s.ownedPets[0].level,m.level(i));}
 a.equal(s.ownedPets[0].copies,12);a.equal(m.sale(s.ownedPets[0],data),12);a.equal(s.petStone,11188);
});
test('migration preserves equipped UID, lock, represented value and survives reload',()=>{
 const s=state();s.ownedPets=[{uid:'a',petId:'p0',level:2},{uid:'b',petId:'p0',level:4,locked:true},{uid:'c',petId:'p0',level:5,copies:15}];s.equippedPet='b';
 m.normalize(s,data);a.equal(s.ownedPets.length,1);a.equal(s.ownedPets[0].copies,24);a.equal(s.ownedPets[0].uid,'b');a.equal(s.ownedPets[0].locked,true);
 const saved=JSON.stringify(s);m.normalize(s,data);a.equal(JSON.stringify(s),saved);const restored=JSON.parse(saved);m.normalize(restored,data);a.deepEqual(restored,s);
});
test('maxed species stay in pool with unchanged probabilities, including all max',()=>{
 const s=state(),before=m.pool(s,data);s.ownedPets=Object.keys(data).map(petId=>({petId,level:5}));m.normalize(s,data);a.deepEqual(m.pool(s,data),before);
 s.petSummonExp=0;a.ok(m.pool(s,data).every(p=>p.grade===1));
});
test('max duplicate sells one copy, preserving equipped and locked pet',()=>{
 for(let grade=1;grade<=5;grade++){
 const s=state(),id='p'+((grade-1)*5);for(let i=0;i<12;i++)m.add(s,data,id);
 s.equippedPet=s.ownedPets[0].uid;s.ownedPets[0].locked=true;const before=JSON.stringify(s.ownedPets),result=m.add(s,data,id);
 a.equal(result.autoSold,true);a.equal(s.petStone,10000+m.sellBase[grade]);a.equal(JSON.stringify(s.ownedPets),before);a.equal(s.equippedPet,s.ownedPets[0].uid);
 }
});
test('unknown future records archived once and unsafe values rejected',()=>{
 const s=state();s.ownedPets=[{petId:'future',uid:'q'}];m.normalize(s,data);m.normalize(s,data);a.equal(s.petStackUnknown.length,1);
 a.throws(()=>m.pick(m.pool(s,data),()=>1),/INVALID/);
 a.throws(()=>m.sale({petId:'p24',level:5,copies:Number.MAX_SAFE_INTEGER},data),/OVERFLOW/);
});
