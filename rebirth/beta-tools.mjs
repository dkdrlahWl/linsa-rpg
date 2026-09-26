import {MATERIALS,REGIONS,STAGES,BOSSES} from './data.mjs?v=rift-chests-1';
// Restricted by the server-verified administrator context.
export const BETA_TOOLS_ENABLED = true;
export function applyBetaTool(s,command,args,now){
  const check=(ok,error)=>{if(!ok)throw new Error(error);};
  check(BETA_TOOLS_ENABLED,'INVALID_BETA_DISABLED');
  check(!s.battle,'BATTLE_IN_PROGRESS');
  check(!s.partyRoom,'PARTY_IN_PROGRESS');
  if(command==='betaBossReset'){
    check(['daily','weekly','all'].includes(args.kind),'INVALID_BETA_BOSS_KIND');
    s.bossClaims ||= {};
    let count=0;
    for(const boss of BOSSES){
      if(args.kind!=='all'&&boss.weekly!==(args.kind==='weekly'))continue;
      if(Object.hasOwn(s.bossClaims,boss.id))count++;
      delete s.bossClaims[boss.id];
      if(s.bossAttempts)delete s.bossAttempts[boss.id];
    }
    return {type:'betaBossReset',kind:args.kind,count};
  }
  if(command==='betaGrant'){
    const {key,amount}=args;
    check(Number.isSafeInteger(amount)&&amount>=1&&amount<=1e9,'INVALID_BETA_AMOUNT');
    let wallet,field;
    if(key==='gold'){wallet=s;field='gold';}
    else if(Object.hasOwn(MATERIALS,key)){wallet=s.materials;field=key;}
    else {const match=typeof key==='string'&&/^boss:(\d+)$/.exec(key);check(match&&REGIONS.some(r=>r.id===Number(match[1])),'INVALID_BETA_RESOURCE');wallet=s.bossMaterials;field=Number(match[1]);}
    const total=(wallet[field]||0)+amount;
    check(Number.isSafeInteger(total)&&total<=9e12,'INVALID_BETA_LIMIT');
    wallet[field]=total;
    return {type:'betaGrant',key,amount};
  }
  check(command==='betaLevel','UNKNOWN_COMMAND');
  check(Number.isSafeInteger(args.level)&&args.level>=1&&args.level<=200,'INVALID_BETA_LEVEL');
  check(!s.pendingCube,'ITEM_CUBE_PENDING');
  const before=s.level;s.level=args.level;s.xp=0;s.xpRemainder=0;
  s.stats={STR:4,DEX:4,INT:4,LUK:4};s.points=(s.level-1)*5;s.classBuilds={};
  if(s.advancement>=1)s.firstAdvancement=true;if(s.level<30)s.firstAdvancement=false;if(s.level<60)s.advancement=0;else if(s.level<100&&s.advancement>=2)s.advancement=1;
  for(const [slot,id] of Object.entries(s.equipped)){
    const item=s.items.find(it=>it.id===id);
    if(!item||item.level>s.level)delete s.equipped[slot];
  }
  if(STAGES[s.stage]?.level>s.level)s.stage=0;
  s.hunting=false;s.huntRemainder=0;s.lastAt=now;
  return {type:'betaLevel',before,level:s.level};
}
