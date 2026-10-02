import {fifthUnlocked} from './fifth-job.mjs?v=fifth-follow-119';
// Return existing input bits only; damage, cooldown and range remain server-owned.
export function autoSkillBits(actor,tick,active=true){
 if(!active||!actor||actor.hp<=0||actor.left||actor.ended||actor.chest)return 0;
 const p=actor.power||{},stage=actor.advancement??p.advancement??0;
 const slots=[[8,'ultimateReady',p.firstJob!==false],[2,'skillReady',actor.advanced===true||stage>=1],[16,'thirdReady',stage>=2],[32,'fourthReady',stage>=3],[64,'fifthReady',fifthUnlocked(actor)]];
 return slots.reduce((bits,[bit,key,unlocked])=>unlocked&&tick>=(actor[key]||0)?bits|bit:bits,0);
}
export function nextAutoSkill(state,now){
 const b=state?.battle;if(!b||b.kind==='tower'||b.hp<=0||b.ended)return null;
 const unlocked=state.firstAdvancement===true||(state.advancement||0)>=1;
 for(const [slot,key] of [[1,'skillReady'],[2,'secondReady'],[3,'thirdReadyAt'],[4,'fourthReadyAt'],[5,'fifthReadyAt']]){
  if((slot===5?fifthUnlocked(state):slot===1?unlocked:(state.advancement||0)>=slot-1)&&now>=(b[key]||0))return slot;
 }
 return null;
}
