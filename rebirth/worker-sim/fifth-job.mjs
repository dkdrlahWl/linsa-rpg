import {PRIEST_SKILLS,beginPriest,stepPriest} from './priest.mjs?v=exploration-arena-196';
export const FIFTH_NAMES={warrior:'천검의 창세자',mage:'별의 창조주',archer:'천궁의 인도자',rogue:'월식의 처형자',pirate:'망령함대의 제독',priest:'대천사'};
const make=(name,mode,radius,pulses,description)=>({name,type:'attack',mode,radius,range:2200,cooldown:40,hits:pulses.length,pulses,seconds:pulses.at(-1).at/10,description:description+' · 재사용 40초'});
const pulse=(at,damage,final=false)=>({at,damage,final});
export const FIFTH_SKILLS={
 priest:PRIEST_SKILLS[5],
 warrior:{...make('천검 개벽','line',1300,[pulse(10,9),...Array.from({length:11},(_,i)=>pulse(28+i*6,15/11,i===10))],'내려찍기 900% + 몬스터 방향 검기 11개 · 0.6초 간격(합계 1500%) · 총 2400% · 5초간 본인 받는 피해 20% 감소'),length:2400,width:1600},
 mage:make('초신성 붕괴','area',1350,[...Array.from({length:10},(_,i)=>pulse(10+i*5,1)),pulse(70,16,true)],'고정 마법진 · 폭발 100% × 10 + 초신성 1600% · 총 2600%'),
 archer:make('천궁의 추적자','homing',1300,Array.from({length:20},(_,i)=>pulse(8+i*2,1.1,i===19)),'추적 화살 110% × 20 · 총 2200% · 화살별 단일 대상'),
 rogue:{...make('월영 처형','tracking',2100,[...Array.from({length:16},(_,i)=>pulse(8+i*2,.85)),pulse(44,8.4,true)],'자동 추적 분신 85% × 16 + 일격 840% · 총 2200% · 추적 거리 4400 / 타격 반경 2100 · 적 HP 30% 이하에서 마지막 일격 1040% / 총 2400%'),range:4400},
 pirate:make('유령함대 출격','area',1400,[...Array.from({length:12},(_,i)=>pulse(12+i*5,1.75)),pulse(80,4,true)],'고정 포격 지역 · 함포 175% × 12 + 일제 사격 400% · 총 2500%'),
};
// Existing priest fifth remains available at level 200; other jobs require trial victory.
export const fifthUnlocked=a=>{const p=a.power||a;return (p.level??a.level??0)>=200&&(a.classId==='priest'||(a.advancement??p.advancement??0)>=4);};
export const fifthContains=(cast,target)=>{
 if(cast.mode!=='line')return Math.hypot(target.x-cast.x,target.y-cast.y)<=cast.radius;
 const dx=target.x-cast.x,dy=target.y-cast.y,along=dx*Math.cos(cast.angle)+dy*Math.sin(cast.angle),side=-dx*Math.sin(cast.angle)+dy*Math.cos(cast.angle);
 return along>=0&&along<=cast.length&&Math.abs(side)<=cast.width/2;
};
export function beginFifth(a,target,tick){
 if(!fifthUnlocked(a)||tick<(a.fifthReady||0))return false;
 if(a.classId==='priest')return beginPriest(a,target,tick,5);
 const sk=FIFTH_SKILLS[a.classId];if(!sk||!target||Math.hypot(a.x-target.x,a.y-target.y)>sk.range)return false;
 a.fifthReady=tick+sk.cooldown*10;
 a.fifthCast={mode:sk.mode,classId:a.classId,owner:a.id??a.actorId,x:sk.mode==='line'?a.x:target.x,y:sk.mode==='line'?a.y:target.y,fromX:a.x,fromY:a.y,angle:Math.atan2(target.y-a.y,target.x-a.x),radius:sk.radius,length:sk.length,width:sk.width,targetId:target.id,start:tick,next:0,visual:0,end:tick+sk.pulses.at(-1).at+6};
 a.skillStart=tick;a.skillUntil=tick+8;if(a.classId==='warrior')a.fifthGuardUntil=tick+50;return true;
}
export function stepFifth(a,targets,tick,hit,emit=()=>{}){
 if(a.classId==='priest')return stepPriest(a,targets,tick,5,hit,emit);
 const cast=a.fifthCast;if(!cast)return;
 if(a.hp<=0||a.left){delete a.fifthCast;return;}
 const sk=FIFTH_SKILLS[a.classId];
 const tracking=cast.mode==='homing'||cast.mode==='tracking',inRange=t=>t.hp!==0&&Math.hypot(a.x-t.x,a.y-t.y)<=sk.range;
 const pick=()=>targets.find(t=>t.id===cast.targetId&&inRange(t))||targets.filter(inRange).reduce((best,t)=>!best||Math.hypot(a.x-t.x,a.y-t.y)<Math.hypot(a.x-best.x,a.y-best.y)?t:best,null);
 if(tracking){const target=pick();if(target){cast.x=target.x;cast.y=target.y;cast.targetId=target.id;}}
 if(!cast.announced){emit({...cast,kind:'fifth-field',size:cast.radius*2});cast.announced=true;}
 while(cast.visual<sk.pulses.length){
  const lead=a.classId==='warrior'&&cast.visual>0?12:4;
  const p=sk.pulses[cast.visual],at=cast.start+p.at;if(tick<at-lead)break;
  const target=tracking?pick():targets.find(t=>t.id===cast.targetId&&t.hp!==0)||targets.find(t=>t.hp!==0);
  let aim=(cast.mode==='homing'||cast.mode==='tracking')&&target?target:cast;
  if(cast.mode==='line'){
   // Freeze each wave's launch direction for both its travel and damage area.
   const next=cast.visual>0?pick():target;
   aim={x:cast.visual>0?a.x:cast.x,y:cast.visual>0?a.y:cast.y,angle:cast.angle,targetId:cast.targetId};
   if(next){aim.angle=Math.atan2(next.y-aim.y,next.x-aim.x);aim.targetId=next.id;aim.targetX=next.x;aim.targetY=next.y;}
   cast.aims||=[];cast.aims[cast.visual]=aim;
  }
  const {aims,...visualCast}=cast;
  emit({...visualCast,...aim,kind:'fifth',pulse:cast.visual,final:p.final,start:at-lead,impact:at,end:at+7,size:cast.radius*2,fromX:a.x,fromY:a.y});cast.visual++;
 }
 while(cast.next<sk.pulses.length&&tick>=cast.start+sk.pulses[cast.next].at){
  const p=sk.pulses[cast.next],at=cast.start+p.at;
  const primary=pick();
  if((cast.mode==='homing'||cast.mode==='tracking')&&primary){cast.x=primary.x;cast.y=primary.y;cast.targetId=primary.id;}
  const area=cast.mode==='line'?{...cast,...cast.aims?.[cast.next]}:cast;
  const impacted=cast.mode==='homing'?(primary?[primary]:[]):cast.mode==='tracking'&&!primary?[]:targets.filter(t=>t.hp!==0&&fifthContains(area,t));
  for(const t of impacted){const damage=p.damage+(a.classId==='rogue'&&p.final&&t.hp!==undefined&&t.maxHp>0&&t.hp/t.maxHp<=.3?2:0);hit(damage,0,t,5);}
  cast.next++;
 }
 if(cast.next===sk.pulses.length)delete a.fifthCast;
}
// Keep persistent range markers when many players produce transient effects.
export function boundedCombatEffects(effects,tick,limit){const live=effects.filter(e=>e.end>tick);return [...live.filter(e=>e.kind==='fifth-field').slice(-8),...live.filter(e=>e.kind!=='fifth-field').slice(-limit)];}
