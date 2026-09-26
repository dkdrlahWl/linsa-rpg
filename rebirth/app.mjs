import {GameAudio} from './game-audio.mjs?v=field-fragment-13';
import {coopLobby,coopArena,CoopController} from './coop-client.mjs?v=field-fragment-13';
import {incomingDamage} from './journey-balance.mjs?v=field-fragment-13';
import {installMenuIcons} from './menu-icons.mjs?v=field-fragment-13';
import { renderCubePanel, potentialPanel, cubeGuide } from './cube-ui.mjs?v=field-fragment-13';
import {TOWER_FLOORS} from './tower-model.mjs?v=field-fragment-13';
import {towerLobby,towerArena,TowerController} from './tower-client.mjs?v=field-fragment-13';
import * as D from "./data.mjs?v=field-fragment-13";
import { installCurrencyIcons, currencyIconURL } from "./currency-icons.mjs?v=field-fragment-13";
import equipmentBounds from "./equipment-bounds.mjs?v=field-fragment-13";
import { inventoryGroups } from "./inventory-order.mjs?v=field-fragment-13";
import { power, huntingRate, battleEnemy } from "./engine.mjs?v=field-fragment-13";
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
let towerController=null,bagPage=0,coopController=null,coopRoom=null,coopRooms=[],dialogScroll=new Map();
let marketKind="all",exchangeClass="",exchangeLevel=10;
let salvageMode=false;
const salvageSelection=new Set();
const canSalvage=it=>!it.locked&&!it.broken&&!Object.values(state.equipped).includes(it.id)&&state.pendingCube?.id!==it.id;
let partyBossId=null, partyPractice=false;
let bossTab="daily", partyRoom=null, partyRooms=[], rankingRows=[], rankingMode="level", rankingLoading=false, rankingError="", rankingUpdated=0, rankingRequest=0, itemSection="info";
let connectionLost = false, marketRequest = 0, lastVisualHit = 0;
let retryAt = 0, retryFailures = 0, characterName = "";
let session,
  settings = { sound: 0.3, music: 0.18, low: false },
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
const sounds = new GameAudio(()=>settings,()=>state);
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
  INSUFFICIENT_CUBE: "레드 큐브가 부족합니다.",
  INSUFFICIENT_HIGHCUBE: "블랙 큐브가 부족합니다.",
  COOP_CHEST_TOO_FAR: "개인 상자 가까이 이동한 뒤 공격 버튼을 눌러주세요.",
  COOP_DAMAGE_REQUIRED: "보스에게 직접 피해를 줘야 개인 상자를 받을 수 있습니다.",
  COOP_CHEST_NOT_READY: "보스 처치 후 개인 상자를 열 수 있습니다.",
  COOP_CHEST_CLAIMED: "이미 받은 상자입니다.",
  POTENTIAL_ALREADY_OPEN: "이미 잠재가 해금된 장비입니다.",
  INSUFFICIENT_SCROLL: "잠재 해금 주문서가 부족합니다.",
  INSUFFICIENT_EXPAND: "잠재 확장석이 부족합니다.",
  INSUFFICIENT_MATERIAL: "판매할 소모품 수량이 부족합니다.",
  INVALID_QUANTITY: "남은 수량 안에서 정수로 입력해 주세요.",
  BASE_STATS_FIXED: "이 장비의 기본 수치는 획득 시 확정됩니다.",

  INSUFFICIENT_FRAGMENT: "장비 파편이 부족합니다.",
  INSUFFICIENT_BOSS_MATERIAL: "보스 재료가 부족합니다.",
  ITEM_PROTECTED: "잠금·파괴·장착 상태를 확인해 주세요.",
  ITEM_REQUIREMENT: "장비의 직업 또는 착용 레벨이 맞지 않습니다.",
  ITEM_CHEST_TOO_FAR: "상자 가까이 이동한 뒤 열어 주세요.",
  PREVIOUS_BOSS_REQUIRED: "이전 보스를 먼저 처치해 주세요.",
  PREVIOUS_FLOOR_REQUIRED: "이전 층을 먼저 클리어해 주세요.",
  LEVEL_REQUIRED: "레벨이 부족합니다.",
  STARS_REQUIRED: "장착 장비의 스타포스가 부족합니다.",
  BOSS_LIMIT: "오늘 도전 또는 이번 주 보상을 이미 사용했습니다. 연습 도전은 가능합니다.",
  DUNGEON_LIMIT: "오늘 보상을 이미 받았습니다.",
  ITEM_CUBE_PENDING: "먼저 블랙 큐브 결과를 선택해 주세요.",
  INVENTORY_FULL: "가방이 가득 찼습니다. 장비를 정리해 주세요.",
  TRADE_LEVEL_REQUIRED: "거래소 구매·등록은 5레벨부터 이용할 수 있습니다.",
  SAVE_CONFLICT: "상태가 변경됐어요. 다시 시도해 주세요.",
  PRIME_LEGENDARY_REQUIRED: "프라임 큐브 사용 조건을 충족하지 않습니다.",
  PRIME_EPIC_REQUIRED: "프라임 큐브에는 잠재 3줄이 개방된 장비가 필요합니다.",
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
let autoHuntPending=false;
function requestAutoHunt(){autoHuntPending=true;flushAutoHunt();}
function flushAutoHunt(){
  if(!autoHuntPending||busy)return;
  autoHuntPending=false;
  if(!session||!state||view!=="game"||tab!=="hunt"||state.hunting||state.battle||state.coopRoom||state.partyRoom||connectionLost)return;
  command("hunt",{enabled:true},true).catch(()=>{});
}
const dungeonExitActions=new Set(['coopLeave','towerLeave','partyLeave','abandon']);
let pendingDungeonExit=null;
const commandIdleWaiters=[];
async function exitDungeon(action){
  if(pendingDungeonExit)return pendingDungeonExit;
  pendingDungeonExit=(async()=>{
    while(busy)await new Promise(resolve=>commandIdleWaiters.push(resolve));
    return command(action);
  })();
  try{return await pendingDungeonExit;}finally{pendingDungeonExit=null;}
}
function sendCoopReady(){command('coopReady',{},true).catch(()=>{});}
async function command(command, args = {}, quiet = false, freshSnapshot = false) {
  if (busy || (pendingDungeonExit&&!dungeonExitActions.has(command))) return;
  busy = true;
  const streaming=command==="coopInput";
  if(!streaming)document
    .querySelectorAll("button[data-write]")
    .forEach((b) => {if(!dungeonExitActions.has(b.dataset.action))b.disabled=true;});
  let body, recoverCharacter = false;
  const recoverySync=command==="sync"&&(!state||freshSnapshot);
  try {
    await ensureToken();
    if(!recoverySync){
      try{body=JSON.parse(localStorage.getItem(pendingKey())||"null");}catch{body=null;}
      if(body?.command==="coopInput"){localStorage.removeItem(pendingKey());body=null;}
      if(body&&(typeof body.command!=="string"||!body.args||typeof body.args!=="object"||!body.requestId))body=null;
    }
    if (
      body &&
      (body.command !== command ||
        JSON.stringify(body.args) !== JSON.stringify(args))
    ) {
      if(!quiet)toast("이전 요청을 먼저 복구합니다.");
    }
    if (!body) {
      body = { command, args, requestId: crypto.randomUUID() };
      if(!recoverySync&&!streaming)localStorage.setItem(pendingKey(), JSON.stringify(body));
    }
    const sentAt=performance.now();
    const result = await request("/functions/v1/ringu-rebirth", body);
    if(result.coop)result.coop._rtt=performance.now()-sentAt;
    if(recoverySync){const abandoned=localStorage.getItem(pendingKey());if(abandoned)localStorage.setItem(pendingKey()+"_recovered",abandoned);}
    localStorage.removeItem(pendingKey());
    const audioPrevious=state;
    state = D.normalizePotentialState(result.state);
    if(audioPrevious&&state){if(state.level>audioPrevious.level)sounds.play('level-up');else if((state.recentLoot?.[0]?.at||0)>(audioPrevious.recentLoot?.[0]?.at||0))sounds.play(state.recentLoot[0].kind==='gear'&&state.recentLoot[0].item?.boss?'loot-rare':'loot-common');}
    if("coop" in result)coopRoom=result.coop;else if(!state?.coopRoom)coopRoom=null;
    if(result.coopRooms)coopRooms=result.coopRooms;
    if(!streaming){rankingRevision++;rankingUpdated=0;}
    if ("room" in result) partyRoom=result.room; else if (!state?.partyRoom) partyRoom=null;
    if (result.rooms) partyRooms=result.rooms;
    lastSync = Date.now();
    connectionLost = false;
    const recoveredBanner=$("#connection-status");if(recoveredBanner)recoveredBanner.hidden=true;
    retryAt = 0;
    retryFailures = 0;
    render();
    for (const event of result.result?.events || []) if(event.type === "combat") combatFrames.push(...event.frames);
    if (combatFrames.length > 6) combatFrames.splice(0, combatFrames.length - 6);
    if (!quiet || result.result?.events?.some(e=>["boss","dungeon","party","tower","coop","advancementTrial"].includes(e.type))) showEvents(result.result?.events || []);
    return result;
  } catch (e) {
    if (e.status === 400) {localStorage.removeItem(pendingKey());recoverCharacter=!state&&!!session&&body?.command!=="sync";}
    if (e.status === 401) {
      endSession();
    }
    if ((!e.status || e.status >= 500)&&e.message!=="SAVE_CONFLICT") {
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
    commandIdleWaiters.splice(0).forEach(resolve=>resolve());
    if(command!=='coopReady'&&coopRoom?.status==='waiting'&&coopRoom.members.some(m=>m.id===coopRoom.me&&!m.ready))
      queueMicrotask(sendCoopReady);
    if(autoHuntPending)queueMicrotask(flushAutoHunt);
    if(recoverCharacter)queueMicrotask(()=>command("sync",{},true).catch(()=>{}));
    if(view==="ranking"&&state&&!rankingLoading&&rankingUpdated===0&&!connectionLost)loadRankings(true);
    if(!streaming)document
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
    exchange: "M3 7h17l-4-4M21 17H4l4 4",
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
  return `<div class="shell"><header class="top"><div class="brand">링구 RPG<small>REBIRTH</small></div><div class="identity"><strong>${esc(state.name)}</strong><small>Lv.${state.level} · ${c.name}</small></div><div class="top-actions">${btn(attendanceReady()?"출석 · 받기":"출석 완료", "attendance", "", attendanceReady()?"attendance-alert":"")}${btn("랭킹", "ranking", "", "top-ranking")}${state.isAdmin?btn("관리자","betaTools"):""}${btn("설정", "settings")}</div><div class="top-resources"><div class="money" data-currency-label="gold" aria-label="보유 골드 ${fmt(state.gold)}"><img src="currencies/gold.svg" alt=""><strong>${state.isAdmin?"∞":fmt(state.gold)}</strong><span>G</span></div><span class="top-power">전투력 <b>${fmt(power(state).combatPower)}</b></span></div></header><div id="connection-status" class="connection-status" role="status" ${connectionLost ? "" : "hidden"}>연결이 지연되고 있어요. 다시 연결되면 진행 상황을 불러옵니다. ${btn("다시 연결", "reconnect")}</div>${content}<nav class="bottom">${[
    ["hunt", "사냥"],
    ["character", "캐릭터"],
    ["gear", "가방"],
    ["boss", "보스"],
    ["market", "거래소"],
  ]
    .map(([k, label]) =>
      btn(icon(k) + label, "tab", k, tab === k ? "active" : ""),
    )
    .join("")}</nav></div>`;
}
function render() {
  sounds.setCombat(state?.battle?.kind==='tower'||['fighting','won'].includes(coopRoom?.status));
  const preservedScroll=window.scrollY;
  const towerBattle=state?.battle?.kind==='tower'?state.battle:null;
  const coopFight=state?.coopRoom&&['fighting','won'].includes(coopRoom?.status);
  document.body.classList.toggle('tower-mode',!!towerBattle||!!coopFight);
  if(coopFight&&coopController?.room.id===coopRoom.id){coopController.accept(coopRoom);return;}
  if(coopController){coopController.dispose();coopController=null;}
  if(towerBattle&&towerController?.b.runId===towerBattle.runId){towerController.accept(towerBattle);return;}
  if(towerController){towerController.dispose();towerController=null;}
  if (!session) return login();
  if (!state) return createScreen();
  let content;
  if(coopFight)content=coopArena(coopRoom);
  else if(state.coopRoom)content=coopLobby(state,coopRoom,coopRooms);
  else if (towerBattle) content=towerArena(towerBattle);
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
  window.scrollTo({top:preservedScroll,behavior:"instant"});
  refreshLevelRequirements();
  if(coopFight){coopController=new CoopController(app.querySelector('.tower-play'),coopRoom,command,b=>sounds.battle(b));return;}
  if(towerBattle){towerController=new TowerController(app.querySelector('.tower-play'),towerBattle,command,kind=>sounds.play(kind),{audio:b=>sounds.battle(b)});return;}
  if(state?.battle||state?.partyRoom)updateCombatClock();
  if (state.pendingCube && !modal.open) cubeChoice();
  else if(state.lastReward?.type==="coop"&&!modal.open)reward();
}
function dailyCard(){return '<section class="panel pad daily-card"><h3>오늘의 모험</h3><p class="note">매일 한국 시간 0시 갱신 · 목표마다 현재 레벨 경험치 5%</p>'+Object.entries(D.DAILY_TASKS).map(([key,t])=>'<div class="daily-row"><div><strong>'+t.name+'</strong><small>'+Math.min(t.goal,state.daily?.[key]||0)+' / '+t.goal+' · 레드 '+t.cube+' / 블랙 '+t.highCube+'</small></div>'+disabledBtn(state.daily?.claimed?.includes(key)?'완료':'받기','dailyClaim',key,(state.daily?.[key]||0)<t.goal||state.daily?.claimed?.includes(key))+'</div>').join('')+'</section>';}
function hunt() {
  const st = D.STAGES[state.stage],
    region = state.battle?.dungeon === "relic" ? D.EXPEDITION : D.REGIONS[state.battle ? battleEnemy(state.battle).region : st.region],
    p = power(state),
    r = huntingRate(state),
    b = state.battle,
    boss = b && battleEnemy(b);
  return `${header(boss ? boss.name : st.name, region.name)}<div class="main-grid"><div><section class="panel"><div class="arena" data-class="${state.classId}" style="background-image:url('${region.background}')"><div class="battle-head"><small>${boss ? "BOSS · " + (b.kind === "dungeon" ? "수련" : boss.weekly ? "주간" : "일일") : "권장 Lv." + st.level + " · 일반 사냥"}</small><h3>${boss ? boss.name : D.MONSTERS[st.id * 2 + (state.huntKills || 0) % 2].name}</h3><div class="hp"><i id="enemy-hp" style="width:${boss ? Math.max(0, (b.enemyHp / boss.hp) * 100) : 100}%"></i></div><small id="battle-info">${boss ? fmt(b.enemyHp) + " / " + fmt(boss.hp) : state.hunting ? "전투 중" : "사냥 시작을 눌러 도전하세요"}</small></div><div class="monster">${boss ? bossMarkup(boss) : monsterMarkup(D.MONSTERS[st.id * 2 + (state.huntKills || 0) % 2])}</div><div class="combat-status"><span class="pill" id="hunt-status">${boss ? "보스 전투 중" : state.hunting ? "자동사냥 중" : "휴식 중"}</span>${boss ? `<p id="player-hp">내 HP ${fmt(b.hp)} / ${fmt(b.power.hp)}</p><div class="hp player-health"><i style="width:${Math.max(0, b.hp/b.power.hp*100)}%"></i></div><small id="pattern-info">${boss.pattern} · ${boss.patternEvery - b.tick % boss.patternEvery}초 후</small>` : `<p id="field-player-hp">내 HP ${fmt(power(state).hp)} / ${fmt(power(state).hp)}</p><div class="hp player-health"><i id="field-player-bar" style="width:100%"></i></div><small id="field-combat-result">${state.hunting?"몬스터와 전투 중":"사냥을 시작하면 자동으로 전투합니다."}</small>`}</div></div><div class="pad"><div class="row spread"><small>Lv.${state.level} 경험치</small><small>${fmt(state.xp)} / ${fmt(D.xpNeeded(state.level))}</small></div><div class="exp"><i style="width:${Math.min(100, (state.xp / D.xpNeeded(state.level)) * 100)}%"></i></div><div class="metrics"><div><small>예상 시간당 경험치</small><b>${fmt((r.xp * 3600) / r.seconds)}</b></div><div><small>예상 시간당 골드</small><b>${fmt((r.gold * 3600) / r.seconds)}</b></div><div><small>드롭 장비</small><b>${gearLevelRange(Math.max(10,st.dropLevel))}</b></div></div><div class="actions">${boss ? combatSkillButtons()+disabledBtn("회복 "+(3-(b.potions||0))+"/3","battlePotion","",(b.potions||0)>=3||Date.now()<(b.potionReady||0)) : btn(state.hunting ? "사냥 중지" : "사냥 시작", "toggleHunt", "", "gold", true)}${btn("사냥터 변경", "regions")}${btn("보상 확인", "reward")}${boss ? btn("전투 포기", "abandonConfirm") : ""}</div>${boss ? `<p class="note">전투 제한 ${boss.seconds}초 · <strong id="battle-timer">남은 ${boss.seconds-b.tick}초</strong></p>`+skillGuide() : recentLoot()}</div></section></div><aside>${dailyCard()}<div class="panel pad"><p class="eyebrow">오늘의 성장</p><h3>장비는 모험에서 얻습니다</h3><p class="note">권장레벨에 맞는 장비를 강화해야 안정적으로 사냥할 수 있습니다. 패배하면 10초 후 부활해 재도전합니다. 반복해서 패배한다면 장비를 강화하거나 하위 사냥터에서 재화를 모으세요. 상위 사냥터로 이동하며 성장하세요. 자신의 레벨보다 15레벨 이상 낮은 사냥터에서는 경험치와 골드가 함께 줄어듭니다.</p><div class="row wrap">${Object.entries(
    D.MATERIALS,
  )
    .map(
      ([k, v]) =>
        `<span class="currency">${v} <b>${fmt(state.materials[k])}</b></span>`,
    )
    .join(
      "",
    )}</div></div><div class="panel pad"><h3>다음 목표</h3><p class="note">${state.cleared.length < 30 ? D.BOSSES.find((b) => !state.cleared.includes(b.id))?.name + " 처치" : "최종 장비와 잠재옵션 완성"}</p>${btn("보스 확인", "tab", "boss")}${btn("모험 수첩", "journal")}</div>${state.tutorial < 6 ? `<div class="quest"><strong>모험 안내 ${state.tutorial + 1}/6</strong><p class="note">${["시작 무기는 장착되어 있어요. 캐릭터 탭에서 확인하세요.", "레벨업 포인트는 내 직업 주스탯에 분배하세요.", "모든 사냥터에 입장할 수 있어요. 권장 레벨과 생존 가능 여부를 확인하세요.", "보스 장비는 보스를 처치해서만 얻을 수 있어요.", "장비는 잠재 3줄로 시작해요. 큐브로 원하는 옵션을 찾으세요.", "강화 실패 시 별은 유지됩니다. 비용을 확인하고 도전하세요."][state.tutorial]}</p>${btn("확인", "tutorial", "", "", true)}</div>` : ""}</aside></div>`;
}
function regions() {
  return `${header("사냥터 선택", "WORLD MAP")}${btn("사냥으로 돌아가기", "back")}<section class="panel pad relic-card"><strong>여명의 폐허 · ${requiredLevel(200)}</strong><p class="note">멸신왕 벨제리온 이후 열리는 유적 · 일반 ${requiredLevel(200,"200레벨")} 장비</p>${disabledBtn("유적 탐사","dungeon","relic",state.level<200||!state.cleared.includes(29),"gold")}</section><div class="region-list" style="margin-top:12px">${D.REGIONS.map(
    (r) =>
      `<section class="panel"><div class="region-banner" style="background-image:url('${r.background}')"><h3>${r.name} <small>권장 Lv.${r.level}</small></h3></div>${D.STAGES.filter(
        (s) => s.region === r.id,
      )
        .map(
          (s) =>
            `<div class="stage-row"><div><strong>${s.name}</strong><br><small>권장 Lv.${s.level} · 입장 제한 없음<br>경험치 ${fmt(s.xp)} / 처치 · ${state.stage === s.id ? "현재 사냥터" : gearLevelRange(Math.max(10,s.dropLevel)) + " 장비"}</small></div>${disabledBtn("입장", "enterStage", s.id, false)}</div>`,
        )
        .join("")}</section>`,
  ).join("")}</div>`;
}
function character() {
  const c = D.CLASSES.find((x) => x.id === state.classId),
    p = power(state);
  return `${header("캐릭터", (state.advancement>=3?D.FOURTH_NAMES[c.id]:state.advancement>=2?D.THIRD_NAMES[c.id]:state.advancement?D.ADVANCEMENTS[c.id]:c.name) + " · " + c.stat + " 주스탯")}<div class="subnav">${btn("모험 수첩","journal")}${btn("직업 변경","changeClass")}</div><section class="panel pad">${skillGuide()}</section><section class="panel pad advancement-card"><div><strong>${D.jobStage(state)?D.jobStage(state)+"차 직업":"견습 모험가"} · ${state.advancement>=3?D.FOURTH_NAMES[c.id]:state.advancement>=2?D.THIRD_NAMES[c.id]:state.advancement?D.ADVANCEMENTS[c.id]:c.name}</strong><p class="note">1차 Lv.30 / 2차 Lv.60 / 3차 Lv.100 / 4차 Lv.150 · 전용 보스 처치 · 전직마다 공격력·HP +10%</p></div>${btn("전직 보스","advance","","gold")}</section><div class="main-grid"><section class="panel"><div class="hero"><div class="portrait" style="background-position:${D.CLASSES.indexOf(c) * 25}% 0" role="img" aria-label="${c.name}"></div><div class="hero-label"><h2>${esc(state.name)}</h2><span class="pill">${c.name}</span></div></div><div class="pad"><div class="stat-grid">${Object.keys(
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
        "gear-cell"+(it?.boss?" boss-gear":""),
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
function gearRollLabel(it){return "기본 공격력 "+D.gearAttributes(it,0).attack.toFixed(1);}
function itemMarkup(it) {
  if(it.kind==="consumable")return `<div class="consumable-market-icon">◆</div><div class="item-info"><strong>${esc(D.MATERIALS[it.key]||it.key)}</strong><p>남은 ${fmt(it.quantity)}개 · 소모품</p></div>`;
  return `${gearMarkup(it)}<div class="item-info"><strong>${esc(D.gearName(it))} ${it.locked ? "[잠금]" : ""}</strong><p>${requiredLevel(it.level)} · ${D.CLASSES.find((c) => c.id === it.classId).name} · ${D.equipmentType(it)} ${Object.values(state.equipped).includes(it.id) ? "· 장착 중" : ""}</p><span class="stars">${it.broken ? "파괴된 장비 흔적" : it.stars + "성"}</span> <span class="quality-badge">${gearRollLabel(it)}</span> <span class="potential-grade grade-color-${it.grade}">${it.lines.length ? D.RARITIES[it.grade] : "잠재 미개방"}</span></div>`;
}
function bagGroupsMarkup(groups){
 const items=groups.flatMap(g=>g.slots.flatMap(v=>v.items)),stackMap=new Map();for(const item of items){const key=salvageMode?item.id:D.equipmentKey(item);if(!stackMap.has(key))stackMap.set(key,[]);stackMap.get(key).push(item);}
 const stacks=[...stackMap.values()],pageSize=window.matchMedia('(max-width:700px)').matches?12:24,pages=Math.max(1,Math.ceil(stacks.length/pageSize));bagPage=Math.min(bagPage,pages-1);
 return '<div class="bag-pager">'+disabledBtn('이전','bagPage',bagPage-1,bagPage===0)+'<strong>'+(bagPage+1)+' / '+pages+' · '+stacks.length+'종 / '+items.length+'개</strong>'+disabledBtn('다음','bagPage',bagPage+1,bagPage>=pages-1)+'</div><div class="inventory-grid bag-grid">'+(stacks.slice(bagPage*pageSize,(bagPage+1)*pageSize).map(stack=>{let tile=bagTile(stack[0]);if(!salvageMode)tile=tile.replace('data-action="item"','data-action="itemGroup"').replace('</button>','<b class="bag-stack-count">보유 '+stack.length+'개</b></button>');if(!salvageMode&&stack.length>1){const stars=stack.map(x=>x.stars),lo=Math.min(...stars),hi=Math.max(...stars);tile=tile.replace(/<span class="tile-star">[^<]*<\/span>/,'<span class="tile-star">'+(lo===hi?lo:lo+'~'+hi)+'★</span>');}return tile;}).join('')||'<div class="empty">장비가 없습니다.</div>')+'</div>';
}
function itemGroup(id){const first=state.items.find(x=>x.id===id);if(!first)return;const equipped=new Set(Object.values(state.equipped));const items=state.items.filter(x=>D.equipmentKey(x)===D.equipmentKey(first)).sort((a,b)=>Number(equipped.has(b.id))-Number(equipped.has(a.id)));if(items.length===1)return itemDetail(id);open(D.gearName(first)+' · '+items.length+'개','<p class="note">강화·잠재는 각각 유지됩니다. 사용할 장비를 고르세요.</p><div class="stack">'+items.map(it=>'<button data-action="item" data-arg="'+it.id+'" class="stack-equipment">'+itemMarkup(it)+'<small>'+it.lines.map(l=>D.OPTIONS[l.key]+' +'+l.value+D.optionUnit(l.key)).join(' · ')+'</small></button>').join('')+'</div>');}

function bagTile(item) {
  const otherClass=item.classId!==state.classId;
  return btn(gearMarkup(item)+`<span class="tile-meta"><span class="tile-level">${requiredLevel(item.level,"Lv."+item.level)}</span><span class="tile-star">${item.stars}★</span></span><span class="tile-name ${otherClass?"other-class":""}">${esc(D.gearName(item))}</span><span class="tile-class ${otherClass?"other-class":""}">${esc(D.CLASSES.find(c=>c.id===item.classId)?.name||item.classId)} 전용</span><span class="tile-quality">${gearRollLabel(item)}</span><span class="sr-only">${D.equipmentType(item)} ${item.locked?"잠금":""}</span>`, salvageMode?"salvagePick":"item", item.id, `bag-slot ${item.boss?"boss-gear":""} ${salvageMode?(salvageSelection.has(item.id)?"salvage-selected":!canSalvage(item)?"salvage-unavailable":""):""} ${Object.values(state.equipped).includes(item.id)?"equipped":""} ${item.locked?"locked":""}`);
}
function inventory() {
  for(const id of salvageSelection)if(!state.items.some(it=>it.id===id&&canSalvage(it)))salvageSelection.delete(id);
  const groups = inventoryGroups(state.items, D.CLASSES, state.classId, Object.values(state.equipped), filterClass, filterSlot);
  return `${header("가방", "INVENTORY")}<div class="subnav">${[
    ["bag", "가방"],
    ["exchange", "교환소"],
    ["mail", "보관함"],
    ["collection", "도감"],
    ["odds", "확률표"],
  ]
    .map(([k, l]) => btn(l, "gearSub", k, sub === k ? "active" : ""))
    .join(
      "",
    )}</div>${sub === "exchange" ? gearExchange() : sub === "odds" ? odds() : sub === "mail" ? mailbox() : sub === "collection" ? collection() : `${supplies()}<section class="auto-equip-card"><div><strong>전투력 기준 최적 장착</strong><small>현재 전투력 ${fmt(power(state).combatPower)} · 장비·잠재 합산</small></div>${disabledBtn("최적 장착","autoEquip","",!!state.battle||!!state.partyRoom||!!state.pendingCube,"gold")}<p>${state.pendingCube?"큐브 옵션 선택을 먼저 완료해 주세요.":state.battle||state.partyRoom?"전투·파티를 종료한 뒤 사용할 수 있습니다.":"가방 전체에서 착용 가능한 장비를 비교합니다. 잠금 장비도 포함됩니다."}</p></section><div class="filters"><select data-filter="slot"><option value="">모든 부위</option>${D.SLOTS.map((v, i) => `<option value="${i}" ${String(i) === filterSlot ? "selected" : ""}>${v}</option>`).join("")}</select><select data-filter="class"><option value="">모든 직업</option>${D.CLASSES.map((c) => `<option value="${c.id}" ${c.id === filterClass ? "selected" : ""}>${c.name}</option>`).join("")}</select></div><p class="note">9부위 장착 · 직업별 무기 ${D.WEAPON_TYPES[state.classId].join("·")}<br>가방 ${state.items.length}/300 · 장착 장비 먼저 → 내 직업 → 부위별 정렬</p><div class="actions">${btn(salvageMode?"선택 분해 종료":"선택 분해","salvageMode")}${salvageMode?btn("필터 장비 선택 (최대 50개)","salvageSelectVisible")+btn("선택 해제","salvageClear")+disabledBtn("선택 "+salvageSelection.size+"개 분해","salvageBatchConfirm","",!salvageSelection.size||!!state.battle||!!state.partyRoom,"danger"):""}</div>${salvageMode?`<p class="note">장비를 눌러 선택하세요. 장착·잠금·파괴·큐브 선택 중인 장비는 제외됩니다.</p>`:""}<div class="bag-groups">${bagGroupsMarkup(groups)}</div>`}`;
}
function gearExchange(){
 const classId=exchangeClass||state.classId;
 return `<section class="panel pad gear-exchange"><h3>장비 파편 교환소</h3><p class="note">직업과 레벨을 선택하면 일반 장비 1개를 받습니다. 보스 장비는 나오지 않습니다.</p><label for="exchange-class">장비 직업</label><select id="exchange-class">${D.CLASSES.map(c=>`<option value="${c.id}" ${c.id===classId?'selected':''}>${c.name}</option>`).join('')}</select><label for="exchange-level">장비 레벨 · 파편 비용</label><select id="exchange-level">${Array.from({length:18},(_,i)=>(i+1)*10).map(level=>`<option value="${level}" ${level===exchangeLevel?'selected':''}>Lv.${level} 장비 · 파편 ${level}개</option>`).join('')}</select><p>보유 장비 파편 <strong>${fmt(state.materials.fragment)}개</strong></p>${disabledBtn(gearMarkup({level:exchangeLevel,classId,slot:0,boss:false,design:0,weaponVariant:0})+`<strong>Lv.${exchangeLevel} 랜덤 장비 교환</strong><small>파편 ${exchangeLevel}개 사용 · 장비 1개 획득</small>`,"exchangeGear",exchangeLevel,state.materials.fragment<exchangeLevel||!!state.battle||!!state.coopRoom,"exchange-card")}<p class="note">이미지는 무기 예시입니다. 9부위는 각각 1/9 확률, 각 부위의 일반 장비 2종은 각각 50% 확률입니다. 기본 능력치는 무작위이며 잠재는 잠긴 상태로 지급됩니다. 가방이 가득 차면 보관함으로 받습니다.</p></section>`;
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
  const art = D.equipmentIdentity(it),frameClass=`gear-frame ${size} ${it.boss?"boss-gear":""}`;
  if(art.grid)return `<span class="${frameClass}"><span class="gear-icon" role="img" aria-label="${esc(it.boss?"보스 장비 "+art.name:art.name)}" style="display:block;width:100%;height:100%;background-image:url('${art.art}');background-size:${art.columns*100}% ${art.rows*100}%;background-position:${art.column/(art.columns-1)*100}% ${art.row/(art.rows-1)*100}%;background-repeat:no-repeat"></span></span>`;
  const bounds=equipmentBounds[art.art.split('/').pop()];
  const ys=bounds.cellY[art.column],cell=bounds.cells?.[art.column]?.[art.row]; const [x,y,w,h]=cell||[bounds.x[art.column],ys[art.row],bounds.x[art.column+1]-bounds.x[art.column],ys[art.row+1]-ys[art.row]];
  const clipId='gear-clip-'+(++gearClipId),clip=cell?.[4]?`<defs><clipPath id="${clipId}"><polygon points="${cell[4]}"/></clipPath></defs>`:'';
  return '<span class="'+frameClass+'"><svg class="gear-icon" role="img" aria-label="'+esc(it.boss?'보스 장비 '+art.name:art.name)+'" viewBox="'+[x,y,w,h].join(' ')+'" overflow="hidden" preserveAspectRatio="xMidYMid meet"><svg x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" viewBox="'+[x,y,w,h].join(' ')+'" overflow="hidden"><image href="'+art.art+'" width="'+bounds.width+'" height="'+bounds.height+'" preserveAspectRatio="none" '+(clip?'clip-path="url(#'+clipId+')"':'')+'/>'+clip+'</svg></svg></span>';
}
function bossMarkup(b, size="") {
  if(b.weekly)return `<div class="boss-sprite ${size}" style="background-image:url(tower/boss-${TOWER_FLOORS[b.region].art}.webp);background-size:300% 100%;background-position:left center" role="img" aria-label="${esc(b.name)}"></div>`;
  if(b.fullArt) return `<img class="boss-sprite ${size}" src="${b.art}" alt="${esc(b.name)}" style="object-fit:contain">`;
  return '<div class="boss-sprite '+size+'" role="img" aria-label="'+esc(b.name)+'" style="background-image:url('+b.art+');background-position:'+b.spriteX+'% '+b.spriteY+'%"></div>';
}
function monsterMarkup(m) {
  return '<img class="monster-sprite" src="'+m.art+'" alt="'+esc(m.name)+'" draggable="false">';
}
function mailbox() {
  return '<p class="note">가방이 가득 찼을 때 얻은 장비를 보관합니다. 보관 기한은 없으며 한 번에 최대 50개를 꺼낼 수 있어요.</p><div class="stack">'+((state.mailbox||[]).map(m=>'<div class="panel pad"><div class="item">'+itemMarkup(m.item)+'</div><p>'+m.quantity+'개 보관</p>'+btn('가방으로 받기','claimMail',m.key,'gold',true)+'</div>').join('')||'<div class="empty">보관 중인 장비가 없습니다.</div>')+'</div>';
}
function collection() {
  const keys = state.collection||[];
  return '<p class="note">발견한 장비 '+keys.length+' / '+D.EQUIPMENT_CATALOG.length+'종 · 획득 기록은 장비를 판매하거나 분해해도 유지됩니다.</p><div class="inventory-grid stack">'+keys.map(key=>{const entry=D.equipmentFromKey(key);return '<div class="panel pad item">'+itemMarkup({...entry,stars:0,lines:[],grade:0})+'</div>';}).join('')+'</div>';
}
const bossMaterialNames = ["생명의 나무 심장", "월광의 뿔", "고대 수정 광석", "용암의 핵", "망령 왕가의 인장", "빙룡의 비늘", "태양의 풍뎅이", "천공의 깃털", "시간의 톱니", "심연의 왕관 파편"];
function materialMarkup(region) {
  return `<span class="material-icon" role="img" aria-label="${bossMaterialNames[region]}" style="background-position:${region%5*25}% ${Math.floor(region/5)*100}%"></span>`;
}
function odds() {
  return `<div class="panel pad"><h3>스타포스 · 최대 25성</h3><p class="note">실패해도 현재 별을 유지합니다. 하락·파괴 확률은 0%입니다.</p><table><tr><th>목표</th><th>성공</th><th>유지</th><th>하락</th><th>파괴</th></tr>${D.STAR_SUCCESS.map(
    (_, n) => {
      const o = D.starOdds(n);
      return `<tr><td>${n + 1}성</td><td>${pct(o.success)}</td><td>${pct(o.keep)}</td><td>${pct(o.down)}</td><td>${pct(o.destroy)}</td></tr>`;
    },
  ).join(
    "",
  )}</table></div>${cubeGuide()}<div class="panel pad"><h3>일반 사냥 드롭 · 온라인/오프라인 동일</h3><p class="note">처치마다 독립 추첨: 일반 장비 ${pct(D.EQUIP_DROP)}, 보스 장비 ${pct(D.FIELD_BOSS_DROP)}, 레드 큐브 ${pct(D.CUBE_DROP)}, 잠재 주문서 ${pct(D.SCROLL_DROP)}, 파편 ${pct(D.FRAGMENT_DROP)}.<br>장비 직업은 5개 직업 중 각각 20% 확률로 무작위 추첨합니다. 부위는 9종 균등입니다. 부위마다 4~6종의 개별 장비를 추첨합니다. 4종은 약한 순서로 60/28/11/1%, 5종은 50/28/15/6/1%, 6종은 44/26/16/9/4/1%입니다. 무기 종류의 구성은 레벨마다 달라집니다. 보스 드롭은 보스 탭에 표시합니다.</p><table><tr><th>사냥터 지역</th><th>장비 레벨<br>일반 / 보스</th><th>일반 / 보스 확률</th></tr>${D.REGIONS.map(r=>`<tr><td>${r.name} · 3개 사냥터 공통</td><td>${gearLevelRange(D.TIERS[r.id])} / ${gearLevelRange(D.TIERS[r.id])}</td><td>${pct(D.EQUIP_DROP)} / ${pct(D.FIELD_BOSS_DROP)}</td></tr>`).join('')}</table><p class="note">지역 안의 몬스터별 확률은 같습니다. 장비는 1·10·20·30…200레벨만 새로 생성됩니다. 일반 사냥 장비는 사냥터와 캐릭터 레벨 이하로 제한됩니다. 상위 레벨 장비는 상위 콘텐츠에서 획득합니다. 기존 장비도 1·10·20…200레벨로 보정하며 강화·잠재·잠금은 유지합니다. 오프라인 최대 6시간 동안 실제 처치 수에 동일 확률로 추첨하며, 가방 초과 장비는 기본 수치별로 보관합니다.</p><h3>신규 장비 기본 수치</h3><p class="note">각 개별 장비에는 고유 이름과 수치 범위가 있습니다.  장비 종류에 따라 정해진 범위에서 공격력·주스탯·HP·방어력을 각각 추첨합니다. 범위 하위 50% 구간 75%, 다음 40% 구간 24%, 최상위 10% 구간 1%로 추첨한 뒤 정수로 확정합니다. 범위가 좁으면 반올림으로 구간의 수치가 겹칠 수 있습니다. 보스 장비는 더 높은 별도 범위를 사용합니다.</p></div>`;
}
function disabledBtn(label,action,arg,blocked=false,cls="") {
  const html=btn(label,action,arg,cls,true);
  return blocked ? html.replace("<button ","<button disabled data-unavailable ") : html;
}
function combatSkillButtons(party=false) {
 const me=party?partyRoom?.members.find(m=>m.mine):null;
 return [1,2,3,4].map(slot=>{const sk=slot===4?D.FOURTH_SKILLS[state.classId]:slot===1?D.CLASS_SKILLS[state.classId]:slot===2?D.SECOND_SKILLS[state.classId]:D.THIRD_SKILLS[state.classId],locked=slot===1?!D.firstJobUnlocked(state):(state.advancement||0)<slot-1;
 return '<button class="gold skill-button" data-action="'+(party?'partySkill':'skill')+'" data-arg="'+slot+'" data-skill-slot="'+slot+'" '+(locked||me?.hp<=0?'disabled':'')+' title="'+esc(sk.description)+'">'+(locked?slot+'차 전직 후 · ':slot+'차 · ')+sk.name+'</button>';}).join('');
}
function skillGuide(){return '<div class="skill-guide">'+[1,2,3,4].map(slot=>{const sk=slot===4?D.FOURTH_SKILLS[state.classId]:slot===1?D.CLASS_SKILLS[state.classId]:slot===2?D.SECOND_SKILLS[state.classId]:D.THIRD_SKILLS[state.classId];return '<p><b>'+slot+'차 · '+sk.name+'</b> · 쿨타임 '+sk.cooldown+'초<br><small>'+sk.description+((slot===1?!D.firstJobUnlocked(state):(state.advancement||0)<slot-1)?' · '+(slot===1?30:slot===2?60:slot===3?100:150)+'레벨 전직 보스 처치 후 해금':'')+'</small></p>';}).join('')+'</div>';}
function recentLoot(){return '<section class="panel pad recent-loot"><h3>최근 사냥 획득 · 최신 5개</h3><p class="note">아이템 획득 시 갱신 · 같은 정산의 재료는 수량 합산</p>'+((state.recentLoot||[]).map(x=>'<div class="loot-row">'+(x.kind==='gear'?gearMarkup(x.item):'<span class="loot-icon">◆</span>')+'<span>'+(x.kind==='gear'?esc(D.gearName(x.item)):esc(D.MATERIALS[x.key]))+' <b>×'+x.quantity+'</b><small>'+new Date(x.at).toLocaleTimeString('ko-KR')+' · '+esc(D.STAGES[x.stage]?.name||'사냥')+'</small></span></div>').join('')||'<p class="note">아직 획득한 아이템이 없습니다.</p>')+'</section>';}

function advancementLobby(){const done=D.jobStage(state);return header('전직의 시련','CLASS ASCENSION')+'<section class="panel pad"><p>1차 30레벨 · 2차 60레벨 · 3차 100레벨 · 4차 150레벨. 전용 보스를 직접 처치하면 즉시 전직합니다.</p><p class="note">120초 제한 · 완료한 전직 보스도 연습 가능 · 연습은 추가 보상 없음 · 전직마다 공격력·최대 체력 10% 증가 (4회 누적 46.41%) · 기존 2차 전직 유지</p></section><div class="advancement-boss-list">'+D.ADVANCEMENT_BOSSES.map(t=>{const cleared=done>t.stage,locked=done<t.stage||state.level<t.level;return '<article class="panel pad advancement-boss"><div class="tower-portrait" style="background-image:url(\'tower/boss-'+t.art+'.webp\')"></div><div><small>'+(t.stage+1)+'차 전직 · Lv.'+t.level+'</small><h3>'+t.name+'</h3><p>HP '+fmt(t.hp)+' · 제한 '+t.seconds+'초</p><p class="note">'+t.guide+'</p><strong>해금: '+(t.stage===3?D.FOURTH_SKILLS[state.classId].name:t.stage===2?D.THIRD_SKILLS[state.classId].name:t.stage===1?D.SECOND_SKILLS[state.classId].name:D.CLASS_SKILLS[state.classId].name)+'</strong><div class="actions">'+disabledBtn(cleared?'연습 입장':locked?'레벨·이전 전직 필요':'전직 보스 도전','advancementStart',t.stage,locked,'gold')+'</div></div></article>';}).join('')+'</div>';}
function bosses() {
  const menu=`<div class="subnav">${[["daily","일일"],["weekly","주간"],["coop","협동 균열"],["wave","협동 웨이브"],["tower","시련의 탑"],["advancement","전직 보스"]].map(([k,l])=>btn(l,"bossSub",k,bossTab===k?"active":"")).join("")}</div>`;
  if(bossTab==="wave")return menu+coopLobby(state,coopRoom,coopRooms,"wave");
  if(bossTab==="coop")return menu+coopLobby(state,coopRoom,coopRooms);
  if(bossTab==="tower")return menu+towerLobby(state);
  if(bossTab==="advancement")return menu+advancementLobby();
  return header("보스 토벌","BOSS CHALLENGE")+menu+`<p class="note compact-note">입장 조건 없음 · 주간 보스별 주 1회 보상 · 월요일 00시 갱신 · 일일 보스별 하루 1회 도전 · 매일 00시 갱신</p><div class="boss-list">${D.BOSSES.filter(b=>b.weekly===(bossTab==="weekly")).map(b=>bossCard(b)).join("")}</div>`;
}
function bossCard(b) {
  const claimed=!state.isAdmin&&(b.weekly?state.bossClaims?.[b.id]===D.weekKey(Date.now()):state.bossAttempts?.[b.id]===D.dayKey(Date.now())||state.bossClaims?.[b.id]===D.dayKey(Date.now()));
  const locked=false;
  return `<section class="panel boss-card"><div class="boss-thumb" style="background-image:url('${D.REGIONS[b.region].background}')">${bossMarkup(b)}</div><div class="boss-card-body"><div class="row spread"><strong>${b.name}</strong><span class="count-badge ${claimed?"used":""}">${b.weekly?(claimed?"이번 주 보상 완료":"이번 주 보상 1회 남음"):(claimed?"오늘 도전 완료":"오늘 도전 1회 남음")}</span></div><small>권장 Lv.${b.level} · HP ${fmt(b.hp)} · ${b.seconds/60}분</small><div class="actions">${disabledBtn(claimed?(b.weekly?"보상 완료":"도전 완료"):locked?"입장 조건":"보상 도전","bossStart",b.id,claimed||locked,"gold")}${disabledBtn("연습 ∞","bossPractice",b.id,locked)}</div><details><summary>보상 · 권장 장비</summary><p class="note">레벨·스타포스·선행 보스 제한 없음<br>${b.weekly?"Lv."+(b.gearLevel-10)+" / "+b.gearLevel:gearLevelRange(b.gearLevel)} 보스 장비 ${pct(b.dropChance)}<br>${fmt(b.gold)} G · 레드 큐브 ${b.cubes}${b.weekly?" · 블랙 큐브 2":""}<br>권장: ${b.recommended.slots}부위 ${b.recommended.stars}성 ${b.recommended.boss?"보스":"일반"} 장비${b.recommended.pot?" · 일반 주스탯 잠재 합계 18%":""}<br>${b.weekly?"직접 이동 전투 · 처치 후 바닥 상자 개봉":"하루 1회 도전 · 입장 시 차감 · 패배해도 차감 · 승리 시 보상"} · 연습은 보상 없음</p></details></div></section>`;
}
function partyPanel() {
 if(!partyRoom)return header('협동 토벌')+'<div class="panel pad">파티 정보를 불러오는 중…</div>';
 const r=partyRoom,b=D.raidBoss(r.bossId)||D.BOSSES[r.bossId],me=r.members.find(m=>m.mine),total=r.members.reduce((n,m)=>n+Number(m.damage),0),fighting=r.status==='fighting';
 return `${header(b.name,'CO-OP RAID · '+(r.practice?'연습':'보상 도전'))}<section class="panel"><div class="arena party-arena" data-class="${state.classId}" style="background-image:url('ui/dawn-ruins.svg')"><div class="battle-head"><small>전투 제한 ${b.seconds}초 · <b id="battle-timer">${fighting?'남은 '+Math.max(0,r.seconds-r.tick)+'초':'파티원 모집 중'}</b></small><h3>${b.name}</h3>${fighting?`<div class="hp"><i style="width:${r.hp/r.maxHp*100}%"></i></div><small>${fmt(r.hp)} / ${fmt(r.maxHp)}</small>`:''}</div><div class="monster">${bossMarkup(b)}</div><div class="combat-status"><span class="pill">${fighting?b.pattern:'1명부터 출발 가능 · 4인 기준 난이도'}</span></div></div><div class="pad"><div class="party-members">${r.members.map(m=>`<div class="party-member ${m.hp<=0?'fallen':''}"><div class="row spread"><strong>${esc(m.name)}${m.mine?' · 나':''}</strong><small>${m.departed?'이탈':m.hp<=0?'쓰러짐':D.CLASSES.find(c=>c.id===m.classId)?.name}</small></div><div class="hp"><i style="width:${Math.max(0,m.hp/m.maxHp*100)}%"></i></div><small>${fmt(m.hp)}/${fmt(m.maxHp)} · 기여 ${total?(Number(m.damage)/total*100).toFixed(1):'0.0'}%</small></div>`).join('')}</div><div class="actions">${fighting?(me?.hp<=0?disabledBtn(me.revived?'부활 사용 완료':'부활 · HP 30%','partyRevive','',me.revived,'gold'):combatSkillButtons(true)):r.isHost?btn('출발 · '+r.members.filter(m=>!m.departed).length+'명','partyStart','','gold'):''}${btn('파티 나가기','partyLeaveConfirm','','danger')}</div>${skillGuide()}<p class="note">전투 중 일반 사냥 중지 · 종료 후 자동사냥 재개</p></div></section>`;
}
function supplies(){return '<div class="bag-supplies" data-currency-label>'+Object.entries(D.MATERIALS).map(([key,name])=>'<div><img src="'+currencyIconURL(key)+'" alt=""><span>'+name+'<b>'+fmt(state.materials[key]||0)+'개</b></span></div>').join('')+'</div><p class="note"><a href="probability-guide.html" target="_blank" rel="noopener">전체 확률표</a> · <a href="boss-equipment.html" target="_blank" rel="noopener">보스 장비 목록</a></p>';}

let rankingAttempt=0, rankingRevision=0;
async function loadRankings(quiet=false) {
  if (rankingLoading) return;
  if(busy){if(view==="ranking")render();return;}
  rankingAttempt=Date.now();
  const requestId=++rankingRequest;
  rankingLoading=true;rankingError="";if(!quiet)render();
  try {
    if(!quiet)await command("sync",{},true);
    await ensureToken();
    const revision=rankingRevision;
    const rows=await request("/rest/v1/rpc/rebirth_rankings",{});
    if(requestId!==rankingRequest)return;
    if(revision!==rankingRevision){rankingAttempt=0;return;}
    rankingRows=rows;rankingUpdated=Date.now();
  } catch(err) { rankingError=message(err); }
  finally { if(requestId===rankingRequest){rankingLoading=false;if(view==="ranking")render();} }
}
function rankings() {
  const combat=rankingMode==="combat",rankKey=combat?"combatRank":"levelRank",label=combat?"전투력":"레벨";
  const rows=rankingRows.filter(r=>r[rankKey]<=100).sort((a,b)=>a[rankKey]-b[rankKey]),me=rankingRows.find(r=>r.isMe);
  const className=r=>r.advancement>=3?D.FOURTH_NAMES[r.classId]:r.advancement>=2?D.THIRD_NAMES[r.classId]:r.advancement?D.ADVANCEMENTS[r.classId]:D.CLASSES.find(c=>c.id===r.classId)?.name||"모험가";
  const score=r=>combat?fmt(r.combatPower):"Lv. "+r.level;
  const portrait=r=>`<div class="rank-portrait portrait" style="background-position:${Math.max(0,D.CLASSES.findIndex(c=>c.id===r.classId))*25}% 0" aria-hidden="true"></div>`;
  const podium=rows.slice(0,3).map(r=>`<article class="rank-podium rank-place-${r[rankKey]} ${r.isMe?"is-me":""}"><span class="podium-place">${r[rankKey]===1?"♛":"◆"} ${r[rankKey]}위</span>${portrait(r)}<strong title="${esc(r.name)}">${esc(r.name)}</strong><small>${className(r)}${r.isMe?" · 나":""}</small><b>${score(r)}</b><span class="podium-secondary">${combat?"Lv. "+r.level:"전투력 "+fmt(r.combatPower)}</span></article>`).join("");
  return header("모험가 랭킹","HALL OF ADVENTURERS")+`<section class="ranking-view"><div class="ranking-toolbar">${btn("← 캐릭터","back")}${btn(rankingLoading?"불러오는 중…":"↻ 새로고침","rankingRefresh","",rankingLoading?"rank-refresh loading":"rank-refresh")}</div><div class="ranking-tabs" role="group" aria-label="랭킹 기준">${[ ["level","레벨 순위","모험의 깊이"],["combat","전투력 순위","성장의 힘"] ].map(([key,name,desc])=>`<button data-action="rankingMode" data-arg="${key}" aria-pressed="${rankingMode===key}" class="${rankingMode===key?"active":""}"><strong>${name}</strong><small>${desc}</small></button>`).join("")}</div><div class="ranking-meta"><span>전체 ${fmt(rankingRows[0]?.total||0)}명 · TOP 100</span><span>${rankingUpdated?new Date(rankingUpdated).toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit"})+" 조회 · 10초 자동 갱신":"서버 기록 기준 · 10초 자동 갱신"}</span></div>${rankingError?`<div class="panel pad rank-error" role="alert">순위를 불러오지 못했습니다. ${esc(rankingError)}${btn("다시 시도","rankingRefresh")}</div>`:""}${rankingLoading&&!rankingRows.length?'<div class="panel pad rank-empty" role="status">모험가들의 기록을 모으고 있어요…</div>':rows.length?`<div class="rank-podium-grid">${podium}</div>`:!rankingError?'<div class="panel pad rank-empty">아직 등록된 모험가가 없습니다.</div>':""}<section class="rank-my-card"><span class="rank-my-label">MY RANK</span><div><strong>${state.isAdmin?"랭킹 제외":me?me[rankKey]+"위":"집계 대기"}</strong><span>${esc(state.name)}<small>${label} ${me?score(me):"—"}</small></span></div><p>${me?`레벨 ${me.levelRank}위 · 전투력 ${me.combatRank}위`:state.isAdmin?"관리자 계정은 순위에 포함되지 않습니다.":"캐릭터 기록이 저장되면 순위에 표시됩니다."}</p></section>${rows.length?`<section class="rank-list"><div class="rank-list-head"><span>순위 · 모험가</span><span>${label}</span></div>${rows.map(r=>`<div class="rank-list-row ${r.isMe?"is-me":""}"><span class="rank-number ${r[rankKey]<=3?"medal":""}">${r[rankKey]}</span>${portrait(r)}<div class="rank-person"><strong>${esc(r.name)}${r.isMe?'<i>나</i>':""}</strong><small>${className(r)} · ${combat?"Lv. "+r.level:"전투력 "+fmt(r.combatPower)}</small></div><b class="rank-score">${score(r)}</b></div>`).join("")}</section>`:""}<details class="rank-rules"><summary>순위 집계 기준</summary><p>레벨 순위: 레벨 → 현재 경험치 순.<br>전투력 순위: 전투력 → 레벨 → 현재 경험치 순.<br>모두 같으면 고정된 계정 순서로 표시합니다.</p><p>마지막 서버 저장 기록을 기준으로 조회합니다. 전투력은 캐릭터 창과 같은 계산식을 사용하며, 일시적인 스킬 효과와 골드·경험치 획득 보너스는 제외합니다.</p></details></section>`;
}
function journal() {
  const goals=[["첫 토벌",state.cleared.length,1,"보스 첫 처치"],["장비 수집가",state.collection.length,50,"서로 다른 장비 50종 발견"],["직업의 길",D.firstJobUnlocked(state)?1:0,1,requiredLevel(30)+" · 수정 문지기 처치 후 전직"],["숙련 모험가",state.level,100,requiredLevel(100,"100레벨 달성")],["왕좌를 넘어",state.cleared.length,30,"멸신왕 벨제리온 처치"],["새벽의 탐험가",state.dungeonClaims.relic?1:0,1,"여명의 폐허 클리어"]];
  return header("모험 수첩","나의 성장 기록")+btn("돌아가기","back")+`<div class="journal-banner"><h2>다음 이야기는<br>네 모험으로 채워져.</h2></div><div class="goal-grid">${goals.map(([name,value,max,desc])=>`<section class="panel pad"><div class="row spread"><strong>${name}</strong><span class="pill">${value>=max?"달성":Math.min(value,max)+"/"+max}</span></div><p class="note">${desc}</p><div class="exp"><i style="width:${Math.min(100,value/max*100)}%"></i></div></section>`).join("")}</div>`;
}
function marketTile(l) {
  const it=l.item,consumable=it.kind==="consumable";
  const name=consumable?D.MATERIALS[it.key]:D.gearName(it);
  return `<button class="market-compact-card ${!consumable&&it.boss?"boss-gear":""}" data-action="marketConfirm" data-arg="${l.id}" aria-label="${esc(name)} 상세 보기"><span class="market-card-meta">${consumable?"소모품":requiredLevel(it.level)}<b>${consumable?fmt(it.quantity)+"개":it.stars+"★"}</b></span>${consumable?'<img class="material-tile-image" src="'+currencyIconURL(it.key)+'" alt="">':gearMarkup(it)}<strong class="market-card-name">${esc(name)}</strong><small>${consumable?"남은 "+fmt(it.quantity)+"개":D.CLASSES.find(c=>c.id===it.classId).name+" · "+gearRollLabel(it)}</small><b class="market-card-price">${fmt(l.price)} G${consumable?" / 개":""}</b><span class="market-card-status">${l.status==="open"?(l.own?"판매 중 · 상세":"상세 보기"):l.status==="sold"?"판매 완료":"회수 완료"}</span></button>`;
}
function gearRollDetails(it){if(!it.baseStats)return "";const ranges=D.gearStatRanges(it);return `<section class="panel pad"><h4>획득 시 확정된 기본 수치</h4>${Object.entries({attack:"공격력",stat:"주스탯",hp:"HP",defense:"방어력"}).map(([key,label])=>`<p>${label} <strong>${fmt(it.baseStats[key])}</strong> ${it.legacyBaseStats?"":`<small>(가능 범위 ${fmt(ranges[key].min)}~${fmt(ranges[key].max)})</small>`}</p>`).join("")}<p class="note">강화 전 수치입니다. ${it.legacyBaseStats?"기존 장비 성능을 보존한 수치입니다.":"각 능력치는 따로 추첨되며 높은 구간일수록 희귀합니다."} 큐브 재감정으로 기본 수치는 바뀌지 않습니다.</p></section>`;}
function gearStatsMarkup(it) {
  const a=D.gearAttributes(it),cl=D.CLASSES.find(c=>c.id===it.classId);
  return `<div class="market-picked-stats gear-base-stats">${[["공격력",a.attack.toFixed(1)],[cl.stat,fmt(a.stat)],["최대 HP",fmt(a.hp)],["방어력",fmt(a.defense)]].map(([k,v])=>`<div><span>${k}</span><b>+${v}</b></div>`).join("")}</div><p class="note">장비 자체 능력치입니다. 기본 수치·스타포스 반영, 잠재는 아래 별도 표시.${it.broken?" 파괴된 장비는 장착 효과가 없습니다.":""}</p>`;
}
function marketGearDetails(it) {
  return `<div class="item">${itemMarkup(it)}</div>${gearStatsMarkup(it)}${gearRollDetails(it)}<div class="market-picked-options"><h4>잠재능력</h4>${it.lines.length?it.lines.map(l=>`<div class="grade-color-${l.grade}"><small>${D.RARITIES[l.grade]}</small><span>${D.OPTIONS[l.key]}</span><b>+${l.value}${D.optionUnit(l.key)}</b></div>`).join(""):'<p class="note">잠재 미개방</p>'}</div>`;
}
function market() {
  return `${header("거래소", "MARKET")}<div class="subnav">${btn("구매", "marketMode", "buy", !mine ? "active" : "")}${btn("내 판매", "marketMode", "mine", mine ? "active" : "")}${btn("장비 등록", "marketSell")}${btn("소모품 등록", "marketSellConsumables")}</div><div class="subnav">${[["all","전체"],["gear","장비"],["consumable","소모품"]].map(([key,label])=>btn(label,"marketKind",key,marketKind===key?"active":"")).join("")}</div><p class="note">구매·등록 ${requiredLevel(5)}부터 · 판매 수수료 5% · 등록 7일 · 최대 20건<br>만료 상품은 내 판매에서 남은 수량을 회수할 수 있습니다.</p><div class="filters" ${marketKind==="consumable"?'style="display:none"':""}><select data-filter="slot"><option value="">모든 부위</option>${D.SLOTS.map((v, i) => `<option value="${i}" ${String(i) === filterSlot ? "selected" : ""}>${v}</option>`).join("")}</select><select data-filter="class"><option value="">모든 직업</option>${D.CLASSES.map((c) => `<option value="${c.id}" ${c.id === filterClass ? "selected" : ""}>${c.name}</option>`).join("")}</select></div><div class="market-compact-grid">${
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
  if(modal.open&&modal.dataset.scrollKey)dialogScroll.set(modal.dataset.scrollKey,modal.scrollTop);
  const scrollKey=(selected||"")+"|"+title,preservedModalScroll=dialogScroll.get(scrollKey)||0;modal.dataset.scrollKey=scrollKey;
  modal.classList.remove("enhance-dialog", "market-picker-dialog", "attendance-dialog", "change-class-dialog");
  modal.innerHTML = `${closable ? btn("닫기", "close", "", "close") : ""}<h2 id="dialog-title">${title}</h2>${html}`;
  modal.setAttribute("aria-labelledby", "dialog-title");
  modal.scrollTop = preservedModalScroll;
  requestAnimationFrame(()=>{if(modal.open&&modal.dataset.scrollKey===scrollKey)modal.scrollTop=preservedModalScroll;});
  if (!modal.open) {
    sounds.play('ui-open');
    history.pushState({ modal: true }, "");
    modal.showModal();
  }
  modal.dataset.closable = String(closable);
  refreshLevelRequirements();
}
let cubeKind="cube", lastStarResult=null, lastCubeResult=null;
const enhanceIcon=(key)=>`<img class="enhance-currency" src="${currencyIconURL(key)}" alt="">`;
function enhancementBlock(it) {
  return it.broken?"파괴된 장비를 먼저 복구해 주세요.":it.locked?"장비 잠금을 해제해 주세요.":state.battle||state.partyRoom?"보스전 종료 후 이용할 수 있어요.":"";
}
function enhancementOptions(item,label="현재 잠재능력"){return potentialPanel(item,label);}
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

function baseStatsPanel(it){return gearRollDetails(it);}
function cubePanel(it){return renderCubePanel(it,state,cubeKind,lastCubeResult,enhancementBlock(it));}
function itemDetail(id, section=id===selected?itemSection:"info") {
  if(selected!==id){lastStarResult=null;lastCubeResult=null;}
  selected=id;itemSection=section;
  const it=state.items.find(x=>x.id===id);if(!it)return;
  const p=power(state),next=power({...state,equipped:{...state.equipped,[it.slot]:it.id}}),equipped=Object.values(state.equipped).includes(id),o=D.starOdds(it.stars);
  const comparison=it.classId===state.classId&&it.level<=state.level&&!it.broken?`장착 시 공격력 ${fmt(next.attack)} (${next.attack-p.attack>=0?"+":""}${next.attack-p.attack}) · HP ${fmt(next.hp)}`:it.classId!==state.classId?`${D.CLASSES.find(c=>c.id===it.classId).name} 전용 장비입니다. 현재 직업으로는 착용할 수 없습니다. 장비 능력치는 직업에 관계없이 볼 수 있습니다.`:"착용 레벨과 장비 상태를 확인하세요.";
  let body="";
  if(section==="info")body=`${gearStatsMarkup(it)}${gearRollDetails(it)}<p class="note">${comparison}</p><p>${it.boss?"보스 장비":"일반 장비"} · ${it.bound?"거래 불가":it.locked?"잠금":"거래 가능"}</p><div class="actions">${btn(equipped?"장착 해제":"장착","equip",id,"gold",true)}${btn(it.locked?"잠금 해제":"잠금","lock",id,"",true)}${btn("분해","salvageConfirm",id,"danger")}</div><div class="potential">${it.lines.length?it.lines.map(l=>`<p class="grade-color-${l.grade}">[${D.RARITIES[l.grade]}] ${D.OPTIONS[l.key]} +${l.value}${D.optionUnit(l.key)}</p>`).join(""):"잠재 미개방"}</div>`;
  if(section==="star")body=starPanel(it);
  if(section==="potential")body=cubePanel(it);
  if(section==="baseStats")body=baseStatsPanel(it);
  open(section==="star"?"스타포스 강화":section==="potential"?"잠재능력 · 큐브":section==="baseStats"?"기본 수치":"장비 정보",`<div class="enhance-content" data-currency-label><div class="enhance-item-head">${gearMarkup(it)}<div><strong>${esc(D.gearName(it))}</strong><small>${requiredLevel(it.level)} · ${D.CLASSES.find(c=>c.id===it.classId).name} · ${D.equipmentType(it)} · ${it.broken?"파괴된 흔적":it.stars+"성"} · ${gearRollLabel(it)}</small></div></div><div class="enhance-tabs">${[["info","장비 정보"],["star","스타포스"],["potential","잠재 · 큐브"],["baseStats","기본 수치"]].map(([k,l])=>btn(l,"itemMode",id+":"+k,section===k?"active":"")).join("")}</div>${body}</div>`);
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
 selected=p.id;itemSection="potential";cubeKind=p.kind||(p.high?"highCube":"cube");
 open((D.CUBES[p.kind]?.name||"큐브")+" · 결과 선택",`<div class="enhance-content"><div class="enhance-item-head">${gearMarkup(it)}<div><strong>${esc(D.gearName(it))}</strong><small>등급과 옵션을 함께 선택하세요</small></div></div>${p.grade>p.previousGrade?`<div class="enhance-result success"><strong>${D.RARITIES[p.previousGrade]} → ${D.RARITIES[p.grade]}</strong><span>새 결과를 선택하면 등급 상승이 적용됩니다.</span></div>`:""}${cubePowerComparison(it,p)}<div class="cube-comparison">${enhancementOptions(it,"BEFORE · 이전")}${enhancementOptions(p,"AFTER · 이후")}</div><p class="enhance-help">선택에는 추가 비용이 들지 않습니다.${p.legacy?" 이전 방식에서 이미 오른 등급은 유지됩니다.":""}</p><div class="enhance-choice-actions">${btn("이전 결과 유지","cubeChoose","no","enhance-secondary",true)}${btn("새 결과 적용","cubeChoose","yes","enhance-primary",true)}</div><div class="enhance-choice-actions">${disabledBtn("이전 유지 후 다시","cubeChooseRepeat","no",!state.materials[cubeKind],"enhance-secondary")}${disabledBtn("새 결과 적용 후 다시","cubeChooseRepeat","yes",!state.materials[cubeKind],"enhance-primary")}</div></div>`,false);
 modal.classList.add("enhance-dialog");
}
function showEvents(events) {
  for (const e of events) {
    sounds.event(e);
    if (e.type === "attendance") {
      open(`${e.day}일차 출석 완료`, `<p class="attendance-claimed">${attendanceReward(e.reward)}</p><p class="note">보상이 가방과 재화에 지급됐어요.${e.day===7?" 내일부터 다시 1일차 보상을 받을 수 있어요.":""}</p><div class="actions">${btn("확인","close","","gold")}</div>`);
      modal.classList.add("attendance-dialog");
      continue;
    }
    if(e.type==="classChange") {rankingRows=[];rankingUpdated=0;toast(D.CLASSES.find(c=>c.id===e.to).name+"으로 직업을 변경했어요. 새 장비를 장착하고 사냥을 시작하세요.");}
    if(e.type==="autoEquip") {
      open("최적 장착 완료",`<div class="auto-equip-result"><span>${e.changed.length?e.changed.length+"개 부위 교체":"현재 장비 유지"}</span><div><b>${fmt(e.before)}</b><i>→</i><strong>${fmt(e.after)}</strong></div><p>전투력 +${fmt(e.after-e.before)}</p></div><p class="note">${e.changed.length?e.changed.map(slot=>D.SLOTS[slot]).join(" · ")+" 장비를 교체했습니다.":"이번 비교에서 더 높은 전투력 조합을 찾지 못해 현재 장비를 유지했습니다."}</p>`);
    }
    if(e.type==="daily")toast(e.name+" 보상을 받았습니다.");
    if(e.type==="coop"){tab="boss";bossTab=e.mode==="wave"?"wave":"coop";view="game";render();reward();continue;}
    if(e.type==="exchangeGear")open("장비 교환 완료",`${gearMarkup(e.item,"big-item")}<h3>${esc(D.gearName(e.item))}</h3><p>Lv.${e.item.level} · ${D.CLASSES.find(c=>c.id===e.item.classId).name} · ${D.SLOTS[e.item.slot]}</p><p>장비 파편 ${e.cost}개 사용 · ${e.stored?'보관함':'가방'}에 지급됐습니다.</p>${btn("확인","close","","gold")}`);
    if(e.type==="exchange")toast(D.MATERIALS[e.key]+" "+e.count+"개 교환 완료");
    if(e.type==="salvage")open("장비 분해 완료",`<p>장비 ${e.count}개를 분해했습니다.</p><p class="salvage-reward"><strong>장비 파편 ${fmt(e.fragments)}개 획득</strong></p><p class="note">현재 보유 ${fmt(state.materials.fragment)}개</p>${btn("확인","close","","gold")}`);

    if(e.type==='advancementTrial'){tab='boss';bossTab='advancement';view='game';render();advancementResult(e);continue;}
    if(e.type==='tower'){tab='boss';bossTab='tower';view='game';render();towerReward(e);continue;}
    if (e.type === "combat") continue;
    if (e.type === "skill") {
      const arena = $(".arena");
      if (arena && !settings.low) {
        const flash = document.createElement("div");
        flash.className = "skill-burst " + state.classId+(e.slot===4?" fourth-burst":e.slot===3?" third-burst":e.slot===2?" second-burst":"");if(e.slot===2)flash.style.setProperty("--third-col",D.THIRD_SKILLS[state.classId].art);if(e.slot===3)flash.style.setProperty("--third-col",D.THIRD_SKILLS[state.classId].art);
        flash.textContent = (e.slot===4?D.FOURTH_SKILLS:e.slot===3?D.THIRD_SKILLS:e.slot===2?D.SECOND_SKILLS:D.CLASS_SKILLS)[state.classId].name;
        arena.append(flash);
        setTimeout(()=>flash.remove(), e.slot===4?6000:e.slot===2?1200:900);
      }
    }
    if (e.type === "star") {
      lastStarResult=e;
      itemDetail(e.id,"star");
    } else if(e.type === "advancement") {open("전직 완료",`<div class="advancement-reveal"><h2>${D.ADVANCEMENTS[state.classId]}</h2><p>공격력 +10% · 최대 HP +10%</p></div>`);
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
function advancementResult(r){const t=D.ADVANCEMENT_BOSSES.find(t=>t.stage===r.stage);open(r.practice?(r.won?'전직 보스 연습 성공':'전직 보스 연습 종료'):r.won?(r.stage+1)+'차 전직 완료':'전직 도전 종료','<div class="advancement-reveal"><h2>'+t.name+'</h2><p>'+(r.practice?'연습 전투입니다. 전직·능력치·보상은 추가로 지급되지 않습니다.':r.won?'공격력 +10% · 최대 HP +10% · '+(r.stage===3?D.FOURTH_SKILLS[state.classId].name:r.stage===2?D.THIRD_SKILLS[state.classId].name:r.stage===1?D.SECOND_SKILLS[state.classId].name:D.CLASS_SKILLS[state.classId].name)+' 해금':'아직 시련을 넘지 못했습니다. 장비를 강화하고 다시 도전하세요.')+'</p></div>'+btn('확인','towerAck','','gold',true));}
function towerReward(r){const f=TOWER_FLOORS[r.floor-1];open(r.won?`${r.floor}층 돌파!`:'탑 도전 종료',`<div class="tower-result"><div class="tower-portrait" style="background-image:url('tower/boss-${f.art}.webp')"></div><h3>${f.name}</h3><p>${r.won?'클리어 '+r.seconds.toFixed(1)+'초':r.reason==='timeout'?'제한 시간이 끝났습니다.':r.reason==='leave'?'도전을 종료했습니다.':'쓰러졌습니다. 다시 도전할 수 있어요.'}</p><p>${r.gold?fmt(r.gold)+' G<br>큐브 '+r.cube+(r.highCube?' · 블랙 큐브 '+r.highCube:''):r.won?'최초 보상을 이미 받은 층입니다. 반복 보상은 없습니다.':'입장 횟수 제한 없이 재도전할 수 있습니다.'}</p><p class="note">일반 사냥이 다시 시작됐습니다.</p><div class="actions">${btn('확인','towerAck','','gold',true)}${r.won&&r.floor<10?btn('다음 층 도전','towerStart',r.floor+1,'',true):btn('다시 도전','towerStart',r.floor,'',true)}</div></div>`);}
function reward() {
  const r = state.lastReward;
  if(r?.type==='coop'&&r.mode==='wave')return open('협동 웨이브 종료','<h3>'+fmt(r.wave)+'웨이브 도달 · '+fmt(r.cleared)+'웨이브 생존</h3><p>처치 '+fmt(r.kills)+'마리 · '+(r.reason==='overrun'?'몬스터 100마리 누적':r.reason==='leave'?'도전 종료':'전원 사망')+'</p><p>'+fmt(r.gold)+' G · 레드 큐브 '+fmt(r.cube)+'개 · 잠재 해금 주문서 '+fmt(r.scroll)+'개</p><p>재도전은 항상 1웨이브부터 시작합니다.</p>'+btn('확인','ack','','gold',true));
  if(r?.type==='coop')return open(r.won?'개인 상자 획득':'균열 도전 종료','<p>'+(r.won?fmt(r.gold)+' G'+['cube','highCube','primeCube','fragment','scroll'].filter(k=>r[k]>0).map(k=>' · '+D.MATERIALS[k]+' '+r[k]+'개').join(''):'장비를 정비하고 다시 도전해 보세요.')+'</p>'+(r.items||[]).map(it=>'<p>'+esc(D.gearName(it))+' · Lv.'+it.level+' · 잠재 3줄 잠금 (가방이 가득 차면 보관함)</p>').join('')+btn('확인','ack','','gold',true));
  if(r?.type==='advancementTrial')return advancementResult(r);
  if(r?.type==='tower')return towerReward(r);
  const enemy = r && (r.type === "dungeon" ? D.DUNGEONS[r.dungeon] : r.type === "boss" ? D.BOSSES[r.bossId] : null);
  if (!r) return toast("새로 정산된 보상이 없습니다.");
  if(r.type==="party") {const b=D.raidBoss(r.bossId)||D.BOSSES[r.bossId],total=(r.members||[]).reduce((n,m)=>n+Number(m.damage),0);return open(r.won?"협동 토벌 완료":"협동전 종료",`${bossMarkup(b,"big-item")}<h3>${b.name}</h3><p>${r.practice?"연습 · 보상 없음":r.rewarded?(r.raid?fmt(r.gold)+" G · 파편 "+r.fragment+" · 큐브 "+r.cube+" · 블랙 큐브 "+r.highCube:"지역 재료 "+r.materials+" · 큐브 3 · 블랙 큐브 1")+" · 장비 "+r.items.length:"보상 횟수 차감 없음"}</p>${r.stored?'<p>장비는 보관함에 지급됐습니다.</p>':""}<div class="stack">${(r.members||[]).map(m=>`<div class="row spread"><span>${esc(m.name)}</span><b>기여 ${total?(m.damage/total*100).toFixed(1):"0.0"}%</b></div>`).join("")}</div><p class="note">자동사냥이 다시 시작됐습니다.</p>${btn("확인","ack","","gold",true)}`);}

  open(
    enemy ? (r.won ? "토벌 완료" : "도전 종료") : r.adminSkip ? r.hours+"시간 사냥 보상" : "사냥 보상",
    enemy
      ? `${bossMarkup(enemy,"big-item")}<h3>${enemy.name}</h3><p class="note">${r.practice ? "연습 도전 · 보상 없음" : r.won ? r.type === "dungeon" ? enemy.reward : "장비 " + r.items.length + "개 · "+fmt(r.gold||0)+" G · 큐브 "+(r.cube||0) : "보상 횟수는 차감되지 않았습니다."}</p><p class="note">자동사냥이 다시 시작됐습니다.</p><div class="actions">${btn("확인", "ack", "", "gold", true)}</div>`
      : `<p>정산 시간 ${fmt(r.seconds / 60)}분 · ${fmt(r.kills)}마리</p><div class="metrics" style="margin-top:12px"><div><small>경험치</small><b>${fmt(r.xp)}</b></div><div><small>골드</small><b>${fmt(r.gold)}</b></div><div><small>장비</small><b>${r.drops.length}개</b></div></div><p class="note">파편 ${r.fragment} · 큐브 ${r.cube}<br>${r.stored ? "가방 초과 장비 " + r.stored + "개는 장비 탭 보관함에 보관되었습니다." : ""}${r.defeats ? " 패배 " + r.defeats + "회 · 하위 사냥터에서 성장하세요." : ""}</p><div class="actions">${btn("보상 확인", "ack", "", "gold", true)}</div>`,
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
    sounds.play("ui-error");
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
  if(!state?.isAdmin)return;
  const blocked=!!state.battle||!!state.partyRoom||!!state.coopRoom;
  open("관리자 · 도현1",`<p class="note">랭킹 제외 · 던전 무한 입장 · 골드와 모든 재화 무제한</p><section class="panel pad"><h3>레벨 조정 · Lv.${state.level}</h3><input id="beta-level" aria-label="원하는 레벨" type="number" inputmode="numeric" min="1" max="200" step="1" value="${state.level}"><p class="note">1~200레벨. 스탯 포인트를 다시 분배하고, 착용 레벨에 맞지 않는 장비는 해제합니다. 낮춘 레벨에 맞춰 전직도 해제됩니다.</p>${disabledBtn("레벨 적용","betaLevel","",blocked||!!state.pendingCube,"gold")}</section><section class="panel pad"><h3>사냥 시간 건너뛰기</h3><p class="note">현재 사냥터·장비로 선택한 시간만큼 사냥합니다. 경험치와 무작위 드롭을 실제로 지급합니다. 너무 강한 사냥터에서는 처치하지 못할 수 있습니다.</p><div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">${Array.from({length:12},(_,i)=>disabledBtn((i+1)+"시간","adminSkip",i+1,blocked)).join("")}</div></section>${blocked?'<p class="note">전투·파티 종료 후 사용할 수 있습니다.</p>':""}`);
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
  return marketItemBlock(it)||(state.level<5?"거래소는 Lv.5부터 이용할 수 있습니다.":state.battle||state.partyRoom?"전투·파티를 종료한 뒤 등록할 수 있습니다.":"");
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
  open("판매할 소모품 선택",`<p class="note">가방에서 판매할 소모품을 누르세요.</p><div class="market-compact-grid material-sell-grid" data-currency-label>${Object.entries(D.MATERIALS).map(([k,name])=>`<button class="market-compact-card" data-action="materialSellPick" data-arg="${k}" ${state.materials[k]>0?"":"disabled"}><img class="material-tile-image" src="${currencyIconURL(k)}" alt=""><strong class="market-card-name">${name}</strong><small>보유 ${fmt(state.materials[k])}개</small><span class="market-card-status">${state.materials[k]>0?"선택":"보유 없음"}</span></button>`).join("")}</div>`);
  return;
 }
 if(!Object.hasOwn(D.MATERIALS,key)||!(state.materials[key]>0))return;
 open("소모품 판매 등록",`${btn("← 소모품 목록","marketSellConsumables")}<div class="material-picked" data-currency-label><img src="${currencyIconURL(key)}" alt=""><div><strong>${D.MATERIALS[key]}</strong><p>보유 ${fmt(state.materials[key])}개</p></div></div><input id="material-sell-key" type="hidden" value="${key}"><label>등록 수량<input id="material-sell-count" type="number" inputmode="numeric" min="1" max="${Math.min(1e6,state.materials[key])}" step="1" value="1"></label><label>개당 가격 (G)<input id="material-sell-price" type="number" inputmode="numeric" min="1" max="1000000000" step="1" value="100"></label><p id="material-sale-total" class="note"></p><p class="note">필요한 수량만 판매합니다. 등록 7일 · 수수료 5%. 취소 시 남은 수량을 돌려받습니다.</p>${btn("소모품 등록","sellConsumableConfirm","","gold")}`);
 updateMaterialSale();
}
function updateMaterialSale(){const key=$('#material-sell-key')?.value;if(!key)return;const count=Number($('#material-sell-count').value),price=Number($('#material-sell-price').value),total=count*price,valid=Number.isSafeInteger(count)&&count>=1&&count<=Math.min(1e6,state.materials[key]||0)&&Number.isSafeInteger(price)&&price>=1&&total<=1e9;$('#material-sale-total').textContent=valid?'전량 판매 시 총 '+fmt(total)+' G · 예상 수령 '+fmt(total-Math.floor(total*.05))+' G':'보유 수량 안에서 정수로 입력하세요. 총 등록 금액은 10억 G 이하입니다.';modal.querySelector('[data-action=sellConsumableConfirm]').disabled=!valid;}
function updateMaterialBuy(){const input=$('#material-buy-count');if(!input)return;const listing=marketRows.find(l=>l.id===input.dataset.listing),count=Number(input.value),valid=listing&&Number.isSafeInteger(count)&&count>=1&&count<=listing.item.quantity;$('#material-buy-total').textContent=valid?'결제 금액 '+fmt(count*listing.price)+' G':'남은 수량 안에서 정수로 입력하세요.';modal.querySelector('[data-action=buyListing]').disabled=!valid||count*listing.price>state.gold;}
function marketSellPicker() {
  const scroll=modal.querySelector('.market-inventory-grid')?.scrollTop||0;
  const items=state.items.filter(it=>(marketSellSlot===""||it.slot===Number(marketSellSlot))&&(marketSellClass===""||it.classId===marketSellClass)).sort((a,b)=>Number(!!marketItemBlock(a))-Number(!!marketItemBlock(b))||b.stars-a.stars||b.level-a.level);
  const it=state.items.find(it=>it.id===marketSellId),cl=it&&D.CLASSES.find(c=>c.id===it.classId),growth=it?1+it.stars*.055+Math.max(0,it.stars-15)**1.4*.025:0;
  const stats=it?[["기본 공격력",D.gearAttributes(it,0).attack.toFixed(1)],["장비 공격력",D.gearAttributes(it).attack.toFixed(1)],[cl.stat,fmt(D.gearAttributes(it).stat)],["최대 HP",fmt(D.gearAttributes(it).hp)],["방어력",(D.gearAttributes(it).defense).toLocaleString("ko-KR")]]:[];
  const canCompare=it&&!it.broken&&it.classId===state.classId&&it.level<=state.level;
  const before=power(state).combatPower,after=canCompare?power({...state,equipped:{...state.equipped,[it.slot]:it.id}}).combatPower:0;
  open("판매할 장비 선택",`<p class="market-picker-intro">가방에서 장비를 고르고, 능력치와 잠재 옵션을 확인하세요.</p><div class="market-picker-layout ${it?"show-detail":""}"><section class="market-picker-bag"><div class="market-picker-filters"><label>부위<select id="market-sell-slot"><option value="">모든 부위</option>${D.SLOTS.map((name,i)=>`<option value="${i}" ${String(i)===marketSellSlot?"selected":""}>${name}</option>`).join("")}</select></label><label>직업<select id="market-sell-class"><option value="">모든 직업</option>${D.CLASSES.map(c=>`<option value="${c.id}" ${c.id===marketSellClass?"selected":""}>${c.name}</option>`).join("")}</select></label></div><p class="market-bag-count">가방 ${state.items.length}/300 · 표시 ${items.length}개 · 판매 가능 ${items.filter(it=>!marketItemBlock(it)).length}개</p><div class="market-inventory-grid" role="group" aria-label="판매 장비 인벤토리">${items.length?items.map(item=>{const reason=marketItemBlock(item);return `<button data-action="marketSellPick" data-arg="${item.id}" aria-pressed="${marketSellId===item.id}" class="market-inventory-item ${item.boss?"boss-gear":""} ${marketSellId===item.id?"picked":""} ${reason?"unavailable":""}"><span class="market-tile-meta">${requiredLevel(item.level)}<b>${item.stars}★</b></span>${gearMarkup(item)}<strong>${esc(D.gearName(item))}</strong><small>${reason||D.CLASSES.find(c=>c.id===item.classId).name+" · "+D.SLOTS[item.slot]}</small></button>`;}).join(""):'<div class="empty">조건에 맞는 장비가 없습니다.</div>'}</div><p class="note">장착·잠금·파괴·거래 불가·큐브 선택 중인 장비는 상세 확인만 가능합니다.</p></section><section class="market-sell-detail" aria-live="polite">${btn("← 장비 목록","marketSellBack")}${it?`<div class="market-picked-head">${gearMarkup(it,"big-item")}<div><small>선택한 장비</small><h3>${esc(D.gearName(it))}</h3><p>${requiredLevel(it.level)} · ${cl.name} · ${D.equipmentType(it)}</p><b>${it.stars}성 · ${it.boss?"보스 장비":"일반 장비"}</b></div></div><div class="market-picked-stats">${stats.map(([k,v])=>`<div><span>${k}</span><b>+${v}</b></div>`).join("")}</div><p class="note">스타포스가 반영된 장비 능력치입니다. 잠재 효과는 아래에 별도로 표시합니다.${it.broken?" 파괴된 장비는 현재 능력치가 적용되지 않습니다.":""}</p><div class="market-picked-options"><h4>잠재능력</h4>${it.lines.length?it.lines.map((line,i)=>`<div class="grade-color-${line.grade}"><small>${i+1}줄 · ${D.RARITIES[line.grade]}</small><span>${D.OPTIONS[line.key]}</span><b>+${line.value}${D.optionUnit(line.key)}</b></div>`).join(""):'<p class="note">잠재 미개방</p>'}</div>${canCompare?`<p class="market-equip-compare">장착 시 내 전투력 <strong>${fmt(after)}</strong> <span>(${after-before>=0?"+":""}${fmt(after-before)})</span></p>`:""}`:'<div class="market-pick-empty"><span>◇</span><h3>판매할 장비를 선택하세요</h3><p>장비 이미지를 누르면 강화 수치와<br>줄별 잠재 옵션이 여기에 표시됩니다.</p></div>'}<div class="market-price-box"><label for="sell-price">판매 가격 <small>G</small></label><input id="sell-price" type="number" inputmode="numeric" min="100" max="1000000000" step="1" value="${esc(marketSellPrice)}"><div class="market-net"><span>판매 완료 시 수령액</span><strong id="sell-net">—</strong></div><p id="sell-reason" class="note"></p>${disabledBtn("선택 장비 등록","sellConfirm","",true,"gold market-register")}<p class="note">등록 기간 7일 · 판매 완료 시 수수료 5%</p></div></section></div>`);
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
  sounds.play("purchase-complete");
  toast("거래가 완료되었습니다.");
}
document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-action]");
  if (!b || b.disabled) return;
  const action = b.dataset.action,
    arg = b.dataset.arg;
  sounds.start();sounds.music();
  sounds.play(['close','back'].includes(action)?'ui-back':['tab','bossTab','bagPage'].includes(action)?'ui-tab':'ui-click');
  if(action==='star')sounds.play('enhance-charge');
  try {
    if(dungeonExitActions.has(action)){b.disabled=true;modal.close();return await exitDungeon(action);}
    if(action==="bagPage"){bagPage=Math.max(0,Number(arg)||0);render();return;}
    if(action==="dailyClaim")return await command("dailyClaim",{key:arg});
    if(action==="battlePotion")return await command("battlePotion");
    if(action==="waveCreate")return await command("coopCreate",{tier:0,mode:"wave"});
    if(action==="coopCreate")return await command("coopCreate",{tier:Number(arg)});
    if(action==="coopJoin")return await command("coopJoin",{room:arg});
    if(["coopStart","coopSync","coopList","coopLeave"].includes(action)){modal.close();return await command(action);}
    if(action==="coopLeaveConfirm")return open(coopRoom?.mode==="wave"?"웨이브에서 나가기":"균열에서 나가기",'<p>'+(coopRoom?.mode==="wave"?"완료한 웨이브의 누적 보상을 받고 나갑니다. 다시 도전하면 1웨이브부터 시작합니다.":"진행 중인 도전에서 나가면 보상을 받을 수 없습니다.")+'</p>'+btn("나가기","coopLeave","","danger",true));
    if(action==='itemGroup')return itemGroup(arg);
    if(action==='towerOpen')return await command('towerOpen',{runId:state.battle?.runId});
    if(action==='towerStart'){modal.close();tab='boss';bossTab='tower';view='game';return await command('towerStart',{floor:Number(arg)});}
    if(action==='towerAck'){modal.close();return await command('ack');}
    if(action==='towerLeaveConfirm')return open('전투에서 나가기',`<p>현재 층의 도전을 종료합니다. 획득한 이전 층 보상과 기록은 유지됩니다.</p>${btn('나가기','towerLeave','','danger',true)}`);
    if(action==='towerLeave'){modal.close();return await command('towerLeave');}
    if (action === "cubeKind") {cubeKind=Object.hasOwn(D.CUBES,arg)?arg:"cube";return itemDetail(selected,"potential");}
    if (action === "reconnect") return await command("sync",{},false,true);
    if (action === "recoverLogin"){location.href="recover.html?v=request-recovery-2";return;}
    if (action === "attendance") return attendance();
    if (action === "attendanceClaim") return await command("attendanceClaim");
    if (action === "changeClass") return changeClassDialog();
    if (action === "changeClassPick") return confirmClassChange(arg);
    if (action === "changeClassConfirm") {await command("changeClass",{classId:arg});modal.close();filterClass="";salvageSelection.clear();tab="character";view="game";return render();}
    if (action === "close") {
      modal.close();
      return;
    }
    if (action === "tab") {
      const enteringHunt=arg==="hunt"&&(tab!=="hunt"||view!=="game");
      tab = arg;
      view = "game";
      filterSlot = "";
      filterClass = "";
      marketRequest++;
      combatFrames.length = 0;
      modal.close();
      render();
      if(enteringHunt)requestAutoHunt();
      if (tab === "market") await marketLoad();
      return;
    }
    if (action === "bossSub") {bossTab=arg;render();if(["coop","wave"].includes(arg))await command("coopList",{},true);return;}
    if (action === "partyLeaveConfirm") return open("파티에서 나가기",`<p>진행 중인 전투에서 나가면 해당 파티 보상을 받을 수 없습니다. 자동사냥은 다시 시작됩니다.</p>${btn("나가기","partyLeave","","danger",true)}`);
    if (action === "itemMode") {const [id,mode]=arg.split(":");return itemDetail(id,mode);}
    if (action === "advance") {tab="boss";bossTab="advancement";view="game";return render();}
    if(action==="advancementStart"){modal.close();tab="boss";bossTab="advancement";view="game";return await command("advancementStart",{stage:Number(arg)});}
    if (action === "journal") {view="journal";return render();}
    if (action === "ranking") {view="ranking";return await loadRankings();}
    if (action === "rankingRefresh") return await loadRankings();
    if (action === "rankingMode") {rankingMode=arg==="combat"?"combat":"level";return render();}
    if(action==="betaBossReset"){
      if(busy)return;
      const result=await command("betaBossReset",{kind:arg});
      if(result){betaTools();toast((arg==="daily"?"일일":arg==="weekly"?"주간":"일일·주간")+" 보스 보상 횟수가 초기화됐어요.");}return;
    }
    if(action==="adminSkip")return await command("adminSkip",{hours:Number(arg)});
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
      if(tab==="hunt")requestAutoHunt();
      return render();
    }
    if (action === "enterStage") {
      await command("stage", { id: Number(arg) });
      view = "game";
      tab = "hunt";
      requestAutoHunt();
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
    if(action==="exchangeGear")return await command("exchangeGear",{level:Number(arg),classId:exchangeClass||state.classId});
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
    if (action === "potentialUnlock") return await command("potential", {id:arg});
    if (action === "cubeUse") return await command("cube", {id:arg,kind:cubeKind});
    if (["lock", "star"].includes(action)) {
      await command(action, { id: arg });
      if (action !== "star") itemDetail(arg);
      return;
    }
    if (action === "cube" || action === "highCube")
      return await command("cube", { id: arg, high: action === "highCube" });
    if (action === "cubeChooseRepeat") {
      if(busy||!state.pendingCube)return;
      const pending=state.pendingCube,id=pending.id,kind=pending.kind||(pending.high?"highCube":"cube");
      const result=await command("cubeChoose",{apply:arg==="yes"});
      if(!result||state.pendingCube)return;
      lastCubeResult=null;
      itemDetail(id,"potential");
      return await command("cube",{id,kind});
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
        `<p>분해 보상: 장비 파편 ${D.salvageYield(state.items.find(it=>it.id===arg))}개.<br>선택한 장비가 사라집니다. 강화·잠재은 복구할 수 없습니다.</p><div class="actions">${btn("분해하기", "salvage", arg, "danger", true)}</div>`,
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
    sounds.play("ui-error");
    toast(message(err));
  }
});
document.addEventListener("input", e=>{if(e.target.id?.startsWith("material-sell"))updateMaterialSale();if(e.target.id==="material-buy-count")updateMaterialBuy();if(e.target.id==="sell-price")updateSellPrice();});
document.addEventListener("change", async (e) => {
  if(e.target.id==="exchange-class"){exchangeClass=e.target.value;render();return;}
  if(e.target.id==="exchange-level"){exchangeLevel=Number(e.target.value);render();return;}
  if(e.target.id==="material-sell-key"){updateMaterialSale();return;}
  if(e.target.id==="market-sell-slot"||e.target.id==="market-sell-class") {marketSellPrice=$("#sell-price")?.value??marketSellPrice;if(e.target.id==="market-sell-slot")marketSellSlot=e.target.value;else marketSellClass=e.target.value;marketSellId=null;marketSellPicker();return;}

  if(e.target.id==="party-boss") {partyBossId=Number(e.target.value);$("#party-boss-preview").innerHTML=partyBossPreview(D.raidBoss(partyBossId));return;}
  if(e.target.id==="party-practice") {partyPractice=e.target.checked;return;}
  if (!e.target.dataset.filter) return;
  bagPage=0;
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
  if(state.battle?.kind==='tower'||coopController)return;
  if(view==="ranking"&&!modal.open&&Date.now()-rankingAttempt>=10000)loadRankings(true);
  const partyLobbyOpen = false;
  const due = state.coopRoom&&coopRoom?.status==='waiting'?2000:state.partyRoom || state.battle ? 3000 : partyLobbyOpen ? 8000 : tab === "hunt" ? 10000 : 30000;
  if (Date.now() - lastSync > due) command("sync", {}, true).catch(() => {});
}, 1000);
function strike(arena, frame = null) {
  sounds.play(state.classId+"-attack");
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
    arena.append(n);
    const restack=()=>{const rows=[...arena.querySelectorAll('.damage')];while(rows.length>10)rows.shift().remove();rows.forEach((row,i)=>row.style.setProperty('--damage-row',String(rows.length-1-i)));};
    restack();setTimeout(()=>{n.remove();restack();},2400);
  }
  setTimeout(()=>slash.remove(),450);

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
    const defeated=rate.survives&&progress>=rate.fightSeconds;
    const fightTime=recovering?deathAt:Math.min(progress,rate.fightSeconds-.001);
    const incoming=rate.incoming;
    const hp=recovering?0:Math.max(0,p.hp-Math.floor(fightTime/rate.enemyInterval)*incoming);
    const enemyHp=defeated?0:Math.max(1,st.hp-rate.damagePerHit*Math.floor(fightTime/rate.attackInterval));
    const bar=$("#enemy-hp");
    if(bar)bar.style.width=(100*enemyHp/st.hp)+"%";
    const ownBar=$("#field-player-bar");
    if(ownBar)ownBar.style.width=(100*hp/p.hp)+"%";
    const ownLabel=$("#field-player-hp");
    if(ownLabel)ownLabel.textContent="내 HP "+fmt(hp)+" / "+fmt(p.hp);
    const status=$("#hunt-status");
    if(status)status.textContent=recovering?"부활 대기":defeated?"다음 몬스터 등장 대기":"자동 전투 중";
    const result=$("#field-combat-result");
    if(result)result.textContent=recovering?"패배 · "+Math.ceil(rate.seconds-progress)+"초 후 자동 재도전 · 처치 보상 없음":defeated?"처치 완료 · 다음 전투 준비":"공격 1초 · 피격 1.5초 · HP가 0이면 패배";
    const label=$("#battle-info");
    if(label)label.textContent="몬스터 HP "+fmt(enemyHp)+" / "+fmt(st.hp);
    if (!recovering && !defeated && Date.now()-lastVisualHit>=rate.attackInterval*1000) { lastVisualHit=Date.now(); strike(arena); }

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
 document.querySelectorAll('[data-skill-slot]').forEach(button=>{const slot=Number(button.dataset.skillSlot),sk=slot===4?D.FOURTH_SKILLS[state.classId]:slot===1?D.CLASS_SKILLS[state.classId]:slot===2?D.SECOND_SKILLS[state.classId]:D.THIRD_SKILLS[state.classId];const ready=slot===4?r.fourthReadyAt:slot===3?r.thirdReadyAt:slot===1?(party?me?.skillReady:r.skillReady):(party?me?.secondReady:r.secondReady);const remain=party?Math.max(0,(ready||0)-tick):Math.max(0,Math.ceil(((ready||0)-r.started-tick*1000)/1000));const locked=slot===1?!D.firstJobUnlocked(state):(state.advancement||0)<slot-1;button.disabled=busy||locked||remain>0||(party&&me?.hp<=0)||tick>=seconds;button.textContent=slot+'차 · '+sk.name+(locked?' · 전직 필요':remain?' · '+remain+'초':' · 사용 가능');});
}
function unavailable() {
  app.innerHTML='<div class="login panel"><p class="eyebrow">링구 RPG</p><h2>잠시 연결을 기다리고 있어요</h2><p class="note">연결이 복구되면 저장된 모험을 이어갈 수 있어요.</p><div class="actions">'+btn("다시 연결","reconnect","","gold")+btn("로그인 복구","recoverLogin")+'</div></div>';
}
window.addEventListener("online",()=>{ if(session) command("sync",{},true).catch(()=>{}); });
window.addEventListener("offline",()=>{connectionLost=true;const banner=$("#connection-status");if(banner)banner.hidden=false;});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) sounds.pause();
  else {
    sounds.start();
    sounds.music();
    if (session) command("sync", {}, true).then(()=>{if(view==="game"&&tab==="hunt")requestAutoHunt();}).catch(() => {});
  }
});
installCurrencyIcons();
if (session) command("sync").catch(() => {});
else login();

installMenuIcons();

