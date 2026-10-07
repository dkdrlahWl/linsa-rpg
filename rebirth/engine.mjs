import {fishingCommand,normalizeFishing} from './fishing-model.mjs';
import {FIFTH_SKILLS,fifthUnlocked,beginFifth,stepFifth} from './fifth-job.mjs?v=fifth-impact-121';
import {normalizeCostumes,equippedCostume,costumeCommand,costumeAttackBonus} from './costumes.mjs';
import {bossSalePrice} from './shop-model.mjs';
import {consumableCommand,rewardChance} from './consumables.mjs';
import {PET_ID,summonPet,equipPet,fieldPetDeath,petHealTick} from './pet-event.mjs?v=priest-potential-83';
import {deliverSystemMail,claimSystemMail} from './system-mail.mjs?v=priest-potential-83';
import {RAID_ENCOUNTERS} from './raid-content.mjs';
import {raidWeeklyStatus,rollRaidReward} from './raid-rewards.mjs';
import {beginPriest,stepPriest,PRIEST_SKILLS,supportTick,absorbDamage,holyDamage,priestAttack,PRIEST_OFFENSE_POTENTIAL_RATE} from './priest.mjs?v=fifth-114';
import {scheduleCombatSkill,stepCombatSkills} from './combat-skills.mjs';
import {FOURTH_SKILLS,beginFourth,stepFourth} from './fourth-job.mjs?v=fifth-114';
import {rollRiftReward} from './rift-rewards.mjs';
import {THIRD_SKILLS,ADVANCEMENT_BOSSES,firstJobUnlocked,jobStage,nextTrialStage,beginThird,stepThird} from './advancement.mjs?v=fifth-114';
import {incomingDamage,DAILY_TASKS,BALANCE_VERSION,FIELD_ATTACK_SECONDS,FIELD_MONSTER_SECONDS} from './journey-balance.mjs';
import { CUBES, cubeCost, cubeUpgrade, rerollCube, rollCubeLine } from './maple-cubes.mjs';
import {applyBetaTool} from './beta-tools.mjs?v=fifth-impact-121';
import {
  VERSION,
  normalizePotentialState,
  normalizePotentialItem,
  OFFLINE_SECONDS,
  CLASSES,
  SLOTS,
  TIERS,
  STAGES,
  fieldDropRates,
  BOSSES,
  REGIONS,
  MATERIALS,
  OPTIONS,
  STAR_SUCCESS,
  rollBaseStats,
  selectDesign,
  rollEquipmentLevel,
  salvageYield,
  fillPotentialLines,
  xpNeeded,
  starCost,
  gearAttributes,
  starOdds,
  dayKey,
  weekKey,
  DUNGEONS,
  CLASS_SKILLS,
  SECOND_SKILLS,
  ATTENDANCE_REWARDS,
  weaponVariant,
  equipmentKey,
  WEAPON_TYPES,
} from "./data.mjs?v=boss-relic-only-130";

import { TOWER_FLOORS, canOpenChest, clearVictoryEffects, towerEncounter, newTowerBattle, towerStep, TOWER_STEP, upgradeTowerBattle } from './tower-model.mjs?v=fifth-impact-121';
const fail = (message) => {
  throw new Error(message);
};
const check = (condition, message) => {
  if (!condition) fail(message);
};
const int = (v, min, max) => Number.isSafeInteger(v) && v >= min && v <= max;
function spend(s, key, n) {
  check(Number.isSafeInteger(n) && n >= 0, "INVALID_COST");
  const bag = key === "gold" ? s : s.materials;
  check((bag[key] || 0) >= n, "INSUFFICIENT_" + key.toUpperCase());
  if (!s.isAdmin) bag[key] -= n;
}
function pick(a, ctx) {
  return a[Math.min(a.length - 1, Math.floor(ctx.random() * a.length))];
}
export function makeItem(level, classId, slot, boss, ctx, variant) {
  const selectedVariant = slot === 0 ? (variant ?? Math.floor(ctx.random() * WEAPON_TYPES[classId].length)) : 0;
  check(int(selectedVariant, 0, 2), "INVALID_WEAPON_TYPE");
  return {
    id: ctx.uuid(),
    level,
    classId,
    slot,
    boss,
    weaponVariant: selectedVariant,

    stars: 0,
    grade: 0,
    potentialVersion: 5,
    potentialUnlocked: false,
    lines: [],
    locked: false,
    broken: false,
  };
}
export function balanceBossGearSlot(slot,ctx){return slot===0&&ctx.random()<.5?1+Math.floor(ctx.random()*8):slot;}
export function makeLootItem(base,classId,slot,boss,ctx,variant){if(boss)slot=balanceBossGearSlot(slot,ctx);const level=Math.max(10,rollEquipmentLevel(base,ctx.random)),design=selectDesign(level,classId,slot,boss,ctx.random);const item={...makeItem(level,classId,slot,boss,ctx,design.weaponVariant),...design};item.baseStats=rollBaseStats(item,ctx.random);return item;}

