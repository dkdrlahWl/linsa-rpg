import {power} from './engine.mjs';
import {absorbDamage} from './priest.mjs';
import {CLASSES,CLASS_SKILLS,SECOND_SKILLS,THIRD_SKILLS,FOURTH_SKILLS,FIFTH_SKILLS} from './data.mjs';

// These rules apply only to arena simulations. Shared PvE stats and skills stay intact.
export const ARENA_BALANCE_VERSION='arena-balance-153';
export const ARENA_BALANCE=Object.freeze({
 hpMultiplier:30,
 damageByStage:Object.freeze([
  Object.freeze({"warrior":0.9337,"mage":0.931,"archer":1.0605,"rogue":1.0747,"pirate":1.0002,"priest":0.908}),
  Object.freeze({"warrior":0.9165,"mage":0.9444,"archer":1.0722,"rogue":1.0431,"pirate":1.0239,"priest":0.6806}),
  Object.freeze({"warrior":0.906,"mage":0.9395,"archer":1.0696,"rogue":1.0709,"pirate":1.014,"priest":0.7137}),
  Object.freeze({"warrior":0.865,"mage":0.9419,"archer":1.1054,"rogue":1.0236,"pirate":1.064,"priest":0.5502}),
  Object.freeze({"warrior":0.8636,"mage":0.9913,"archer":1.0168,"rogue":1.0003,"pirate":1.128,"priest":0.5764}),
 ]),
 fifthDamageCurve:Object.freeze([
  Object.freeze({pressure:0.601081,damage:Object.freeze({"warrior":0.8636,"mage":0.9913,"archer":1.0168,"rogue":1.0003,"pirate":1.128,"priest":0.5764})}),
  Object.freeze({pressure:0.923016,damage:Object.freeze({"warrior":0.8155,"mage":1.0336,"archer":1.0508,"rogue":0.9917,"pirate":1.1086,"priest":0.4848})}),
  Object.freeze({pressure:1.150192,damage:Object.freeze({"warrior":0.7943,"mage":1.0945,"archer":1.0368,"rogue":0.981,"pirate":1.0934,"priest":0.4478})}),
  Object.freeze({pressure:1.353052,damage:Object.freeze({"warrior":0.7882,"mage":1.1236,"archer":1.0246,"rogue":0.9523,"pirate":1.1113,"priest":0.452})}),
  Object.freeze({pressure:1.393112,damage:Object.freeze({"warrior":0.7864,"mage":1.132,"archer":1.0207,"rogue":0.9507,"pirate":1.1103,"priest":0.4423})}),
  Object.freeze({pressure:1.453722,damage:Object.freeze({"warrior":0.7818,"mage":1.1361,"archer":1.0214,"rogue":0.9484,"pirate":1.1123,"priest":0.4309})}),
  Object.freeze({pressure:1.55386,damage:Object.freeze({"warrior":0.7822,"mage":1.1394,"archer":1.0227,"rogue":0.9427,"pirate":1.1131,"priest":0.4274})}),
  Object.freeze({pressure:1.604683,damage:Object.freeze({"warrior":0.7777,"mage":1.1365,"archer":1.028,"rogue":0.9354,"pirate":1.1224,"priest":0.4257})}),
 ]),
 hp:Object.freeze({warrior:.9,mage:1.1}),
 priestHpPotentialRate:.2,
 priestHealScale:.25,
 priestShieldScale:.5,
 skillTotals:Object.freeze({1:1.8,2:4.7,3:9,4:9,5:22}),
});
const skills={1:CLASS_SKILLS,2:SECOND_SKILLS,3:THIRD_SKILLS,4:FOURTH_SKILLS,5:FIFTH_SKILLS};

export function arenaPower(state){
 const stats=power(state);
 let attack=stats.attack,hp=stats.hp;
 // A common offensive/defensive ratio describes equipment tempo without using ladder score.
 const primary=CLASSES.find(c=>c.id===state.classId).stat;
 const offenseState={...state,classId:'rogue',stats:{...state.stats,LUK:state.stats[primary]},items:state.items.map(item=>({...item,lines:item.lines.map(line=>({...line,key:line.key==='hp'&&state.classId==='priest'?'attack':line.key===primary?'LUK':line.key==='flat'+primary?'flatLUK':line.key}))}))};
 const offense=power(offenseState),arenaPressure=offense.attack/(offense.hp*(1+offense.defense/2600));
 if(state.classId==='priest'){
  // HP potential contributes once to offense and also retains a defensive benefit.
  attack=offense.attack;
  if(stats.bonuses.hp>0){
   const bonus=stats.bonuses.hp/100;
   hp=hp/(1+bonus)*(1+bonus*ARENA_BALANCE.priestHpPotentialRate);
  }
 }else hp*=ARENA_BALANCE.hp[state.classId]??1;
 return {...stats,attack,hp,arenaPressure};
}

export function arenaSkillScale(classId,slot,scale){
 if(!slot)return scale;
 const skill=skills[slot]?.[classId];
 if(!skill)return scale;
 if(classId==='priest')return scale*ARENA_BALANCE.skillTotals[slot]/(skill.damage*skill.hits);
 if(slot===4)return scale*ARENA_BALANCE.skillTotals[4]/(skill.damage*skill.hits);
 if(slot===5){
  const total=skill.pulses.reduce((sum,pulse)=>sum+pulse.damage,0),budget=ARENA_BALANCE.skillTotals[5];
  // Retain half the original burst shape and spread half over the existing pulses.
  return .5*scale*budget/total+.5*budget/skill.hits;
 }
 return scale;
}

export function arenaAbsorbDamage(actor,damage,tick){
 if(actor.classId!=='priest')return absorbDamage(actor,damage,tick);
 if(tick<(actor.fifthGuardUntil||0))damage*=.8;
 const shield=actor.shieldPermanent||tick<(actor.shieldUntil||0)?actor.shield||0:0;
 const absorbed=Math.min(shield,damage);
 actor.shield=Math.max(0,shield-absorbed);
 actor.absorbed=(actor.absorbed||0)+absorbed;
 return Math.max(0,damage-absorbed);
}

export function scaleArenaSupport(actor){
 if(actor.classId!=='priest')return;
 for(const pending of actor.holySupport||[])pending.amount*=pending.slot===3?ARENA_BALANCE.priestShieldScale:arenaHealScale(actor);
}

export function arenaHealScale(actor){
 return ARENA_BALANCE.priestHealScale;
}

export function arenaDamageScale(actor){
 const stage=actor.classId==='priest'&&actor.level>=200?4:Math.min(4,actor.advancement||0);
 if(stage<4)return ARENA_BALANCE.damageByStage[stage][actor.classId]??1;
 const curve=ARENA_BALANCE.fifthDamageCurve,pressure=actor.power.arenaPressure;
 const upper=curve.findIndex(row=>row.pressure>=pressure);
 if(upper===0)return curve[0].damage[actor.classId];
 if(upper<0)return curve.at(-1).damage[actor.classId];
 const lo=curve[upper-1],hi=curve[upper],fraction=(pressure-lo.pressure)/(hi.pressure-lo.pressure);
 return lo.damage[actor.classId]+fraction*(hi.damage[actor.classId]-lo.damage[actor.classId]);
}

export function arenaHealThreshold(actor,slot){
 const heal=arenaHealScale(actor);
 return slot===2?1-.2*heal:1-heal+.03;
}
