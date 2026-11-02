// 종족 뽑기 서버 처리: tribeRoll(뽑기권 1장 → 결과 보류) · tribeChoose(이전 유지 / 이후 변경).
import {TRIBE_BY_ID,TRIBE_GRADE_BY_ID,rollTribe} from './tribe-data.mjs';
const fail=code=>{throw new Error(code);};
const check=(ok,code)=>{if(!ok)fail(code);};
const nat=n=>Number.isSafeInteger(n)&&n>=0?n:0;
export function normalizeTribe(s){
 if(!TRIBE_BY_ID[s.tribe])s.tribe='human';
 const g=s.tribeGacha&&typeof s.tribeGacha==='object'?s.tribeGacha:{};
 s.tribeGacha={tickets:nat(g.tickets),rolls:nat(g.rolls),pending:g.pending&&TRIBE_BY_ID[g.pending.id]?{id:g.pending.id,prev:TRIBE_BY_ID[g.pending.prev]?g.pending.prev:s.tribe,at:Number(g.pending.at)||0}:null,best:TRIBE_BY_ID[g.best]?g.best:null,last:g.last||null};
 return s.tribeGacha;
}
const rank=id=>['start','common','rare','epic','legend','myth'].indexOf(TRIBE_BY_ID[id]?.grade);
export function tribeCommand(s,command,args,now,random){
 const g=normalizeTribe(s);
 if(command==='tribeRoll'){
  check(!g.pending,'TRIBE_PENDING');
  check(s.isAdmin||g.tickets>=1,'TRIBE_TICKET_REQUIRED');
  if(!s.isAdmin)g.tickets--;
  const r=rollTribe(random),t=r.tribe,grade=t.grade;
  g.rolls++;
  if(!g.best||rank(t.id)>rank(g.best))g.best=t.id;
  g.pending={id:t.id,prev:s.tribe,at:now,pity:r.pity};
  return {type:'tribeRoll',id:t.id,name:t.name,grade,gradeName:TRIBE_GRADE_BY_ID[grade].name,prev:s.tribe,pity:r.pity,tickets:g.tickets};
 }
 if(command==='tribeChoose'){
  check(g.pending,'TRIBE_NOT_PENDING');
  const take=args?.take===true,before=s.tribe;
  if(take)s.tribe=g.pending.id;
  g.last={id:g.pending.id,took:take,at:now};g.pending=null;
  return {type:'tribeChoose',took:take,tribe:s.tribe,before};
 }
 fail('UNKNOWN_COMMAND');
}
