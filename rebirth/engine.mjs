import {incomingDamage,DAILY_TASKS,BALANCE_VERSION} from './journey-balance.mjs?v=journey-2';
import { CUBES, cubeCost, cubeUpgrade, rerollCube, rollCubeLine } from './maple-cubes.mjs?v=journey-2';
import {applyBetaTool} from './beta-tools.mjs?v=journey-2';
import {
  VERSION,
  normalizePotentialState,
  normalizePotentialItem,
  OFFLINE_SECONDS,
  CLASSES,
  SLOTS,
  TIERS,
  STAGES,
  BOSSES,
  REGIONS,
  MATERIALS,
  OPTIONS,
  STAR_SUCCESS,
  EQUIP_DROP,
  FIELD_BOSS_DROP,
  rollBaseStats,
  selectDesign,
  rollEquipmentLevel,
  salvageYield,
  CUBE_DROP,
  FRAGMENT_DROP,
  SUPPLY_EXCHANGE,
  SCROLL_DROP,
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
} from "./data.mjs?v=journey-4";

import { TOWER_FLOORS, newTowerBattle, towerStep, TOWER_STEP, upgradeTowerBattle } from './tower-model.mjs?v=journey-2';
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
  bag[key] -= n;
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
    potentialVersion: 4,
    lines: [],
    locked: false,
    broken: false,
  };
}
export function makeLootItem(base,classId,slot,boss,ctx,variant){const level=rollEquipmentLevel(base,ctx.random),design=selectDesign(level,classId,slot,boss,ctx.random);const item={...makeItem(level,classId,slot,boss,ctx,design.weaponVariant),...design};item.baseStats=rollBaseStats(item,ctx.random);return item;}

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
  return {
    version: VERSION,
    name,
    classId,
    level: 1,
    xp: 0,
    points: 0,
    stats: { STR: 4, DEX: 4, INT: 4, LUK: 4 },
    classBuilds: {},
    classStarters: [classId],
    gold: 500,
    stage: 0,
    hunting: true,
    lastAt: ctx.now,
    huntRemainder: 0,
    materials: { fragment: 0, scroll: 1, expand: 0, cube: 3, highCube: 0 },
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
  };
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
  primary *= 1 + pct[cl.stat] / 100;
  flat = (flat + primary * 0.65) * (1 + pct.attack / 100);
  hp = Math.floor(hp * (1 + pct.hp / 100));
  defense *= 1 + pct.defense / 100;
  const crit = Math.min(
    0.95,
    0.05 + pct.crit / 100 + (s.classId === "archer" ? 0.05 : 0),
  );
  const cadence = s.classId === "pirate" ? 1.08 : 1;
  if (s.classId === "warrior") { hp = Math.floor(hp * 1.15); defense *= 1.15; }
  if (s.classId === "mage") flat *= 1.06;
  const critDamage = s.classId === "rogue" ? 1.9 : 1.6;
  if (s.advancement === 1) { flat *= 1.08; hp = Math.floor(hp * 1.1); }
  const dps = flat * (1 + crit * (critDamage - 1)) * cadence;
  const stats = Object.fromEntries(Object.keys(fixedStats).map(key => {
    const growth = key === cl.stat ? s.level * 2 + equipmentStat : 0;
    const beforePercent = s.stats[key] + growth + fixedStats[key];
    return [key, {base:s.stats[key], growth, fixed:fixedStats[key], percent:pct[key], total:Math.floor(beforePercent * (1+pct[key]/100))}];
  }));
  return {
    stats,
    bonuses: {...pct},
    combatPower: Math.floor(dps * (1+pct.boss/100) + hp * 0.1 + Math.floor(defense) * 5),
    attack: Math.floor(flat),
    primary: Math.floor(primary),
    hp,
    defense: Math.floor(defense),
    crit,
    critDamage,
    cadence,
    boss: 1 + pct.boss / 100,
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
  const duration = Math.max(8, Math.ceil(st.hp / p.dps));
  const incoming = incomingDamage(st.attack,p.defense);
  const survives = Math.floor(duration / 3) * incoming < p.hp;
  return { seconds: survives ? duration : Math.max(3, Math.ceil(p.hp / incoming) * 3) + 10,
    xp: survives ? st.xp * Math.min(1,(st.level+15)/s.level)**2 * (1 + p.xpGain/100) : 0, gold: survives ? st.gold * (1 + p.goldGain/100) : 0, survives };
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
    const mailKey=key+"|lv"+item.level+(item.baseStats?"|s"+JSON.stringify(item.baseStats):"");
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
  let remaining = seconds + s.huntRemainder, kills = 0, xp = 0, defeats = 0;
  // Recalculate at level boundaries so offline and frequent online settlement agree.
  while (remaining > 0) {
    const rate = huntingRate(s);
    let count = Math.floor(remaining / rate.seconds);
    if (!count) break;
    if (!rate.survives) { defeats += count; remaining %= rate.seconds; break; }
    if (s.level < 200) count = Math.min(count, Math.ceil((xpNeeded(s.level) - s.xp - (s.xpRemainder || 0)) / rate.xp));
    remaining -= count * rate.seconds;
    kills += count; xp += count * rate.xp;
    levelUp(s, count * rate.xp);
  }
  s.huntRemainder = remaining;
  s.huntKills = (s.huntKills || 0) + kills;
  if(s.daily)s.daily.hunt+=kills;
  const goldExact = kills * huntingRate(s).gold + (s.goldRemainder || 0),
    gold = Math.floor(goldExact + 1e-9);
  s.goldRemainder = Math.max(0,goldExact - gold);
  s.gold += gold;
  const drops = [], loot=[];
  const capacity = Math.max(0, 300 - s.items.length), normalGearCount = rollCount(kills, EQUIP_DROP, ctx),bossGearCount=rollCount(kills,FIELD_BOSS_DROP,ctx),gearCount=normalGearCount+bossGearCount;
  for (let i = 0; i < gearCount; i++) {
    const item = makeLootItem(
      Math.min(STAGES[s.stage].dropLevel,Math.max(1,Math.floor(s.level/10)*10)),
      pick(CLASSES, ctx).id,
      Math.floor(ctx.random() * 9),
      i>=normalGearCount,
      ctx,
    );
    addItem(s, item);
    drops.push(item.id);loot.push({kind:"gear",item:{...item},quantity:1});
  }
  const fragments =
      rollCount(kills, FRAGMENT_DROP, ctx),
    cubes = rollCount(kills, CUBE_DROP, ctx),
    scrolls = rollCount(kills, SCROLL_DROP, ctx);
  s.materials.fragment += fragments;
  s.materials.cube += cubes;
  s.materials.scroll += scrolls;
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
  if(b.kind==='tower')return {...TOWER_FLOORS[b.floor-1],region:Math.min(9,b.floor-1)};
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
    const active = t <= b.burstUntil;
    const second = t <= (b.secondUntil||0) ? SECOND_SKILLS[s.classId] : null;
    const burst = (active ? skill.damage : 1) * (second?.damage||1);
    const crit = ctx.random() < Math.min(1,b.power.crit+(active?(skill.critAdd||0):0)+(second?.critAdd||0));
    const damage = Math.round(b.power.attack * (crit ? b.power.critDamage+(second?.critDamageAdd||0) : 1) * b.power.boss * burst * b.power.cadence);
    b.enemyHp = Math.max(0, b.enemyHp - damage);
    b.tick = t;
    const frame = {tick:t, damage, crit, incoming:0, enemyHp:b.enemyHp};
    frames.push(frame); if (frames.length > 3) frames.shift();
    if (b.enemyHp <= 0) break;
    if (t % 3 === 0 || t % boss.patternEvery === 0) {
      const telegraph = t % boss.patternEvery === 0;
      const guarded = t <= b.guardUntil;
      frame.incoming = Math.max(
        1,
        Math.floor(
          (incomingDamage(boss.attack,b.power.defense) * (telegraph ? boss.patternMultiplier : 1)) *
            (guarded ? skill.guard : 1) * (second?.guard||1),
        ),
      );
      b.hp = Math.max(0, b.hp - frame.incoming);
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
    s.bossMaterials[boss.region] =
      (s.bossMaterials[boss.region] || 0) + boss.material;
    reward.materials = boss.material;
    s.gold += boss.gold;reward.gold=boss.gold;
    s.materials.cube += boss.cubes;reward.cube=boss.cubes;
    if (boss.weekly) {
      s.materials.highCube+=2;
      if (ctx.random() < 0.2) s.materials.expand++;
    }
    if (ctx.random() < boss.dropChance) {
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
 const f=TOWER_FLOORS[b.floor-1];s.tower ||= {cleared:[],best:{}};
 const first=b.won&&!s.tower.cleared.includes(b.floor);
 if(b.won){if(first)s.tower.cleared.push(b.floor);s.tower.best[b.floor]=Math.min(s.tower.best[b.floor]||Infinity,b.tick/10);}
 const reward={type:'tower',floor:b.floor,won:b.won,first,seconds:b.tick/10,reason:b.reason||'',gold:0,fragment:0,cube:0,highCube:0};
 if(b.won){s.daily.tower++;}
 if(first||(b.won&&s.daily.tower<=3)){Object.assign(reward,Object.fromEntries(Object.entries(f.reward).map(([k,v])=>[k,first?v:Math.floor(v*.3)])));s.gold+=reward.gold;for(const key of ['fragment','cube','highCube'])s.materials[key]+=reward[key];}
 s.lastReward=reward;s.battle=null;s.lastAt=ctx.now;s.hunting=true;events.push(reward);
}
export function execute(input, command, args = {}, ctx) {
  check(
    ctx && Number.isFinite(ctx.now) && typeof ctx.random === "function",
    "INVALID_CONTEXT",
  );
  const s = normalizePotentialState(structuredClone(input));
  check(s.version === VERSION, "VERSION_MISMATCH");
  if(s.balanceVersion!==BALANCE_VERSION){s.xp=Math.floor(Math.min(.999999,s.xp/Math.round((100+s.level**2.4*4)*5))*xpNeeded(s.level));s.xpRemainder=0;}s.balanceVersion=BALANCE_VERSION;
  const dailyDay=dayKey(ctx.now);
  if(s.daily?.day!==dailyDay)s.daily={day:dailyDay,hunt:0,boss:0,tower:0,claimed:[]};
  check(!s.coopRoom || ["sync","ack"].includes(command), "BATTLE_IN_PROGRESS");
  check(!s.partyRoom || ["sync","ack"].includes(command), "PARTY_IN_PROGRESS");
  const events = [];
  if(s.battle?.kind==='tower'){
    const b=upgradeTowerBattle(s.battle);
    if(b.advanced===undefined)b.advanced=s.advancement===1;
    check(['sync','ack','towerInput','towerLeave'].includes(command),'BATTLE_IN_PROGRESS');
    if(ctx.now-b.started>=TOWER_FLOORS[b.floor-1].seconds*1000){b.ended=true;b.won=false;b.reason='timeout';}
    else if(command==='towerInput'){
      check(args.runId===b.runId,'INVALID_TOWER_RUN');
      check(int(args.from,0,b.tick)&&Array.isArray(args.frames)&&args.frames.length<=30,'INVALID_TOWER_INPUT');
      check(args.frames.every(f=>Array.isArray(f)&&f.length===3&&Number.isFinite(f[0])&&Number.isFinite(f[1])&&Math.abs(f[0])<=1&&Math.abs(f[1])<=1&&int(f[2],0,15)),'INVALID_TOWER_INPUT');
      const allowed=Math.floor(Math.max(0,ctx.now-b.started)/TOWER_STEP);
      for(let i=Math.max(0,b.tick-args.from);i<args.frames.length&&b.tick<allowed&&!b.ended;i++)towerStep(b,args.frames[i]);
    }else if(command==='towerLeave'){b.ended=true;b.won=false;b.reason='leave';}
    towerFinish(s,ctx,events);if(command==='ack')s.lastReward=null;return {state:s,events};
  }
  // A retried final input must never grant rewards twice.
  if(command==='towerInput'||command==='towerLeave')return {state:s,events};
  const hunting = settle(s, ctx);
  if (hunting && hunting.seconds >= 60) {
    s.lastReward = { type: "offline", ...hunting };
    events.push(s.lastReward);
  }
  const bossResult = bossSettle(s, ctx, events);
  if (bossResult) events.push(bossResult);
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
    const slot=args.slot===2?2:1;
    check(slot===1||s.advancement===1,"ADVANCEMENT_REQUIRED");
    const sk=slot===2?SECOND_SKILLS[s.classId]:CLASS_SKILLS[s.classId];
    const ready=slot===2?'secondReady':'skillReady';
    check(ctx.now >= (b[ready]||0),"SKILL_COOLDOWN");
    b[ready]=ctx.now+sk.cooldown*1000;
    if(sk.type==='attack'){
      const frames=[];
      for(let i=0;i<sk.hits;i++){
        const crit=ctx.random()<Math.min(1,b.power.crit+(sk.critAdd||0));
        const damage=Math.round(b.power.attack*sk.damage*b.power.boss*(crit?b.power.critDamage:1));
        b.enemyHp=Math.max(0,b.enemyHp-damage);frames.push({tick:b.tick,damage,crit,incoming:0,enemyHp:b.enemyHp});
      }
      events.push({type:'combat',frames});
      const reward=bossSettle(s,ctx,events);if(reward)events.push(reward);
    }else if(slot===2)b.secondUntil=b.tick+sk.seconds;
    else {b.guardUntil=b.tick+sk.seconds;b.burstUntil=b.guardUntil;}
    events.push({type:'skill',slot});
    return { state: s, events };
  }
  if(command==="battlePotion"){const b=s.battle;check(b&&b.kind!=="tower","NO_BATTLE");check((b.potions||0)<3&&ctx.now>=(b.potionReady||0),"SKILL_COOLDOWN");b.potions=(b.potions||0)+1;b.potionReady=ctx.now+20000;b.hp=Math.min(b.power.hp,b.hp+b.power.hp*.25);return {state:s,events};}
  check(!s.battle, "BATTLE_IN_PROGRESS");
  switch (command) {
    case "betaGrant":
    case "betaLevel":
    case "betaBossReset":
      check(ctx.betaTools===true,"BETA_DISABLED");
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
      check(int(args.floor,1,10),'INVALID_TOWER_FLOOR');
      check(s.level>=Math.max(10,args.floor*20-10),'LEVEL_REQUIRED');
      check(!s.pendingCube,'ITEM_CUBE_PENDING');
      s.tower ||= {cleared:[],best:{}};
      check(args.floor===1||s.tower.cleared.includes(args.floor-1),'PREVIOUS_FLOOR_REQUIRED');
      s.battle=newTowerBattle(args.floor,s.classId,power(s),ctx.now,ctx.uuid(),Math.floor(ctx.random()*4294967296),s.advancement===1);
      s.hunting=false;s.lastAt=ctx.now;s.lastReward=null;break;
    }
    case "supplyExchange": {
      const price=Object.hasOwn(SUPPLY_EXCHANGE,args.key)?SUPPLY_EXCHANGE[args.key]:null;
      check(price&&[1,5,10].includes(args.count),"INVALID_EXCHANGE");
      spend(s,"fragment",price.fragment*args.count);spend(s,"gold",price.gold*args.count);
      s.materials[args.key]+=args.count;events.push({type:"exchange",key:args.key,count:args.count});break;
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
      check(int(args.id, 0, 29), "INVALID_STAGE");
      const st = STAGES[args.id];
      check(power(s).stars >= st.star, "STARS_REQUIRED");
      check(
        st.region === 0 || s.cleared.includes(st.region * 3 - 1),
        "PREVIOUS_BOSS_REQUIRED",
      );
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
      const it=gear(s,args.id);writable(s,it);check(!it.lines.length,"ALREADY_OPEN");
      spend(s,"scroll",1);spend(s,"gold",500);
      it.grade=2;it.potentialVersion=4;
      const opening=ctx.random(),lineCount=opening<.7?1:opening<.97?2:3;
      it.lines=Array.from({length:lineCount},(_,i)=>rollCubeLine("cube",it,2,i,ctx.random));
      events.push({type:"potential",id:it.id});break;
    }
    case "expand": {
      const it=gear(s,args.id);writable(s,it);
      check(it.lines.length>0&&it.lines.length<3,"INVALID_LINES");
      spend(s,"expand",it.lines.length===1?1:3);spend(s,"gold",2000);
      it.lines.push(rollCubeLine("cube",it,it.grade,it.lines.length,ctx.random));break;
    }
    case "cube": {
      const it=gear(s,args.id);writable(s,it);
      check(it.lines.length>0,"POTENTIAL_REQUIRED");check(!s.pendingCube,"ITEM_CUBE_PENDING");
      const kind=args.kind??(args.high===true?"highCube":"cube");
      check(Object.hasOwn(CUBES,kind),"INVALID_CUBE");
      const rule=CUBES[kind],previousGrade=it.grade;
      check(it.grade<=rule.maxGrade,"INVALID_CUBE_GRADE");
      const grade=cubeUpgrade(s,kind,it.grade,ctx.random);
      const lines=rerollCube(kind,it,grade,ctx.random);
      spend(s,kind,1);spend(s,"gold",cubeCost(kind,it));
      if(rule.choose)s.pendingCube={id:it.id,kind,grade,previousGrade,lines,potentialVersion:4};
      else {it.grade=grade;it.lines=lines;}
      events.push({type:"cube",id:it.id,kind,high:rule.choose,up:grade>previousGrade});break;
    }
    case "cubeChoose": {
      check(s.pendingCube,"NO_PENDING_CUBE");check(typeof args.apply==="boolean","INVALID_CHOICE");
      const it=s.items.find(x=>x.id===s.pendingCube.id);check(it,"ITEM_NOT_FOUND");
      if(args.apply){it.grade=s.pendingCube.grade;it.lines=s.pendingCube.lines;}
      s.pendingCube=null;break;
    }
    case "craft": {
      check(int(args.region, 0, 9) && int(args.slot, 0, 8), "INVALID_CRAFT");
      check(args.weaponVariant === undefined || (int(args.weaponVariant,0,2) && (args.slot === 0 || args.weaponVariant === 0)), "INVALID_WEAPON_TYPE");
      check(
        s.cleared.some((id) => Math.floor(id / 3) === args.region),
        "BOSS_REQUIRED",
      );
      check(
        (s.bossMaterials[args.region] || 0) >= 24,
        "INSUFFICIENT_BOSS_MATERIAL",
      );
      check(s.items.length < 300, "INVENTORY_FULL");
      spend(s, "fragment", 60);
      spend(s, "gold", 3000 + args.region * 500);
      s.bossMaterials[args.region] -= 24;
      const it = makeLootItem(
        TIERS[args.region + 1],
        s.classId,
        args.slot,
        true,
        ctx,
        args.weaponVariant,
      );
      addItem(s, it);
      events.push({ type: "craft", id: it.id });
      break;
    }
    case "craftScroll":
      spend(s, "fragment", SUPPLY_EXCHANGE.scroll.fragment);
      spend(s, "gold", SUPPLY_EXCHANGE.scroll.gold);
      s.materials.scroll++;
      break;
    case "boss": {
      check(int(args.id, 0, 29), "INVALID_BOSS");
      const b = BOSSES[args.id];
      check(s.level >= b.level, "LEVEL_REQUIRED");
      check(
        b.id === 0 || s.cleared.includes(b.id - 1),
        "PREVIOUS_BOSS_REQUIRED",
      );
      const practice = args.practice === true;
      check(
        practice ||
          s.bossClaims[b.id] !==
            (b.weekly ? weekKey(ctx.now) : dayKey(ctx.now)),
        "BOSS_LIMIT",
      );
      check(!s.pendingCube, "ITEM_CUBE_PENDING");
      const p = power(s);
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
    case "dungeon": {
      check(["cube", "material", "relic"].includes(args.kind), "INVALID_DUNGEON");
      if (args.kind === "relic") check(s.level >= 200 && s.cleared.includes(29), "PREVIOUS_BOSS_REQUIRED");
      check(s.level >= 20, "LEVEL_REQUIRED");
      check(s.dungeonClaims[args.kind] !== dayKey(ctx.now), "DUNGEON_LIMIT");
      check(!s.pendingCube, "ITEM_CUBE_PENDING");
      const p = power(s), tier = Math.floor(s.level / 20);
      const enemy = args.kind === "relic" ? { hp:5200000,attack:1600,patternEvery:12,patternMultiplier:3,pattern:"여명의 파동",region:9 } : { hp: Math.round(12000 * 1.7 ** (tier-1)), attack: 35 + tier * tier * 12,
        patternEvery:15, patternMultiplier:2.5, pattern:"수정 폭발", region:Math.min(9,tier-1) };
      s.battle = {kind:"dungeon", dungeon:args.kind, enemy, claimKey:dayKey(ctx.now), started:ctx.now,
        tick:0, hp:p.hp, enemyHp:enemy.hp, power:p, practice:false,
        skillReady:ctx.now, guardUntil:0, burstUntil:0};
      s.hunting = false;
      events.push({type:"dungeonStart"});
      break;
    }
    case "advance":
      check(!s.battle, "BATTLE_IN_PROGRESS");
      check(s.level >= 60 && s.cleared.includes(8), "PREVIOUS_BOSS_REQUIRED");
      check(!s.advancement, "ALREADY_ADVANCED");
      s.advancement = 1;
      events.push({type:"advancement"});
      break;
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

