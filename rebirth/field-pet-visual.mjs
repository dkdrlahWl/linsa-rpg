import {fieldPetHP,fieldPetDeath} from './pet-event.mjs?v=priest-potential-83';

// Describe the actual field heal, including HP immediately before it.
export function fieldPetVisual(maxHp,damage,seconds,defeated=false){
 const hp=fieldPetHP(maxHp,damage,seconds);
 if(defeated||damage<=0||seconds>=fieldPetDeath(maxHp,damage))return {hp,readyIn:0,healAt:null,amount:0,before:hp};
 const first=Math.ceil(maxHp*.08/damage)*1.5;
 if(seconds<first)return {hp,readyIn:0,healAt:null,amount:0,before:hp};
 const healAt=first+Math.floor((seconds-first)/30)*30;
 const before=Math.max(0,fieldPetHP(maxHp,damage,healAt-.001)-damage);
 const amount=fieldPetHP(maxHp,damage,healAt)-before;
 return {hp,before,amount,healAt,readyIn:Math.max(0,30-(seconds-healAt))};
}
