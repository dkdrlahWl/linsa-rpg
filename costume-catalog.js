/* Versioned data shared by artwork, UI and server catalog generation. */
((root,factory)=>{const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RinguCostumeCatalog=api;})(typeof window==='object'?window:globalThis,()=>{
 'use strict';
 const products={
  kael:{name:'월영의 방랑자 · 카엘',price:300,attackPercent:5,gender:'male',description:'짧은 은회색 머리와 비대칭 망토의 고요한 방랑자',asset:'costume-kael-v1.webp',height:500,
   frames:[
    {box:[30,0,280,535],root:[183,518]},
    {box:[390,0,325,535],root:[550,518],hand:[506,195]},
    {box:[735,0,375,535],root:[930,518],hand:[1075,146]},
    {box:[1110,0,320,535],root:[1275,519],hand:[1205,285]},
    {box:[20,543,350,530],root:[195,1046],hand:[200,563]},
    {box:[375,600,399,460],root:[574,1017],hand:[750,758]},
    {box:[785,543,300,530],root:[940,1044],hand:[902,756]}
   ]},
  serin:{name:'월영의 방랑자 · 세린',price:300,attackPercent:5,gender:'female',description:'묶은 은회색 머리와 갈라진 망토 자락의 달빛 유랑자',asset:'costume-serin-v1.webp',height:520,
   frames:[
    {box:[75,0,250,541],root:[183,531]},
    {box:[375,0,335,541],root:[550,531],hand:[484,189]},
    {box:[735,0,380,541],root:[922,531],hand:[1064,150]},
    {box:[1150,0,250,541],root:[1275,533],hand:[1246,280]},
    {box:[10,543,356,530],root:[201,1053],hand:[188,563]},
    {box:[367,600,400,473],root:[572,1049],hand:[738,777]},
    {box:[780,543,300,530],root:[946,1055],hand:[947,750]}
   ]}
 };

 const SCHEMA_VERSION=1;
 const has=id=>Object.prototype.hasOwnProperty.call(products,id);
 function validate(catalog){
  for(const [id,p] of Object.entries(catalog)){
   if(!/^[a-z][a-z0-9_-]{0,63}$/.test(id)||!p.name||!Number.isSafeInteger(p.price)||p.price<0||!Number.isSafeInteger(p.attackPercent)||p.attackPercent<0||p.attackPercent>100)throw Error('INVALID_COSTUME_PRODUCT:'+id);
   if(!/^[a-z0-9-]+\.webp$/.test(p.asset)||!Number.isFinite(p.height)||p.height<=0||p.frames?.length!==7)throw Error('INVALID_COSTUME_ART:'+id);
   p.frames.forEach((f,index)=>{
    if(!Array.isArray(f.box)||f.box.length!==4||!f.box.every(Number.isFinite)||f.box[0]<0||f.box[1]<0||f.box[2]<=0||f.box[3]<=0)throw Error('INVALID_COSTUME_FRAME:'+id);
    for(const point of [f.root,...(index?[f.hand]:[])])if(!Array.isArray(point)||point.length!==2||!point.every(Number.isFinite)||point[0]<f.box[0]||point[0]>f.box[0]+f.box[2]||point[1]<f.box[1]||point[1]>f.box[1]+f.box[3])throw Error('INVALID_COSTUME_ANCHOR:'+id);
   });
  }return true;
 }
 function freeze(v){if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
 function normalizeRecord(input={}){
  const version=input.schemaVersion??1;if(version!==SCHEMA_VERSION)throw Error('UNSUPPORTED_COSTUME_SCHEMA');
  // Keep unknown future ownership IDs for persistence, but never grant their effects.
  const owned=[...new Set((Array.isArray(input.owned)?input.owned:[]).filter(id=>typeof id==='string'&&/^[a-z][a-z0-9_-]{0,63}$/.test(id)))];
  const equipped=owned.includes(input.equipped)&&has(input.equipped)?input.equipped:null;
  return {schemaVersion:SCHEMA_VERSION,owned,equipped};
 }
 function bonusPercent(owned){return [...new Set(Array.isArray(owned)?owned:[])].reduce((n,id)=>n+(has(id)?products[id].attackPercent:0),0);}
 function attack(baseAttack,owned){if(!Number.isSafeInteger(baseAttack)||baseAttack<0)throw Error('INVALID_BASE_ATTACK');const value=BigInt(baseAttack)*BigInt(100+bonusPercent(owned))/100n;if(value>BigInt(Number.MAX_SAFE_INTEGER))throw Error('ATTACK_OVERFLOW');return Number(value);}
 validate(products);freeze(products);
 return Object.freeze({schemaVersion:SCHEMA_VERSION,products,validate,normalizeRecord,bonusPercent,attack});
});
