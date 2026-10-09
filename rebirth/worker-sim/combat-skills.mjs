import {PRIEST_SKILLS,beginPriest,schedulePriest,stepPriest} from './priest.mjs?v=exploration-190';
// One deterministic timeline drives solo, party and wave damage and VFX.
const first=(name,hits,damage,cooldown,critAdd=0)=>({name,type:'attack',hits,damage,cooldown,critAdd,seconds:0,range:760,description:`${Math.round(damage*100)}% × ${hits}타 · 총 ${Math.round(hits*damage*100)}%${critAdd?' · 이 스킬 치명 확률 +5%p':''}`,pulses:Array.from({length:hits},(_,i)=>({at:3+i*2,damage}))});
export const CLASS_SKILLS={
 priest:PRIEST_SKILLS[1],
 warrior:first('대지 분쇄',1,1.6,10),mage:first('빙결 폭쇄',3,.6,12),archer:first('질풍 관통',5,.35,11),rogue:first('그림자 처형',2,.8,10,.05),pirate:first('파쇄 포격',2,.85,11),
};
const sequence=(name,cooldown,range,mode,times,scales,description,close=[])=>({name,type:'sequence',cooldown,range,mode,hits:times.length,seconds:times.at(-1)/10,damage:scales.reduce((a,b)=>a+b,0)/times.length,description,pulses:times.map((at,i)=>({at,damage:scales[i],close:close.includes(i)}))});
export const SECOND_SKILLS={
 priest:PRIEST_SKILLS[2],
 warrior:sequence('균열 참격',14,760,'fissure',[4,8,12,16,20,24,28,30],[.8,.5,.5,.5,.5,.5,.5,.9],'3초 · 횡베기 80% + 균열 50% × 6 + 솟는 검기 90% · 8타 / 총 470%'),
 mage:sequence('프리즘 창',16,950,'lance',[5,9,13,17,21,25,29,33,38],[.45,.45,.45,.45,.45,.45,.45,.45,1.2],'3.8초 · 마력창 45% × 8 + 결정 폭발 120% · 9타 / 총 480%'),
 archer:sequence('매의 저격',15,1100,'snipe',[6,9,12,15,18,21,24,27,30,34],[1.6,.3,.3,.3,.3,.3,.3,.3,.3,.6],'3.4초 · 저격 160% + 잔상 화살 30% × 8 + 관통 섬광 60% · 10타 / 총 460%'),
 rogue:sequence('잔영 교차',14,760,'cross',[3,6,9,12,15,18,21,24,26,28],[.4,.4,.4,.4,.4,.4,.4,.4,.75,.75],'2.8초 · 분신 교차 40% × 8 + 표식 폭발 75% × 2 · 10타 / 총 470%'),
 pirate:sequence('산탄 폭발',15,900,'scatter',[4,7,10,13,16,19,22,25,31,36],[.5,.5,.5,.5,.5,.5,.3,.3,.6,.6],'3.6초 · 산탄 50% × 6 + 근접 탄환 30% × 2 + 화약 폭발 60% × 2 · 8~10타 / 총 420~480%',[6,7]),
};
export const skillFor=(classId,slot)=> (slot===1?CLASS_SKILLS:SECOND_SKILLS)[classId];
const key=slot=>slot===1?'firstCast':'secondCast';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function scheduleCombatSkill(a,target,tick,slot){
 if(a.classId==='priest'){schedulePriest(a,target,tick,slot);return PRIEST_SKILLS[slot];}
 const sk=skillFor(a.classId,slot);
 a[key(slot)]={start:tick,origin:{x:a.x,y:a.y},target:{x:target.x,y:target.y},targetId:target.id,angle:Math.atan2(target.y-a.y,target.x-a.x),visual:0,next:0,aims:[],announced:false};
 a.skillStart=tick;a.skillUntil=tick+8;
 return sk;
}
export function beginCombatSkill(a,target,tick,slot){
 if(a.classId==='priest')return beginPriest(a,target,tick,slot);
 const sk=skillFor(a.classId,slot),ready=slot===1?'ultimateReady':'skillReady';
 const unlocked=slot===1?a.power?.firstJob!==false:(a.advanced===true||(a.advancement??a.power?.advancement??0)>=1);
 if(!target||!unlocked||tick<(a[ready]||0)||distance(a,target)>sk.range)return false;
 a[ready]=tick+sk.cooldown*10;scheduleCombatSkill(a,target,tick,slot);return true;
}
function onLine(origin,angle,target,length,width){const dx=target.x-origin.x,dy=target.y-origin.y,along=dx*Math.cos(angle)+dy*Math.sin(angle);return along>=-60&&along<=length+60&&Math.abs(-dx*Math.sin(angle)+dy*Math.cos(angle))<=width;}
export function stepCombatSkills(a,targets,tick,hit,emit=()=>{}){
 for(const slot of [1,2]){
  if(a.classId==='priest'){stepPriest(a,targets,tick,slot,hit,emit);continue;}
  const cast=a[key(slot)];if(!cast)continue;
  const sk=skillFor(a.classId,slot),primary=targets.find(t=>t.id===cast.targetId)||targets[0]||cast.target;
  if(!cast.announced){
   emit({kind:slot===1?'first':'second-sequence',phase:'charge',slot,classId:a.classId,owner:a.id,x:cast.target.x,y:cast.target.y,fromX:cast.origin.x,fromY:cast.origin.y,angle:cast.angle,size:slot===1?500:540,start:cast.start,end:cast.start+(slot===1?16:sk.pulses.at(-1).at+5)});cast.announced=true;
  }
  while(cast.visual<sk.pulses.length){
   const i=cast.visual,p=sk.pulses[i],lead=slot===1?0:Math.min(p.at,['lance','snipe','scatter'].includes(sk.mode)?4:2);
   if(tick<cast.start+p.at-lead)break;
   let aim=slot===2&&['lance','scatter'].includes(sk.mode)?primary:cast.target;
   if(slot===2&&sk.mode==='snipe'){const dx=primary.x-cast.origin.x,dy=primary.y-cast.origin.y,along=Math.max(100,Math.min(sk.range,dx*Math.cos(cast.angle)+dy*Math.sin(cast.angle)));aim={x:cast.origin.x+Math.cos(cast.angle)*along,y:cast.origin.y+Math.sin(cast.angle)*along};}
   if(p.close&&distance(cast.origin,primary)>440){const side=i%2?1:-1;aim={x:aim.x-Math.sin(cast.angle)*350*side,y:aim.y+Math.cos(cast.angle)*350*side};}
   cast.aims[i]={x:aim.x,y:aim.y};
   if(slot===2)emit({kind:'second-sequence',phase:'pulse',slot,classId:a.classId,owner:a.id,x:aim.x,y:aim.y,fromX:cast.origin.x,fromY:cast.origin.y,angle:cast.angle,pulse:i,close:p.close,final:i>=sk.pulses.length-(a.classId==='rogue'||a.classId==='pirate'?2:1),size:sk.mode==='cross'?540:600,start:cast.start+p.at-lead,impact:cast.start+p.at,end:cast.start+p.at+(i===sk.pulses.length-1?9:6)});
   cast.visual++;
  }
  while(cast.next<sk.pulses.length&&tick>=cast.start+sk.pulses[cast.next].at){
   const i=cast.next,p=sk.pulses[i],aim=cast.aims[i]||cast.target;
   for(const target of targets){
    if(p.close&&distance(cast.origin,target)>440)continue;
    let matches;
    if(slot===1)matches=distance(a,target)<=790&&distance(target,cast.target)<=360;
    else if(sk.mode==='snipe')matches=onLine(cast.origin,cast.angle,target,sk.range,140);
    else if(sk.mode==='fissure')matches=i===sk.pulses.length-1?distance(aim,target)<=360:onLine(cast.origin,cast.angle,target,sk.range,240);
    else matches=distance(aim,target)<=(sk.mode==='cross'?360:240);
    if(matches)hit(p.damage,sk.critAdd||0,target,slot);
   }
   cast.next++;
  }
  if(cast.next===sk.pulses.length)delete a[key(slot)];
 }
}
