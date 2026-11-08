import {power} from './engine.mjs';
import {absorbDamage} from './priest.mjs';
import {CLASSES,CLASS_SKILLS,SECOND_SKILLS,THIRD_SKILLS,FOURTH_SKILLS,FIFTH_SKILLS,convertPriestPotentials,PRIEST_REMAKE_VERSION} from './data.mjs';

// These rules apply only to arena simulations. Shared PvE stats and skills stay intact.
// 2026-11-03 도현 재보정: 같은 장비 6직업 1:1 승률 전부 약 50%(사제 49% 목표). 압박 구간을 현재 장비 분포(0.96~2.66)에 맞춰 11점으로 다시 잡음.
export const ARENA_BALANCE_VERSION='arena-neutral-20261109';
export const ARENA_BALANCE=Object.freeze({
 hpMultiplier:200, // 2026-11-09: 30→200. 종결 세팅 공격력에 맞춰 전투를 ~20초로(모든 스킬이 한 바퀴 돈다)
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
 hp:Object.freeze({}),
 priestHealScale:.25,
 priestShieldScale:.5,
 skillTotals:Object.freeze({1:1.7,2:4.7,3:9,4:10,5:23}),
});
const skills={1:CLASS_SKILLS,2:SECOND_SKILLS,3:THIRD_SKILLS,4:FOURTH_SKILLS,5:FIFTH_SKILLS};
// 2026-11-09 도현: 아레나 공통 스킬 틱. 슬롯별 총량(공격력 배수)·지속시간·쿨타임이 전 직업 동일.
export const ARENA_UNIFORM_SKILLS=true;
export const ARENA_UNIFORM=Object.freeze({
 1:Object.freeze({total:1.7,hits:2,seconds:.4,cooldown:100}),
 2:Object.freeze({total:4.7,hits:8,seconds:3,cooldown:150}),
 3:Object.freeze({total:9,hits:8,seconds:2,cooldown:180}),
 4:Object.freeze({total:10,hits:12,seconds:4.8,cooldown:225}),
 5:Object.freeze({total:23,hits:12,seconds:7,cooldown:400}),
});
// 사제 지원(아레나): 2차 즉시 회복, 3차 보호막, 5차 즉시 회복. 비율은 최대 HP 기준.
// 사제(아레나): 스킬 피해를 priestTrade만큼 줄이는 대신, 받는 피해를 priestTrade×priestSustainRate만큼 줄인다(지속형 회복·보호막의 환산).
export const ARENA_SUPPORT=Object.freeze({priestTrade:0,priestSustainRate:1});

// 2026-11-09 도현: 아레나에서는 직업 고유 효과를 뺀다 — 전사 HP+30%·방어+15%, 마법사 공+6%, 사제 HP+30%,
// 해적 공속 1.08, 도적 치피 1.9(→1.6), 궁수 크리 +5%p. 잠재·장비·코스튬·칭호는 그대로. 남는 직업 차이는 스킬 구성뿐.
export const ARENA_NEUTRAL_CLASSES=true;
export function neutralizeClassPerks(stats,classId){
 const out={...stats};
 if(classId==='warrior'){out.hp=Math.floor(out.hp/1.3);out.defense=Math.floor(out.defense/1.15);}
 if(classId==='mage')out.attack=Math.floor(out.attack/1.06);
 if(classId==='priest')out.hp=Math.floor(out.hp/1.3);
 if(classId==='pirate')out.cadence=1;
 if(classId==='rogue')out.critDamage=out.critDamage-0.3;
 if(classId==='archer'){const raw=.05+(out.bonuses?.crit||0)/100;out.crit=Math.min(.95,Math.max(0,raw));} // 궁수 +5%p는 캡(95%) 전 값에서 제거
 out.dps=out.attack*(1+out.crit*(out.critDamage-1))*(out.cadence||1);
 return out;
}
export function arenaPower(state){
 // 리메이크 전 사제 상대는 HP% 잠재를 공격력%로 본다(접속 시 실제 변환과 동일).
 // 2026-11-09: 직업 특성 제거 모드에서는 사제도 다른 직업과 같은 잠재 해석을 쓴다(리메이크 전 HP%→공% 변환 안 함).
 if(!ARENA_NEUTRAL_CLASSES&&state.classId==='priest'&&state.priestRemake!==PRIEST_REMAKE_VERSION){state=structuredClone(state);convertPriestPotentials(state);}
 const stats=ARENA_NEUTRAL_CLASSES?neutralizeClassPerks(power(state),state.classId):power(state);
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
 // 2026-11-09 도현: 아레나에서는 6직업 모두 슬롯별 스킬 총량을 같은 값으로 맞춘다(타수·간격·연출은 직업별 그대로).
 // 직업 특성 제거와 함께, 어떤 잠재를 끼든 직업 간 승률이 50% 근처가 되게 하기 위함.
 const budget=ARENA_BALANCE.skillTotals[slot];
 if(slot===5&&skill.pulses){const total=skill.pulses.reduce((sum,pulse)=>sum+pulse.damage,0);return .5*scale*budget/total+.5*budget/skill.hits;}
 return scale*budget/(skill.damage*skill.hits);
}

export function arenaAbsorbDamage(actor,damage,tick){
 if(actor.classId!=='priest')return absorbDamage(actor,damage,tick);
 if(!ARENA_UNIFORM_SKILLS&&tick<(actor.fifthGuardUntil||0))damage*=.8;
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
 // 2026-11-09: 직업 특성 제거 + 공통 스킬 틱이면 직업 배율은 1(남는 직업 차이가 없으므로).
 if(ARENA_NEUTRAL_CLASSES&&ARENA_UNIFORM_SKILLS)return 1;
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
