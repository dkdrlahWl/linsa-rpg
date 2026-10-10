import {petHealTick} from './pet-event.mjs?v=citadel-independent-214';
// Support uses the caster's maximum HP; same scheduler in solo and multiplayer.
export const PRIEST_HP_ATTACK_RATIO=.166;
export const PRIEST_LUK_ATTACK_RATIO=.6;
export const PRIEST_OFFENSE_POTENTIAL_RATE=1;
export const PRIEST_GEAR_ATTACK_RATIO=.2;
export const PRIEST_HP_POTENTIAL_ATTACK_RATE=.7;
export function priestAttack(hp,luk,gearAttack,attackPercent,hpPercent=0,lukPercent=0){
 // HP potential retains its full health benefit. Its attack increase is linear
 // at 70% of an equal attack potential, without scaling the HP term twice.
 const baseHP=hp/(1+hpPercent/100),baseLUK=luk/(1+lukPercent/100);
 const lukRate=Math.min(PRIEST_LUK_ATTACK_RATIO,baseHP*PRIEST_HP_ATTACK_RATIO*.8/Math.max(1,baseLUK));
 return (baseHP*PRIEST_HP_ATTACK_RATIO+luk*lukRate+gearAttack*PRIEST_GEAR_ATTACK_RATIO)*(1+(attackPercent+hpPercent*PRIEST_HP_POTENTIAL_ATTACK_RATE)/100);
}
export const PRIEST_SKILLS={
 1:{name:'성광 심판',type:'attack',cooldown:10,range:2100,radius:650,hits:3,damage:.6,interval:2,hpRatio:.007,description:'성광 3발 · 총 공격력 180% + 사제 최대 HP 2.1%'},
 2:{name:'생명의 기도',type:'sequence',cooldown:15,range:1500,radius:1500,hits:1,damage:2,interval:1,hpRatio:.014,description:'주변 아군 각각 사제 최대 HP 20% 즉시 회복 · 공격력 200% + 최대 HP 1.4% 피해'},
 3:{name:'성역의 결계',type:'attack',cooldown:24,range:1500,radius:1500,hits:1,damage:4.5,interval:1,hpRatio:.035,art:5,description:'주변 아군 각각 사제 최대 HP 30% 보호막 · 보호막이 남아 있는 동안 받는 피해 10% 감소 · 중첩 가능 · 피해로 소진될 때까지 유지 · 공격력 450% + 최대 HP 3.5% 피해'},
 5:{name:'대천사 강림',type:'attack',cooldown:30,range:1500,radius:1550,hits:8,damage:1.75,interval:10,hpRatio:.013125,description:'200레벨 · 사제를 따라오는 8초 성역 · 시전 시 아군 각각 사제 최대 HP 100% 즉시 회복 · 시전 시 범위 내 사망한 아군을 각자 최대 HP 50%로 부활 · 공격력 1400% + 최대 HP 10.5% 피해'},
 4:{name:'천상의 심판',type:'attack',cooldown:30,range:2100,radius:1250,hits:8,damage:1.25,interval:10,hpRatio:.00875,art:5,description:'8초 성광 폭격 · 범위 내 아군 매초 사제 최대 HP 5%씩 총 8회 회복 · 범위 내 공격력 10% 증가 · 공격력 1000% + 최대 HP 7% 피해'}
};
const keys={1:'firstCast',2:'secondCast',3:'thirdCast',4:'fourthCast',5:'fifthCast'},ready={1:'ultimateReady',2:'skillReady',3:'thirdReady',4:'fourthReady',5:'fifthReady'};
export function beginPriest(a,target,tick,slot){
 const sk=PRIEST_SKILLS[slot],stage=a.advancement??a.power?.advancement??0;
 if(slot===5?(a.power?.level||0)<200:slot===1?a.power?.firstJob===false:stage<slot-1)return false;
 if(tick<(a[ready[slot]]||0))return false;
 if((slot===1||slot===4)&&(!target||Math.hypot(a.x-target.x,a.y-target.y)>sk.range))return false;
 a[ready[slot]]=tick+sk.cooldown*10;return schedulePriest(a,target,tick,slot);
}
export function schedulePriest(a,target,tick,slot){const sk=PRIEST_SKILLS[slot],x=slot===2||slot===3||slot===5?a.x:target.x,y=slot===2||slot===3||slot===5?a.y:target.y;a[keys[slot]]={holy:true,slot,x,y,start:tick,next:tick+(slot===1?3:0),left:sk.hits};if(slot===4||slot===5){a.holyAreas||=[];a.holyAreas.push({slot,x,y,r:sk.radius,start:tick,end:tick+80});}a.skillStart=tick;a.skillUntil=tick+8;return true;
}
export function stepPriest(a,targets,tick,slot,hit,emit=()=>{}){
 const cast=a[keys[slot]];if(!cast?.holy)return false;const sk=PRIEST_SKILLS[slot];
 while(cast.left&&tick>=cast.next){
  if(slot>=2)(a.holySupport||=[]).push({slot,x:slot===4?cast.x:a.x,y:slot===4?cast.y:a.y,r:sk.radius,revive:slot===5&&cast.left===sk.hits,amount:a.power.hp*(slot===2?.20:slot===3?.30:slot===5?(cast.left===sk.hits?1:0):.05),at:cast.next});
  if(slot===5){cast.x=a.x;cast.y=a.y;}
  for(const target of targets)if(target&&Math.hypot(target.x-cast.x,target.y-cast.y)<=sk.radius){a.holyFlatDamage=a.power.hp*sk.hpRatio;try{hit(sk.damage,0,target,slot);}finally{a.holyFlatDamage=0;}}
  if(slot!==5||cast.left===sk.hits)emit({kind:'priest',slot,classId:'priest',owner:a.id,x:cast.x,y:cast.y,size:sk.radius*2,start:slot===5?cast.start:cast.next-(slot===1?3:0),end:slot===5?cast.start+80:slot>=4?Math.min(cast.start+80,cast.next+12):cast.next+18,follow:slot===5,pulse:sk.hits-cast.left});cast.left--;cast.next+=sk.interval;
 }
 if(!cast.left)delete a[keys[slot]];return true;
}
export function supportTick(members,tick,numbers=[],effects=[],serial=()=>0){
 petHealTick(members,tick);
 for(const m of members){m.holyAttackUntil=0;m.holyReductionUntil=0;if(!m.shieldPermanent&&tick>=(m.shieldUntil||0))m.shield=0;}
 for(const a of members){a.holyAreas=(a.holyAreas||[]).filter(p=>p.end>tick);if(a.hp<=0||a.left){a.holyAreas=[];continue;}for(const p of a.holyAreas){if(p.slot===5){p.x=a.x;p.y=a.y;}for(const m of members){if(m.hp<=0||m.left||Math.hypot(m.x-p.x,m.y-p.y)>p.r)continue;if(p.slot===4)m.holyAttackUntil=Math.max(m.holyAttackUntil,p.end);}}}
 for(const a of members){if(a.hp<=0||a.left){a.holySupport=[];continue;}for(const p of a.holySupport||[]){for(const m of members){if(m.left||Math.hypot(m.x-p.x,m.y-p.y)>p.r)continue;
  if(m.hp<=0){
   if(!p.revive)continue;
   m.hp=Math.max(1,Math.round(m.power.hp*.5));m.reviveProgress=0;m.reviver=null;m.purifiedUntil=tick+210;
   m.shield=0;m.holyAreas=[];m.holySupport=[];
   for(const key of ['firstCast','secondCast','thirdCast','fourthCast','fifthCast','pendingHit','pendingHits','pendingSkill'])delete m[key];
   a.healing=(a.healing||0)+m.hp;
   numbers.push({id:serial(),value:m.hp,x:m.x,y:m.y-110,kind:'heal',start:tick,end:tick+9});
   continue;
  }
  if(p.slot===3){const amount=Math.round(p.amount);m.shield=(m.shield||0)+amount;m.shieldPermanent=true;m.shieldUntil=0;m.shieldOwner=a.id;a.shieldGiven=(a.shieldGiven||0)+amount;continue;}
  // One strongest copy of a ground heal per second; direct prayers may be coordinated.
  if(p.slot===4){if(m.holyHealTick===Math.floor(p.at/10)&&p.amount<=(m.holyHealAmount||0))continue;const previous=m.holyHealTick===Math.floor(p.at/10)?m.holyHealAmount||0:0;m.holyHealTick=Math.floor(p.at/10);m.holyHealAmount=p.amount;heal(m,p.amount-previous,a);}else heal(m,p.amount,a);
  m.purifiedUntil=tick+210;
 }}a.holySupport=[];}
 function heal(m,value,a){const actual=Math.min(m.power.hp-m.hp,Math.max(0,Math.round(value)));m.hp+=actual;a.healing=(a.healing||0)+actual;if(actual)numbers.push({id:serial(),value:actual,x:m.x,y:m.y-110,kind:'heal',start:tick,end:tick+9});}
}
export function absorbDamage(a,damage,tick){if(tick<(a.fifthGuardUntil||0))damage*=.8;const shield=a.shieldPermanent||tick<(a.shieldUntil||0)?a.shield||0:0;if(shield>0)damage*=.90;const absorbed=Math.min(shield,damage);a.shield=Math.max(0,shield-absorbed);a.absorbed=(a.absorbed||0)+absorbed;return Math.max(0,damage-absorbed);}
export function holyDamage(a,damage,tick=a.tick||0){return damage*(tick<(a.holyAttackUntil||0)?1.1:1)+(a.holyFlatDamage||0);}
