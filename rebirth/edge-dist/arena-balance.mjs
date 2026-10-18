import {power} from './engine.mjs';
import {absorbDamage} from './priest.mjs';
import {CLASSES,CLASS_SKILLS,SECOND_SKILLS,THIRD_SKILLS,FOURTH_SKILLS,FIFTH_SKILLS,convertPriestPotentials,PRIEST_REMAKE_VERSION} from './data.mjs';

// These rules apply only to arena simulations. Shared PvE stats and skills stay intact.
// 2026-10-18 재보정: 같은 장비 6직업 리그전 승률 50%(±2.5%p) 목표로 단계·압박 구간별 배율 재계산.
export const ARENA_BALANCE_VERSION='arena-balance-even-20261018';
export const ARENA_BALANCE=Object.freeze({
 hpMultiplier:30,
 damageByStage:Object.freeze([
  Object.freeze({"warrior":0.9009,"mage":0.9542,"archer":1.1205,"rogue":0.9619,"pirate":1.0310,"priest":1.1114}),
  Object.freeze({"warrior":0.9074,"mage":0.9462,"archer":1.1182,"rogue":0.9394,"pirate":1.0370,"priest":1.0504}),
  Object.freeze({"warrior":0.9046,"mage":1.0089,"archer":1.0783,"rogue":0.9075,"pirate":1.0109,"priest":0.9522}),
  Object.freeze({"warrior":0.8086,"mage":1.2023,"archer":1.1092,"rogue":0.8502,"pirate":1.1042,"priest":0.8896}),
 ]),
 fifthDamageCurve:Object.freeze([
  Object.freeze({pressure:0.599304,damage:Object.freeze({"warrior":0.8129,"mage":1.0811,"archer":1.0792,"rogue":0.8635,"pirate":1.0803,"priest":0.7607})}),
  Object.freeze({pressure:0.924760,damage:Object.freeze({"warrior":0.7687,"mage":1.2603,"archer":1.1105,"rogue":0.8510,"pirate":1.0843,"priest":0.7421})}),
  Object.freeze({pressure:1.140731,damage:Object.freeze({"warrior":0.7630,"mage":1.2216,"archer":1.0696,"rogue":0.9068,"pirate":1.0626,"priest":0.7342})}),
  Object.freeze({pressure:1.351928,damage:Object.freeze({"warrior":0.7675,"mage":1.2292,"archer":1.0573,"rogue":0.8787,"pirate":1.0693,"priest":0.7138})}),
  Object.freeze({pressure:1.394762,damage:Object.freeze({"warrior":0.7338,"mage":1.2153,"archer":1.1474,"rogue":0.9235,"pirate":1.1208,"priest":0.6390})}),
  Object.freeze({pressure:1.454493,damage:Object.freeze({"warrior":0.7460,"mage":1.2013,"archer":1.0493,"rogue":0.9634,"pirate":1.0384,"priest":0.7179})}),
  Object.freeze({pressure:1.551428,damage:Object.freeze({"warrior":0.7549,"mage":1.2368,"archer":1.0778,"rogue":0.8811,"pirate":1.0945,"priest":0.6921})}),
  Object.freeze({pressure:1.581989,damage:Object.freeze({"warrior":0.7548,"mage":1.2263,"archer":1.0817,"rogue":0.8809,"pirate":1.0811,"priest":0.6823})}),
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