export function initialState(classId, name, ctx) {
  check(
    CLASSES.some((c) => c.id === classId),
    "INVALID_CLASS",
  );
  check(
    typeof name === "string" && /^[가-힣a-zA-Z0-9_]{2,12}$/.test(name),
    "INVALID_NAME",
  );
  const starter = makeItem(1, classId, 0, false, ctx, 0);
  starter.bound = true;normalizePotentialItem(starter);
  return deliverSystemMail({
    version: VERSION,
    name,
    classId,
    level: 1,
    xp: 0,
    points: 0,
    stats: { STR: 4, DEX: 4, INT: 4, LUK: 4 },
    costumes: [],
    equippedCostume: null,
    classBuilds: {},
    classStarters: [classId],
    gold: 500,
    stage: 0,
    hunting: true,
    lastAt: ctx.now,
    huntRemainder: 0,
    materials: { fragment: 3, cube: 3, highCube: 0 },
    bossMaterials: {},
    items: [starter],
    equipped: { 0: starter.id },
    mailbox: [],
    cleared: [],
    bossClaims: {},
    dungeonClaims: {},
    attendance: {day:0,lastClaim:null},
    battle: null,
    pendingCube: null,
    lastReward: null,
    collection: [[1, classId, 0, false].join(":")],
    tutorial: 0,
  }, ctx);
}
export function power(s) {
  const cl = CLASSES.find((c) => c.id === s.classId);
  let flat = 12 + s.level * 2,
    primary = s.stats[cl.stat] + s.level * 2,
    hp = 100 + s.level * 22,
    defense = s.level * 0.5;
  const pct = {
    STR: 0,
    DEX: 0,
    INT: 0,
    LUK: 0,
    attack: 0,
    hp: 0,
    crit: 0,
    boss: 0,
    defense: 0,
    goldGain: 0,
    xpGain: 0,
  };
  const fixedStats = {STR:0, DEX:0, INT:0, LUK:0};
  let equipmentStat = 0;
  let stars = 0;
  for (const id of Object.values(s.equipped)) {
    const it = s.items.find((x) => x.id === id);
    if (!it || it.broken) continue;
    stars += it.stars;
    const attributes=gearAttributes(it);
    flat += attributes.attack;
    const addedStat=attributes.stat;
    equipmentStat += addedStat;
    primary += addedStat;
    hp += attributes.hp;
    defense += attributes.defense;
    for (const line of it.lines) {
      if (line.key.startsWith("flat") && Object.hasOwn(fixedStats, line.key.slice(4))) fixedStats[line.key.slice(4)] += line.value;
      if (line.key === "flatHP") hp += line.value;
      if (line.key === "flatAttack") flat += line.value;
      if (line.key === "flatDefense") defense += line.value;
      if (line.key === "flat" + cl.stat) primary += line.value;
      else if (Object.hasOwn(pct, line.key)) pct[line.key] += line.value;
    }
  }
  const priestGearAttack=flat;
  primary *= 1 + pct[cl.stat] / 100;
  flat = (flat + primary * 0.65) * (1 + pct.attack / 100);
  hp = Math.floor(hp * (1 + pct.hp / 100));
  defense *= 1 + pct.defense / 100;
  const crit = Math.min(
    0.95,
    0.05 + pct.crit / 100 * (s.classId==="priest"?PRIEST_OFFENSE_POTENTIAL_RATE:1) + (s.classId === "archer" ? 0.05 : 0),
  );
  const cadence = s.classId === "pirate" ? 1.08 : 1;
  if (s.classId === "warrior") { hp = Math.floor(hp * 1.30); defense *= 1.15; }
  if (s.classId === "mage") flat *= 1.06;
  const critDamage = s.classId === "rogue" ? 1.9 : 1.6;
  if (firstJobUnlocked(s)) { const bonus=1.1**jobStage(s);flat *= bonus;hp = Math.floor(hp * bonus); }
  if(s.classId==="priest")flat=priestAttack(hp,primary,priestGearAttack*(firstJobUnlocked(s)?1.1**jobStage(s):1),pct.attack,pct.hp,pct.LUK);
  const costumeBonus=costumeAttackBonus(s);
  flat *= 1 + costumeBonus / 100;
  const boss=1+pct.boss/100*(s.classId==="priest"?PRIEST_OFFENSE_POTENTIAL_RATE:1);
  const dps = flat * (1 + crit * (critDamage - 1)) * cadence;
  const stats = Object.fromEntries(Object.keys(fixedStats).map(key => {
    const growth = key === cl.stat ? s.level * 2 + equipmentStat : 0;
    const beforePercent = s.stats[key] + growth + fixedStats[key];
    return [key, {base:s.stats[key], growth, fixed:fixedStats[key], percent:pct[key], total:Math.floor(beforePercent * (1+pct[key]/100))}];
  }));
  return {
    costumeId:equippedCostume(s)?.id||null,
    costumeAttackBonus:costumeBonus,
    pet:s.equippedPet===PET_ID&&s.pets?.includes(PET_ID)?PET_ID:null,
    stats,
    bonuses: {...pct},
    advancement: s.advancement||0,
    firstJob:firstJobUnlocked(s),
    level:s.level,
    combatPower: Math.floor(dps * boss + hp * (1 + Math.floor(defense) / 2600) * 0.1),
    attack: Math.floor(flat),
    primary: Math.floor(primary),
    hp,
    defense: Math.floor(defense),
    crit,
    critDamage,
    cadence,
    boss,
    stars,
    goldGain: pct.goldGain,
    xpGain: pct.xpGain,
    dps,
  };
}
// Exact enumeration for small inventories; bounded multi-start search for large bags.
// Comparisons use final combat power and retain the current loadout on ties.
export function bestEquipment(s) {
  const bySlot = Array.from({length:9},()=>[]);
  for (const it of s.items) if (!it.broken && it.classId===s.classId && it.level<=s.level && int(it.slot,0,8)) bySlot[it.slot].push(it);
  const current=Array.from({length:9},(_,slot)=>s.items.find(it=>it.id===s.equipped[slot])||null);
  const score=items=>power({...s,items:items.filter(Boolean),equipped:Object.fromEntries(items.flatMap((it,slot)=>it?[[slot,it.id]]:[]))}).combatPower;
  const before=power(s).combatPower;
  let best=current.slice(),bestScore=before;
  const consider=items=>{const value=score(items);if(value>bestScore){best=items.slice();bestScore=value;}return value;};
  for(let slot=0;slot<9;slot++) {
    bySlot[slot].sort((a,b)=>Number(b.id===s.equipped[slot])-Number(a.id===s.equipped[slot])||a.id.localeCompare(b.id));
    if(!bySlot[slot].length)bySlot[slot]=[null];
  }
  const combinations=bySlot.reduce((n,items)=>n*items.length,1);
  if(combinations<=25000) {
    const chosen=[];
    const visit=slot=>{if(slot===9){consider(chosen);return;}for(const it of bySlot[slot]){chosen[slot]=it;visit(slot+1);}};
    visit(0);
  } else {
    const seeds=[current.slice()];
    let beam=[{items:current.slice(),value:before}];
    for(let slot=0;slot<9;slot++){
      const next=[];
      for(const entry of beam)for(const it of bySlot[slot]){const items=entry.items.slice();items[slot]=it;next.push({items,value:consider(items)});}
      next.sort((a,b)=>b.value-a.value);beam=next.slice(0,96);
    }
    seeds.push(best.slice(),...beam.slice(0,4).map(entry=>entry.items));
    for(const seed of seeds){let value=consider(seed);for(let pass=0;pass<9;pass++){
      let changed=false;
      for(let slot=0;slot<9;slot++){let winner=seed[slot],nextValue=value;for(const it of bySlot[slot]){const trial=seed.slice();trial[slot]=it;const v=score(trial);if(v>nextValue){winner=it;nextValue=v;}}if(nextValue>value){seed[slot]=winner;value=nextValue;changed=true;}}
      consider(seed);if(!changed)break;
    }}
  }
  const equipped=bestScore>before?Object.fromEntries(best.flatMap((it,slot)=>it?[[slot,it.id]]:[])):{...s.equipped};
  const changed=Array.from({length:9},(_,slot)=>slot).filter(slot=>equipped[slot]!==s.equipped[slot]);
  return {equipped,before,after:bestScore,changed};
}
export function huntingRate(s) {
  const st = STAGES[s.stage],
    p = power(s);
  const fightSeconds = Math.max(1, Math.ceil(st.hp / p.dps))*FIELD_ATTACK_SECONDS;
  const incoming = incomingDamage(st.attack,p.defense);
  const deathSeconds = p.pet===PET_ID?fieldPetDeath(p.hp,incoming):Math.max(FIELD_MONSTER_SECONDS, Math.ceil(p.hp / incoming) * FIELD_MONSTER_SECONDS);
  // Attacks resolve before a monster's simultaneous retaliation. No field time limit.
  const survives = fightSeconds <= deathSeconds;
  const levelReward = Math.min(1,(st.level+15)/s.level)**2;
  return { seconds: survives ? Math.max(8,fightSeconds) : deathSeconds + 10,
    fightSeconds,deathSeconds,incoming,attackInterval:FIELD_ATTACK_SECONDS,enemyInterval:FIELD_MONSTER_SECONDS,damagePerHit:p.dps,
    xp: survives ? st.xp * levelReward * (1 + p.xpGain/100) : 0,
    gold: survives ? st.gold * levelReward * (1 + p.goldGain/100) : 0, survives };
}
function levelUp(s, xp) {
  const exact = xp + (s.xpRemainder || 0), whole = Math.floor(exact + 1e-9);
  s.xpRemainder = Math.max(0, exact - whole);
  s.xp += whole;
  while (s.level < 200 && s.xp >= xpNeeded(s.level)) {
    s.xp -= xpNeeded(s.level++);
    s.points += 5;
  }
  if (s.level === 200) s.xp = 0;
}
function rollCount(n, prob, ctx) {
  let hits = 0;
  if (!n || !prob) return hits; // Geometric skipping: exact Bernoulli counts, O(expected drops).
  let at = -1;
  while (true) {
    at +=
      1 +
      Math.floor(
        Math.log(1 - Math.min(0.999999999999, ctx.random())) /
          Math.log(1 - prob),
      );
    if (at >= n) break;
    hits++;
  }
  return hits;
}
function addItem(s, item) {
  const key = equipmentKey(item);
  if (!s.collection.includes(key)) s.collection.push(key);
  if (s.items.length < 300) s.items.push(item);
  else {
    s.mailbox ||= [];
    const mailKey=key+"|lv"+item.level+(item.baseStats?"|s"+JSON.stringify(item.baseStats):"")+"|p"+JSON.stringify(item.lines);
    const stack = s.mailbox.find(x => x.key === mailKey);
    if (stack) stack.quantity++;
    else { const {id, ...template} = item; s.mailbox.push({key:mailKey, item: template, quantity: 1}); }
  }
}
export function settle(s, ctx) {
  const elapsed = Math.max(0, ctx.now - s.lastAt);
  const seconds = Math.min(
    OFFLINE_SECONDS,
    Math.floor(elapsed / 1000),
  );
  // Keep sub-second progress; discard only time beyond the offline cap.
  s.lastAt = ctx.now - (elapsed % 1000);
  if (!s.hunting || s.battle || s.coopRoom || !seconds) return null;
  let remaining = seconds + s.huntRemainder, kills = 0, xp = 0, earnedGold = 0, defeats = 0;
  // Recalculate at level boundaries so offline and frequent online settlement agree.
  while (remaining > 0) {
    const rate = huntingRate(s);
    let count = Math.floor(remaining / rate.seconds);
    if (!count) break;
    if (!rate.survives) { defeats += count; remaining %= rate.seconds; break; }
    if (s.level < 200) count = Math.min(count, Math.ceil((xpNeeded(s.level) - s.xp - (s.xpRemainder || 0)) / rate.xp));
    remaining -= count * rate.seconds;
    kills += count; xp += count * rate.xp; earnedGold += count * rate.gold;
    levelUp(s, count * rate.xp);
  }
  s.huntRemainder = remaining;
  s.huntKills = (s.huntKills || 0) + kills;
  if(s.daily)s.daily.hunt+=kills;
  const goldExact = earnedGold + (s.goldRemainder || 0),
    gold = Math.floor(goldExact + 1e-9);
  s.goldRemainder = Math.max(0,goldExact - gold);
  s.gold += gold;
  const drops = [], loot=[];
  const rates=fieldDropRates(STAGES[s.stage]);
  const capacity = Math.max(0, 300 - s.items.length), normalGearCount = rollCount(kills, rates.equipment, ctx),bossGearCount=rollCount(kills,rates.bossEquipment,ctx),gearCount=normalGearCount+bossGearCount;
  for (let i = 0; i < gearCount; i++) {
    const item = makeLootItem(
      STAGES[s.stage].dropLevel,
      pick(CLASSES, ctx).id,
      Math.floor(ctx.random() * 9),
      i>=normalGearCount,
      ctx,
    );
    addItem(s, item);
    drops.push(item.id);loot.push({kind:"gear",item:{...item},quantity:1});
  }
  const fragments =
      rollCount(kills, rates.fragment, ctx),
    cubes = rollCount(kills, rates.cube, ctx),
    scrolls = rollCount(kills, rates.scroll, ctx);
  s.materials.fragment += fragments;
  s.materials.cube += cubes;

  for(const [key,quantity] of [["fragment",fragments],["cube",cubes],["scroll",scrolls]])if(quantity)loot.push({kind:"material",key,quantity});
  if(loot.length)s.recentLoot=[...loot.reverse().map(x=>({...x,at:ctx.now,stage:s.stage})),...(s.recentLoot||[])].slice(0,5);
  return {
    seconds,
    kills,
    defeats,
    xp,
    gold,
    drops,
    fragment: fragments,
    cube: cubes,
    scroll: scrolls,
    stored: Math.max(0, gearCount - capacity),
  };
}
function gear(s, id) {
  const it = s.items.find((x) => x.id === id);
  check(it, "ITEM_NOT_FOUND");
  check(!s.pendingCube || s.pendingCube.id !== id, "ITEM_CUBE_PENDING");
  return it;
}
function writable(s, it) {
  check(!it.locked && !it.broken, "ITEM_PROTECTED");
  check(!s.battle, "BATTLE_IN_PROGRESS");
}
function removeItem(s, it) {
  s.items = s.items.filter((x) => x.id !== it.id);
  for (const k of Object.keys(s.equipped))
    if (s.equipped[k] === it.id) delete s.equipped[k];
}
export function battleEnemy(b) {
  if(b.kind==='tower')return {...towerEncounter(b),region:Math.min(9,b.floor-1)};
  return b.kind === "dungeon" ? { ...DUNGEONS[b.dungeon], ...b.enemy } : BOSSES[b.bossId];
}
function bossSettle(s, ctx, events) {
  const b = s.battle;
  if (!b || b.kind==='tower') return null;
  const boss = battleEnemy(b);
  const frames = [];
  const skill = CLASS_SKILLS[s.classId];
  const upto = Math.min(
    boss.seconds,
    Math.max(0, Math.floor((ctx.now - b.started) / 1000)),
  );
  for (let t = b.tick + 1; t <= upto; t++) {
    Object.assign(b,{classId:s.classId,advancement:s.advancement,x:0,y:100,soloSupport:true});
    supportTick([b],(t-1)*10);
    const active = skill.type==='buff' && t <= b.burstUntil;
    const second = t <= (b.secondUntil||0) && SECOND_SKILLS[s.classId].type==='buff' ? SECOND_SKILLS[s.classId] : null;
    const burst = (active ? skill.damage : 1) * (second?.damage||1);
    const crit = ctx.random() < Math.min(1,b.power.crit+(active?(skill.critAdd||0):0)+(second?.critAdd||0));
    if(b.firstCast||b.secondCast)for(let pulse=(t-1)*10+1;pulse<=t*10;pulse++)stepCombatSkills(b,b.enemyHp>0?[{x:0,y:0}]:[],pulse,(scale,extraCrit)=>{if(b.enemyHp<=0)return;const critical=ctx.random()<Math.min(.95,b.power.crit+extraCrit),value=Math.round(holyDamage(b,b.power.attack*b.power.boss*scale*(critical?b.power.critDamage:1),pulse));b.enemyHp=Math.max(0,b.enemyHp-value);frames.push({tick:pulse/10,damage:value,crit:critical,incoming:0,enemyHp:b.enemyHp});});
    if(b.thirdCast)for(let pulse=(t-1)*10+1;pulse<=t*10;pulse++)stepThird(b,{x:0,y:0},pulse,scale=>{const c=ctx.random()<Math.min(.95,b.power.crit+(active?(skill.critAdd||0):0)+(second?.critAdd||0));b.enemyHp=Math.max(0,b.enemyHp-Math.round(holyDamage(b,b.power.attack*b.power.boss*scale*burst*(c?b.power.critDamage+(second?.critDamageAdd||0):1),pulse)));});
    if(b.fourthCast)for(let pulse=(t-1)*10+1;pulse<=t*10;pulse++)stepFourth(b,{x:0,y:0},pulse,scale=>{const c=ctx.random()<Math.min(.95,b.power.crit+(active?(skill.critAdd||0):0)+(second?.critAdd||0));b.enemyHp=Math.max(0,b.enemyHp-Math.round(holyDamage(b,b.power.attack*b.power.boss*scale*burst*(c?b.power.critDamage+(second?.critDamageAdd||0):1),pulse)));});
    if(b.fifthCast)for(let pulse=(t-1)*10+1;pulse<=t*10;pulse++)stepFifth(b,[{x:0,y:0,hp:b.enemyHp,maxHp:boss.hp}],pulse,scale=>{const crit=ctx.random()<b.power.crit;b.enemyHp=Math.max(0,b.enemyHp-Math.round(holyDamage(b,b.power.attack*scale*(crit?b.power.critDamage:1),pulse)*b.power.boss));});
    supportTick([b],t*10);
    const damage = Math.round(holyDamage(b,b.power.attack * (crit ? b.power.critDamage+(second?.critDamageAdd||0) : 1) * b.power.boss * burst * b.power.cadence,t*10));
    b.enemyHp = Math.max(0, b.enemyHp - damage);
    b.tick = t;
    const frame = {tick:t, damage, crit, incoming:0, enemyHp:b.enemyHp};
    frames.push(frame); if (frames.length > 40) frames.shift();
    if (b.enemyHp <= 0) break;
    if (t % 3 === 0 || t % boss.patternEvery === 0) {
      const telegraph = t % boss.patternEvery === 0;
      const guarded = skill.type==='buff' && t <= b.guardUntil;
      frame.incoming = Math.max(
        1,
        Math.floor(
          (incomingDamage(boss.attack,b.power.defense) * (telegraph ? boss.patternMultiplier : 1)) *
            (guarded ? skill.guard : 1) * (second?.guard||1),
        ),
      );
      b.hp = Math.max(0, b.hp - absorbDamage(b,frame.incoming,t*10));
      petHealTick([b],t*10);
    }
    if (b.hp <= 0) break;
  }
  if (frames.length) events.push({type:"combat", frames});
  if (b.enemyHp > 0 && b.hp > 0 && b.tick < boss.seconds) return null;
  if(b.enemyHp<=0&&!b.practice)s.daily.boss++;
  const won = b.enemyHp <= 0,
    reward = {
      type: b.kind === "dungeon" ? "dungeon" : "boss",
      dungeon: b.dungeon,
      bossId: boss.id,
      won,
      practice: b.practice,
      items: [],
      materials: 0,
    };
  if (won && !b.practice) {
    if (b.kind === "dungeon") {
      s.dungeonClaims[b.dungeon] = b.claimKey;
      if (b.dungeon === "cube") {s.materials.cube += 25;s.materials.highCube+=3;reward.cube=25;reward.highCube=3;}
      else if (b.dungeon === "relic") {
        const it = makeLootItem(200, pick(CLASSES,ctx).id, Math.floor(ctx.random()*9),false,ctx);
        addItem(s,it); reward.items.push(it.id); s.gold += 20000; s.materials.fragment += 60;reward.gold=20000;reward.fragment=60;
      } else {s.materials.fragment += 200;reward.fragment=200;}
    } else {
    s.bossClaims[boss.id] = b.claimKey;
    if (!s.cleared.includes(boss.id)) s.cleared.push(boss.id);

    s.gold += boss.gold;reward.gold=boss.gold;
    s.materials.cube += boss.cubes;reward.cube=boss.cubes;
    if (boss.weekly) {
      s.materials.highCube+=2;

    }
    if (ctx.random() < rewardChance(boss.dropChance,s,ctx.now)) {
        const it = makeLootItem(
          boss.gearLevel,
          pick(CLASSES, ctx).id,
          Math.floor(ctx.random() * 9),
          true,
          ctx,
        );
        addItem(s, it);
        reward.items.push(it.id);
    }
    }
  }
  s.battle = null;
  s.lastAt = ctx.now;
  s.hunting = true;
  s.lastReward = reward;
  return reward;
}
function towerFinish(s,ctx,events) {
 const b=s.battle;if(!b||b.kind!=='tower'||!b.ended)return;
 if(b.weeklyBossId!==undefined){
  if(b.won){b.chest||={x:b.enemy.x,y:b.enemy.y};clearVictoryEffects(b);return;}
  const reward={type:'boss',bossId:b.weeklyBossId,won:false,practice:b.practice,items:[],materials:0};s.lastReward=reward;s.battle=null;s.lastAt=ctx.now;s.hunting=true;events.push(reward);return;
 }
 if(b.advancementStage!==undefined){const stage=b.advancementStage,won=b.won,practice=!!b.advancementPractice;if(won&&!practice){check(nextTrialStage(s)===stage,'ALREADY_ADVANCED');s.firstAdvancement=true;s.advancement=stage;s.advancementVictories||={};s.advancementVictories[stage]=ctx.now;}const reward={type:'advancementTrial',stage,won,practice,seconds:b.tick/10};s.lastReward=reward;s.battle=null;s.hunting=true;s.lastAt=ctx.now;events.push(reward);return;}
 const f=TOWER_FLOORS[b.floor-1];s.tower ||= {cleared:[],best:{}};
 const first=b.won&&!s.tower.cleared.includes(b.floor);
 if(b.won){if(first)s.tower.cleared.push(b.floor);s.tower.best[b.floor]=Math.min(s.tower.best[b.floor]||Infinity,b.tick/10);}
 const reward={type:'tower',floor:b.floor,won:b.won,first,seconds:b.tick/10,reason:b.reason||'',gold:0,fragment:0,cube:0,highCube:0};
 if(first){s.daily.tower++;}
 if(first){Object.assign(reward,f.reward);s.gold+=reward.gold;for(const key of ['fragment','cube','highCube','primeCube'])s.materials[key]=(s.materials[key]||0)+(reward[key]||0);}
 s.lastReward=reward;s.battle=null;s.lastAt=ctx.now;s.hunting=true;events.push(reward);
}
// Both movement and chest claims use the same server-validated input timeline.
function applyTowerFrames(b,args,ctx){
      check(args.runId===b.runId,'INVALID_TOWER_RUN');
      check(int(args.from,0,b.tick)&&Array.isArray(args.frames)&&args.frames.length<=30,'INVALID_TOWER_INPUT');
      check(args.frames.every(f=>Array.isArray(f)&&f.length===3&&Number.isFinite(f[0])&&Number.isFinite(f[1])&&Math.abs(f[0])<=1&&Math.abs(f[1])<=1&&int(f[2],0,127)),'INVALID_TOWER_INPUT');
      const allowed=Math.floor(Math.max(0,ctx.now-b.started)/TOWER_STEP);
      for(let i=Math.max(0,b.tick-args.from);i<args.frames.length&&b.tick<allowed&&(!b.ended||b.chest);i++){
        towerStep(b,args.frames[i]);
        if(b.ended&&b.won&&b.weeklyBossId!==undefined&&!b.chest){b.chest={x:b.enemy.x,y:b.enemy.y};clearVictoryEffects(b);}
      }
}
export function execute(input, command, args = {}, ctx) {
  check(
    ctx && Number.isFinite(ctx.now) && typeof ctx.random === "function",
    "INVALID_CONTEXT",
  );
  if(command.startsWith("fish"))check(ctx.admin===true,"FISHING_ADMIN_ONLY");
  const s = normalizeCostumes(normalizePotentialState(structuredClone(input)));
  s.isAdmin = ctx.admin === true;
  if(s.isAdmin){s.gold=999999999999;for(const key of Object.keys(MATERIALS))s.materials[key]=999999999999;}
  check(s.version === VERSION, "VERSION_MISMATCH");
  deliverSystemMail(s,ctx);
  if(s.balanceVersion!==BALANCE_VERSION){s.xp=Math.floor(Math.min(.999999,s.xp/Math.round((100+s.level**2.4*4)*5))*xpNeeded(s.level));s.xpRemainder=0;}s.balanceVersion=BALANCE_VERSION;
  const dailyDay=dayKey(ctx.now);
  if(s.daily?.day!==dailyDay)s.daily={day:dailyDay,hunt:0,boss:0,tower:0,claimed:[]};
  check(!s.coopRoom || ["sync","ack"].includes(command), "BATTLE_IN_PROGRESS");
  check(!s.partyRoom || ["sync","ack"].includes(command), "PARTY_IN_PROGRESS");
  normalizeFishing(s,ctx.now);
  const events = [];
  if(["shopSell","costumeBuy","costumeEquip","costumeUnequip","consumableBuy","consumableUse"].includes(command))check(!s.battle,"BATTLE_IN_PROGRESS");
  if(s.battle?.kind==='tower'){
    const b=upgradeTowerBattle(s.battle);b.power.firstJob=firstJobUnlocked(s);
    if(b.advanced===undefined)b.advanced=s.advancement>=1;
    check(['sync','ack','towerInput','towerLeave','towerOpen'].includes(command),'BATTLE_IN_PROGRESS');
    if(!b.chest&&ctx.now-b.started>=towerEncounter(b).seconds*1000){b.ended=true;b.won=false;b.reason='timeout';}
    else if(command==='towerOpen'){
      if(args.frames!==undefined)applyTowerFrames(b,args,ctx);
      check(args.runId===b.runId&&b.chest&&b.won&&b.weeklyBossId!==undefined,'INVALID_CHEST');
      check(canOpenChest(b),'ITEM_CHEST_TOO_FAR');
      const boss=BOSSES[b.weeklyBossId],reward={type:'boss',bossId:boss.id,won:true,practice:!!b.practice,items:[],materials:0,gold:0,cube:0,highCube:0};
      const claimKey=b.claimKey||weekKey(ctx.now);s.bossClaims||={};
      if(!s.isAdmin&&!b.practice&&s.bossClaims[boss.id]===claimKey)reward.practice=true;
      if(!reward.practice){s.bossClaims[boss.id]=claimKey;s.daily.boss++;if(!s.cleared.includes(boss.id))s.cleared.push(boss.id);s.gold+=boss.gold;s.materials.cube+=boss.cubes;s.materials.highCube+=2;Object.assign(reward,{gold:boss.gold,cube:boss.cubes,highCube:2});if(ctx.random()<rewardChance(boss.dropChance,s,ctx.now)){const level=boss.gearLevel;const item=makeLootItem(level,pick(CLASSES,ctx).id,Math.floor(ctx.random()*9),true,ctx);addItem(s,item);reward.items.push(item.id);}}
      s.battle=null;s.hunting=true;s.lastAt=ctx.now;s.lastReward=reward;events.push(reward);return {state:s,events};
    }
    else if(command==='towerInput'){
      applyTowerFrames(b,args,ctx);
    }else if(command==='towerLeave'){check(!b.chest,'ITEM_CHEST_PENDING');b.ended=true;b.won=false;b.reason='leave';}
    towerFinish(s,ctx,events);if(command==='ack')s.lastReward=null;return {state:s,events};
  }
  // A retried final input must never grant rewards twice.
  if(command==='towerInput'||command==='towerLeave'||command==='towerOpen')return {state:s,events};
  const hunting = settle(s, ctx);
  if (hunting && hunting.seconds >= 60 && !(s.lastReward?.type==='coop'&&s.lastReward?.mode==='wave')) {
    s.lastReward = { type: "offline", ...hunting };
    events.push(s.lastReward);
  }
  const bossResult = bossSettle(s, ctx, events);
  if (bossResult) events.push(bossResult);
  // Queued combat controls can arrive after a lethal tick or a finished sync.
  // Keep the settled reward instead of throwing and rolling back the victory.
  if (!s.battle && ["skill","battlePotion","abandon"].includes(command)) return {state:s,events};
  if (command === "sync") return { state: s, events };
  if (command === "ack") {
    s.lastReward = null;
    return { state: s, events };
  }
  if (command === "abandon") {
    check(s.battle, "NO_BATTLE");
    s.battle = null; s.hunting = true; s.lastAt = ctx.now;
    return {state:s, events:[...events, {type:"abandon"}]};
  }
  if (command === "skill") {
    check(s.battle, "NO_BATTLE");
    const b = s.battle;
    const slot=args.slot===5?5:args.slot===4?4:args.slot===3?3:args.slot===2?2:1;
    check(slot===5?fifthUnlocked(s):slot===1?firstJobUnlocked(s):(s.advancement||0)>=slot-1,"ADVANCEMENT_REQUIRED");
    const sk=slot===5?FIFTH_SKILLS[s.classId]:slot===4?FOURTH_SKILLS[s.classId]:slot===3?THIRD_SKILLS[s.classId]:slot===2?SECOND_SKILLS[s.classId]:CLASS_SKILLS[s.classId];
    const ready=slot===5?'fifthReadyAt':slot===4?'fourthReadyAt':slot===3?'thirdReadyAt':slot===2?'secondReady':'skillReady';
    check(ctx.now >= (b[ready]||0),"SKILL_COOLDOWN");
    b[ready]=ctx.now+sk.cooldown*1000;
    if(slot===5){Object.assign(b,{classId:s.classId,advancement:s.advancement,x:0,y:100});beginFifth(b,{x:0,y:0},b.tick*10);}
    else if(slot===4){Object.assign(b,{classId:s.classId,advancement:s.advancement,x:0,y:100});beginFourth(b,{x:0,y:0},b.tick*10);}
    else if(slot===3){Object.assign(b,{classId:s.classId,advancement:s.advancement,x:0,y:100});beginThird(b,{x:0,y:0},b.tick*10);}
    else {Object.assign(b,{classId:s.classId,advancement:s.advancement,x:0,y:100});scheduleCombatSkill(b,{x:0,y:0},b.tick*10,slot);}
    if(s.classId==='priest'){
      stepPriest(b,[{x:0,y:0}],b.tick*10,slot,scale=>{const crit=ctx.random()<b.power.crit;b.enemyHp=Math.max(0,b.enemyHp-Math.round(holyDamage(b,b.power.attack*scale*(crit?b.power.critDamage:1),b.tick*10)*b.power.boss));});
      supportTick([b],b.tick*10);
    }
    events.push({type:'skill',slot});
    // Priest skills can deal lethal damage immediately, before the next tick.
    if (b.enemyHp <= 0) {
      const reward = bossSettle(s, ctx, events);
      if (reward) events.push(reward);
    }
    return { state: s, events };
  }
  if(command==="battlePotion"){const b=s.battle;check(b&&b.kind!=="tower","NO_BATTLE");check((b.potions||0)<3&&ctx.now>=(b.potionReady||0),"SKILL_COOLDOWN");b.potions=(b.potions||0)+1;b.potionReady=ctx.now+20000;b.hp=Math.min(b.power.hp,b.hp+b.power.hp*.25);return {state:s,events};}
  check(!s.battle, "BATTLE_IN_PROGRESS");
  if(command.startsWith("fish")){events.push(fishingCommand(s,command,args,ctx));return {state:s,events};}
  switch (command) {
    case "consumableBuy":
    case "consumableUse": {events.push(consumableCommand(s,command,args.id,ctx.now));break;}
    case "costumeBuy":
    case "costumeEquip":
    case "costumeUnequip": {events.push(costumeCommand(s,command,args.id));break;}
    case "petSummon": {throw Error("FISHING_SUMMON_REMOVED");}
    case "petEquip": {equipPet(s,args.id);break;}
    case "exchangeGear": {
      check(int(args.level,10,180)&&args.level%10===0,"INVALID_GEAR_LEVEL");
      check(CLASSES.some(c=>c.id===args.classId),"INVALID_CLASS");
      spend(s,"fragment",args.level);
      const slot=Math.floor(ctx.random()*9),design=selectDesign(args.level,args.classId,slot,false,ctx.random);
      const item={...makeItem(args.level,args.classId,slot,false,ctx,design.weaponVariant),...design};
      item.baseStats=rollBaseStats(item,ctx.random);addItem(s,item);
      events.push({type:"exchangeGear",item,cost:args.level,stored:!s.items.some(it=>it.id===item.id)});break;
    }
    case "adminSkip": {
      check(ctx.admin===true,"BETA_DISABLED");
      check(int(args.hours,1,12),"INVALID_SKIP_HOURS");
      const reward={type:"offline",adminSkip:true,hours:args.hours,seconds:0,kills:0,defeats:0,xp:0,gold:0,drops:[],fragment:0,cube:0,scroll:0,stored:0};
      const hunting=s.hunting;s.hunting=true;
      // Use the real hunting calculation without advancing the saved wall clock.
      for(let hour=0;hour<args.hours;hour++){
        s.lastAt=ctx.now-3600000;
        const part=settle(s,ctx);
        if(part){for(const key of ["seconds","kills","defeats","xp","gold","fragment","cube","scroll","stored"])reward[key]+=Number(part[key]||0);reward.drops.push(...part.drops);}
      }
      s.hunting=hunting;s.lastAt=ctx.now;s.lastReward=reward;events.push(reward);
      break;
    }
    case "betaGrant":
    case "betaLevel":
    case "betaBossReset":
      check(ctx.admin===true,"BETA_DISABLED");
      events.push(applyBetaTool(s,command,args,ctx.now));
      break;
    case "changeClass": {
      const target = CLASSES.find(c => c.id === args.classId);
      check(target, "INVALID_CLASS");
      check(target.id !== s.classId, "ALREADY_CLASS");
      check(!s.pendingCube, "ITEM_CUBE_PENDING");
      const previousClass = s.classId;
      s.classBuilds ||= {};
      s.classBuilds[previousClass] = {...s.stats};
      const restored = s.classBuilds[target.id];
      s.stats = restored ? {...restored} : {STR:4,DEX:4,INT:4,LUK:4};
      const allocated = Object.values(s.stats).reduce((total,value) => total + Math.max(0,value-4),0);
      s.points = Math.max(0,(s.level-1)*5-allocated);
      s.classId = target.id;
      s.equippedCostume = null;
      s.equipped = {};
      s.hunting = false;
      s.huntRemainder = 0;
      s.lastAt = ctx.now;
      s.classStarters ||= [previousClass];
      if (!s.classStarters.includes(target.id)) {
        s.classStarters.push(target.id);
        const starter = makeItem(1,target.id,0,false,ctx,0);
        starter.bound = true;
        normalizePotentialItem(starter);
        addItem(s,starter);
      }
      events.push({type:"classChange",from:previousClass,to:target.id});
      break;
    }
    case "attendanceClaim": {
      const today = dayKey(ctx.now);
      const previous = s.attendance || {day:0,lastClaim:null};
      check(previous.lastClaim !== today, "ALREADY_ATTENDANCE_CLAIMED");
      const day = (Number.isInteger(previous.day) && previous.day >= 0 && previous.day <= 7 ? previous.day % 7 : 0) + 1;
      const reward = ATTENDANCE_REWARDS[day-1];
      s.gold += reward.gold || 0;
      for (const [key, amount] of Object.entries(reward)) if (key !== "gold") s.materials[key] += amount;
      s.attendance = {day,lastClaim:today};
      events.push({type:"attendance",day,reward});
      break;
    }
    case 'towerStart': {
      check(int(args.floor,1,TOWER_FLOORS.length)&&!!TOWER_FLOORS[args.floor-1],'INVALID_TOWER_FLOOR');
      check(!s.pendingCube,'ITEM_CUBE_PENDING');
      s.tower ||= {cleared:[],best:{}};
      s.battle=newTowerBattle(args.floor,s.classId,power(s),ctx.now,ctx.uuid(),Math.floor(ctx.random()*4294967296),s.advancement>=1);
      s.hunting=false;s.lastAt=ctx.now;s.lastReward=null;break;
    }
    case "claimSystemMail": {
      events.push(claimSystemMail(s,args.id,()=>{const fixed=args.id==='gift-ringu-100-archer-20261002'&&ctx.accountId==='6636b846-8005-4cfe-b325-b96da657ece4';const design=fixed?selectDesign(100,'archer',0,true,ctx.random):null;const item=fixed?{...makeItem(100,'archer',0,true,ctx,design.weaponVariant),...design}:makeLootItem(100,s.classId,Math.floor(ctx.random()*9),true,ctx);if(fixed)item.baseStats=rollBaseStats(item,ctx.random);const stored=s.items.length>=300;addItem(s,item);return {item,stored};}));
      break;
    }
    case "claimMail": {
      const mail = s.mailbox?.find(x => x.key === args.key);
      check(mail, "MAIL_NOT_FOUND");
      check(s.items.length < 300, "INVENTORY_FULL");
      const count = Math.min(mail.quantity, 300 - s.items.length, 50);
      for (let n = 0; n < count; n++) s.items.push({...mail.item, id:ctx.uuid()});
      mail.quantity -= count;
      s.mailbox = s.mailbox.filter(x => x.quantity > 0);
      events.push({type:"mail", count});
      break;
    }
    case "hunt":
      s.hunting = Boolean(args.enabled);
      s.lastAt = ctx.now;
      break;
    case "stage": {
      check(int(args.id, 0, STAGES.length-1)&&!!STAGES[args.id], "INVALID_STAGE");
      s.stage = args.id;
      s.huntRemainder = 0;
      s.lastAt = ctx.now;
      s.hunting = true;
      break;
    }
    case "stats": {
      check(
        ["STR", "DEX", "INT", "LUK"].includes(args.key) &&
          int(args.amount, 1, s.points),
        "INVALID_STATS",
      );
      s.stats[args.key] += args.amount;
      s.points -= args.amount;
      break;
    }
    case "resetStats": {
      spend(s, "gold", 5000);
      s.stats = { STR: 4, DEX: 4, INT: 4, LUK: 4 };
      s.points = (s.level - 1) * 5;
      break;
    }
    case "autoEquip": {
      check(!s.pendingCube, "ITEM_CUBE_PENDING");
      const result=bestEquipment(s);
      s.equipped=result.equipped;
      events.push({type:"autoEquip",before:result.before,after:result.after,changed:result.changed});
      break;
    }
    case "equip": {
      const it = gear(s, args.id);
      check(!it.broken, "ITEM_BROKEN");
      check(
        it.classId === s.classId && it.level <= s.level,
        "ITEM_REQUIREMENT",
      );
      s.equipped[it.slot] = it.id;
      break;
    }
    case "unequip": {
      check(int(args.slot, 0, 8), "INVALID_SLOT");
      delete s.equipped[args.slot];
      break;
    }
    case "lock": {
      const it = gear(s, args.id);
      it.locked = !it.locked;
      break;
    }
    case "shopSell": {
      const it=gear(s,args.id);
      check(it.boss===true,"SHOP_BOSS_ONLY");
      writable(s,it);
      check(!Object.values(s.equipped).includes(it.id),"ITEM_EQUIPPED");
      const gold=bossSalePrice(it);
      check(gold>0,"INVALID_SHOP_ITEM");
      check(Number.isSafeInteger(s.gold+gold),"INVALID_SHOP_GOLD_RANGE");
      removeItem(s,it);s.gold+=gold;
      events.push({type:"shopSell",item:it,gold});
      break;
    }
    case "salvage": {
      check(
        Array.isArray(args.ids) && args.ids.length > 0 && args.ids.length <= 50,
        "INVALID_ITEMS",
      );
      const ids = [...new Set(args.ids)];
      const list = ids.map((id) => gear(s, id));
      for (const it of list) {
        writable(s, it);
        check(!Object.values(s.equipped).includes(it.id), "ITEM_EQUIPPED");
      }
      const fragments=list.reduce((sum,it)=>sum+salvageYield(it),0);
      for (const it of list) {
        s.materials.fragment +=
          salvageYield(it);
        removeItem(s, it);
      }
      events.push({type:"salvage",count:list.length,fragments});
      break;
    }
    case "dailyClaim": {
 const task=DAILY_TASKS[args.key];check(task&&s.daily[args.key]>=task.goal&&!s.daily.claimed.includes(args.key),"DAILY_NOT_READY");
 s.daily.claimed.push(args.key);s.gold+=task.gold;for(const key of ["fragment","cube","highCube"])s.materials[key]+=task[key];levelUp(s,xpNeeded(s.level)*.05);events.push({type:"daily",name:task.name});break;
 }
    case "star": {
      const it = gear(s, args.id);
      writable(s, it);
      check(it.stars < 25, "MAX_STARS");
      const cost = starCost(it),
        odds = starOdds(it.stars),
        before = it.stars;
      spend(s, "gold", cost);
      const r = ctx.random();
      let outcome;
      if (r < odds.success) {
        it.stars++;
        outcome = "success";
      } else if (r < odds.success + odds.destroy) {
        it.broken = true;
        for (const k of Object.keys(s.equipped))
          if (s.equipped[k] === it.id) delete s.equipped[k];
        outcome = "destroy";
      } else if (r < odds.success + odds.destroy + odds.down) {
        it.stars--;
        outcome = "down";
      } else outcome = "keep";
      events.push({
        type: "star",
        id: it.id,
        before,
        after: it.stars,
        outcome,
        gains:outcome==="success"?{attack:gearAttributes(it).attack-gearAttributes(it,before).attack,stat:gearAttributes(it).stat-gearAttributes(it,before).stat,hp:gearAttributes(it).hp-gearAttributes(it,before).hp}:null,
        cost,
      });
      break;
    }
    case "restore": {
      const it = gear(s, args.id),
        material = gear(s, args.materialId);
      check(
        it.id !== material.id && it.broken && !it.locked,
        "INVALID_RESTORE",
      );
      writable(s, material);
      check(!Object.values(s.equipped).includes(material.id), "ITEM_EQUIPPED");
      check(
        equipmentKey(it) === equipmentKey(material),
        "ITEM_MISMATCH",
      );
      removeItem(s, material);
      it.broken = false;
      it.stars = 12;
      events.push({ type: "restore", id: it.id });
      break;
    }
    case "potential": {
      const it=gear(s,args.id);writable(s,it);check(!it.lines.length,"POTENTIAL_ALREADY_OPEN");
      check(!s.pendingCube,"ITEM_CUBE_PENDING");spend(s,"scroll",1);
      it.potentialUnlocked=true;it.potentialVersion=5;fillPotentialLines(it,ctx.random);
      events.push({type:"potential",id:it.id});break;
    }
    case "cube": {
      const it=gear(s,args.id);writable(s,it);
      check(it.lines.length>0,"POTENTIAL_REQUIRED");check(!s.pendingCube,"ITEM_CUBE_PENDING");
      const kind=args.kind??(args.high===true?"highCube":"cube");
      check(Object.hasOwn(CUBES,kind),"INVALID_CUBE");
      const rule=CUBES[kind],previousGrade=it.grade;
      check(it.grade<=rule.maxGrade,"INVALID_CUBE_GRADE");
      const locking=args.lock!==undefined&&args.lock!==null&&args.lock!==-1;
      check(!locking||!(rule.prime&&it.grade<3),"POTENTIAL_LOCK_EPIC_REQUIRED");
      const grade=locking?it.grade:cubeUpgrade(s,kind,it.grade,ctx.random);
      const lock=args.lock===undefined||args.lock===null?-1:args.lock;
      check(Number.isInteger(lock)&&lock>=-1&&lock<it.lines.length,"INVALID_POTENTIAL_LOCK");
      if(lock>=0){check(grade===previousGrade,"POTENTIAL_LOCK_GRADE_CHANGED");spend(s,"potentialLock",1);}
      let lines;
      for(let attempt=0;attempt<256;attempt++){
        lines=rerollCube(kind,it,grade,ctx.random);
        if(lock>=0)lines[lock]=structuredClone(it.lines[lock]);
        if(JSON.stringify(lines.map(l=>[l.key,l.value,l.grade]))!==JSON.stringify(it.lines.map(l=>[l.key,l.value,l.grade])))break;
        check(attempt<255,"CUBE_RANDOM_RETRY");
      }
      spend(s,kind,1);spend(s,"gold",cubeCost(kind,it));
      if(rule.choose)s.pendingCube={id:it.id,kind,grade,previousGrade,lines,potentialVersion:4,lock};
      else {it.grade=grade;it.lines=lines;}
      events.push({type:"cube",id:it.id,kind,high:rule.choose,up:grade>previousGrade});break;
    }
    case "cubeChoose": {
      check(s.pendingCube,"NO_PENDING_CUBE");check(typeof args.apply==="boolean","INVALID_CHOICE");
      const it=s.items.find(x=>x.id===s.pendingCube.id);check(it,"ITEM_NOT_FOUND");
      if(args.apply){it.grade=s.pendingCube.grade;it.lines=s.pendingCube.lines;}
      s.pendingCube=null;break;
    }
    case "boss": {
      check(int(args.id, 0, 29), "INVALID_BOSS");
      const b = BOSSES[args.id];
      const practice = args.practice === true;
      check(!s.pendingCube, "ITEM_CUBE_PENDING");
      const p = power(s);
      if(b.weekly){check(s.isAdmin||practice||s.bossClaims?.[b.id]!==weekKey(ctx.now),"BOSS_LIMIT");s.battle=newTowerBattle(b.region+1,s.classId,p,ctx.now,ctx.uuid(),Math.floor(ctx.random()*4294967296),s.advancement>=1);Object.assign(s.battle,{weeklyBossId:b.id,claimKey:weekKey(ctx.now),practice,enemyHp:b.hp,encounter:{...TOWER_FLOORS[b.region],name:b.name,level:b.level,hp:b.hp,attack:b.attack,seconds:90}});s.hunting=false;s.lastAt=ctx.now;s.lastReward=null;break;}
      if(!practice){const today=dayKey(ctx.now);check(s.isAdmin||s.bossClaims?.[b.id]!==today,"BOSS_LIMIT");}
      s.battle = {
        kind: "boss",
        bossId: b.id,
        claimKey: b.weekly ? weekKey(ctx.now) : dayKey(ctx.now),
        started: ctx.now,
        tick: 0,
        hp: p.hp,
        enemyHp: b.hp,
        power: p,
        practice,
        skillReady: ctx.now,
        guardUntil: 0,
        burstUntil: 0,
      };
      s.hunting = false;
      break;
    }
    case "advance":
    case "advancementStart": {
      const next=nextTrialStage(s),stage=args.stage===undefined?next:args.stage;check(Number.isInteger(stage)&&stage>=0&&stage<=4,stage===5?'ALREADY_ADVANCED':'INVALID_TRIAL');const trial=ADVANCEMENT_BOSSES.find(t=>t.stage===stage);check(stage<=next,'ADVANCEMENT_REQUIRED');const practice=stage<next;check(s.level>=trial.level,'LEVEL_REQUIRED');check(!s.pendingCube,'ITEM_CUBE_PENDING');
      s.battle=newTowerBattle(trial.floor,s.classId,power(s),ctx.now,ctx.uuid(),Math.floor(ctx.random()*4294967296),s.advancement>=1);Object.assign(s.battle,{advancementStage:stage,advancementPractice:practice,encounter:trial,enemyHp:trial.hp});s.hunting=false;s.lastAt=ctx.now;s.lastReward=null;break;
    }
    case "tutorial":
      s.tutorial = Math.min(6, s.tutorial + 1);
      break;
    default:
      fail("UNKNOWN_COMMAND");
  }
  check(
    Number.isSafeInteger(s.gold) && s.gold >= 0 && s.gold <= 9e12,
    "INVALID_GOLD",
  );
  return { state: s, events };
}


