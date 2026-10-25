// 2026-10-25: 설정 > 스킬 투명도(1~5차). 이 기기에만 저장(ringu_rebirth_settings.skillAlpha).
// 전투 캔버스의 스킬 이펙트는 그리는 동안 globalAlpha에 차수별 배율을 곱한다(전투 판정과 무관한 화면 효과).
export const SKILL_ALPHA_DEFAULT=Object.freeze([.7,.7,.6,.6,.6]);
const KEY='ringu_rebirth_settings',clamp=v=>Math.max(.05,Math.min(1,v));
let alpha=[...SKILL_ALPHA_DEFAULT];
export function normalizeSkillAlpha(list){return SKILL_ALPHA_DEFAULT.map((d,i)=>Number.isFinite(Number(list?.[i]))?clamp(Number(list[i])):d);}
try{const saved=JSON.parse(globalThis.localStorage?.getItem(KEY)||'{}');if(Array.isArray(saved.skillAlpha))alpha=normalizeSkillAlpha(saved.skillAlpha);}catch{}
export const getSkillAlpha=()=>[...alpha];
export function setSkillAlpha(list){alpha=normalizeSkillAlpha(list);return getSkillAlpha();}
export const skillAlpha=tier=>tier>=1&&tier<=5?alpha[tier-1]:1;
// 기본 공격·적 공격은 0(배율 없음).
export function effectTier(e){
 if(!e||e.hostile)return 0;
 if(e.kind==='priest')return Math.max(1,Math.min(5,e.slot||1));
 return {first:1,second:2,'second-sequence':2,third:3,fourth:4,fifth:5,'fifth-field':5}[e.kind]||0;
}
const desc=typeof CanvasRenderingContext2D!=='undefined'?Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype,'globalAlpha'):null;
// Everything drawn on g until endSkillAlpha is multiplied, including nested save/restore and helper methods.
export function beginSkillAlpha(g,factor){
 if(!desc||!g||!(factor<.999))return false;
 g.save();const current=desc.get.call(g);
 Object.defineProperty(g,'globalAlpha',{configurable:true,get(){return desc.get.call(g)/factor;},set(v){desc.set.call(g,Math.max(0,Math.min(1,Number(v)*factor)));}});
 desc.set.call(g,current*factor);return true;
}
export function endSkillAlpha(g,began){if(!began)return;delete g.globalAlpha;g.restore();}
export const withSkillAlpha=(g,e,draw)=>{const on=beginSkillAlpha(g,skillAlpha(effectTier(e)));try{return draw();}finally{endSkillAlpha(g,on);}};
