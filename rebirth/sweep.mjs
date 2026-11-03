// 2026-11-03 도현: 소탕. 한 번이라도 깬 일일·주간 보스, 토큰 던전·열쇠 던전 단계는 전투 없이 보상을 바로 받는다.
// 보상·횟수 차감은 직접 깼을 때와 똑같다(일보 하루 1회 · 주보 주 1회 · 토큰/열쇠 하루 2회).
// 개별 소탕(kind=boss|token|key)과 전체 소탕(kind=all · 일보·주보만)을 같은 명령으로 처리하고, 결과는 한 번에 모아 보여준다.
import {BOSSES,dayKey,weekKey} from './data.mjs';
import {TOKEN_BOSS_STAGES,tokenBossFinish,tokenTriesLeft,tokenOpenFor} from './token-content.mjs';
import {KEY_BOSS_STAGES,keyBossFinish,keyTriesLeft} from './key-dungeon.mjs';

const check=(ok,code)=>{if(!ok)throw new Error(code);};
const claimKeyOf=(boss,now)=>boss.weekly?weekKey(now):dayKey(now);

// 보스: 보상 받고 깬 적이 있고(cleared), 이번 날/주 보상을 아직 안 받았으면 소탕 가능.
export const bossSweepable=(s,boss,now)=>!!boss&&!boss.dungeon&&(s?.cleared||[]).includes(boss.id)&&(s.isAdmin||s.bossClaims?.[boss.id]!==claimKeyOf(boss,now));
// 토큰·열쇠: 최고 기록 이하 단계, 오늘 남은 횟수가 있으면 가능.
export const tokenSweepable=(s,stage,now)=>tokenOpenFor(s)&&Number.isInteger(stage)&&stage>=1&&stage<=TOKEN_BOSS_STAGES.length&&stage<=(s?.tokenBoss?.best||0)&&tokenTriesLeft(s,now)>0;
export const keySweepable=(s,stage,now)=>Number.isInteger(stage)&&stage>=1&&stage<=KEY_BOSS_STAGES.length&&stage<=(s?.keyBoss?.best||0)&&keyTriesLeft(s,now)>0;

// 전체 소탕으로 받을 수 있는 목록: 일일·주간 보스만(2026-11-03 도현: 토큰·열쇠 던전은 전체 소탕에서 제외, 개별 소탕만).
export function sweepPlan(s,now){
 const plan=[];
 for(const boss of BOSSES)if(bossSweepable(s,boss,now))plan.push({kind:'boss',id:boss.id});
 return plan;
}

const TOTAL_KEYS=['gold','cube','highCube','addCube','potentialLock','tokens','keys'];
// grantBoss(s,boss,claimKey,reward): engine의 보스 승리 보상 지급(장비 확률 포함).
export function sweepCommand(s,args,ctx,{grantBoss}){
 const kind=args?.kind,now=ctx.now;
 let plan;
 if(kind==='all'){plan=sweepPlan(s,now);check(plan.length>0,'SWEEP_NOTHING');}
 else if(kind==='boss'){const boss=BOSSES[args.id];check(Number.isInteger(args.id)&&bossSweepable(s,boss,now),'SWEEP_NOT_ALLOWED');plan=[{kind,id:args.id}];}
 else if(kind==='token'){check(tokenSweepable(s,args.stage,now),'SWEEP_NOT_ALLOWED');plan=[{kind,stage:args.stage}];}
 else if(kind==='key'){check(keySweepable(s,args.stage,now),'SWEEP_NOT_ALLOWED');plan=[{kind,stage:args.stage}];}
 else throw new Error('INVALID_SWEEP');
 s.materials??={};s.daily??={};
 const entries=[],total={gold:0,cube:0,highCube:0,addCube:0,potentialLock:0,tokens:0,keys:0},items=[];
 for(const p of plan){
  if(p.kind==='boss'){
   const boss=BOSSES[p.id];if(!bossSweepable(s,boss,now))continue;
   const reward={type:'boss',bossId:boss.id,won:true,practice:false,items:[],materials:0,sweep:true};
   s.daily.boss=(s.daily.boss||0)+1;
   grantBoss(s,boss,claimKeyOf(boss,now),reward);
   entries.push({kind:'boss',bossId:boss.id,name:boss.name,weekly:!!boss.weekly,...Object.fromEntries(TOTAL_KEYS.filter(k=>reward[k]).map(k=>[k,reward[k]])),items:reward.items});
   for(const k of TOTAL_KEYS)total[k]+=Number(reward[k])||0;items.push(...reward.items);
  }else if(p.kind==='token'){
   if(!tokenSweepable(s,p.stage,now))continue;
   const r=tokenBossFinish(s,{tokenStage:p.stage,won:true,tick:0},now);
   entries.push({kind:'token',stage:p.stage,name:'토큰 던전 '+p.stage+'단계',tokens:r.tokens});total.tokens+=r.tokens;
  }else{
   if(!keySweepable(s,p.stage,now))continue;
   const r=keyBossFinish(s,{keyStage:p.stage,won:true,tick:0},now);
   entries.push({kind:'key',stage:p.stage,name:'열쇠 던전 '+p.stage+'단계',keys:r.keys});total.keys+=r.keys;
  }
 }
 check(entries.length>0,'SWEEP_NOTHING');
 const event={type:'sweep',all:kind==='all',count:entries.length,entries,...total,items};
 s.lastReward=event;
 return event;
}
