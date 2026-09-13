// Shared display rules. Random draws and spending are executed only on the server.
export const CUBE_VERSION=1;
export const CUBES={jade:{name:'비취 큐브',price:20,key:'jadeCube',rarities:[0,1,2,3]},sun:{name:'태양 큐브',price:50,key:'sunCube',rarities:[4,5]}};
export const TIERS=[{name:'레어',chance:60,color:'#65bdff'},{name:'에픽',chance:30,color:'#be86ff'},{name:'유니크',chance:8,color:'#ffe078'},{name:'레전더리',chance:2,color:'#ff9654'}];
const ratios=[.1,.25,.5,.75,1,1.35,1.75];
const bases={무기:20,투구:20,갑옷:50,바지:20,신발:50,반지:10,귀걸이:12};
export const optionBase=it=>bases[it.slot]*ratios[it.rarity];
export const cubeType=it=>Object.keys(CUBES).find(key=>CUBES[key].rarities.includes(it.rarity));
export function optionBands(it){
 const base=optionBase(it),lo=Math.round(base*.8*10),hi=Math.round(base*1.2*10);
 return TIERS.map((tier,i)=>({...tier,min:(i?lo+Math.floor((hi-lo)*i/4)+1:lo)/10,max:(lo+Math.floor((hi-lo)*(i+1)/4))/10}));
}
export function initializeOptions(it){if(it.cubeVersion!==CUBE_VERSION){it.optionRolls=[.8,.8];it.cubeVersion=CUBE_VERSION;it.cubeTier=0;}return it;}
export function rollOption(it,random){
 const r=random()*100,tier=r<60?0:r<90?1:r<98?2:3,band=optionBands(it)[tier];
 const min=Math.round(band.min*10),max=Math.round(band.max*10),value=(min+Math.floor(random()*(max-min+1)))/10;
 it.optionRolls=[value/optionBase(it),.8];it.cubeVersion=CUBE_VERSION;it.cubeTier=tier;
 return {tier,value};
}
