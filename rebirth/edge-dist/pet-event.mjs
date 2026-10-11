export const PET_ID='moonfox-lumi';
export const PET_NAME='달빛 여우 루미';
export const PET_EVENT={id:'lumi-202609',start:Date.parse('2026-09-29T14:51:35+00:00'),end:Date.parse('2026-10-06T14:51:35+00:00'),adminOnly:false,cost:20000,pity:200};
export const PET_REWARDS=[{key:'pet',name:PET_NAME,amount:1,cap:1,rate:0.5},{key:'gear',name:'100레벨 랜덤 보스 장비',amount:1,cap:1,rate:1},{key:'gold',name:'골드',amount:1000,rate:33.5},{key:'fragment',name:'장비 파편',amount:10,rate:25},{key:'cube',name:'레드 큐브',amount:1,rate:20},{key:'highCube',name:'블랙 큐브',amount:1,cap:10,rate:10},{key:'scroll',name:'잠재 해금 주문서',amount:1,cap:10,rate:10}];
export function petProgress(s){return s.petEvents?.[PET_EVENT.id]||{draws:0,counts:{}};}
export function petRates(s){const p=petProgress(s);let extra=0;const rows=PET_REWARDS.map(r=>{const exhausted=r.cap&&((p.counts[r.key]||0)>=r.cap||(r.key==='pet'&&s.pets?.includes(PET_ID)));if(exhausted)extra+=r.rate;return {...r,remaining:r.cap?Math.max(0,r.cap-Math.max(p.counts[r.key]||0,r.key==='pet'&&s.pets?.includes(PET_ID)?1:0)):null,rate:exhausted?0:r.rate};});rows.find(r=>r.key==='gold').rate+=extra;return rows;}
export function summonPet(s,count,ctx,grantGear){
 if(PET_EVENT.adminOnly&&ctx.admin!==true)throw Error('관리자만 시험 소환할 수 있습니다.');
 if(ctx.now<PET_EVENT.start||ctx.now>=PET_EVENT.end)throw Error('펫 소환 이벤트 기간이 아닙니다.');
 if(count!==1&&count!==5)throw Error('INVALID_DRAW_COUNT');
 s.petEvents||={};const p=s.petEvents[PET_EVENT.id]||={draws:0,counts:{}};
 const limit=count;
 if(s.gold<limit*PET_EVENT.cost)throw Error('INSUFFICIENT_GOLD');
 const rewards=[];
 for(let i=0;i<limit;i++){
  let reward;if(!s.pets?.includes(PET_ID)&&!p.counts.pet&&p.draws>=PET_EVENT.pity-1)reward=PET_REWARDS[0];else{let roll=ctx.random()*100;reward=petRates(s).find(r=>(roll-=r.rate)<0)||PET_REWARDS[2];}
  s.gold-=PET_EVENT.cost;p.draws++;p.counts[reward.key]=(p.counts[reward.key]||0)+1;
  const result={key:reward.key,name:reward.name,amount:reward.amount};
  if(reward.key==='pet'){s.pets||=[];s.pets.push(PET_ID);}else if(reward.key==='gear'){result.item=grantGear();}else if(reward.key==='gold')s.gold+=reward.amount;else s.materials[reward.key]=(s.materials[reward.key]||0)+reward.amount;
  rewards.push(result);
 }
 const result={type:'petSummon',rewards,draws:p.draws,cost:rewards.length*PET_EVENT.cost,unused:(count-rewards.length)*PET_EVENT.cost};p.lastResult=result;return result;
}
export function equipPet(s,id){if(id!==null&&(id!==PET_ID||!s.pets?.includes(id)))throw Error('보유하지 않은 펫입니다.');s.equippedPet=id;}
export function petHealTick(members,tick){
 for(const m of members){
  if(m.power?.pet!==PET_ID||m.hp<=0||m.left)continue;
  const missing=Math.max(0,m.power.hp-m.hp);
  if(m.petReadyTick==null){if(missing<m.power.hp*.08)continue;}
  else if(tick<m.petReadyTick)continue;
  if(missing<=0)continue;
  const amount=Math.min(missing,Math.max(1,Math.round(m.power.hp*.08)));
  m.hp+=amount;m.petReadyTick=tick+300;m.petHealAmount=amount;m.petHealUntil=tick+12;
 }
}
// Field hits arrive every 1.5s. First heal follows the hit losing 8% HP;
// subsequent heals follow every 20 hits (30s), provided the owner survives.
function fieldPetStart(maxHp,damage){
 const first=Math.ceil(maxHp*.08/damage),heal=Math.max(1,Math.round(maxHp*.08));
 return {first,hp:Math.min(maxHp,maxHp-first*damage+heal),loss:20*damage-heal};
}
export function fieldPetDeath(maxHp,damage){
 if(damage<=0)return Infinity;
 const {first,hp,loss}=fieldPetStart(maxHp,damage);
 if(first*damage>=maxHp)return Math.ceil(maxHp/damage)*1.5;
 if(hp<=20*damage)return (first+Math.ceil(hp/damage))*1.5;
 if(loss<=0)return Infinity;
 const cycles=Math.max(0,Math.ceil((hp-20*damage)/loss));
 return (first+cycles*20+Math.ceil((hp-cycles*loss)/damage))*1.5;
}
export function fieldPetHP(maxHp,damage,seconds){
 if(damage<=0)return maxHp;
 if(seconds>=fieldPetDeath(maxHp,damage))return 0;
 const hits=Math.max(0,Math.floor(seconds/1.5)),{first,hp,loss}=fieldPetStart(maxHp,damage);
 if(hits<first)return maxHp-hits*damage;
 const cycles=Math.floor((hits-first)/20),rem=(hits-first)%20;
 return Math.max(0,Math.min(maxHp,hp-cycles*loss)-rem*damage);
}
