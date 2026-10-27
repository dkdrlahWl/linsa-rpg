// 동료 카드 (서버 판정).
// 소환권으로 카드를 뽑고, 3칸에 배치하면 칸마다 분당 골드가 최대 8시간 쌓인다.
// 같은 캐릭터 카드끼리 합성하면 별이 오른다. 전투·아레나에는 영향 없음.
export const COMPANION_GRADES=['S','A','B','C','D','F'];
export const COMPANION_GRADE_RATES={S:.01,A:.05,B:.10,C:.20,D:.25,F:.39};
// id는 이미지 파일명(companions/<id>.webp)으로도 쓴다.
export const COMPANIONS=[
 {id:'s1',grade:'S',name:'엘리시아',min:4000,max:5000,weight:35},
 {id:'s2',grade:'S',name:'카이로스',min:3500,max:4400,weight:65},
 {id:'a1',grade:'A',name:'로제린',min:1500,max:2000,weight:50},
 {id:'a2',grade:'A',name:'레오닉',min:2000,max:2500,weight:30},
 {id:'a3',grade:'A',name:'이사벨',min:2500,max:3000,weight:20},
 {id:'b1',grade:'B',name:'라파엘',min:800,max:1000,weight:50},
 {id:'b2',grade:'B',name:'시그문트',min:1000,max:1200,weight:30},
 {id:'b3',grade:'B',name:'아델린',min:1200,max:1500,weight:20},
 {id:'c1',grade:'C',name:'에드릭',min:400,max:500,weight:50},
 {id:'c2',grade:'C',name:'셀레네',min:500,max:600,weight:30},
 {id:'c3',grade:'C',name:'루시안',min:600,max:800,weight:20},
 {id:'d1',grade:'D',name:'카밀라',min:200,max:250,weight:50},
 {id:'d2',grade:'D',name:'테오도르',min:250,max:300,weight:30},
 {id:'d3',grade:'D',name:'비올라',min:300,max:400,weight:20},
 {id:'f1',grade:'F',name:'에리온',min:50,max:80,weight:40},
 {id:'f2',grade:'F',name:'클라리스',min:80,max:110,weight:30},
 {id:'f3',grade:'F',name:'줄리안',min:110,max:140,weight:20},
 {id:'f4',grade:'F',name:'에블린',min:140,max:180,weight:10},
];
export const COMPANION_BY_ID=Object.fromEntries(COMPANIONS.map(c=>[c.id,c]));
// 패시브: 종류는 1/3씩, 수치는 등급 상관없이 같은 범위에서 랜덤(%).
export const COMPANION_PASSIVES={
 gold:{name:'골드형',min:20,max:40,text:v=>`분당 골드 +${v}%`},
 growth:{name:'성장형',min:30,max:50,text:v=>`배치 1시간마다 +10%, 최대 +${v}%`},
 jackpot:{name:'대박형',min:20,max:40,text:v=>`수령 시 ${v}% 확률로 골드 2배`},
};
export const COMPANION_PASSIVE_KEYS=['gold','growth','jackpot'];
export const COMPANION_SLOTS=3;
export const COMPANION_BAG=100;
export const COMPANION_MAX_STAR=5;
export const COMPANION_STAR_BONUS=.15;
export const COMPANION_GROWTH_STEP=.10;
export const COMPANION_CAP_MS=8*3600e3;
export const COMPANION_SELL={S:1000000,A:300000,B:100000,C:30000,D:10000,F:3000};
const MIN=60e3;
const fail=m=>{throw new Error(m);};
const check=(ok,m)=>{if(!ok)fail(m);};
const rint=(random,min,max)=>min+Math.floor(random()*(max-min+1));

