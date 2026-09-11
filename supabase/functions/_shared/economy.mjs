import balance from './balance.json' with {type:'json'};
import pets from './pets.mjs';
export {balance};
export const itemKey=it=>it.slot+'|'+it.rarity+'|'+it.name;
const catalogue=new Map(balance.gear.map(it=>[itemKey(it),it]));
const fail=code=>{throw Error(code);};
const int=(v,min=0,max=Number.MAX_SAFE_INTEGER)=>{if(!Number.isSafeInteger(v)||v<min||v>max)fail('INVALID_ARGUMENTS');return v;};
const safeAdd=(a,b)=>int(int(a)+int(b));
const equipped=(s,it)=>Object.values(s.equipped||{}).includes(it.id);
export function itemAttack(it){const lv=Math.max(0,Math.min(15,it.enhance||0)),base=it.baseAtk,raw=base*(lv<=10?1+lv*.05:1.5+(lv-10)*.1),enhanced=lv?Math.max(Math.ceil(raw),Math.floor(base)+lv):Math.floor(base),t=Math.min(3,it.transcend||0),rate=it.slot==='무기'?(it.rarity>=6?.4:.45):(it.rarity>=6?.25:.3);return Math.floor(enhanced*(1+t*rate));}
export function options(it){const ratio=[.1,.25,.5,.75,1,1.35,1.75][it.rarity],defs={무기:['critChance',20],투구:['atkPercent',20],갑옷:['critDamage',50],바지:['atkPercent',20],신발:['critDamage',50],반지:['goldBonus',10],귀걸이:['goldBonus',12]},[key,value]=defs[it.slot],out=[[key,Number((value*ratio*(it.optionRolls?.[0]||1)).toFixed(1))]],t=it.transcend||0;if(t)out.push(['atkPercent',t*(it.rarity>=6?(it.slot==='무기'?40:25):(it.slot==='무기'?(it.rarity>=5?20:15):10))]);return out;}
export function stats(s,costumePercent=0){let equipmentAtk=0,atkPercent=0,critChance=0,critDamage=100,goldBonus=0;for(const id of Object.values(s.equipped||{})){const it=s.inventory.find(x=>x.id===id);if(!it)continue;equipmentAtk+=itemAttack(it);for(const [k,v]of options(it)){if(k==='atkPercent')atkPercent+=v;if(k==='critChance')critChance+=v;if(k==='critDamage')critDamage+=v;if(k==='goldBonus')goldBonus+=v;}}
 for(const id of new Set(s.ownedAuras||[]))atkPercent+=balance.auras[id]?.attackPercent||0;
 critChance=Math.min(75,critChance);const pet=s.ownedPets?.find(x=>x.uid===s.equippedPet),p=pet?balance.petLevelStats[pet.petId]?.[pet.level-1]||{}:{};
 atkPercent+=(p.attackPercent||0)*100;critChance=Math.min(95,critChance+(p.critRate||0)*100);critDamage+=(p.critDamage||0)*100;const attackSpeed=1+(p.attackSpeed||0),attack=Math.floor((50+equipmentAtk+(p.attack||0))*(1+atkPercent/100)*attackSpeed);
 return {attack:Math.floor(attack*(1+costumePercent/100)),equipmentAtk,atkPercent,critChance,critDamage,goldBonus,attackSpeed};
}
const summonLevel=exp=>balance.levelReq.reduce((lv,n,i)=>exp>=n?i+1:lv,1);
const costs=[250,250,250,500,500,500,1000,1000,1000,2500,2500,2500,6000,6000,6000];
const kstDay=now=>new Date(now+9*3600000).toISOString().slice(0,10);
const dailyKey=now=>'midnight-v2:'+kstDay(now);
const seedValue=(seed,n)=>{let h=2166136261;for(const c of String(seed)+'|'+n)h=Math.imul(h^c.charCodeAt(0),16777619);return .8+((h>>>0)%401)/1000;};
export function initialState(now){return {gold:0,essence:0,transcendStone:0,downgradeProtect:0,useProtect:false,dungeonTickets:0,inventory:[],equipped:{},summons:{weapon:{exp:0,level:1},armor:{exp:0,level:1},accessory:{exp:0,level:1}},regionIndex:0,bossIndex:0,autoBattle:true,lastSeen:now,uid:1,playerName:'모험가',playerUid:'',playerGender:'male',sfxOn:true,bgmOn:true,discovered:{},mailbox:[],mailFlags:{},dailyRewardClaims:{},collectionClaims:{},ownedAuras:[],equippedAura:-1,towerCleared:0,dungeons:{date:kstDay(now),goldEntries:2,goldUnlocked:1,partyFree:2,petEntries:2},ownedPets:[],discoveredPets:[],claimedPetCollectionRewards:[],petStone:0,petTicket:0,petSummonExp:0,monsterProgressionVersion:3,monsterUnlockStep:0};}
// Context is supplied by the trusted Edge Function, never by the browser:
// now, RNG, globally allocated item IDs, admin floor, and costume ownership bonus.
export function execute(snapshot,command,args,context){
 const events=[],now=int(context.now),s={...initialState(now),...structuredClone(snapshot)},random=()=>{const n=context.random();if(!Number.isFinite(n)||n<0||n>=1)fail('INVALID_RANDOM');return n;};
 if(!Array.isArray(s.inventory))fail('INVALID_STATE');
 s.equipped??={};s.summons??={};s.ownedAuras??=[];s.mailbox??=[];s.collectionClaims??={};
 for(const group of ['weapon','armor','accessory']){s.summons[group]??={exp:s.summonExp||0};s.summons[group].exp=int(s.summons[group].exp||0);s.summons[group].level=summonLevel(s.summons[group].exp);}
 const missingDiscovery=snapshot.discovered==null;s.discovered??={};
 for(const it of s.inventory){
  const template=catalogue.get(itemKey(it));
  if(!template)fail('UNKNOWN_EQUIPMENT');
  it.baseAtk??=template.baseAtk;it.enhance??=0;it.transcend??=0;
  it.optionRolls??=[seedValue(it.legacyId??it.id,0),seedValue(it.legacyId??it.id,1)];
  if(missingDiscovery)s.discovered[itemKey(it)]=true;
 }
 if(s.collectionClaims[50]&&!s.aura50TicketGranted){s.aura50TicketGranted=true;s.auraDrawTickets=safeAdd(s.auraDrawTickets||0,1);}
 const spend=(key,n)=>{int(n);if((s[key]||0)<n)fail('INSUFFICIENT_'+key.toUpperCase());s[key]=Math.max(context.adminFloor||0,s[key]-n);};
 const award=(key,n)=>{s[key]=Math.max(context.adminFloor||0,safeAdd(s[key]||0,n));};
 const gear=id=>{int(id,1);const it=s.inventory.find(x=>x.id===id);if(!it)fail('ITEM_NOT_OWNED');return it;};
 const freshId=()=>{const id=context.itemIds.shift();int(id,1);if(s.inventory.some(x=>x.id===id))fail('ITEM_ID_COLLISION');return id;};
 const addItem=template=>{const id=freshId(),it={...template,id,auctionUid:context.uuid(),enhance:template.enhance||0,transcend:template.transcend||0};s.discovered??={};it.isNew=!s.discovered[itemKey(it)];s.discovered[itemKey(it)]=true;s.inventory.unshift(it);s.uid=Math.max(s.uid||1,id+1);return it;};
 if(!args||typeof args!=='object'||Array.isArray(args))fail('INVALID_ARGUMENTS');
 const allowed={sync:[],background:[],daily:[],summon:['group','count'],enhance:['id','protect'],transcend:['id'],equip:['id'],equipBest:[],unequip:['slot'],lock:['id','locked'],sell:['ids'],auraBuy:['id'],auraEquip:['id'],auraTicket:[],consumable:['type'],collection:['count'],mail:['id'],select:['region','boss'],auto:['enabled'],startDungeon:['type','stage'],cancelBattle:[],petSummon:['count'],petEquip:['uid'],petLock:['uid','locked'],petSell:['uid'],petCollection:['count']};
 if(!allowed[command]||Object.keys(args).some(k=>!allowed[command].includes(k)))fail('INVALID_ARGUMENTS');
 for(const key of ['gold','essence','transcendStone','downgradeProtect','dungeonTickets','petStone','petTicket'])s[key]=int(s[key]||0);
 if(context.adminFloor>0){
  for(const key of ['gold','essence','transcendStone','downgradeProtect','dungeonTickets','petStone','petTicket'])s[key]=Math.max(s[key],int(context.adminFloor));
  s.rankingHidden=true;
  for(const group of ['weapon','armor','accessory']){s.summons[group].exp=Math.max(s.summons[group].exp,balance.levelReq[14]);s.summons[group].level=15;}
 }
 const day=kstDay(now);s.dungeons??=initialState(now).dungeons;if(s.dungeons.date!==day)s.dungeons={...s.dungeons,date:day,goldEntries:2,partyFree:2,petEntries:2};
 // Settle elapsed time using the equipment owned BEFORE this command. Equipping
 // a new item must not increase damage retrospectively for an unpolled interval.
 const power=stats(s,context.costumePercent||0),bosses=balance.bossRegions.flatMap(r=>r.bosses),current=balance.bossRegions[s.regionIndex]?.bosses[s.bossIndex];
 const step=balance.bossRegions.slice(0,s.regionIndex).reduce((n,r)=>n+r.bosses.length,0)+s.bossIndex;
 const paused=!!context.partyBusy;
 const elapsed=Math.max(0,Math.min(43200000,now-(s.serverClock??s.lastSeen??now)));
 if(!paused&&(elapsed>=60000||(s.serverBackgroundAt!=null&&elapsed>=1000))&&s.autoBattle&&!s.serverBattle){
  const farm=balance.bossRegions.filter(r=>!r.locked).flatMap(r=>r.bosses).filter(b=>power.attack*15>=b.hp).sort((a,b)=>b.reward-a.reward)[0];
  if(farm){const cycle=Math.max(1,Math.min(15,Math.ceil(farm.hp/Math.max(1,power.attack)))),amount=Math.floor(Math.floor(elapsed/1000/cycle)*farm.reward*(1+power.goldBonus/100));award('gold',amount);events.push({type:'offline',amount});}s.serverCombat=null;
 }else if(!paused){
  const special=s.serverBattle;
  if(special){
   const data=special.type==='gold'?balance.goldDungeons[special.stage-1]:special.type==='tower'?balance.towerFloors[special.stage-1]:{hp:2000,reward:10};
   const due=Math.min(15-special.elapsed,Math.floor((now-special.lastTick)/1000));
   for(let i=0;i<due;i++){
    const crit=random()*100<power.critChance,damage=Math.max(1,Math.floor(power.attack*(crit?1+power.critDamage/100:1)));special.hp=Math.max(0,special.hp-damage);special.elapsed++;special.lastTick+=1000;events.push({type:'hit',target:special.type,damage,crit});
    if(special.hp===0){
     if(special.type==='gold'){if(s.dungeons.goldEntries<=0)fail('DUNGEON_LOCKED');s.dungeons.goldEntries--;award('gold',data.reward);s.dungeons.goldUnlocked=Math.min(20,Math.max(s.dungeons.goldUnlocked,special.stage+1));}
     else if(special.type==='pet'){if(s.dungeons.petEntries<=0)fail('DUNGEON_LOCKED');s.dungeons.petEntries--;award('petStone',10);}
     else{if(special.stage!==s.towerCleared+1)fail('DUNGEON_LOCKED');s.towerCleared=special.stage;for(const [key,field] of [['gold','gold'],['essence','essence'],['transcendStone','stone'],['downgradeProtect','protect'],['petStone','petStone']])award(key,data[field]||0);}
     events.push({type:'battleWon',battle:special.type,stage:special.stage});s.serverBattle=null;break;
    }
    if(special.elapsed>=15){events.push({type:'battleLost',battle:special.type});s.serverBattle=null;break;}
   }
  }else if(s.autoBattle&&current&&step<=(s.monsterUnlockStep||0)){
   s.serverCombat??={hp:current.hp,elapsed:0,lastTick:s.serverClock??now};const combat=s.serverCombat,due=Math.min(60,Math.floor((now-combat.lastTick)/1000));
   for(let i=0;i<due;i++){
    const crit=random()*100<power.critChance,damage=Math.floor(power.attack*(crit?1+power.critDamage/100:1));combat.hp=Math.max(0,combat.hp-damage);combat.elapsed++;combat.lastTick+=1000;events.push({type:'hit',target:'field',damage,crit});
    if(combat.hp===0){const amount=Math.floor(current.reward*(1+power.goldBonus/100));award('gold',amount);const essence=random()<.01?1:0;if(essence)award('essence',1);if(step===s.monsterUnlockStep&&step<bosses.length-1)s.monsterUnlockStep++;events.push({type:'kill',amount,essence});combat.hp=current.hp;combat.elapsed=0;}
    else if(combat.elapsed>=15){combat.hp=current.hp;combat.elapsed=0;events.push({type:'fieldRetry'});}
   }
  }
 }
 if(paused)s.serverCombat=null;
 s.serverClock=now;
 s.serverBackgroundAt=command==='background'?now:null;
 pets.normalize(s,balance.pets);
 if(command==='petSummon'){
  if(![1,10].includes(args.count))fail('INVALID_ARGUMENTS');if(s.petStone<args.count*10)fail('INSUFFICIENT_PETSTONE');
  if(!pets.pool(s,balance.pets).length)fail('ALL_PETS_MAX');
  const results=[];for(let i=0;i<args.count;i++){const roll=pets.pick(pets.pool(s,balance.pets),random);if(!roll)break;const added=pets.add(s,balance.pets,roll.petId);spend('petStone',10);s.petSummonExp=(s.petSummonExp||0)+1;results.push({type:'pet',petId:roll.petId,uid:added.pet.uid,previousLevel:added.previousLevel,level:added.pet.level,copies:added.pet.copies});}events.push({type:'petSummon',results});
 }else if(command==='petEquip'){
  if(args.uid!==null&&!s.ownedPets.some(p=>p.uid===args.uid))fail('PET_NOT_OWNED');s.equippedPet=args.uid;
 }else if(command==='petLock'||command==='petSell'){
  const pet=s.ownedPets.find(p=>p.uid===args.uid);if(!pet)fail('PET_NOT_OWNED');
  if(command==='petLock'){if(typeof args.locked!=='boolean')fail('INVALID_ARGUMENTS');pet.locked=args.locked;}
  else{if(pet.locked||s.equippedPet===pet.uid)fail('ITEM_LOCKED_OR_EQUIPPED');award('petStone',pets.sale(pet,balance.pets));s.ownedPets=s.ownedPets.filter(p=>p!==pet);}
 }else if(command==='petCollection'){
  const reward=balance.petCollectionRewards.find(r=>r.count===args.count);if(!reward)fail('INVALID_ARGUMENTS');if(s.claimedPetCollectionRewards.includes(args.count))fail('ALREADY_CLAIMED');if(s.discoveredPets.length<args.count)fail('COLLECTION_INCOMPLETE');award('petStone',reward.reward.petStone);s.claimedPetCollectionRewards.push(args.count);
 }else if(command==='daily'){
  const key=dailyKey(now);s.dailyRewardClaims??={};if(s.dailyRewardClaims[key])fail('ALREADY_CLAIMED');const amount=10+Math.floor(random()*6);award('essence',amount);s.dailyRewardClaims[key]={essence:amount,claimedAt:now};events.push({type:'daily',amount});
 }else if(command==='summon'){
  if(!['weapon','armor','accessory'].includes(args.group)||![1,5,10].includes(args.count))fail('INVALID_ARGUMENTS');
  const summon=s.summons[args.group],level=summonLevel(summon.exp);spend('gold',costs[level-1]*args.count);const items=[];
  for(let i=0;i<args.count;i++){
   const slots=args.group==='weapon'?['무기']:args.group==='armor'?['투구','갑옷','바지','신발']:['반지','귀걸이'],slot=slots[Math.floor(random()*slots.length)];
   let roll=random()*100,rarity=balance.rates[level-1].length-1;for(let r=0;r<balance.rates[level-1].length;r++){roll-=balance.rates[level-1][r];if(roll<0){rarity=r;break;}}
   const candidates=balance.gear.filter(x=>x.slot===slot&&x.rarity===rarity),base=candidates[Math.floor(random()*candidates.length)];if(!base)fail('UNKNOWN_EQUIPMENT');
   const seed=s.uid+random();items.push(addItem({slot,rarity,name:base.name,baseAtk:base.baseAtk,optionRolls:[seedValue(seed,0),seedValue(seed,1)]}));
  }
  summon.exp+=args.count;summon.level=summonLevel(summon.exp);events.push({type:'summon',items});
 }else if(command==='enhance'||command==='transcend'){
  const it=gear(args.id),trans=command==='transcend',next=trans?(it.transcend||0)+1:it.enhance+1;
  if(trans?(it.rarity<4||it.enhance!==15||next>3):next>15)fail('INVALID_ENHANCEMENT');
  if(args.protect!==undefined&&typeof args.protect!=='boolean')fail('INVALID_ARGUMENTS');
  spend(trans?'transcendStone':'gold',trans?balance.transcendCosts[it.rarity][next-1]:balance.enhanceCosts[it.rarity][next-1]);
  const success=random()*100<(trans?balance.transcendRates[next-1]:balance.enhanceRates[next-1]);let protectedFailure=false;
  if(success)it[trans?'transcend':'enhance']=next;else if(!trans&&next>=2){if(args.protect&&s.downgradeProtect>0){spend('downgradeProtect',1);protectedFailure=true;}else it.enhance--;}
  events.push({type:command,item:it,success,protectedFailure});
 }else if(command==='equip'){
  const it=gear(args.id);s.equipped[it.slot]=it.id;
 }else if(command==='equipBest'){
  for(const slot of balance.slots){const current=s.equipped[slot],items=s.inventory.filter(it=>it.slot===slot);items.sort((a,b)=>itemAttack(b)-itemAttack(a)||Number(b.id===current)-Number(a.id===current)||a.id-b.id);if(items[0])s.equipped[slot]=items[0].id;}
 }else if(command==='unequip'){
  if(!balance.slots.includes(args.slot))fail('INVALID_ARGUMENTS');delete s.equipped[args.slot];
 }else if(command==='lock'){
  if(typeof args.locked!=='boolean')fail('INVALID_ARGUMENTS');gear(args.id).locked=args.locked;
 }else if(command==='sell'){
  if(!Array.isArray(args.ids)||!args.ids.length||args.ids.length>10000||new Set(args.ids).size!==args.ids.length)fail('INVALID_ARGUMENTS');
  // SG1: one linear inventory scan instead of a scan for every sale ID.
  const owned=new Map(s.inventory.map(it=>[it.id,it]));
  const items=args.ids.map(id=>{int(id,1);const it=owned.get(id);if(!it)fail('ITEM_NOT_OWNED');return it;});
  for(const it of items)if(it.locked||equipped(s,it))fail('ITEM_LOCKED_OR_EQUIPPED');
  const price=items.reduce((n,it)=>safeAdd(n,balance.sellPrices[it.rarity][it.enhance||0]),0),ids=new Set(args.ids);s.inventory=s.inventory.filter(it=>!ids.has(it.id));award('gold',price);events.push({type:'sell',count:items.length,amount:price});
 }else if(command==='auraBuy'){
  const id=int(args.id,0,balance.auras.length-1);if(s.ownedAuras.includes(id))fail('ALREADY_OWNED');spend('essence',balance.auras[id].price);s.ownedAuras.push(id);
 }else if(command==='auraEquip'){
  int(args.id,-1,balance.auras.length-1);if(args.id!==-1&&!s.ownedAuras.includes(args.id))fail('NOT_OWNED');s.equippedAura=args.id;
 }else if(command==='auraTicket'){
  if(!(s.auraDrawTickets>0))fail('INSUFFICIENT_TICKET');const pool=balance.auras.filter(x=>x.id!==8&&!s.ownedAuras.includes(x.id));if(!pool.length)fail('ALL_OWNED');const aura=pool[Math.floor(random()*pool.length)];s.auraDrawTickets--;s.ownedAuras.push(aura.id);events.push({type:'aura',id:aura.id});
 }else if(command==='consumable'){
  if(!['protect','stone'].includes(args.type))fail('INVALID_ARGUMENTS');spend('essence',args.type==='protect'?10:25);award(args.type==='protect'?'downgradeProtect':'transcendStone',1);
 }else if(command==='collection'){
  const reward=balance.collectionRewards.find(r=>r.count===args.count);if(!reward)fail('INVALID_ARGUMENTS');s.collectionClaims??={};if(s.collectionClaims[args.count])fail('ALREADY_CLAIMED');
  const owned=balance.gear.filter(it=>s.discovered?.[itemKey(it)]).length;if(owned<reward.count)fail('COLLECTION_INCOMPLETE');
  s.collectionClaims[args.count]=true;award('gold',reward.gold);award('essence',reward.essence);if(reward.count===50&&!s.aura50TicketGranted){s.aura50TicketGranted=true;s.auraDrawTickets=safeAdd(s.auraDrawTickets||0,1);}
 }else if(command==='mail'){
  const id=String(args.id),mail=s.mailbox.find(m=>String(m.id)===id);if(!mail)fail('MAIL_NOT_FOUND');s.claimedMailReceipts??={};if(s.claimedMailReceipts[id])fail('ALREADY_CLAIMED');
  // Mail exists in trusted server state. Browser never submits its reward payload.
  const normalizeReward=value=>{if(!value||typeof value!=='object')return {};const out={...normalizeReward(value.reward),...value};const key={gold:'gold',essence:'essence',stone:'transcendStone',goldDungeonEntry:'goldDungeonEntry'}[value.rewardType];if(key)out[key]=value.amount;if(value.rewardType==='uidGoldProtect'){out.gold=100000000;out.downgradeProtect=3;}return out;};
  const reward=normalizeReward(mail.reward);for(const key of ['gold','essence','transcendStone','downgradeProtect','petStone','petTicket','auraDrawTickets'])if(reward[key])award(key,reward[key]);
  if(reward.stone)award('transcendStone',reward.stone);if(reward.goldDungeonEntry)s.dungeons.goldEntries=safeAdd(s.dungeons.goldEntries,reward.goldDungeonEntry);
  for(const it of [...(reward.items||[]),...(reward.item?[reward.item]:[])]){if(!balance.gear.some(g=>g.slot===it.slot&&g.rarity===it.rarity&&g.name===it.name))fail('UNKNOWN_EQUIPMENT');addItem(it);}
  s.claimedMailReceipts[id]=now;s.mailbox=s.mailbox.filter(m=>String(m.id)!==id);
 }else if(command==='select'){
  const region=int(args.region,0,balance.bossRegions.length-1),boss=int(args.boss,0,balance.bossRegions[region].bosses.length-1),step=balance.bossRegions.slice(0,region).reduce((n,r)=>n+r.bosses.length,0)+boss;
  if(balance.bossRegions[region].locked||step>(s.monsterUnlockStep||0))fail('MONSTER_LOCKED');s.regionIndex=region;s.bossIndex=boss;s.serverCombat=null;
 }else if(command==='auto'){
  if(typeof args.enabled!=='boolean')fail('INVALID_ARGUMENTS');s.autoBattle=args.enabled;s.serverCombat=null;
 }else if(command==='cancelBattle')s.serverBattle=null;
 else if(command==='startDungeon'){
  if(s.serverBattle||paused)fail('BATTLE_IN_PROGRESS');const type=args.type,stage=int(args.stage,1,30);
  let data;if(type==='gold'){data=balance.goldDungeons[stage-1];if(!data||stage>s.dungeons.goldUnlocked||s.dungeons.goldEntries<=0)fail('DUNGEON_LOCKED');}
  else if(type==='tower'){data=balance.towerFloors[stage-1];if(!data||stage!==s.towerCleared+1)fail('DUNGEON_LOCKED');}
  else if(type==='pet'){if(stage!==1||s.dungeons.petEntries<=0)fail('DUNGEON_LOCKED');data={hp:2000,reward:10};}
  else fail('INVALID_ARGUMENTS');s.serverBattle={type,stage,hp:data.hp,elapsed:0,lastTick:now};
 }
 // Browser damage, reward amounts and elapsed seconds are never accepted.
 s.lastSeen=now;s.savedAt=now;
 const pet=s.ownedPets.find(p=>p.uid===s.equippedPet),petData=pet?balance.pets[pet.petId]:null;
 s.remodelProfile={v:4,uid:s.playerUid,name:s.playerName,power:stats(s,context.costumePercent||0).attack,region:balance.bossRegions[s.regionIndex]?.name,boss:balance.bossRegions[s.regionIndex]?.bosses[s.bossIndex]?.name,tower:s.towerCleared||0,gender:s.playerGender,hideHelmet:true,ownedAuras:s.ownedAuras,equippedAura:s.equippedAura,updated:now,equipment:balance.slots.map(slot=>s.inventory.find(it=>it.id===s.equipped[slot])).filter(Boolean).map(it=>({s:it.slot,n:it.name,r:it.rarity,e:it.enhance,t:it.transcend||0,ba:it.baseAtk,a:itemAttack(it),o:options(it)})),pet:pet?{...pet,...petData,s:balance.petLevelStats[pet.petId]?.[pet.level-1]||{}}:null};
 return {state:s,events};
}
