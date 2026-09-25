import {TOWER_FLOORS} from './tower-model.mjs?v=tower-motion-30';
import {towerLobby,towerArena,TowerController} from './tower-client.mjs?v=tower-smooth-31';
import * as D from "./data.mjs?v=attendance-week-1";
import { installCurrencyIcons } from "./currency-icons.mjs?v=quality-market-5";
import equipmentBounds from "./equipment-bounds.mjs?v=quality-market-5";
import { inventoryGroups } from "./inventory-order.mjs?v=bag-groups-2";
import { power, huntingRate, battleEnemy } from "./engine.mjs?v=tower-motion-30";
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
const pct = (n) => (n * 100).toLocaleString("ko-KR", {maximumFractionDigits: 4}) + "%";
function requiredLevel(level, label = "Lv." + level) {
  return `<span data-required-level="${level}" class="required-level ${state&&state.level<level?"level-unmet":""}">${esc(label)}</span>`;
}
function refreshLevelRequirements() {
  if(!state)return;
  document.querySelectorAll('[data-required-level]').forEach(node=>{
    const level=Number(node.dataset.requiredLevel),unmet=state.level<level;
    node.classList.toggle("level-unmet",unmet);
    node.title=unmet?`필요 레벨 ${level} · 현재 레벨 ${state.level}`:`필요 레벨 ${level} 충족`;
  });
}
const combatFrames = [];
let towerController=null;
let marketKind="all";
let salvageMode=false;
const salvageSelection=new Set();
const canSalvage=it=>!it.locked&&!it.broken&&!Object.values(state.equipped).includes(it.id)&&state.pendingCube?.id!==it.id;
let partyBossId=null, partyPractice=false;
let bossTab="daily", partyRoom=null, partyRooms=[], rankingRows=[], rankingMode="level", rankingLoading=false, rankingError="", rankingUpdated=0, rankingRequest=0, itemSection="info";
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
    if (kind?.startsWith("tower-")) {
      if (Date.now() - (this.lastTowerSound || 0) < 75) return;
      this.lastTowerSound = Date.now();
      if (kind === "tower-swing") { this.tone(420, 0.07, 0.22, "sawtooth"); return; }
      if (kind === "tower-dash") { this.tone(280, 0.15, 0.28, "triangle"); this.tone(560, 0.09, 0.18, "sine", 0.03); return; }
      if (kind === "tower-skill") { this.tone(190, 0.22, 0.5, "triangle"); this.tone(680, 0.18, 0.25, "sine", 0.04); return; }
      const heavy = kind === "tower-crit", hurt = kind === "tower-hurt";
      this.tone(heavy ? 95 : hurt ? 105 : 145, heavy ? 0.25 : 0.15, heavy ? 0.8 : 0.55, "triangle");
      this.tone(heavy ? 860 : hurt ? 220 : 620, 0.09, heavy ? 0.55 : 0.28, "sawtooth", 0.01);
    } else if (kind === "hit") {
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
  INSUFFICIENT_MATERIAL: "판매할 소모품 수량이 부족합니다.",
  INVALID_QUANTITY: "남은 수량 안에서 정수로 입력해 주세요.",
  BASE_STATS_FIXED: "이 장비의 기본 수치는 획득 시 확정됩니다.",
  MAX_QUALITY: "이미 최고 품질입니다.",
  INSUFFICIENT_FRAGMENT: "장비 파편이 부족합니다.",
  INSUFFICIENT_BOSS_MATERIAL: "보스 재료가 부족합니다.",
  ITEM_PROTECTED: "잠금·파괴·장착 상태를 확인해 주세요.",
  ITEM_REQUIREMENT: "장비의 직업 또는 착용 레벨이 맞지 않습니다.",
  PREVIOUS_BOSS_REQUIRED: "이전 보스를 먼저 처치해 주세요.",
  PREVIOUS_FLOOR_REQUIRED: "이전 층을 먼저 클리어해 주세요.",
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
  PARTY_IN_PROGRESS: "협동 보스에서 나온 뒤 이용할 수 있어요.",
  PARTY_FULL: "4명이 모두 찬 파티입니다.",
  PARTY_MEMBERS_REQUIRED: "2명 이상 모이면 출발할 수 있어요.",
  PARTY_HOST_REQUIRED: "파티장만 출발할 수 있어요.",
  PARTY_NOT_JOINABLE: "이미 출발했거나 종료된 파티입니다.",
  PARTY_DEFEATED: "쓰러진 상태입니다. 부활 가능 여부를 확인해 주세요.",
  PARTY_REVIVE_UNAVAILABLE: "부활은 쓰러졌을 때 전투당 한 번 사용할 수 있어요.",
  RAID_LIMIT:"이 협동 보스는 오늘 2회 클리어했습니다. 연습으로 도전할 수 있어요.",
  ADVANCEMENT_REQUIRED:"2차 전직 후 사용할 수 있어요.",
  ALREADY_ADVANCED: "이미 전직을 완료했어요.",
  ALREADY_CLASS: "이미 선택한 직업이에요.",
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
  if (auth && !session?.access_token) throw endSession();
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
      data.error_description || data.message || data.msg || data.error || "SERVER_RETRY_REQUIRED",
    );
    e.status = r.status;
    e.code = data.error_code || data.code || "";
    if (["refresh_token_not_found", "refresh_token_already_used", "session_not_found"].includes(e.code) || /invalid refresh token|refresh token.*(not found|already used)/i.test(e.message)) throw endSession();
    const retry = r.headers.get("Retry-After");
    e.retryAfter = retry ? Math.max(0, /^\d+$/.test(retry) ? Number(retry) : Math.ceil((Date.parse(retry)-Date.now())/1000)) : 0;
    throw e;
  }
  return data;
}
let tokenRefresh = null;
function endSession() {
  if (session) {
    session = null;
    persist();
    clearAccountView();
    if (modal.open) modal.close();
    sounds.pause();
    login();
    $("#auth-error").textContent = "로그인 정보가 만료됐습니다. 기존 아이디와 비밀번호로 다시 로그인해 주세요. 저장된 캐릭터는 유지됩니다.";
  }
  const error = new Error("SESSION_ENDED");
  error.status = 401;
  return error;
}
async function ensureToken() {
  if (!session?.access_token || !session?.refresh_token) throw endSession();
  if (tokenRefresh) return tokenRefresh;
  if (!session.expires_at || session.expires_at * 1000 < Date.now() + 60000) {
    const original = session;
    tokenRefresh = (async () => {
    try {
    const next = await request(
      "/auth/v1/token?grant_type=refresh_token",
      { refresh_token: original.refresh_token },
      false,
    );
    if (session !== original) throw new Error("LOGIN_REQUIRED");
    session = next;
    session.expires_at =
      session.expires_at || Date.now() / 1000 + session.expires_in;
    persist();
    } catch (error) {
      if (["refresh_token_not_found", "refresh_token_already_used", "session_not_found"].includes(error.code) || /invalid refresh token|refresh token.*(not found|already used)/i.test(error.message)) {
        error.message = "SESSION_ENDED";
        error.status = 401;
      }
      throw error;
    }
    })();
    try { await tokenRefresh; } finally { tokenRefresh = null; }
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
    state = D.normalizePotentialState(result.state);
    if ("room" in result) partyRoom=result.room; else if (!state?.partyRoom) partyRoom=null;
    if (result.rooms) partyRooms=result.rooms;
    lastSync = Date.now();
    connectionLost = false;
    retryAt = 0;
    retryFailures = 0;
    render();
    for (const event of result.result?.events || []) if(event.type === "combat") combatFrames.push(...event.frames);
    if (combatFrames.length > 6) combatFrames.splice(0, combatFrames.length - 6);
    if (!quiet || result.result?.events?.some(e=>["boss","dungeon","party","tower"].includes(e.type))) showEvents(result.result?.events || []);
    return result;
  } catch (e) {
    if (e.status === 400) localStorage.removeItem(pendingKey());
    if (e.status === 401) {
      endSession();
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
      .forEach((b) => (b.disabled = b.hasAttribute("data-unavailable")));
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
function attendanceReady() { return state?.attendance?.lastClaim !== D.dayKey(Date.now()); }
function attendanceReward(reward) {
  return Object.entries(reward).map(([key,amount]) => `${key==="gold"?"골드":D.MATERIALS[key]} ${fmt(amount)}${key==="gold"?" G":"개"}`).join(" · ");
}
function attendance() {
  const claimed = !attendanceReady(), day = ((state.attendance?.day || 0) % 7) + 1;
  const completed = claimed && state.attendance?.day===7 ? 7 : claimed ? state.attendance?.day||0 : day-1;
  open("7일 출석 보상", `<p class="attendance-lead">${claimed?"오늘 출석 완료! 내일 "+day+"일차 보상을 받을 수 있어요.":"오늘은 "+day+"일차 보상을 받을 수 있어요."}</p><div class="attendance-grid">${D.ATTENDANCE_REWARDS.map((reward,i)=>`<div class="attendance-day ${i===6?"attendance-grand":""} ${i+1===day&&!claimed?"attendance-next":""} ${i+1<=completed?"attendance-done":""}"><strong>${i+1}일차 ${i===6?"★ 특별 보상":""}</strong><span>${attendanceReward(reward)}</span>${i+1===day&&!claimed?"<small>오늘 수령 가능</small>":""}</div>`).join("")}</div><p class="note">매일 오전 0시(한국 시간)에 다음 보상을 받을 수 있어요. 하루를 놓쳐도 진행일은 유지되며 7일차를 받은 뒤 다시 1일차부터 반복됩니다.</p><div class="actions">${claimed?btn("내일 다시 받기","close","","",false):state.battle||state.partyRoom?'<button disabled>전투 종료 후 받기</button>':btn(day+"일차 보상 받기","attendanceClaim","","gold",true)}</div>`);
  modal.classList.add("attendance-dialog");
}
function changeClassDialog() {
  const current = D.CLASSES.find(c=>c.id===state.classId);
  open("직업 변경", `<p class="note">현재 ${current.name} · 변경하면 장착 장비가 모두 가방으로 돌아가고 자동사냥이 멈춥니다. 전직·레벨·보스 기록은 유지돼요.</p><div class="change-class-grid">${D.CLASSES.map((c,i)=>`<button class="change-class-card ${c.id===state.classId?"current":""}" data-action="changeClassPick" data-arg="${c.id}" ${c.id===state.classId?"disabled":""}><span class="portrait" style="background-position:${i*25}% 0" aria-hidden="true"></span><strong>${c.name}</strong><small>${c.stat} · ${c.weapon}</small><span>1차 ${D.CLASS_SKILLS[c.id].name}<br>2차 ${D.SECOND_SKILLS[c.id].name}</span>${c.id===state.classId?"<em>현재 직업</em>":""}</button>`).join("")}</div><p class="note">직업별 스탯 배분은 따로 저장됩니다. 처음 바꾸는 직업의 기본 무기는 가방 또는 보관함에 한 번 지급됩니다.</p>`);
  modal.classList.add("change-class-dialog");
}
function confirmClassChange(classId) {
  const next=D.CLASSES.find(c=>c.id===classId),current=D.CLASSES.find(c=>c.id===state.classId);
  if(!next||next.id===current.id)return;
  open("직업 변경 확인",`<p class="change-class-summary"><strong>${current.name}</strong> → <strong>${next.name}</strong></p><p class="note">현재 장착 장비 ${Object.keys(state.equipped).length}개를 해제하고 자동사냥을 중지합니다. 새 직업의 전용 장비를 장착한 뒤 사냥을 다시 시작하세요.</p><p class="note">레벨·전직·출석·보스 기록은 유지되고, 직업별 스탯 배분과 스킬·랭킹 직업 표시는 새 직업으로 바뀝니다.</p><div class="actions">${btn("다시 고르기","changeClass","","")}${disabledBtn(next.name+"으로 변경","changeClassConfirm",next.id,!!state.battle||!!state.partyRoom||!!state.pendingCube,"gold")}</div>`);
  modal.classList.add("change-class-dialog");
}
function shell(content) {
  const c = D.CLASSES.find((c) => c.id === state.classId);
  return `<div class="shell"><header class="top"><div class="brand">링구 RPG<small>REBIRTH</small></div><div class="identity"><strong>${esc(state.name)}</strong><small>Lv.${state.level} · ${c.name}</small></div><div class="top-actions">${btn(attendanceReady()?"출석 · 받기":"출석 완료", "attendance", "", attendanceReady()?"attendance-alert":"")}${btn("랭킹", "ranking", "", "top-ranking")}${btn("베타 지급", "betaTools")}${btn("설정", "settings")}</div><div class="top-resources"><div class="money" data-currency-label="gold" aria-label="보유 골드 ${fmt(state.gold)}"><img src="currencies/gold.svg" alt=""><strong>${fmt(state.gold)}</strong><span>G</span></div><span class="top-power">전투력 <b>${fmt(power(state).combatPower)}</b></span></div></header><div id="connection-status" class="connection-status" role="status" ${connectionLost ? "" : "hidden"}>연결이 지연되고 있어요. 다시 연결되면 진행 상황을 불러옵니다. ${btn("다시 연결", "reconnect")}</div>${content}<nav class="bottom">${[
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
  const towerBattle=state?.battle?.kind==='tower'?state.battle:null;
  document.body.classList.toggle('tower-mode',!!towerBattle);
  if(towerBattle&&towerController?.b.runId===towerBattle.runId){towerController.accept(towerBattle);return;}
  if(towerController){towerController.dispose();towerController=null;}
  if (!session) return login();
  if (!state) return createScreen();
  let content;
  if (towerBattle) content=towerArena(towerBattle);
  else if (view === "ranking") content = rankings();
  else if (state.partyRoom) content = partyPanel();
  else if (view === "journal") content = journal();
  else if (view === "regions") content = regions();
  else
    content = {
      hunt: hunt,
      character: character,
      gear: inventory,
      boss: bosses,
      market: market,
    }[tab]();
  app.innerHTML = shell(content);
  refreshLevelRequirements();
  if(towerBattle){towerController=new TowerController(app.querySelector('.tower-play'),towerBattle,command,kind=>sounds.play(kind));return;}
  if(state?.battle||state?.partyRoom)updateCombatClock();
  if (state.pendingCube && !modal.open) cubeChoice();
}
function hunt() {
  const st = D.STAGES[state.stage],
    region = state.battle?.dungeon === "relic" ? D.EXPEDITION : D.REGIONS[state.battle ? battleEnemy(state.battle).region : st.region],
    p = power(state),
    r = huntingRate(state),
    b = state.battle,
    boss = b && battleEnemy(b);
  return `${header(boss ? boss.name : st.name, region.name)}<div class="main-grid"><div><section class="panel"><div class="arena" data-class="${state.classId}" style="background-image:url('${region.background}')"><div class="battle-head"><small>${boss ? "BOSS · " + (b.kind === "dungeon" ? "수련" : boss.weekly ? "주간" : "일일") : "권장 Lv." + st.level + " · 일반 사냥"}</small><h3>${boss ? boss.name : D.MONSTERS[st.id * 2 + (state.huntKills || 0) % 2].name}</h3><div class="hp"><i id="enemy-hp" style="width:${boss ? Math.max(0, (b.enemyHp / boss.hp) * 100) : 100}%"></i></div><small id="battle-info">${boss ? fmt(b.enemyHp) + " / " + fmt(boss.hp) : state.hunting ? "전투 중" : "사냥 시작을 눌러 도전하세요"}</small></div><div class="monster">${boss ? bossMarkup(boss) : monsterMarkup(D.MONSTERS[st.id * 2 + (state.huntKills || 0) % 2])}</div><div class="combat-status"><span class="pill" id="hunt-status">${boss ? "보스 전투 중" : state.hunting ? "자동사냥 중" : "휴식 중"}</span>${boss ? `<p id="player-hp">내 HP ${fmt(b.hp)} / ${fmt(b.power.hp)}</p><div class="hp player-health"><i style="width:${Math.max(0, b.hp/b.power.hp*100)}%"></i></div><small id="pattern-info">${boss.pattern} · ${boss.patternEvery - b.tick % boss.patternEvery}초 후</small>` : `<p id="field-player-hp">내 HP ${fmt(power(state).hp)} / ${fmt(power(state).hp)}</p><div class="hp player-health"><i id="field-player-bar" style="width:100%"></i></div><small id="field-combat-result">${state.hunting?"몬스터와 전투 중":"사냥을 시작하면 자동으로 전투합니다."}</small>`}</div></div><div class="pad"><div class="row spread"><small>Lv.${state.level} 경험치</small><small>${fmt(state.xp)} / ${fmt(D.xpNeeded(state.level))}</small></div><div class="exp"><i style="width:${Math.min(100, (state.xp / D.xpNeeded(state.level)) * 100)}%"></i></div><div class="metrics"><div><small>예상 시간당 경험치</small><b>${fmt((r.xp * 3600) / r.seconds)}</b></div><div><small>예상 시간당 골드</small><b>${fmt((r.gold * 3600) / r.seconds)}</b></div><div><small>드롭 장비</small><b>${gearLevelRange(st.dropLevel)}</b></div></div><div class="actions">${boss ? combatSkillButtons() : btn(state.hunting ? "사냥 중지" : "사냥 시작", "toggleHunt", "", "gold", true)}${btn("사냥터 변경", "regions")}${btn("보상 확인", "reward")}${boss ? btn("전투 포기", "abandonConfirm") : ""}</div>${boss ? `<p class="note">전투 제한 ${boss.seconds}초 · <strong id="battle-timer">남은 ${boss.seconds-b.tick}초</strong></p>`+skillGuide() : recentLoot()}</div></section></div><aside><div class="panel pad"><p class="eyebrow">오늘의 성장</p><h3>장비는 모험에서 얻습니다</h3><p class="note">권장레벨에 맞는 장비를 강화해야 안정적으로 사냥할 수 있습니다. 패배하면 10초 후 부활해 재도전합니다. 반복해서 패배한다면 장비를 강화하거나 하위 사냥터에서 재화를 모으세요. 상위 사냥터는 경험치 중심으로 성장합니다.</p><div class="row wrap">${Object.entries(
    D.MATERIALS,
  )
    .map(
      ([k, v]) =>
        `<span class="currency">${v} <b>${fmt(state.materials[k])}</b></span>`,
    )
    .join(
      "",
    )}</div></div><div class="panel pad"><h3>다음 목표</h3><p class="note">${state.cleared.length < 30 ? D.BOSSES.find((b) => !state.cleared.includes(b.id))?.name + " 처치" : "최종 장비와 잠재옵션 완성"}</p>${btn("보스 확인", "tab", "boss")}${btn("모험 수첩", "journal")}</div>${state.tutorial < 6 ? `<div class="quest"><strong>모험 안내 ${state.tutorial + 1}/6</strong><p class="note">${["시작 무기는 장착되어 있어요. 캐릭터 탭에서 확인하세요.", "레벨업 포인트는 내 직업 주스탯에 분배하세요.", "사냥터는 권장레벨·생존 가능 여부·선행 보스 조건을 확인하세요.", "보스 장비는 재료 24개로 원하는 부위를 제작할 수 있어요.", "장비 잠재를 열고 큐브로 유효 옵션을 찾으세요.", "강화 확률과 파괴 조건을 확인하고 도전하세요."][state.tutorial]}</p>${btn("확인", "tutorial", "", "", true)}</div>` : ""}</aside></div>`;
}
function regions() {
  return `${header("사냥터 선택", "WORLD MAP")}${btn("사냥으로 돌아가기", "back")}<section class="panel pad relic-card"><strong>여명의 폐허 · ${requiredLevel(200)}</strong><p class="note">멸신왕 벨제리온 이후 열리는 유적 · 일반 ${requiredLevel(200,"200레벨")} 장비</p>${disabledBtn("유적 탐사","dungeon","relic",state.level<200||!state.cleared.includes(29),"gold")}</section><div class="region-list" style="margin-top:12px">${D.REGIONS.map(
    (r) =>
      `<section class="panel"><div class="region-banner" style="background-image:url('${r.background}')"><h3>${r.name} <small>권장 Lv.${r.level}</small></h3></div>${D.STAGES.filter(
        (s) => s.region === r.id,
      )
        .map(
          (s) =>
            `<div class="stage-row"><div><strong>${s.name}</strong><br><small>권장 Lv.${s.level} · 레벨 제한 없음 · 필요 스타포스 ${s.star}<br>경험치 ${fmt(s.xp)} / 처치 · ${state.stage === s.id ? "현재 사냥터" : gearLevelRange(s.dropLevel) + " 장비"}</small></div>${disabledBtn("입장", "enterStage", s.id, power(state).stars<s.star||(s.region>0&&!state.cleared.includes(s.region*3-1)))}</div>`,
        )
        .join("")}</section>`,
  ).join("")}</div>`;
}
function character() {
  const c = D.CLASSES.find((x) => x.id === state.classId),
    p = power(state);
  return `${header("캐릭터", (state.advancement?D.ADVANCEMENTS[c.id]:c.name) + " · " + c.stat + " 주스탯")}<div class="subnav">${btn("모험 수첩","journal")}${btn("직업 변경","changeClass")}</div><section class="panel pad">${skillGuide()}</section><section class="panel pad advancement-card"><div><strong>${state.advancement?D.ADVANCEMENTS[c.id]+" 전직 완료":"다음 전직 · "+D.ADVANCEMENTS[c.id]}</strong><p class="note">${requiredLevel(60)} · 광산왕 크로투스 처치 · 공격력 +8% / HP +10%</p></div>${disabledBtn(state.advancement?"완료":"전직","advance","",!!state.advancement||state.level<60||!state.cleared.includes(8),"gold")}</section><div class="main-grid"><section class="panel"><div class="hero"><div class="portrait" style="background-position:${D.CLASSES.indexOf(c) * 25}% 0" role="img" aria-label="${c.name}"></div><div class="hero-label"><h2>${esc(state.name)}</h2><span class="pill">${c.name}</span></div></div><div class="pad"><div class="stat-grid">${Object.keys(
    state.stats,
  )
    .map(
      (k) =>
        `<div class="${k === c.stat ? "primary" : ""}"><small>${k}${k===c.stat?" · 주스탯":""}</small><b>${fmt(p.stats[k].total)}</b></div>`,
    )
    .join(
      "",
    )}</div><p class="note">장비·잠재를 합산한 최종 스탯 · 남은 포인트 ${state.points}</p><div class="actions">${btn("직접 분배", "stats")}${btn("주스탯 자동 분배", "autoStats", "", "gold", true)}${btn("초기화", "resetStats")}</div></div></section><div>${characterMetrics(p,c)}<section class="panel pad"><h3>장착 장비</h3><div class="gear-grid" style="margin-top:12px">${D.SLOTS.map(
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
  )}</div></section></div></div>`;
}
function characterMetrics(p,c) {
  const bonus = v => "+" + pct(v / 100);
  const rows = [["최종 공격력",fmt(p.attack)],["공격력 보너스",bonus(p.bonuses.attack)],["보스 피해",bonus(p.bonuses.boss)],["치명타 확률",pct(p.crit)],["치명타 피해",pct(p.critDamage)],["최대 HP",fmt(p.hp)],["HP 보너스",bonus(p.bonuses.hp)],["방어력",fmt(p.defense)],["방어력 보너스",bonus(p.bonuses.defense)],["골드 획득",bonus(p.goldGain)],["경험치 획득",bonus(p.xpGain)],["스타포스",p.stars+"성"]];
  return `<section class="panel pad character-summary"><div class="combat-power"><span>종합 전투력</span><strong>${fmt(p.combatPower)}</strong><small>현재 장착 장비 · 스타포스 · 잠재 반영</small></div><div class="character-metrics">${rows.map(([label,value])=>`<div><span>${label}</span><b>${value}</b></div>`).join("")}</div><p class="note">공격력·HP·방어력은 직업과 전직 효과까지 적용한 최종 수치입니다. 보너스 %는 잠재 옵션의 합계입니다.</p><details class="combat-formula"><summary>전투력 계산 기준</summary><p>⌊평균 초당 피해 × 보스 피해 배율 + HP × 0.1 + 방어력 × 5⌋</p><p>평균 초당 피해는 공격력 × [1 + 치명타 확률 × (치명타 피해 배율 − 1)] × 공격 속도입니다. 해적 공격 속도는 1.08배, 나머지는 1배입니다.</p><p>고정 주스탯과 주스탯 %는 최종 공격력에 이미 반영됩니다. 골드·경험치 획득은 전투력에 포함하지 않습니다. 일시적인 전투 스킬은 제외한 비교용 수치입니다.</p></details></section><section class="panel pad stat-breakdown"><h3>스탯 상세</h3><p class="note">(기본 + 성장·장비 + 고정 잠재) × (1 + 스탯 %)<br>현재 직업은 ${c.stat}이 공격력에 반영됩니다.</p><div class="stat-detail-grid">${Object.entries(p.stats).map(([key,v])=>`<div class="stat-detail ${key===c.stat?"primary":""}"><div><strong>${key}</strong><b>${fmt(v.total)}</b></div><dl><dt>기본</dt><dd>${fmt(v.base)}</dd><dt>성장·장비</dt><dd>+${fmt(v.growth)}</dd><dt>고정 잠재</dt><dd>+${fmt(v.fixed)}</dd><dt>스탯 보너스</dt><dd>${bonus(v.percent)}</dd></dl></div>`).join("")}</div></section>`;
}
function gearLevelRange(base){const r=D.equipmentLevelRange(base);return r.min===r.max?requiredLevel(r.min):requiredLevel(r.min)+" / "+requiredLevel(r.max);}
function gearRollLabel(it){return it.baseStats?"기본 공격력 "+fmt(it.baseStats.attack):"기존 품질 "+D.itemQuality(it)+"%";}
function itemMarkup(it) {
  if(it.kind==="consumable")return `<div class="consumable-market-icon">◆</div><div class="item-info"><strong>${esc(D.MATERIALS[it.key]||it.key)}</strong><p>남은 ${fmt(it.quantity)}개 · 소모품</p></div>`;
  return `${gearMarkup(it)}<div class="item-info"><strong>${esc(D.gearName(it))} ${it.locked ? "[잠금]" : ""}</strong><p>${requiredLevel(it.level)} · ${D.CLASSES.find((c) => c.id === it.classId).name} · ${D.equipmentType(it)} ${Object.values(state.equipped).includes(it.id) ? "· 장착 중" : ""}</p><span class="stars">${it.broken ? "파괴된 장비 흔적" : it.stars + "성"}</span> <span class="quality-badge">${gearRollLabel(it)}</span> <span class="potential-grade grade-color-${it.grade}">${it.lines.length ? it.lines.map(l=>D.RARITIES[l.grade]).join(" · ") : "잠재 미개방"}</span></div>`;
}
function bagTile(item) {
  const otherClass=item.classId!==state.classId;
  return btn(gearMarkup(item)+`<span class="tile-meta"><span class="tile-level">${requiredLevel(item.level,"Lv."+item.level)}</span><span class="tile-star">${item.stars}★</span></span><span class="tile-name ${otherClass?"other-class":""}">${esc(D.gearName(item))}</span><span class="tile-class ${otherClass?"other-class":""}">${esc(D.CLASSES.find(c=>c.id===item.classId)?.name||item.classId)} 전용</span><span class="tile-quality">${gearRollLabel(item)}</span><span class="sr-only">${D.equipmentType(item)} ${item.locked?"잠금":""}</span>`, salvageMode?"salvagePick":"item", item.id, `bag-slot ${salvageMode?(salvageSelection.has(item.id)?"salvage-selected":!canSalvage(item)?"salvage-unavailable":""):""} ${Object.values(state.equipped).includes(item.id)?"equipped":""} ${item.locked?"locked":""}`);
}
function bagGroupsMarkup(groups) {
  if (!groups.length) return '<div class="empty">조건에 맞는 장비가 없습니다.</div>';
  return groups.map((group) => {
    const className=D.CLASSES.find(c=>c.id===group.classId)?.name||group.classId;
    const ownClass=group.classId===state.classId;
    return `<section class="bag-class-group${ownClass?" own-class":""}"><h3 class="bag-class-heading"><span>${ownClass?"내 직업 · ":""}${esc(className)}</span><small>${group.count}개</small></h3>${group.slots.map(({slot,items})=>`<div class="bag-slot-group"><h4 class="bag-slot-heading"><span>${esc(D.SLOTS[slot]||"기타 부위")}</span><small>${items.length}개</small></h4><div class="inventory-grid bag-grid">${items.map(bagTile).join("")}</div></div>`).join("")}</section>`;
  }).join("");
}
function inventory() {
  for(const id of salvageSelection)if(!state.items.some(it=>it.id===id&&canSalvage(it)))salvageSelection.delete(id);
  const groups=inventoryGroups(state.items,D.CLASSES,state.classId,Object.values(state.equipped),filterClass,filterSlot);
  return `${header("장비", "EQUIPMENT")}<div class="subnav">${[
    ["bag", "장비"],
    ["consumables", "소비"],
    ["materials", "재료"],
    ["mail", "보관함"],
    ["collection", "도감"],
    ["craft", "제작"],
    ["odds", "확률표"],
  ]
    .map(([k, l]) => btn(l, "gearSub", k, sub === k ? "active" : ""))
    .join(
      "",
    )}</div>${["consumables","materials"].includes(sub) ? supplies(sub) : sub === "craft" ? craft() : sub === "odds" ? odds() : sub === "mail" ? mailbox() : sub === "collection" ? collection() : `<section class="auto-equip-card"><div><strong>전투력 기준 최적 장착</strong><small>현재 전투력 ${fmt(power(state).combatPower)} · 장비·잠재 합산</small></div>${disabledBtn("최적 장착","autoEquip","",!!state.battle||!!state.partyRoom||!!state.pendingCube,"gold")}<p>${state.pendingCube?"큐브 옵션 선택을 먼저 완료해 주세요.":state.battle||state.partyRoom?"전투·파티를 종료한 뒤 사용할 수 있습니다.":"가방 전체에서 착용 가능한 장비를 비교합니다. 잠금 장비도 포함됩니다."}</p></section><div class="filters"><select data-filter="slot"><option value="">모든 부위</option>${D.SLOTS.map((v, i) => `<option value="${i}" ${String(i) === filterSlot ? "selected" : ""}>${v}</option>`).join("")}</select><select data-filter="class"><option value="">모든 직업</option>${D.CLASSES.map((c) => `<option value="${c.id}" ${c.id === filterClass ? "selected" : ""}>${c.name}</option>`).join("")}</select></div><p class="note">9부위 장착 · 직업별 무기 ${D.WEAPON_TYPES[state.classId].join("·")}<br>가방 ${state.items.length}/300 · 내 직업 먼저 → 직업별 → 부위별 정렬</p><div class="actions">${btn(salvageMode?"선택 분해 종료":"선택 분해","salvageMode")}${salvageMode?btn("표시 장비 선택 (최대 50개)","salvageSelectVisible")+btn("선택 해제","salvageClear")+disabledBtn("선택 "+salvageSelection.size+"개 분해","salvageBatchConfirm","",!salvageSelection.size||!!state.battle||!!state.partyRoom,"danger"):""}</div>${salvageMode?`<p class="note">장비를 눌러 선택하세요. 장착·잠금·파괴·큐브 선택 중인 장비는 제외됩니다.</p>`:""}<div class="bag-groups">${bagGroupsMarkup(groups)}</div>`}`;
}
function atlasIcon(tier, n, label, size="") {
  const atlas=[
    {w:1278,h:1230,x:[0,335,643,972,1278],y:[0,360,654,930,1230]},
    {w:1278,h:1230,x:[0,335,643,972,1278],y:[0,353,646,912,1230]},
    {w:1448,h:1086,x:[0,365,733,1095,1448],y:[0,293,548,810,1086]},
  ][tier];
  const col=n%4,row=Math.floor(n/4),x=atlas.x[col],y=atlas.y[row],w=atlas.x[col+1]-x,h=atlas.y[row+1]-y;
  return `<svg class="gear-icon ${size}" role="img" aria-label="${esc(label)}" viewBox="${x} ${y} ${w} ${h}"><image href="gear-${tier}.svg" width="${atlas.w}" height="${atlas.h}" preserveAspectRatio="none"/></svg>`;
}
let gearClipId=0;
function gearMarkup(it, size="") {
  if(!it) return "";
  const art = D.equipmentIdentity(it);
  if(art.grid)return `<span class="gear-frame ${size}"><span class="gear-icon" role="img" aria-label="${esc(art.name)}" style="display:block;width:100%;height:100%;background-image:url('${art.art}');background-size:${art.columns*100}% ${art.rows*100}%;background-position:${art.column/(art.columns-1)*100}% ${art.row/(art.rows-1)*100}%;background-repeat:no-repeat"></span></span>`;
  const bounds=equipmentBounds[art.art.split('/').pop()];
  const ys=bounds.cellY[art.column],cell=bounds.cells?.[art.column]?.[art.row]; const [x,y,w,h]=cell||[bounds.x[art.column],ys[art.row],bounds.x[art.column+1]-bounds.x[art.column],ys[art.row+1]-ys[art.row]];
  const clipId='gear-clip-'+(++gearClipId),clip=cell?.[4]?`<defs><clipPath id="${clipId}"><polygon points="${cell[4]}"/></clipPath></defs>`:'';
  return '<span class="gear-frame '+size+'"><svg class="gear-icon" role="img" aria-label="'+esc(art.name)+'" viewBox="'+[x,y,w,h].join(' ')+'" overflow="hidden" preserveAspectRatio="xMidYMid meet"><svg x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" viewBox="'+[x,y,w,h].join(' ')+'" overflow="hidden"><image href="'+art.art+'" width="'+bounds.width+'" height="'+bounds.height+'" preserveAspectRatio="none" '+(clip?'clip-path="url(#'+clipId+')"':'')+'/>'+clip+'</svg></svg></span>';
}
function bossMarkup(b, size="") {
  if(b.fullArt) return `<img class="boss-sprite ${size}" src="${b.art}" alt="${esc(b.name)}" style="object-fit:contain">`;
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
const bossMaterialNames = ["생명의 나무 심장", "월광의 뿔", "고대 수정 광석", "용암의 핵", "망령 왕가의 인장", "빙룡의 비늘", "태양의 풍뎅이", "천공의 깃털", "시간의 톱니", "심연의 왕관 파편"];
const craftSelections = new Map();
function materialMarkup(region) {
  return `<span class="material-icon" role="img" aria-label="${bossMaterialNames[region]}" style="background-position:${region%5*25}% ${Math.floor(region/5)*100}%"></span>`;
}
function craftItem(region) {
  const slot=Number(craftSelections.get(region)||0);
  return {...D.designItem(D.TIERS[region+1],state.classId,slot,true,0),id:"craft-preview",stars:0,grade:0,lines:[]};
}

function craftRequirements(region) {
  return [
    {label:bossMaterialNames[region],have:state.bossMaterials[region]||0,need:24},
    {label:"장비 파편",have:state.materials.fragment,need:60},
    {label:"골드",have:state.gold,need:3000+region*500},
  ];
}
function craftBlockReason(region) {
  if(!state.cleared.some(id=>Math.floor(id/3)===region))return "이 지역 보스를 먼저 처치하세요";
  if(state.items.length>=300)return "가방 공간이 부족합니다";
  const missing=craftRequirements(region).filter(x=>x.have<x.need);
  return missing.length?missing.map(x=>`${x.label} ${fmt(x.need-x.have)} 부족`).join(" · "):"";
}
function craftPreview(region,detail=false){const it=craftItem(region),reason=craftBlockReason(region),r=D.equipmentLevelRange(it.level);const entries=[...new Set([r.min,r.max])].flatMap(level=>Array.from({length:D.designCount(level,it.classId,it.slot,true)},(_,i)=>D.designItem(level,it.classId,it.slot,true,i)));return `<p>선택 부위: ${D.SLOTS[it.slot]} · 레벨 ${gearLevelRange(it.level)}</p><p class="note">먼저 레벨을 추첨하고 그 레벨의 장비 4~6종 중 하나를 추첨합니다. 각 장비의 기본 수치는 고유 범위에서 결정됩니다.</p>${detail?entries.map(entry=>{const ranges=D.gearStatRanges(entry);return `<div class="item">${gearMarkup(entry)}<div>${esc(D.gearName(entry))}<p>Lv.${entry.level} · 해당 레벨 내 ${D.designWeights(D.designCount(entry.level,entry.classId,entry.slot,true))[entry.design]}% · 기본 공격력 ${ranges.attack.min}~${ranges.attack.max}</p></div></div>`;}).join(""):""}<div class="craft-costs">${craftRequirements(region).map(x=>`<p>${x.label} ${fmt(x.have)} / ${fmt(x.need)}</p>`).join("")}</div><p class="note">${reason||"제작 가능"}</p><div class="actions">${detail?"":btn("장비 후보 보기","craftDetail",region)}${disabledBtn("선택 부위 제작","craft",region,!!reason,"gold")}</div>`;}

function craft() {
  return `<div class="panel pad"><h3>잠재 부여 주문서</h3><p class="note">장비 파편 ${D.SUPPLY_EXCHANGE.scroll.fragment}개 + ${fmt(D.SUPPLY_EXCHANGE.scroll.gold)} 골드</p>${btn("제작", "craftScroll", "", "", true)}</div><p class="note">부위를 고르면 제작 결과와 필요 재료가 바뀝니다. 상세 보기에서 장착 시 능력치를 확인하세요.</p><div class="region-list craft-list">${D.REGIONS.map(r=>`<section class="panel pad"><h3>${r.name} · ${requiredLevel(D.TIERS[r.id+1])}</h3><label class="craft-select-label" for="craft-${r.id}">제작할 장비</label><select id="craft-${r.id}" data-craft-region="${r.id}">${D.SLOTS.map((name,i)=>[String(i),name]).map(([value,name])=>`<option value="${value}" ${value===(craftSelections.get(r.id)||"0")?"selected":""}>${name}</option>`).join("")}</select><div id="craft-preview-${r.id}">${craftPreview(r.id)}</div></section>`).join("")}</div>`;
}
function odds() {
  return `<div class="panel pad"><h3>스타포스 · 최대 25성</h3><p class="note">10·15성은 하락 방지 지점입니다. 파괴 시 같은 장비로 12성 복구하며 잠재가 보존됩니다.</p><table><tr><th>목표</th><th>성공</th><th>유지</th><th>하락</th><th>파괴</th></tr>${D.STAR_SUCCESS.map(
    (_, n) => {
      const o = D.starOdds(n);
      return `<tr><td>${n + 1}성</td><td>${pct(o.success)}</td><td>${pct(o.keep)}</td><td>${pct(o.down)}</td><td>${pct(o.destroy)}</td></tr>`;
    },
  ).join(
    "",
  )}</table></div><div class="panel pad"><h3>잠재와 큐브 · 모든 장비 공통</h3><p class="note">각 줄은 독립 등급이며 처음 개방한 줄은 일반입니다. 1줄 70% · 2줄 27% · 3줄 3%.<br>두 큐브 모두 기존/새 옵션 선택 가능. 각 줄은 별도 추첨으로 한 번에 한 단계만 상승하며 절대 하락하지 않습니다. 기존 옵션을 선택해도 상승한 등급은 유지됩니다. 레전더리인 줄은 계속 레전더리 옵션만 나옵니다. 다른 줄은 영향을 받지 않습니다.</p><table><tr><th>등급 상승</th><th>일반 큐브</th><th>상급 큐브</th></tr>${D.CUBE_UP.slice(0,-1).map((p,i)=>`<tr><td>${D.RARITIES[i]} → ${D.RARITIES[i+1]}</td><td>${pct(p)}</td><td>${pct(D.HIGH_CUBE_UP[i])}</td></tr>`).join("")}</table><p class="note">등급 상승 외에는 현재 등급 유지. 레전더리 유지 100%. 상급 큐브는 상승 확률만 2배이고, 같은 등급의 옵션 추첨 확률은 같습니다.</p><h3>옵션 종류 · 각 줄 독립 추첨</h3><p class="note">${Object.entries(D.OPTION_WEIGHTS).map(([k,w])=>D.OPTIONS[k]+(k.startsWith("flat")?" 고정":" %")+" "+w+"%").join(" · ")}<br> 모든 직업·레벨·부위·일반/보스 장비가 동일하며 같은 옵션 중복도 가능합니다. 새 옵션의 수치는 아래 범위에서 균등 추첨합니다. 같은 종류는 상위 등급의 최솟값이 하위 등급의 최댓값보다 높습니다. 일반 %와 고정 스탯은 1단위, 골드·경험치는 0.1% 단위입니다. 치명타 확률은 %p 증가이며 최종 치명타 확률은 95% 제한입니다.</p><table><tr><th>등급</th><th>전투 옵션 %</th><th>고정 스탯</th><th>고정 HP</th><th>골드·경험치</th></tr>${D.RARITIES.map((g,i)=>`<tr><td class="grade-color-${i}">${g}</td><td>${D.POTENTIAL_RANGES[i][0]}~${D.POTENTIAL_RANGES[i][1]}%</td><td>+${D.FLAT_RANGES[i][0]}~${D.FLAT_RANGES[i][1]}</td><td>+${D.FLAT_HP_RANGES[i][0]}~${D.FLAT_HP_RANGES[i][1]}</td><td>${D.GAIN_RANGES[i][0]}~${D.GAIN_RANGES[i][1]}%</td></tr>`).join("")}</table><p class="note">등급 확정 후 종류와 수치를 따로 추첨합니다. 각 수치의 확률은 1 ÷ 가능한 수치 개수. 특정 종류+특정 수치 확률은 종류 확률 ÷ 수치 개수입니다. 골드·경험치 획득은 일반 사냥(접속/오프라인)에 적용하며 소수점 보상은 누적합니다. 기존 옵션 유지 시 수치는 그대로입니다.<br>일반 큐브: 1개 + 300 G · 상급: 1개 + 1,000 G · 개방: 주문서 1개 + 500 G.<br>확장: 1→2줄 확장석 1개 / 2→3줄 3개, 각각 2,000 G. 기존 줄을 보존하고 추가한 줄은 일반 등급으로 시작합니다.</p></div><div class="panel pad"><h3>일반 사냥 드롭 · 온라인/오프라인 동일</h3><p class="note">처치마다 독립 추첨: 일반 장비 ${pct(D.EQUIP_DROP)}, 보스 장비 ${pct(D.FIELD_BOSS_DROP)}, 일반 큐브 ${pct(D.CUBE_DROP)}, 잠재 주문서 ${pct(D.SCROLL_DROP)}, 파편 ${pct(D.FRAGMENT_DROP)}.<br>장비 직업은 5종 균등, 부위는 9종 균등입니다. 부위마다 4~6종의 개별 장비를 추첨합니다. 4종은 약한 순서로 60/28/11/1%, 5종은 50/28/15/6/1%, 6종은 44/26/16/9/4/1%입니다. 무기 종류의 구성은 레벨마다 달라집니다. 보스 드롭은 보스 탭에 표시합니다.</p><table><tr><th>사냥터 지역</th><th>장비 레벨<br>일반 / 보스</th><th>일반 / 보스 확률</th></tr>${D.REGIONS.map(r=>`<tr><td>${r.name} · 3개 사냥터 공통</td><td>${gearLevelRange(D.TIERS[r.id])} / ${gearLevelRange(D.TIERS[r.id])}</td><td>${pct(D.EQUIP_DROP)} / ${pct(D.FIELD_BOSS_DROP)}</td></tr>`).join('')}</table><p class="note">지역 안의 몬스터별 확률은 같습니다. 장비는 1·10·20·30…200레벨만 새로 생성됩니다. 각 지역 하단 레벨 약 70.71%, 상단 레벨 약 29.29%이며 200레벨 보상은 200레벨 고정입니다. 기존 장비도 1·10·20…200레벨로 보정하며 강화·잠재·잠금은 유지합니다. 오프라인 최대 6시간 동안 실제 처치 수에 동일 확률로 추첨하며, 가방 초과 장비는 품질별로 보관합니다.</p><h3>신규 장비 기본 수치</h3><p class="note">각 개별 장비에는 고유 이름과 수치 범위가 있습니다. 등급·품질 대신 장비 종류에 따라 정해진 범위에서 공격력·주스탯·HP·방어력을 각각 추첨합니다. 범위 하위 50% 구간 75%, 다음 40% 구간 24%, 최상위 10% 구간 1%로 추첨한 뒤 정수로 확정합니다. 범위가 좁으면 반올림으로 구간의 수치가 겹칠 수 있습니다. 보스 장비는 더 높은 별도 범위를 사용합니다.</p><h3>기존 장비 품질 재감정</h3><table><tr><th>품질</th><th>확률</th></tr>${D.QUALITY_BANDS.map(b=>`<tr><td>${b.min}~${b.max}%</td><td>${pct(b.chance)}</td></tr>`).join('')}</table></div>`;
}
function disabledBtn(label,action,arg,blocked=false,cls="") {
  const html=btn(label,action,arg,cls,true);
  return blocked ? html.replace("<button ","<button disabled data-unavailable ") : html;
}
function combatSkillButtons(party=false) {
 const me=party?partyRoom?.members.find(m=>m.mine):null;
 return [1,2].map(slot=>{const sk=slot===1?D.CLASS_SKILLS[state.classId]:D.SECOND_SKILLS[state.classId],locked=slot===2&&!state.advancement;
 return '<button class="gold skill-button" data-action="'+(party?'partySkill':'skill')+'" data-arg="'+slot+'" data-skill-slot="'+slot+'" '+(locked||me?.hp<=0?'disabled':'')+' title="'+esc(sk.description)+'">'+(locked?'2차 전직 후 · ':slot+'차 · ')+sk.name+'</button>';}).join('');
}
function skillGuide(){return '<div class="skill-guide">'+[1,2].map(slot=>{const sk=slot===1?D.CLASS_SKILLS[state.classId]:D.SECOND_SKILLS[state.classId];return '<p><b>'+slot+'차 · '+sk.name+'</b> · 쿨타임 '+sk.cooldown+'초<br><small>'+sk.description+(slot===2&&!state.advancement?' · 60레벨 전직 후 해금':'')+'</small></p>';}).join('')+'</div>';}
function recentLoot(){return '<section class="panel pad recent-loot"><h3>최근 사냥 획득 · 최신 5개</h3><p class="note">아이템 획득 시 갱신 · 같은 정산의 재료는 수량 합산</p>'+((state.recentLoot||[]).map(x=>'<div class="loot-row">'+(x.kind==='gear'?gearMarkup(x.item):'<span class="loot-icon">◆</span>')+'<span>'+(x.kind==='gear'?esc(D.gearName(x.item)):esc(D.MATERIALS[x.key]))+' <b>×'+x.quantity+'</b><small>'+new Date(x.at).toLocaleTimeString('ko-KR')+' · '+esc(D.STAGES[x.stage]?.name||'사냥')+'</small></span></div>').join('')||'<p class="note">아직 획득한 아이템이 없습니다.</p>')+'</section>';}

function bosses() {
  const menu=`<div class="subnav">${[["daily","일일"],["weekly","주간"],["party","협동"],["dungeon","던전·탐사"],["tower","탑 · 10층"]].map(([k,l])=>btn(l,"bossSub",k,bossTab===k?"active":"")).join("")}</div>`;
  if(bossTab==="tower")return menu+towerLobby(state);
  if(bossTab==="party")return header("협동 토벌","1–4인 입장 · 4인 기준 난이도")+menu+partyLobby();
  if(bossTab==="dungeon")return header("던전과 탐사","DAILY ADVENTURE")+menu+dungeonCards();
  return header("보스 토벌","BOSS CHALLENGE")+menu+`<p class="note compact-note">보스별 ${bossTab==="daily"?"하루":"주"} 1회 보상 · 실패는 재도전 무제한 · 연습 무제한<br>${bossTab==="daily"?"매일":"매주 월요일"} 00:00 초기화 (한국시간)</p><div class="boss-list">${D.BOSSES.filter(b=>b.weekly===(bossTab==="weekly")).map(b=>bossCard(b)).join("")}</div>`;
}
function bossCard(b) {
  const claimed=state.bossClaims[b.id]===(b.weekly?D.weekKey(Date.now()):D.dayKey(Date.now()));
  const locked=b.weekly&&b.id>0&&!state.cleared.includes(b.id-1);
  return `<section class="panel boss-card"><div class="boss-thumb" style="background-image:url('${D.REGIONS[b.region].background}')">${bossMarkup(b)}</div><div class="boss-card-body"><div class="row spread"><strong>${b.name}</strong><span class="count-badge ${claimed?"used":""}">${b.weekly?"이번 주":"오늘"} 남은 ${claimed?0:1}/1</span></div><small>권장 Lv.${b.level} · 레벨 제한 없음 · HP ${fmt(b.hp)} · ${b.seconds/60}분</small><div class="actions">${disabledBtn(claimed?"보상 완료":locked?"입장 조건":"보상 도전","bossStart",b.id,claimed||locked,"gold")}${disabledBtn("연습 ∞","bossPractice",b.id,locked)}</div><details><summary>입장 조건 · 보상</summary><p class="note">${b.weekly&&b.id?D.BOSSES[b.id-1].name+" 처치":"선행 보스 없음"}<br>${gearLevelRange(b.gearLevel)} 보스 장비 ${pct(b.dropChance)} · 재료 ${b.material}<br>${fmt(b.gold)} G · 일반 큐브 ${b.cubes}${b.weekly?" · 상급 큐브 2 · 확장석 20%":""}<br>권장: ${b.recommended.slots}부위 ${b.recommended.stars}성 ${b.recommended.boss?"보스":"일반"} 장비${b.recommended.pot?" · 일반 주스탯 잠재 합계 18%":""}<br>실패 횟수 제한 없음 · 성공 보상 후에는 연습 가능</p></details></div></section>`;
}
function dungeonCards() {
  return `<p class="note compact-note">던전별 하루 1회 클리어 보상 · 실패 시 무제한 재도전 · 매일 00:00 초기화</p><div class="dungeon-cards">${["cube","material","relic"].map(kind=>{
    const d=D.DUNGEONS[kind],claimed=state.dungeonClaims[kind]===D.dayKey(Date.now()),locked=kind==="relic"?state.level<200||!state.cleared.includes(29):state.level<20;
    return `<section class="panel dungeon-card ${kind==="relic"?"relic-card":""}"><div class="row spread"><strong>${kind==="relic"?"여명의 폐허":kind==="cube"?"큐브 수련":"재료 수련"}</strong><span class="count-badge">남은 ${claimed?0:1}/1</span></div><small>${requiredLevel(kind==="relic"?200:20)}${kind==="relic"?" · 멸신왕 처치 후":""} · 전투 제한 ${d.seconds}초</small><p>${kind==="relic"?d.reward.replace("200레벨",requiredLevel(200,"200레벨")):d.reward}</p>${disabledBtn(claimed?"오늘 완료":locked?"아직 미해금":"도전","dungeon",kind,claimed||locked,"gold")}</section>`;
  }).join("")}</div>`;
}
function partyBossPreview(b) {
 const claim=state.raidClaims?.[b.id],used=claim?.day===D.dayKey(Date.now())?claim.count:0;
 return `<div class="party-preview"><div class="party-face">${bossMarkup(b)}</div><div><strong>${b.name}</strong><p>레벨 제한 없음 · 1~4인 입장<br>전투 제한 ${b.seconds}초 · HP ${fmt(b.hp)}</p><span class="count-badge">오늘 남은 ${Math.max(0,2-used)}/2</span></div></div><p class="note">${b.recommended}<br>인원이 적어도 HP·공격력 동일</p><p class="note">개인 보상: ${fmt(b.gold)} G · 파편 ${b.fragment} · 일반 큐브 ${b.cube}<br>${gearLevelRange(b.gearLevel)} 보스 장비 ${pct(b.dropChance)}${b.highCubeChance?' · 상급 큐브 '+pct(b.highCubeChance):''}</p>`;
}
function partyLobby() {
 const chosen=D.raidBoss(partyBossId)||D.RAID_BOSSES[0];partyBossId=chosen.id;
 return `<p class="note compact-note">주간 보스와 별도 콘텐츠 · 보스별 하루 2회 클리어 보상<br>한국시간 매일 00:00 초기화 · 실패·연습 횟수 차감 없음<br>1~4인 입장 · 4인 기준 고정 난이도 · 동료 생존 시 1회 HP 30% 부활</p><div class="panel pad"><div id="party-boss-preview">${partyBossPreview(chosen)}</div><div class="row"><select id="party-boss">${D.RAID_BOSSES.map(b=>`<option value="${b.id}" ${b.id===partyBossId?'selected':''}>${b.name}</option>`).join('')}</select>${btn('파티 만들기','partyCreate','','gold',true)}</div><label class="practice-check"><input id="party-practice" type="checkbox" ${partyPractice?'checked':''}>연습 파티 (보상 없음)</label></div><div class="row spread"><h3>모집 중인 파티</h3>${btn('새로고침','partyRefresh')}</div><div class="stack">${partyRooms.filter(r=>D.raidBoss(r.bossId)).map(r=>`<section class="panel pad row spread"><div class="room-boss-face">${bossMarkup(D.raidBoss(r.bossId))}</div><div class="room-boss-info"><strong>${esc(r.name)}</strong><br><small>레벨 제한 없음 · ${r.count}/4명 · ${r.practice?'연습':'보상 도전'}</small></div>${disabledBtn('참가','partyJoin',r.id,Number(r.count)>=4)}</section>`).join('')||'<div class="empty">모집 중인 파티가 없습니다. 혼자 출발할 수도 있어요.</div>'}</div>`;
}
function partyPanel() {
 if(!partyRoom)return header('협동 토벌')+'<div class="panel pad">파티 정보를 불러오는 중…</div>';
 const r=partyRoom,b=D.raidBoss(r.bossId)||D.BOSSES[r.bossId],me=r.members.find(m=>m.mine),total=r.members.reduce((n,m)=>n+Number(m.damage),0),fighting=r.status==='fighting';
 return `${header(b.name,'CO-OP RAID · '+(r.practice?'연습':'보상 도전'))}<section class="panel"><div class="arena party-arena" data-class="${state.classId}" style="background-image:url('ui/dawn-ruins.svg')"><div class="battle-head"><small>전투 제한 ${b.seconds}초 · <b id="battle-timer">${fighting?'남은 '+Math.max(0,r.seconds-r.tick)+'초':'파티원 모집 중'}</b></small><h3>${b.name}</h3>${fighting?`<div class="hp"><i style="width:${r.hp/r.maxHp*100}%"></i></div><small>${fmt(r.hp)} / ${fmt(r.maxHp)}</small>`:''}</div><div class="monster">${bossMarkup(b)}</div><div class="combat-status"><span class="pill">${fighting?b.pattern:'1명부터 출발 가능 · 4인 기준 난이도'}</span></div></div><div class="pad"><div class="party-members">${r.members.map(m=>`<div class="party-member ${m.hp<=0?'fallen':''}"><div class="row spread"><strong>${esc(m.name)}${m.mine?' · 나':''}</strong><small>${m.departed?'이탈':m.hp<=0?'쓰러짐':D.CLASSES.find(c=>c.id===m.classId)?.name}</small></div><div class="hp"><i style="width:${Math.max(0,m.hp/m.maxHp*100)}%"></i></div><small>${fmt(m.hp)}/${fmt(m.maxHp)} · 기여 ${total?(Number(m.damage)/total*100).toFixed(1):'0.0'}%</small></div>`).join('')}</div><div class="actions">${fighting?(me?.hp<=0?disabledBtn(me.revived?'부활 사용 완료':'부활 · HP 30%','partyRevive','',me.revived,'gold'):combatSkillButtons(true)):r.isHost?btn('출발 · '+r.members.filter(m=>!m.departed).length+'명','partyStart','','gold'):''}${btn('파티 나가기','partyLeaveConfirm','','danger')}</div>${skillGuide()}<p class="note">전투 중 일반 사냥 중지 · 종료 후 자동사냥 재개</p></div></section>`;
}
function exchangeShop(){return '<section class="panel pad"><h3>파편 교환소</h3><p class="note">사냥 파편으로 강화 소모품을 마련하세요. 교환 후 보유 수량에 즉시 추가됩니다.</p>'+Object.entries(D.SUPPLY_EXCHANGE).map(([key,cost])=>'<div class="exchange-row"><strong>'+D.MATERIALS[key]+'</strong><small>1개당 파편 '+cost.fragment+' + '+fmt(cost.gold)+' G</small><div class="actions">'+[1,5,10].map(count=>disabledBtn(count+'개 교환','supplyExchange',key+':'+count,state.materials.fragment<cost.fragment*count||state.gold<cost.gold*count||!!state.battle||!!state.partyRoom)).join('')+'</div></div>').join('')+'</section>';}
function supplies(kind) {
  const keys=kind==="consumables"?["cube","highCube","scroll","expand"]:["fragment"];
  return exchangeShop()+`<div class="supply-grid">${keys.map(k=>`<section class="panel pad"><strong>${D.MATERIALS[k]}</strong><b>${fmt(state.materials[k])}개</b><small>${{cube:"잠재 옵션 재설정",highCube:"기존/새 옵션 선택",scroll:"잠재 능력 개방",expand:"잠재 줄 추가",fragment:"장비·주문서 제작"}[k]}</small>${kind==="consumables"?btn("장비 선택","gearSub","bag"):btn("제작소","gearSub","craft")}</section>`).join("")}${kind==="materials"?D.REGIONS.map(r=>`<section class="panel pad">${materialMarkup(r.id)}<strong>${bossMaterialNames[r.id]}</strong><b>${state.bossMaterials[r.id]||0}개</b><small>${r.name} 보스 드롭 · 장비 제작</small>${btn("제작 장비 보기","gearSub","craft")}</section>`).join(""):""}</div>`;
}
async function loadRankings() {
  if (rankingLoading) return;
  const requestId=++rankingRequest;
  rankingLoading=true;rankingError="";render();
  try {
    await ensureToken();
    const rows=await request("/rest/v1/rpc/rebirth_rankings",{});
    if(requestId!==rankingRequest)return;
    rankingRows=rows;rankingUpdated=Date.now();
  } catch(err) { rankingError=message(err); }
  finally { if(requestId===rankingRequest){rankingLoading=false;if(view==="ranking")render();} }
}
function rankings() {
  const combat=rankingMode==="combat",rankKey=combat?"combatRank":"levelRank",label=combat?"전투력":"레벨";
  const rows=rankingRows.filter(r=>r[rankKey]<=100).sort((a,b)=>a[rankKey]-b[rankKey]),me=rankingRows.find(r=>r.isMe);
  const className=r=>r.advancement?D.ADVANCEMENTS[r.classId]:D.CLASSES.find(c=>c.id===r.classId)?.name||"모험가";
  const score=r=>combat?fmt(r.combatPower):"Lv. "+r.level;
  const portrait=r=>`<div class="rank-portrait portrait" style="background-position:${Math.max(0,D.CLASSES.findIndex(c=>c.id===r.classId))*25}% 0" aria-hidden="true"></div>`;
  const podium=rows.slice(0,3).map(r=>`<article class="rank-podium rank-place-${r[rankKey]} ${r.isMe?"is-me":""}"><span class="podium-place">${r[rankKey]===1?"♛":"◆"} ${r[rankKey]}위</span>${portrait(r)}<strong title="${esc(r.name)}">${esc(r.name)}</strong><small>${className(r)}${r.isMe?" · 나":""}</small><b>${score(r)}</b><span class="podium-secondary">${combat?"Lv. "+r.level:"전투력 "+fmt(r.combatPower)}</span></article>`).join("");
  return header("모험가 랭킹","HALL OF ADVENTURERS")+`<section class="ranking-view"><div class="ranking-toolbar">${btn("← 캐릭터","back")}${btn(rankingLoading?"불러오는 중…":"↻ 새로고침","rankingRefresh","",rankingLoading?"rank-refresh loading":"rank-refresh")}</div><div class="ranking-tabs" role="group" aria-label="랭킹 기준">${[ ["level","레벨 순위","모험의 깊이"],["combat","전투력 순위","성장의 힘"] ].map(([key,name,desc])=>`<button data-action="rankingMode" data-arg="${key}" aria-pressed="${rankingMode===key}" class="${rankingMode===key?"active":""}"><strong>${name}</strong><small>${desc}</small></button>`).join("")}</div><div class="ranking-meta"><span>전체 ${fmt(rankingRows[0]?.total||0)}명 · TOP 100</span><span>${rankingUpdated?new Date(rankingUpdated).toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit"})+" 조회":"서버 기록 기준"}</span></div>${rankingError?`<div class="panel pad rank-error" role="alert">순위를 불러오지 못했습니다. ${esc(rankingError)}${btn("다시 시도","rankingRefresh")}</div>`:""}${rankingLoading&&!rankingRows.length?'<div class="panel pad rank-empty" role="status">모험가들의 기록을 모으고 있어요…</div>':rows.length?`<div class="rank-podium-grid">${podium}</div>`:!rankingError?'<div class="panel pad rank-empty">아직 등록된 모험가가 없습니다.</div>':""}<section class="rank-my-card"><span class="rank-my-label">MY RANK</span><div><strong>${me?me[rankKey]+"위":"집계 대기"}</strong><span>${esc(state.name)}<small>${label} ${me?score(me):"—"}</small></span></div><p>${me?`레벨 ${me.levelRank}위 · 전투력 ${me.combatRank}위`:"캐릭터 기록이 저장되면 순위에 표시됩니다."}</p></section>${rows.length?`<section class="rank-list"><div class="rank-list-head"><span>순위 · 모험가</span><span>${label}</span></div>${rows.map(r=>`<div class="rank-list-row ${r.isMe?"is-me":""}"><span class="rank-number ${r[rankKey]<=3?"medal":""}">${r[rankKey]}</span>${portrait(r)}<div class="rank-person"><strong>${esc(r.name)}${r.isMe?'<i>나</i>':""}</strong><small>${className(r)} · ${combat?"Lv. "+r.level:"전투력 "+fmt(r.combatPower)}</small></div><b class="rank-score">${score(r)}</b></div>`).join("")}</section>`:""}<details class="rank-rules"><summary>순위 집계 기준</summary><p>레벨 순위: 레벨 → 현재 경험치 순.<br>전투력 순위: 전투력 → 레벨 → 현재 경험치 순.<br>모두 같으면 고정된 계정 순서로 표시합니다.</p><p>마지막 서버 저장 기록을 기준으로 조회합니다. 전투력은 캐릭터 창과 같은 계산식을 사용하며, 일시적인 스킬 효과와 골드·경험치 획득 보너스는 제외합니다.</p></details></section>`;
}
function journal() {
  const goals=[["첫 토벌",state.cleared.length,1,"보스 첫 처치"],["장비 수집가",state.collection.length,50,"서로 다른 장비 50종 발견"],["직업의 길",state.advancement?1:0,1,requiredLevel(60)+" · 광산왕 크로투스 처치 후 전직"],["숙련 모험가",state.level,100,requiredLevel(100,"100레벨 달성")],["왕좌를 넘어",state.cleared.length,30,"멸신왕 벨제리온 처치"],["새벽의 탐험가",state.dungeonClaims.relic?1:0,1,"여명의 폐허 클리어"]];
  return header("모험 수첩","나의 성장 기록")+btn("돌아가기","back")+`<div class="journal-banner"><h2>다음 이야기는<br>네 모험으로 채워져.</h2></div><div class="goal-grid">${goals.map(([name,value,max,desc])=>`<section class="panel pad"><div class="row spread"><strong>${name}</strong><span class="pill">${value>=max?"달성":Math.min(value,max)+"/"+max}</span></div><p class="note">${desc}</p><div class="exp"><i style="width:${Math.min(100,value/max*100)}%"></i></div></section>`).join("")}</div>`;
}
function marketTile(l) {
  const it=l.item,consumable=it.kind==="consumable";
  const name=consumable?D.MATERIALS[it.key]:D.gearName(it);
  return `<button class="market-compact-card" data-action="marketConfirm" data-arg="${l.id}" aria-label="${esc(name)} 상세 보기"><span class="market-card-meta">${consumable?"소모품":requiredLevel(it.level)}<b>${consumable?fmt(it.quantity)+"개":it.stars+"★"}</b></span>${consumable?'<span class="consumable-market-icon">◆</span>':gearMarkup(it)}<strong class="market-card-name">${esc(name)}</strong><small>${consumable?"남은 "+fmt(it.quantity)+"개":D.CLASSES.find(c=>c.id===it.classId).name+" · "+gearRollLabel(it)}</small><b class="market-card-price">${fmt(l.price)} G${consumable?" / 개":""}</b><span class="market-card-status">${l.status==="open"?(l.own?"판매 중 · 상세":"상세 보기"):l.status==="sold"?"판매 완료":"회수 완료"}</span></button>`;
}
function gearRollDetails(it){if(!it.baseStats)return "";const ranges=D.gearStatRanges(it);return `<section class="panel pad"><h4>획득 시 확정된 기본 수치</h4>${Object.entries({attack:"공격력",stat:"주스탯",hp:"HP",defense:"방어력"}).map(([key,label])=>`<p>${label} <strong>${fmt(it.baseStats[key])}</strong> <small>(가능 범위 ${fmt(ranges[key].min)}~${fmt(ranges[key].max)})</small></p>`).join("")}<p class="note">강화 전 수치입니다. 각 능력치는 따로 추첨되며 높은 구간일수록 희귀합니다. 큐브·품질 재감정으로 기본 수치는 바뀌지 않습니다.</p></section>`;}
function gearStatsMarkup(it) {
  const a=D.gearAttributes(it),cl=D.CLASSES.find(c=>c.id===it.classId);
  return `<div class="market-picked-stats gear-base-stats">${[["공격력",a.attack.toFixed(1)],[cl.stat,fmt(a.stat)],["최대 HP",fmt(a.hp)],["방어력",fmt(a.defense)]].map(([k,v])=>`<div><span>${k}</span><b>+${v}</b></div>`).join("")}</div><p class="note">장비 자체 능력치입니다. 기본 수치·스타포스 반영, 잠재는 아래 별도 표시.${it.broken?" 파괴된 장비는 장착 효과가 없습니다.":""}</p>`;
}
function marketGearDetails(it) {
  return `<div class="item">${itemMarkup(it)}</div>${gearStatsMarkup(it)}${gearRollDetails(it)}<div class="market-picked-options"><h4>잠재능력</h4>${it.lines.length?it.lines.map(l=>`<div class="grade-color-${l.grade}"><small>${D.RARITIES[l.grade]}</small><span>${D.OPTIONS[l.key]}</span><b>+${l.value}${D.optionUnit(l.key)}</b></div>`).join(""):'<p class="note">잠재 미개방</p>'}</div>`;
}
function market() {
  return `${header("거래소", "MARKET")}<div class="subnav">${btn("구매", "marketMode", "buy", !mine ? "active" : "")}${btn("내 판매", "marketMode", "mine", mine ? "active" : "")}${btn("장비 등록", "marketSell")}${btn("소모품 등록", "marketSellConsumables")}</div><div class="subnav">${[["all","전체"],["gear","장비"],["consumable","소모품"]].map(([key,label])=>btn(label,"marketKind",key,marketKind===key?"active":"")).join("")}</div><p class="note">구매·등록 ${requiredLevel(20)}부터 · 판매 수수료 5% · 등록 7일 · 최대 20건<br>만료 상품은 내 판매에서 남은 수량을 회수할 수 있습니다.</p><div class="filters" ${marketKind==="consumable"?'style="display:none"':""}><select data-filter="slot"><option value="">모든 부위</option>${D.SLOTS.map((v, i) => `<option value="${i}" ${String(i) === filterSlot ? "selected" : ""}>${v}</option>`).join("")}</select><select data-filter="class"><option value="">모든 직업</option>${D.CLASSES.map((c) => `<option value="${c.id}" ${c.id === filterClass ? "selected" : ""}>${c.name}</option>`).join("")}</select></div><div class="market-compact-grid">${
    marketRows
      .slice(0, 20)
      .map(marketTile)
      .join("") ||
    '<div class="empty">등록된 상품이 없습니다. 장비와 소모품을 판매할 수 있어요.</div>'
  }</div><div class="actions">${marketPage ? btn("이전", "page", marketPage - 1) : ""}${marketRows.length > 20 ? btn("다음", "page", marketPage + 1) : ""}${btn("새로고침", "marketRefresh")}</div>`;
}
async function marketLoad() {
  const version = ++marketRequest;
  await ensureToken();
  const rows = await request("/rest/v1/rpc/rebirth_market", {
    p_action: "list",
    p_args: { page: marketPage, mine, kind:marketKind, slot: filterSlot, classId: filterClass },
    p_request: crypto.randomUUID(),
  });
  if(version !== marketRequest || tab !== "market") return;
  marketRows = rows.filter(row=>row.status!=="cancelled").map(row => ({...row, item: row.item.kind==="consumable"?row.item:D.normalizePotentialItem(row.item)}));
  render();
}
function open(title, html, closable = true) {
  modal.classList.remove("enhance-dialog", "market-picker-dialog", "attendance-dialog", "change-class-dialog");
  modal.innerHTML = `${closable ? btn("닫기", "close", "", "close") : ""}<h2 id="dialog-title">${title}</h2>${html}`;
  modal.setAttribute("aria-labelledby", "dialog-title");
  modal.scrollTop = 0;
  if (!modal.open) {
    history.pushState({ modal: true }, "");
    modal.showModal();
  }
  modal.dataset.closable = String(closable);
  refreshLevelRequirements();
}
let cubeKind="cube", lastStarResult=null, lastCubeResult=null;
const enhanceIcon=(key)=>`<img class="enhance-currency" src="currencies/${key}.svg" alt="">`;
function enhancementBlock(it) {
  return it.broken?"파괴된 장비를 먼저 복구해 주세요.":it.locked?"장비 잠금을 해제해 주세요.":state.battle||state.partyRoom?"보스전 종료 후 이용할 수 있어요.":"";
}
function enhancementOptions(item,label="현재 잠재능력") {
  return `<section class="option-panel rarity-0"><div class="option-heading"><span>${label}</span><b>${item.lines.length?"줄별 독립 등급":"미개방"}</b></div><div class="option-lines">${Array.from({length:3},(_,i)=>{const l=item.lines[i];return `<div class="option-line ${l?"grade-color-"+l.grade:"empty-line"}"><span class="line-index">0${i+1}</span><span>${l?`<small class="line-grade">${D.RARITIES[l.grade]}</small>${D.OPTIONS[l.key]}`:"잠재 슬롯 미개방"}</span><strong>${l?"+"+l.value+D.optionUnit(l.key):"—"}</strong></div>`;}).join("")}</div></section>`;
}
function enhancementWallet(cost,key=null,count=1) {
  return `<div class="enhance-wallet">${key?`<div><span>${enhanceIcon(key)}${D.MATERIALS[key]}</span><strong class="${state.materials[key]<count?"short":""}">${fmt(state.materials[key])}<small> / ${count}개 필요</small></strong></div>`:""}<div><span>${enhanceIcon("gold")}필요 골드</span><strong class="${state.gold<cost?"short":""}">${fmt(cost)}<small> G</small></strong></div><div class="wallet-owned"><span>보유 골드</span><span>${fmt(state.gold)} G</span></div></div>`;
}
function starPanel(it) {
  if(it.broken){const materials=state.items.filter(x=>x.id!==it.id&&!x.broken&&!x.locked&&!Object.values(state.equipped).includes(x.id)&&D.equipmentKey(x)===D.equipmentKey(it));return `<div class="enhance-empty">${gearMarkup(it,"big-item")}<h3>장비의 흔적이 남았어요</h3><p>같은 20레벨 구간·직업·종류의 장비 1개로 12성 복구합니다.<br>잠재능력은 유지됩니다.</p></div><label class="enhance-field" for="restore-material">복구에 사용할 장비</label><select id="restore-material">${materials.length?materials.map(x=>`<option value="${x.id}">${esc(D.gearName(x))} · ${x.stars}성</option>`).join(""):'<option value="">사용 가능한 장비가 없습니다</option>'}</select>${disabledBtn("12성으로 복구","restore",it.id,!materials.length||it.locked||!!state.battle,"enhance-primary")}`;}
  const max=it.stars>=25,o=D.starOdds(it.stars),cost=D.starCost(it),blocked=enhancementBlock(it)||(max?"최고 단계에 도달했습니다.":state.gold<cost?"골드가 부족합니다.":""),target=Math.min(25,it.stars+1);
  const current=D.gearAttributes(it),next=D.gearAttributes(it,target),cl=D.CLASSES.find(c=>c.id===it.classId);
  const result=lastStarResult?.id===it.id?lastStarResult:null;
  return `<div class="enhance-intro"><span>STAR FORCE</span><small>성공할 때마다 공격력·주스탯 상승 · 방어구 5부위는 HP도 상승</small></div>${result?`<div class="enhance-result ${result.outcome}" role="status"><strong>${{success:"강화 성공!",keep:"강화 실패 · 별 유지",down:"강화 실패 · 별 하락"}[result.outcome]||"장비 파괴"}</strong><span>${result.before}성 → ${result.after}성${result.gains?` · 장비 공격력 +${result.gains.attack.toFixed(1)} · ${cl.stat} +${result.gains.stat}${result.gains.hp?` · HP +${result.gains.hp}`:""}`:" · 골드 "+fmt(result.cost)+" 소모"}</span></div>`:""}<div class="star-track" role="img" aria-label="최대 25성 중 ${it.stars}성">${Array.from({length:5},(_,g)=>`<span>${Array.from({length:5},(_,i)=>`<i class="${g*5+i<it.stars?"lit":g*5+i===it.stars&&!max?"next":""}">★</i>`).join("")}</span>`).join("")}</div><div class="enhance-stage"><div class="enhance-item-display">${gearMarkup(it,"big-item")}</div><div class="star-transition"><span>${max?"강화 완료":"다음 강화 단계"}</span><div><b>${it.stars}<small>성</small></b>${max?'<em>MAX</em>':`<span class="transition-arrow">→</span><b class="target">${target}<small>성</small></b>`}</div></div></div><p class="note">${Object.values(state.equipped).includes(it.id)?"장착 중 · 강화 수치가 캐릭터에 바로 반영됩니다.":"미장착 · 장비는 강해지지만 캐릭터 수치는 장착 후 반영됩니다."}</p>${max?'':`<div class="enhance-gains"><div><span>기본 공격</span><b>${current.attack.toFixed(1)} <i>→</i> <em>${next.attack.toFixed(1)}</em></b></div><div><span>${cl.stat}</span><b>${current.stat} <i>→</i> <em>${next.stat}</em></b></div>${next.hp>current.hp?`<div><span>최대 HP</span><b>${current.hp} <i>→</i> <em>${next.hp}</em></b></div>`:""}</div><section class="enhance-probabilities"><div class="probability-title"><span>성공 확률</span><strong>${pct(o.success)}</strong></div><div class="probability-bar" aria-hidden="true">${[["success",o.success],["keep",o.keep],["down",o.down],["destroy",o.destroy]].map(([k,v])=>`<i class="${k}" style="width:${v*100}%"></i>`).join("")}</div><div class="probability-details">${[["유지",o.keep,"keep"],["하락",o.down,"down"],["파괴",o.destroy,"destroy"]].map(([name,v,k])=>`<div class="${k}"><span>${name}</span><b>${v===0?"0%":pct(v)}</b></div>`).join("")}</div></section>${enhancementWallet(cost)}`}${disabledBtn(max?"최대 25성 달성":`${target}성 강화하기`,"star",it.id,!!blocked,"enhance-primary")}<p class="enhance-help ${blocked&&!max?"short":""}">${blocked|| (o.destroy>0?"실패 시 장비가 파괴될 수 있습니다. 흔적과 잠재는 보존됩니다.":o.down>0?"실패 시 별이 1개 내려갈 수 있습니다. 파괴 위험은 없습니다.":"실패해도 현재 별이 유지됩니다. 파괴 위험은 없습니다.")}</p>`;
}
let lastQualityResult=null;
function qualityPanel(it){if(it.baseStats)return gearRollDetails(it);const q=D.itemQuality(it),a=D.gearAttributes(it),c=D.QUALITY_COST,result=lastQualityResult?.id===it.id?lastQualityResult:null,blocked=enhancementBlock(it)||(q===100?'최고 품질입니다.':state.materials.fragment<c.fragment||state.gold<c.gold?'재감정 재료가 부족합니다.':'');return `<div class="quality-panel"><h3>품질 ${q}% <small>기본 성능 ${Math.round(D.qualityMultiplier(it)*100)}%</small></h3><div class="exp"><i style="width:${q}%"></i></div><p class="note">기존 품질보다 높게 나올 때만 적용됩니다. 별·잠재는 유지됩니다.<br>품질은 기본 공격력·주스탯에 적용됩니다. 50%는 기준 성능, 100%는 기준 대비 +10%입니다.</p>${result?`<p class="quality-result" role="status">추첨 ${result.rolled}% · ${result.before}% → ${result.after}% · ${result.after>result.before?'품질 상승':'기존 품질 유지'}</p>`:''}<div class="enhance-gains"><div><span>현재 장비 공격력</span><b>${a.attack.toFixed(1)}</b></div><div><span>현재 주스탯</span><b>${a.stat}</b></div></div><p class="note">1회 파편 ${c.fragment}개 + ${fmt(c.gold)} G<br>보유 파편 ${fmt(state.materials.fragment)}개 · ${fmt(state.gold)} G</p>${disabledBtn('품질 재감정','qualityReroll',it.id,!!blocked,'enhance-primary')}<p class="note">${blocked||'결과가 유지되어도 재료는 소모됩니다.'}</p><table><tr><th>품질</th><th>확률</th></tr>${D.QUALITY_BANDS.map(b=>`<tr><td>${b.min===b.max?b.min:b.min+'~'+b.max}%</td><td>${pct(b.chance)}</td></tr>`).join('')}</table></div>`;}
function cubePanel(it) {
  const opened=it.lines.length>0,high=cubeKind==="highCube",cost=opened?(high?1000:300):500,key=opened?cubeKind:"scroll",blocked=enhancementBlock(it)||(state.materials[key]<1?`${D.MATERIALS[key]}가 부족합니다.`:state.gold<cost?"골드가 부족합니다.":"");
  const expandCost=it.lines.length===1?1:3;
  return `<div class="enhance-intro"><span>POTENTIAL</span><small>나만의 장비 옵션을 완성하세요</small></div>${lastCubeResult?.id===it.id?`<div class="enhance-result success" role="status"><strong>${lastCubeResult.up?"잠재 등급 상승!":"잠재능력이 재설정됐어요"}</strong><span>현재 옵션을 확인하세요</span></div>`:""}${enhancementOptions(it)}${opened?`<div class="cube-picker" role="group" aria-label="사용할 큐브 선택">${[["cube","일반 큐브","기존 · 새 옵션 중 선택"],["highCube","상급 큐브","등급 상승 확률 2배"]].map(([k,label,desc])=>`<button data-action="cubeKind" data-arg="${k}" class="cube-card ${cubeKind===k?"selected":""}" aria-pressed="${cubeKind===k}">${enhanceIcon(k)}<span><strong>${label}</strong><small>${desc}</small><b>보유 ${fmt(state.materials[k])}개</b></span><i aria-hidden="true">${cubeKind===k?"✓":"○"}</i></button>`).join("")}</div><p class="cube-chance">${it.lines.map((l,i)=>`${i+1}줄 · ${l.grade===5?"레전더리 유지 100%":`${D.RARITIES[l.grade]} → ${D.RARITIES[l.grade+1]} <b>${pct((high?D.HIGH_CUBE_UP:D.CUBE_UP)[l.grade])}</b>`}`).join("<br>")}</p>`:'<p class="enhance-help">주문서를 사용하면 1~3줄의 잠재능력이 열립니다.</p>'}${enhancementWallet(cost,key)}${disabledBtn(opened?(high?"상급 큐브 사용하기":"일반 큐브 사용하기"):"잠재능력 개방하기",opened?cubeKind:"potential",it.id,!!blocked,"enhance-primary cube-primary")}<p class="enhance-help ${blocked?"short":""}">${blocked||(opened?(high?"결과를 확인하고 원하는 옵션을 선택하세요.":"결과를 비교해 선택하세요. 오른 등급은 영구 유지됩니다."):"1줄 70% · 2줄 27% · 3줄 3%")}</p>${opened&&it.lines.length<3?`<details class="expand-options"><summary>잠재 슬롯 확장 <span>${it.lines.length}/3줄 개방</span></summary><p>${enhanceIcon("expand")}확장석 ${expandCost}개 + 2,000 G<br>보유 확장석 ${fmt(state.materials.expand)}개 · 기존 옵션 유지</p>${disabledBtn(`${it.lines.length+1}번째 슬롯 열기`,"expand",it.id,!!enhancementBlock(it)||state.materials.expand<expandCost||state.gold<2000,"enhance-secondary")}</details>`:""}`;
}

function itemDetail(id, section=id===selected?itemSection:"info") {
  if(selected!==id){lastStarResult=null;lastCubeResult=null;lastQualityResult=null;}
  selected=id;itemSection=section;
  const it=state.items.find(x=>x.id===id);if(!it)return;
  const p=power(state),next=power({...state,equipped:{...state.equipped,[it.slot]:it.id}}),equipped=Object.values(state.equipped).includes(id),o=D.starOdds(it.stars);
  const comparison=it.classId===state.classId&&it.level<=state.level&&!it.broken?`장착 시 공격력 ${fmt(next.attack)} (${next.attack-p.attack>=0?"+":""}${next.attack-p.attack}) · HP ${fmt(next.hp)}`:it.classId!==state.classId?`${D.CLASSES.find(c=>c.id===it.classId).name} 전용 장비입니다. 현재 직업으로는 착용할 수 없습니다. 장비 능력치는 직업에 관계없이 볼 수 있습니다.`:"착용 레벨과 장비 상태를 확인하세요.";
  let body="";
  if(section==="info")body=`${gearStatsMarkup(it)}${gearRollDetails(it)}<p class="note">${comparison}</p><p>${it.boss?"보스 장비":"일반 장비"} · ${it.bound?"거래 불가":it.locked?"잠금":"거래 가능"}</p><div class="actions">${btn(equipped?"장착 해제":"장착","equip",id,"gold",true)}${btn(it.locked?"잠금 해제":"잠금","lock",id,"",true)}${btn("분해","salvageConfirm",id,"danger")}</div><div class="potential">${it.lines.length?it.lines.map(l=>`<p class="grade-color-${l.grade}">[${D.RARITIES[l.grade]}] ${D.OPTIONS[l.key]} +${l.value}${D.optionUnit(l.key)}</p>`).join(""):"잠재 미개방"}</div>`;
  if(section==="star")body=starPanel(it);
  if(section==="potential")body=cubePanel(it);
  if(section==="quality")body=qualityPanel(it);
  open(section==="star"?"스타포스 강화":section==="potential"?"잠재능력 · 큐브":section==="quality"?"품질 재감정":"장비 정보",`<div class="enhance-content" data-currency-label><div class="enhance-item-head">${gearMarkup(it)}<div><strong>${esc(D.gearName(it))}</strong><small>${requiredLevel(it.level)} · ${D.CLASSES.find(c=>c.id===it.classId).name} · ${D.equipmentType(it)} · ${it.broken?"파괴된 흔적":it.stars+"성"} · ${gearRollLabel(it)}</small></div></div><div class="enhance-tabs">${[["info","장비 정보"],["star","스타포스"],["potential","잠재 · 큐브"],["quality",it.baseStats?"기본 수치":"품질"]].map(([k,l])=>btn(l,"itemMode",id+":"+k,section===k?"active":"")).join("")}</div>${body}</div>`);
  modal.classList.add("enhance-dialog");
}
function cubePowerComparison(it,pending) {
  const equipped=Object.values(state.equipped).includes(it.id);
  const canEquip=!it.broken&&it.classId===state.classId&&it.level<=state.level;
  const loadout=equipped||!canEquip?state.equipped:{...state.equipped,[it.slot]:it.id};
  const evaluate=lines=>power({...state,equipped:loadout,items:state.items.map(item=>item.id===it.id?{...item,lines}:item)}).combatPower;
  const before=evaluate(it.lines),after=evaluate(pending.lines),delta=after-before;
  const change=n=>`<strong class="cube-power-${n>0?"up":n<0?"down":"same"}">${n>0?"+":n<0?"−":""}${fmt(Math.abs(n))}</strong>`;
  const rows=it.lines.map((line,i)=>{
    const next=pending.lines[i];
    const single=evaluate(it.lines.map((old,j)=>i===j?next:old));
    return `<div class="cube-power-line"><span>${i+1}줄 · ${esc(D.OPTIONS[line.key])} +${line.value}${D.optionUnit(line.key)} → ${esc(D.OPTIONS[next.key])} +${next.value}${D.optionUnit(next.key)}</span>${change(single-before)}</div>`;
  }).join("");
  return `<section class="cube-power-summary" aria-label="큐브 전투력 비교"><p>${equipped?"내 전투력 비교":canEquip?"이 장비를 장착했을 때 전투력 비교":"현재 장착 불가 · 내 전투력 변화 없음"}</p><div class="cube-power-values"><div><small>기존 옵션 유지</small><b>${fmt(before)}</b></div><span>→</span><div><small>새 옵션 적용</small><b>${fmt(after)}</b></div></div><div class="cube-power-total">전체 변경 ${change(delta)}</div><details><summary>옵션별 전투력 변화</summary>${rows}<p class="note">각 줄만 바꿨을 때의 변화입니다. 옵션 간 영향과 반올림으로 합계는 전체 변경값과 다를 수 있습니다. 골드·경험치 옵션은 전투력에 반영되지 않습니다.</p></details>${!equipped&&canEquip?'<p class="note">현재 착용 중인 같은 부위 장비를 교체한 기준입니다. 큐브 선택만으로 자동 장착되지는 않습니다.</p>':""}</section>`;
}
function cubeChoice() {
  const p=state.pendingCube,it=state.items.find(i=>i.id===p.id);
  selected=p.id;itemSection="potential";cubeKind=p.high?"highCube":"cube";
  const repeatBlocked=state.materials[cubeKind]<1||state.gold<(p.high?1000:300);
  open((p.high?"상급":"일반")+" 큐브 · 결과 선택",`<div class="enhance-content" data-currency-label><div class="enhance-item-head">${gearMarkup(it)}<div><strong>${esc(D.gearName(it))}</strong><small>유지할 잠재능력을 선택하세요</small></div></div>${p.lines.some((l,i)=>l.grade>p.previousGrades[i])?`<div class="enhance-result success"><strong>${p.lines.map((l,i)=>l.grade>p.previousGrades[i]?`${i+1}줄 ${D.RARITIES[p.previousGrades[i]]} → ${D.RARITIES[l.grade]}`:"").filter(Boolean).join(" · ")}</strong><span>기존 옵션을 골라도 오른 등급은 유지됩니다.</span></div>`:""}${cubePowerComparison(it,p)}<div class="cube-comparison">${enhancementOptions(it,"기존 옵션") }${enhancementOptions(p,"새로운 옵션")}</div><p class="enhance-help">각 줄의 오른 등급은 유지됩니다. 선택은 옵션에만 적용되며 추가 비용은 없어요.</p><div class="enhance-choice-actions">${btn("기존 옵션 유지","cubeChoose","no","enhance-secondary",true)}${btn("새 옵션 적용","cubeChoose","yes","enhance-primary cube-primary",true)}</div><div class="enhance-choice-actions">${disabledBtn("기존 유지 후 다시 돌리기","cubeChooseRepeat","no",repeatBlocked,"enhance-secondary")}${disabledBtn("새 옵션 적용 후 다시 돌리기","cubeChooseRepeat","yes",repeatBlocked,"enhance-primary cube-primary")}</div><p class="enhance-help">다시 돌리기: ${p.high?"상급":"일반"} 큐브 1개 · ${p.high?"1,000":"300"} G / 보유 ${fmt(state.materials[cubeKind])}개</p></div>`,false);
  modal.classList.add("enhance-dialog");
}
function showEvents(events) {
  for (const e of events) {
    sounds.play(e.outcome || e.type);
    if (e.type === "attendance") {
      open(`${e.day}일차 출석 완료`, `<p class="attendance-claimed">${attendanceReward(e.reward)}</p><p class="note">보상이 가방과 재화에 지급됐어요.${e.day===7?" 내일부터 다시 1일차 보상을 받을 수 있어요.":""}</p><div class="actions">${btn("확인","close","","gold")}</div>`);
      modal.classList.add("attendance-dialog");
      continue;
    }
    if(e.type==="classChange") {rankingRows=[];rankingUpdated=0;toast(D.CLASSES.find(c=>c.id===e.to).name+"으로 직업을 변경했어요. 새 장비를 장착하고 사냥을 시작하세요.");}
    if(e.type==="autoEquip") {
      open("최적 장착 완료",`<div class="auto-equip-result"><span>${e.changed.length?e.changed.length+"개 부위 교체":"현재 장비 유지"}</span><div><b>${fmt(e.before)}</b><i>→</i><strong>${fmt(e.after)}</strong></div><p>전투력 +${fmt(e.after-e.before)}</p></div><p class="note">${e.changed.length?e.changed.map(slot=>D.SLOTS[slot]).join(" · ")+" 장비를 교체했습니다.":"이번 비교에서 더 높은 전투력 조합을 찾지 못해 현재 장비를 유지했습니다."}</p>`);
    }
    if(e.type==="exchange")toast(D.MATERIALS[e.key]+" "+e.count+"개 교환 완료");
    if(e.type==="salvage")open("장비 분해 완료",`<p>장비 ${e.count}개를 분해했습니다.</p><p class="salvage-reward"><strong>장비 파편 ${fmt(e.fragments)}개 획득</strong></p><p class="note">현재 보유 ${fmt(state.materials.fragment)}개</p>${btn("확인","close","","gold")}`);
    if(e.type==="quality"){lastQualityResult=e;itemDetail(e.id,"quality");}
    if(e.type==='tower'){tab='boss';bossTab='tower';view='game';render();towerReward(e);continue;}
    if (e.type === "combat") continue;
    if (e.type === "skill") {
      const arena = $(".arena");
      if (arena && !settings.low) {
        const flash = document.createElement("div");
        flash.className = "skill-burst " + state.classId;
        flash.textContent = (e.slot===2?D.SECOND_SKILLS:D.CLASS_SKILLS)[state.classId].name;
        arena.append(flash);
        setTimeout(()=>flash.remove(), 900);
      }
    }
    if (e.type === "star") {
      lastStarResult=e;
      itemDetail(e.id,"star");
    } else if(e.type === "advancement") {open("전직 완료",`<div class="advancement-reveal"><h2>${D.ADVANCEMENTS[state.classId]}</h2><p>공격력 +8% · 최대 HP +10%</p></div>`);
    } else if (["boss", "dungeon", "party", "offline"].includes(e.type)) {
      if (e.type !== "offline" || e.seconds >= 300) reward();
    } else if (e.type === "cube") {
      lastCubeResult=e;
      if (state.pendingCube) cubeChoice();
      else itemDetail(e.id);
    } else if (["craft", "potential", "restore"].includes(e.type)) {
      if(e.type==="restore")lastStarResult=null;
      if(e.type==="potential")lastCubeResult=null;
      itemDetail(e.id);
    }
  }
}
function towerReward(r){const f=TOWER_FLOORS[r.floor-1];open(r.won?`${r.floor}층 돌파!`:'탑 도전 종료',`<div class="tower-result"><div class="tower-portrait" style="background-image:url('tower/boss-${f.art}.webp')"></div><h3>${f.name}</h3><p>${r.won?'클리어 '+r.seconds.toFixed(1)+'초':r.reason==='timeout'?'제한 시간이 끝났습니다.':r.reason==='leave'?'도전을 종료했습니다.':'쓰러졌습니다. 다시 도전할 수 있어요.'}</p><p>${r.first?fmt(r.gold)+' G · 파편 '+r.fragment+'<br>큐브 '+r.cube+(r.highCube?' · 상급 큐브 '+r.highCube:''):r.won?'최초 클리어 보상을 이미 받았습니다.':'입장 횟수 제한 없이 재도전할 수 있습니다.'}</p><p class="note">일반 사냥이 다시 시작됐습니다.</p><div class="actions">${btn('확인','towerAck','','gold',true)}${r.won&&r.floor<10?btn('다음 층 도전','towerStart',r.floor+1,'',true):btn('다시 도전','towerStart',r.floor,'',true)}</div></div>`);}
function reward() {
  const r = state.lastReward;
  if(r?.type==='tower')return towerReward(r);
  const enemy = r && (r.type === "dungeon" ? D.DUNGEONS[r.dungeon] : r.type === "boss" ? D.BOSSES[r.bossId] : null);
  if (!r) return toast("새로 정산된 보상이 없습니다.");
  if(r.type==="party") {const b=D.raidBoss(r.bossId)||D.BOSSES[r.bossId],total=(r.members||[]).reduce((n,m)=>n+Number(m.damage),0);return open(r.won?"협동 토벌 완료":"협동전 종료",`${bossMarkup(b,"big-item")}<h3>${b.name}</h3><p>${r.practice?"연습 · 보상 없음":r.rewarded?(r.raid?fmt(r.gold)+" G · 파편 "+r.fragment+" · 큐브 "+r.cube+" · 상급 큐브 "+r.highCube:"지역 재료 "+r.materials+" · 큐브 3 · 상급 큐브 1")+" · 장비 "+r.items.length:"보상 횟수 차감 없음"}</p>${r.stored?'<p>장비는 보관함에 지급됐습니다.</p>':""}<div class="stack">${(r.members||[]).map(m=>`<div class="row spread"><span>${esc(m.name)}</span><b>기여 ${total?(m.damage/total*100).toFixed(1):"0.0"}%</b></div>`).join("")}</div><p class="note">자동사냥이 다시 시작됐습니다.</p>${btn("확인","ack","","gold",true)}`);}

  open(
    enemy ? (r.won ? "토벌 완료" : "도전 종료") : "사냥 보상",
    enemy
      ? `${bossMarkup(enemy,"big-item")}<h3>${enemy.name}</h3><p class="note">${r.practice ? "연습 도전 · 보상 없음" : r.won ? r.type === "dungeon" ? enemy.reward : "지역 재료 " + r.materials + "개 · 장비 " + r.items.length + "개 · "+fmt(r.gold||0)+" G · 큐브 "+(r.cube||0) : "보상 횟수는 차감되지 않았습니다."}</p><p class="note">자동사냥이 다시 시작됐습니다.</p><div class="actions">${btn("확인", "ack", "", "gold", true)}</div>`
      : `<p>정산 시간 ${fmt(r.seconds / 60)}분 · ${fmt(r.kills)}마리</p><div class="metrics" style="margin-top:12px"><div><small>경험치</small><b>${fmt(r.xp)}</b></div><div><small>골드</small><b>${fmt(r.gold)}</b></div><div><small>장비</small><b>${r.drops.length}개</b></div></div><p class="note">파편 ${r.fragment} · 큐브 ${r.cube} · 주문서 ${r.scroll}<br>${r.stored ? "가방 초과 장비 " + r.stored + "개는 장비 탭 보관함에 보관되었습니다." : ""}${r.defeats ? " 패배 " + r.defeats + "회 · 하위 사냥터에서 성장하세요." : ""}</p><div class="actions">${btn("보상 확인", "ack", "", "gold", true)}</div>`,
  );
}
function clearAccountView() {
  if(towerController){towerController.dispose();towerController=null;}document.body.classList.remove('tower-mode');
  state=null;partyRoom=null;partyRooms=[];rankingRows=[];rankingUpdated=0;rankingRequest++;rankingLoading=false;rankingError="";
  marketKind="all";marketRows=[];marketRequest++;marketPage=0;mine=false;selected=null;view="game";tab="hunt";sub="bag";
  chosenClass="warrior";characterName="";combatFrames.length=0;connectionLost=false;retryAt=0;retryFailures=0;
}
function authFailureMessage(err,register) {
  const code=err.code||err.message;
  if(code==="user_banned"||/user.*banned/i.test(err.message))return "이 계정은 서버에서 로그인 차단 상태입니다. 재가입으로 해결되지 않습니다. 관리자에게 아이디와 함께 차단 상태 확인을 요청해 주세요.";
  if(["user_already_exists","email_exists","USER_ALREADY_REGISTERED"].includes(code)||/already (registered|exists)/i.test(err.message))return "이미 사용 중인 계정 이름입니다. 기존 계정이면 ‘로그인’을, 새 계정이면 다른 이름을 입력해 주세요.";
  if(err.status===429||["over_request_rate_limit","over_email_send_rate_limit"].includes(code))return `잠시 가입·로그인 요청이 제한됐습니다. ${err.retryAfter?Math.ceil(err.retryAfter)+"초 후":"잠시 후"} 다시 시도해 주세요.`;
  if(code==="invalid_credentials"||/invalid login credentials/i.test(err.message))return "계정 이름 또는 비밀번호가 맞지 않습니다. 기존 계정은 ‘로그인’으로 접속해 주세요.";
  if(code==="weak_password"||/password.*(least|weak|short)/i.test(err.message))return "비밀번호가 가입 조건에 맞지 않습니다. 8자 이상으로 더 강한 비밀번호를 입력해 주세요.";
  if(["signup_disabled","email_provider_disabled"].includes(code))return "현재 서버에서 새 계정 가입을 받지 않고 있습니다.";
  if(code==="email_not_confirmed"||code==="AUTH_CONFIRMATION_REQUIRED")return "계정 확인이 완료되지 않아 접속할 수 없습니다. 관리자에게 가입 설정 확인을 요청해 주세요.";
  if(code==="email_address_invalid"||code==="validation_failed")return "계정 이름은 영문·숫자·밑줄 3~32자, 비밀번호는 8자 이상으로 입력해 주세요.";
  if(!err.status)return "서버에 연결하지 못했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.";
  return (register?"계정 생성":"로그인")+"에 실패했습니다. "+(err.code||err.message);
}
function login() {
  app.innerHTML = `<div class="login panel"><div class="brand">링구 RPG<br><small>새로운 여정</small></div><p class="note">모바일로 이어가는 나만의 모험</p><form id="auth"><label>계정 이름<input name="username" autocomplete="username" pattern="[a-zA-Z0-9_]{3,32}" minlength="3" maxlength="32" required placeholder="영문·숫자·밑줄 3~32자"></label><label>비밀번호<input name="password" autocomplete="current-password" type="password" minlength="8" maxlength="256" required placeholder="8자 이상"></label><div class="two"><button type="submit" name="mode" value="login" class="gold">로그인</button><button type="submit" name="mode" value="register">새 계정 만들기</button></div><p id="auth-error" class="error" role="alert"></p></form><p class="footer-note">이전 게임 아이디·비밀번호도 그대로 로그인할 수 있습니다.<br>PC·모바일은 같은 계정으로 로그인하면 이어집니다.<br>이미 있는 아이디는 재가입하지 말고 ‘로그인’을 눌러 주세요.<br>계정 이름은 대소문자를 구분하지 않습니다.</p></div>`;
  $("#auth").onsubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    busy = true;
    const form = e.currentTarget,
      register = e.submitter?.value === "register",
      f = new FormData(form),
      username = String(f.get("username")).trim().toLowerCase();
    $("#auth-error").textContent="";
    form.querySelectorAll("button").forEach((b) => (b.disabled = true));
    try {
      const nextSession = await request(
        register ? "/auth/v1/signup" : "/auth/v1/token?grant_type=password",
        {
          email: username + "@players.ringu.example",
          password: f.get("password"),
          ...(register ? { data: { username } } : {}),
        },
        false,
      );
      if (!nextSession.access_token) {
        const err=new Error((nextSession.user||nextSession).identities?.length===0?"USER_ALREADY_REGISTERED":"AUTH_CONFIRMATION_REQUIRED");
        err.code=err.message;throw err;
      }
      clearAccountView();
      session=nextSession;
      session.expires_at =
        session.expires_at || Date.now() / 1000 + session.expires_in;
      persist();
      busy = false;
      await command("sync");
    } catch (err) {
      if ($("#auth-error"))
        $("#auth-error").textContent = authFailureMessage(err,register);
    } finally {
      busy = false;
      form.querySelectorAll("button").forEach((b) => (b.disabled = b.hasAttribute("data-unavailable")));
    }
  };
}
function createScreen() {
  app.innerHTML = `<div class="login panel" style="max-width:650px"><p class="eyebrow">CHOOSE YOUR PATH</p><p class="note">접속 계정: ${esc(session?.user?.email?.split("@")[0]||session?.user?.user_metadata?.username||"현재 계정")}</p><h2>어떤 모험가가 될까요?</h2><p class="note">직업에 맞는 주스탯과 장비를 성장시키세요.</p><div class="class-choice">${D.CLASSES.map((c, i) => btn(`<div class="portrait" style="background-position:${i * 25}% 0"></div>${c.name}<br><small>${c.stat}</small>`, "chooseClass", c.id, c.id === chosenClass ? "selected" : "")).join("")}</div><p class="note">선택: ${D.CLASSES.find((c) => c.id === chosenClass).name} · 첫 무기와 잠재 주문서를 지급합니다.</p><label>캐릭터 이름<input id="char-name" maxlength="12" placeholder="한글·영문·숫자 2~12자"></label><div class="actions">${btn("모험 시작", "create", "", "gold", true)}${btn("다른 계정 만들기 · 로그인", "switchAccount")}</div></div>`;
}
let betaResource="gold",betaAmount=1000;
function betaTools(){
  const resources=[["gold","골드",state.gold],...Object.entries(D.MATERIALS).map(([key,name])=>[key,name,state.materials[key]]),...D.REGIONS.map(r=>["boss:"+r.id,bossMaterialNames[r.id],state.bossMaterials[r.id]||0])];
  const blocked=!!state.battle||!!state.partyRoom;
  open("베타 테스트 · 지급 / 레벨 / 보스",`<p class="note">베타 기간에는 모든 플레이어가 자기 캐릭터에 사용할 수 있어요.</p><section class="panel pad"><h3>재화 · 소모품 받기</h3><label>종류<select id="beta-resource">${resources.map(([key,name,have])=>`<option value="${key}" ${key===betaResource?"selected":""}>${name} · 보유 ${fmt(have)}</option>`).join("")}</select></label><label>받을 수량<input id="beta-amount" type="number" inputmode="numeric" min="1" max="1000000000" step="1" value="${betaAmount}"></label><p class="note">입력한 수량만큼 추가 지급 · 한 번에 최대 10억</p>${disabledBtn("선택한 수량 받기","betaGrant","",blocked,"gold")}</section><section class="panel pad"><h3>레벨 조정 · 현재 Lv.${state.level}</h3><label>원하는 레벨<input id="beta-level" type="number" inputmode="numeric" min="1" max="200" step="1" value="${state.level}"></label><p class="note">1~200레벨 · 경험치 0으로 조정<br>직업별 분배 스탯은 초기화하고 해당 레벨의 포인트를 돌려줘요. 착용 레벨이 안 맞는 장비는 가방으로 돌아가며 자동사냥이 멈춰요. 60 미만은 2차 전직도 해제돼요.</p>${disabledBtn("입력한 레벨로 조정","betaLevel","",blocked||!!state.pendingCube,"gold")}</section><section class="panel pad"><h3>보스 보상 횟수 초기화</h3><p class="note">내 계정의 보스 보상 횟수를 다시 채워요. 초기화 후 처치하면 보상을 다시 받을 수 있어요.</p><div class="actions">${disabledBtn("일일 보스 초기화","betaBossReset","daily",blocked,"gold")}${disabledBtn("주간 보스 초기화","betaBossReset","weekly",blocked,"gold")}${disabledBtn("일일·주간 모두 초기화","betaBossReset","all",blocked)}</div></section>${blocked?'<p class="note">전투·파티 종료 후 사용할 수 있어요.</p>':""}`);
}
function settingsDialog() {
  open(
    "설정",
    `<div class="stack"><label>효과음 <input id="sound" type="range" min="0" max="1" step=".05" value="${settings.sound}"></label><label>배경음 <input id="music" type="range" min="0" max="1" step=".05" value="${settings.music}"></label><label><input id="low" type="checkbox" ${settings.low ? "checked" : ""} style="width:auto;min-height:0"> 저사양 · 모션 감소</label><p class="note">자동사냥·오프라인은 서버에서 정산합니다. 소리와 모션은 이 기기에 저장됩니다.</p>${btn("저장", "saveSettings", "", "gold")}${btn("로그아웃", "logout", "", "danger")}</div>`,
  );
}
let marketSellId=null,marketSellSlot="",marketSellClass="",marketSellPrice="10000";
function marketItemBlock(it) {
  if(!it)return "판매할 장비를 선택해 주세요.";
  if(it.bound)return "거래 불가";
  if(it.broken)return "파괴된 장비";
  if(it.locked)return "잠금 중";
  if(Object.values(state.equipped).includes(it.id))return "장착 중";
  if(state.pendingCube?.id===it.id)return "큐브 선택 중";
  return "";
}
function marketSellBlock(it) {
  return marketItemBlock(it)||(state.level<20?"거래소는 Lv.20부터 이용할 수 있습니다.":state.battle||state.partyRoom?"전투·파티를 종료한 뒤 등록할 수 있습니다.":"");
}
function updateSellPrice() {
  const input=$("#sell-price");if(!input)return;
  marketSellPrice=input.value;
  const price=Number(marketSellPrice),valid=Number.isSafeInteger(price)&&price>=100&&price<=1e9;
  $("#sell-net").textContent=valid?fmt(Math.floor(price*.95))+" G":"—";
  const it=state.items.find(it=>it.id===marketSellId),reason=marketSellBlock(it)||(!valid?"100~1,000,000,000 G 범위의 정수를 입력해 주세요.":"");
  $("#sell-reason").innerHTML=esc(reason||"선택한 장비 1개를 등록합니다. 판매 수수료는 5%입니다.").replace("Lv.20",requiredLevel(20));
  const button=modal.querySelector('[data-action="sellConfirm"]');button.disabled=!!reason;button.toggleAttribute("data-unavailable",!!reason);
}
function consumableSellDialog(key=null){
 if(!key){
  open("판매할 소모품 선택",`<p class="note">가방에서 판매할 소모품을 누르세요.</p><div class="market-compact-grid material-sell-grid" data-currency-label>${Object.entries(D.MATERIALS).map(([k,name])=>`<button class="market-compact-card" data-action="materialSellPick" data-arg="${k}" ${state.materials[k]>0?"":"disabled"}><img class="material-tile-image" src="currencies/${k}.svg" alt=""><strong class="market-card-name">${name}</strong><small>보유 ${fmt(state.materials[k])}개</small><span class="market-card-status">${state.materials[k]>0?"선택":"보유 없음"}</span></button>`).join("")}</div>`);
  return;
 }
 if(!Object.hasOwn(D.MATERIALS,key)||!(state.materials[key]>0))return;
 open("소모품 판매 등록",`${btn("← 소모품 목록","marketSellConsumables")}<div class="material-picked" data-currency-label><img src="currencies/${key}.svg" alt=""><div><strong>${D.MATERIALS[key]}</strong><p>보유 ${fmt(state.materials[key])}개</p></div></div><input id="material-sell-key" type="hidden" value="${key}"><label>등록 수량<input id="material-sell-count" type="number" inputmode="numeric" min="1" max="${Math.min(1e6,state.materials[key])}" step="1" value="1"></label><label>개당 가격 (G)<input id="material-sell-price" type="number" inputmode="numeric" min="1" max="1000000000" step="1" value="100"></label><p id="material-sale-total" class="note"></p><p class="note">필요한 수량만 판매합니다. 등록 7일 · 수수료 5%. 취소 시 남은 수량을 돌려받습니다.</p>${btn("소모품 등록","sellConsumableConfirm","","gold")}`);
 updateMaterialSale();
}
function updateMaterialSale(){const key=$('#material-sell-key')?.value;if(!key)return;const count=Number($('#material-sell-count').value),price=Number($('#material-sell-price').value),total=count*price,valid=Number.isSafeInteger(count)&&count>=1&&count<=Math.min(1e6,state.materials[key]||0)&&Number.isSafeInteger(price)&&price>=1&&total<=1e9;$('#material-sale-total').textContent=valid?'전량 판매 시 총 '+fmt(total)+' G · 예상 수령 '+fmt(total-Math.floor(total*.05))+' G':'보유 수량 안에서 정수로 입력하세요. 총 등록 금액은 10억 G 이하입니다.';modal.querySelector('[data-action=sellConsumableConfirm]').disabled=!valid;}
function updateMaterialBuy(){const input=$('#material-buy-count');if(!input)return;const listing=marketRows.find(l=>l.id===input.dataset.listing),count=Number(input.value),valid=listing&&Number.isSafeInteger(count)&&count>=1&&count<=listing.item.quantity;$('#material-buy-total').textContent=valid?'결제 금액 '+fmt(count*listing.price)+' G':'남은 수량 안에서 정수로 입력하세요.';modal.querySelector('[data-action=buyListing]').disabled=!valid||count*listing.price>state.gold;}
function marketSellPicker() {
  const scroll=modal.querySelector('.market-inventory-grid')?.scrollTop||0;
  const items=state.items.filter(it=>(marketSellSlot===""||it.slot===Number(marketSellSlot))&&(marketSellClass===""||it.classId===marketSellClass)).sort((a,b)=>Number(!!marketItemBlock(a))-Number(!!marketItemBlock(b))||b.stars-a.stars||b.level-a.level);
  const it=state.items.find(it=>it.id===marketSellId),cl=it&&D.CLASSES.find(c=>c.id===it.classId),growth=it?1+it.stars*.055+Math.max(0,it.stars-15)**1.4*.025:0;
  const stats=it?[[it.baseStats?"기본 공격력":"기존 품질",it.baseStats?fmt(it.baseStats.attack):D.itemQuality(it)+"%"],["장비 공격력",D.gearAttributes(it).attack.toFixed(1)],[cl.stat,fmt(D.gearAttributes(it).stat)],["최대 HP",fmt(D.gearAttributes(it).hp)],["방어력",(D.gearAttributes(it).defense).toLocaleString("ko-KR")]]:[];
  const canCompare=it&&!it.broken&&it.classId===state.classId&&it.level<=state.level;
  const before=power(state).combatPower,after=canCompare?power({...state,equipped:{...state.equipped,[it.slot]:it.id}}).combatPower:0;
  open("판매할 장비 선택",`<p class="market-picker-intro">가방에서 장비를 고르고, 능력치와 잠재 옵션을 확인하세요.</p><div class="market-picker-layout ${it?"show-detail":""}"><section class="market-picker-bag"><div class="market-picker-filters"><label>부위<select id="market-sell-slot"><option value="">모든 부위</option>${D.SLOTS.map((name,i)=>`<option value="${i}" ${String(i)===marketSellSlot?"selected":""}>${name}</option>`).join("")}</select></label><label>직업<select id="market-sell-class"><option value="">모든 직업</option>${D.CLASSES.map(c=>`<option value="${c.id}" ${c.id===marketSellClass?"selected":""}>${c.name}</option>`).join("")}</select></label></div><p class="market-bag-count">가방 ${state.items.length}/300 · 표시 ${items.length}개 · 판매 가능 ${items.filter(it=>!marketItemBlock(it)).length}개</p><div class="market-inventory-grid" role="group" aria-label="판매 장비 인벤토리">${items.length?items.map(item=>{const reason=marketItemBlock(item);return `<button data-action="marketSellPick" data-arg="${item.id}" aria-pressed="${marketSellId===item.id}" class="market-inventory-item ${marketSellId===item.id?"picked":""} ${reason?"unavailable":""}"><span class="market-tile-meta">${requiredLevel(item.level)}<b>${item.stars}★</b></span>${gearMarkup(item)}<strong>${esc(D.gearName(item))}</strong><small>${reason||D.CLASSES.find(c=>c.id===item.classId).name+" · "+D.SLOTS[item.slot]}</small></button>`;}).join(""):'<div class="empty">조건에 맞는 장비가 없습니다.</div>'}</div><p class="note">장착·잠금·파괴·거래 불가·큐브 선택 중인 장비는 상세 확인만 가능합니다.</p></section><section class="market-sell-detail" aria-live="polite">${btn("← 장비 목록","marketSellBack")}${it?`<div class="market-picked-head">${gearMarkup(it,"big-item")}<div><small>선택한 장비</small><h3>${esc(D.gearName(it))}</h3><p>${requiredLevel(it.level)} · ${cl.name} · ${D.equipmentType(it)}</p><b>${it.stars}성 · ${it.boss?"보스 장비":"일반 장비"}</b></div></div><div class="market-picked-stats">${stats.map(([k,v])=>`<div><span>${k}</span><b>+${v}</b></div>`).join("")}</div><p class="note">스타포스가 반영된 장비 능력치입니다. 잠재 효과는 아래에 별도로 표시합니다.${it.broken?" 파괴된 장비는 현재 능력치가 적용되지 않습니다.":""}</p><div class="market-picked-options"><h4>잠재능력</h4>${it.lines.length?it.lines.map((line,i)=>`<div class="grade-color-${line.grade}"><small>${i+1}줄 · ${D.RARITIES[line.grade]}</small><span>${D.OPTIONS[line.key]}</span><b>+${line.value}${D.optionUnit(line.key)}</b></div>`).join(""):'<p class="note">잠재 미개방</p>'}</div>${canCompare?`<p class="market-equip-compare">장착 시 내 전투력 <strong>${fmt(after)}</strong> <span>(${after-before>=0?"+":""}${fmt(after-before)})</span></p>`:""}`:'<div class="market-pick-empty"><span>◇</span><h3>판매할 장비를 선택하세요</h3><p>장비 이미지를 누르면 강화 수치와<br>줄별 잠재 옵션이 여기에 표시됩니다.</p></div>'}<div class="market-price-box"><label for="sell-price">판매 가격 <small>G</small></label><input id="sell-price" type="number" inputmode="numeric" min="100" max="1000000000" step="1" value="${esc(marketSellPrice)}"><div class="market-net"><span>판매 완료 시 수령액</span><strong id="sell-net">—</strong></div><p id="sell-reason" class="note"></p>${disabledBtn("선택 장비 등록","sellConfirm","",true,"gold market-register")}<p class="note">등록 기간 7일 · 판매 완료 시 수수료 5%</p></div></section></div>`);
  modal.classList.add("market-picker-dialog");modal.querySelector('.market-inventory-grid').scrollTop=scroll;updateSellPrice();
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
    if(action==='towerStart'){modal.close();tab='boss';bossTab='tower';view='game';return await command('towerStart',{floor:Number(arg)});}
    if(action==='towerAck'){modal.close();return await command('ack');}
    if(action==='towerLeaveConfirm')return open('탑에서 나가기',`<p>현재 층의 도전을 종료합니다. 획득한 이전 층 보상과 기록은 유지됩니다.</p>${btn('나가기','towerLeave','','danger',true)}`);
    if(action==='towerLeave'){modal.close();return await command('towerLeave');}
    if (action === "cubeKind") {cubeKind=arg==="highCube"?"highCube":"cube";return itemDetail(selected,"potential");}
    if (action === "reconnect") return await command("sync");
    if (action === "attendance") return attendance();
    if (action === "attendanceClaim") return await command("attendanceClaim");
    if (action === "changeClass") return changeClassDialog();
    if (action === "changeClassPick") return confirmClassChange(arg);
    if (action === "changeClassConfirm") {await command("changeClass",{classId:arg});modal.close();filterClass="";salvageSelection.clear();tab="character";view="game";return render();}
    if (action === "craftDetail") return open("제작 장비 상세",craftPreview(Number(arg),true));
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
    if (action === "bossSub") {bossTab=arg;render();if(arg==="party")await command("partyList",{},true);return;}
    if (action === "partyRefresh") return await command(state.partyRoom?"partySync":"partyList",{},true);
    if (action === "partyCreate") return await command("partyCreate",{bossId:Number($("#party-boss").value),practice:$("#party-practice").checked});
    if (action === "partyJoin") return await command("partyJoin",{room:arg});
    if (["partyStart","partySkill","partyRevive","partyLeave"].includes(action)) {const result=await command(action,action==="partySkill"?{slot:Number(arg)||1}:{});if(action==="partyLeave")modal.close();return result;}
    if (action === "partyLeaveConfirm") return open("파티에서 나가기",`<p>진행 중인 전투에서 나가면 해당 파티 보상을 받을 수 없습니다. 자동사냥은 다시 시작됩니다.</p>${btn("나가기","partyLeave","","danger",true)}`);
    if (action === "itemMode") {const [id,mode]=arg.split(":");return itemDetail(id,mode);}
    if (action === "advance") return await command("advance");
    if (action === "journal") {view="journal";return render();}
    if (action === "ranking") {view="ranking";return await loadRankings();}
    if (action === "rankingRefresh") return await loadRankings();
    if (action === "rankingMode") {rankingMode=arg==="combat"?"combat":"level";return render();}
    if(action==="betaBossReset"){
      if(busy)return;
      const result=await command("betaBossReset",{kind:arg});
      if(result){betaTools();toast((arg==="daily"?"일일":arg==="weekly"?"주간":"일일·주간")+" 보스 보상 횟수가 초기화됐어요.");}return;
    }
    if(action==="betaTools")return betaTools();
    if(action==="betaGrant"){
      if(busy)return;
      betaResource=$("#beta-resource").value;betaAmount=Number($("#beta-amount").value);
      if(!Number.isSafeInteger(betaAmount)||betaAmount<1||betaAmount>1e9)return toast("수량은 1~10억 사이 정수로 입력해 주세요.");
      const result=await command("betaGrant",{key:betaResource,amount:betaAmount});
      if(result){betaTools();toast("선택한 재화가 지급됐어요.");}return;
    }
    if(action==="betaLevel"){
      if(busy)return;
      const level=Number($("#beta-level").value);
      if(!Number.isSafeInteger(level)||level<1||level>200)return toast("레벨은 1~200 사이 정수로 입력해 주세요.");
      const result=await command("betaLevel",{level});
      if(result){betaTools();toast("레벨이 조정됐어요. 스탯 포인트를 분배해 주세요.");}return;
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
    if (action === "logout" || action === "switchAccount") {
      try {
        await ensureToken();
        await request("/auth/v1/logout?scope=local", {});
      } finally {
        session = null;
        persist();
        clearAccountView();
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
    if (action === "skill") return await command("skill",{slot:Number(arg)||1});
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
    if (action === "autoEquip") return await command("autoEquip");
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
    if (action === "qualityReroll") return await command("qualityReroll", {id:arg});
    if (["lock", "potential", "expand", "star"].includes(action)) {
      await command(action, { id: arg });
      if (action !== "star") itemDetail(arg);
      return;
    }
    if (action === "cube" || action === "highCube")
      return await command("cube", { id: arg, high: action === "highCube" });
    if (action === "cubeChooseRepeat") {
      if(busy||!state.pendingCube)return;
      const pending=state.pendingCube,id=pending.id,high=!!pending.high;
      const result=await command("cubeChoose",{apply:arg==="yes"});
      if(!result||state.pendingCube)return;
      lastCubeResult=null;
      itemDetail(id,"potential");
      return await command("cube",{id,high});
    }
    if (action === "cubeChoose") {
      await command("cubeChoose", { apply: arg === "yes" });
      modal.close();
      lastCubeResult=null;
      return itemDetail(selected,"potential");
    }
    if(action==="salvageMode"){salvageMode=!salvageMode;salvageSelection.clear();render();return;}
    if(action==="salvageClear"){salvageSelection.clear();render();return;}
    if(action==="salvagePick"){
      const it=state.items.find(it=>it.id===arg);
      if(!it||!canSalvage(it))return toast("분해할 수 없는 장비입니다.");
      if(salvageSelection.has(arg))salvageSelection.delete(arg);
      else if(salvageSelection.size<50)salvageSelection.add(arg);
      else return toast("한 번에 최대 50개까지 선택할 수 있습니다.");
      render();return;
    }
    if(action==="salvageSelectVisible"){
      const visibleGroups=inventoryGroups(state.items,D.CLASSES,state.classId,Object.values(state.equipped),filterClass,filterSlot);
      for(const group of visibleGroups)for(const slot of group.slots)for(const it of slot.items)if(salvageSelection.size<50&&canSalvage(it))salvageSelection.add(it.id);
      render();return;
    }
    if(action==="salvageBatchConfirm"){
      const items=state.items.filter(it=>salvageSelection.has(it.id)&&canSalvage(it));
      if(!items.length)return;
      open("선택 장비 분해",`<p>선택한 장비 ${items.length}개를 분해하고 장비 파편 ${fmt(items.reduce((n,it)=>n+D.salvageYield(it),0))}개를 받습니다.</p><p class="note">분해한 장비는 복구할 수 없습니다.</p>${items.map(it=>`<p>${esc(D.gearName(it))} · Lv.${it.level} · ${it.stars}성</p>`).join("")}${btn("선택 장비 분해하기","salvageBatch","","danger",true)}`);return;
    }
    if(action==="salvageBatch"){
      await command("salvage",{ids:[...salvageSelection]});salvageSelection.clear();render();return;
    }
    if (action === "salvageConfirm")
      return open(
        "장비 분해",
        `<p>분해 보상: 장비 파편 ${D.salvageYield(state.items.find(it=>it.id===arg))}개.<br>선택한 장비가 사라집니다. 강화·잠재·품질은 복구할 수 없습니다.</p><div class="actions">${btn("분해하기", "salvage", arg, "danger", true)}</div>`,
      );
    if (action === "salvage") {
      await command("salvage", { ids: [arg] });
      return;
    }
    if (action === "restore")
      return await command("restore", {
        id: arg,
        materialId: $("#restore-material").value,
      });
    if (action === "craft")
      return await command("craft", {
        region: Number(arg),
        slot: craftItem(Number(arg)).slot,
        
      });
    if (action === "supplyExchange") {const [key,count]=arg.split(":");return await command("supplyExchange",{key,count:Number(count)});}
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
    if(action==='marketKind'){marketKind=arg;filterSlot='';filterClass='';marketPage=0;return await marketLoad();}
    if(action==='marketSellConsumables')return consumableSellDialog();
    if(action==='materialSellPick')return consumableSellDialog(arg);
    if(action==='sellConsumableConfirm'){const material=$('#material-sell-key').value,quantity=Number($('#material-sell-count').value),price=Number($('#material-sell-price').value);if(!Number.isSafeInteger(quantity)||quantity<1||quantity>Math.min(1e6,state.materials[material]||0)||!Number.isSafeInteger(price)||price<1||price*quantity>1e9)return toast('수량과 개당 가격을 확인해 주세요.');return await marketWrite('sell',{material,quantity,price});}
    if (action === "marketSell") {marketSellId=null;marketSellSlot="";marketSellClass="";marketSellPrice="10000";return marketSellPicker();}
    if (action === "marketSellPick") {marketSellPrice=$("#sell-price")?.value??marketSellPrice;marketSellId=arg;return marketSellPicker();}
    if (action === "marketSellBack") {marketSellPrice=$("#sell-price")?.value??marketSellPrice;marketSellId=null;return marketSellPicker();}
    if (action === "sellConfirm") {
      const it=state.items.find(it=>it.id===marketSellId),reason=marketSellBlock(it),price=Number($("#sell-price")?.value);
      if(reason)return toast(reason);
      if(!Number.isSafeInteger(price)||price<100||price>1e9)return toast("판매 가격은 100~1,000,000,000 G의 정수로 입력해 주세요.");
      return await marketWrite("sell", {itemId:it.id,price});
    }
    if (action === "marketConfirm") {
      const l = marketRows.find((l) => l.id === arg);
      if(!l)return toast("상품 목록을 새로고침해 주세요.");
      if(l.status!=="open")return open("판매 내역",`${l.item.kind==="consumable"?itemMarkup(l.item):marketGearDetails(l.item)}<p>${l.status==="sold"?"판매 완료":"회수 완료"}</p>`);
      if(l.item.kind==="consumable"){open(l.own?"소모품 판매 취소":"소모품 구매",`<div class="item">${itemMarkup(l.item)}</div><p>개당 ${fmt(l.price)} G</p>${l.own?`<p>남은 ${fmt(l.item.quantity)}개를 돌려받습니다.</p>`:`<label>구매 수량<input id="material-buy-count" data-listing="${l.id}" type="number" min="1" max="${l.item.quantity}" step="1" value="1"></label><p id="material-buy-total"></p>`}${btn(l.own?"남은 수량 회수":"구매 확정",l.own?"cancelListing":"buyListing",arg,"gold")}`);if(!l.own)updateMaterialBuy();return;}
      return open(
        l.own ? "판매 취소" : "구매 확인",
        `${marketGearDetails(l.item)}<p class="note">${fmt(l.price)} 골드</p><div class="actions">${btn(l.own ? "장비 회수" : "구매 확정", l.own ? "cancelListing" : "buyListing", arg, "gold")}</div>`,
      );
    }
    if (action === "cancelListing" || action === "buyListing")
      return await marketWrite(action === "cancelListing" ? "cancel" : "buy", {
        id: arg,
        ...(action==="buyListing"&&marketRows.find(l=>l.id===arg)?.item.kind==="consumable"?{quantity:Number($("#material-buy-count")?.value)}:{}),
      });
  } catch (err) {
    toast(message(err));
  }
});
document.addEventListener("input", e=>{if(e.target.id?.startsWith("material-sell"))updateMaterialSale();if(e.target.id==="material-buy-count")updateMaterialBuy();if(e.target.id==="sell-price")updateSellPrice();});
document.addEventListener("change", async (e) => {
  if(e.target.id==="material-sell-key"){updateMaterialSale();return;}
  if(e.target.id==="market-sell-slot"||e.target.id==="market-sell-class") {marketSellPrice=$("#sell-price")?.value??marketSellPrice;if(e.target.id==="market-sell-slot")marketSellSlot=e.target.value;else marketSellClass=e.target.value;marketSellId=null;marketSellPicker();return;}
  if(e.target.dataset.craftRegion!==undefined) {
    const region=Number(e.target.dataset.craftRegion);
    craftSelections.set(region,e.target.value);
    $("#craft-preview-"+region).innerHTML=craftPreview(region);
    return;
  }
  if(e.target.id==="party-boss") {partyBossId=Number(e.target.value);$("#party-boss-preview").innerHTML=partyBossPreview(D.raidBoss(partyBossId));return;}
  if(e.target.id==="party-practice") {partyPractice=e.target.checked;return;}
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
  if(state.battle?.kind==='tower')return;
  const partyLobbyOpen = tab === "boss" && bossTab === "party";
  const due = state.partyRoom || state.battle ? 3000 : partyLobbyOpen ? 8000 : tab === "hunt" ? 10000 : 30000;
  if (Date.now() - lastSync > due) command(state.partyRoom?"partySync":partyLobbyOpen?"partyList":"sync", {}, true).catch(() => {});
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
  if (state?.battle?.kind==='tower')return;
  if (!state || (!state.partyRoom && tab !== "hunt") || view !== "game" || document.hidden || modal.open) { combatFrames.length=0; return; }
  const arena = $(".arena");
  if (!arena || connectionLost || Date.now()-lastSync>35000) return;
  updateCombatClock();
  if(state.partyRoom && partyRoom?.status==="fighting") {if(Date.now()-lastVisualHit>=1000){lastVisualHit=Date.now();strike(arena);} return;}
  if (!state.battle && state.hunting) {
    const rate=huntingRate(state), p=power(state), st=D.STAGES[state.stage];
    const elapsed=Math.max(0,(Date.now()-lastSync)/1000);
    const progress=((state.huntRemainder||0)+elapsed)%rate.seconds;
    const deathAt=rate.seconds-10;
    const recovering=!rate.survives&&progress>=deathAt;
    const fightTime=recovering?deathAt:progress;
    const incoming=Math.max(1,st.attack-p.defense*.25);
    const hp=recovering?0:Math.max(0,p.hp-Math.floor(fightTime/3)*incoming);
    const enemyHp=Math.max(1,st.hp-p.dps*Math.floor(fightTime));
    const bar=$("#enemy-hp");
    if(bar)bar.style.width=(100*enemyHp/st.hp)+"%";
    const ownBar=$("#field-player-bar");
    if(ownBar)ownBar.style.width=(100*hp/p.hp)+"%";
    const ownLabel=$("#field-player-hp");
    if(ownLabel)ownLabel.textContent="내 HP "+fmt(hp)+" / "+fmt(p.hp);
    const status=$("#hunt-status");
    if(status)status.textContent=recovering?"부활 대기":"자동 전투 중";
    const result=$("#field-combat-result");
    if(result)result.textContent=recovering?"패배 · "+Math.ceil(rate.seconds-progress)+"초 후 자동 재도전 · 처치 보상 없음":"몬스터와 전투 중 · 3초마다 피격";
    const label=$("#battle-info");
    if(label)label.textContent="몬스터 HP "+fmt(enemyHp)+" / "+fmt(st.hp);
    if (!recovering && Date.now()-lastVisualHit>=1000) { lastVisualHit=Date.now(); strike(arena); }

  }
  if(state.battle) {
    const b=state.battle, enemy=battleEnemy(b);
    const tick=Math.min(enemy.seconds,b.tick+Math.floor((Date.now()-lastSync)/1000));
    const remaining=enemy.patternEvery-tick%enemy.patternEvery;
    const pattern=$("#pattern-info");
    if(pattern) { pattern.textContent=enemy.pattern+" · "+remaining+"초 후"; pattern.classList.toggle("pattern-warning",remaining<=3); }
    arena.classList.toggle("danger-pattern",remaining<=3);

  }
  const frame=combatFrames.shift();
  if(frame) strike(arena,frame);
}, 500);
function updateCombatClock(){
 const party=!!state.partyRoom,r=party?partyRoom:state.battle;if(!r)return;
 const seconds=party?r.seconds:battleEnemy(r).seconds;
 const tick=Math.min(seconds,r.tick+Math.max(0,Math.floor((Date.now()-lastSync)/1000)));
 const timer=$('#battle-timer');if(timer)timer.textContent='남은 '+Math.max(0,seconds-tick)+'초 / '+seconds+'초';
 const me=party?r.members.find(m=>m.mine):r;
 document.querySelectorAll('[data-skill-slot]').forEach(button=>{const slot=Number(button.dataset.skillSlot),sk=slot===1?D.CLASS_SKILLS[state.classId]:D.SECOND_SKILLS[state.classId];const ready=slot===1?(party?me?.skillReady:r.skillReady):(party?me?.secondReady:r.secondReady);const remain=party?Math.max(0,(ready||0)-tick):Math.max(0,Math.ceil(((ready||0)-r.started-tick*1000)/1000));const locked=slot===2&&!state.advancement;button.disabled=busy||locked||remain>0||(party&&me?.hp<=0)||tick>=seconds;button.textContent=slot+'차 · '+sk.name+(locked?' · 전직 필요':remain?' · '+remain+'초':' · 사용 가능');});
}
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