export function normalizeCompanions(s){
 const c=s.companions&&typeof s.companions==='object'?s.companions:{};
 c.tickets=Number.isInteger(c.tickets)&&c.tickets>=0?c.tickets:0;
 c.nextId=Number.isInteger(c.nextId)&&c.nextId>0?c.nextId:1;
 c.cards=Array.isArray(c.cards)?c.cards.filter(x=>x&&COMPANION_BY_ID[x.c]):[];
 // Preserve the original roll percentile when upgrading legacy 15~30% jackpots.
 if(c.passiveVersion!==2){
  c.cards=c.cards.map(card=>card.t==='jackpot'&&Number.isInteger(card.v)&&card.v>=15&&card.v<=30?{...card,v:20+Math.round((card.v-15)*20/15)}:card);
  c.passiveVersion=2;
 }
 const slots=Array.isArray(c.slots)?c.slots:[];
 c.slots=Array.from({length:COMPANION_SLOTS},(_,i)=>{const v=slots[i];return v&&c.cards.some(x=>x.i===v.card)?v:null;});
 c.summoned=Number.isInteger(c.summoned)?c.summoned:0;
 s.companions=c;return c;
}
export function rollGrade(random){
 let r=random();
 for(const g of COMPANION_GRADES){r-=COMPANION_GRADE_RATES[g];if(r<0)return g;}
 return 'F';
}
// Within each grade, better base-income characters have lower weights.
export function rollCompanionCharacter(grade,random){
 const pool=COMPANIONS.filter(c=>c.grade===grade),total=pool.reduce((sum,c)=>sum+c.weight,0);
 let roll=random()*total;
 for(const c of pool){roll-=c.weight;if(roll<0)return c;}
 return pool[pool.length-1];
}
export const companionSummonChance=id=>{const c=COMPANION_BY_ID[id];return c?COMPANION_GRADE_RATES[c.grade]*c.weight/COMPANIONS.filter(d=>d.grade===c.grade).reduce((sum,d)=>sum+d.weight,0):0;};
// Descending integer weights: lowest 21, highest 1 (total 231).
export function companionPassiveValueChance(type,value){
 const p=COMPANION_PASSIVES[type];if(!p||!Number.isInteger(value)||value<p.min||value>p.max)return 0;
 const n=p.max-p.min+1;return (p.max-value+1)/(n*(n+1)/2);
}
export function rollCompanionPassiveValue(type,random){
 const p=COMPANION_PASSIVES[type],n=p.max-p.min+1;let roll=random()*n*(n+1)/2;
 for(let v=p.min;v<=p.max;v++){roll-=p.max-v+1;if(roll<0)return v;}
 return p.max;
}
export function rollCompanion(random,id){
 const grade=rollGrade(random),def=rollCompanionCharacter(grade,random);
 const t=COMPANION_PASSIVE_KEYS[Math.floor(random()*3)],p=COMPANION_PASSIVES[t];
 return {i:id,c:def.id,r:rint(random,def.min,def.max),t,v:rollCompanionPassiveValue(t,random),s:1};
}
// 0~100: 분당 골드와 패시브 수치가 각자 범위에서 얼마나 높게 떴는지의 평균.
export function companionQuality(card){
 const d=COMPANION_BY_ID[card.c],p=COMPANION_PASSIVES[card.t];
 const a=d.max>d.min?(card.r-d.min)/(d.max-d.min):1,b=p.max>p.min?(card.v-p.min)/(p.max-p.min):1;
 return Math.round((a+b)/2*100);
}
const starMul=card=>1+COMPANION_STAR_BONUS*((card.s||1)-1);
const growthAt=(card,ms)=>Math.min(card.v/100,COMPANION_GROWTH_STEP*Math.floor(Math.max(0,ms)/3600e3));
// 지금 화면에 보여줄 분당 골드 (성장형은 현재 성장치 포함).
export function companionRate(card,placedMs=0){
 let rate=card.r*starMul(card);
 if(card.t==='gold')rate*=1+card.v/100;
 if(card.t==='growth')rate*=1+growthAt(card,placedMs);
 return rate;
}
export function companionMaxRate(card){
 return card.r*starMul(card)*(card.t==='gold'||card.t==='growth'?1+card.v/100:1);
}
// 배치 칸 하나에 지금까지 쌓인 골드(대박형 2배 판정 전).
export function slotAccrued(card,slot,now){
 const from=slot.claimedAt,to=Math.min(now,slot.claimedAt+COMPANION_CAP_MS);
 if(!(to>from))return 0;
 if(card.t!=='growth')return Math.floor(companionRate(card)*(to-from)/MIN);
 // 성장형: 시간 구간마다 배율이 다르므로 1시간 경계로 나눠 합산.
 let sum=0,t=from;
 while(t<to){const placed=t-slot.placedAt,next=Math.min(to,slot.placedAt+(Math.floor(placed/3600e3)+1)*3600e3);sum+=companionRate(card,placed)*(next-t)/MIN;t=next;}
 return Math.floor(sum);
}
// Compare production over the next full 8h window, including stepped growth
// and jackpot expected value. Keep the age of an already-placed growth card.
export function companionExpectedGold(card,placedMs=0){
 const gold=slotAccrued(card,{placedAt:-Math.max(0,placedMs),claimedAt:0},COMPANION_CAP_MS);
 return gold*(card.t==='jackpot'?1+card.v/100:1);
}
export function optimalCompanions(cards,slots,now){
 const active=new Map(slots.filter(Boolean).map(slot=>[slot.card,slot]));
 return cards.map(card=>({card,gold:companionExpectedGold(card,active.has(card.i)?now-active.get(card.i).placedAt:0)}))
  .sort((a,b)=>b.gold-a.gold||Number(active.has(b.card.i))-Number(active.has(a.card.i))||a.card.i-b.card.i)
  .slice(0,COMPANION_SLOTS);
}
function claimSlot(s,c,index,ctx){
 const slot=c.slots[index];if(!slot)return null;
 const card=c.cards.find(x=>x.i===slot.card);
 let gold=slotAccrued(card,slot,ctx.now),jackpot=false;
 if(gold>0&&card.t==='jackpot'&&ctx.random()<card.v/100){gold*=2;jackpot=true;}
 s.gold=Math.min(9e12,(s.gold||0)+gold);
 slot.claimedAt=ctx.now;
 return {slot:index,card:card.i,gold,jackpot};
}
const cardById=(c,id)=>c.cards.find(x=>x.i===id);
const placedIndex=(c,id)=>c.slots.findIndex(x=>x&&x.card===id);
const ids=v=>Array.isArray(v)?v:[];