// Called only by the authenticated cooperative endpoint; persisted atomically with the personal chest claim.
export function grantCoopChest(input,tier,ctx){
 const s=normalizePotentialState(structuredClone(input)),reward=rollRiftReward(tier,ctx.random);
 s.gold+=reward.gold;for(const key of ['cube','highCube','primeCube','fragment','scroll'])s.materials[key]=(s.materials[key]||0)+reward[key];
 if(reward.gear){const classId=pick(CLASSES,ctx).id,slot=Math.floor(ctx.random()*SLOTS.length),design=selectDesign(reward.level,classId,slot,false,ctx.random);
  const item={...makeItem(reward.level,classId,slot,false,ctx,design.weaponVariant),...design};item.baseStats=rollBaseStats(item,ctx.random);addItem(s,item);reward.items.push(item);}
 delete reward.gear;delete s.coopRoom;s.hunting=true;s.lastAt=ctx.now;s.lastReward=reward;return {state:s,reward};
}

export function grantRaidChest(input,tier,ctx){
 const s=normalizePotentialState(structuredClone(input)),raid=RAID_ENCOUNTERS[tier];check(raid,'INVALID_RAID');const weekly=raidWeeklyStatus(s,ctx.now),practice=weekly.remaining===0;
 const reward=practice?{type:'coop',mode:'raid',name:raid.name,won:true,practice:true,gold:0,cube:0,highCube:0,primeCube:0,fragment:0,scroll:0,items:[]}:rollRaidReward(tier,ctx.random,s,ctx.now);
 if(!practice){
  s.gold+=reward.gold;
  for(const key of ['cube','highCube','primeCube','fragment','scroll'])s.materials[key]=(s.materials[key]||0)+reward[key];
  if(ctx.random()<rewardChance(raid.bossGearChance??0.6,s,ctx.now)){
   const level=raid.level,classId=pick(CLASSES,ctx).id,slot=balanceBossGearSlot(Math.floor(ctx.random()*SLOTS.length),ctx),design=selectDesign(level,classId,slot,true,ctx.random);
   const item={...makeItem(level,classId,slot,true,ctx,design.weaponVariant),...design};item.baseStats=rollBaseStats(item,ctx.random);
   const stored=s.items.length>=300;addItem(s,item);reward.items.push(item);if(stored)reward.stored=(reward.stored||0)+1;
  }
  s.raidWeekly={week:weekly.week,count:weekly.used+1};
 }
 Object.assign(reward,{weeklyUsed:weekly.used+(practice?0:1),weeklyLimit:weekly.limit,weeklyRemaining:Math.max(0,weekly.remaining-(practice?0:1))});
 delete s.coopRoom;s.hunting=true;s.lastAt=ctx.now;s.lastReward=reward;return {state:s,reward};
}
