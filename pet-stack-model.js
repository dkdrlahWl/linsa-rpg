/* Pure pet progression and conditional probabilities. One record per species. */
((root,factory)=>{const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RinguPetStackModel=api;})(typeof window==='object'?window:globalThis,()=>{
 'use strict';
 const thresholds=Object.freeze([0,1,2,4,7,12]),sellBase=Object.freeze([0,1,3,8,25,100]);
 const gradeRates=Object.freeze([[1,0,0,0,0],[.95,.05,0,0,0],[.875,.12,.005,0,0],[.787,.20,.012,.001,0],[.722,.25,.025,.0025,.0005]].map(Object.freeze));
 const tierWeights=Object.freeze([0,40,28,18,10,4]);
 const integer=(v,fallback=0)=>Number.isFinite(Number(v))?Math.max(0,Math.min(Number.MAX_SAFE_INTEGER,Math.floor(Number(v)))):fallback;
 const sum=(a,b)=>{if(!Number.isSafeInteger(a+b))throw Error('PET_VALUE_OVERFLOW');return a+b;};
 function level(copies){let n=1;while(n<5&&copies>=thresholds[n+1])n++;return n;}
 function progress(exp){const total=integer(exp),limits=[0,20,50,90,140];let n=1;while(n<5&&total>=limits[n])n++;return {total,level:n,progress:total-limits[n-1],needed:n<5?limits[n]-limits[n-1]:0};}
 function normalize(s,data){
  if(!s)return;const records=Array.isArray(s.ownedPets)?s.ownedPets:[],groups=new Map();
  const discovered=new Set((Array.isArray(s.discoveredPets)?s.discoveredPets:[]).filter(id=>Object.hasOwn(data,id)));
  const unknown=[];
  for(const p of records){
   if(!p||!Object.hasOwn(data,p.petId)){if(p)unknown.push(p);continue;}
   const lv=Math.max(1,Math.min(5,integer(p.level,1))),copies=Math.max(thresholds[lv],integer(p.copies));
   const uid=String(p.uid||'pet_stack_'+p.petId),old=groups.get(p.petId);
   if(old){old.copies=sum(old.copies,copies);old.locked=old.locked||!!p.locked;old.obtainedAt=Math.min(old.obtainedAt,integer(p.obtainedAt,Date.now()));if(uid===String(s.equippedPet))old.uid=uid;}
   else groups.set(p.petId,{...p,uid,petId:p.petId,copies,locked:!!p.locked,obtainedAt:integer(p.obtainedAt,Date.now())});
   discovered.add(p.petId);
  }
  const next=[...groups.values()].map(p=>{p.level=level(p.copies);return p;});
  // Preserve unknown records outside the rendered inventory for future-version recovery.
  if(unknown.length)s.petStackUnknown=[...(s.petStackUnknown||[]),...unknown];
  const same=Array.isArray(s.ownedPets)&&records.length===next.length&&records.every((p,i)=>['uid','petId','copies','level','locked','obtainedAt'].every(k=>p[k]===next[i][k]));
  if(!same)s.ownedPets=next;
  s.discoveredPets=[...discovered];s.petStackVersion=1;
  s.equippedPet=s.equippedPet==null?null:String(s.equippedPet);if(s.equippedPet&&!next.some(p=>p.uid===s.equippedPet))s.equippedPet=null;
  s.petStone=integer(s.petStone);s.petTicket=integer(s.petTicket);
  s.claimedPetCollectionRewards=[...new Set((Array.isArray(s.claimedPetCollectionRewards)?s.claimedPetCollectionRewards:[]).map(Number).filter(Number.isFinite))];
 }
 function pool(s,data){
  const excluded=new Set();for(const p of s.ownedPets||[])if(p.level>=5)excluded.add(p.petId);
  const remaining=Object.values(data).filter(p=>!excluded.has(p.id));if(!remaining.length)return [];
  const rates=gradeRates[progress(s.petSummonExp).level-1];
  let grades=[1,2,3,4,5].filter(g=>rates[g-1]>0&&remaining.some(p=>p.grade===g));
  // Legacy maxed inventories with low summon XP must not become stuck.
  const fallback=!grades.length;if(fallback)grades=[Math.min(...remaining.map(p=>p.grade))];
  const gradeTotal=grades.reduce((n,g)=>n+(fallback?1:rates[g-1]),0),out=[];
  for(const grade of grades){const pets=remaining.filter(p=>p.grade===grade),tierTotal=pets.reduce((n,p)=>n+(tierWeights[p.tierInGrade]||1),0);
   for(const p of pets)out.push({petId:p.id,grade,probability:(fallback?1:rates[grade-1])/gradeTotal*(tierWeights[p.tierInGrade]||1)/tierTotal});
  }return out;
 }
 function pick(candidates,random=Math.random){if(!candidates.length)return null;const roll=random();if(!Number.isFinite(roll)||roll<0||roll>=1)throw Error('INVALID_PET_RANDOM');let cursor=roll;for(const p of candidates){cursor-=p.probability;if(cursor<0)return p;}return candidates.at(-1);}
 function add(s,data,id){normalize(s,data);if(!Object.hasOwn(data,id))return null;let pet=s.ownedPets.find(p=>p.petId===id);const previousLevel=pet?.level||0;
  if(pet){pet.copies=sum(pet.copies,1);pet.level=level(pet.copies);}else{pet={uid:'pet_stack_'+id,petId:id,level:1,copies:1,locked:false,obtainedAt:Date.now()};s.ownedPets.unshift(pet);}
  if(!s.discoveredPets.includes(id))s.discoveredPets.push(id);
  return {pet,previousLevel};
 }
 function sale(p,data){const d=data[p.petId];if(!d)return 0;const value=Math.max(thresholds[Math.max(1,Math.min(5,integer(p.level,1)))],integer(p.copies))*sellBase[d.grade];if(!Number.isSafeInteger(value))throw Error('PET_VALUE_OVERFLOW');return value;}
 return Object.freeze({thresholds,sellBase,gradeRates,tierWeights,level,progress,normalize,pool,pick,add,sale});
});