export function companionCommand(s,command,args,ctx){
 const c=normalizeCompanions(s);
 if(command==='companionSummon'){
  const count=args.count??1;
  check(count===1||count===5,'COMPANION_INVALID_SUMMON_COUNT');
  check(s.isAdmin||c.tickets>=count,'COMPANION_NO_TICKET');
  check(c.cards.length+count<=COMPANION_BAG,'COMPANION_BAG_FULL');
  if(!s.isAdmin)c.tickets-=count;
  const cards=[];
  for(let k=0;k<count;k++){const card=rollCompanion(ctx.random,c.nextId++);c.cards.push(card);cards.push(card);}
  c.summoned+=count;
  return {type:'companionSummon',cards};
 }
 if(command==='companionAutoEquip'){
  check(c.cards.length>0,'COMPANION_NOT_FOUND');
  const best=optimalCompanions(c.cards,c.slots,ctx.now),chosen=new Set(best.map(x=>x.card.i));
  const keep=new Set(c.slots.filter(slot=>slot&&chosen.has(slot.card)).map(slot=>slot.card));
  const pending=best.filter(x=>!keep.has(x.card.i)).map(x=>x.card),claims=[];
  let changed=0;
  for(let i=0;i<COMPANION_SLOTS;i++){
   const slot=c.slots[i];
   if(slot&&keep.has(slot.card))continue;
   if(slot){const claim=claimSlot(s,c,i,ctx);if(claim)claims.push(claim);}
   const card=pending.shift();
   c.slots[i]=card?{card:card.i,placedAt:ctx.now,claimedAt:ctx.now}:null;
   if(slot||card)changed++;
  }
  return {type:'companionAutoEquip',ids:best.map(x=>x.card.i),expectedGold:best.reduce((sum,x)=>sum+x.gold,0),changed,claims};
 }
 if(command==='companionPlace'){
  const index=args.slot,card=cardById(c,args.id);
  check(Number.isInteger(index)&&index>=0&&index<COMPANION_SLOTS,'COMPANION_INVALID_SLOT');
  check(card,'COMPANION_NOT_FOUND');
  check(placedIndex(c,card.i)<0,'COMPANION_ALREADY_PLACED');
  const claim=claimSlot(s,c,index,ctx);
  c.slots[index]={card:card.i,placedAt:ctx.now,claimedAt:ctx.now};
  return {type:'companionPlace',slot:index,id:card.i,claim};
 }
 if(command==='companionUnplace'){
  const index=args.slot;
  check(Number.isInteger(index)&&c.slots[index],'COMPANION_INVALID_SLOT');
  const claim=claimSlot(s,c,index,ctx);c.slots[index]=null;
  return {type:'companionUnplace',slot:index,claim};
 }
 if(command==='companionClaim'){
  const index=args.slot;
  check(Number.isInteger(index)&&c.slots[index],'COMPANION_INVALID_SLOT');
  return {type:'companionClaim',...claimSlot(s,c,index,ctx)};
 }
 if(command==='companionMerge'){
  const main=cardById(c,args.id),mats=ids(args.materials);
  check(main,'COMPANION_NOT_FOUND');
  check(main.s<COMPANION_MAX_STAR,'COMPANION_MAX_STAR');
  check(mats.length===main.s&&new Set(mats).size===mats.length&&!mats.includes(main.i),'COMPANION_MERGE_COUNT');
  const list=mats.map(id=>cardById(c,id));
  check(list.every(x=>x&&x.c===main.c),'COMPANION_MERGE_MISMATCH');
  check(list.every(x=>placedIndex(c,x.i)<0),'COMPANION_PLACED');
  // 배치 중인 메인 카드는 지금까지의 골드를 옛 별 기준으로 먼저 정산한다.
  const at=placedIndex(c,main.i),claim=at>=0?claimSlot(s,c,at,ctx):null;
  c.cards=c.cards.filter(x=>!mats.includes(x.i));main.s++;
  return {type:'companionMerge',id:main.i,star:main.s,claim};
 }
 if(command==='companionSell'){
  const list=ids(args.ids);
  check(list.length>0&&list.length<=COMPANION_BAG&&new Set(list).size===list.length,'COMPANION_NOT_FOUND');
  const cards=list.map(id=>cardById(c,id));
  check(cards.every(Boolean),'COMPANION_NOT_FOUND');
  check(cards.every(x=>placedIndex(c,x.i)<0),'COMPANION_PLACED');
  const gold=cards.reduce((n,x)=>n+COMPANION_SELL[COMPANION_BY_ID[x.c].grade]*(x.s||1),0);
  c.cards=c.cards.filter(x=>!list.includes(x.i));
  s.gold=Math.min(9e12,(s.gold||0)+gold);
  return {type:'companionSell',count:cards.length,gold};
 }
 fail('COMPANION_UNKNOWN');
}
