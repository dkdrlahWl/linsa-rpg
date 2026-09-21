import * as D from "./data.mjs?v=equipment-2";
import { installCurrencyIcons } from "./currency-icons.mjs?v=currency-art-1";
import { power, huntingRate, battleEnemy } from "./engine.mjs?v=equipment-2";
const $ = (s) => document.querySelector(s),
  app = $("#app"),
  modal = $("#modal"),
  config = window.RinguCloudConfig;
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const fmt = (n) => Math.floor(n || 0).toLocaleString("ko-KR");
const pct = (n) => (n * 100).toFixed(n < 0.001 ? 3 : 1) + "%";
const combatFrames = [];
let connectionLost = false, marketRequest = 0, lastVisualHit = 0;
let retryAt = 0, retryFailures = 0, characterName = "";
let session,
  settings = { sound: 0.3, music: 0, low: false },
  state = null,
  tab = "hunt",
  sub = "bag",
  busy = false,
  view = "game",
  chosenClass = "warrior",
  selected = null,
  marketPage = 0,
  mine = false,
  filterSlot = "",
  filterClass = "",
  marketRows = [],
  lastSync = 0;
try {
  session = JSON.parse(localStorage.getItem("ringu_rebirth_session"));
  settings = {
    ...settings,
    ...JSON.parse(localStorage.getItem("ringu_rebirth_settings") || "{}"),
  };
} catch {}
document.body.classList.toggle("low", settings.low);
const pendingKey = () => `ringu_rebirth_pending_${session?.user?.id || "none"}`;
const sounds = new (class {
  constructor() {
    this.ctx = null;
    this.musicTimer = null;
    this.voices = 0;
    this.lastHit = 0;
  }
  start() {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    try {
      if (!this.ctx) this.ctx = new Audio();
      if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
    } catch { this.ctx = null; }
  }
  tone(freq, duration, volume = 1, type = "sine", delay = 0) {
    if (!this.ctx || !settings.sound || document.hidden || this.voices >= 8)
      return;
    const c = this.ctx,
      o = c.createOscillator(),
      g = c.createGain(),
      t = c.currentTime + delay;
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(settings.sound * 0.09 * volume, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + duration + 0.03);
    this.voices++;
    o.onended = () => {
      this.voices--;
      o.disconnect();
      g.disconnect();
    };
  }
  play(kind) {
    if (kind === "hit") {
      if (Date.now() - this.lastHit < 350) return;
      this.lastHit = Date.now();
      this.tone(130, 0.12, 0.4, "triangle");
    } else if (["success", "craft", "potential", "restore"].includes(kind)) {
      [392, 494, 587].forEach((f, i) =>
        this.tone(f, 0.32, 0.7, "sine", i * 0.1),
      );
    } else if (kind === "cube") {
      [330, 440, 660].forEach((f, i) =>
        this.tone(f, 0.4, 0.6, "sine", i * 0.12),
      );
    } else if (["destroy", "down", "keep"].includes(kind)) {
      this.tone(180, 0.3, 0.6, "triangle");
      this.tone(120, 0.4, 0.5, "triangle", 0.12);
    } else this.tone(480, 0.07, 0.3);
  }
  music() {
    clearInterval(this.musicTimer);
    if (!this.ctx || !settings.music || document.hidden) return;
    let n = 0;
    this.musicTimer = setInterval(() => {
      const saved = settings.sound;
      settings.sound = settings.music;
      this.tone(
        [196, 246.94, 293.66, 246.94, 174.61, 220, 261.63, 220][n++ % 8],
        1.5,
        0.25,
      );
      settings.sound = saved;
    }, 1200);
  }
  pause() {
    clearInterval(this.musicTimer);
    this.ctx?.suspend();
  }
})();
document.addEventListener(
  "pointerdown",
  () => {
    sounds.start();
    sounds.music();
  },
  { once: true },
);
function toast(text) {
  $("#toast").textContent = text;
  $("#toast").classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => $("#toast").classList.remove("show"), 3500);
}
const errors = {
  REBIRTH_MAINTENANCE:
    "새로운 여정을 준비하고 있어요. 서비스가 열리면 시작할 수 있습니다.",
  LOGIN_REQUIRED: "다시 로그인해 주세요.",
  SESSION_ENDED: "종료된 로그인입니다. 다시 로그인해 주세요.",
  SESSION_REPLACED: "다른 기기에서 로그인했어요.",
  INSUFFICIENT_GOLD: "골드가 부족합니다.",
  INSUFFICIENT_CUBE: "일반 큐브가 부족합니다.",
  INSUFFICIENT_HIGHCUBE: "상급 큐브가 부족합니다.",
  INSUFFICIENT_SCROLL: "잠재 부여 주문서가 부족합니다.",
  INSUFFICIENT_EXPAND: "잠재 확장석이 부족합니다.",
  INSUFFICIENT_FRAGMENT: "장비 파편이 부족합니다.",
  INSUFFICIENT_BOSS_MATERIAL: "보스 재료가 부족합니다.",
  ITEM_PROTECTED: "잠금·파괴·장착 상태를 확인해 주세요.",
  ITEM_REQUIREMENT: "장비의 직업 또는 착용 레벨이 맞지 않습니다.",
  PREVIOUS_BOSS_REQUIRED: "이전 보스를 먼저 처치해 주세요.",
  LEVEL_REQUIRED: "레벨이 부족합니다.",
  STARS_REQUIRED: "장착 장비의 스타포스가 부족합니다.",
  BOSS_LIMIT: "이번 보상을 이미 받았습니다. 연습 도전은 가능합니다.",
  DUNGEON_LIMIT: "오늘 보상을 이미 받았습니다.",
  ITEM_CUBE_PENDING: "먼저 상급 큐브 결과를 선택해 주세요.",
  INVENTORY_FULL: "가방이 가득 찼습니다. 장비를 정리해 주세요.",
  TRADE_LEVEL_REQUIRED: "거래소 구매·등록은 20레벨부터 이용할 수 있습니다.",
  SAVE_CONFLICT: "상태가 변경됐어요. 다시 시도해 주세요.",
  SERVER_RETRY_REQUIRED: "연결을 확인하고 같은 요청을 다시 시도해 주세요.",
  LISTING_UNAVAILABLE: "이미 거래됐거나 만료된 매물입니다.",
  BATTLE_IN_PROGRESS: "보스전이 끝난 뒤 이용해 주세요.",
  SKILL_COOLDOWN: "스킬 재사용 대기 중입니다.",
};
function message(e) {
  return (
    errors[e.message] ||
    (/^INVALID/.test(e.message)
      ? "선택한 조건을 다시 확인해 주세요."
      : e.status === 429
        ? "요청이 많습니다. 잠시 후 다시 시도해 주세요."
        : "요청을 완료하지 못했습니다. " + e.message)
  );
}
function persist() {
  if (session)
    localStorage.setItem("ringu_rebirth_session", JSON.stringify(session));
  else localStorage.removeItem("ringu_rebirth_session");
}
async function request(path, body, auth = true) {
  const r = await fetch(config.url + path, {
    method: "POST",
    headers: {
      apikey: config.publishableKey,
      "Content-Type": "application/json",
      ...(auth ? { Authorization: "Bearer " + session.access_token } : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  const data = await r.json().catch(() => ({error: "SERVER_RETRY_REQUIRED"}));
  if (!r.ok) {
    const e = new Error(
      data.error || data.message || data.msg || "SERVER_RETRY_REQUIRED",
    );
    e.status = r.status;
    throw e;
  }
  return data;
}
async function ensureToken() {
  if (!session) throw new Error("LOGIN_REQUIRED");
  if (session.expires_at * 1000 < Date.now() + 60000) {
    session = await request(
      "/auth/v1/token?grant_type=refresh_token",
      { refresh_token: session.refresh_token },
      false,
    );
    session.expires_at =
      session.expires_at || Date.now() / 1000 + session.expires_in;
    persist();
  }
}
async function command(command, args = {}, quiet = false) {
  if (busy) return;
  busy = true;
  document
    .querySelectorAll("button[data-write]")
    .forEach((b) => (b.disabled = true));
  let body;
  try {
    await ensureToken();
    body = JSON.parse(localStorage.getItem(pendingKey()) || "null");
    if (
      body &&
      (body.command !== command ||
        JSON.stringify(body.args) !== JSON.stringify(args))
    ) {
      toast("이전 요청을 먼저 복구합니다.");
    }
    if (!body) {
      body = { command, args, requestId: crypto.randomUUID() };
      localStorage.setItem(pendingKey(), JSON.stringify(body));
    }
    const result = await request("/functions/v1/ringu-rebirth", body);
    localStorage.removeItem(pendingKey());
    state = result.state;
    lastSync = Date.now();
    connectionLost = false;
    retryAt = 0;
    retryFailures = 0;
    render();
    for (const event of result.result?.events || []) if(event.type === "combat") combatFrames.push(...event.frames);
    if (combatFrames.length > 6) combatFrames.splice(0, combatFrames.length - 6);
    if (!quiet || result.result?.events?.some(e=>["boss","dungeon"].includes(e.type))) showEvents(result.result?.events || []);
    return result;
  } catch (e) {
    if (e.status === 400) localStorage.removeItem(pendingKey());
    if (e.status === 401) {
      session = null;
      persist();
      login();
    }
    if (!e.status || e.status >= 500) {
      connectionLost = true;
      retryFailures++;
      retryAt = Date.now() + Math.min(60000, 5000 * 2 ** Math.min(retryFailures - 1, 4));
      const banner = $("#connection-status");
      if (banner) banner.hidden = false;
      if (!state && session) unavailable();
    }
    if (!quiet || !state) toast(message(e));
    throw e;
  } finally {
    busy = false;
    document
      .querySelectorAll("button[data-write]")
      .forEach((b) => (b.disabled = false));
  }
}
const icon = (name) => {
  const paths = {
    hunt: "M4 3l16 18M20 3L4 21M3 6l4-3M17 21l4-4",
    character: "M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8M4 21v-3a8 6 0 0 1 16 0v3",
    gear: "M8 3l4 3 4-3 6 5-4 4v9H6v-9L2 8z",
    boss: "M5 4l3 4h8l3-4v9l-3 7H8l-3-7zM8 12h2m4 0h2M10 17h4",
    market: "M12 3v18M4 7h16M5 7L2 15h6L5 7m14 0-3 8h6l-3-8M8 21h8",
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="${paths[name]}"/></svg>`;
};
const btn = (label, action, args = "", cls = "", write = false) =>
  `<button class="${cls}" data-action="${action}" data-arg="${esc(args)}" ${write ? "data-write" : ""}>${label}</button>`;
function header(title, kicker = "새로운 여정") {
  return `<div class="page-head"><div><p class="eyebrow">${kicker}</p><h2>${title}</h2></div>${tab === "hunt" ? '<span class="pill">오프라인 최대 6시간</span>' : ""}</div>`;
}
function shell(content) {
  const c = D.CLASSES.find((c) => c.id === state.classId);
  return `<div class="shell"><header class="top"><div class="brand">링구 RPG<br><small>REBIRTH</small></div><div class="identity"><strong>${esc(state.name)}</strong><br><small>Lv.${state.level} · ${c.name}</small></div><div class="money">${fmt(state.gold)} G<br><small>공격력 ${fmt(power(state).attack)}</small></div>${btn("설정", "settings")}</header><div id="connection-status" class="connection-status" role="status" ${connectionLost ? "" : "hidden"}>연결이 지연되고 있어요. 다시 연결되면 진행 상황을 불러옵니다. ${btn("다시 연결", "reconnect")}</div>${content}<nav class="bottom">${[
    ["hunt", "사냥"],
    ["character", "캐릭터"],
    ["gear", "장비"],
    ["boss", "보스"],
    ["market", "거래소"],
  ]
    .map(([k, label]) =>
      btn(icon(k) + label, "tab", k, tab === k ? "active" : ""),
    )
    .join("")}</nav></div>`;
}
function render() {
  if (!session) return login();
  if (!state) return createScreen();
  let content;
  if (view === "regions") content = regions();
  else
    content = {
      hunt: hunt,
      character: character,
      gear: inventory,
      boss: bosses,
      market: market,
    }[tab]();
  app.innerHTML = shell(content);
  if (state.pendingCube && !modal.open) cubeChoice();
}
function hunt() {
  const st = D.STAGES[state.stage],
    region = D.REGIONS[state.battle ? battleEnemy(state.battle).region : st.region],
    p = power(state),
    r = huntingRate(state),
    b = state.battle,
    boss = b && battleEnemy(b);
  return `${header(boss ? boss.name : st.name, region.name)}<div class="main-grid"><div><section class="panel"><div class="arena" data-class="${state.classId}" style="background-image:url('${region.background}')"><div class="battle-head"><small>${boss ? "BOSS · " + (b.kind === "dungeon" ? "수련" : boss.weekly ? "주간" : "일일") : "Lv." + st.level + " · 일반 사냥"}</small><h3>${boss ? boss.name : D.MONSTERS[st.id * 2 + (state.huntKills || 0) % 2].name}</h3><div class="hp"><i id="enemy-hp" style="width:${boss ? Math.max(0, (b.enemyHp / boss.hp) * 100) : 100}%"></i></div><small id="battle-info">${boss ? fmt(b.enemyHp) + " / " + fmt(boss.hp) : "다음 처치까지 약 " + r.seconds + "초"}</small></div><div class="monster">${boss ? bossMarkup(boss) : monsterMarkup(D.MONSTERS[st.id * 2 + (state.huntKills || 0) % 2])}</div><div class="combat-status"><span class="pill">${boss ? "보스 전투 중" : state.hunting ? "자동사냥 중" : "휴식 중"}</span>${boss ? `<p id="player-hp">내 HP ${fmt(b.hp)} / ${fmt(b.power.hp)}</p><div class="hp player-health"><i style="width:${Math.max(0, b.hp/b.power.hp*100)}%"></i></div><small id="pattern-info">${boss.pattern} · ${boss.patternEvery - b.tick % boss.patternEvery}초 후</small>` : !r.survives ? `<p class="error">생존 불가 · 하위 사냥터를 선택하세요</p>` : ""}</div></div><div class="pad"><div class="row spread"><small>Lv.${state.level} 경험치</small><small>${fmt(state.xp)} / ${fmt(D.xpNeeded(state.level))}</small></div><div class="exp"><i style="width:${Math.min(100, (state.xp / D.xpNeeded(state.level)) * 100)}%"></i></div><div class="metrics"><div><small>예상 시간당 경험치</small><b>${fmt((r.xp * 3600) / r.seconds)}</b></div><div><small>예상 시간당 골드</small><b>${fmt((r.gold * 3600) / r.seconds)}</b></div><div><small>드롭 장비</small><b>Lv.${st.dropLevel}</b></div></div><div class="actions">${boss ? btn(D.CLASSES.find((c) => c.id === state.classId).skill + " · 30초", "skill", "", "gold", true) : btn(state.hunting ? "사냥 중지" : "사냥 시작", "toggleHunt", "", "gold", true)}${btn("사냥터 변경", "regions")}${btn("보상 확인", "reward")}${boss ? btn("전투 포기", "abandonConfirm") : ""}</div>${boss ? `<p class="note">${D.CLASS_SKILLS[state.classId].description}<br>재사용 대기 30초 · 남은 전투 ${boss.seconds-b.tick}초</p>` : ""}</div></section></div><aside><div class="panel pad"><p class="eyebrow">오늘의 성장</p><h3>장비는 모험에서 얻습니다</h3><p class="note">일반 사냥으로 레벨을 올리고 보스에게서 세트 장비와 제작 재료를 얻으세요. 상위 사냥터는 경험치 중심으로 성장합니다.</p><div class="row wrap">${Object.entries(
    D.MATERIALS,
  )
    .map(
      ([k, v]) =>
        `<span class="currency">${v} <b>${fmt(state.materials[k])}</b></span>`,
    )
    .join(
      "",
    )}</div></div><div class="panel pad"><h3>다음 목표</h3><p class="note">${state.cleared.length < 30 ? D.BOSSES.find((b) => !state.cleared.includes(b.id))?.name + " 처치" : "최종 장비와 잠재옵션 완성"}</p>${btn("보스 확인", "tab", "boss")}</div>${state.tutorial < 6 ? `<div class="quest"><strong>모험 안내 ${state.tutorial + 1}/6</strong><p class="note">${["시작 무기는 장착되어 있어요. 캐릭터 탭에서 확인하세요.", "레벨업 포인트는 내 직업 주스탯에 분배하세요.", "사냥터는 레벨과 선행 보스 조건을 확인하세요.", "보스 장비는 재료 24개로 원하는 부위를 제작할 수 있어요.", "장비 잠재를 열고 큐브로 유효 옵션을 찾으세요.", "강화 확률과 파괴 조건을 확인하고 도전하세요."][state.tutorial]}</p>${btn("확인", "tutorial", "", "", true)}</div>` : ""}</aside></div>`;
}
function regions() {
  return `${header("사냥터 선택", "WORLD MAP")}${btn("사냥으로 돌아가기", "back")}<div class="region-list" style="margin-top:12px">${D.REGIONS.map(
    (r) =>
      `<section class="panel"><div class="region-banner" style="background-image:url('${r.background}')"><h3>${r.name} <small>Lv.${r.level}</small></h3></div>${D.STAGES.filter(
        (s) => s.region === r.id,
      )
        .map(
          (s) =>
            `<div class="stage-row"><div><strong>${s.name}</strong><br><small>Lv.${s.level} · 필요 스타포스 ${s.star}<br>경험치 ${fmt(s.xp)} / 처치 · ${state.stage === s.id ? "현재 사냥터" : "Lv." + s.dropLevel + " 장비"}</small></div>${btn("입장", "enterStage", s.id, "", true)}</div>`,
        )
        .join("")}</section>`,
  ).join("")}</div>`;
}
function character() {
  const c = D.CLASSES.find((x) => x.id === state.classId),
    p = power(state);
  return `${header("캐릭터", c.name + " · " + c.stat + " 주스탯")}<div class="main-grid"><section class="panel"><div class="hero"><div class="portrait" style="background-position:${D.CLASSES.indexOf(c) * 25}% 0" role="img" aria-label="${c.name}"></div><div class="hero-label"><h2>${esc(state.name)}</h2><span class="pill">${c.name}</span></div></div><div class="pad"><div class="stat-grid">${Object.keys(
    state.stats,
  )
    .map(
      (k) =>
        `<div class="${k === c.stat ? "primary" : ""}"><small>${k}</small><b>${fmt(state.stats[k])}</b></div>`,
    )
    .join(
      "",
    )}</div><p class="note">남은 포인트 ${state.points} · 장비 포함 주스탯 ${fmt(p.primary)}</p><div class="actions">${btn("직접 분배", "stats")}${btn("주스탯 자동 분배", "autoStats", "", "gold", true)}${btn("초기화", "resetStats")}</div></div></section><div><section class="panel pad"><div class="metrics"><div><small>공격력</small><b>${fmt(p.attack)}</b></div><div><small>최대 HP</small><b>${fmt(p.hp)}</b></div><div><small>스타포스</small><b>${p.stars}성</b></div></div><p class="note">치명타 ${pct(p.crit)} · 치명타 피해 ${Math.round(p.critDamage * 100)}% · 보스 피해 +${Math.round((p.boss - 1) * 100)}%</p></section><section class="panel pad"><h3>장착 장비</h3><div class="gear-grid" style="margin-top:12px">${D.SLOTS.map(
    (name, slot) => {
      const it = state.items.find((x) => x.id === state.equipped[slot]);
      return btn(
        it
          ? `${gearMarkup(it)}<strong>${name}</strong><span class="stars">${it.stars}성</span>`
          : `<strong>${name}</strong><small>미장착</small>`,
        "item",
        it?.id || "",
        "gear-cell",
      );
    },
  ).join(
    "",
  )}</div><p class="note">같은 레벨 보스 장비 3부위: 주스탯 +5%<br>6부위: 공격력 +5% · 9부위: 보스 피해 +10%</p></section></div></div>`;
}
function itemMarkup(it) {
  return `${gearMarkup(it)}<div class="item-info"><strong>${esc(D.gearName(it))} ${it.locked ? "[잠금]" : ""}</strong><p>Lv.${it.level} · ${D.CLASSES.find((c) => c.id === it.classId).name} · ${D.equipmentType(it)} ${Object.values(state.equipped).includes(it.id) ? "· 장착 중" : ""}</p><span class="stars">${it.broken ? "파괴된 장비 흔적" : it.stars + "성"}</span> <span class="purple">${it.lines.length ? D.RARITIES[it.grade] + " " + it.lines.length + "줄" : "잠재 미개방"}</span></div>`;
}
function inventory() {
  let items = state.items
    .filter(
      (i) =>
        (filterSlot === "" || i.slot === Number(filterSlot)) &&
        (filterClass === "" || i.classId === filterClass),
    )
    .sort(
      (a, b) =>
        Number(Object.values(state.equipped).includes(b.id)) -
          Number(Object.values(state.equipped).includes(a.id)) ||
        Number(b.locked) - Number(a.locked) ||
        b.stars - a.stars ||
        b.level - a.level || b.grade - a.grade,
    );
  return `${header("장비", "EQUIPMENT")}<div class="subnav">${[
    ["bag", "가방"],
    ["mail", "보관함"],
    ["collection", "도감"],
    ["craft", "제작"],
    ["odds", "확률표"],
  ]
    .map(([k, l]) => btn(l, "gearSub", k, sub === k ? "active" : ""))
    .join(
      "",
    )}</div>${sub === "craft" ? craft() : sub === "odds" ? odds() : sub === "mail" ? mailbox() : sub === "collection" ? collection() : `<div class="filters"><select data-filter="slot"><option value="">모든 부위</option>${D.SLOTS.map((v, i) => `<option value="${i}" ${String(i) === filterSlot ? "selected" : ""}>${v}</option>`).join("")}</select><select data-filter="class"><option value="">모든 직업</option>${D.CLASSES.map((c) => `<option value="${c.id}" ${c.id === filterClass ? "selected" : ""}>${c.name}</option>`).join("")}</select></div><p class="note">9부위 장착 · 직업별 무기 ${D.WEAPON_TYPES[state.classId].join("·")}<br>가방 ${state.items.length}/300 · 장착 → 잠금 → 스타포스 → 레벨 순</p><div class="inventory-grid stack">${items.length ? items.map((i) => btn(itemMarkup(i), "item", i.id, "item")).join("") : '<div class="empty">조건에 맞는 장비가 없습니다.</div>'}</div>`}`;
}
function atlasIcon(tier, n, label, size="") {
  const atlas=[
    {w:1278,h:1230,x:[0,335,643,972,1278],y:[0,360,654,930,1230]},
    {w:1278,h:1230,x:[0,335,643,972,1278],y:[0,353,646,912,1230]},
    {w:1448,h:1086,x:[0,365,733,1095,1448],y:[0,293,548,810,1086]},
  ][tier];
  const col=n%4,row=Math.floor(n/4),x=atlas.x[col],y=atlas.y[row],w=atlas.x[col+1]-x,h=atlas.y[row+1]-y;
  return '<svg class="gear-icon '+size+'" role="img" aria-label="'+esc(label)+'" viewBox="'+[x,y,w,h].join(' ')+'" overflow="hidden" preserveAspectRatio="xMidYMid meet"><image href="gear-'+tier+'.svg" width="'+atlas.w+'" height="'+atlas.h+'"/></svg>';
}
function gearMarkup(it, size="") {
  if(!it) return "";
  const art = D.equipmentIdentity(it);
  return '<svg class="gear-icon '+size+'" role="img" aria-label="'+esc(art.name)+'" viewBox="'+[art.column*100+3,art.row*100+3,94,94].join(' ')+'" overflow="hidden" preserveAspectRatio="xMidYMid meet"><image href="'+art.art+'" width="'+(art.columns*100)+'" height="1000" preserveAspectRatio="none"/></svg>';
}
function bossMarkup(b, size="") {
  return '<div class="boss-sprite '+size+'" role="img" aria-label="'+esc(b.name)+'" style="background-image:url('+b.art+');background-position:'+b.spriteX+'% '+b.spriteY+'%"></div>';
}
function monsterMarkup(m) {
  return '<div class="monster-sprite" role="img" aria-label="'+esc(m.name)+'" style="background-image:url('+m.art+');background-position:'+m.x+'% '+m.y+'%"></div>';
}
function mailbox() {
  return '<p class="note">가방이 가득 찼을 때 얻은 장비를 보관합니다. 보관 기한은 없으며 한 번에 최대 50개를 꺼낼 수 있어요.</p><div class="stack">'+((state.mailbox||[]).map(m=>'<div class="panel pad"><div class="item">'+itemMarkup(m.item)+'</div><p>'+m.quantity+'개 보관</p>'+btn('가방으로 받기','claimMail',m.key,'gold',true)+'</div>').join('')||'<div class="empty">보관 중인 장비가 없습니다.</div>')+'</div>';
}
function collection() {
  const keys = state.collection||[];
  return '<p class="note">발견한 장비 '+keys.length+' / '+D.EQUIPMENT_CATALOG.length+'종 · 획득 기록은 장비를 판매하거나 분해해도 유지됩니다.</p><div class="inventory-grid stack">'+keys.map(key=>{const entry=D.equipmentFromKey(key);return '<div class="panel pad item">'+itemMarkup({...entry,stars:0,lines:[],grade:0})+'</div>';}).join('')+'</div>';
}
function craft() {
  return `<div class="panel pad"><h3>잠재 부여 주문서</h3><p class="note">장비 파편 100개 + 1,000 골드</p>${btn("제작", "craftScroll", "", "", true)}</div><div class="region-list">${D.REGIONS.map((r) => `<section class="panel pad"><h3>${r.name} 보스 장비 · Lv.${D.TIERS[r.id + 1]}</h3><p class="note">보스 재료 ${state.bossMaterials[r.id] || 0}/24 · 장비 파편 60 · 골드 ${fmt(3000 + r.id * 500)}<br>내 직업의 무기 종류와 부위를 선택해 제작합니다.</p><div class="row"><select id="craft-${r.id}">${D.WEAPON_TYPES[state.classId].map((name,v)=>`<option value="0:${v}">${name}</option>`).join("")}${D.SLOTS.slice(1).map((name,i)=>`<option value="${i+1}:0">${name}</option>`).join("")}</select>${btn("장비 제작", "craft", r.id, "gold", true)}</div></section>`).join("")}</div>`;
}
function odds() {
  return `<div class="panel pad"><h3>스타포스 · 최대 25성</h3><p class="note">10·15성은 하락 방지 지점입니다. 파괴 시 같은 장비로 12성 복구하며 잠재가 보존됩니다.</p><table><tr><th>목표</th><th>성공</th><th>유지</th><th>하락</th><th>파괴</th></tr>${D.STAR_SUCCESS.map(
    (_, n) => {
      const o = D.starOdds(n);
      return `<tr><td>${n + 1}성</td><td>${pct(o.success)}</td><td>${pct(o.keep)}</td><td>${pct(o.down)}</td><td>${pct(o.destroy)}</td></tr>`;
    },
  ).join(
    "",
  )}</table></div><div class="panel pad"><h3>잠재와 큐브</h3><p class="note">최초 줄 수: 1줄 70% · 2줄 27% · 3줄 3%<br>확장: 1→2줄 확장석 1개 / 2→3줄 3개<br>각 줄은 해당 부위의 옵션 풀에서 동일 확률로 선택하며 중복 허용됩니다.</p><table><tr><th>등급 상승</th><th>일반</th><th>상급</th></tr>${D.CUBE_UP.slice(
    0,
    3,
  )
    .map(
      (p, i) =>
        `<tr><td>${D.RARITIES[i]} → ${D.RARITIES[i + 1]}</td><td>${pct(p)}</td><td>${pct(D.HIGH_CUBE_UP[i])}</td></tr>`,
    )
    .join("")}</table>${[0, 1, 6]
    .map(
      (slot) =>
        `<p class="note">${slot === 0 ? "무기" : slot === 1 ? "방어구" : "장신구"}: ${D.optionPool(
          slot,
        )
          .map((k) => D.OPTIONS[k])
          .join(
            " · ",
          )}<br>각 옵션 확률 ${pct(1 / D.optionPool(slot).length)}</p>`,
    )
    .join(
      "",
    )}<table><tr><th>옵션</th>${D.RARITIES.map((g) => `<th>${g}</th>`).join("")}</tr>${Object.keys(
    D.OPTIONS,
  )
    .map(
      (k) =>
        `<tr><td>${D.OPTIONS[k]}</td>${[0, 1, 2, 3].map((g) => `<td>${D.optionValue(k, g)}%</td>`).join("")}</tr>`,
    )
    .join(
      "",
    )}</table></div><div class="panel pad"><h3>일반 사냥 드롭</h3><p class="note">처치마다 독립 추첨: 장비 ${pct(D.EQUIP_DROP)}, 일반 큐브 ${pct(D.CUBE_DROP)}, 잠재 주문서 ${pct(D.SCROLL_DROP)}, 파편 3.5%.<br>장비 직업은 5종 균등, 부위는 9종 균등입니다. 보스 드롭은 보스 탭에 표시합니다.</p></div>`;
}
function bosses() {
  return `${header("보스", "BOSS CHALLENGE")}<div class="panel pad"><h3>일일 던전 · Lv.20</h3><p class="note">매일 00:00 초기화 · 주간 보스 월요일 00:00 초기화 (한국시간)</p><div class="actions">${btn("큐브 수련 · 3개", "dungeon", "cube", "", true)}${btn("재료 수련 · 파편 30", "dungeon", "material", "", true)}</div></div><div class="region-list">${D.BOSSES.map(
    (b) => {
      const claimed =
        state.bossClaims[b.id] ===
        (b.weekly ? D.weekKey(Date.now()) : D.dayKey(Date.now()));
      return `<section class="panel"><div class="boss-banner" style="background-image:url('${D.REGIONS[b.region].background}')">${bossMarkup(b)}<div class="label"><small>Lv.${b.level} · ${b.weekly ? "주간" : "일일"} 보스</small><h3>${b.name}</h3></div></div><div class="pad"><p>HP ${fmt(b.hp)} · 제한 ${b.seconds}초</p><p class="note">${state.cleared.includes(b.id) ? "처치 완료" : "미처치"} · 보상 ${claimed ? "수령 완료" : "가능"}<br>Lv.${b.gearLevel} 세트 장비 ${pct(b.dropChance)} · 지역 재료 ${b.material}개<br>${b.weekly ? "큐브 3 · 상급 큐브 1 · 확장석 20%" : "일반 큐브 1"}</p><div class="actions">${btn("도전", "bossStart", b.id, "gold", true)}${btn("연습", "bossPractice", b.id, "", true)}</div></div></section>`;
    },
  ).join("")}</div>`;
}
function market() {
  return `${header("거래소", "MARKET")}<div class="subnav">${btn("구매", "marketMode", "buy", !mine ? "active" : "")}${btn("내 판매", "marketMode", "mine", mine ? "active" : "")}${btn("등록하기", "marketSell")}</div><p class="note">판매 수수료 5% · 등록 7일 · 최대 20건<br>만료 장비는 내 판매에서 회수할 수 있습니다.</p><div class="filters"><select data-filter="slot"><option value="">모든 부위</option>${D.SLOTS.map((v, i) => `<option value="${i}" ${String(i) === filterSlot ? "selected" : ""}>${v}</option>`).join("")}</select><select data-filter="class"><option value="">모든 직업</option>${D.CLASSES.map((c) => `<option value="${c.id}" ${c.id === filterClass ? "selected" : ""}>${c.name}</option>`).join("")}</select></div><div class="stack">${
    marketRows
      .slice(0, 20)
      .map(
        (l) =>
          `<section class="panel pad"><div class="item">${itemMarkup(l.item)}</div><p class="note">${l.item.lines.map((x) => D.OPTIONS[x.key] + " +" + x.value + "%").join(" · ") || "잠재 미개방"}</p><div class="row spread"><strong class="stars">${fmt(l.price)} G</strong>${l.status === "open" ? btn(l.own ? "판매 취소" : "구매", "marketConfirm", l.id, "gold") : esc(l.status === "sold" ? "판매 완료" : "회수 완료")}</div></section>`,
      )
      .join("") ||
    '<div class="empty">등록된 장비가 없습니다.<br>보스 장비를 얻어 첫 거래를 시작해 보세요.</div>'
  }</div><div class="actions">${marketPage ? btn("이전", "page", marketPage - 1) : ""}${marketRows.length > 20 ? btn("다음", "page", marketPage + 1) : ""}${btn("새로고침", "marketRefresh")}</div>`;
}
async function marketLoad() {
  const version = ++marketRequest;
  await ensureToken();
  const rows = await request("/rest/v1/rpc/rebirth_market", {
    p_action: "list",
    p_args: { page: marketPage, mine, slot: filterSlot, classId: filterClass },
    p_request: crypto.randomUUID(),
  });
  if(version !== marketRequest || tab !== "market") return;
  marketRows = rows;
  render();
}
function open(title, html, closable = true) {
  modal.innerHTML = `${closable ? btn("닫기", "close", "", "close") : ""}<h2 id="dialog-title">${title}</h2>${html}`;
  modal.setAttribute("aria-labelledby", "dialog-title");
  modal.scrollTop = 0;
  if (!modal.open) {
    history.pushState({ modal: true }, "");
    modal.showModal();
  }
  modal.dataset.closable = String(closable);
}
function itemDetail(id) {
  selected = id;
  const it = state.items.find((x) => x.id === id);
  if (!it) return;
  const compared = {...state,equipped:{...state.equipped,[it.slot]:it.id}};
  const currentPower=power(state), nextPower=power(compared);
  const comparison = it.classId===state.classId && it.level<=state.level && !it.broken ? `<p class="note">장착 시 공격력 ${fmt(nextPower.attack)} (${nextPower.attack-currentPower.attack>=0?"+":""}${nextPower.attack-currentPower.attack}) · HP ${fmt(nextPower.hp)} (${nextPower.hp-currentPower.hp>=0?"+":""}${nextPower.hp-currentPower.hp})</p>` : `<p class="note">내 직업과 장착 레벨을 확인하세요.</p>`;
  const equipped = Object.values(state.equipped).includes(id),
    o = D.starOdds(it.stars);
  open(
    D.gearName(it),
    `${gearMarkup(it,"big-item")}${comparison}<div class="row spread"><span>Lv.${it.level} · ${D.CLASSES.find((c) => c.id === it.classId).name}</span><strong class="stars">${it.broken ? "장비 흔적" : it.stars + " / 25성"}</strong></div><p class="note">${it.boss ? "보스 세트" : "일반 장비"} · ${it.locked ? "잠금 상태" : "거래 가능"} ${equipped ? "· 장착 중" : ""}</p><div class="actions">${btn(equipped ? "장착 해제" : "장착", "equip", id, "", true)}${btn(it.locked ? "잠금 해제" : "잠금", "lock", id, "", true)}</div>${
      it.broken
        ? `<p class="note">같은 레벨·직업·부위·종류의 장비로 12성 복구합니다.</p><select id="restore-material">${state.items
            .filter(
              (x) =>
                x.id !== id &&
                !x.broken &&
                !x.locked &&
                ["level", "classId", "slot", "boss"].every(
                  (k) => x[k] === it[k],
                ) && D.weaponVariant(x) === D.weaponVariant(it),
            )
            .map(
              (x) =>
                `<option value="${x.id}">${esc(D.gearName(x))} ${x.stars}성</option>`,
            )
            .join("")}</select>${btn("복구", "restore", id, "", true)}`
        : `<div class="potential"><h3>스타포스</h3><p class="note">성공 ${pct(o.success)} · 유지 ${pct(o.keep)}<br>하락 ${pct(o.down)} · 파괴 ${pct(o.destroy)}</p>${it.stars === 25 ? '<button class="gold" disabled>25성 · 최대 강화</button>' : btn(fmt(D.starCost(it)) + " G · 강화", "star", id, "gold", true)}</div><div class="potential"><h3 class="purple">${it.lines.length ? D.RARITIES[it.grade] + " 잠재옵션" : "잠재 미개방"}</h3>${it.lines.map((l) => `<p>${D.OPTIONS[l.key]} +${l.value}%</p>`).join("")}${Array.from({ length: 3 - it.lines.length }, () => '<p class="muted">미개방</p>').join("")}<div class="actions">${it.lines.length ? btn("일반 큐브 1개 + 300 G", "cube", id, "", true) + btn("상급 큐브 1개 + 1,000 G", "highCube", id, "", true) : btn("잠재 부여 · 주문서 1개 + 500 G", "potential", id, "", true)}</div>${it.lines.length > 0 && it.lines.length < 3 ? btn("줄 확장 · 확장석 " + (it.lines.length === 1 ? 1 : 3) + "개 + 2,000 G", "expand", id, "", true) : ""}</div><div class="actions">${btn("강화 이전", "transfer", id)}${btn("분해", "salvageConfirm", id, "danger")}</div>`
    }`,
  );
}
function cubeChoice() {
  const p = state.pendingCube,
    it = state.items.find((i) => i.id === p.id);
  open(
    "상급 큐브 · 결과 선택",
    `${atlasIcon(2,13,"상급 큐브","big-item")}<div class="two"><div class="potential"><h3>현재 · ${D.RARITIES[it.grade]}</h3>${it.lines.map((l) => `<p>${D.OPTIONS[l.key]} +${l.value}%</p>`).join("")}</div><div class="potential cube-reveal"><h3>새 옵션 · ${D.RARITIES[p.grade]}</h3>${p.lines.map((l) => `<p>${D.OPTIONS[l.key]} +${l.value}%</p>`).join("")}</div></div><div class="actions">${btn("기존 유지", "cubeChoose", "no", "", true)}${btn("새 옵션 적용", "cubeChoose", "yes", "gold", true)}</div>`,
    false,
  );
}
function showEvents(events) {
  for (const e of events) {
    sounds.play(e.outcome || e.type);
    if (e.type === "combat") continue;
    if (e.type === "skill") {
      const arena = $(".arena");
      if (arena && !settings.low) {
        const flash = document.createElement("div");
        flash.className = "skill-burst " + state.classId;
        flash.textContent = D.CLASSES.find(c=>c.id===state.classId).skill;
        arena.append(flash);
        setTimeout(()=>flash.remove(), 900);
      }
    }
    if (e.type === "star") {
      open(
        "스타포스",
        `<div class="outcome ${e.outcome}">${{ success: "강화 성공", keep: "별 유지", down: "별 하락", destroy: "장비 파괴" }[e.outcome]}</div><div class="forge-reveal ${e.outcome}" data-outcome="${e.outcome}">${gearMarkup(state.items.find((i) => i.id === e.id),"big-item")}<span class="forge-ring" aria-hidden="true"></span></div><h2 style="text-align:center">${e.before}성 → ${e.outcome === "destroy" ? "흔적" : e.after + "성"}</h2><div class="actions">${btn("장비 확인", "item", e.id, "gold")}</div>`,
      );
    } else if (["boss", "dungeon", "offline"].includes(e.type)) {
      if (e.type !== "offline" || e.seconds >= 300) reward();
    } else if (e.type === "cube") {
      if (state.pendingCube) cubeChoice();
      else itemDetail(e.id);
    } else if (["craft", "potential", "restore"].includes(e.type))
      itemDetail(e.id);
  }
}
function reward() {
  const r = state.lastReward;
  const enemy = r && (r.type === "dungeon" ? D.DUNGEONS[r.dungeon] : r.type === "boss" ? D.BOSSES[r.bossId] : null);
  if (!r) return toast("새로 정산된 보상이 없습니다.");
  open(
    enemy ? (r.won ? "토벌 완료" : "도전 종료") : "사냥 보상",
    enemy
      ? `${bossMarkup(enemy,"big-item")}<h3>${enemy.name}</h3><p class="note">${r.practice ? "연습 도전 · 보상 없음" : r.won ? r.type === "dungeon" ? enemy.reward : "지역 재료 " + r.materials + "개 · 장비 " + r.items.length + "개" : "보상 횟수는 차감되지 않았습니다."}</p><div class="actions">${btn("확인", "ack", "", "gold", true)}</div>`
      : `<p>정산 시간 ${fmt(r.seconds / 60)}분 · ${fmt(r.kills)}마리</p><div class="metrics" style="margin-top:12px"><div><small>경험치</small><b>${fmt(r.xp)}</b></div><div><small>골드</small><b>${fmt(r.gold)}</b></div><div><small>장비</small><b>${r.drops.length}개</b></div></div><p class="note">파편 ${r.fragment} · 큐브 ${r.cube} · 주문서 ${r.scroll}<br>${r.stored ? "가방 초과 장비 " + r.stored + "개는 장비 탭 보관함에 보관되었습니다." : ""}${r.defeats ? " 패배 " + r.defeats + "회 · 하위 사냥터에서 성장하세요." : ""}</p><div class="actions">${btn("보상 확인", "ack", "", "gold", true)}</div>`,
  );
}
function login() {
  app.innerHTML = `<div class="login panel"><div class="brand">링구 RPG<br><small>새로운 여정</small></div><p class="note">모바일로 이어가는 나만의 모험</p><form id="auth"><label>계정 이름<input name="username" autocomplete="username" pattern="[a-zA-Z0-9_]{3,32}" minlength="3" maxlength="32" required placeholder="영문·숫자·밑줄 3~32자"></label><label>비밀번호<input name="password" autocomplete="current-password" type="password" minlength="8" maxlength="256" required placeholder="8자 이상"></label><div class="two"><button type="submit" name="mode" value="login" class="gold">로그인</button><button type="submit" name="mode" value="register">새 계정 만들기</button></div><p id="auth-error" class="error" role="alert"></p></form><p class="footer-note">새 시즌은 모든 모험가가 처음부터 시작합니다.</p></div>`;
  $("#auth").onsubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    busy = true;
    const form = e.currentTarget,
      register = e.submitter?.value === "register",
      f = new FormData(form),
      username = String(f.get("username")).toLowerCase();
    form.querySelectorAll("button").forEach((b) => (b.disabled = true));
    try {
      session = await request(
        register ? "/auth/v1/signup" : "/auth/v1/token?grant_type=password",
        {
          email: username + "@players.ringu.example",
          password: f.get("password"),
          ...(register ? { data: { username } } : {}),
        },
        false,
      );
      if (!session.access_token) {
        session = null;
        throw new Error(
          "가입 확인이 필요합니다. 서버의 가입 설정을 확인해 주세요.",
        );
      }
      session.expires_at =
        session.expires_at || Date.now() / 1000 + session.expires_in;
      persist();
      busy = false;
      await command("sync");
    } catch (err) {
      if ($("#auth-error"))
        $("#auth-error").textContent =
          err.status === 400
            ? "계정 정보 또는 비밀번호를 확인해 주세요."
            : message(err);
    } finally {
      busy = false;
      form.querySelectorAll("button").forEach((b) => (b.disabled = false));
    }
  };
}
function createScreen() {
  app.innerHTML = `<div class="login panel" style="max-width:650px"><p class="eyebrow">CHOOSE YOUR PATH</p><h2>어떤 모험가가 될까요?</h2><p class="note">직업에 맞는 주스탯과 장비를 성장시키세요.</p><div class="class-choice">${D.CLASSES.map((c, i) => btn(`<div class="portrait" style="background-position:${i * 25}% 0"></div>${c.name}<br><small>${c.stat}</small>`, "chooseClass", c.id, c.id === chosenClass ? "selected" : "")).join("")}</div><p class="note">선택: ${D.CLASSES.find((c) => c.id === chosenClass).name} · 첫 무기와 잠재 주문서를 지급합니다.</p><label>캐릭터 이름<input id="char-name" maxlength="12" placeholder="한글·영문·숫자 2~12자"></label><div class="actions">${btn("모험 시작", "create", "", "gold", true)}</div></div>`;
}
function settingsDialog() {
  open(
    "설정",
    `<div class="stack"><label>효과음 <input id="sound" type="range" min="0" max="1" step=".05" value="${settings.sound}"></label><label>배경음 <input id="music" type="range" min="0" max="1" step=".05" value="${settings.music}"></label><label><input id="low" type="checkbox" ${settings.low ? "checked" : ""} style="width:auto;min-height:0"> 저사양 · 모션 감소</label><p class="note">자동사냥·오프라인은 서버에서 정산합니다. 소리와 모션은 이 기기에 저장됩니다.</p>${btn("저장", "saveSettings", "", "gold")}${btn("로그아웃", "logout", "", "danger")}</div>`,
  );
}
async function marketWrite(action, args) {
  if (busy) return;
  await command("sync", {}, true);
  if (busy) return;
  busy = true;
  const key = pendingKey() + "_market";
  try {
    await ensureToken();
    let p = JSON.parse(localStorage.getItem(key) || "null");
    if (!p) {
      p = { p_action: action, p_args: args, p_request: crypto.randomUUID() };
      localStorage.setItem(key, JSON.stringify(p));
    } else if(p.p_action!==action || JSON.stringify(p.p_args)!==JSON.stringify(args)) toast("이전 거래 요청을 복구합니다.");
    await request("/rest/v1/rpc/rebirth_market", p);
    localStorage.removeItem(key);
  } catch (e) {
    if (e.status === 400) localStorage.removeItem(key);
    throw e;
  } finally {
    busy = false;
  }
  await command("sync", {}, true);
  await marketLoad();
  modal.close();
  toast("거래가 완료되었습니다.");
}
document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-action]");
  if (!b) return;
  const action = b.dataset.action,
    arg = b.dataset.arg;
  sounds.play("click");
  try {
    if (action === "reconnect") return await command("sync");
    if (action === "close") {
      modal.close();
      return;
    }
    if (action === "tab") {
      tab = arg;
      view = "game";
      filterSlot = "";
      filterClass = "";
      marketRequest++;
      combatFrames.length = 0;
      modal.close();
      render();
      if (tab === "market") await marketLoad();
      return;
    }
    if (action === "settings") return settingsDialog();
    if (action === "saveSettings") {
      settings.sound = Number($("#sound").value);
      settings.music = Number($("#music").value);
      settings.low = $("#low").checked;
      localStorage.setItem("ringu_rebirth_settings", JSON.stringify(settings));
      document.body.classList.toggle("low", settings.low);
      sounds.start();
      sounds.music();
      modal.close();
      return;
    }
    if (action === "logout") {
      try {
        await ensureToken();
        await request("/auth/v1/logout", {});
      } finally {
        session = null;
        persist();
        state = null;
        modal.close();
        sounds.pause();
        login();
      }
      return;
    }
    if (action === "chooseClass") {
      characterName = $("#char-name")?.value || characterName;
      chosenClass = arg;
      createScreen();
      $("#char-name").value = characterName;
      return;
    }
    if (action === "create")
      return await command("create", {
        classId: chosenClass,
        name: $("#char-name").value.trim(),
      });
    if (action === "regions") {
      view = "regions";
      return render();
    }
    if (action === "back") {
      view = "game";
      return render();
    }
    if (action === "enterStage") {
      await command("stage", { id: Number(arg) });
      view = "game";
      tab = "hunt";
      return render();
    }
    if (action === "toggleHunt")
      return await command("hunt", { enabled: !state.hunting });
    if (action === "skill") return await command("skill");
    if (action === "reward") return reward();
    if (action === "ack") {
      await command("ack");
      modal.close();
      return;
    }
    if (action === "tutorial") return await command("tutorial");
    if (action === "stats")
      return open(
        "능력치 분배",
        `<p>남은 포인트 ${state.points}</p><select id="stat-key">${Object.keys(
          state.stats,
        )
          .map((k) => `<option>${k}</option>`)
          .join(
            "",
          )}</select><input id="stat-amount" type="number" min="1" max="${state.points}" value="1"><div class="actions">${btn("분배", "applyStats", "", "gold", true)}</div>`,
      );
    if (action === "applyStats") {
      await command("stats", {
        key: $("#stat-key").value,
        amount: Number($("#stat-amount").value),
      });
      modal.close();
      return;
    }
    if (action === "autoStats") {
      if (!state.points) return toast("남은 포인트가 없습니다.");
      return await command("stats", {
        key: D.CLASSES.find((c) => c.id === state.classId).stat,
        amount: state.points,
      });
    }
    if (action === "resetStats")
      return open(
        "스탯 초기화",
        `<p>5,000 골드를 사용해 모든 분배 포인트를 돌려받습니다.</p><div class="actions">${btn("초기화", "doReset", "", "gold", true)}</div>`,
      );
    if (action === "doReset") {
      await command("resetStats");
      modal.close();
      return;
    }
    if (action === "gearSub") {
      sub = arg;
      return render();
    }
    if (action === "item")
      return arg ? itemDetail(arg) : toast("아직 장착된 장비가 없습니다.");
    if (action === "equip") {
      const it = state.items.find((i) => i.id === arg);
      await command(
        Object.values(state.equipped).includes(arg) ? "unequip" : "equip",
        Object.values(state.equipped).includes(arg)
          ? { slot: it.slot }
          : { id: arg },
      );
      return itemDetail(arg);
    }
    if (["lock", "potential", "expand", "star"].includes(action)) {
      await command(action, { id: arg });
      if (action !== "star") itemDetail(arg);
      return;
    }
    if (action === "cube" || action === "highCube")
      return await command("cube", { id: arg, high: action === "highCube" });
    if (action === "cubeChoose") {
      await command("cubeChoose", { apply: arg === "yes" });
      modal.close();
      return itemDetail(selected);
    }
    if (action === "salvageConfirm")
      return open(
        "장비 분해",
        `<p>선택한 장비가 사라집니다. 강화·잠재는 복구할 수 없습니다.</p><div class="actions">${btn("분해하기", "salvage", arg, "danger", true)}</div>`,
      );
    if (action === "salvage") {
      await command("salvage", { ids: [arg] });
      modal.close();
      return;
    }
    if (action === "restore")
      return await command("restore", {
        id: arg,
        materialId: $("#restore-material").value,
      });
    if (action === "transfer") {
      const it = state.items.find((i) => i.id === arg),
        list = state.items.filter(
          (i) =>
            i.id !== arg &&
            i.slot === it.slot &&
            i.classId === it.classId &&
            D.weaponVariant(i) === D.weaponVariant(it) &&
            D.TIERS.indexOf(i.level) === D.TIERS.indexOf(it.level) + 1,
        );
      return open(
        "강화 이전",
        `<p>원본 장비를 소비합니다. 15성 이하만 이전할 수 있으며 별 1개가 감소합니다. 잠재는 최대 에픽으로 이전합니다.</p><p class="note">대상은 0성·잠재 미개방이어야 합니다.</p><select id="transfer-target">${list.map((i) => `<option value="${i.id}">${esc(D.gearName(i))} Lv.${i.level}</option>`).join("")}</select><div class="actions">${btn("원본 소비 후 이전", "doTransfer", arg, "gold", true)}</div>`,
      );
    }
    if (action === "doTransfer") {
      await command("transfer", {
        source: arg,
        target: $("#transfer-target").value,
      });
      modal.close();
      return;
    }
    if (action === "craft")
      return await command("craft", {
        region: Number(arg),
        slot: Number($("#craft-" + arg).value.split(":")[0]),
        weaponVariant: Number($("#craft-" + arg).value.split(":")[1]),
      });
    if (action === "craftScroll") return await command("craftScroll");
    if (action === "bossStart" || action === "bossPractice") {
      await command("boss", {
        id: Number(arg),
        practice: action === "bossPractice",
      });
      tab = "hunt";
      view = "game";
      render();
      return;
    }
    if (action === "dungeon") { await command("dungeon", { kind: arg }); tab="hunt"; view="game"; modal.close(); return render(); }
    if (action === "claimMail") return await command("claimMail", {key:arg});
    if (action === "abandonConfirm") return open("전투 포기", `<p class="note">보상과 도전 횟수는 차감되지 않습니다.</p>${btn("포기하기","abandon","","danger",true)}`);
    if (action === "abandon") { await command("abandon"); modal.close(); return render(); }
    if (action === "marketMode") {
      mine = arg === "mine";
      marketPage = 0;
      return await marketLoad();
    }
    if (action === "page") {
      marketPage = Number(arg);
      return await marketLoad();
    }
    if (action === "marketRefresh") return await marketLoad();
    if (action === "marketSell")
      return open(
        "장비 판매",
        `<select id="sell-item">${state.items
          .filter(
            (i) =>
              !i.locked &&
              !i.broken &&
              !Object.values(state.equipped).includes(i.id),
          )
          .map(
            (i) =>
              `<option value="${i.id}">${esc(D.gearName(i))} ${i.stars}성</option>`,
          )
          .join(
            "",
          )}</select><label>판매 가격<input id="sell-price" type="number" min="100" max="1000000000" value="10000"></label><p class="note">판매 완료 시 5% 수수료가 차감됩니다. 7일 후 회수할 수 있습니다.</p><div class="actions">${btn("등록", "sellConfirm", "", "gold")}</div>`,
      );
    if (action === "sellConfirm")
      return await marketWrite("sell", {
        itemId: $("#sell-item").value,
        price: Number($("#sell-price").value),
      });
    if (action === "marketConfirm") {
      const l = marketRows.find((l) => l.id === arg);
      return open(
        l.own ? "판매 취소" : "구매 확인",
        `<div class="item">${itemMarkup(l.item)}</div><p class="note">${fmt(l.price)} 골드</p><div class="actions">${btn(l.own ? "장비 회수" : "구매 확정", l.own ? "cancelListing" : "buyListing", arg, "gold")}</div>`,
      );
    }
    if (action === "cancelListing" || action === "buyListing")
      return await marketWrite(action === "cancelListing" ? "cancel" : "buy", {
        id: arg,
      });
  } catch (err) {
    toast(message(err));
  }
});
document.addEventListener("change", async (e) => {
  if (!e.target.dataset.filter) return;
  if (e.target.dataset.filter === "slot") filterSlot = e.target.value;
  else filterClass = e.target.value;
  if (tab === "market") {
    marketPage = 0;
    try {
      await marketLoad();
    } catch (e) {
      toast(message(e));
    }
  } else render();
});
modal.addEventListener("cancel", (e) => {
  if (modal.dataset.closable === "false") e.preventDefault();
});
window.addEventListener("popstate", () => {
  if (modal.open && modal.dataset.closable !== "false") modal.close();
  else if (modal.open && modal.dataset.closable === "false") history.pushState({modal:true}, "");
  else if (view === "regions") {
    view = "game";
    render();
  }
});
setInterval(() => {
  if (!session || document.hidden || busy || !state || !navigator.onLine || Date.now() < retryAt) return;
  const due = state.battle ? 3000 : 30000;
  if (Date.now() - lastSync > due) command("sync", {}, true).catch(() => {});
}, 1000);
function strike(arena, frame = null) {
  if (settings.low || arena.querySelectorAll(".slash").length > 2) return;
  const slash = document.createElement("i");
  slash.className = "slash strike-" + state.classId;
  arena.append(slash);
  const target = arena.querySelector(".monster");
  target?.classList.remove("struck");
  if (target) { void target.offsetWidth; target.classList.add("struck"); }
  if (frame) {
    const n=document.createElement("span");
    n.className="damage"+(frame.crit?" critical":"");
    n.textContent=(frame.crit?"CRITICAL ":"")+fmt(frame.damage);
    arena.append(n); setTimeout(()=>n.remove(),850);
  }
  setTimeout(()=>slash.remove(),450);
  sounds.play("hit");
}
setInterval(() => {
  if (!state || tab !== "hunt" || view !== "game" || document.hidden || modal.open) { combatFrames.length=0; return; }
  const arena = $(".arena");
  if (!arena || connectionLost || Date.now()-lastSync>35000) return;
  if (!state.battle && state.hunting) {
    const rate=huntingRate(state), elapsed=(Date.now()-lastSync)/1000;
    const progress=(state.huntRemainder+elapsed)%rate.seconds;
    const bar=$("#enemy-hp");
    if(bar)bar.style.width=(100*(1-progress/rate.seconds))+"%";
    const label=$("#battle-info");
    if(label)label.textContent=rate.survives ? "다음 처치까지 약 "+Math.ceil(rate.seconds-progress)+"초" : "회복 중 · 보상 없음";
    if (rate.survives && Date.now()-lastVisualHit>=1000) { lastVisualHit=Date.now(); strike(arena); }
  }
  if(state.battle) {
    const b=state.battle, enemy=battleEnemy(b);
    const tick=Math.min(enemy.seconds,b.tick+Math.floor((Date.now()-lastSync)/1000));
    const remaining=enemy.patternEvery-tick%enemy.patternEvery;
    const pattern=$("#pattern-info");
    if(pattern) { pattern.textContent=enemy.pattern+" · "+remaining+"초 후"; pattern.classList.toggle("pattern-warning",remaining<=3); }
    arena.classList.toggle("danger-pattern",remaining<=3);
    const button=arena.closest(".panel")?.querySelector('[data-action="skill"]');
    const cooldown=Math.max(0,Math.ceil((b.skillReady-b.started-b.tick*1000-(Date.now()-lastSync))/1000));
    if(button) {button.disabled=busy||cooldown>0;button.textContent=D.CLASSES.find(c=>c.id===state.classId).skill+(cooldown ? " · "+cooldown+"초" : " · 사용 가능");}
  }
  const frame=combatFrames.shift();
  if(frame) strike(arena,frame);
}, 500);
function unavailable() {
  app.innerHTML='<div class="login panel"><p class="eyebrow">링구 RPG</p><h2>잠시 연결을 기다리고 있어요</h2><p class="note">연결이 복구되면 저장된 모험을 이어갈 수 있어요.</p><div class="actions">'+btn("다시 연결","reconnect","","gold")+btn("로그아웃","logout")+'</div></div>';
}
window.addEventListener("online",()=>{ if(session) command("sync",{},true).catch(()=>{}); });
window.addEventListener("offline",()=>{connectionLost=true;const banner=$("#connection-status");if(banner)banner.hidden=false;});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) sounds.pause();
  else {
    sounds.start();
    sounds.music();
    if (session) command("sync", {}, true).catch(() => {});
  }
});
installCurrencyIcons();
if (session) command("sync").catch(() => {});
else login();
