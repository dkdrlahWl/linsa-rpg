import {power} from './engine.mjs';
import {absorbDamage} from './priest.mjs';
import {CLASSES,CLASS_SKILLS,SECOND_SKILLS,THIRD_SKILLS,FOURTH_SKILLS,FIFTH_SKILLS,convertPriestPotentials,PRIEST_REMAKE_VERSION} from './data.mjs';

// These rules apply only to arena simulations. Shared PvE stats and skills stay intact.
// 2026-11-03 도현 재보정: 같은 장비 6직업 1:1 승률 전부 약 50%(사제 49% 목표). 압박 구간을 현재 장비 분포(0.96~2.66)에 맞춰 11점으로 다시 잡음.
export const ARENA_BALANCE_VERSION='arena-even-20261103';
export const ARENA_BALANCE=Object.freeze({
 hpMultiplier:30,
 damageByStage:Object.freeze([
  Object.freeze({"warrior":0.9174,"mage":0.9209,"archer":1.0304,"rogue":1.0958,"pirate":0.9837,"priest":1.0646}),
  Object.freeze({"warrior":0.9114,"mage":0.9283,"archer":1.0223,"rogue":1.1126,"pirate":1.0118,"priest":1.0271}),
  Object.freeze({"warrior":0.9192,"mage":1.0057,"archer":0.9711,"rogue":1.1627,"pirate":0.9970,"priest":0.9611}),
  Object.freeze({"warrior":0.8069,"mage":1.2132,"archer":1.0081,"rogue":1.0747,"pirate":1.1093,"priest":0.8499}),
 ]),
 fifthDamageCurve:Object.freeze([
  Object.freeze({pressure:0.961772,damage:Object.freeze({"warrior":0.8671,"mage":1.1256,"archer":1.0436,"rogue":1.1035,"pirate":1.1192,"priest":0.7950})}),
  Object.freeze({pressure:1.476836,damage:Object.freeze({"warrior":0.8288,"mage":1.2725,"archer":1.0263,"rogue":1.1099,"pirate":1.1028,"priest":0.7548})}),
  Object.freeze({pressure:1.542534,damage:Object.freeze({"warrior":0.8118,"mage":1.2733,"archer":1.0296,"rogue":1.1053,"pirate":1.1180,"priest":0.7603})}),
  Object.freeze({pressure:1.792664,damage:Object.freeze({"warrior":0.8070,"mage":1.2914,"archer":1.0387,"rogue":1.0846,"pirate":1.1361,"priest":0.7482})}),
  Object.freeze({pressure:2.102369,damage:Object.freeze({"warrior":0.7954,"mage":1.2664,"archer":1.0720,"rogue":1.1503,"pirate":1.1575,"priest":0.6955})}),
  Object.freeze({pressure:2.150676,damage:Object.freeze({"warrior":0.7858,"mage":1.2788,"archer":1.0864,"rogue":1.1566,"pirate":1.1653,"priest":0.6796})}),
  Object.freeze({pressure:2.160569,damage:Object.freeze({"warrior":0.7915,"mage":1.2721,"archer":1.0779,"rogue":1.1564,"pirate":1.1579,"priest":0.6860})}),
  Object.freeze({pressure:2.321942,damage:Object.freeze({"warrior":0.7820,"mage":1.2496,"archer":1.0963,"rogue":1.2174,"pirate":1.1650,"priest":0.6582})}),
  Object.freeze({pressure:2.405475,damage:Object.freeze({"warrior":0.7794,"mage":1.2412,"archer":1.1065,"rogue":1.2460,"pirate":1.1676,"priest":0.6409})}),
  Object.freeze({pressure:2.573492,damage:Object.freeze({"warrior":0.7950,"mage":1.2172,"archer":1.1158,"rogue":1.2834,"pirate":1.1737,"priest":0.6148})}),
  Object.freeze({pressure:2.659116,damage:Object.freeze({"warrior":0.8079,"mage":1.2113,"archer":1.1170,"rogue":1.2940,"pirate":1.1749,"priest":0.6017})}),
 ]),
 // 사제 고유 HP +30%(2026-10-18)는 아레나에서 상쇄한다.
 hp:Object.freeze({warrior:.9,mage:1.1,priest:1/1.3}),
 priestHealScale:.25,
 priestShieldScale:.5,
 skillTotals:Object.freeze({1:1.8,2:4.7,3:9,4:9,5:22}),
});
const skills={1:CLASS_SKILLS,2:SECOND_SKILLS,3:THIRD_SKILLS,4:FOURTH_SKILLS,5:FIFTH_SKILLS};

export function arenaPower(state){
 // 리메이크 전 사제 상대는 HP% 잠재를 공격력%로 본다(접속 시 실제 변환과 동일).
 if(state.classId==='priest'&&state.priestRemake!==PRIEST_REMAKE_VERSION){state=structuredClone(state);convertPriestPotentials(state);}
 const stats=power(state);
 let attack=stats.attack,hp=stats.hp;
 // A common offensive/defensive ratio describes equipment tempo without using ladder score.
 const primary=CLASSES.find(c=>c.id===state.classId).stat;
 const offenseState={...state,classId:'rogue',stats:{...state.stats,LUK:state.stats[primary]},items:state.items.map(item=>({...item,lines:item.lines.map(line=>({...line,key:line.key===primary?'LUK':line.key==='flat'+primary?'flatLUK':line.key}))}))};
 const offense=power(offenseState),arenaPressure=offense.attack/(offense.hp*(1+offense.defense/2600));
 hp*=ARENA_BALANCE.hp[state.classId]??1;
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
 for(const pending of actor.holySupport||[]){if(pending.arenaScaled)continue;const k=pending.slot===3?ARENA_BALANCE.priestShieldScale:arenaHealScale(actor);pending.amount*=k;pending.scale=(pending.scale??1)*k;pending.arenaScaled=true;}
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
