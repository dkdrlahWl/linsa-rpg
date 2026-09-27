// Support uses the caster's maximum HP; same scheduler in solo and multiplayer.
export const PRIEST_SKILLS={
 1:{name:'성광 심판',type:'attack',cooldown:10,range:1800,radius:300,hits:3,damage:.6,interval:2,hpRatio:.01,description:'성광 3발 · 총 공격력 180% + 사제 최대 HP 3%'},
 2:{name:'생명의 기도',type:'sequence',cooldown:15,range:1100,radius:900,hits:1,damage:2,interval:1,hpRatio:.02,description:'주변 아군 각각 사제 최대 HP 15% 회복 · 공격력 200% + 최대 HP 2% 피해'},
 3:{name:'성역의 결계',type:'attack',cooldown:24,range:1100,radius:900,hits:1,damage:4.5,interval:1,hpRatio:.05,art:5,description:'주변 아군 각각 사제 최대 HP 25% 보호막 6초 · 공격력 450% + 최대 HP 5% 피해'},
 5:{name:'대천사 강림',type:'attack',cooldown:30,range:1100,radius:900,hits:8,damage:1.75,interval:10,hpRatio:.01875,description:'200레벨 · 8초 대천사 성역 · 공격력 1400% + 최대 HP 15% · 첫 회 최대 HP 10% 회복 · 아군 피해 15% 감소'},
 4:{name:'천상의 심판',type:'attack',cooldown:30,range:1800,radius:760,hits:8,damage:1.25,interval:10,hpRatio:.0125,art:5,description:'8초 성광 폭격 · 총 공격력 1000% + 최대 HP 10% · 범위 내 아군 초당 사제 최대 HP 1% 회복'}
};
const keys={1:'firstCast',2:'secondCast',3:'thirdCast',4:'fourthCast',5:'fifthCast'},ready={1:'ultimateReady',2:'skillReady',3:'thirdReady',4:'fourthReady',5:'fifthReady'};
export function beginPriest(a,target,tick,slot){
 const sk=PRIEST_SKILLS[slot],stage=a.advancement??a.power?.advancement??0;
 if(slot===5?(a.power?.level||0)<200:slot===1?a.power?.firstJob===false:stage<slot-1)return false;
 if(tick<(a[ready[slot]]||0))return false;
 if((slot===1||slot===4)&&(!target||Math.hypot(a.x-target.x,a.y-target.y)>sk.range))return false;
 a[ready[slot]]=tick+sk.cooldown*10;return schedulePriest(a,target,tick,slot);
}
export function schedulePriest(a,target,tick,slot){const sk=PRIEST_SKILLS[slot];a[keys[slot]]={holy:true,slot,x:slot===2||slot===3||slot===5?a.x:target.x,y:slot===2||slot===3||slot===5?a.y:target.y,start:tick,next:tick+3,left:sk.hits};a.skillStart=tick;a.skillUntil=tick+8;return true;
}
export function stepPriest(a,targets,tick,slot,hit,emit=()=>{}){
 const cast=a[keys[slot]];if(!cast?.holy)return false;const sk=PRIEST_SKILLS[slot];
 while(cast.left&&tick>=cast.next){
  if(slot>=2)(a.holySupport||=[]).push({slot,x:slot===4?cast.x:a.x,y:slot===4?cast.y:a.y,r:sk.radius,amount:a.power.hp*(slot===2?.15:slot===3?.25:slot===5?(cast.left===sk.hits?.1:0):.01),at:cast.next});
  if(slot===5){cast.x=a.x;cast.y=a.y;}
  for(const target of targets)if(target&&Math.hypot(target.x-cast.x,target.y-cast.y)<=sk.radius){a.holyFlatDamage=a.power.hp*sk.hpRatio;try{hit(sk.damage,0,target,slot);}finally{a.holyFlatDamage=0;}}
  emit({kind:'priest',slot,classId:'priest',owner:a.id,x:cast.x,y:cast.y,size:sk.radius*2,start:cast.next-3,end:cast.next+(slot===4?12:18),pulse:sk.hits-cast.left});cast.left--;cast.next+=sk.interval;
 }
 if(!cast.left)delete a[keys[slot]];return true;
}
export function supportTick(members,tick,numbers=[],effects=[],serial=()=>0){
 for(const a of members){if(a.hp<=0||a.left){a.holySupport=[];continue;}for(const p of a.holySupport||[]){for(const m of members){if(m.hp<=0||m.left||Math.hypot(m.x-p.x,m.y-p.y)>p.r)continue;
  if(p.slot===5)m.holyReductionUntil=tick+12;
  if(p.slot===3){const current=tick<(m.shieldUntil||0)?m.shield||0:0;if(p.amount>current){m.shield=Math.round(p.amount);m.shieldUntil=tick+60;m.shieldOwner=a.id;a.shieldGiven=(a.shieldGiven||0)+Math.round(p.amount);}continue;}
  // One strongest copy of a ground heal per second; direct prayers may be coordinated.
  if(p.slot===4){if(m.holyHealTick===Math.floor(p.at/10)&&p.amount<=(m.holyHealAmount||0))continue;const previous=m.holyHealTick===Math.floor(p.at/10)?m.holyHealAmount||0:0;m.holyHealTick=Math.floor(p.at/10);m.holyHealAmount=p.amount;heal(m,p.amount-previous,a);}else heal(m,p.amount,a);
  m.purifiedUntil=tick+210;
 }}a.holySupport=[];}
 function heal(m,value,a){const actual=Math.min(m.power.hp-m.hp,Math.max(0,Math.round(value)));m.hp+=actual;a.healing=(a.healing||0)+actual;if(actual)numbers.push({id:serial(),value:actual,x:m.x,y:m.y-110,kind:'heal',start:tick,end:tick+9});}
 for(const m of members)if(tick>=(m.shieldUntil||0))m.shield=0;
}
export function absorbDamage(a,damage,tick){if(tick<(a.holyReductionUntil||0))damage*=.85;const shield=tick<(a.shieldUntil||0)?a.shield||0:0,absorbed=Math.min(shield,damage);a.shield=Math.max(0,shield-absorbed);a.absorbed=(a.absorbed||0)+absorbed;return Math.max(0,damage-absorbed);}
export function holyDamage(a,damage){return (damage+(a.holyFlatDamage||0))*(a.classId==='priest'&&a.soloSupport?1.15:1);}
