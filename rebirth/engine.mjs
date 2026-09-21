import {
  VERSION,
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
  CUBE_UP,
  HIGH_CUBE_UP,
  LINE_WEIGHTS,
  EQUIP_DROP,
  CUBE_DROP,
  SCROLL_DROP,
  xpNeeded,
  starCost,
  starOdds,
  optionPool,
  optionValue,
  dayKey,
  weekKey,
  DUNGEONS,
  CLASS_SKILLS,
  weaponVariant,
  equipmentKey,
  WEAPON_TYPES,
} from "./data.mjs?v=adventure-3";

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
    lines: [],
    locked: false,
    broken: false,
  };
}
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
  starter.bound = true;
  return {
    version: VERSION,
    name,
    classId,
    level: 1,
    xp: 0,
    points: 0,
    stats: { STR: 4, DEX: 4, INT: 4, LUK: 4 },
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
  };
  const sets = {};
  let stars = 0;
  for (const id of Object.values(s.equipped)) {
    const it = s.items.find((x) => x.id === id);
    if (!it || it.broken) continue;
    stars += it.stars;
    const growth =
        1 + it.stars * 0.055 + Math.max(0, it.stars - 15) ** 1.4 * 0.025,
      base = (5 + it.level ** 1.28) * (it.boss ? 1.22 : 1);
    flat += base * (it.slot === 0 ? 0.9 : 0.11) * growth;
    primary += Math.floor((2 + it.level * 0.5) * growth);
    hp += it.level * 4;
    defense += it.level * 0.2;
    for (const line of it.lines) pct[line.key] += line.value;
    if (it.boss) sets[it.level] = (sets[it.level] || 0) + 1;
  }
  for (const n of Object.values(sets)) {
    if (n >= 3) pct[cl.stat] += 5;
    if (n >= 6) pct.attack += 5;
    if (n >= 9) pct.boss += 10;
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
  return {
    attack: Math.floor(flat),
    primary: Math.floor(primary),
    hp,
    defense: Math.floor(defense),
    crit,
    critDamage,
    cadence,
    boss: 1 + pct.boss / 100,
    stars,
    dps: flat * (1 + crit * (critDamage - 1)) * cadence,
  };
}
export function huntingRate(s) {
  const st = STAGES[s.stage],
    p = power(s);
  const duration = Math.max(2, Math.ceil(st.hp / p.dps));
  const incoming = Math.max(1, st.attack - p.defense * 0.25);
  const survives = Math.floor(duration / 3) * incoming < p.hp;
  return { seconds: survives ? duration : Math.max(3, Math.ceil(p.hp / incoming) * 3) + 10,
    xp: survives ? st.xp : 0, gold: survives ? st.gold : 0, survives };
}
function levelUp(s, xp) {
  s.xp += xp;
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
    const stack = s.mailbox.find(x => x.key === key);
    if (stack) stack.quantity++;
    else { const {id, ...template} = item; s.mailbox.push({key, item: template, quantity: 1}); }
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
  if (!s.hunting || s.battle || !seconds) return null;
  let remaining = seconds + s.huntRemainder, kills = 0, xp = 0, defeats = 0;
  // Recalculate at level boundaries so offline and frequent online settlement agree.
  while (remaining > 0) {
    const rate = huntingRate(s);
    let count = Math.floor(remaining / rate.seconds);
    if (!count) break;
    if (!rate.survives) { defeats += count; remaining %= rate.seconds; break; }
    if (s.level < 200) count = Math.min(count, Math.ceil((xpNeeded(s.level) - s.xp) / rate.xp));
    remaining -= count * rate.seconds;
    kills += count; xp += count * rate.xp;
    levelUp(s, count * rate.xp);
  }
  s.huntRemainder = remaining;
  s.huntKills = (s.huntKills || 0) + kills;
  const goldExact = kills * STAGES[s.stage].gold + (s.goldRemainder || 0),
    gold = Math.floor(goldExact);
  s.goldRemainder = goldExact - gold;
  s.gold += gold;
  const drops = [];
  const capacity = Math.max(0, 300 - s.items.length), gearCount = rollCount(kills, EQUIP_DROP, ctx);
  for (let i = 0; i < gearCount; i++) {
    const item = makeItem(
      STAGES[s.stage].dropLevel,
      pick(CLASSES, ctx).id,
      Math.floor(ctx.random() * 9),
      false,
      ctx,
    );
    addItem(s, item);
    drops.push(item.id);
  }
  const fragments =
      rollCount(kills, 0.035, ctx),
    cubes = rollCount(kills, CUBE_DROP, ctx),
    scrolls = rollCount(kills, SCROLL_DROP, ctx);
  s.materials.fragment += fragments;
  s.materials.cube += cubes;
  s.materials.scroll += scrolls;
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
function rollLines(it, ctx) {
  const pool = optionPool(it.slot);
  return it.lines.map(() => {
    const key = pick(pool, ctx);
    return { key, value: optionValue(key, it.grade) };
  });
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
  return b.kind === "dungeon" ? { ...DUNGEONS[b.dungeon], ...b.enemy } : BOSSES[b.bossId];
}
function bossSettle(s, ctx, events) {
  const b = s.battle;
  if (!b) return null;
  const boss = battleEnemy(b);
  const frames = [];
  const skill = CLASS_SKILLS[s.classId];
  const upto = Math.min(
    boss.seconds,
    Math.max(0, Math.floor((ctx.now - b.started) / 1000)),
  );
  for (let t = b.tick + 1; t <= upto; t++) {
    const active = t <= b.burstUntil;
    const burst = active ? skill.damage : 1;
    const crit = ctx.random() < (active && skill.crit ? skill.crit : b.power.crit);
    const damage = Math.round(b.power.attack * (crit ? b.power.critDamage : 1) * b.power.boss * burst * b.power.cadence);
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
          (boss.attack * (telegraph ? boss.patternMultiplier : 1) - b.power.defense * 0.4) *
            (guarded ? skill.guard : 1),
        ),
      );
      b.hp = Math.max(0, b.hp - frame.incoming);
    }
    if (b.hp <= 0) break;
  }
  if (frames.length) events.push({type:"combat", frames});
  if (b.enemyHp > 0 && b.hp > 0 && b.tick < boss.seconds) return null;
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
      if (b.dungeon === "cube") s.materials.cube += 3;
      else if (b.dungeon === "relic") {
        const it = makeItem(200, pick(CLASSES,ctx).id, Math.floor(ctx.random()*9),false,ctx);
        addItem(s,it); reward.items.push(it.id); s.gold += 5000; s.materials.fragment += 30;
      } else s.materials.fragment += 30;
    } else {
    s.bossClaims[boss.id] = b.claimKey;
    if (!s.cleared.includes(boss.id)) s.cleared.push(boss.id);
    s.bossMaterials[boss.region] =
      (s.bossMaterials[boss.region] || 0) + boss.material;
    reward.materials = boss.material;
    s.materials.cube += boss.weekly ? 3 : 1;
    if (boss.weekly) {
      s.materials.highCube++;
      if (ctx.random() < 0.2) s.materials.expand++;
    }
    if (ctx.random() < boss.dropChance) {
        const it = makeItem(
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
export function execute(input, command, args = {}, ctx) {
  check(
    ctx && Number.isFinite(ctx.now) && typeof ctx.random === "function",
    "INVALID_CONTEXT",
  );
  const s = structuredClone(input);
  check(s.version === VERSION, "VERSION_MISMATCH");
  check(!s.partyRoom || ["sync","ack"].includes(command), "PARTY_IN_PROGRESS");
  const events = [];
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
    check(ctx.now >= b.skillReady, "SKILL_COOLDOWN");
    b.skillReady = ctx.now + 30000;
    b.guardUntil = b.tick + CLASS_SKILLS[s.classId].seconds;
    b.burstUntil = b.guardUntil;
    events.push({ type: "skill" });
    return { state: s, events };
  }
  check(!s.battle, "BATTLE_IN_PROGRESS");
  switch (command) {
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
      check(s.level >= st.level, "LEVEL_REQUIRED");
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
      for (const it of list) {
        s.materials.fragment +=
          4 + Math.floor(it.level / 20) + (it.boss ? 10 : 0);
        removeItem(s, it);
      }
      break;
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
        ["level", "classId", "slot", "boss"].every(
          (k) => it[k] === material[k],
        ) && weaponVariant(it) === weaponVariant(material),
        "ITEM_MISMATCH",
      );
      removeItem(s, material);
      it.broken = false;
      it.stars = 12;
      events.push({ type: "restore", id: it.id });
      break;
    }
    case "potential": {
      const it = gear(s, args.id);
      writable(s, it);
      check(!it.lines.length, "ALREADY_OPEN");
      spend(s, "scroll", 1);
      spend(s, "gold", 500);
      const r = ctx.random(),
        n = r < 0.7 ? 1 : r < 0.97 ? 2 : 3;
      it.lines = Array.from({ length: n }, () => ({}));
      it.lines = rollLines(it, ctx);
      events.push({ type: "potential", id: it.id });
      break;
    }
    case "expand": {
      const it = gear(s, args.id);
      writable(s, it);
      check(it.lines.length > 0 && it.lines.length < 3, "INVALID_LINES");
      spend(s, "expand", it.lines.length === 1 ? 1 : 3);
      spend(s, "gold", 2000);
      const key = pick(optionPool(it.slot), ctx);
      it.lines.push({ key, value: optionValue(key, it.grade) });
      break;
    }
    case "cube": {
      const it = gear(s, args.id);
      writable(s, it);
      check(it.lines.length > 0, "POTENTIAL_REQUIRED");
      check(!s.pendingCube, "ITEM_CUBE_PENDING");
      const high = args.high === true;
      spend(s, high ? "highCube" : "cube", 1);
      spend(s, "gold", high ? 1000 : 300);
      const next = structuredClone(it);
      const oldGrade = it.grade;
      if (ctx.random() < (high ? HIGH_CUBE_UP : CUBE_UP)[it.grade])
        next.grade++;
      next.lines = rollLines(next, ctx);
      if (high)
        s.pendingCube = { id: it.id, grade: next.grade, lines: next.lines };
      else Object.assign(it, { grade: next.grade, lines: next.lines });
      events.push({ type: "cube", id: it.id, high, up: next.grade > oldGrade });
      break;
    }
    case "cubeChoose": {
      check(s.pendingCube, "NO_PENDING_CUBE");
      const it = s.items.find((x) => x.id === s.pendingCube.id);
      check(it, "ITEM_NOT_FOUND");
      if (args.apply === true) {
        it.grade = s.pendingCube.grade;
        it.lines = s.pendingCube.lines;
      }
      s.pendingCube = null;
      break;
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
      const it = makeItem(
        TIERS[args.region + 1],
        s.classId,
        args.slot,
        true,
        ctx,
        args.weaponVariant ?? 0,
      );
      addItem(s, it);
      events.push({ type: "craft", id: it.id });
      break;
    }
    case "craftScroll":
      spend(s, "fragment", 100);
      spend(s, "gold", 1000);
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
      const enemy = args.kind === "relic" ? { hp:2100000,attack:560,patternEvery:12,patternMultiplier:3,pattern:"여명의 파동",region:9 } : { hp: Math.round(5000 * 1.6 ** (tier-1)), attack: 30 + tier * 15,
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
