import {explorationKeys as D_EXPL_KEYS} from './exploration-data.mjs';
import {bankView} from './bank-ui.mjs?v=bank03-20261102';
import "./abort-polyfill.mjs";
import {advancementPortrait} from './advancement-art.mjs';
import {showAdminInventory} from './admin-inventory.mjs?v=admin-gear-level2-20261018';
import {citadelLobby} from './citadel-ui.mjs';
import {explorationLobby} from './exploration-ui.mjs?v=expl1116-20261108';
import equipmentBounds from "./equipment-bounds.mjs?v=priest-potential-83";
import {installPortraitIsolation} from './portrait-isolation.mjs?v=arena-balance-153';
import {abortable} from './request-lifecycle.mjs?v=coop-repeat-176';
import {costumeWardrobe,portraitStyle} from './costume-ui.mjs?v=shop-tabs-122';
import {skillLookById,equippedSkillLook} from './skill-looks.mjs';
import {skillLookPreviewView} from './skill-look-ui.mjs';
import {playSkillLookPreview,playSkillLookOverlay} from './skill-look-effects.mjs';
import {getSkillAlpha,setSkillAlpha,skillAlpha} from './skill-alpha.mjs';
// 사냥 화면 DOM 스킬 연출도 설정 > 스킬 투명도를 따른다.
function fadeSkillOverlay(arena,slot){const a=skillAlpha(slot);if(!(a<.999))return;const before=new Set(arena.children),mark=()=>{for(const el of arena.children)if(!before.has(el)&&!el.dataset.skillAlpha){el.dataset.skillAlpha='1';const f=getComputedStyle(el).filter;el.style.filter=(f&&f!=='none'?f+' ':'')+`opacity(${a})`;}};const mo=new MutationObserver(mark);mo.observe(arena,{childList:true});setTimeout(()=>{mark();mo.disconnect();},2500);}
import {costumeById,equippedCostume} from './costumes.mjs?v=costume-motion-111';
import {showAdminPositions} from './admin-positions.mjs?v=fee1-20261102';
import {shopView} from './shop-ui.mjs?v=preset-e-20261028';
import {blackMarketPurchaseView,updateBlackMarketPurchase} from './black-market-ui.mjs?v=lock5-20261103';
import {blackMarketRotation,blackMarketLimit,blackMarketOffersFor} from './black-market.mjs?v=lock20-20261105';
import {consumableView,consumablePurchaseView,updateLuckTimers,updateConsumablePurchase,consumableSellView,updateConsumableSale} from './consumable-ui.mjs?v=nosell-20261105';
import {LUCK_POTION,shopConsumable,shopPurchaseLimit,shopSellLimit,SELL_PRICES} from './consumables.mjs?v=nosell-20261105';
import {bossSalePrice,bossSaleBlock,gearPresetSlots} from './shop-model.mjs?v=shop-price-20261013b';
import {investmentNewsSummary,setNewsNotifications,resetNewsNotifications} from './investment-notifications.mjs?v=invest-unread-6';
import {investmentHistoryView,investmentTradeItem,investmentNewsItem,investmentNewsView,investmentView,selectCoin,selectedCoin,setInvestmentAmount,investmentAmount,setInvestmentLeverage,investmentLeverage,setInvestmentPercent,investmentPercent,investmentMargin,investmentOrderHelp,resetInvestment,updateInvestmentClock} from './investment-ui.mjs?v=testerpos-20261105';
let investmentData=null,investmentLoadedAt=0;
import {openWarriorLab,closeWarriorLab} from './warrior-lab.mjs?v=fifth-impact-121';
import {lottoView,lottoSelection,selectLottoNumber,setLottoPanel,autoLotto,clearLotto} from './lotto-ui.mjs?v=short-18';
let eventPage='fishing',lottoData=null,lottoLoadedAt=0;
import {treasureView} from './treasure-ui.mjs';
import {companionView,companionAction,updateCompanionTimers} from './companion-ui.mjs?v=seriene-display-20261116';
import {professionView,craftSummary} from './profession-ui.mjs';
import {PROFESSIONS as D_PROFESSIONS,professionFragmentBoost as fragBoost,professionOf as profOf,recipeMaxCount as profMax,recipeCost as profCost,RESOURCE_NAMES as PROF_NAMES,recipeProfession as profOfRecipe} from './profession-model.mjs';
import {FISHING_PROTOCOL as FISH_PROTOCOL,fishFailText,fishingView,fishingUI,mountFishing,stopFishing,stopAutoFishing,scheduleAutoFishing,showFishingPending,updateFishingView,liveBoss} from './fishing-ui.mjs?v=fx2-20261105';
import {applyFishingPatch} from './fishing-sync.mjs?v=fishing-perf-188';
import {SPOTS,BAITS,FISH as D_FISH_LIST,resourceName,fishingQuestsReady} from './fishing-data.mjs?v=bag300-20261105';
const RARITIES_V3=['일반','희귀','레어','에픽','전설','신화','태고'];
const D_FISH_RARITY=id=>D_FISH_LIST.find(x=>x.id===id)?.rarity||0;
import {luckyWheelView,spinLuckyWheel,luckyWheelSpinning} from './lucky-wheel-ui.mjs';
import {fantasyHeader,fantasyFooter,fantasyMenu,setBuyOrderAlert} from './fantasy-ui.mjs?v=boalert-20261104';
import {arenaView,startArenaReplay,arenaDock,arenaTierIcon} from './arena-ui.mjs?v=arena-fit-170';
import {fieldPetHP} from './pet-event.mjs?v=priest-potential-83';
import {fieldPetVisual} from './field-pet-visual.mjs?v=priest-potential-83';
import {petEventView,petInventory,petOdds,petResult,updatePetCountdown,playLumiReveal,playSummonReveal,playBossChestReveal} from './pet-ui.mjs?v=short-18';
import {replacePreservingDetails,clearDisclosureState} from './disclosure-state.mjs?v=priest-potential-83';
import {waveRewardBody} from './wave-ui.mjs?v=wave-fifth-cd-124';
import {playHolyOverlay} from './priest-overlay.mjs?v=priest-perf-86';
import {raidLobby,finalLobby} from './raid-ui.mjs?v=final-open-20261109';
import {nextAutoSkill} from './auto-skills.mjs?v=fifth-impact-121';
import {playSecondOverlay} from './skill-overlay.mjs?v=priest-potential-83';
import {playFifthOverlay} from './fifth-overlay.mjs?v=fifth-impact-121';
import {GameAudio,FISHING_BGM_ZONE} from './game-audio.mjs?v=priest-potential-83';
import {COMPANION_BY_ID as CP_BY_ID,companionMaxRate as cpMaxRate,companionPassiveDef as cpPassive} from './companion-model.mjs?v=seriene-display-20261116';
import {coopLobby,coopArena,CoopController} from './coop-client.mjs?v=final-art-20261109';
import {decodeCoopReply} from './coop-wire.mjs?v=coop-wire-1';
import {incomingDamage} from './journey-balance.mjs?v=priest-potential-83';
import {installMenuIcons} from './menu-icons.mjs?v=top-icons-20261102';
import { renderCubePanel, renderCubeChoice, potentialPanel, cubeGuide, additionalPanel, renderAdditionalSection, renderAddCubeChoice } from './cube-ui.mjs?v=prime-choice-158';
import { renderRefinePanel, renderRefineChoice } from './refine-ui.mjs?v=transcend-20261102';
import {TOWER_FLOORS,newTrainingBattle,towerStep} from './tower-model.mjs?v=fifth-impact-121';
import {towerLobby,towerArena,TowerController} from './tower-client.mjs?v=token-art-20261102';
import * as D from "./data.mjs?v=transcend2-20261102";
import {applyFieldArt} from './field-art.mjs?v=field-art-20261103';
applyFieldArt(D);
import { installCurrencyIcons, currencyIconURL, goldPurchaseIcon } from "./currency-icons.mjs?v=allmarket-20261104";
import { inventoryGroups } from "./inventory-order.mjs?v=bag-sort2-20261028";
import { power, huntingRate, battleEnemy } from "./engine.mjs?v=frag400-20261105";
import {tokenView,keyView,tokenVisible,tokenBossResult,keyBossResult,raceUI} from "./token-ui.mjs?v=gold500-20261105";
import {tribeView,spinTribeReel,tribeTag,rememberTribes,rememberTribe,installNameFit} from "./tribe-ui.mjs?v=price300-20261104";
installNameFit();
import {tokenShopBought} from "./token-content.mjs?v=gold500-20261105";
import {sweepPlan,bossSweepable} from "./sweep.mjs";
import {titleBadge,titlePanelView,titleEarnedView,setTitleFilter,setTitleDetail} from "./title-ui.mjs";
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
installPortraitIsolation();
const portraitPosition = (id) => Math.max(0, ["warrior", "mage", "archer", "rogue", "pirate"].indexOf(id)) * 25;
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
let towerController=null,dummyBattle=null,bagPage=0,coopController=null,coopRoom=null,coopRooms=[],dialogScroll=new Map();
let coopListAttempt=0,coopListPending=null;
function coopLobbyVisible(){return view==="game"&&tab==="boss"&&["citadel","advancement","raid","final","exploration"].includes(bossTab)&&!state?.coopRoom&&!state?.battle&&!state?.partyRoom;}
async function refreshCoopRooms(){
  if(coopListPending)return coopListPending;
  coopListPending=(async()=>{
    while(busy)await new Promise(resolve=>commandIdleWaiters.push(resolve));
    if(!session||!state||!coopLobbyVisible()||document.hidden||!navigator.onLine)return;
    coopListAttempt=Date.now();
    return command("coopList",{},true);
  })();
  try{return await coopListPending;}finally{coopListPending=null;}
}
let bankCancelArm=null;
// 2026-11-04 거래소 구매 요청(소모품만): 필요한 사람이 골드를 걸어두면 가진 사람이 바로 판다.
let buyOrderMode=false,buyOrders=null,buyOrderRequest=0;
const CP_KEYS=Object.keys(CP_BY_ID).map(id=>'companion:'+id); // 2026-11-06 도현: 동료 카드 구매 요청(캐릭터 지정)
const BUY_ORDER_KEYS=[...CP_KEYS,'fishToken','primeCube','cube','highCube','fragment','scroll','potentialLock','dungeonKey','diamond','companionTicket','treasureTicket','addCube','transcendStone','bonusFlame','pickupTicket','essence','mapPiece','pearl','ore','rerollStone','ringuHair','luckPotion','tribeTicket'];
let marketKind="all",exchangeClass="",exchangeLevel=10;
let salvageMode=false;
const salvageSelection=new Set();
const canSalvage=it=>!it.locked&&!it.broken&&!Object.values(state.equipped).includes(it.id)&&state.pendingCube?.id!==it.id&&state.pendingAddCube?.id!==it.id&&state.pendingRefine?.id!==it.id;
let partyBossId=null, partyPractice=false;
let arenaData=null,arenaPage='home',arenaBattle=null,arenaPlayback=null,arenaError='';
let shopCategory="boss";
let skillLookClass=null,stopSkillLookPreview=null;
modal.addEventListener('close',()=>{stopSkillLookPreview?.();stopSkillLookPreview=null;});
function openTribe(){open('종족 강림',tribeView(state,{spinning:tribeSpinning,shop:{bought:tokenShopBought(state,'tribeTicket',Date.now())}}),!tribeSpinning);modal.classList.add('tribe-dialog');}
let tribeSpinning=false,tribesAt=0;
// 멀티 방 대기실: 참가자 종족은 랭킹 조회 결과에서 가져온다(1분마다 갱신).
function ensureRoomTribes(){if(coopRoom?.me&&state)rememberTribe(coopRoom.me,state.tribe);if(Date.now()-tribesAt<60000||rankingLoading)return;tribesAt=Date.now();loadRankings(true).then(()=>{if(state?.coopRoom&&coopRoom?.status!=='fighting')render();}).catch(()=>{});}
let tokenPage="dungeon",raceTimer=0;
let bossTab="daily", partyRoom=null, partyRooms=[], rankingRows=[], rankingMode="level", rankingLoading=false, rankingError="", rankingUpdated=0, rankingRequest=0, itemSection="info";
let connectionLost = false, marketRequest = 0, lastVisualHit = 0, lastBattleRequestAt = 0;
let retryAt = 0, retryFailures = 0, characterName = "";
// Market and lotto responses do not settle field rewards.
let lastHuntSettlement = 0;
let session,
  settings = { sound: 0.3, music: 0.18, low: false },
  state = null,
  stateRevision = null,
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
  INVESTMENT_HALF_TOO_SMALL: "수량이 2개 이상이어야 절반 판매할 수 있어요.",
  COPY_TRADING_ACTIVE: "카피 트레이딩 중에는 직접 매수할 수 없어요. 카피를 먼저 종료해 주세요.",
  COPY_ALREADY_ACTIVE: "이미 다른 유저를 카피 중이에요. 먼저 카피를 종료해 주세요.",
  COPY_HAS_FOLLOWERS: "나를 카피 중인 유저가 있어서 카피를 신청할 수 없어요.",
  COPY_LEADER_IS_COPYING: "그 유저는 다른 사람을 카피 중이라 신청할 수 없어요.",
  COPY_GOLD_REQUIRED: "카피 트레이딩은 1,000만 골드 이상 보유해야 신청할 수 있어요.",
  COPY_OPEN_POSITIONS: "보유 중인 포지션을 모두 정리해야 카피를 신청할 수 있어요.",
  INVALID_COPY_LEADER: "카피할 수 없는 유저예요.",
  COPY_LEADER_MIN_GOLD: "그 유저가 정한 최소 자본보다 보유 골드가 적어서 신청할 수 없어요.",
  COPY_REWARD_EMPTY: "받을 카피 보상이 없어요.",
  INVALID_COPY_ACTION: "카피 해산은 서버 준비 중이에요. 잠시 후 다시 시도해 주세요.",
  COPY_NO_FOLLOWERS: "나를 카피 중인 유저가 없어요.",
  COPY_DISBAND_OPEN_POSITIONS: "보유 포지션을 먼저 모두 판매해야 카피를 해산할 수 있어요.",
  COPY_WALLET_NOT_COPYING: "카피 계좌는 다른 유저를 카피 중일 때만 쓸 수 있어요.",
  COPY_WALLET_INVALID_AMOUNT: "금액을 1골드 이상 숫자로 입력해 주세요.",
  COPY_WALLET_INSUFFICIENT: "카피 계좌 잔액이 부족해요.",
  COPY_INTRO_TOO_LONG: "한 줄 소개는 60자까지 쓸 수 있어요.",
  COPY_MIN_INVALID: "최소 자본은 1,000만~1조 골드 사이 숫자로 입력해 주세요.",
  COPY_LEADER_FULL: "그 유저는 이미 5명이 카피 중이라 신청할 수 없어요.",
  COMPANION_NO_TICKET: "소환권이 부족해요.",
  COMPANION_BAG_FULL: "동료 가방이 가득 찼어요. 카드를 판매하거나 합성해 주세요.",
  COMPANION_NOT_FOUND: "동료 카드를 찾을 수 없어요. 새로고침 후 다시 시도해 주세요.",
  COMPANION_ALREADY_PLACED: "이미 배치된 동료예요.",
  COMPANION_PLACED: "배치 중인 동료는 판매하거나 재료로 쓸 수 없어요.",
  COMPANION_INVALID_SLOT: "배치 자리가 올바르지 않아요.",
  COMPANION_MAX_STAR: "이미 최대 ★5예요.",
  COMPANION_MERGE_COUNT: "합성 재료 수가 맞지 않아요.",
  COMPANION_MERGE_MISMATCH: "같은 캐릭터끼리만 합성할 수 있어요.",
  COMPANION_UNKNOWN: "새로고침 후 다시 시도해 주세요.",
  FISHING_REFRESH_REQUIRED: "낚시가 업데이트됐어요. 새로고침 후 다시 시도해 주세요.",
  INVALID_FISHING_BAIT: "미끼 구매 수량이 올바르지 않아요. 새로고침 후 다시 구매해 주세요.",
  FISHING_HOOK_REQUIRED: "입질이 오면 먼저 챔질해 주세요.",
  FISHING_BITE_MISSED: "입질을 놓쳤어요. 다시 던져주세요.",
  FISHING_ALREADY_HOOKED: "이미 챔질했어요.",
  FISHING_CAST_ACTIVE: "이미 찌를 던졌어요. 포획을 마치거나 그만두기를 눌러주세요.",
  FISHING_CAST_MISSING: "입질이 끝났어요. 다시 낚싯대를 던져주세요.",
  FISHING_ROD_REQUIRED: "낚싯대 레벨이 부족해요.",
  FISHING_BAIT_REQUIRED: "미끼가 없어요. 낚시 상점에서 구매해 주세요.",
  FISHING_BAG_FULL: "물고기 가방이 가득 찼어요. 판매하거나 수족관에 넣어주세요.",
  FISHING_BOSS_NOT_DEFEATED: "아직 처치하지 못한 보스예요.",
  FISHING_BOSS_TOO_FEW_HITS: "보스를 10번 이상 공격해야 보상을 받을 수 있어요.",
  FISHING_BOSS_CLAIMED: "이미 받은 보스 보상이에요.",
  FISHING_DAILY_LIMIT: "오늘 낚시 횟수를 다 썼어요. 한국 시간 자정에 초기화돼요.",
  FISHING_AQUARIUM_FULL: "수족관이 가득 찼어요. 칸을 확장하거나 물고기를 꺼내주세요.",
  TREASURE_DAILY_LIMIT: "오늘 보물 찾기 3판을 모두 했어요. 자정에 초기화돼요.",
  TREASURE_TICKET_REQUIRED: "오늘 무료 3판을 다 했어요. 더 하려면 티켓이 필요해요 (낚시에서 획득).",
  TREASURE_RUN_ACTIVE: "진행 중인 판을 먼저 끝내 주세요.",
  TREASURE_NO_RUN: "진행 중인 보물 찾기가 없어요.",
  TREASURE_EMPTY_BAG: "칸을 하나 이상 열어야 받을 수 있어요.",
  TREASURE_CELL_OPEN: "이미 연 칸이에요.",
  FISHING_AQUARIUM_OPTIMAL: "이미 시간당 수익이 가장 높은 물고기들이 수족관에 있어요.",
  TESTER_BLOCKED: "테스트 계정은 사용할 수 없는 기능이에요.",
  FISHING_DIAMONDS_REQUIRED: "다이아가 부족해요. 낚시로 다이아 상자를 낚아 모아 보세요.",
  FISHING_ENCHANT_PENDING: "먼저 이전 인챈트와 새 인챈트 중 하나를 골라 주세요.",
  FISHING_ENCHANT_NONE: "고를 인챈트가 없어요. 새로고침해 주세요.",
  FISHING_EXCHANGE_LIMIT: "오늘 교환 한도(30개)를 다 썼어요. 자정에 초기화돼요.",
  INVALID_FISHING_EXCHANGE: "교환할 수 없는 항목이에요.",
  FISHING_CONTEST_CLOSED: "받을 수 있는 대회 기간이 아니에요.",
  FISHING_CONTEST_CLAIMED: "이미 받은 대회 보상이에요.",
  FISHING_CONTEST_NO_REWARD: "해당 주 대어 대회 입상 기록이 없어요.",
  FISHING_XP_REQUIRED: "골드로 낚싯대 경험치를 먼저 채워주세요.",
  FISHING_XP_FULL: "경험치가 가득 찼어요. 다이아로 레벨업해 주세요.",
  FISHING_NO_INCOME: "아직 받을 골드가 없어요.",
  FISHING_QUEST_CLAIMED: "이미 받은 일일 보상이에요.",
  FISHING_SUMMON_REMOVED: "루미 소환이 종료됐어요. 이벤트에서 낚시를 즐겨주세요.",
  INSUFFICIENT_POTENTIALLOCK: "잠재 잠금석이 부족해요.",
  SWEEP_NOTHING: "지금 소탕할 수 있는 게 없어요.",
  SWEEP_NOT_ALLOWED: "한 번 깬 적이 있고 오늘(이번 주) 남은 횟수가 있어야 소탕할 수 있어요.",
  INSUFFICIENT_RINGUHAIR: "링구의 머리카락이 부족해요.",
  HAIR_ALREADY_USED: "이 장비는 이미 링구의 머리카락을 썼어요.",
  ITEM_NOT_BOUND: "거래 불가 장비에만 바를 수 있어요.",
  POTENTIAL_LOCK_EPIC_REQUIRED: "레어 장비를 블랙·프라임 큐브로 승급할 때는 줄을 잠글 수 없어요.",
  REBIRTH_MAINTENANCE:
    "새로운 여정을 준비하고 있어요. 서비스가 열리면 시작할 수 있습니다.",
  LOGIN_REQUIRED: "다시 로그인해 주세요.",
  EXPLORATION_KEY_REQUIRED: "던전 열쇠가 부족해요. (4단계 1 · 5단계 2 · 6단계 3 · 7단계 4 · 8단계 5 · 9단계 6 · 10단계 7개, 대기 중인 다른 방 몫 포함)",
  EXPLORATION_SOLO_REQUIRED: "이 단계를 혼자 한 번 클리어해야 소탕할 수 있어요.",
  EXPLORATION_PREVIOUS_REQUIRED: "이전 단계 탐험을 먼저 클리어해야 해요.",
  CITADEL_PREVIOUS_REQUIRED: "암흑성채 이전 보스를 먼저 처치해야 해요.",
  EXPLORATION_KEY_RESERVED: "진행 중인 탐험에 필요한 던전 열쇠 1개는 판매할 수 없습니다.",
  SESSION_ENDED: "종료된 로그인입니다. 다시 로그인해 주세요.",
  SESSION_REPLACED: "다른 기기에서 로그인했어요.",
  INVALID_COSTUME: "코스튬을 찾을 수 없습니다.",
  INVALID_SKILL_LOOK: "스킬 외형을 찾을 수 없습니다.",
  SKILL_LOOK_OWNED: "이미 보유한 스킬 외형입니다.",
  SKILL_LOOK_NOT_OWNED: "먼저 스킬 외형을 구매해 주세요.",
  SKILL_LOOK_CLASS_MISMATCH: "현재 직업의 스킬 외형만 장착할 수 있습니다.",
  COSTUME_OWNED: "이미 보유한 코스튬입니다.",
  COSTUME_NOT_OWNED: "먼저 코스튬을 구매해 주세요.",
  COSTUME_CLASS_MISMATCH: "현재 직업의 코스튬만 장착할 수 있습니다.",
  COMPANION_INVALID_SUMMON_COUNT: "1회 또는 5회 소환을 선택해 주세요. 새로고침 후 다시 시도해 주세요.",
  INSUFFICIENT_GOLD: "골드가 부족합니다.",
  INVALID_BANK_TERM: "정기예금 상품을 찾을 수 없어요.",
  INVALID_PROFESSION: "없는 직업이에요.",
  SHOP_WEEKLY_LIMIT: "이번 주 구매 한도를 다 썼어요. 월요일 00시에 초기화돼요.",
  EXPLORATION_MEMBER_KEY_REQUIRED: "던전 열쇠가 부족한 파티원이 있어요. 파티원 모두 각자 열쇠가 필요해요.",
  FISHING_EXCHANGE_REMOVED: "다이아 교환소는 종료됐어요.",
  FISHING_AUTO_REQUIRED: "자동 낚시권이 끝났어요. 상점에서 구매하면 오토 낚시를 할 수 있어요.",
  INVALID_FISHING_INPUT: "손맛 낚시 기록이 올바르지 않아요. 다시 던져 주세요.",
  INVALID_FISHING_AUTO: "구매할 수 없는 자동 낚시권이에요.",
  FISHING_BAIT_LIMIT: "이 미끼는 종류별로 최대 600개까지 가질 수 있어요.",
  FISHING_LOCKED: "새 낚시 준비 중이라 지금은 낚시를 할 수 없어요.",
  FISHING_FUSE_REMOVED: "합성은 없어졌어요.",
  FISHING_TOKENS_REQUIRED: "낚시 토큰이 부족해요. 물고기를 팔면 토큰을 받아요.",
  FISHING_ENHANCE_REMOVED: "강화는 없어졌어요. 더 좋은 낚싯대를 구매해 주세요.",
  INVALID_FISHING_ENCHANT: "인챈트 잠금이 올바르지 않아요. 열린 칸 중 하나는 남겨 두세요.",
  INVALID_FISHING_FUSE: "합성할 물고기를 다시 골라 주세요.",
  FISHING_FUSE_MISMATCH: "같은 종·같은 크기(황금 합성은 황금 개체)만 합성할 수 있어요.",
  FISHING_FUSE_MAX: "기록급은 더 합성할 수 없어요.",
  FISHING_AWAKEN_MAX: "이미 최고 각성(★5)이에요.",
  FISHING_AWAKEN_REQUIRED: "가방에 같은 종 물고기가 부족해요.",
  PROFESSION_LOCKED: "전문 직업은 아직 준비 중이에요.",
  PROFESSION_FULL: "이 직업은 정원(2명)이 다 찼어요. 다른 직업을 골라 주세요.",
  PROFESSION_SAME: "이미 그 직업이에요.",
  PROFESSION_COOLDOWN: "직업 변경은 7일에 한 번만 할 수 있어요.",
  PROFESSION_REQUIRED: "먼저 전문 직업을 선택해 주세요.",
  INVALID_RECIPE: "이 직업이 만들 수 없는 품목이에요.",
  INVALID_CRAFT_COUNT: "제작 수량은 1~1,000 사이로 입력해 주세요.",
  SHOP_DAILY_LIMIT: "오늘 상점 구매 한도를 넘었어요. 내일 다시 구매할 수 있어요.",
  TRANSCEND_UNAVAILABLE: "초월할 수 없는 장비예요.",
  TRANSCEND_STARS_REQUIRED: "25성이어야 초월할 수 있어요.",
  BUY_ORDER_LIMIT: "구매 요청은 최대 10건까지 등록할 수 있어요.",
  BUY_ORDER_UNAVAILABLE: "이미 끝났거나 만료된 구매 요청이에요.",
  BUY_ORDER_OWN: "내 구매 요청에는 팔 수 없어요.",
  INVALID_MATERIAL: "거래할 수 없는 소모품이에요.",
  NOT_OWNER: "내 등록 건만 취소할 수 있어요.",
  INVALID_BALANCE: "보유 골드 한도(9조 G)를 넘어서 거래할 수 없어요.",
  INVALID_PRICE: "가격 범위를 확인해 주세요.",
  INVALID_BANK_TERM_LOCKED: "정기예금은 아직 준비 중이에요.",
  INVALID_BANK_TERM_AMOUNT: "가입 금액을 1골드 이상 입력해 주세요.",
  INVALID_BANK_TERM_LIMIT: "이 상품의 가입 한도를 넘어요. 남은 한도 안에서 가입해 주세요.",
  INVALID_BANK_TERM_GOLD_LIMIT: "보유 골드 한도를 넘어서 해지할 수 없어요.",
  BLACK_MARKET_EXPIRED: "암시장 진열이 바뀌었어요. 새 상품을 확인해 주세요.",
  BLACK_MARKET_SOLD_OUT: "남은 수량이 부족해요.",
  INVALID_BLACK_MARKET_ITEM: "암시장 상품을 찾을 수 없어요.",
  INVALID_BLACK_MARKET_QUANTITY: "구매 수량을 확인해 주세요.",
  INVALID_CONSUMABLE_QUANTITY: "구매 수량은 1개 이상의 정수로 입력해 주세요.",
  INSUFFICIENT_CONSUMABLE: "행운 물약이 없습니다. 상점 → 소모품에서 구매하세요.",
  ITEM_CONSUMABLE_COOLDOWN: "행운 물약의 재사용 대기시간이 남아 있습니다.",
  INSUFFICIENT_CUBE: "레드 큐브가 부족합니다.",
  INSUFFICIENT_HIGHCUBE: "블랙 큐브가 부족합니다.",
  INSUFFICIENT_ADDCUBE: "에디셔널 큐브가 부족합니다.",
  INSUFFICIENT_BONUSFLAME: "추가옵션 불꽃이 부족합니다.",
  INSUFFICIENT_REROLLSTONE: "기본수치 재련석이 부족합니다.",
  POTENTIAL_ADDITIONAL_OPEN: "이미 에디셔널 잠재능력이 열려 있습니다.",
  POTENTIAL_ADDITIONAL_REQUIRED: "에디셔널 잠재능력을 먼저 해금해 주세요.",
  COOP_CHEST_TOO_FAR: "개인 상자 가까이 이동한 뒤 공격 버튼을 눌러주세요.",
  COOP_DAMAGE_REQUIRED: "보스에게 직접 피해를 줘야 개인 상자를 받을 수 있습니다.",
  COOP_CHEST_NOT_READY: "보스 처치 후 개인 상자를 열 수 있습니다.",
  COOP_CHEST_CLAIMED: "이미 받은 상자입니다.",
  COOP_NOT_READY:"참가자 접속 준비가 끝나면 출발할 수 있습니다.",
  POTENTIAL_ALREADY_OPEN: "이미 잠재가 해금된 장비입니다.",
  INSUFFICIENT_SCROLL: "잠재 해금 주문서가 부족합니다.",
  INSUFFICIENT_EXPAND: "잠재 확장석이 부족합니다.",
  INSUFFICIENT_MATERIAL: "판매할 소모품 수량이 부족합니다.",
  INVALID_QUANTITY: "남은 수량 안에서 정수로 입력해 주세요.",
  BASE_STATS_FIXED: "이 장비의 기본 수치는 획득 시 확정됩니다.",

  INSUFFICIENT_FRAGMENT: "장비 파편이 부족합니다.",
  RIFT_CONTENT_REMOVED: "협동 균열은 종료된 콘텐츠입니다.",
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
  ITEM_IN_PRESET: "장비 슬롯에 등록된 장비는 판매할 수 없어요. 해당 슬롯에서 장착 해제한 뒤 판매해 주세요.",
  INVENTORY_FULL: "가방이 가득 찼습니다. 장비를 정리해 주세요.",
  MAIL_NOT_FOUND: "받을 수 있는 우편이 없습니다.",
  MAIL_ALREADY_CLAIMED: "이미 받은 우편입니다.",
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
  ADVANCEMENT_REQUIRED:"이전 단계 전직을 먼저 완료해야 합니다.",
  ALREADY_ADVANCED: "이미 전직을 완료했어요.",
  ALREADY_CLASS: "이미 선택한 직업이에요.",
  SKILL_COOLDOWN: "스킬 재사용 대기 중입니다.",
};
function message(e) {
  const arenaErrors={ARENA_OFFERS_EXPIRED:'상대 목록이 갱신됐어요. 새 상대를 확인해 주세요.',ARENA_OPPONENT_UNAVAILABLE:'이미 도전한 상대예요. 다른 상대를 골라 주세요.',INVALID_ARENA_OPPONENT:'상대를 다시 선택해 주세요.',ARENA_OPPONENT_MISSING:'상대 정보를 불러올 수 없어요. 잠시 후 다시 시도해 주세요.'};
  if(arenaErrors[e.message])return arenaErrors[e.message];
  if(e.message==='INVALID_INVESTMENT_PRICE_CHANGED')return '정각에 가격이 갱신됐어요. 새 가격을 확인하고 다시 거래해 주세요.';
  if(e.message==='INVALID_INVESTMENT_POSITION')return '이미 판매 또는 청산된 투자입니다. 투자 화면을 다시 열어 주세요.';
  const lotteryErrors={LOTTO_DUPLICATE:'이번 주에 이미 구매한 번호입니다.',LOTTO_DAILY_LIMIT:'오늘은 3장을 모두 구매했습니다.',LOTTO_ROUND_CHANGED:'추첨 회차가 바뀌었습니다. 로또 화면을 다시 열어주세요.',INVALID_LOTTO_NUMBERS:'1~18 중 서로 다른 번호 2개를 선택하세요.'};
  if(lotteryErrors[e.message])return lotteryErrors[e.message];
  if(e.message==='BETA_DISABLED')return '관리자만 사용할 수 있습니다.';
  if(e.message==='SHOP_BOSS_ONLY')return '보스장비만 판매할 수 있어요.';
  if(e.message==='INVALID_TRANSFER_LIMIT')return '받는 계정의 보유 한도(9조)를 초과합니다. 수량을 줄여 주세요.';
  if(e.message==='INVALID_TRANSFER_RECIPIENT')return '받는 계정을 찾을 수 없습니다. 랭킹을 새로고침해 주세요.';
  if(e.message==='INVALID_TRANSFER_AMOUNT')return '송금액은 1~999,999,999,999 G 사이의 정수로 입력해 주세요.';
  if(e.message==='INVALID_TRANSFER_SELF')return '자신에게는 송금할 수 없습니다.';
  if(e.message==='MAILBOX_FULL')return '받는 사람의 우편함이 가득 찼습니다.';
  if(String(e.message||'').startsWith('EXPLORATION_MEMBER_KEY_REQUIRED:'))return `던전 열쇠가 부족한 파티원: ${e.message.slice(32)} (보유/필요) · 파티원 모두 각자 열쇠가 필요해요.`;
  if(e.message==='RAID_PRIEST_REQUIRED')return '사제 1명 이상이 있어야 레이드를 출발할 수 있습니다.';
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
async function request(path, body, auth = true, signal = null) {
  if (auth && !session?.access_token) throw endSession();
  const r = await fetch(config.url + path, {
    method: "POST",
    headers: {
      apikey: config.publishableKey,
      "Content-Type": "application/json",
      ...(auth ? { Authorization: "Bearer " + session.access_token } : {}),
    },
    body: JSON.stringify(body),
    signal: signal?AbortSignal.any([signal,AbortSignal.timeout(['coopInput','towerInput','towerOpen'].includes(body?.command)?6000:20000)]):AbortSignal.timeout(['coopInput','towerInput','towerOpen'].includes(body?.command)?6000:20000),
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
let newsPollAt=0,newsPollPending=null;
async function refreshNewsNotifications(force=false,seen=[]){
 if(newsPollPending){if(!force)return;await newsPollPending;}
 if(!session||!state||(!force&&Date.now()-newsPollAt<30000))return;
 newsPollAt=Date.now();const account=session.user?.id;
 newsPollPending=(async()=>{await ensureToken();const result=await request('/rest/v1/rpc/rebirth_coin_news_notifications',{p_seen:seen});if(session?.user?.id!==account)return;const known=new Set(investmentNewsSummary().news.map(n=>n.id)),arrived=result.news.some(n=>!known.has(n.id));setNewsNotifications(result);if(arrived&&view==='game'&&tab==='investment'&&!busy)await command('investList',{},true);return result;})();
 try{return await newsPollPending;}finally{newsPollPending=null;}
}
setInterval(()=>{if(session&&state&&!coopController&&!document.hidden&&navigator.onLine&&Date.now()>=retryAt)refreshNewsNotifications().catch(()=>{});},1000);
let activityVersion=0;
async function openCoinActivity(kind){
 const version=++activityVersion,account=session?.user?.id;await ensureToken();
 const fetchPage=(before=null,id=null)=>request('/rest/v1/rpc/rebirth_coin_activity',{p_kind:kind,p_before:before,p_before_id:id});
 const first=await fetchPage();if(version!==activityVersion||session?.user?.id!==account)return;
 let rows=first.items.slice(0,14),more=first.items.length>14,last=rows.at(-1),loading=false;
 open(kind==='news'?'코인 속보':'코인 거래내역',kind==='news'?investmentNewsView({news:rows,serverNow:first.serverNow}):investmentHistoryView(rows,first.totals));modal.classList.add('invest-activity-dialog');if(kind==='trades')modal.classList.add('invest-trade-dialog');
 const list=modal.querySelector('.invest-activity-list'),end=list.querySelector('.invest-activity-more');
 const updateEnd=()=>{end.textContent=loading?'이전 기록 불러오는 중…':more?'아래로 내려 이전 기록 보기':rows.length?'마지막 기록입니다':'';};updateEnd();
 const acknowledge=ids=>refreshNewsNotifications(true,ids).catch(()=>{});
 if(kind==='news')acknowledge(rows.map(n=>n.id));
 list.addEventListener('scroll',async()=>{
  if(loading||!more||list.scrollTop+list.clientHeight<list.scrollHeight-90)return;
  loading=true;updateEnd();try{const page=await fetchPage(last[kind==='news'?'publishedAt':'closedAt'],last.id);if(!modal.open||version!==activityVersion||session?.user?.id!==account)return;const next=page.items.slice(0,14);end.insertAdjacentHTML('beforebegin',next.map(n=>kind==='news'?investmentNewsItem(n,Date.parse(page.serverNow)):investmentTradeItem(n)).join(''));rows.push(...next);last=next.at(-1)||last;more=page.items.length>14;if(kind==='news')await acknowledge(next.map(n=>n.id));}catch{end.textContent='불러오지 못했습니다. 다시 내려 주세요.';}finally{loading=false;updateEnd();}
 });
}
function copyTradingMarkup(data){
 copyData=data;
 const rate=(w,l)=>{w=Number(w)||0;l=Number(l)||0;return w+l?`카피 승률 <b>${Math.round(w/(w+l)*100)}%</b> · 카피 ${w+l}회`:'카피 기록 없음';};
 const following=data.following,followers=data.followers||[];
 const head=following?`<p class="note"><b>${esc(following.name)}</b> 카피 중 · 상대가 산 종목을 <b>카피 계좌</b> 잔액 비율만큼 따라 사고, 상대가 팔면 같이 팔아 카피 계좌로 돌려받아요. 직접 매수는 막히고, 직접 매도하면 카피가 끝나요.</p><div class="invest-copy-wallet"><div class="invest-copy-wallet-head"><span><small>카피 계좌</small><b>${fmt(data.copyWallet||0)} G</b></span><small>보유 골드 ${fmt(state?.gold||0)} G</small></div><div class="invest-copy-wallet-row"><input id="copy-wallet-amount" inputmode="numeric" autocomplete="off" placeholder="금액" aria-label="카피 계좌 입출금 금액"><button type="button" data-action="investCopyWalletMax" data-arg="deposit" data-illustrated="1">입금 최대</button><button type="button" data-action="investCopyWalletMax" data-arg="withdraw" data-illustrated="1">출금 최대</button></div><div class="invest-copy-wallet-row"><button data-action="investCopyWallet" data-arg="deposit" data-write data-illustrated="1">입금</button><button data-action="investCopyWallet" data-arg="withdraw" data-write data-illustrated="1">출금</button></div>${data.copyHold?`<small class="invest-copy-hold">최소 유지 <b>${fmt(copyHold(data))} G</b> · 출금 후 잔액이 이보다 적으면 카피가 해제돼요 (매매 손실로 줄어든 건 괜찮아요)</small>`:''}<small>카피는 이 계좌에 넣은 돈으로만 해요 · 포지션에 들어간 돈은 팔린 뒤에 출금할 수 있어요 · 카피를 끝내면 남은 잔액은 자동으로 보유 골드로 돌아가요</small></div><button data-action="investCopyStop" data-write data-illustrated="1">카피 종료</button>`:`<p class="note">상대가 매수할 때 쓴 보유 골드 비율만큼 같은 종목·방향·레버리지로 자동 매수하고, 상대가 팔면 같이 팔아요.<br>신청 조건: ${fmt(data.minGold||10000000)} 골드 이상 보유 · 보유 포지션 없음 · 한 유저당 최대 ${data.maxCopiers||2}명${data.copyHold?'<br>신청하면 리더의 <b>최소 자본만큼 카피 계좌로 자동 입금</b>되고, 그 금액 아래로 직접 출금하면 카피가 해제돼요.':''}</p>`;
 const mine=(followers.length?`<div class="invest-copy-followers"><p class="note">나를 카피 중 <b>${followers.length}명</b> · 카피 계좌 합계 <b>${fmt(followers.reduce((n,f)=>n+Number(f.wallet||0),0))} G</b></p>${followers.map(f=>`<div class="invest-copy-follower"><b>${esc(f.name)}</b><span>카피 계좌 <em class="${Number(f.wallet)>0?'positive':'negative'}">${fmt(f.wallet||0)} G</em>${Number(f.margin)>0?` · 포지션 ${fmt(f.margin)} G`:''}</span></div>`).join('')}<button class="invest-copy-disband" data-action="investCopyDisband" data-write data-illustrated="1">카피 해산</button><small class="note">해산하면 나를 카피 중인 유저가 모두 해제되고, 각자 카피 계좌 잔액은 보유 골드로 돌아가요 · 내 포지션을 모두 판 뒤에 할 수 있어요</small></div>`:'<p class="note">나를 카피 중인 유저가 없어요.</p>')+`<p class="note">내 ${rate(data.myStats?.wins,data.myStats?.losses)}</p>`+`<div class="invest-copy-reward-box"><span><small>쌓인 카피 보상</small><b>${fmt(data.rewardPending||0)} G</b><small>지금까지 받은 보상 ${fmt(data.rewardClaimed||0)} G</small></span><button data-action="investCopyClaim" data-write data-illustrated="1" ${Number(data.rewardPending)>0?'':'disabled'}>수령</button></div>`+`<div class="invest-copy-min invest-copy-intro-edit"><label for="copy-intro">내 한 줄 소개 <small>(다른 유저가 카피할 때 참고해요)</small></label><div><input id="copy-intro" maxlength="60" autocomplete="off" placeholder="예: 3배 롱 위주 · 손절 빠름 · 하루 10회 이상" value="${esc(data.myIntro||'')}" aria-label="카피 한 줄 소개"><button data-action="investCopyIntro" data-write data-illustrated="1">저장</button></div><small>최대 60자</small></div>`+`<div class="invest-copy-min"><label for="copy-min-gold">나를 카피하려면 보유 골드</label><div><input id="copy-min-gold" inputmode="numeric" autocomplete="off" value="${fmt(data.myMinGold||10000000)}" aria-label="카피 신청 최소 자본"><span>G 이상</span><button data-action="investCopyMin" data-write data-illustrated="1">저장</button></div><small>새 카피 신청에만 적용돼요 · 1,000만~1조 골드</small></div>`;
 const list=(data.candidates||[]).map(u=>{const isLeader=following?.id===u.id;if(u.self)return `<article class="invest-copy-row is-self"><span><b>${esc(u.name)} (나)</b>${u.intro?`<small class="invest-copy-intro">“${esc(u.intro)}”</small>`:''}<small>포지션 ${u.open}개 · 카피 ${u.copiers}/${data.maxCopiers||2}명${u.copying?' · 다른 유저 카피 중':''}</small><small class="invest-copy-rate">${rate(u.wins,u.losses)}</small></span><em>나</em></article>`;const maxC=data.maxCopiers||2,full=u.copiers>=maxC,min=Number(u.minGold)||10000000,poor=Number(state?.gold||0)<min;const blocked=!!following||u.copying||followers.length>0||full||poor;return `<article class="invest-copy-row"><span><b>${esc(u.name)}</b>${u.intro?`<small class="invest-copy-intro">“${esc(u.intro)}”</small>`:''}<small>포지션 ${u.open}개 · 카피 ${u.copiers}/${data.maxCopiers||2}명${u.copying?' · 다른 유저 카피 중':''}</small><small class="invest-copy-min-need ${poor?'negative':'positive'}">최소 자본 ${fmt(min)} G${poor?' · 골드 부족':' · 신청 가능'}</small><small class="invest-copy-rate">${rate(u.wins,u.losses)}</small></span>${isLeader?'<em>카피 중</em>':full?'<em>인원 마감</em>':`<button data-action="investCopyStart" data-arg="${esc(u.id)}" data-write data-illustrated="1" ${blocked?'disabled':''}>카피 신청</button>`}</article>`;}).join('');
 return `<section class="invest-copy-feed">${head}<p class="note invest-copy-reward">💰 카피로 같이 판 거래가 <b>수익</b>이면, 카피한 유저 순수익의 <b>10%</b>를 리더 보상함에 쌓아줘요. 카피한 유저 돈에서 빠지는 게 아니라 <b>따로 지급</b>돼요. 손실·청산이면 보상 없어요.</p>${mine}<div class="invest-copy-list">${list}</div></section>`;
}
async function openCopyTrading(){
 const account=session?.user?.id;await ensureToken();
 const data=await request('/rest/v1/rpc/rebirth_coin_copy',{p_action:'status'});
 if(session?.user?.id!==account)return;
 open('카피 트레이딩',copyTradingMarkup(data));
}
async function copyTradingClaim(){
 const account=session?.user?.id;
 try{await ensureToken();const data=await request('/rest/v1/rpc/rebirth_coin_copy_claim',{});
  if(session?.user?.id!==account)return;
  toast(`카피 보상 ${fmt(data.claimed||0)} G를 받았어요.`);
  if(modal.open&&modal.querySelector('.invest-copy-feed'))open('카피 트레이딩',copyTradingMarkup(data));
  await command('investList',{},true);
 }catch(e){toast(errors[e.message]||e.message||'잠시 후 다시 시도해 주세요.');}
}
function copyTradingDisbandAsk(){
 open('카피 해산',`<div class="stack"><p>나를 카피 중인 유저를 <b>모두 해제</b>할까요?</p><p class="note">각자 카피 계좌에 남은 돈은 보유 골드로 자동으로 돌아가요. 되돌릴 수 없어요.</p><div class="invest-copy-wallet-row"><button data-action="investCopy" data-illustrated="1">취소</button><button class="invest-copy-disband" data-action="investCopyDisbandConfirm" data-illustrated="1">확인</button></div></div>`);
}
let copyDisbandPending=false;
async function copyTradingDisband(){
 const account=session?.user?.id;
 try{await ensureToken();const data=await request('/rest/v1/rpc/rebirth_coin_copy',{p_action:'disband'});
  if(session?.user?.id!==account)return;
  toast('카피를 해산했어요. 카피 중이던 유저가 모두 해제됐어요.');
  if(modal.open)open('카피 트레이딩',copyTradingMarkup(data));
 }catch(e){toast(errors[e.message]||e.message||'잠시 후 다시 시도해 주세요.');}
}
let copyData=null;
const copyHold=d=>Math.max(10000000,Number(d?.following?.minGold)||0);
function copyTradingWalletAsk(amount){
 const bal=Number(copyData?.copyWallet)||0,hold=copyHold(copyData);
 open('카피 해제 경고',`<div class="stack"><p><b>${fmt(amount)} G</b>를 빼면 카피 계좌가 <b>${fmt(Math.max(0,bal-amount))} G</b>가 돼서 최소 유지 금액 <b>${fmt(hold)} G</b>보다 적어져요.</p><p class="note"><b>${esc(copyData?.following?.name||'')}</b> 카피가 <b class="negative">해제</b>되고, 카피 계좌 잔액 <b>${fmt(bal)} G</b>는 전부 보유 골드로 돌아가요. 되돌릴 수 없어요.</p><div class="invest-copy-wallet-row"><button data-action="investCopy" data-illustrated="1">취소</button><button class="invest-copy-disband" data-action="investCopyWalletForce" data-arg="${amount}" data-write data-illustrated="1">출금하고 카피 해제</button></div></div>`);
}
async function copyTradingWallet(kind,forced=null){
 const account=session?.user?.id,amount=forced??Number(String(modal.querySelector('#copy-wallet-amount')?.value||'').replace(/[^0-9]/g,''));
 if(!Number.isSafeInteger(amount)||amount<1){toast(errors.COPY_WALLET_INVALID_AMOUNT);return;}
 if(kind==='withdraw'&&forced===null&&copyData?.copyHold&&copyData?.following&&amount<=(Number(copyData.copyWallet)||0)&&(Number(copyData.copyWallet)||0)-amount<copyHold(copyData)){copyTradingWalletAsk(amount);return;}
 try{await ensureToken();const data=await request('/rest/v1/rpc/rebirth_coin_copy_wallet',{p_action:kind,p_amount:amount});
  if(session?.user?.id!==account)return;
  await command('investList',{},true);
  toast(data.copyEnded?'카피가 해제됐어요. 카피 계좌 잔액은 전부 보유 골드로 돌아갔어요.':kind==='deposit'?`카피 계좌에 ${fmt(amount)} G를 넣었어요.`:`카피 계좌에서 ${fmt(amount)} G를 뺐어요.`);
  if(data.copyEnded||modal.open&&modal.querySelector('.invest-copy-feed'))open('카피 트레이딩',copyTradingMarkup(data));
 }catch(e){toast(errors[e.message]||e.message||'잠시 후 다시 시도해 주세요.');}
}
async function copyTradingIntro(){
 const account=session?.user?.id,intro=String(modal.querySelector('#copy-intro')?.value||'').trim();
 if(intro.length>60){toast(errors.COPY_INTRO_TOO_LONG);return;}
 try{await ensureToken();const data=await request('/rest/v1/rpc/rebirth_coin_copy_intro',{p_intro:intro});
  if(session?.user?.id!==account)return;
  toast(intro?'한 줄 소개를 저장했어요.':'한 줄 소개를 지웠어요.');
  if(modal.open&&modal.querySelector('.invest-copy-feed'))open('카피 트레이딩',copyTradingMarkup(data));
 }catch(e){toast(errors[e.message]||e.message||'잠시 후 다시 시도해 주세요.');}
}
async function copyTradingMin(){
 const account=session?.user?.id,raw=String(modal.querySelector('#copy-min-gold')?.value||'').replace(/[^0-9]/g,''),min=Number(raw);
 if(!raw||!Number.isSafeInteger(min)||min<10000000||min>1000000000000){toast(errors.COPY_MIN_INVALID);return;}
 try{await ensureToken();const data=await request('/rest/v1/rpc/rebirth_coin_copy_min',{p_min:min});
  if(session?.user?.id!==account)return;
  toast(`카피 최소 자본을 ${fmt(min)} G로 정했어요.`);
  if(modal.open&&modal.querySelector('.invest-copy-feed'))open('카피 트레이딩',copyTradingMarkup(data));
 }catch(e){toast(errors[e.message]||e.message||'잠시 후 다시 시도해 주세요.');}
}
async function copyTradingAction(kind,leader){
 const account=session?.user?.id;
 try{await ensureToken();const data=await request('/rest/v1/rpc/rebirth_coin_copy',kind==='start'?{p_action:'start',p_leader:leader}:{p_action:'stop'});
  if(session?.user?.id!==account)return;
  toast(kind==='start'?`${data.following?.name||''} 카피를 시작했어요.${data.copyHold?` 카피 계좌에 ${fmt(Number(data.copyWallet)||0)} G가 들어갔어요.`:''}`:'카피 트레이딩을 종료했어요.');
  if(modal.open&&modal.querySelector('.invest-copy-feed'))open('카피 트레이딩',copyTradingMarkup(data));
  await command('investList',{},true);
 }catch(e){toast(errors[e.message]||e.message||'잠시 후 다시 시도해 주세요.');}
}
async function openCoinRankings(){
 const account=session?.user?.id;await ensureToken();
 const first=await request('/rest/v1/rpc/rebirth_coin_rankings',{});
 if(session?.user?.id!==account)return;
 open('투자 수익률 순위','<section class="invest-rank-feed"><p>청산 포함 · 종료된 거래 원금 대비 수익률</p><div class="invest-rank-list"></div><small class="invest-rank-updated"></small></section>');
 modal.classList.add('invest-rank-dialog');
 const list=modal.querySelector('.invest-rank-list'),stamp=modal.querySelector('.invest-rank-updated');
 const paint=data=>{list.innerHTML=data.users.map((u,i)=>{const value=Number(u.percent)||0;return `<article><b>${i+1}</b><span>${esc(u.name)}</span><strong class="${value<0?'negative':'positive'}">${value>0?'+':''}${value.toFixed(2)}%</strong></article>`;}).join('');stamp.textContent=`10초마다 자동 갱신 · ${new Date(data.serverNow).toLocaleTimeString('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',second:'2-digit'})}`;};
 paint(first);let pending=false;
 const timer=setInterval(async()=>{if(!modal.open||!list.isConnected||session?.user?.id!==account){clearInterval(timer);return;}if(pending||document.hidden||!navigator.onLine)return;pending=true;try{await ensureToken();const data=await request('/rest/v1/rpc/rebirth_coin_rankings',{});if(modal.open&&list.isConnected&&session?.user?.id===account)paint(data);}catch{if(stamp.isConnected)stamp.textContent='갱신 지연 · 자동 재시도 중';}finally{pending=false;}},10000);
 modal.addEventListener('close',()=>clearInterval(timer),{once:true});
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
    // Leaving must never be starved by the room's own request loop: stop it first (render() recreates it
    // if the leave fails and the player is still in the room).
    if(action==='coopLeave'){if(coopController){coopController.dispose();coopController=null;}activeCoopInput?.abort();}
    while(busy)await new Promise(resolve=>commandIdleWaiters.push(resolve));
    return command(action);
  })();
  try{return await pendingDungeonExit;}finally{pendingDungeonExit=null;}
}
function sendCoopReady(){command('coopReady',{},true).catch(()=>{});}
let activeCoopInput=null,activeBackgroundSync=null,citadelClaimBusy=false;
let fishingRequest=null;
async function fishingCommandRequest(action,args={}){
 if(fishingRequest||!state)return;
 const account=session?.user?.id,root=app.querySelector('.fishing-screen');
 fishingUI.pending=action;showFishingPending(root,action);
 const work=(async()=>{
  activeBackgroundSync?.abort();
  while(busy)await new Promise(resolve=>commandIdleWaiters.push(resolve));
  if(session?.user?.id!==account||!state)return;
  for(let attempt=0;attempt<3;attempt++){
   const result=await command(action,args);
   if(result?.result?.events?.some(e=>e.type===action||((action==='fishFinish'||action==='fishHook')&&e.type==='fishCatch')||(action==='fishHook'&&e.type==='fishBite')))return result;
   if(!result)return;
  }
  throw Error('SERVER_RETRY_REQUIRED');
 })();fishingRequest=work;
 try{return await work;}catch(error){render();throw error;}finally{
  fishingRequest=null;fishingUI.pending=null;
  const current=app.querySelector('.fishing-screen');current?.removeAttribute('aria-busy');
  current?.querySelectorAll('.fishing-sites button').forEach(b=>{b.disabled=!!state?.fishing?.cast;});
  current?.querySelectorAll('[data-fish-write]').forEach(b=>{b.disabled=b.hasAttribute('data-unavailable');b.classList.remove('fishing-pending');});
  const text=current?.querySelector('[data-fish-transaction]');if(text)text.textContent='';
 }
}
// Companion clicks queue behind existing writes instead of being silently dropped.
async function companionCommandRequest(action,args={}){
 const account=session?.user?.id;
 activeBackgroundSync?.abort();
 while(busy)await new Promise(resolve=>commandIdleWaiters.push(resolve));
 if(!state||session?.user?.id!==account)return;
 return command(action,args);
}
let professionCounts={},profTab=null;
const profSkill=id=>({id,level:1,xp:0,crafted:0,...(state?.professions?.[id]||{})});
const openProfession=()=>{open('전문 직업',professionView(state,Date.now(),professionCounts,profTab));modal.classList.add('prof-dialog');};
async function command(command, args = {}, quiet = false, freshSnapshot = false, signal = null) {
  const claimOnly=command==='coopOpen'&&args.citadelClaim===true;
  const requestKey=pendingKey()+(claimOnly?'_citadel_claim':'');
  // A short input request must not swallow leave/chest/speed button presses.
  if(!claimOnly&&busy&&['coopLeave','coopOpen','coopSync'].includes(command)){
    const roomAtClick=state?.coopRoom;
    activeCoopInput?.abort();
    while(busy)await new Promise(resolve=>commandIdleWaiters.push(resolve));
    if(state?.coopRoom!==roomAtClick)return;
  }
  if(busy&&command==='towerInput'&&activeBackgroundSync){
    activeBackgroundSync.abort();
    while(busy)await new Promise(resolve=>commandIdleWaiters.push(resolve));
    if(state?.battle?.runId!==args.runId)return;
  }
  if(busy&&command==='towerOpen'){
    const runAtClick=args.runId;
    while(busy)await new Promise(resolve=>commandIdleWaiters.push(resolve));
    if(state?.battle?.runId!==runAtClick)return;
  }
  if ((claimOnly?citadelClaimBusy:busy) || (pendingDungeonExit&&!dungeonExitActions.has(command))) return;
  if(claimOnly)citadelClaimBusy=true;else busy=true;
  const towerStreaming=command==="towerInput";
  const streaming=command==="coopInput"||towerStreaming;
  const accountAtSend=session?.user?.id;
  let storedRequest=null;try{storedRequest=JSON.parse(localStorage.getItem(requestKey)||'null');}catch{}
  const background=command==='sync'&&quiet&&state&&(!storedRequest||storedRequest.command==='sync');
  const inputAbort=streaming||background?new AbortController():null;
  if(command==='coopInput')activeCoopInput=inputAbort;
  if(background)activeBackgroundSync=inputAbort;
  // The input slot includes token refresh, not just fetch. A stuck refresh used
  // to hold busy forever and stop every subsequent multiplayer packet.
  const inputDeadline=AbortSignal.timeout(streaming||command==='coopOpen'||command==='towerOpen'?6000:20000);
  const baseSignal=inputAbort?(signal?AbortSignal.any([signal,inputAbort.signal]):inputAbort.signal):signal;
  const requestSignal=inputDeadline?AbortSignal.any([inputDeadline,...(baseSignal?[baseSignal]:[])]):baseSignal;
  if(!streaming&&!background&&!claimOnly)document
    .querySelectorAll("button[data-write]")
    .forEach((b) => {if(!dungeonExitActions.has(b.dataset.action))b.disabled=true;});
  let body, recoverCharacter = false;
  const recoverySync=command==="sync"&&(!state||freshSnapshot);
  try {
    await abortable(ensureToken(),requestSignal);
    if(requestSignal?.aborted||session?.user?.id!==accountAtSend)return;
    if(towerStreaming){
      // Movement is replayed by runId/from. Do not let a stale movement receipt
      // block the current packet; preserve pending reward/other durable writes.
      try{const old=JSON.parse(localStorage.getItem(requestKey)||'null');if(old?.command==='towerInput')localStorage.removeItem(requestKey);}catch{}
      const durable=localStorage.getItem(requestKey);
      if(durable){try{const saved=JSON.parse(durable);if(typeof saved?.command==='string'&&saved.args&&saved.requestId)body=saved;}catch{}}
    }
    if(!recoverySync&&!streaming){
      try{body=JSON.parse(localStorage.getItem(requestKey)||"null");}catch{body=null;}
      if(body?.command==="coopInput"){localStorage.removeItem(requestKey);body=null;}
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
      // 2026-11-03 연결 지연 개선: 자주 오가는 sync도 바뀐 부분만 받는다(state 전체 40~140KB → 변경분).
      body = { command, args:command.startsWith('fish')||towerStreaming||(command==='sync'&&state&&Number.isSafeInteger(stateRevision))?{...args,_compact:true,_stateRevision:stateRevision}:args, requestId: crypto.randomUUID() };
      if(!recoverySync&&!streaming)localStorage.setItem(requestKey, JSON.stringify(body));
    }
    const sentAt=performance.now();
    if(state?.battle?.kind==='boss'||body.command==='boss')lastBattleRequestAt=Date.now();
    const result = await request("/functions/v1/ringu-rebirth", body,true,requestSignal);
    if(requestSignal?.aborted||session?.user?.id!==accountAtSend)return;
    // Compact multiplayer replies (coop-wire.mjs); a snapshot that cannot be decoded is skipped.
    if(result.coop){try{result.coop=decodeCoopReply(result.coop);}catch{delete result.coop;}}
    if(result.coop)result.coop._rtt=performance.now()-sentAt;
    if(recoverySync){const abandoned=localStorage.getItem(requestKey);if(abandoned)localStorage.setItem(requestKey+"_recovered",abandoned);}
    // Movement must not discard a reward receipt that is waiting for retry.
    try{if(recoverySync||JSON.parse(localStorage.getItem(requestKey)||'null')?.requestId===body.requestId)localStorage.removeItem(requestKey);}catch{}
    const audioPrevious=state;
    const previousHuntAt = state?.lastAt;
    if(result.statePatch){
      if(result.statePatch.baseRevision===stateRevision)result.state=applyFishingPatch(state,stateRevision,result.statePatch);
      else{
        const snapshot=await request('/functions/v1/ringu-rebirth',{command:'sync',args:{},requestId:crypto.randomUUID()},true,requestSignal);
        result.state=snapshot.state;result.revision=snapshot.revision;delete result.statePatch;
      }
    }
    if(Object.hasOwn(result,'state')&&(!Number.isSafeInteger(stateRevision)||!Number.isSafeInteger(result.revision)||result.revision>=stateRevision)){
      state = result.statePatch&&!result.statePatch.changes?.items?result.state:D.normalizePotentialState(result.state);
      stateRevision=Number.isSafeInteger(result.revision)?result.revision:null;
      if(state&&(body.command==='sync'||state.lastAt!==previousHuntAt))lastHuntSettlement=Date.now();
    }
    if(result.investment){investmentData=result.investment;investmentLoadedAt=Date.now();}
    if(result.lotto){lottoData=result.lotto;lottoLoadedAt=Date.now();}
    if(result.fishingContest){fishingUI.contest=result.fishingContest;fishingUI.contestLoadedAt=Date.now();}
    if(result.fishingRecords){fishingUI.records=result.fishingRecords;fishingUI.recordsLoadedAt=Date.now();}
    // 2026-11-06 도현: 보스 물고기 — 전체 기록(status) 또는 방금 때린 보스 한 마리(live)를 합친다.
    if(result.fishBoss){if(result.fishBoss.live){const row=result.fishBoss.history?.[0],old=fishingUI.boss?.history||[];if(row)fishingUI.boss={...(fishingUI.boss||{}),history:[row,...old.filter(x=>x.id!==row.id)]};}else{fishingUI.boss=result.fishBoss;fishingUI.bossLoadedAt=Date.now();}}
    if(result.professionCounts)professionCounts=result.professionCounts;
    if(result.arena){arenaData=result.arena;arenaError='';}
    if(result.battle){arenaBattle=result.battle;arenaPage='battle';if(arenaPlayback){arenaPlayback.stop();arenaPlayback=null;}}
    // A fishing daily that just became claimable gets a one-time toast (badges stay until it is claimed).
    if(audioPrevious&&state){if(state.level>audioPrevious.level)sounds.play('level-up');else if((state.recentLoot?.[0]?.at||0)>(audioPrevious.recentLoot?.[0]?.at||0))sounds.play(state.recentLoot[0].kind==='gear'&&state.recentLoot[0].item?.boss?'loot-rare':'loot-common');}
    if("coop" in result){
      if(!state?.coopRoom)coopRoom=null;
      else if(result.coop?.id===state.coopRoom&&(!coopRoom||coopRoom.id!==result.coop.id||(result.coop.revision??0)>=(coopRoom.revision??0)))coopRoom=result.coop;
    }else if(!state?.coopRoom)coopRoom=null;
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
    if (!quiet || result.result?.events?.some(e=>["boss","dungeon","party","tower","coop","advancementTrial","citadelChest","tokenBoss","keyBoss","sweep"].includes(e.type))) showEvents(result.result?.events || []);
    return result;
  } catch (e) {
    if((requestSignal?.aborted&&!inputDeadline?.aborted)||baseSignal?.aborted||session?.user?.id!==accountAtSend){
      if(background&&body?.command==='sync'){try{if(JSON.parse(localStorage.getItem(requestKey)||'null')?.requestId===body.requestId)localStorage.removeItem(requestKey);}catch{}}
      return;
    }
  if(e.message==='INVALID_INVESTMENT_PRICE_CHANGED'){investmentData=null;investmentLoadedAt=0;}
    if (e.status === 400) {localStorage.removeItem(requestKey);recoverCharacter=!state&&!!session&&body?.command!=="sync";}
    if (e.status === 401) {
      endSession();
    }
    if ((!e.status || e.status >= 500)&&e.message!=="SAVE_CONFLICT") {
      connectionLost = true;
      retryFailures++;
      retryAt = Date.now() + (towerStreaming?500:Math.min(60000, 5000 * 2 ** Math.min(retryFailures - 1, 4)));
      const banner = $("#connection-status");
      if (banner) banner.hidden = false;
      if (!state && session) unavailable();
    }
    if (!quiet || !state) toast(message(e));
    throw e;
  } finally {
    if(activeCoopInput===inputAbort)activeCoopInput=null;
    if(background&&requestSignal?.aborted&&body?.command==='sync'){try{if(JSON.parse(localStorage.getItem(requestKey)||'null')?.requestId===body.requestId)localStorage.removeItem(requestKey);}catch{}}
    if(activeBackgroundSync===inputAbort)activeBackgroundSync=null;
    if(claimOnly)citadelClaimBusy=false;else{
      busy=false;commandIdleWaiters.splice(0).forEach(resolve=>resolve());
    }
    if(command!=='coopReady'&&coopRoom?.status==='waiting'&&coopRoom.members.some(m=>m.id===coopRoom.me&&!m.ready))
      queueMicrotask(sendCoopReady);
    if(autoHuntPending)queueMicrotask(flushAutoHunt);
    if(recoverCharacter)queueMicrotask(()=>command("sync",{},true).catch(()=>{}));
    if(view==="ranking"&&state&&!rankingLoading&&rankingUpdated===0&&!connectionLost)loadRankings(true);
    if(!streaming&&!claimOnly)document
      .querySelectorAll("button[data-write]")
      .forEach((b) => (b.disabled = b.hasAttribute("data-unavailable")));
  }
}
async function loadArena(){
  arenaError='';
  for(let attempt=0;attempt<2;attempt++){
    while(busy)await new Promise(resolve=>commandIdleWaiters.push(resolve));
    try{
      const result=await command('arenaList',{},true);
      if(result?.arena)return result.arena;
    }catch(e){arenaError=message(e);render();return null;}
  }
  arenaError='아레나 정보를 불러오지 못했어요. 다시 시도해 주세요.';
  render();
  return null;
}
const icon = (name) => {
  const paths = {
    event: "M4 10h16v11H4zM2 6h20v4H2zM12 6v15M12 6C3 6 5 0 9 3l3 3c9 0 7-6 3-3z",
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
function systemInbox() {
  const mails=state.systemMailbox||[],blocked=!!(state.battle||state.partyRoom||state.coopRoom);
  const labels={fishToken:"낚시 토큰",diamond:"다이아",luckPotion:"행운 물약",treasureTicket:"보물찾기 티켓",tokens:"토큰",bossChest200:"200제 보스 장비 상자 (직업·부위 랜덤)",tribeTicket:"종족 주사위",pickupTicket:"픽업 소환권",companionTicket:"동료 소환권",scroll:"장비 잠재 개방 주문서",fragment:"장비 파편"};
  const tradeN=mails.filter(m=>m.kind==="trade").length;
  open("우편함",`<p class="mail-intro">받지 않은 우편 ${mails.length}통 · 보상을 받으면 우편이 사라집니다.</p>${tradeN>1?`<div class="actions">${disabledBtn(blocked?"전투·파티 종료 후 받기":`거래소 우편 ${tradeN}통 모두 받기`,"claimTradeMailAll","",blocked,"gold")}</div>`:""}<div class="stack">${mails.map(mail=>`<article class="system-mail"><span class="mail-sender">${esc(mail.sender)}</span><h3>${esc(mail.title)}</h3><p>${esc(mail.message)}</p><div class="mail-rewards">${mail.kind==="lumiBossChest"?'<div class="mail-reward"><span class="pet-chest" style="width:56px;height:56px"></span><span>100레벨 보스 장비 상자<strong>1개</strong></span></div>':""}${mail.kind==="wheelBossChest"?'<div class="mail-reward"><img src="ui/lucky-wheel-chest.svg" alt="" style="width:56px;height:56px"><span>Lv.150~190 보스 장비 상자<strong>1개</strong></span></div>':""}${(mail.items||[]).map(it=>it.kind==='companion'?`<div class="mail-reward mail-gear"><img src="companions/${esc(it.c)}-human-v1.webp" alt="" style="width:48px;height:48px;object-fit:contain"><span>동료 카드<strong>${cpCardInfo(it)}</strong></span></div>`:`<div class="mail-reward mail-gear">${gearMarkup(it)}<span>${esc(D.gearName(it))}<strong>${requiredLevel(it.level)} · ${it.stars||0}★</strong></span></div>`).join("")}${Object.entries(mail.rewards||{}).map(([key,amount])=>`<div class="mail-reward" data-currency-label="${esc(key)}">${key==='gold'?'':`<img src="${key==='tribeTicket'?'tribes/polished-v1/ticket-transparent-v2.webp':key==='tokens'?'token/token-v1.webp':key==='bossChest200'?'ui/lucky-wheel-chest.svg':currencyIconURL(key)}" alt="">`}<span>${esc(key==="gold"?"골드":labels[key]||D.MATERIALS[key])}<strong>${fmt(amount)}${key==="gold"?" G":["companionTicket","pickupTicket"].includes(key)?"장":"개"}</strong></span></div>`).join("")}</div><p class="note">${mail.kind==="trade"?"거래소 거래 · 수령 기한 없음":"계정당 1회 수령 · 수령 기한 없음"}</p><div class="actions">${disabledBtn(blocked?"전투·파티 종료 후 받기":"보상 받기","claimSystemMail",mail.id,blocked,"gold")}</div></article>`).join("")||'<div class="mail-empty"><strong>받을 우편이 없습니다</strong><p>수령한 보상은 가방에서 확인할 수 있어요.</p></div>'}</div>`);
}
function systemMailButton() {
  const count=state.systemMailbox?.length||0;
  const label=count?`우편함 · 받지 않은 우편 ${count}통`:'우편함 · 받은 우편 없음';
  return `<button class="mail-icon-button ${count?'mail-alert':''}" data-action="systemInbox" aria-label="${esc(label)}" title="${esc(label)}"><img class="mail-envelope-icon" src="ui/mail-envelope-v1.png" width="38" height="38" alt="" aria-hidden="true">${count?`<span class="mail-count" aria-hidden="true">${count}</span>`:''}</button>`;
}
function attendanceReady() { return state?.attendance?.lastClaim !== D.dayKey(Date.now()); }
function attendanceReward(reward) {
  return Object.entries(reward).map(([key,amount]) => `${key==="gold"?"골드":key==="fishDiamond"?"낚시 다이아":key==="tribeTicket"?"종족 주사위":key==="tokens"?"토큰":key==="companionTicket"?"동료 소환권":key==="pickupTicket"?"픽업 소환권":D.MATERIALS[key]} ${fmt(amount)}${key==="gold"?" G":["companionTicket","pickupTicket"].includes(key)?"장":"개"}`).join(" · ");
}
function attendance() {
  const claimed = !attendanceReady(), day = ((state.attendance?.day || 0) % 7) + 1;
  const completed = claimed && state.attendance?.day===7 ? 7 : claimed ? state.attendance?.day||0 : day-1;
  open("7일 출석 보상", `<p class="attendance-lead">${claimed?"오늘 출석 완료! 내일 "+day+"일차 보상을 받을 수 있어요.":"오늘은 "+day+"일차 보상을 받을 수 있어요."}</p><div class="attendance-grid">${D.ATTENDANCE_REWARDS.map((reward,i)=>`<div class="attendance-day ${i===6?"attendance-grand":""} ${i+1===day&&!claimed?"attendance-next":""} ${i+1<=completed?"attendance-done":""}"><strong>${i+1}일차 ${i===6?"★ 특별 보상":""}</strong><span>${attendanceReward(reward)}</span>${i+1===day&&!claimed?"<small>오늘 수령 가능</small>":""}</div>`).join("")}</div><p class="note">매일 오전 0시(한국 시간)에 다음 보상을 받을 수 있어요. 하루를 놓쳐도 진행일은 유지되며 7일차를 받은 뒤 다시 1일차부터 반복됩니다.</p><div class="actions">${claimed?btn("내일 다시 받기","close","","",false):state.battle||state.partyRoom?'<button disabled>전투 종료 후 받기</button>':btn(day+"일차 보상 받기","attendanceClaim","","gold",true)}</div>`);
  modal.classList.add("attendance-dialog");
}
// 테스터 계정 전용: 직업별 보스용 종결 세트로 한 번에 전환(직업 변경 + 그 직업 장비 프리셋 자동 장착).
function testerSetBar(){
  if(state?.name!=="테스터"&&!state?.isAdmin)return "";
  // 프리셋 1 = 200제 종결, 프리셋 2 = 220제 종결. 지금 직업·프리셋과 같은 버튼은 비활성.
  const row=(label,preset)=>`<div class="subnav tester-set-bar" aria-label="테스터 ${label} 세트"><small style="align-self:center;opacity:.7">${label}</small>${D.CLASSES.map(c=>{const on=c.id===state.classId&&(state.gearPresets?.[c.id]?.active??0)===preset;return `<button data-action="testerSet" data-arg="${c.id}:${preset}" ${on?"disabled class=\"active\"":""}>${c.name}</button>`;}).join("")}</div>`;
  // 2026-11-06: 250제·300제 — 프리셋 대신 그 레벨 최고 장비를 바로 장착.
  const weaponLv=Number(state.items?.find(x=>x.id===state.equipped?.[0])?.level)||0;
  const full=lv=>`<div class="subnav tester-set-bar" aria-label="테스터 ${lv}제 세트"><small style="align-self:center;opacity:.7">${lv}제</small>${D.CLASSES.map(c=>{const on=c.id===state.classId&&weaponLv===lv;return `<button data-action="testerFullSet" data-arg="${c.id}:${lv}" ${on?"disabled class=\"active\"":""}>${c.name}</button>`;}).join("")}</div>`;
  return row("200제",0)+row("220제",1)+full(250)+full(300);
}
function changeClassDialog() {
  const current = D.CLASSES.find(c=>c.id===state.classId);
  open("직업 변경", `<p class="note">현재 ${current.name} · 변경하면 장착 장비가 모두 가방으로 돌아가고 자동사냥이 멈춥니다. 전직·레벨·보스 기록은 유지돼요.</p><div class="change-class-grid">${D.CLASSES.map((c,i)=>`<button class="change-class-card ${c.id===state.classId?"current":""}" data-action="changeClassPick" data-arg="${c.id}" ${c.id===state.classId?"disabled":""}><span class="portrait ${c.id==='priest'?'priest-portrait':''}" style="background-position:${portraitPosition(c.id)}% 0" aria-hidden="true"></span><strong>${c.name}</strong><small>${c.stat} · ${c.weapon}</small><span>1차 ${D.CLASS_SKILLS[c.id].name}<br>2차 ${D.SECOND_SKILLS[c.id].name}</span>${c.id===state.classId?"<em>현재 직업</em>":""}</button>`).join("")}</div><p class="note">직업별 스탯 배분은 따로 저장됩니다. 처음 바꾸는 직업의 기본 무기는 가방 또는 보관함에 한 번 지급됩니다.</p>`);
  modal.classList.add("change-class-dialog");
}
function confirmClassChange(classId) {
  const next=D.CLASSES.find(c=>c.id===classId),current=D.CLASSES.find(c=>c.id===state.classId);
  if(!next||next.id===current.id)return;
  open("직업 변경 확인",`<p class="change-class-summary"><strong>${current.name}</strong> → <strong>${next.name}</strong></p><p class="note">현재 장착 장비 ${Object.keys(state.equipped).length}개를 해제하고 자동사냥을 중지합니다. 새 직업의 전용 장비를 장착한 뒤 사냥을 다시 시작하세요.</p><p class="note">레벨·전직·출석·보스 기록은 유지되고, 직업별 스탯 배분과 스킬·랭킹 직업 표시는 새 직업으로 바뀝니다.</p><div class="actions">${btn("다시 고르기","changeClass","","")}${disabledBtn(next.name+"으로 변경","changeClassConfirm",next.id,!!state.battle||!!state.partyRoom||!!state.pendingCube,"gold")}</div>`);
  modal.classList.add("change-class-dialog");
}
function shell(content) {
  if(document.body.classList.contains("tower-mode"))return `<div class="shell">${content}</div>`;
  const c = D.CLASSES.find(c=>c.id===state.classId);
  const footer=view==='arena'?['battle','result'].includes(arenaPage)?'':arenaDock():fantasyFooter(tab,(state.systemMailbox||[]).length,attendanceReady(),0);
  return `<div class="shell fantasy-shell">${fantasyHeader(state,view==="arena"?"arena":view==="game"?tab:"")}<div class="fantasy-player-strip"><span><strong>${esc(state.name)}</strong> · Lv.${state.level} ${c.name}</span><span>전투력 <b>${fmt(power(state).combatPower)}</b></span></div><div id="connection-status" class="connection-status" role="status" ${connectionLost?"":"hidden"}>연결이 지연되고 있어요. ${btn("다시 연결","reconnect")}</div><main class="fantasy-content" data-screen="${esc(view==="game"?tab:view)}">${content}</main>${footer}</div>`;
}

function render() {
  if(!(session&&state&&view==='game'&&tab==='event'&&eventPage==='fishing'&&!state.coopRoom&&!state.partyRoom&&!dummyBattle&&state.battle?.kind!=='tower')){stopFishing();fishingUI.entered=false;if(fishingUI.auto)stopAutoFishing();}
  if(dummyBattle&&(state?.battle||state?.coopRoom||state?.partyRoom))dummyBattle=null;
  sounds.setCombat(!!dummyBattle||state?.battle?.kind==='tower'||['fighting','won'].includes(coopRoom?.status));
  // 2026-11-05 도현: 배경음 — 낚시터 구역별(1~3·4~6·7~8), 가방·거래소·상점은 각자 곡, 전투(던전들)는 setCombat, 나머지는 메인 배경음.
  sounds.setScene(view!=='game'?'lobby-bgm':tab==='event'&&eventPage==='fishing'?'fishing-'+(FISHING_BGM_ZONE[fishingUI.spot]||1):tab==='gear'?'bag-bgm':tab==='market'?'market-bgm':tab==='shop'?'shop-bgm':'lobby-bgm');
  const preservedScroll=window.scrollY;
  const preservedLottoScroll=app.querySelector('.lotto-scroll')?.scrollTop;
  const towerBattle=dummyBattle||(state?.battle?.kind==='tower'?state.battle:null);
  const coopFight=state?.coopRoom&&['fighting','won'].includes(coopRoom?.status);
  document.body.classList.toggle('tower-mode',!!towerBattle||!!coopFight);
  if(coopFight&&coopController?.room.id===coopRoom.id){coopController.accept(coopRoom);return;}
  if(coopController){coopController.dispose();coopController=null;}
  if(towerBattle&&towerController?.b.runId===towerBattle.runId){if(!dummyBattle)towerController.accept(towerBattle);return;}
  if(towerController){towerController.dispose();towerController=null;}
  if (!session) return login();
  if (!state) return createScreen();
  let content;
  if(coopFight)content=coopArena(coopRoom);
  else if(state.coopRoom){ensureRoomTribes();content=coopLobby(state,coopRoom,coopRooms);}
  else if (towerBattle) content=towerArena(towerBattle);
  else if (view === "arena") content=arenaView({data:arenaData,page:arenaPage,self:state,battle:arenaBattle,error:arenaError});
  else if (view === "ranking") content = rankings();
  else if (state.partyRoom) content = partyPanel();
  else if (view === "journal") content = journal();
  else if (view === "regions") content = regions();
  else
    content = {
      event:()=>eventPage==='lotto'?lottoView(state,lottoData):eventPage==='treasure'?treasureView(state):fishingView(state),
      hunt: hunt,
      character: character,
      gear: inventory,
      companion:()=>companionView(state),
      boss: bosses,
      market: market,
      shop:()=>shopView(state,D,gearMarkup,shopCategory,skillLookClass||state.classId),
      investment:()=>investmentView(state,investmentData),
    }[tab]();
  document.body.classList.toggle('investment-mode',tab==='investment'&&view==='game'&&!state.battle&&!state.coopRoom&&!state.partyRoom);
  const eventScreen=tab==="event"&&view==="game"&&!state.coopRoom&&!towerBattle&&!state.partyRoom;
  document.body.classList.toggle("pet-event-mode",false);
  document.body.classList.toggle("fishing-mode",eventScreen&&eventPage==="fishing");
  document.body.classList.toggle("lotto-mode",eventScreen&&eventPage!=="fishing");
  if(eventScreen&&eventPage==='fishing')updateFishingView(app,content,state.fishing?.cast?.id);
  else replacePreservingDetails(app, ["page",view,tab,tab==="boss"?bossTab:""].join("|"), eventScreen?content:shell(content));
  if(view==='arena'&&arenaPage==='battle'&&arenaBattle&&!arenaPlayback){arenaPlayback=startArenaReplay(arenaBattle,()=>{arenaPlayback=null;arenaPage='result';render();});}
  window.scrollTo({top:view==='arena'&&['opponents','battle'].includes(arenaPage)?0:preservedScroll,behavior:"instant"});
  if(eventScreen&&eventPage==='lotto'&&preservedLottoScroll!==undefined){
    const lottoScroll=app.querySelector('.lotto-scroll');
    if(lottoScroll)lottoScroll.scrollTop=preservedLottoScroll;
  }
  updateCompanionTimers(state,view==='game'&&tab==='companion'?app:null);
  updatePetCountdown();
  updateLuckTimers(state);
  updateInvestmentClock(investmentData,investmentLoadedAt);
  refreshLevelRequirements();
  if(eventScreen&&eventPage==='fishing'){
    const fishingRoot=app.querySelector('.fishing-screen');mountFishing(fishingRoot,state,fishingCommandRequest);
    if(fishingUI.pending)showFishingPending(fishingRoot,fishingUI.pending,{animate:false});
    let banner=fishingRoot.querySelector('#connection-status');
    if(!banner){banner=document.createElement('div');banner.id='connection-status';banner.className='connection-status';banner.setAttribute('role','status');banner.innerHTML='연결이 지연되고 있어요. <button data-action="reconnect">다시 연결</button>';fishingRoot.querySelector('.fishing-scroll').prepend(banner);}
    banner.hidden=!connectionLost;
  }
  if(coopFight){coopController=new CoopController(app.querySelector('.tower-play'),coopRoom,command,b=>sounds.battle(b),state?.isAdmin===true||state?.isTester===true);return;}
  if(towerBattle){
    const send=dummyBattle?async(_action,args)=>{
      if(!dummyBattle||dummyBattle.runId!==args.runId)return null;
      const skip=Math.max(0,dummyBattle.tick-args.from);
      for(const frame of args.frames.slice(skip))towerStep(dummyBattle,frame);
      return {state:{battle:structuredClone(dummyBattle)}};
    }:command;
    towerController=new TowerController(app.querySelector('.tower-play'),towerBattle,send,kind=>sounds.play(kind),{audio:b=>sounds.battle(b),preview:!!dummyBattle});return;
  }
  if(state?.battle||state?.partyRoom)updateCombatClock();
  if (state.pendingCube && !modal.open) cubeChoice();
  else if (state.pendingAddCube && !modal.open) addCubeChoice();
  else if (state.pendingRefine && !modal.open) refineChoice();
  else if(["coop","advancementTrial"].includes(state.lastReward?.type)&&!modal.open)reward();
}
function dailyRewardLines(task){
  return [['gold','골드'],['fragment','장비 파편'],['cube','레드 큐브'],['highCube','블랙 큐브']]
    .filter(([key])=>task[key]>0).map(([key,label])=>label+' '+fmt(task[key])+(key==='gold'?' G':'개'));
}
function dailyCard(){return '<section class="panel pad daily-card"><h3>오늘의 모험</h3><p class="note">매일 한국 시간 0시 갱신 · 목표마다 현재 레벨 경험치 5%</p>'+Object.entries(D.DAILY_TASKS).map(([key,t])=>'<div class="daily-row"><div style="min-width:0"><strong>'+t.name+'</strong><small>진행 '+fmt(Math.min(t.goal,state.daily?.[key]||0))+' / '+fmt(t.goal)+'</small><small>'+dailyRewardLines(t).join('<br>')+'</small></div>'+disabledBtn(state.daily?.claimed?.includes(key)?'완료':'받기','dailyClaim',key,(state.daily?.[key]||0)<t.goal||state.daily?.claimed?.includes(key))+'</div>').join('')+'</section>';}
function hunt() {
  const st = D.STAGES[state.stage],
    region = state.battle?.dungeon === "relic" ? D.EXPEDITION : D.REGIONS[state.battle ? battleEnemy(state.battle).region : st.region],
    p = power(state),
    r = huntingRate(state),
    b = state.battle,
    boss = b && battleEnemy(b);
  return `${header(boss ? boss.name : st.name, boss?.arenaName||region.name)}<div class="main-grid"><div><section class="panel"><div class="arena" data-class="${state.classId}" style="background-image:url('${fieldArtUrl(boss?.background||st.background||region.background)}')"><div class="battle-head"><small>${boss ? "BOSS · " + (b.kind === "dungeon" ? "수련" : boss.weekly ? "주간" : "일일") : "권장 Lv." + st.level + " · 일반 사냥"}</small><h3>${boss ? boss.name : D.fieldMonster(st.id,state.huntKills||0).name}</h3><div class="hp"><i id="enemy-hp" style="width:${boss ? Math.max(0, (b.enemyHp / boss.hp) * 100) : 100}%"></i></div><small id="battle-info">${boss ? fmt(b.enemyHp) + " / " + fmt(boss.hp) : state.hunting ? "전투 중" : "사냥 시작을 눌러 도전하세요"}</small></div>${equippedCostume(state)?`<img class="field-costume" src="${equippedCostume(state).portrait}" alt="${equippedCostume(state).name}">`:""}<div class="field-pet-home">${state.equippedPet==='moonfox-lumi'?'<img src="pets/lumi.webp" alt="동행 중인 루미">':''}</div><div class="monster">${boss ? bossMarkup(boss) : monsterMarkup(D.fieldMonster(st.id,state.huntKills||0))}</div><div class="combat-status"><span class="pill" id="hunt-status">${boss ? "보스 전투 중" : state.hunting ? "자동사냥 중" : "휴식 중"}</span>${boss ? `<p id="player-hp">내 HP ${fmt(b.hp)} / ${fmt(b.power.hp)}</p><div class="hp player-health"><i style="width:${Math.max(0, b.hp/b.power.hp*100)}%"></i></div><small id="pattern-info">${boss.pattern} · ${boss.patternEvery - b.tick % boss.patternEvery}초 후</small>` : `<p id="field-player-hp">내 HP ${fmt(power(state).hp)} / ${fmt(power(state).hp)}</p><div class="hp player-health"><i id="field-player-bar" style="width:100%"></i></div><small id="field-combat-result">${state.hunting?"몬스터와 전투 중":"사냥을 시작하면 자동으로 전투합니다."}</small><small class="field-pet-status">${power(state).pet?"루미 장착 중 · 체력 8% 감소 시 회복 · 처치 시 쿨타임 초기화":"루미 미장착 · 가방 → 펫에서 장착"}</small>`}</div></div><div class="pad"><div class="row spread"><small>Lv.${state.level} 경험치</small><small>${fmt(state.xp)} / ${fmt(D.xpNeeded(state.level))}</small></div><div class="exp"><i style="width:${Math.min(100, (state.xp / D.xpNeeded(state.level)) * 100)}%"></i></div><div class="metrics"><div><small>예상 시간당 경험치</small><b>${fmt((r.xp * 3600) / r.seconds)}</b></div><div><small>예상 시간당 골드</small><b>${fmt((r.gold * 3600) / r.seconds)}</b></div><div><small>드롭 장비</small><b>${gearLevelRange(Math.max(10,st.dropLevel))}</b></div></div><div class="actions">${boss ? combatSkillButtons()+disabledBtn("회복 "+(3-(b.potions||0))+"/3","battlePotion","",(b.potions||0)>=3||Date.now()<(b.potionReady||0)) : btn(state.hunting ? "사냥 중지" : "사냥 시작", "toggleHunt", "", "gold", true)}${btn("사냥터 변경", "regions")}${btn("보상 확인", "reward")}${boss ? btn("전투 포기", "abandonConfirm") : ""}</div>${boss ? `<p class="note">전투 제한 ${boss.seconds}초 · <strong id="battle-timer">남은 ${boss.seconds-b.tick}초</strong></p>`+skillGuide() : recentLoot()}</div></section></div><aside>${dailyCard()}<div class="panel pad"><p class="eyebrow">오늘의 성장</p><h3>장비는 모험에서 얻습니다</h3><p class="note">권장레벨에 맞는 장비를 강화해야 안정적으로 사냥할 수 있습니다. 패배하면 10초 후 부활해 재도전합니다. 반복해서 패배한다면 장비를 강화하거나 하위 사냥터에서 재화를 모으세요. 상위 사냥터로 이동하며 성장하세요. 자신의 레벨보다 15레벨 이상 낮은 사냥터에서는 경험치와 골드가 함께 줄어듭니다.</p><div class="row wrap">${Object.entries(
    D.MATERIALS,
  )
    .map(
      ([k, v]) =>
        `<span class="currency">${v} <b>${fmt(state.materials[k])}</b></span>`,
    )
    .join(
      "",
    )}</div></div><div class="panel pad"><h3>다음 목표</h3><p class="note">${state.cleared.length < D.BOSSES.length ? D.BOSSES.find((b) => !state.cleared.includes(b.id))?.name + " 처치" : "최종 장비와 잠재옵션 완성"}</p>${btn("보스 확인", "tab", "boss")}${btn("모험 수첩", "journal")}</div>${state.tutorial < 6 ? `<div class="quest"><strong>모험 안내 ${state.tutorial + 1}/6</strong><p class="note">${["시작 무기는 장착되어 있어요. 캐릭터 탭에서 확인하세요.", "레벨업 포인트는 내 직업 주스탯에 분배하세요.", "모든 사냥터에 입장할 수 있어요. 권장 레벨과 생존 가능 여부를 확인하세요.", "보스 장비는 보스를 처치해서만 얻을 수 있어요.", "장비는 잠재 3줄로 시작해요. 큐브로 원하는 옵션을 찾으세요.", "강화 실패 시 별은 유지됩니다. 비용을 확인하고 도전하세요."][state.tutorial]}</p>${btn("확인", "tutorial", "", "", true)}</div>` : ""}</aside></div>`;
}
function fieldArtUrl(path) {
  const url = new URL(path, import.meta.url);
  if (/\/(?:chapters\/|monsters\/chapter-)/.test(url.pathname)) url.searchParams.set("v", "field-art-20261116");
  return url.href;
}
const chapterThumbnails = {"chapters/amber-root.webp":"data:image/webp;base64,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","chapters/cinder-railyard.webp":"data:image/webp;base64,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","chapters/jade-sanctuary.webp":"data:image/webp;base64,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","chapters/midnight-platform.webp":"data:image/webp;base64,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","chapters/mirror-salt-flat.webp":"data:image/webp;base64,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","chapters/phantom-terminal.webp":"data:image/webp;base64,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","chapters/rose-salt-palace.webp":"data:image/webp;base64,UklGRuQkAABXRUJQVlA4INgkAAAwcACdASrgAJAAPoUyk0clIqGhMlg9mKAQiWYApd7x7DdkvxvNe5r8D49ddd4b7x35vSN/YN3D5l/OG9N/+P6bf1jfRJ86L1nP8zaEW+b7x4D+Nv6R+6f5r068DfX7qF96eLfej8l/9/1DvdHnivfetf3voF+/f4bwMNTXxd7AXlT/0/D0/K/972Df1Z6v//F5SP231FumS111jjkvMLP6r3w52ka/EMeFEi+0znARykpEa/e2y2veIjQqE5t1Y8a7zt38qQ9C16vxuDpoSoFMLV2godQ2Q/tGrM3lmoOL3RauswXBInkm8TphYv9eb0DObPGfUuQy0jIureU10UgjNvhIV0sOdVM2pHD9RfC/T9NfaMEHl/8qbEGiLFygMRgPnEVD4QvHdfVLpArzkIpcntuImLapwX1AJAqjbR1vSm3hTB4sKeIvatRyl6McSdATL/2mG2KVunEKJx45hCzS1J7p56WAaR/+PfhQjxrxjclYgBPZKpqAQ88vlRt90J8+0A/jzWyiSc+7MEW31CcIIKD5dGnWjj3bTDrWwLrs8LNAxSGMMgpxtVcI9YP5/xAmknDwYX3JSBvws2+4FfOGvmPhmJZ8gKpfFWKqdGCan3C93Vo16Poc5VgTLK9iNTxvZmhl1nrcAVyxUmGMZBVjFoPpP1V6wCmXfkPLQzQu379bBuv1xLTn1y1gswxO2idkcMmXDUfoouu3pmKuK4P0XX0LWHsteC0Rw60S13sZl8nERKiWqKZhXVkV3yTqiry9afD9oIEWLR8jugsdNNiOrOsOQt09QccARqSCc2JS7nAQJZPeqVWVskkigPKmlRqQR3H/xJVvJg9yIb4hM4w5sFTgK5BfKr2P3T/2i7+X70W41fLycWZftSjh4ho5H9H3yDYfv/HLTqlL7GQxTR+UpQpC5aNQNOMBqkNyA3B0Kqd96cRIYL+yIWY9abEYbfMXv7wQIiSIkiO+B6zkAu1kyELw9jU9KWBO/NlVl4eRN0aE+y9vCQht1Y13tonFPTox067tHI6SvZHt/83cxvBcxi/rFgYTdiBviq34cQC3KOJmzVJZvnbQpDCNTAZ+gz56jOwlPNKiP/JdNNrSzdfiStxu2axG1/XX4xdcTQlqyorUdsXswOxMZHrGkUaod+ntIdzJAHTliZylrzGPXGtydCoSa7nXDUfa45/RfMhxtJpRbgkTAa/WI4AA/vyZY1EJ1UT3uEId3nAAAXboj4UOYY512s/ZVcDchdnbIUMJyokc9LUeMlP/1AsTuYjvOE7w1YUgMuHAFRTzfqpKk4gdGTZUb+DzyYLGKrHYT3Ln91hoAGlhPdRlkqCXsFXYZkSJ8wp/SQRHri43OdNOexQ2MDAr4kOeU/kQlVudNroriXgaUpRoWMb2R9w0gmpyRQk60boBl85jBxEB6PIyAfvsOAor7fhBqGs1GZtcYcPEysLtTyihW/9Sfhk3eSrBlnF5450DnuNox9Ggzh6xWbrf9458CRGamg6/x4mycaRXOTraHS8SJbebtbtYoiVyRUC/ab/cI6ZU5uG2JRqmiNQU+GCRGDlWYqqqJJcAgC4C3zZOVryLZIpwasKIgPHohlrDiLJh5LUwooMkHbXSvr/TgrDLkZCshdqNtYxGZ92+akBJbNpk4kXnmVIxl9vqWHHHg+SNtnjONogeSS71iiGU+pM/1qKJdBGc1iVZZGRX1eqbdZRCzlazTMthKh2nSKNUmGuvs3EiPVCQPk9cBwgC2YHM83HdrT1jyj6Qm8nkVEAFGdByZqbHOhO4LPNeUbiocQiy8eGzffVr1f8fYz142o4CbZePjFZmGwLZXpeZCvCTrM9XX4xog/mi05Gf9YmfbpHT7UBE2XIPMxTuQtZCi+rSS9pqopctgKuvov264+Ksj7lLL3V3eF94NhZHZ3c9LFWm/aqivDv+TVMVsXpyiKhP7tMeN6nEF00PyizkjChGtcfugNoVU+v4ZJpcjBZhFjA6sDnNr21Ffm3h//RiHeQSdTLzDaahDGORr1sdGImj/k6Nqi8cgMKF8QSNqcal69FF9d8n55xI5b3hOa9zVzv4b/SOUge2N07XEYivtKfREMe2xCfBRKtN5UZJx34qLhjcednK8yFXrm8qalcXNO7d7CTZXVz6ooLnMlbEgZ7qiKyXDWVJimF6mJ+nWA9afSvO9kyvirEOPPFxeHtfC2JVdl0w0sDnZV3DAd/UfJnZVCG7nE0p+5J+1zHezUqyjTuFyqwnedWssttmRQsmo1P1jMBJbBwL/1aw59H151iHIAE6bAwtVzuKAoI1CU+tVhgH1pPzoRVvKcmdR16CPQtJ10+lJkkvQm24SdrzxpvYJI+SeZnVqqNG8Jq/EwUgu4Rgi3ihVdaDfXsDN3xuYURnvUmUU/rdRLmTd60U15nVcuot/khwHs1PFT8j6+/R7cAwoSdh81e167GrkkzZ4KYIMtx2A/Qxtp4AWzOXy2QFEG/iHN7EK3lnjAjdX+D9AWbALwRNJB+Bol208TquIcmvgrJAVy7bJBkwQgUCnTZLQGZRFM7k1H74sFfj0+jAHDfGyw3tPSmIhJefZ7SUqbRCSDEjkj2GFuWNF7t2AYZ9jadFYIyZnFnM+Pq9vbLYw9UYzWAXt9YpCogTrFteyl3eLrx2yHyYkUfCxQqXokrxAVAfVABKoEN5HQrj+kh7H6yP9Vj55c2RnoSZyL4GbwDGDINE4A3NmqvgNxvSTkAHjuKoqZKXuJAq1SYZlaM+TV+qXqDKYkosgwBagGUAcgXCNrzqjCd2s0YxUGcY3X0fB4ZtOJ5VQ7Dy+k4HqqsxhaSs2Cv5otKTsrRhFIZFrMTQIT1H4+gvVuSLa1TvxczkjAVfXMcNbpaZloU/C4J8lL0mwUUqUTlQdo+9nDjDmGCRdfWVwODoE69iQ6dYLLK/tY4VWh22mdW3PzPqmVm/AVjL74UGP4DihezNiuGJNVUiG74XJcs6umBq5HfCGvAj8hX1eqeSUG3DGawzb6AUMopzLeFXvm428bNDXgYVZC7mxeGJvd6Aoogg/r06laiiTT0e1WpZCJaA84BJluiN1DXncFLolc+YjoAH/HG5GumMaHQBkVynLBWLpdTucOfC4SlJVCOP2d03a9aqmIP6xxa3OX4rjyVOVHSeryakNEjypCVq3SwVHPYpN4YTyL3IF+OYoa2u0aW4qKsZdD23Ec+2f7voNwcK4lCUhP1rY/68KWC08EiOHVpcbEqIUsdRdCYcDEsQCk0ur4KV6DEN7FUeHsyvTXseTZpx84UbQy7FooXyYrP3fmOMUzt1MKlFViXBnuUgq43k3DFvGJGqTHrTpfmRMmPcVfp4AI255r9iiK+xPax4zx/GSywNd1yqvm5T9LdM3Tr5FWm17Uwn5U5gZE8XKyUzcDp1QEQ4bCnlNVZ0o+5HKTVMBGefhOS8awuDPzaxACKNdI/qsR3so5AHK215climiYeOlfG/JjtsnH2YEiR1F5U0vCI+RyKgZ+ygKyAqgB9hE3MdmxstdcBLn07O8g5H/PThmS5ia9t+VBF58JwSwDWOxP8TYBgrXxb7KI3KLZxq6wDJPNCzBBKVFGPjkhRIWQpcfDJjbb0qu2QkNz9tHyLyO79D3Obb6a9bdYP3SX3NC2uaF/ZiIRk+Bi4G8jUjUkhULw6vE2Lhf/VCM97kSA69s/g/p1UVceV4D1/6HJGDjYUCkle5nf9jwIwl5sR6urAp87pGxCceiqc2OixDlkBz167h/PivJ/WrN9ysimQ6QYLtbTh1U3e1Unjq+KdbJD4oZB9nHOekRienTBxdOutKJtzoK9hFMBiO+QAfve9ChbHPj3OXnquashQGoE8f5pxn3i9VI0GQB+H0jebQFtThvXzlQ4LHKgiX1I9iSuDLe9HxB/hb/wmnMAF9LLHcSo8qFg3NLLB8RTZVq/eIew7RwdFLFYgq68UZx3oBlCEsAG2zHXrClW1yyoEClN1sx8buyBHhe9QjYk/g8TlB8bXE23dBK8n9Zb27KvPGuWj/jjhgESK9fjKbwBWUemC8Yv/kkx0vMcTWOhEAsWH205ODydE5BjIbk+EQRCurp25qnHtFcDdvPfcgUa0qI/FwzvhB2c2yIr99agShdu+VaLZwWwti2i4hyWb0FEpvhYECMhdDWuHppwIdnlx+EK1T+PeXwobo1rFlXB8+uDUYoEtoVb/1+UPe5zkH5ZuenQTplsBr5u18rGZjXp3QfoknoJAB6IfXHCJIxZPQx3x1qEtXhXNVMpKSvrqk1kQm38CqrhWD5M6dYLrNuIYUMKGm7WlGhEeFrXKOl5MKAdJ5Su6+lXWVUZVa8FDlhPrTAFUvchHQS4qtZc/04FmAQRpMoibtCP1jF3pPB8svtKVhUabDgk+WJJWCMWppuORuAA9fHLmyp9WQXqZFtZlbr3qBGhPwFjT1o8COlrQtWTUgBDXSb+PnIrh1+d0liy4Rsgv+zYw4fmUpXSE9YJIgjBiG0h+0xTLnAnkUMN3k7ddGJC5ZSLIypOMFjNLE0cp5inRyA8mTDg+4EwFdIqhEAeUDL0KeNiBciqMcWCr1FeI/B5ncqoMrONb3kYWVE+M/H1tNeHqPeowqkXOfbQBLZXjryG3tRX9o0nz35fUkBsulLn+1QuYaA7pNSPKcj66KtqxQtNdZjcAd+cu+sJ0rh8yYXPfkGXH6gxWSSWUQeCy4PHveoX+Xbmzo/UzWH5U3YQerJIucJSThWzUCFbPqUPwU3XPXHZ+As990usn+ucqlzWPxU1RGXqZSk4nLp648oGxhl3PC+WVss2wKyJB0+5zNDc1krZ9apiH/PKFYG28mUMvz6fmlOGvjyxi39l2pcOGaMvKMU0rp7NrQQRGko9B0kZrEkAR9BwakkQFldZ5uI7x0OwrPvsUC/9CswDxhvh7aTpd6L6ZgX+VxsfzjdnTBMMygMuZqHFkqq1Grtmq6OFf1GZ1Y1xHnhA4XstyjfhM3xRJeHTeB2yLWIwk4QTwAf7mznWMol16mTFqKeqG/hpERDTD4mnxUkJ5xLJWEzmk9FoBhLRmnsflfjbQmxXq4pJWIKSV/Q4RUW5DPTwWP4YpJFNHQveDx+1a7degOnuXCkyJ4edWW0bHOvsFR8xBnrFhmj0C5jYaMCcBmRVP4NFx1sSluDliIsRd15t+2X+vu+nwsm95uHhS0guyP6/b0G8GGp1vkPJimXPtHgI1DnkzpzMwOvZKjWDl3qfmtM7+FJBKPTTdpykK4a7b5nxwvOyHONo6hmRP/R2+PMmT+QTm35TkNXyO03zegVC/1ULi54IJQCkO3H4VzRdTumVzeRzHi+FQynsBQrU3c+1KKoAAWYucZnThIs3/s5xYBfL43IpueyYgFgheQMvKfv/PE6gKgyF3B9qHVtnoLF0zL5EQBPeomiLPAKyCZCA5sw5qys0eRyoih/b7CBQB+52iGnUg8fC6wSfCCy6fVctQBJmUUFCi/hevBeay2TkiOlyNADmjtbEfl5pQmKnqUYYGIuxa8Nd6LVj+BtsweF2QA7cuP/m0rzM0iz/nLlQpac+3NEKgA7eizgxkuIUmm4Av0D7qFZ+gZqfJqKsA/MxkCBE91sQoU+rEnK1AnubFaKcVa1oU7u431euV2uHuX2LXYJaRzBS6oO0B8Am5ndTkkpBrf5QV+N0yZnGVs54PxCtUDDgtWIjC3XbwmgVBCMq5Ims+IjC04x3dwDvaHxlXunJkYTJToNULcd6I8yOcnma5NStjdUIa1nu6RXEdhK2cevN67lM13MfT6Qmm5XGqcWVms317hphxWo1YVsh+WNZJ3cl6xBL29ywvtOBdYxKnWPLDZGpYLOzHzOIzU+EG/PMxwnsYEREQQajqTYy2TpzOMFR6A2i4UPzcc7xNXt/OSKh9P9rVcHnivpIeizt0FrgBs4BwiZM9HqxbbqQ3rqagWU82qkAn7rJ8J9FicpGqq0J3HzD1bkjRMnSLXbBlqlUgL1nvfLEzhMXuqkHt9ny9m5CC4HH0omZeoNl/RNGCMZD/rTjDglfB+9pw4oCyz/UlGMrULyl2hmka+KUdeuKcr2mDsGFdvil4vFkyclVp5jVjqtsyY5r2FbsKEe0EAiAITfnHUhZhz4bwrEsg8S/1qelvFiuxDJi0v/oek80NXP+fK9BzzxA7ouqgo46a9Ku9DGO/S1WueOANja9UbiLCkwQeqctGsXoJWWQXonoVTtYxCOwlan3SyX6DnTW+l0Kem2Rpi6EjRaJm+cNa7L6fMyNTGFljDqPuuOvUV50eOwsKw1XAo7irva5VI1jqeVvK4m4ZGjLvobISECP3+WaY1ECS8SrCnR66TNZjHZ3r9S7ZP+0kV4IPN8guS3z074Ad3ZnVLXeVvjZ+J8vyd9WrJt3sbYDLr3AHwEL6XXFUpW3n7zZJtEl7884dGAvdxraLiWB7N1yUQWdLTVHQqjLkjt9wWU77XtRVw562hQSH7w3O8xsgvCOis4tLr0pIkhmQ7r6JwnzwA7HhG5kNa/7OMA8MOGAx7Nlipmb7OsTRmp3ploaDLUh0/Gv8yg/hJu04FvKqNgngnKIL//IRE+rGFQrVV1wvgxDnP4xRUNDV59JrFAHlH86EVz9/owCQC9hPoOVfXHY4Oa4hkpE1luvA9dF0uQd8ogCQI5TJ1oDXBTYnSdl0VPSfu4dSSFQBI+sYiF18ztteotLQwvmbKBoJuMHdNsBQ1EBIHMhIkH8a6QuCnGYDVSMwsGwFiihdsgw2M/aovS9wCI+EzgGKvWkBk5ZOu8+xWvy6YwTlNmC8PbK3994zRKWaosr4g6sz6KhjGYj2LjYxwGLmhNGkjYUpiHpRpAPlLXKDfyDcJGETbM0vVuSVci/YzC9kfypdGqlhCEQULJDrb/2JgB0i7tJ4ont+kMzYCFd0YvQwvEvw/Iwv4pqik/VJU73Bn8DGvc8RCv0E/DyMc1R/WMkXpkydG9FADeE88GTNUA9+X2RE7BXJ+tjZsLvfWiCS9t3C8Hf4nsK92jmT3AlxKvlxbCefsw0mxLgl+pHhmx1dLNyJZ2yxiz4d4cnnOmfIewEYmlNKVdA64mHS9e+5AmSSR+G2HnFRhVUYOZ9w/B8tAJwaCnki8PucpPiNRsZBb6RRVWtzwWvm901eUhwYdxLS4jq0nbGLx0Apqr02fH9dAGtytYLz6wIAm/zorpZJASVIoZLuyJu0nkM7AJpMd/S95hpbC//GlxX+wyuH22O3Y20WocS1/S8Y044N4qevx3mYFRCB2wfyFO/z12yemrUN3dcN2zILFLQyW+HsniOOietyo6qDY/uWP/G8qpJkx9teBJNNRM/D3XdNUbqDbh0ogEDLmYU8geqTCa1YovlA8IJrdK8yWVvL6cy/8ys68M3qknUUZVWg6QnOSpmLJhUzgzRpfHx1SYgpvHRPLJZnolMl4rSVIRRnmBxR4m2S1kl7JK/4jmZe+i9WprLqT2hgTthYgbiwwwX5FbAjv6TzvG3zJ7YtjNFmzF5nLkAvH5PwdqwqdeBGL5eK+GpWI4HR9u4GQjW+CiXO8zpY+3weo2MMtsW40xJo2/oUT6wOSuNtxQnrsCdmuuIVM4fLusTofiNtPYRvHuy9M83bMWZtr+FX+ApmfNZDsQWQkp0AWSKWrfvQeszXQk566jNdrw3KLBzcv5ulUjbSM2JXckC5BMzxzglhCESkSigXmVf/8D9wpnNyzR3CEcRs9FXYpHbzORAkJeNFAWwCZH/3P14sekNeG+gY4a1o107RvpGknhcIoV20vSdBBsM2CZOSQLBBU1GxsqOX9Xt2UfZXuZfiA6x3QVXNJsL6pgURj0B3I+zPXXSF1ht7pBJC0pO6sObhmMqlVD/TspHhkrMxy1FIx0zGB1KMLi1UplsFMtaj6NwHhXxK1H7YraVR2c4n8OFsVbbomkqOHDFsyZ/uSmYmiDqNa27dYBFuiaOCW/yd4Q82l6Vf8tNefD83GdpZKglFlIpe7rfCz4RzdSdF7ogMe0KaQ9yhy3rzrAEzm69Uo1kwVlAlivh/lYvlyCVfNH6bDFq54tAXGVOZ/mJGY11rHVVl4HqObzpKx+axnzus1/DoHxMGeHhcXX22XaKfyjLDU2imS4QdiQZ2E1wsHRuo7DDJfp28Zqp1n9ht02CsnKdqjgDgf6QRXNKINiQjLDfPUtnmLzFbpl4ayUT3uJ/mgRRbwpARFM9vdsVU8u3hvgHacsNOk0qzdapWLGZAVGxafNgZ1YJJtk8rq0PG21mRG7c5QOofZKN/8tPx5hn1B6X9wnhLnu91ZB5h3FuafcOfK/3xvgQMiE3g+zJSWJ8lumGWBKJi/1dVDQPFFmMPs/NpxwUWWrN4PPZnkxTjd94whJNXws2WySrM/sV+ZHygRLh2OhbH2o+xaUSB3ufKFr25x+air90RvgH/whgY84Sh2NyAdHCTYZTvz9NHQZTl3bs2xWIn0sGV4c4BbBL74E58tge5wKKpHhw9JYyqMBi72KTmNWlEYweE7dz92/plH8f+LlvwQC+5ejb06mOguIu0Krto+4RJuWhfoE330aWhtao7mputD80K4K0W/PTE6qafozj+MV0ov2CcPyQnLH7GdaMRL4HQBMs8dgwECV/AyLpXRrzM9fw75HU9Ysvwn5v81yDUitJ0d9QN8utmIrA5HKse771Qsc1drG4pAyPmW+d1Yc3IfWsveI2LyrTXtG9xnMw06b/wOsqNRs5AJ8ViK2yJFTPVhpZyvlJoafAT0DUF3g6G0K9A7eUHNglBA7uDBlYiOCgNAD69D531/v//iLuZ3CFeZVco9E7I7hRcDOlM/yGU2VLvBNPzh483Tey51y4ooPnPdVFowbLWcChdFW6yAr7T1xHTbWyNbUg+kwiLwIHm4FbycQnGN2kXaHmhSs8C8lWBothVMksmYZejdDUxufFI30OK9D50oRrQqO2HXtVsc03JkMnLDH8SmogocAIPBxZ4GM86JVViZQWFEwIWxylCtpc5u6avgstj+uu2GozeXe8if2tCOqiqOEWk+DXrcWtCCPTpfoU6C4sFWjFrIpnt8Jh0b0kztgGxli+XxITGRhRxfvIPA+nClENykP6ZNuYf63Fqqz3qarNbX04oRusnxc/LzAVRM7HRcChMNKHhfcZxbsv1axc0fAaa38gtLThSiw6EuGQTgFv+moooEK6JWFlgXsTVnN/4G5WLQ4aABUfrQoWmsXq/nTxbKnT4PbipvguKXjdGSa8jT2ZWkmWuQpIiPJ9CRi6nov1AKyyTUw9bx5HieEvMDv1z0vyGn2co3xyltIvFwDO0ZOB9skJQ6NEgL3KyRhFx/hLmM4Io+DeGFRTM9a1ap8XQs3154cBHLqncHo//mpfVuDvNcMUzqqi3Bp62iiVPXH7AZSYN826USya/dNDYgxAhasS3Kzur2/uKoK6uiyLzeGsbmAwTYa7/4FXwD9ASWvgUZLkf76B0jGJmziPE+k2g8mQKwIMSxewHU2GPZkoBnnhJG5rpXShl9FfGl2PqXJ86vh2rVHIlO47yEYPKz1K7c1ty5+QJGwC6kP7jjs16xzycm7IyvXjinVj3kx8ek758iAhOgndDH865HHuI1XLW8cwYLmCSoTPSQ7XyIfSO6d+L+qPI9cyZ/T2ecJKcrqvqypQBPNC1NVnnXxosJSxOZlkSZcl5o0sUfzKffZUvAI7cImYpHHgWukDKHibiSTo6NyWx8gC6xPkWRgj+K/STiEe01RuCwHpH58rmhET5ap+vQQS8lQRH5TIINLCkCd/kk/nam0dbNxfhASFsdXpHp3V5Kbo44ipm8WjYPVevlOwzCc/KL6bRHlrpcsdNLG9PS3Vh1D7BTreHkCatC8T0lXuOouvWL+IohhfE910FKNJx/oWZM7s82zFjWVmOjeKVngJGdntGfzM6OoS7svBsejV8epXQfdwPJ/9wZSIF38NHW5gR9hv45j9ARxRUNYM5h+LNBKr5ieZVQe9Dda92ftLfk+02D1cmFdRG6HTEdK7RVZGZDTrdfNXfvLBXoS6oND2+ghmHNwAydNqGVDq6uI13nrDVVy3dI0tFzeE5c+hBiJ8OmaPuxeKGDayVe/F875qaQ1PUCW2QYMiY9BN7FPTVk4CikeDf+Cr9/IfjoYtsfKr2vGA1euUTm+EktW2lVoANFeA+ejIK09Dz8J/aGqhb7vdQ+K5cD9EQTpQBtae0jQnh6+2WIU1fUEDOsk9GjGYSmF4Q/5bp6gm4Z5F1W2CNPu3vnCuXzApalHikUVZISWklT+R1QCed2KQvlOwuoqxHpAIqbZQHBzLpadgomILB8oqUbmGpP4LWIx4aaucx40bdVbc8zNtex47hT/at70bqfAoebawKROwNDRP6lRch4+zfJ0AXomMyx49AVJBvYWI9xwSkc+6gOaE7GD7fOdZNpKTy7FUKcDMZy8BT7ChBabHLgP+BglkE6u18EUzXvlEtOpuOo2pV7FMY833YdG4bw9sFzqDAJRAcI0t3D7bFfId+FvPdYsSmOu/M6gfk1+l9TtkFSQMQ6O6SnH4lpnjV25UOKjUp7grJXO78qtr9t+5VJTU8lquSu9PSgjHIYAu4fQqtY8MNP1Zr8KUKc6VqgvXVzEYlriX7AEC+nPftCqGsY++RKsd5h1q75sx5Ex7e3RuhvgEpHFtmOKhDflQVsDxfoM/Jy61xAFVeMnE8GKd+E++oE/OpKC+DYONri8SqDwjWPJfVsu5yaeGLoisiMu3LEeS6oPsAPCiJA2gMRkk86PTTTxS9jQAAhoi8+Wmt+dl3rmuL+oR+C/XbY7lgtjzuFo3i7q2mvpkPHF+iSjpEO38n0yGzitYrB9OtCu9IeBd21alIrtKGUysSOjYoouW0FLHf4JFCA2/bpHEtIB7Imo25nVS3Ym0DXVJrAyxNqbp90YUjpLLVVfmj7z371/8t5e+bEDJPCyS5TN/1ZpK7ANNkZZgBpM8a/tP+u4gd1+3n+eT6LJkokpgr/L0lBLDKgyI85nMRWymTShhAIihDarS0gdKzw1o5bYJezxPgJePvDBgPmYJOHjFQ25e9RX99qZxxZjzWt8YhkGJ2EbZqFGVIWBAOOzdhxgh3JHcyNF5HZKE5nSEe4cGNq5KulnsON+wBb9cw8Acz7xWU7jsg1LgD7MJqC5mZJhzskFQPCEzZC1pZWSN2GD97dlqLcbPpkYMiokpeP2K9rn9kP+TYvZra+q+79lCx2sHuvL53KvEMVggv5BR43yPI5oo7WvZc7W8N/K4HowrxTmUIEY4L1PHvcsOqJylLrkPeah9JXVU/qgINHNDrNfP4/nHGy8luoXde1HXi6z34U77jn+vmlGSTthXobZhdhCXt4ukEK5Y9aWArBG1JgExoHJQsTvE5lcrGMLQu+1+G/HxY4Bq0ooXIjmpIQ4Drp8dHJ53/IU10eFlxMTdl9R9nmUR8VjgWiGvjvaV4L8rT+lCsIrIwdjQ/pOPcsCYviV9p0FEjKKbsm52zQL9RP5EUb2Us2XTnHNCydIAuhgZuI3g/pN3eUkE+NcZ/v4RjoElmCXAi6zWZwpoU0OexgFC+UGL9kxCXlUI8yI9wAmX20cjiXJEb4jUfEzR9xwCTMtTTZyCrdN2igadcJ2KgD2nYwklHnHj+U8GkR8XYOjZDdWK0X+7idEydU5NrKTOlawk4QcfC3DYQNResNO3mZWyufHod1yKBMw5mBKq2Q6Bs80/cZDfGiZV89KUsBgum5ZpupbN9p8NfSorwE9x80R9elgatunNwNYkBVhi0Kko/f+ACFyLuuLDPkYxcjsjzLXjqgLwMgqaBxx9H5DuMst+8pkwwr2RJtQqMM5wvxjqxiJ72QuMJWbgaO1YWzI8frrfjEfXxE/N011gmWRYjK8XX3zC5unOZFVqPLHem3YRVHnD5s+aXKZ7jCPEbUMeC1IxXI6J59TZS0ib3NzBerL227k8vpoE2k0yKLClAeqem9ZjsdtsC3F1xlSi0imWTEXUUeaZBj3KBAtf+abzzOmuEZZ+xdRkcdCQRKs5IvsxA0jJutYgqjF1bfvCLMBtnuU1zBFfwda02xDsZko+VM3ecpOYkt5QXm0h4CG8qVFFnySAXTFgW6qbUSORsnlwZ0rZjks/7nbgKYjY3JTmydA/QyLyENgjuwdt1p/ZByfJT3y9BM0ryQcY5GYSHDE9hnedr8hFFGj/aLEGH+CaEUCOvUdayXGq+Z/jc5clrZtsyrkw7J/kYgdyORx4rPq+7Yi9lRG+O72lNyHBoGNQGv4EO1wDgYzgBA3qX8sItX+ijbldN7VliDabSfp3WEdfGS0oE2t17rnYFEpf5yYbXyo5gnNDeSWIW/gjLrsFSo2KnAx9K8SWDeuZg9/KgC7gRYSc+NfiYks2T/1RmTzSa4D1Z2zNyWAoQAnP1MKTbtYsr112kWqwNBloMhRePd0eu4NDfDw2iFpcljN8a9egm5sUDtUEzJ9XwYw1Xbn7NxOwkiygzGRYlyIfwSTeVDkMQtfB9Wpm9nBOJU9Co+OZRY8M0kz5AErw6p5JTzyHg4DnZ0rzYudgyIhglIzhPQAAA=","chapters/shattered-sundial.webp":"data:image/webp;base64,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","chapters/spore-grotto.webp":"data:image/webp;base64,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"};
function fieldPreview(stage) {
  const thumbnail = chapterThumbnails[stage.background];
  if (thumbnail) return `<span class="field-preview" aria-hidden="true"><img class="field-preview-composite" src="${thumbnail}" alt="" decoding="async"></span>`;
  if (!stage.background) return "";
  const monster = D.fieldMonster(stage.id);
  if (!monster?.art) return "";
  return `<span class="field-preview" style="background-image:url('${fieldArtUrl(stage.background)}')" aria-hidden="true"><img src="${fieldArtUrl(monster.art)}" alt="" loading="lazy" decoding="async"></span>`;
}
function regions() {
  return `${header("사냥터 선택", "WORLD MAP")}${btn("사냥으로 돌아가기", "back")}<section class="panel pad relic-card"><strong>여명의 폐허 · ${requiredLevel(200)}</strong><p class="note">멸신왕 벨제리온 이후 열리는 유적 · 일반 ${requiredLevel(200,"200레벨")} 장비</p>${disabledBtn("유적 탐사","dungeon","relic",state.level<200||!state.cleared.includes(29),"gold")}</section><div class="region-list" style="margin-top:12px">${D.REGIONS.map(
    (r) =>
      `<section class="panel"><div class="region-banner" style="background-image:url('${fieldArtUrl(r.background)}')"><h3>${r.name} <small>권장 Lv.${r.level}</small></h3></div>${D.STAGES.filter(
        (s) => s.region === r.id,
      )
        .map(
          (s) => {
            const preview = fieldPreview(s);
            return `<div class="stage-row${state.stage===s.id?" current-stage":""}" data-stage="${s.id}"><div class="stage-label">${preview}<div><strong>${s.name}</strong><br><small>권장 Lv.${s.level} · 입장 제한 없음<br>경험치 ${fmt(s.xp)} · ${fmt(s.gold)} G / 처치<br>${gearLevelRange(Math.max(10,s.dropLevel))} 일반 장비${state.stage===s.id?" · 현재 사냥터":""}</small></div></div>${disabledBtn("입장", "enterStage", s.id, false)}</div>`;
          },
        )
        .join("")}</section>`,
  ).join("")}</div>`;
}
function character() {
  const c = D.CLASSES.find((x) => x.id === state.classId),
    p = power(state);
  return `${header("캐릭터", (state.advancement>=4?D.FIFTH_NAMES[c.id]:state.advancement>=3?D.FOURTH_NAMES[c.id]:state.advancement>=2?D.THIRD_NAMES[c.id]:state.advancement?D.ADVANCEMENTS[c.id]:c.name) + " · " + c.stat + " 주스탯")}<div class="subnav">${btn("모험 수첩","journal")}${btn("직업 변경","changeClass")}${btn("코스튬","costumeWardrobe")}</div>${testerSetBar()}<section class="panel pad">${skillGuide()}</section><section class="panel pad advancement-card"><div><strong>${D.jobStage(state)?D.jobStage(state)+"차 직업":"견습 모험가"} · ${state.advancement>=4?D.FIFTH_NAMES[c.id]:state.advancement>=3?D.FOURTH_NAMES[c.id]:state.advancement>=2?D.THIRD_NAMES[c.id]:state.advancement?D.ADVANCEMENTS[c.id]:c.name}</strong><p class="note">1차 Lv.30 / 2차 Lv.60 / 3차 Lv.100 / 4차 Lv.150 / 5차 Lv.200 / 6차 Lv.250 / 7차 Lv.300 · 전용 보스 처치 · 1~5차 공격력·HP +10%, 6·7차 잠재형 능력치</p></div>${btn("전직 보스","advance","","gold")}</section><div class="main-grid"><section class="panel"><div class="hero"><div class="portrait ${c.id==='priest'?'priest-portrait':''}" style="${portraitStyle(c.id,equippedCostume(state)?.id,portraitPosition(c.id))}" role="img" aria-label="${c.name}"></div><div class="hero-label"><h2>${esc(state.name)}</h2><span class="pill">${c.name}</span></div></div><div class="pad"><div class="stat-grid">${Object.keys(
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
function characterMetrics(p,c,summaryOnly=false) {
  const bonus = v => "+" + pct(v / 100);
  const rows = [["최종 공격력",fmt(p.attack)],["공격력 보너스",bonus(p.bonuses.attack)],["보스 피해",bonus(p.bonuses.boss)],["치명타 확률",pct(p.crit)],["치명타 피해",pct(p.critDamage)],["최대 HP",fmt(p.hp)],["HP 보너스",bonus(p.bonuses.hp)],["방어력",fmt(p.defense)],["방어력 보너스",bonus(p.bonuses.defense)],["골드 획득",bonus(p.goldGain)],["경험치 획득",bonus(p.xpGain)],["스타포스",p.stars+"성"]];
  if(summaryOnly)return `<section class="panel pad character-summary"><div class="combat-power"><span>종합 전투력</span><strong>${fmt(p.combatPower)}</strong><small>현재 장착 장비 · 스타포스 · 잠재 반영</small></div><div class="character-metrics">${rows.map(([label,value])=>`<div><span>${label}</span><b>${value}</b></div>`).join("")}</div><p class="note">공격력·HP·방어력은 직업과 전직 효과까지 적용한 최종 수치입니다. 보너스 %는 잠재 옵션의 합계입니다.</p></section>`;
  return `<section class="panel pad character-summary"><div class="combat-power"><span>종합 전투력</span><strong>${fmt(p.combatPower)}</strong><small>현재 장착 장비 · 스타포스 · 잠재 반영</small></div><div class="character-metrics">${rows.map(([label,value])=>`<div><span>${label}</span><b>${value}</b></div>`).join("")}</div><p class="note">공격력·HP·방어력은 직업과 전직 효과까지 적용한 최종 수치입니다. 보너스 %는 잠재 옵션의 합계입니다.</p><details class="combat-formula"><summary>전투력 계산 기준</summary><p>⌊평균 초당 피해 × 보스 피해 배율 + HP × (1 + 방어력 ÷ 2,600) × 0.1⌋</p><p>평균 초당 피해는 공격력 × [1 + 치명타 확률 × (치명타 피해 배율 − 1)] × 공격 속도입니다. 해적 공격 속도는 1.08배, 나머지는 1배입니다.</p><p>고정 주스탯과 주스탯 %는 최종 공격력에 이미 반영됩니다. 골드·경험치 획득은 전투력에 포함하지 않습니다. 생존 점수는 일반 피해에 대한 유효 체력 기준이며 방어력을 무시하는 체력 비례 피해와 일시적인 전투 스킬은 제외한 비교용 수치입니다.</p></details></section><section class="panel pad stat-breakdown"><h3>스탯 상세</h3><p class="note">(기본 + 성장·장비 + 고정 잠재) × (1 + 스탯 %)<br>현재 직업은 ${c.stat}이 공격력에 반영됩니다.</p><div class="stat-detail-grid">${Object.entries(p.stats).map(([key,v])=>`<div class="stat-detail ${key===c.stat?"primary":""}"><div><strong>${key}</strong><b>${fmt(v.total)}</b></div><dl><dt>기본</dt><dd>${fmt(v.base)}</dd><dt>성장·장비</dt><dd>+${fmt(v.growth)}</dd><dt>고정 잠재</dt><dd>+${fmt(v.fixed)}</dd><dt>스탯 보너스</dt><dd>${bonus(v.percent)}</dd></dl></div>`).join("")}</div></section>`;
}
function gearLevelRange(base){const r=D.equipmentLevelRange(base);return r.min===r.max?requiredLevel(r.min):requiredLevel(r.min)+" / "+requiredLevel(r.max);}
function gearRollLabel(it){return "기본 공격력 "+D.gearAttributes(it,0).attack.toFixed(1);}
function itemMarkup(it) {
  if(it.kind==="companion")return cpCardMarkup(it.card);
  if(it.kind==="consumable")return `<div class="consumable-market-icon">${['treasureTicket','companionTicket','pickupTicket','essence','mapPiece','pearl','ore'].includes(it.key)?`<img src="${currencyIconURL(it.key)}" alt="" style="width:80%;height:80%;object-fit:contain">`:'◆'}</div><div class="item-info"><strong>${esc(materialName(it.key))}</strong><p>남은 ${fmt(it.quantity)}개 · 소모품</p></div>`;
  return `${gearMarkup(it)}<div class="item-info"><strong>${esc(D.gearName(it))} ${it.locked ? "[잠금]" : ""}</strong><p>${requiredLevel(it.level)} · ${D.isCommonBossGear(it)?"전 직업 공통":D.CLASSES.find((c) => c.id === it.classId).name} · ${D.equipmentType(it)} ${Object.values(state.equipped).includes(it.id) ? "· 장착 중" : ""}</p><span class="stars">${it.broken ? "파괴된 장비 흔적" : it.stars + "성"}</span> <span class="quality-badge">${gearRollLabel(it)}</span> <span class="potential-grade grade-color-${it.grade}">${it.lines.length ? D.RARITIES[it.grade] : "잠재 미개방"}</span></div>`;
}
function bagGroupsMarkup(groups){
 const items=groups.flatMap(g=>g.slots.flatMap(v=>v.items)),stackMap=new Map();for(const item of items){const key=salvageMode?item.id:D.equipmentKey(item);if(!stackMap.has(key))stackMap.set(key,[]);stackMap.get(key).push(item);}
 const stacks=[...stackMap.values()],pageSize=window.matchMedia('(max-width:700px)').matches?12:24,pages=Math.max(1,Math.ceil(stacks.length/pageSize));bagPage=Math.min(bagPage,pages-1);
 return '<div class="bag-pager">'+disabledBtn('이전','bagPage',bagPage-1,bagPage===0)+'<strong>'+(bagPage+1)+' / '+pages+' · '+stacks.length+'종 / '+items.length+'개</strong>'+disabledBtn('다음','bagPage',bagPage+1,bagPage>=pages-1)+'</div>'+(salvageMode?'':gearPresetBar())+'<div class="inventory-grid bag-grid">'+(stacks.slice(bagPage*pageSize,(bagPage+1)*pageSize).map(stack=>{let tile=bagTile(stack[0]);const presetNums=[...new Set(stack.flatMap(x=>gearPresetSlots(state,x.id)))].sort();tile=tile.replace(/data-preset="[^"]*"/,'data-preset="'+presetNums.map(n=>'E'+n).join('&#10;')+'"').replace(' in-preset','');if(presetNums.length)tile=tile.replace('class="bag-slot ','class="bag-slot in-preset ');if(!salvageMode)tile=tile.replace('data-action="item"','data-action="itemGroup"').replace('</button>','<b class="bag-stack-count">보유 '+stack.length+'개</b></button>');if(!salvageMode&&stack.length>1){const stars=stack.map(x=>x.stars),lo=Math.min(...stars),hi=Math.max(...stars);tile=tile.replace(/<span class="tile-star">[^<]*<\/span>/,'<span class="tile-star">'+(lo===hi?lo:lo+'~'+hi)+'★</span>');}return tile;}).join('')||'<div class="empty">장비가 없습니다.</div>')+'</div>';
}
function gearPresetBar(){const active=state.gearPresets?.[state.classId]?.active??0,blocked=!!state.battle||!!state.partyRoom||!!state.pendingCube;return '<div class="gear-preset-bar"><span>장비 슬롯</span>'+[0,1,2].map(i=>disabledBtn(String(i+1),'gearPreset',i,blocked,'gear-preset-btn'+(i===active?' active':''))).join('')+'</div>';}
function itemGroup(id){const first=state.items.find(x=>x.id===id);if(!first)return;const equipped=new Set(Object.values(state.equipped));const items=state.items.filter(x=>D.equipmentKey(x)===D.equipmentKey(first)).sort((a,b)=>Number(equipped.has(b.id))-Number(equipped.has(a.id)));if(items.length===1)return itemDetail(id);open(D.gearName(first)+' · '+items.length+'개','<p class="note">강화·잠재는 각각 유지됩니다. 사용할 장비를 고르세요.</p><div class="stack">'+items.map(it=>'<button data-action="item" data-arg="'+it.id+'" class="stack-equipment">'+itemMarkup(it)+'<small>'+it.lines.map(l=>D.OPTIONS[l.key]+' +'+l.value+D.optionUnit(l.key)).join(' · ')+'</small></button>').join('')+'</div>');}

function bagTile(item) {
  const otherClass=!D.canEquipClass(item,state.classId);
  return btn(gearMarkup(item)+`<span class="tile-meta"><span class="tile-level">${requiredLevel(item.level,"Lv."+item.level)}</span><span class="tile-star">${item.stars}★</span></span><span class="tile-name ${otherClass?"other-class":""}">${esc(D.gearName(item))}</span><span class="tile-class ${otherClass?"other-class":""}">${D.isCommonBossGear(item)?"전 직업 공통":esc(D.CLASSES.find(c=>c.id===item.classId)?.name||item.classId)+" 전용"}</span><span class="tile-quality">${gearRollLabel(item)}</span><span class="sr-only">${D.equipmentType(item)} ${item.locked?"잠금":""}</span>`, salvageMode?"salvagePick":"item", item.id, `bag-slot ${item.boss?"boss-gear":""} ${salvageMode?(salvageSelection.has(item.id)?"salvage-selected":!canSalvage(item)?"salvage-unavailable":""):""} ${Object.values(state.equipped).includes(item.id)?"equipped":""}${gearPresetSlots(state,item.id).length?" in-preset":""} ${item.locked?"locked":""}`).replace("<button ",'<button data-preset="'+gearPresetSlots(state,item.id).map(n=>"E"+n).join("&#10;")+'" ');
}
function inventory() {
  for(const id of salvageSelection)if(!state.items.some(it=>it.id===id&&canSalvage(it)))salvageSelection.delete(id);
  const groups = inventoryGroups(state.items, D.CLASSES, state.classId, Object.values(state.equipped), filterClass, filterSlot, state.gearPresets);
  return `${header("가방", "INVENTORY")}<div class="subnav">${[
    ["bag", "가방"],
    ["consumables", "소모품"],
    ["pets", "펫"],
    ["exchange", "교환소"],
    ["mail", "보관함"],
    ["odds", "확률표"],
  ]
    .map(([k, l]) => btn(l, "gearSub", k, sub === k ? "active" : ""))
    .join(
      "",
    )}</div>${sub === "consumables" ? consumableView(state) : sub === "pets" ? petInventory(state) : sub === "exchange" ? gearExchange() : sub === "odds" ? odds() : sub === "mail" ? mailbox() : `${supplies()}<section class="auto-equip-card"><div><strong>전투력 기준 최적 장착</strong><small>현재 전투력 ${fmt(power(state).combatPower)} · 장비·잠재 합산</small></div>${disabledBtn("최적 장착","autoEquip","",!!state.battle||!!state.partyRoom||!!state.pendingCube,"gold")}<p>${state.pendingCube?"큐브 옵션 선택을 먼저 완료해 주세요.":state.battle||state.partyRoom?"전투·파티를 종료한 뒤 사용할 수 있습니다.":"가방 전체에서 착용 가능한 장비를 비교합니다. 잠금 장비도 포함됩니다."}</p></section><div class="filters"><select data-filter="slot"><option value="">모든 부위</option>${D.SLOTS.map((v, i) => `<option value="${i}" ${String(i) === filterSlot ? "selected" : ""}>${v}</option>`).join("")}</select><select data-filter="class"><option value="">모든 직업</option>${D.CLASSES.map((c) => `<option value="${c.id}" ${c.id === filterClass ? "selected" : ""}>${c.name}</option>`).join("")}</select></div><p class="note">9부위 장착 · 직업별 무기 ${D.WEAPON_TYPES[state.classId].join("·")}<br>가방 ${state.items.length}/1000 · 장착 장비 먼저 → 내 직업 → 부위별 정렬</p><div class="actions">${btn(salvageMode?"선택 분해 종료":"선택 분해","salvageMode")}${salvageMode?btn("일반 장비 자동 선택 (최대 50개)","salvageSelectVisible")+btn("선택 해제","salvageClear")+disabledBtn("선택 "+salvageSelection.size+"개 분해","salvageBatchConfirm","",!salvageSelection.size||!!state.battle||!!state.partyRoom,"danger"):""}</div>${salvageMode?`<p class="note">장비를 눌러 선택하세요. 자동 선택은 일반 장비만 고르고 보스 장비는 직접 눌러야 선택돼요. 장착·잠금·파괴·큐브 선택 중인 장비는 제외됩니다.</p>`:""}<div class="bag-groups">${bagGroupsMarkup(groups)}</div>`}`;
}
function gearExchange(){
 const classId=exchangeClass||state.classId;
 return `<section class="panel pad gear-exchange"><h3>장비 파편 교환소</h3><p class="note">직업과 레벨을 선택하면 장비 1개를 받습니다. <strong>1% 확률로 같은 레벨의 보스 장비</strong>가 나오며, 이때 직업과 부위는 무작위입니다.</p><label for="exchange-class">장비 직업</label><select id="exchange-class">${D.CLASSES.map(c=>`<option value="${c.id}" ${c.id===classId?'selected':''}>${c.name}</option>`).join('')}</select><label for="exchange-level">장비 레벨 · 파편 비용</label><select id="exchange-level">${Array.from({length:19},(_,i)=>(i+1)*10).map(level=>`<option value="${level}" ${level===exchangeLevel?'selected':''}>Lv.${level} 장비 · 파편 ${level}개</option>`).join('')}</select><p>보유 장비 파편 <strong>${fmt(state.materials.fragment)}개</strong></p>${disabledBtn(gearMarkup({level:exchangeLevel,classId,slot:0,boss:false,design:0,weaponVariant:0})+`<strong>Lv.${exchangeLevel} 랜덤 장비 교환</strong><small>파편 ${exchangeLevel}개 사용 · 장비 1개 획득</small>`,"exchangeGear",exchangeLevel,state.materials.fragment<exchangeLevel||!!state.battle||!!state.coopRoom,"exchange-card")}<p class="note">이미지는 무기 예시입니다. 일반 장비 99%: 선택한 직업, 9부위 각 1/9, 디자인 2종 각 50%. 보스 장비 1%: 5직업 각 20%, 9부위 각 1/9. 기본 능력치는 무작위이며 잠재는 잠긴 상태로 지급됩니다. 가방이 가득 차면 보관함으로 받습니다.</p></section>`;
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
  const tier = D.equipmentTierLevel(it);
  const frameClass = `gear-frame ${size} ${it.boss ? "boss-gear" : ""} ${it.boss && tier >= 160 ? "boss-relic relic-" + tier : ""}`;
  if(!art.standalone) {
    const label=esc(it.boss ? "보스 장비 " + art.name : art.name);
    if(art.grid)return `<span class="${frameClass}"><span class="gear-icon" role="img" aria-label="${label}" style="display:block;width:100%;height:100%;background-image:url('${art.art}');background-size:${art.columns*100}% ${art.rows*100}%;background-position:${art.column/(art.columns-1)*100}% ${art.row/(art.rows-1)*100}%;background-repeat:no-repeat"></span></span>`;
    const bounds=equipmentBounds[art.art.split('/').pop()];
    const ys=bounds.cellY[art.column],cell=bounds.cells?.[art.column]?.[art.row];
    const [x,y,w,h]=cell||[bounds.x[art.column],ys[art.row],bounds.x[art.column+1]-bounds.x[art.column],ys[art.row+1]-ys[art.row]];
    const clipId='gear-clip-'+(++gearClipId),clip=cell?.[4]?`<defs><clipPath id="${clipId}"><polygon points="${cell[4]}"/></clipPath></defs>`:'';
    return `<span class="${frameClass}"><svg class="gear-icon" role="img" aria-label="${label}" viewBox="${[x,y,w,h].join(' ')}" overflow="hidden" preserveAspectRatio="xMidYMid meet"><svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${[x,y,w,h].join(' ')}" overflow="hidden"><image href="${art.art}" width="${bounds.width}" height="${bounds.height}" preserveAspectRatio="none" ${clip?'clip-path="url(#'+clipId+')"':''}/>${clip}</svg></svg></span>`;
  }
  return `<span class="${frameClass}"><img class="gear-icon" src="${esc(art.art)}" alt="${esc(it.boss ? "보스 장비 " + art.name : art.name)}" width="256" height="256" decoding="async" draggable="false"></span>`;
}
function bossMarkup(b, size="") {
  if(b.fullArt) return `<img class="boss-sprite ${size}" src="${b.art}" alt="${esc(b.name)}" style="object-fit:contain">`;
  if(b.weekly)return `<div class="boss-sprite ${size}" style="background-image:url(tower/boss-${TOWER_FLOORS[b.region].art}.webp);background-size:300% 100%;background-position:left center" role="img" aria-label="${esc(b.name)}"></div>`;
  return '<div class="boss-sprite '+size+'" role="img" aria-label="'+esc(b.name)+'" style="background-image:url('+b.art+');background-position:'+b.spriteX+'% '+b.spriteY+'%"></div>';
}
function monsterMarkup(m) {
  return '<img class="monster-sprite" src="'+fieldArtUrl(m.art)+'" alt="'+esc(m.name)+'" draggable="false">';
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
  )}</table></div>${cubeGuide()}<div class="panel pad"><h3>일반 사냥 드롭 · 온라인/오프라인 동일</h3><p class="note">처치마다 독립 추첨: 일반 장비 ${pct(D.EQUIP_DROP)}, 보스 장비 ${pct(D.FIELD_BOSS_DROP)}, 레드 큐브 ${pct(D.CUBE_DROP)}, 잠재 주문서 ${pct(D.SCROLL_DROP)}, 파편 ${pct(D.FRAGMENT_DROP)}. 멸성의 황무지: 일반 장비 0.26%, 레드 큐브 0.04%, 파편 0.6%, 보스 장비·잠재 주문서 0%.<br>장비 직업은 6개 직업 중 각각 1/6 (약 16.67%) 확률로 무작위 추첨합니다. 부위는 9종 균등입니다. 모든 직업은 일반 2종 각 50%, 보스 1종 100%입니다. 무기 종류의 구성은 레벨마다 달라집니다. 보스 드롭은 보스 탭에 표시합니다.</p><table><tr><th>사냥터 · 몬스터 레벨</th><th>장비 레벨<br>일반 / 보스</th><th>일반 / 보스 확률</th></tr>${D.STAGES.map(r=>`<tr><td>${r.name} · Lv.${r.level}</td><td>${gearLevelRange(r.dropLevel)} / ${gearLevelRange(r.dropLevel)}</td><td>${pct(D.fieldDropRates(r).equipment)} / ${pct(D.fieldDropRates(r).bossEquipment)}</td></tr>`).join('')}</table><p class="note">지역 안의 몬스터별 확률은 같습니다. 장비는 1·10·20·30…200레벨만 새로 생성됩니다. 멸성의 황무지(Lv.195·200·205)는 세 사냥터 모두 190제 일반 장비가 드롭됩니다. 그 외 드롭 장비는 몬스터·보스 레벨을 10단위로 반올림합니다(최소 10, 최대 200). 60→60 · 66→70 · 80→80 · 85→90레벨입니다. 상위 레벨 장비는 상위 콘텐츠에서 획득합니다. 기존 장비도 1·10·20…200레벨로 보정하며 강화·잠재·잠금은 유지합니다. 오프라인 최대 6시간 동안 실제 처치 수에 동일 확률로 추첨하며, 가방 초과 장비는 기본 수치별로 보관합니다.</p><h3>신규 장비 기본 수치</h3><p class="note">각 개별 장비에는 고유 이름과 수치 범위가 있습니다.  장비 종류에 따라 정해진 범위에서 공격력·주스탯·HP·방어력을 각각 추첨합니다. 범위 하위 50% 구간 75%, 다음 40% 구간 24%, 최상위 10% 구간 1%로 추첨한 뒤 정수로 확정합니다. 범위가 좁으면 반올림으로 구간의 수치가 겹칠 수 있습니다. 보스 장비는 더 높은 별도 범위를 사용합니다.</p></div>`;
}
function disabledBtn(label,action,arg,blocked=false,cls="") {
  const html=btn(label,action,arg,cls,true);
  return blocked ? html.replace("<button ","<button disabled data-unavailable ") : html;
}
let regularAutoSkills=false,regularAutoBattle=null;
function combatSkillState(slot,party=false,tick){
 const r=party?partyRoom:state.battle,me=party?r.members.find(m=>m.mine):r;
 const seconds=party?r.seconds:battleEnemy(r).seconds;
 tick??=Math.min(seconds,r.tick+Math.max(0,Math.floor((Date.now()-lastSync)/1000)));
 const sk=slot===5?D.FIFTH_SKILLS[state.classId]:slot===4?D.FOURTH_SKILLS[state.classId]:slot===1?D.CLASS_SKILLS[state.classId]:slot===2?D.SECOND_SKILLS[state.classId]:D.THIRD_SKILLS[state.classId];
 const ready=slot===5?r.fifthReadyAt:slot===4?r.fourthReadyAt:slot===3?r.thirdReadyAt:slot===1?me?.skillReady:me?.secondReady;
 const remain=party?Math.max(0,Math.ceil((ready||0)-tick)):Math.max(0,Math.ceil(((ready||0)-r.started-tick*1000)/1000));
 const locked=slot===5?!D.fifthUnlocked(state):slot===1?!D.firstJobUnlocked(state):(state.advancement||0)<slot-1;
 return {sk,disabled:locked||remain>0||(party&&me?.hp<=0)||tick>=seconds,status:locked?'전직 필요':remain?remain+'초':slot===5?'사용 가능 · '+sk.cooldown+'초':'사용 가능'};
}
function combatSkillButtons(party=false) {
 const key=state.battle?.started;if(regularAutoBattle!==key){regularAutoBattle=key;regularAutoSkills=false;}
 return '<div class="regular-combat-skills">'+[1,2,3,4,5].map(slot=>{
 const {sk,disabled,status}=combatSkillState(slot,party);
 return '<button class="gold skill-button" data-illustrated="1" data-action="'+(party?'partySkill':'skill')+'" data-arg="'+slot+'" data-skill-slot="'+slot+'" '+(disabled?'disabled':'')+' title="'+esc(sk.description)+'"><span class="combat-skill-name">'+slot+'차 · '+esc(sk.name)+'</span><small data-skill-status>'+status+'</small></button>';}).join('')+(party?'':'<button data-illustrated="1" data-action="autoSkills" aria-pressed="'+regularAutoSkills+'"><span class="combat-skill-name">스킬 자동</span><small>'+(regularAutoSkills?'켜짐':'꺼짐')+'</small></button>')+'</div>';
}
function skillGuide(){return (state.classId==='priest'?'<p class="note">사제는 최대 HP가 평타와 모든 공격 스킬을 강화합니다. HP%는 최대 체력을 높이고 표기 수치의 70%가 추가 공격력%로 반영됩니다(예: HP 10% → 공격력 7%, 공격력% 잠재와 합산). 주스탯 LUK%와 장비 공격력도 피해량에 반영됩니다. 공격력%·크리티컬%·보스 피해% 잠재는 표기 수치 그대로 적용됩니다.</p>':'')+'<div class="skill-guide">'+[1,2,3,4,5].map(slot=>{const sk=slot===5?D.FIFTH_SKILLS[state.classId]:slot===4?D.FOURTH_SKILLS[state.classId]:slot===1?D.CLASS_SKILLS[state.classId]:slot===2?D.SECOND_SKILLS[state.classId]:D.THIRD_SKILLS[state.classId];return '<p><b>'+slot+'차 · '+sk.name+'</b> · 쿨타임 '+sk.cooldown+'초<br><small>'+sk.description+((slot===5?!D.fifthUnlocked(state):slot===1?!D.firstJobUnlocked(state):(state.advancement||0)<slot-1)?' · '+(slot===5?200:slot===1?30:slot===2?60:slot===3?100:150)+'레벨 전직 보스 처치 후 해금':'')+'</small></p>';}).join('')+'</div>';}
function recentLoot(){return '<section class="panel pad recent-loot"><h3>최근 사냥 획득 · 최신 5개</h3><p class="note">아이템 획득 시 갱신 · 같은 정산의 재료는 수량 합산</p>'+((state.recentLoot||[]).map(x=>'<div class="loot-row"'+(['essence','mapPiece','pearl','ore'].includes(x.key)?' data-currency-label':'')+'>'+(x.kind==='gear'?gearMarkup(x.item):'<span class="loot-icon">'+(['essence','mapPiece','pearl','ore'].includes(x.key)?'<img src="'+currencyIconURL(x.key)+'" alt="" width="32" height="32" style="object-fit:contain">':'◆')+'</span>')+'<span>'+(x.kind==='gear'?esc(D.gearName(x.item)):esc(D.MATERIALS[x.key]))+' <b>×'+x.quantity+'</b><small>'+new Date(x.at).toLocaleTimeString('ko-KR')+' · '+esc(D.STAGES[x.stage]?.name||'사냥')+'</small></span></div>').join('')||'<p class="note">아직 획득한 아이템이 없습니다.</p>')+'</section>';}

function advancementRooms(){const rooms=coopRooms.filter(r=>r.mode==='advancement');return '<section class="panel pad"><h3>전직 보스 모집 중</h3><p class="note">3초마다 자동 갱신 · 방장이 출발하기 전에 참가하세요.</p>'+btn('목록 새로고침','coopList')+(rooms.length?rooms.map(r=>{const t=D.ADVANCEMENT_BOSSES[r.tier];if(!t)return '';const locked=state.level<t.level||D.jobStage(state)<t.stage;return '<div class="daily-row"><span>'+esc(r.name)+' · '+t.name+'<small>Lv.'+t.level+' · '+r.count+' / 2명</small></span>'+disabledBtn(locked?'레벨·이전 전직 필요':'참가','coopJoin',r.id,locked||r.count>=2)+'</div>';}).join(''):'<p class="note">모집 중인 방이 없습니다.</p>')+'</section>';}
function advancementLobby(){const done=D.jobStage(state);return header('전직의 시련','CLASS ASCENSION')+advancementRooms()+'<section class="panel pad"><p>1차 30레벨 · 2차 60레벨 · 3차 100레벨 · 4차 150레벨 · 5차 200레벨 · 6차 250레벨 · 7차 300레벨. 방을 만들어 혼자 또는 2명이 함께 처치하면 전직합니다.</p><p class="note">120초 제한 · 최대 2명 · 1~5차는 인원에 따른 난이도 변화 없음 · 6·7차는 2명이면 보스 체력 2배 · 완료한 전직도 도움 참가 가능 · 도움·연습은 추가 보상 없음 · 전직마다 공격력·최대 체력 10% 증가 (1~5차 누적 61.05%) · 6차 공격력 +12%·보스 피해 +20%·HP +12% · 7차 공격력 +15%·보스 피해 +30%·치명타 +10%p·HP +15% (잠재처럼 더해짐) · 기존 2차 전직 유지</p></section><div class="advancement-boss-list">'+D.ADVANCEMENT_BOSSES.map(t=>{const cleared=done>t.stage,locked=done<t.stage||state.level<t.level;return '<article class="panel pad advancement-boss">'+advancementPortrait(t)+'<div><small>'+(t.stage+1)+'차 전직 · Lv.'+t.level+'</small><h3>'+t.name+'</h3><p>HP '+fmt(t.hp)+' · 제한 '+t.seconds+'초</p><p class="note">'+t.guide+'</p><strong>'+(t.stage>=5?advancementBonusText(t.stage):'해금: '+(t.stage===4?D.FIFTH_SKILLS[state.classId].name:t.stage===3?D.FOURTH_SKILLS[state.classId].name:t.stage===2?D.THIRD_SKILLS[state.classId].name:t.stage===1?D.SECOND_SKILLS[state.classId].name:D.CLASS_SKILLS[state.classId].name))+'</strong><div class="actions">'+disabledBtn(cleared?'도움·연습 방 만들기':locked?'레벨·이전 전직 필요':'전직 방 만들기','advancementStart',t.stage,locked,'gold')+'</div></div></article>';}).join('')+'</div>';}
// 2026-11-03 도현: 소탕 — 일일·주간 탭 보스 목록 바로 위 전체 소탕(일보·주보 한 번에). 토큰·열쇠 던전은 단계별 개별 소탕만.
function sweepBar(){
  const plan=sweepPlan(state,Date.now());
  const daily=plan.filter(p=>p.kind==='boss'&&!D.BOSSES[p.id].weekly).length,weekly=plan.filter(p=>p.kind==='boss'&&D.BOSSES[p.id].weekly).length;
  const parts=[daily&&'일보 '+daily,weekly&&'주보 '+weekly].filter(Boolean);
  return `<section class="panel sweep-bar"><div><strong>전체 소탕</strong><small>${parts.length?parts.join(' · '):'소탕할 수 있는 보스가 없어요 · 한 번 깬 일보·주보만 소탕 가능'}</small></div>${disabledBtn(plan.length?'전체 소탕 '+plan.length+'건':'전체 소탕','sweep','all',!plan.length||!!state.battle,'gold')}</section>`;
}
function bosses() {
  const menu=`<div class="subnav">${[...(state.isAdmin?[["warrior3d","3D 전투 실험실"]]:[]),["exploration","링구의 탐험"],["citadel","암흑성채"],["raid","레이드"],["final","최종 보스"],["daily","일일"],["weekly","주간"],["training","허수아비"],["tower","시련의 탑"],["advancement","전직 보스"],...(tokenVisible(state)?[["token","토큰 던전"]]:[]),["key","열쇠 던전"]].map(([k,l])=>btn(l,"bossSub",k,bossTab===k?"active":"")).join("")}</div>`;
  if(bossTab==="warrior3d"){if(!state.isAdmin){bossTab="daily";return bosses();}return menu+header("잿불 성채의 파수꾼","관리자 전용 · 3D 전투")+`<section class="panel pad"><h3>전사 3D 전투 실험실</h3><p>이미지 전사와 파수꾼 · 캐릭터를 따라가는 위쪽 시점 · 직접 이동 · 화염 탄막 · 내려찍기 · 돌진 · 화염 파동</p><p class="note">기존 전사 스킬: 대지 분쇄 · 균열 참격 · 천공 참렬 · 천검 만화진. 완료한 전직 단계까지 사용 가능합니다. 연습용 HP와 공격력으로 진행하며 보상·입장 비용은 없습니다.</p>${disabledBtn(state.classId!=="warrior"?"전사로 직업을 변경해 주세요":"3D 전투 입장","warriorLab","",state.classId!=="warrior"||!!state.battle||!!state.coopRoom||!!state.partyRoom,"gold")}</section>`;}
  if(bossTab==="token"){if(!tokenVisible(state)){bossTab="daily";return bosses();}return menu+tokenView(state,tokenPage);}
  if(bossTab==="key")return menu+keyView(state);
  if(bossTab==="exploration")return menu+explorationLobby(state,coopRoom,coopRooms);
  if(bossTab==="raid")return menu+raidLobby(state,coopRoom,coopRooms);
  if(bossTab==="final")return menu+finalLobby(state,coopRoom,coopRooms);
  if(bossTab==="wave"){bossTab="exploration";return menu+coopLobby(state,coopRoom,coopRooms,"exploration");}
  if(bossTab==="citadel")return menu+citadelLobby(state,null,coopRooms);
  if(bossTab==="coop"){bossTab="exploration";return menu+explorationLobby(state,coopRoom,coopRooms);}
  if(bossTab==="tower")return menu+towerLobby(state);
  if(bossTab==="advancement")return menu+advancementLobby();
  if(bossTab==="training")return menu+header("허수아비 훈련장","DAMAGE TEST")+`<p class="note compact-note">실제 이동·공격·스킬로 60초 동안 측정합니다. 최근 5초 DPS와 전체 평균 DPS를 실시간으로 볼 수 있습니다. 입장 비용·보상·도전 횟수 차감은 없습니다.</p><div class="boss-list">${[["normal","일반몹 허수아비","일반 몬스터 대상 피해를 측정합니다."],["boss","보스용 허수아비","보스 피해 증가 효과를 포함해 측정합니다."]].map(([mode,name,description])=>`<section class="panel boss-card dummy-card"><div class="dummy-card-art ${mode}" aria-hidden="true"><i></i></div><div class="boss-card-body"><strong>${name}</strong><p>${description}</p><small>60초 · 직접 조작 · 무제한 재도전</small><div class="actions">${disabledBtn("측정 시작","dummyStart",mode,!!state.battle||!!state.coopRoom||!!state.partyRoom,"gold")}</div></div></section>`).join("")}</div>`;
  return header("보스 토벌","BOSS CHALLENGE")+menu+`<p class="note compact-note">입장 조건 없음 · 주간 보스별 주 1회 보상 · 월요일 00시 갱신 · 일일 보스별 하루 1회 도전 · 매일 00시 갱신</p>${sweepBar()}<div class="boss-list">${D.BOSSES.filter(b=>b.weekly===(bossTab==="weekly")).map(b=>bossCard(b)).join("")}</div>`;
}
function bossCard(b) {
  const claimed=!state.isAdmin&&(b.weekly?state.bossClaims?.[b.id]===D.weekKey(Date.now()):state.bossClaims?.[b.id]===D.dayKey(Date.now()));
  const locked=false;
  return `<section class="panel boss-card"><div class="boss-thumb" style="background-image:url('${b.background||D.REGIONS[b.region].background}')">${bossMarkup(b)}</div><div class="boss-card-body"><div class="row spread"><strong>${b.name}</strong><span class="count-badge ${claimed?"used":""}">${b.weekly?(claimed?"이번 주 보상 완료":"이번 주 보상 1회 남음"):(claimed?"오늘 보상 완료":"오늘 보상 1회 남음")}</span></div><small>권장 Lv.${b.level} · HP ${fmt(b.hp)} · ${b.seconds/60}분</small><div class="actions">${disabledBtn(claimed?(b.weekly?"보상 완료":"보상 완료"):locked?"입장 조건":"보상 도전","bossStart",b.id,claimed||locked,"gold")}${state.cleared?.includes(b.id)?disabledBtn("소탕","sweep","boss:"+b.id,!bossSweepable(state,b,Date.now())||!!state.battle):""}${disabledBtn("연습 ∞","bossPractice",b.id,locked)}</div><details><summary>보상 · 권장 장비</summary><p class="note">레벨·스타포스·선행 보스 제한 없음<br>${gearLevelRange(b.gearLevel)} 보스 장비 ${pct(b.dropChance)}${b.exactHalfWeapon?" · 무기 비중은 다른 부위의 1/2":""}<br>${fmt(b.gold)} G · 레드 큐브 ${b.cubes}${b.rewardMaterials?Object.entries(b.rewardMaterials).map(([k,n])=>" · "+D.MATERIALS[k]+" "+n).join(""):b.weekly?" · 블랙 큐브 2":""}<br>권장: ${b.recommended.slots}부위 ${b.recommended.stars}성 ${b.recommended.boss?"보스":"일반"} 장비${b.recommended.pot?" · 일반 주스탯 잠재 합계 18%":""}<br>${b.guide?esc(b.guide)+"<br>":""}${b.weekly?"직접 이동 전투 · 처치 후 바닥 상자 개봉":"하루 1회 보상 · 승리 시 차감 · 패배·포기 시 재도전 가능"} · 연습은 보상 없음</p></details></div></section>`;
}
function partyPanel() {
 if(!partyRoom)return header('협동 토벌')+'<div class="panel pad">파티 정보를 불러오는 중…</div>';
 const r=partyRoom,b=D.raidBoss(r.bossId)||D.BOSSES[r.bossId],me=r.members.find(m=>m.mine),total=r.members.reduce((n,m)=>n+Number(m.damage),0),fighting=r.status==='fighting';
 return `${header(b.name,'CO-OP RAID · '+(r.practice?'연습':'보상 도전'))}<section class="panel"><div class="arena party-arena" data-class="${state.classId}" style="background-image:url('ui/dawn-ruins.svg')"><div class="battle-head"><small>전투 제한 ${b.seconds}초 · <b id="battle-timer">${fighting?'남은 '+Math.max(0,r.seconds-r.tick)+'초':'파티원 모집 중'}</b></small><h3>${b.name}</h3>${fighting?`<div class="hp"><i style="width:${r.hp/r.maxHp*100}%"></i></div><small>${fmt(r.hp)} / ${fmt(r.maxHp)}</small>`:''}</div><div class="monster">${bossMarkup(b)}</div><div class="combat-status"><span class="pill">${fighting?b.pattern:'1명부터 출발 가능 · 4인 기준 난이도'}</span></div></div><div class="pad"><div class="party-members">${r.members.map(m=>`<div class="party-member ${m.hp<=0?'fallen':''}"><div class="row spread"><strong>${esc(m.name)}${m.mine?' · 나':''}</strong><small>${m.departed?'이탈':m.hp<=0?'쓰러짐':D.CLASSES.find(c=>c.id===m.classId)?.name}</small></div><div class="hp"><i style="width:${Math.max(0,m.hp/m.maxHp*100)}%"></i></div><small>${fmt(m.hp)}/${fmt(m.maxHp)} · 기여 ${total?(Number(m.damage)/total*100).toFixed(1):'0.0'}%</small></div>`).join('')}</div><div class="actions">${fighting?(me?.hp<=0?disabledBtn(me.revived?'부활 사용 완료':'부활 · HP 30%','partyRevive','',me.revived,'gold'):combatSkillButtons(true)):r.isHost?btn('출발 · '+r.members.filter(m=>!m.departed).length+'명','partyStart','','gold'):''}${btn('파티 나가기','partyLeaveConfirm','','danger')}</div>${skillGuide()}<p class="note">전투 중 일반 사냥 중지 · 종료 후 자동사냥 재개</p></div></section>`;
}
const bigCount=n=>{n=Math.floor(n||0);return n>=1e8?Math.floor(n/1e8).toLocaleString('ko-KR')+'억':fmt(n);};
function supplies(){return '<div class="bag-supplies" data-currency-label>'+Object.entries(D.MATERIALS).map(([key,name])=>'<div><img src="'+currencyIconURL(key)+'" alt=""><span>'+name+'<b title="'+fmt(state.materials[key]||0)+'개">'+bigCount(state.materials[key]||0)+'개</b></span></div>').join('')+'</div><p class="note"><a href="probability-guide.html" target="_blank" rel="noopener">전체 확률표</a> · <a href="boss-equipment.html" target="_blank" rel="noopener">보스 장비 목록</a></p>';}

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
    rankingRows=rows;rankingUpdated=Date.now();rememberTribes(rows);tribesAt=Date.now();
  } catch(err) { rankingError=message(err); }
  finally { if(requestId===rankingRequest){rankingLoading=false;if(view==="ranking")render();} }
}
// 2026-11-07 도현: 관리자 송금 — 재화·소모품·동료 소환권 등 보낼 수 있는 것 전부.
const ADMIN_TRANSFER_NAMES=()=>({gold:"골드",diamond:"다이아",token:"토큰",mileage:"셀리아 마일리지",fishToken:"낚시 토큰",companionTicket:"동료 소환권",pickupTicket:"픽업 소환권",treasureTicket:"보물찾기 티켓",tribeTicket:"종족 주사위",luckPotion:"행운 물약",...D.MATERIALS});
function adminTransferDialog(id) {
  if(!state?.isAdmin)return;
  const target=rankingRows.find(r=>r.id===id);if(!target)return toast("랭킹을 새로고침한 뒤 선택해 주세요.");
  open("관리자 송금",`<div class="stack"><p><strong>${esc(target.name)}</strong> · Lv.${target.level} · ${esc(D.CLASSES.find(c=>c.id===target.classId)?.name||"")}</p><label>재화 · 소비템<select id="transfer-resource">${Object.entries(ADMIN_TRANSFER_NAMES()).map(([key,name])=>`<option value="${key}">${esc(name)}</option>`).join("")}</select></label><label>보낼 수량<input id="transfer-amount" type="number" inputmode="numeric" min="1" max="999999999999" step="1" value="1"></label><p class="note">수수료 없이 입력한 수량 전부가 상대방 보유량에 추가됩니다. 관리자 재화는 999,999,999,999로 유지됩니다.</p>${btn("송금하기","adminTransferSend",id,"gold",true)}</div>`);
}
function goldTransferDialog(id) {
  const target=rankingRows.find(r=>r.id===id&&!r.isMe);
  if(!target)return toast('랭킹을 새로고침한 뒤 선택해 주세요.');
  open('골드 송금',`<div class="stack"><p><strong>${esc(target.name)}</strong>님에게 골드를 보냅니다.</p><p class="note">내 보유 골드 ${fmt(state.gold)} G · 수수료 없음</p><label>송금할 골드<input id="gold-transfer-amount" type="number" inputmode="numeric" min="1" max="999999999999" step="1" value="1"></label><p class="note">송금 즉시 내 골드가 차감되며 상대방은 우편함에서 직접 수령합니다.</p>${btn('송금 확인','goldTransferConfirm',id,'gold',true)}</div>`);
}
let rankingProfileRequest=0;
async function showRankingProfile(id){
 const row=rankingRows.find(r=>r.id===id);if(!row)return;
 const version=++rankingProfileRequest;
 open('모험가 정보',`<p class="note" id="rank-profile-loading-${version}">불러오는 중…</p>`);
 const content=document.getElementById('rank-profile-loading-'+version);
 try{
  await ensureToken();
  const data=await request('/functions/v1/ringu-rebirth',{command:'rankingProfile',args:{id},requestId:crypto.randomUUID()},true);
  if(version!==rankingProfileRequest||!modal.open||!content.isConnected)return;
  const p=data.profile,c=D.CLASSES.find(c=>c.id===p.classId);
  const summary=characterMetrics(p.metrics,c,true);
  open('모험가 정보',`<div class="rank-profile"><div class="rank-profile-look"><div class="portrait ${p.classId==='priest'?'priest-portrait':''}" style="${portraitStyle(p.classId,p.costumeId,portraitPosition(p.classId))}"></div><strong>${esc(p.name)}</strong></div><div class="rank-profile-arena"><span>아레나 순위</span><strong>${p.arenaRank?fmt(p.arenaRank)+'위':'언랭크'}</strong></div>${summary}</div>`);
 }catch(error){if(version===rankingProfileRequest&&modal.open&&content?.isConnected)open('모험가 정보',`<p class="note">정보를 불러오지 못했어요. ${esc(message(error))}</p>`);}
}
function rankings() {
  const combat=rankingMode==="combat",rankKey=combat?"combatRank":"levelRank",label=combat?"전투력":"레벨";
  const rows=rankingRows.filter(r=>r[rankKey]<=100).sort((a,b)=>a[rankKey]-b[rankKey]),me=rankingRows.find(r=>r.isMe);
  const PROF_NAME={alchemist:"연금술사",explorer:"탐험가",fisher:"어부",miner:"광부"},profTag=r=>r.profession&&PROF_NAME[r.profession]?` · <span class="rank-prof rank-prof-${r.profession}">${PROF_NAME[r.profession]}</span>`:"";
  const profBoard=()=>{const by={};for(const r of rankingRows)if(PROF_NAME[r.profession])(by[r.profession]??=[]).push(r.name);return `<div class="rank-prof-board">${Object.entries(PROF_NAME).map(([k,n])=>`<div class="rank-prof-${k}"><b>${n}</b><span>${(by[k]||[]).map(esc).join(", ")||"-"}</span></div>`).join("")}</div>`;};
  const className=r=>r.advancement>=4?D.FIFTH_NAMES[r.classId]:r.advancement>=3?D.FOURTH_NAMES[r.classId]:r.advancement>=2?D.THIRD_NAMES[r.classId]:r.advancement?D.ADVANCEMENTS[r.classId]:D.CLASSES.find(c=>c.id===r.classId)?.name||"모험가";
  const score=r=>combat?fmt(r.combatPower):"Lv. "+r.level;
  const portrait=r=>`<div class="rank-portrait portrait ${r.classId==='priest'?'priest-portrait':''}" style="${portraitStyle(r.classId,r.costumeId,portraitPosition(r.classId))}" aria-hidden="true"></div>`;
  const podium=rows.slice(0,3).map(r=>`<article role="button" tabindex="0" data-action="rankingProfile" data-arg="${esc(r.id)}" class="rank-podium rank-place-${r[rankKey]} ${r.isMe?"is-me":""}"><span class="podium-place">${r[rankKey]===1?"♛":"◆"} ${r[rankKey]}위</span>${portrait(r)}<strong title="${esc(r.name)}"><span class="tribe-name-line" data-fit>${tribeTag(r.tribe)}<span class="rank-name-text">${esc(r.name)}</span></span>${arenaTierIcon(r.arenaScore,r.arenaRank)}</strong>${r.title?`<div class="podium-title">${titleBadge(r.title)}</div>`:""}<small>${className(r)}${profTag(r)}${r.isMe?" · 나":""}</small><b>${score(r)}</b><span class="podium-secondary">${combat?"Lv. "+r.level:"전투력 "+fmt(r.combatPower)}</span></article>`).join("");
  return header("모험가 랭킹","HALL OF ADVENTURERS")+`<section class="ranking-view"><div class="ranking-toolbar">${btn("← 캐릭터","back")}${btn(rankingLoading?"불러오는 중…":"↻ 새로고침","rankingRefresh","",rankingLoading?"rank-refresh loading":"rank-refresh")}</div><div class="ranking-tabs" role="group" aria-label="랭킹 기준">${[ ["level","레벨 순위","모험의 깊이"],["combat","전투력 순위","성장의 힘"] ].map(([key,name,desc])=>`<button data-action="rankingMode" data-arg="${key}" aria-pressed="${rankingMode===key}" class="${rankingMode===key?"active":""}"><strong>${name}</strong><small>${desc}</small></button>`).join("")}</div>${profBoard()}<div class="ranking-meta"><span>전체 ${fmt(rankingRows[0]?.total||0)}명 · TOP 100</span><span>${rankingUpdated?new Date(rankingUpdated).toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit"})+" 조회 · 10초 자동 갱신":"서버 기록 기준 · 10초 자동 갱신"}</span></div>${rankingError?`<div class="panel pad rank-error" role="alert">순위를 불러오지 못했습니다. ${esc(rankingError)}${btn("다시 시도","rankingRefresh")}</div>`:""}${rankingLoading&&!rankingRows.length?'<div class="panel pad rank-empty" role="status">모험가들의 기록을 모으고 있어요…</div>':rows.length?`<div class="rank-podium-grid">${podium}</div>`:!rankingError?'<div class="panel pad rank-empty">아직 등록된 모험가가 없습니다.</div>':""}<section class="rank-my-card"><span class="rank-my-label">MY RANK</span><div><strong>${state.isAdmin?"랭킹 제외":me?me[rankKey]+"위":"집계 대기"}</strong><span><span class="tribe-name-line" data-fit>${tribeTag(state.tribe)}<span class="rank-name-text">${esc(state.name)}</span></span>${state.title?titleBadge(state.title):""}${arenaTierIcon(me?.arenaScore,me?.arenaRank)}<small>${label} ${me?score(me):"—"}</small></span></div><p>${me?`레벨 ${me.levelRank}위 · 전투력 ${me.combatRank}위`:state.isAdmin?"관리자 계정은 순위에 포함되지 않습니다.":"캐릭터 기록이 저장되면 순위에 표시됩니다."}</p></section>${rows.length?`<section class="rank-list"><div class="rank-list-head"><span>순위 · 모험가</span><span>${label}</span></div>${rows.map(r=>`<div role="button" tabindex="0" data-action="rankingProfile" data-arg="${esc(r.id)}" class="rank-list-row ${r.isMe?"is-me":""}"><span class="rank-number ${r[rankKey]<=3?"medal":""}">${r[rankKey]}</span>${portrait(r)}<div class="rank-person"><strong><span class="tribe-name-line" data-fit>${tribeTag(r.tribe)}<span class="rank-name-text">${esc(r.name)}</span></span>${r.isMe?'<i>나</i>':""}</strong><div class="rank-identity-badges">${r.title?titleBadge(r.title):""}${arenaTierIcon(r.arenaScore,r.arenaRank)}</div><small>${className(r)}${profTag(r)} · ${combat?"Lv. "+r.level:"전투력 "+fmt(r.combatPower)}</small></div><div class="rank-score"><b>${score(r)}</b>${!r.isMe&&r.id&&!state.isTester?(state.isAdmin?`<button type="button" class="rank-transfer-button" data-illustrated="none" data-action="adminTransferOpen" data-arg="${esc(r.id)}">관리자 송금</button>`:`<button type="button" class="rank-transfer-button" data-illustrated="none" data-action="goldTransferOpen" data-arg="${esc(r.id)}">골드 송금</button>`):""}</div></div>`).join("")}</section>`:""}<details class="rank-rules"><summary>순위 집계 기준</summary><p>레벨 순위: 레벨 → 현재 경험치 순.<br>전투력 순위: 전투력 → 레벨 → 현재 경험치 순.<br>모두 같으면 고정된 계정 순서로 표시합니다.</p><p>마지막 서버 저장 기록을 기준으로 조회합니다. 전투력은 캐릭터 창과 같은 계산식을 사용하며, 일시적인 스킬 효과와 골드·경험치 획득 보너스는 제외합니다.</p></details></section>`;
}
function journal() {
  const goals=[["첫 토벌",state.cleared.length,1,"보스 첫 처치"],["장비 수집가",state.collection.length,50,"서로 다른 장비 50종 발견"],["직업의 길",D.firstJobUnlocked(state)?1:0,1,requiredLevel(30)+" · 수정 문지기 처치 후 전직"],["숙련 모험가",state.level,100,requiredLevel(100,"100레벨 달성")],["왕좌를 넘어",state.cleared.length,30,"멸신왕 벨제리온 처치"],["새벽의 탐험가",state.dungeonClaims.relic?1:0,1,"여명의 폐허 클리어"]];
  return header("모험 수첩","나의 성장 기록")+btn("돌아가기","back")+`<div class="journal-banner"><h2>다음 이야기는<br>네 모험으로 채워져.</h2></div><div class="goal-grid">${goals.map(([name,value,max,desc])=>`<section class="panel pad"><div class="row spread"><strong>${name}</strong><span class="pill">${value>=max?"달성":Math.min(value,max)+"/"+max}</span></div><p class="note">${desc}</p><div class="exp"><i style="width:${Math.min(100,value/max*100)}%"></i></div></section>`).join("")}</div>`;
}
function marketTile(l) {
  const it=l.item,consumable=it.kind==="consumable";
  if(it.kind==="companion"){const d=CP_BY_ID[it.card?.c];if(!d)return '';return `<button class="market-compact-card" data-action="marketConfirm" data-arg="${l.id}" aria-label="${esc(d.name)} 상세 보기"><span class="market-card-meta">동료 ${d.grade}급<b>★${it.card.s}</b></span><img class="material-tile-image" src="companions/${d.id}-human-v1.webp" alt=""><strong class="market-card-name">${esc(d.name)}</strong><small>분당 ${fmt(cpMaxRate(it.card))} G · ${esc(cpPassive(it.card).name)} ${it.card.t==='jackpot'?it.card.v+'%':'+'+it.card.v+'%'}</small><b class="market-card-price">${fmt(l.price)} G</b></button>`;}
  const name=consumable?materialName(it.key):D.gearName(it);
  return `<button class="market-compact-card ${!consumable&&it.boss?"boss-gear":""}" data-action="marketConfirm" data-arg="${l.id}" aria-label="${esc(name)} 상세 보기"><span class="market-card-meta">${consumable?"소모품":requiredLevel(it.level)}<b>${consumable?fmt(it.quantity)+"개":it.stars+"★"}</b></span>${consumable?'<img class="material-tile-image" src="'+currencyIconURL(it.key)+'" alt="">':gearMarkup(it)}<strong class="market-card-name">${esc(name)}</strong><small>${consumable?"남은 "+fmt(it.quantity)+"개":(D.isCommonBossGear(it)?"전 직업 공통":D.CLASSES.find(c=>c.id===it.classId).name)+" · "+gearRollLabel(it)}</small><b class="market-card-price">${!l.own&&l.status==="open"?goldPurchaseIcon():""}${fmt(l.price)} G${consumable?" / 개":""}</b><span class="market-card-status">${l.status==="open"?(l.own?"판매 중 · 상세":"상세 보기"):l.status==="sold"?"판매 완료":"회수 완료"}</span></button>`;
}
function gearRollDetails(it){if(!it.baseStats)return "";const ranges=D.gearStatFullRanges(it),multiplier=D.gearStatMultiplier(it),scale=(key,value)=>value*multiplier*(key==='hp'?D.gearHPMultiplier(it):1);return `<section class="panel pad"><h4>획득 시 확정된 기본 수치</h4>${Object.entries({attack:"공격력",stat:"주스탯",hp:"HP",defense:"방어력"}).map(([key,label])=>`<p>${label} <strong>${fmt(scale(key,it.baseStats[key]))}</strong> ${it.legacyBaseStats?"":`<small>(${D.isTieredBossGear(it)?"200제 전체 범위":"가능 범위"} ${fmt(scale(key,ranges[key].min))}~${fmt(scale(key,ranges[key].max))})</small>`}</p>`).join("")}<p class="note">강화 전 수치입니다. ${it.legacyBaseStats?"기존 장비 성능을 보존한 수치입니다.":"각 능력치는 따로 추첨되며 높은 구간일수록 희귀합니다."} 큐브 재감정으로 기본 수치는 바뀌지 않습니다.</p></section>`;}
function gearStatsMarkup(it) {
  const a=D.gearAttributes(it),cl=D.CLASSES.find(c=>c.id===(D.isCommonBossGear(it)?state.classId:it.classId));
  return `<div class="market-picked-stats gear-base-stats">${[["공격력",a.attack.toFixed(1)],[cl.stat,fmt(a.stat)],["최대 HP",fmt(a.hp)],["방어력",fmt(a.defense)]].map(([k,v])=>`<div><span>${k}</span><b>+${v}</b></div>`).join("")}</div><p class="note">장비 자체 능력치입니다. 기본 수치·스타포스 반영, 잠재는 아래 별도 표시.${it.broken?" 파괴된 장비는 장착 효과가 없습니다.":""}</p>`;
}
function marketGearDetails(it) {
  return `<div class="item">${itemMarkup(it)}</div>${gearStatsMarkup(it)}${gearRollDetails(it)}<div class="market-picked-options"><h4>잠재능력</h4>${it.lines.length?it.lines.map(l=>`<div class="grade-color-${l.grade}"><small>${D.RARITIES[l.grade]}</small><span>${D.OPTIONS[l.key]}</span><b>+${l.value}${D.optionUnit(l.key)}</b></div>`).join(""):'<p class="note">잠재 미개방</p>'}</div>${additionalPanel(it)}`;
}
function market() {
  if(state?.isTester)return header("거래소","MARKET")+`<section class="panel pad"><h3>거래소 이용 불가</h3><p class="note">테스트 계정은 거래소를 사용할 수 없어요.</p></section>`;
  return `${header("거래소", "MARKET")}<div class="subnav">${btn("구매", "marketMode", "buy", !mine&&!buyOrderMode ? "active" : "")}${btn(`구매 요청${buyOrderAlert?`<b class="fantasy-mail-count bo-alert">${buyOrderAlert}</b>`:""}`, "marketMode", "orders", buyOrderMode ? "active" : "")}${btn("내 판매", "marketMode", "mine", mine&&!buyOrderMode ? "active" : "")}${btn("장비 등록", "marketSell")}${btn("소모품 등록", "marketSellConsumables")}${btn("동료 등록", "marketSellCompanion")}</div>${buyOrderMode?buyOrdersView():`<div class="subnav">${[["all","전체"],["gear","장비"],["consumable","소모품"],["companion","동료"]].map(([key,label])=>btn(label,"marketKind",key,marketKind===key?"active":"")).join("")}</div><p class="note">구매·등록 ${requiredLevel(5)}부터 · 판매 수수료 없음 · 등록 7일 · 최대 20건<br>만료 상품은 내 판매에서 남은 수량을 회수할 수 있습니다.</p><div class="filters" ${marketKind==="consumable"?'style="display:none"':""}><select data-filter="slot"><option value="">모든 부위</option>${D.SLOTS.map((v, i) => `<option value="${i}" ${String(i) === filterSlot ? "selected" : ""}>${v}</option>`).join("")}</select><select data-filter="class"><option value="">모든 직업</option>${D.CLASSES.map((c) => `<option value="${c.id}" ${c.id === filterClass ? "selected" : ""}>${c.name}</option>`).join("")}</select></div><div class="market-compact-grid">${
    marketRows
      .slice(0, 20)
      .map(marketTile)
      .join("") ||
    '<div class="empty">등록된 상품이 없습니다. 장비와 소모품을 판매할 수 있어요.</div>'
  }</div><div class="actions">${marketPage ? btn("이전", "page", marketPage - 1) : ""}${marketRows.length > 20 ? btn("다음", "page", marketPage + 1) : ""}${btn("새로고침", "marketRefresh")}</div>`}`;
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
  marketRows = rows.filter(row=>row.status!=="cancelled").map(row => ({...row, item: row.item.kind==="consumable"||row.item.kind==="companion"?row.item:D.normalizePotentialItem(row.item)}));
  render();
}
// 2026-11-04 도현: 새 구매 요청 알림 — 남이 올린 열린 요청 중 아직 안 본 것 개수를 거래소·구매 요청 버튼에 표시.
const BO_SEEN_KEY='ringu_buy_order_seen';
const boSeen=()=>{try{return new Set(JSON.parse(localStorage.getItem(BO_SEEN_KEY)||'[]'));}catch{return new Set();}};
let buyOrderAlert=0;const boToasted=new Set();
function buyOrderAlertUpdate(data,markSeen=false){
  const open=(data?.orders||[]).filter(o=>!o.own);let seen=boSeen();
  if(markSeen){seen=new Set(open.map(o=>o.id));try{localStorage.setItem(BO_SEEN_KEY,JSON.stringify([...seen]));}catch{}}
  // 2026-11-04 도현: 배지 = 남이 올린 열린 요청 중 아직 안 본 것. 거래소 › 구매 요청을 열면 읽음 처리돼 사라짐.
  const n=open.filter(o=>!seen.has(o.id)).length;
  if(n!==buyOrderAlert){buyOrderAlert=n;setBuyOrderAlert(n);return true;}return false;
}
async function buyOrderAlertPoll(){
  if(!state||state.isTester||document.visibilityState!=='visible')return;
  try{await ensureToken();const data=await request("/rest/v1/rpc/rebirth_buy_order",{p_action:"list",p_args:{},p_request:crypto.randomUUID()},true);
   if(buyOrderAlertUpdate(data,tab==="market"&&buyOrderMode))render();}catch{}
}
setTimeout(buyOrderAlertPoll,5000);setInterval(buyOrderAlertPoll,30000);
async function buyOrdersLoad(){
  const version=++buyOrderRequest;await ensureToken();
  const data=await request("/rest/v1/rpc/rebirth_buy_order",{p_action:"list",p_args:{},p_request:crypto.randomUUID()});
  if(version!==buyOrderRequest||tab!=="market"||!buyOrderMode)return;buyOrders=data||{orders:[],mine:[]};buyOrderAlertUpdate(buyOrders,true);render();
}
function buyOrderCard(o){
  return `<button class="market-compact-card buy-order-card ${o.own?"own":""}" data-action="buyOrderPick" data-arg="${esc(o.id)}" aria-label="${esc(materialName(o.key))} 구매 요청"><span class="market-card-meta">${o.own?"내 요청":"구매 요청"}<b>${fmt(o.quantity)}개</b></span><img class="material-tile-image" src="${currencyIconURL(o.key)}" alt=""><strong class="market-card-name">${esc(materialName(o.key))}</strong><small>개당 <b>${fmt(o.price)} G</b></small><small>${o.own?"누르면 취소":marketHave(o.key)>0?"보유 "+fmt(marketHave(o.key))+"개 · 판매 가능":"보유 없음"}</small></button>`;
}
function buyOrdersView(){
  if(!buyOrders)return '<p class="note">구매 요청을 불러오는 중…</p>';
  const status={open:"진행 중",filled:"완료",cancelled:"취소",expired:"만료 · 환불"};
  const mineRows=(buyOrders.mine||[]).map(o=>`<div class="buy-order-mine"><img src="${currencyIconURL(o.key)}" alt=""><span><b>${esc(materialName(o.key))}</b><small>개당 ${fmt(o.price)} G · ${fmt(o.original-o.quantity)}/${fmt(o.original)}개 받음 · ${status[o.status]||o.status}</small></span>${o.status==="open"?btn("취소","buyOrderPick",o.id):""}</div>`).join("");
  return `<p class="note">필요한 소모품을 골드로 걸어두면, 가진 사람이 바로 팔 수 있어요. 등록하는 순간 골드가 묶이고, 팔리는 만큼 소모품이 바로 들어와요.<br>${requiredLevel(5)}부터 · 수수료 없음 · 7일 지나면 남은 골드 자동 환불 · 최대 10건</p><div class="actions">${btn("구매 요청 등록","buyOrderNew","","primary")}${btn("새로고침","buyOrderRefresh")}</div><div class="market-compact-grid">${(buyOrders.orders||[]).map(buyOrderCard).join("")||'<div class="empty">아직 구매 요청이 없어요. 필요한 소모품을 먼저 요청해 보세요.</div>'}</div>${mineRows?`<h3 class="buy-order-mine-title">내 구매 요청</h3><div class="buy-order-mine-list">${mineRows}</div>`:""}`;
}
function buyOrderNewDialog(key=null){
  if(!key)return open("구매 요청할 소모품",`<p class="note">사고 싶은 소모품이나 동료 카드를 고르세요.</p><div class="market-compact-grid material-sell-grid" data-currency-label>${BUY_ORDER_KEYS.filter(k=>!cpKey(k)).map(k=>`<button class="market-compact-card" data-action="buyOrderNewPick" data-arg="${k}">${marketMaterialIcon(k,'material-tile-image')}<strong>${esc(materialName(k))}</strong><small>보유 ${fmt(marketHave(k))}개</small></button>`).join("")}</div><h3 class="buy-order-mine-title">동료 카드</h3><div class="market-compact-grid material-sell-grid" data-currency-label>${CP_KEYS.map(k=>`<button class="market-compact-card" data-action="buyOrderNewPick" data-arg="${k}">${marketMaterialIcon(k,'material-tile-image')}<strong>${esc(materialName(k))}</strong><small>보유 ${fmt(marketHave(k))}장</small></button>`).join('')}</div>`);
  if(!BUY_ORDER_KEYS.includes(key))return;
  const best=(buyOrders?.orders||[]).filter(o=>o.key===key).reduce((m,o)=>Math.max(m,o.price),0);
  open("구매 요청 등록",`${btn("← 소모품 목록","buyOrderNew")}<div class="material-picked" data-currency-label>${marketMaterialIcon(key)}<div><strong>${esc(materialName(key))}</strong><p>보유 ${fmt(marketHave(key))}개${best?` · 현재 최고 요청가 ${fmt(best)} G`:""}</p></div></div><input id="bo-key" type="hidden" value="${key}"><label>사고 싶은 수량<input id="bo-count" type="number" inputmode="numeric" min="1" max="1000000" step="1" value="1"></label><label>개당 가격 (G)<input id="bo-price" type="number" inputmode="numeric" min="1" max="1000000000" step="1" value="${best||1000}"></label><p id="bo-total" class="note"></p>${btn("골드 걸고 요청하기","buyOrderCreate","","primary",true)}`);
  updateBuyOrderForm();
}
function updateBuyOrderForm(){
  const out=$('#bo-total');if(out){const count=Number($('#bo-count').value),price=Number($('#bo-price').value),total=count*price,valid=Number.isSafeInteger(count)&&count>=1&&count<=1e6&&Number.isSafeInteger(price)&&price>=1&&price<=1e9&&total<=1e12;
    out.textContent=!valid?'수량 1~1,000,000개, 개당 1~10억 G, 합계 1조 G 이하로 입력해 주세요.':total>state.gold?`묶일 골드 ${fmt(total)} G · 보유 골드가 부족해요.`:`묶일 골드 ${fmt(total)} G (보유 ${fmt(state.gold)} G)`;
    const b=modal.querySelector('[data-action="buyOrderCreate"]');if(b)b.disabled=!valid||total>state.gold;}
  const fill=$('#bo-fill-count');if(fill){const o=(buyOrders?.orders||[]).find(x=>x.id===fill.dataset.order),count=Number(fill.value),valid=o&&Number.isSafeInteger(count)&&count>=1&&count<=Math.min(o.quantity,marketHave(o.key));
    $('#bo-fill-total').textContent=valid?`받을 골드 ${fmt(count*o.price)} G`:'보유 수량과 남은 요청 수량 안에서 입력해 주세요.';const b=modal.querySelector('[data-action="buyOrderFill"]');if(b)b.disabled=!valid;}
}
function buyOrderPickDialog(id){
  const o=(buyOrders?.orders||[]).find(x=>x.id===id)||(buyOrders?.mine||[]).find(x=>x.id===id&&x.status==="open");if(!o)return toast("이미 끝난 요청이에요.");
  const own=o.own||(buyOrders?.mine||[]).some(x=>x.id===id);
  if(own)return open("구매 요청 취소",`<div class="material-picked" data-currency-label>${marketMaterialIcon(o.key)}<div><strong>${esc(materialName(o.key))}</strong><p>개당 ${fmt(o.price)} G · 남은 ${fmt(o.quantity)}개</p></div></div><p>취소하면 묶어둔 골드 <b>${fmt(o.price*o.quantity)} G</b>를 바로 돌려받아요. 이미 받은 소모품은 그대로예요.</p>${btn("요청 취소하기","buyOrderCancel",o.id,"danger",true)}`);
  if(cpKey(o.key)){const cards=cpSellable().filter(c=>c.c===cpKey(o.key)).sort((a,b)=>cpMaxRate(a)-cpMaxRate(b));return open("구매 요청에 동료 카드 판매",`<div class="material-picked" data-currency-label>${marketMaterialIcon(o.key)}<div><strong>${esc(materialName(o.key))}</strong><p>구매 요청 · 장당 <b>${fmt(o.price)} G</b> · 남은 ${fmt(o.quantity)}장</p></div></div>${cards.length?`<p class="note">팔 카드를 고르세요 (배치 중인 카드는 제외).</p><div class="cp-sell-pick">${cards.map((c,i)=>`<label class="cp-sell-row"><input type="radio" name="bo-card" value="${c.i}" ${i?'':'checked'}><span>${cpCardInfo(c)}</span></label>`).join('')}</div>${btn("이 카드 팔고 골드 받기","buyOrderFillCard",o.id,"primary")}`:'<p class="note">이 동료 카드를 가지고 있지 않아요 (배치 중인 카드는 팔 수 없어요).</p>'}`);}
  const have=marketHave(o.key),max=Math.min(have,o.quantity);
  open("구매 요청에 판매",`<div class="material-picked" data-currency-label>${marketMaterialIcon(o.key)}<div><strong>${esc(materialName(o.key))}</strong><p>구매 요청 · 개당 <b>${fmt(o.price)} G</b> · 남은 ${fmt(o.quantity)}개</p><p>내 보유 ${fmt(have)}개</p></div></div>${max>0?`<label>판매 수량<input id="bo-fill-count" data-order="${esc(o.id)}" type="number" inputmode="numeric" min="1" max="${max}" step="1" value="${max}"></label><p id="bo-fill-total" class="note"></p>${btn("팔고 골드 받기","buyOrderFill",o.id,"primary",true)}`:'<p class="note">이 소모품을 가지고 있지 않아요.</p>'}`);
  updateBuyOrderForm();
}
async function buyOrderWrite(action,args){
  if(busy)return;await command("sync",{},true);if(busy)return;busy=true;const key=pendingKey()+"_buyorder";
  try{await ensureToken();let p=JSON.parse(localStorage.getItem(key)||"null");
    if(!p){p={p_action:action,p_args:args,p_request:crypto.randomUUID()};localStorage.setItem(key,JSON.stringify(p));}
    else if(p.p_action!==action||JSON.stringify(p.p_args)!==JSON.stringify(args))toast("이전 거래 요청을 복구합니다.");
    const result=await request("/rest/v1/rpc/rebirth_buy_order",p);localStorage.removeItem(key);
    busy=false;await command("sync",{},true);await buyOrdersLoad();return result;
  }catch(e){if(e.status===400)localStorage.removeItem(key);throw e;}finally{busy=false;}
}
function open(title, html, closable = true) {
  stopSkillLookPreview?.();stopSkillLookPreview=null;
  if(modal.open&&modal.dataset.scrollKey)dialogScroll.set(modal.dataset.scrollKey,modal.scrollTop);
  const scrollKey=(selected||"")+"|"+title,preservedModalScroll=title.endsWith(" · 결과 선택")?0:dialogScroll.get(scrollKey)||0;modal.dataset.scrollKey=scrollKey;
  modal.classList.remove("prof-dialog", "enhance-dialog", "cube-dialog", "market-picker-dialog", "attendance-dialog", "change-class-dialog", "fantasy-menu-dialog", "summon-result-dialog", "invest-activity-dialog", "invest-trade-dialog", "admin-positions-dialog", "invest-rank-dialog", "title-dialog", "companion-dialog", "tribe-dialog");
  replacePreservingDetails(modal, "dialog|"+scrollKey, `${closable ? btn("닫기", "close", "", "close") : ""}<h2 id="dialog-title">${title}</h2>${html}`);
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
let cubeKind="cube", cubeLockChoice=-1, lastStarResult=null, lastCubeResult=null;
const enhanceIcon=(key)=>key==='gold'?'':`<img class="enhance-currency" src="${currencyIconURL(key)}" alt="">`;
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
  const current=D.gearAttributes(it),next=D.gearAttributes(it,target),cl=D.CLASSES.find(c=>c.id===(D.isCommonBossGear(it)?state.classId:it.classId));
  const result=lastStarResult?.id===it.id?lastStarResult:null;
  return `<div class="enhance-intro"><span>STAR FORCE</span><small>성공할 때마다 공격력·주스탯 상승 · 방어구 5부위는 HP도 상승</small></div>${result?`<div class="enhance-result ${result.outcome}" role="status"><strong>${{success:"강화 성공!",keep:"강화 실패 · 별 유지",down:"강화 실패 · 별 하락"}[result.outcome]||"장비 파괴"}</strong><span>${result.before}성 → ${result.after}성${result.gains?` · 장비 공격력 +${result.gains.attack.toFixed(1)} · ${cl.stat} +${result.gains.stat}${result.gains.hp?` · HP +${result.gains.hp}`:""}`:" · 골드 "+fmt(result.cost)+" 소모"}</span></div>`:""}<div class="star-track" role="img" aria-label="최대 25성 중 ${it.stars}성">${Array.from({length:5},(_,g)=>`<span>${Array.from({length:5},(_,i)=>`<i class="${g*5+i<it.stars?"lit":g*5+i===it.stars&&!max?"next":""}">★</i>`).join("")}</span>`).join("")}</div><div class="enhance-stage"><div class="enhance-item-display">${gearMarkup(it,"big-item")}</div><div class="star-transition"><span>${max?"강화 완료":"다음 강화 단계"}</span><div><b>${it.stars}<small>성</small></b>${max?'<em>MAX</em>':`<span class="transition-arrow">→</span><b class="target">${target}<small>성</small></b>`}</div></div></div><p class="note">${Object.values(state.equipped).includes(it.id)?"장착 중 · 강화 수치가 캐릭터에 바로 반영됩니다.":"미장착 · 장비는 강해지지만 캐릭터 수치는 장착 후 반영됩니다."}</p>${max?'':`<div class="enhance-gains"><div><span>기본 공격</span><b>${current.attack.toFixed(1)} <i>→</i> <em>${next.attack.toFixed(1)}</em></b></div><div><span>${cl.stat}</span><b>${current.stat} <i>→</i> <em>${next.stat}</em></b></div>${next.hp>current.hp?`<div><span>최대 HP</span><b>${current.hp} <i>→</i> <em>${next.hp}</em></b></div>`:""}</div><section class="enhance-probabilities"><div class="probability-title"><span>성공 확률</span><strong>${pct(o.success)}</strong></div><div class="probability-bar" aria-hidden="true">${[["success",o.success],["keep",o.keep],["down",o.down],["destroy",o.destroy]].map(([k,v])=>`<i class="${k}" style="width:${v*100}%"></i>`).join("")}</div><div class="probability-details">${[["유지",o.keep,"keep"],["하락",o.down,"down"],["파괴",o.destroy,"destroy"]].map(([name,v,k])=>`<div class="${k}"><span>${name}</span><b>${v===0?"0%":pct(v)}</b></div>`).join("")}</div></section>${enhancementWallet(cost)}`}${max&&D.canTranscendTier(it)?transcendBlock(it):disabledBtn(max?(it.boss&&Number(it.level)>=D.TRANSCEND_LEVEL?"최고 등급 · 25성 달성":"최대 25성 달성"):`${target}성 강화하기`,"star",it.id,!!blocked,"enhance-primary")}<p class="enhance-help ${blocked&&!max?"short":""}">${blocked|| (o.destroy>0?"실패 시 장비가 파괴될 수 있습니다. 흔적과 잠재는 보존됩니다.":o.down>0?"실패 시 별이 1개 내려갈 수 있습니다. 파괴 위험은 없습니다.":"실패해도 현재 별이 유지됩니다. 파괴 위험은 없습니다.")}</p>`;
}

// 2026-11-02 초월: 220제 등급 보스장비 25성 → 초월석으로 다음 등급 (스탯은 새 등급 범위에서 랜덤, 스타포스만 0성)
// 2026-11-03 도현: 초월 성공 연출 — 화면 전체에 빛 + "초월 성공!" 크게, 2.8초 뒤 자동으로 닫힘(누르면 바로 닫힘).
function transcendCelebrate(e){
 try{
  document.querySelector('.transcend-celebrate')?.remove();
  const it=state.items?.find(x=>x.id===e.id),art=it?D.equipmentIdentity(it):null;
  const el=document.createElement('div');el.className='transcend-celebrate';el.setAttribute('role','status');
  el.innerHTML=`<div class="tc-rays"></div><div class="tc-core">${art?.art?`<img src="${art.art}" alt="">`:''}<small>TRANSCEND</small><strong>초월 성공!</strong><p>${esc(e.fromName)} <i>→</i> <b>${esc(e.toName)}</b></p><span>${art?.name?esc(art.name)+' · ':''}스타포스 0성부터 다시</span></div>${'<i class="tc-spark"></i>'.repeat(14)}`;
  const close=()=>{el.classList.add('out');setTimeout(()=>el.remove(),350);};
  el.addEventListener('click',close);document.body.append(el);setTimeout(close,2800);
  sounds?.play?.('loot-rare');
 }catch{toast(`초월 성공! ${e.fromName} → ${e.toName} 등급`);}
}
function transcendBlock(it){
 const need=D.transcendCost(it),have=state.materials?.transcendStone||0,next={...it,bossTier:D.bossTier(it)+1},range=D.gearStatRanges(next),m=D.gearStatMultiplier(it);
 const blocked=enhancementBlock(it)||(!state.isAdmin&&have<need?`초월석이 부족합니다 (${fmt(have)}/${fmt(need)}개)`:"");
 return `<section class="transcend-box"><div class="transcend-head"><span>TRANSCEND</span><b>${esc(D.bossTierName(it))} <i>→</i> ${esc(D.bossTierName(next))}</b></div><p>25성 달성! 초월하면 <b>다음 등급 장비</b>로 바뀌어요.</p><ul><li>기본 수치는 새 등급 범위에서 다시 랜덤 · 공격력 ${fmt(Math.round(range.attack.min*m))}~${fmt(Math.round(range.attack.max*m))}</li><li><b>스타포스만 0성으로 초기화</b> · 잠재능력·추가옵션은 그대로</li><li>다시 25성을 찍으면 다음 등급으로 초월할 수 있어요</li></ul><p class="transcend-cost" data-currency-label="transcendStone"><img src="${currencyIconURL('transcendStone')}" alt="">초월석 <b>${fmt(need)}개</b> 필요 · 보유 ${fmt(have)}개</p>${disabledBtn(`초월하기 (초월석 ${need}개)`,"transcend",it.id,!!blocked,"enhance-primary")}${blocked?`<p class="enhance-help short">${blocked}</p>`:""}<p class="enhance-help">성공률 <b>${Math.round(D.transcendChance(it)*100)}%</b>${(it.transcendFails||0)>=D.TRANSCEND_PITY?" · 이번엔 확정 성공!":(it.transcendFails||0)?` · 연속 실패 ${it.transcendFails}회 (${D.TRANSCEND_PITY}회 실패 시 다음 확정)`:""} · 실패해도 장비·스타포스·잠재는 그대로, 초월석만 소모</p></section>`;
}
function baseStatsPanel(it){return gearRollDetails(it)+renderRefinePanel(it,state,enhancementBlock(it));}
let lastUnlockResult=null;
function cubePanel(it){return renderCubePanel(it,state,cubeKind,lastCubeResult,enhancementBlock(it),cubeLockChoice,lastUnlockResult)+renderAdditionalSection(it,state,enhancementBlock(it),lastUnlockResult);}
function itemDetail(id, section=id===selected?itemSection:"info") {
  if(selected!==id){lastStarResult=null;lastCubeResult=null;cubeLockChoice=-1;lastUnlockResult=null;}
  selected=id;itemSection=section;
  const it=state.items.find(x=>x.id===id);if(!it)return;
  const p=power(state),next=power({...state,equipped:{...state.equipped,[it.slot]:it.id}}),equipped=Object.values(state.equipped).includes(id),o=D.starOdds(it.stars);
  const comparison=D.canEquipClass(it,state.classId)&&it.level<=state.level&&!it.broken?`장착 시 공격력 ${fmt(next.attack)} (${next.attack-p.attack>=0?"+":""}${next.attack-p.attack}) · HP ${fmt(next.hp)}`:!D.canEquipClass(it,state.classId)?`${D.CLASSES.find(c=>c.id===it.classId).name} 전용 장비입니다. 현재 직업으로는 착용할 수 없습니다. 장비 능력치는 직업에 관계없이 볼 수 있습니다.`:"착용 레벨과 장비 상태를 확인하세요.";
  let body="";
  if(section==="info")body=`${gearStatsMarkup(it)}${gearRollDetails(it)}<p class="note">${comparison}</p><p>${it.boss?"보스 장비":"일반 장비"} · ${it.bound?"거래 불가":it.hairUnbound?"거래 1회 가능 (링구의 머리카락)":it.locked?"잠금":"거래 가능"}</p><div class="actions">${btn(equipped?"장착 해제":"장착","equip",id,"gold",true)}${btn(it.locked?"잠금 해제":"잠금","lock",id,"",true)}${btn("분해","salvageConfirm",id,"danger")}${it.bound&&Number(it.level)>1?disabledBtn(`<img class="hair-btn-art" src="${currencyIconURL("ringuHair")}" alt="" width="28" height="28">링구의 머리카락 바르기 (보유 ${fmt(state.materials?.ringuHair||0)})`,"hairConfirm",id,!state.isAdmin&&!(state.materials?.ringuHair>0)):""}</div><div class="potential">${it.lines.length?it.lines.map(l=>`<p class="grade-color-${l.grade}">[${D.RARITIES[l.grade]}] ${D.OPTIONS[l.key]} +${l.value}${D.optionUnit(l.key)}</p>`).join(""):"잠재 미개방"}${it.addLines?.length?`<p class="additional-heading">에디셔널 잠재능력</p>`+it.addLines.map(l=>`<p class="grade-color-${l.grade}">[${D.RARITIES[l.grade]}] ${D.OPTIONS[l.key]} +${l.value}${D.optionUnit(l.key)}</p>`).join(""):""}</div>`;
  if(section==="star")body=starPanel(it);
  if(section==="potential")body=cubePanel(it);
  if(section==="baseStats")body=baseStatsPanel(it);
  // 2026-11-03: 220제 이상은 강화하는 순간 거래 불가.
  if(section!=="info"&&Number(it.level)>=220&&!it.bound)body=`<p class="trade-bind-warn">⚠ 220제 이상 장비는 강화(스타포스·잠재·에디·불꽃·재련·초월)를 하면 <b>거래 불가</b>로 바뀌어요. 거래소에 올릴 거면 강화 전에 올리세요.</p>`+body;
  open(section==="star"?"스타포스 강화":section==="potential"?"잠재능력 · 큐브":section==="baseStats"?"기본 수치":"장비 정보",`<div class="enhance-content" data-currency-label><div class="enhance-item-head">${gearMarkup(it)}<div><strong>${esc(D.gearName(it))}</strong><small>${requiredLevel(it.level)} · ${D.isCommonBossGear(it)?"전 직업 공통":D.CLASSES.find(c=>c.id===it.classId).name} · ${D.equipmentType(it)} · ${it.broken?"파괴된 흔적":it.stars+"성"} · ${gearRollLabel(it)}</small></div></div><div class="enhance-tabs">${[["info","장비 정보"],["star","스타포스"],["potential","잠재 · 큐브"],["baseStats","기본 수치"]].map(([k,l])=>btn(l,"itemMode",id+":"+k,section===k?"active":"")).join("")}</div>${body}</div>`);
  modal.classList.add("enhance-dialog");if(section==="potential")modal.classList.add("cube-dialog");
}
function refineChoice() {
 const p=state.pendingRefine,it=state.items.find(i=>i.id===p.id);if(!it)return;
 selected=p.id;itemSection="baseStats";
 open((p.kind==="bonus"?"추가옵션 불꽃":"기본수치 재련석")+" · 결과 선택",`<div class="enhance-content"><div class="enhance-item-head">${gearMarkup(it)}<div><strong>${esc(D.gearName(it))}</strong></div></div>${renderRefineChoice(it,p,state)}</div>`,false);
 modal.classList.add("enhance-dialog","cube-dialog");
}
function addCubeChoice() {
 const p=state.pendingAddCube,it=state.items.find(i=>i.id===p.id);if(!it)return;
 selected=p.id;itemSection="potential";
 open("에디셔널 큐브 · 결과 선택",`<div class="enhance-content"><div class="enhance-item-head">${gearMarkup(it)}<div><strong>${esc(D.gearName(it))}</strong></div></div>${renderAddCubeChoice(it,p,state)}</div>`,false);
 modal.classList.add("enhance-dialog","cube-dialog");
}
function cubeChoice() {
 const p=state.pendingCube,it=state.items.find(i=>i.id===p.id);
 selected=p.id;itemSection="potential";cubeKind=p.kind||(p.high?"highCube":"cube");
 open((D.CUBES[p.kind]?.name||"큐브")+" · 결과 선택",`<div class="enhance-content"><div class="enhance-item-head">${gearMarkup(it)}<div><strong>${esc(D.gearName(it))}</strong></div></div>${renderCubeChoice(it,p,state,cubeKind)}</div>`,false);
 modal.classList.add("enhance-dialog","cube-dialog");
}
function sweepResult(e){
  const line=(n,k)=>e[k]>0?`<li><span>${n}</span><b>${fmt(e[k])}</b></li>`:'';
  const items=(e.items||[]).map(id=>state.items?.find(it=>it.id===id)).filter(Boolean);
  const rows=e.entries.map(x=>`<li><span>${esc(x.name)}${x.weekly?' <small>주간</small>':''}</span><small>${[x.gold&&fmt(x.gold)+' G',x.highCube&&'블랙 '+x.highCube,x.addCube&&'에디 '+x.addCube,x.tokens&&'토큰 '+fmt(x.tokens),x.keys&&'열쇠 '+x.keys,x.items?.length&&'장비 '+x.items.length].filter(Boolean).join(' · ')}</small></li>`).join('');
  open(e.all?'전체 소탕 완료 · '+e.count+'건':'소탕 완료',`<div class="sweep-result"><h4>받은 보상</h4><ul class="sweep-total">${line('골드','gold')}${line('레드 큐브','cube')}${line('블랙 큐브','highCube')}${line('에디셔널 큐브','addCube')}${line('잠재 잠금석','potentialLock')}${line('토큰','tokens')}${line('던전 열쇠','keys')}</ul>${items.length?`<h4>장비 ${items.length}개</h4>`+items.map(it=>`<div class="panel pad">${gearMarkup(it)}<strong>${esc(D.gearName(it))}</strong><p>Lv.${it.level} · ${D.SLOTS[it.slot]}</p></div>`).join(''):''}${e.entries.length>1?`<details><summary>소탕 내역 ${e.entries.length}건</summary><ul class="sweep-list">${rows}</ul></details>`:`<ul class="sweep-list">${rows}</ul>`}</div>`+btn('확인','ack','','gold',true),false);
}
function showEvents(events) {
  const earnedTitles=events.filter(e=>e.type==='titleEarned');
  if(earnedTitles.length)queueMicrotask(()=>{sounds.play('loot-rare');
    if(modal.open){toast('칭호 획득 · '+earnedTitles.map(e=>e.name).join(', '));return;}
    open(earnedTitles.length>1?'칭호 '+earnedTitles.length+'개 획득!':'칭호 획득!',earnedTitles.length>1?`<div class="title-earned">${earnedTitles.map(e=>titleBadge(e.id,'md')).join('')}<p>칭호 창에서 장착할 수 있어요.</p></div>`+btn('칭호 보기','titleOpen'):titleEarnedView(earnedTitles[0])+btn('장착하기','titleEquip',earnedTitles[0].id));});
  for (const e of events) {
    if(e.type==='titleEarned'||e.type==='titleEquip')continue;
    if(e.type==='citadelChest'){sounds.play(e.items?.length?'loot-rare':'loot-common');const parts=['장비 파편 '+fmt(e.fragment||0)+'개'];if(e.potentialLock)parts.push('잠재 잠금석 '+e.potentialLock+'개');if(e.scroll)parts.push('잠재 해금 주문서 '+e.scroll+'개');if(e.highCube)parts.push('블랙 큐브 '+e.highCube+'개');for(const it of e.items||[])parts.push('보스 장비 · '+D.gearName(it)+' Lv.'+it.level);toast('보스 상자 · '+parts.join(' · ')+(e.stored?' (가방이 가득 차 우편함으로)':''));continue;}
    if(e.type==='sweep'){sounds.play(e.items?.length?'loot-rare':'loot-common');sweepResult(e);continue;}
    if(e.type==='explorationSweep'){sounds.play(e.items?.length?'loot-rare':'loot-common');const line=(n,k)=>e[k]>0?`<li><span>${n}</span><b>${fmt(e[k])}</b></li>`:'';open(`링탐 소탕 완료 · ${e.count}회`,`<div class="sweep-result"><p>${esc(e.name)} · 열쇠 ${fmt(e.keys)}개 사용</p><h4>받은 보상</h4><ul class="sweep-total">${line('골드','gold')}${line('레드 큐브','cube')}${line('블랙 큐브','highCube')}${line('주문서','scroll')}${line('잠재 잠금석','potentialLock')}</ul>${(e.items||[]).length?`<h4>장비 ${e.items.length}개</h4>`+e.items.map(it=>`<div class="panel pad">${gearMarkup(it)}<strong>${esc(D.gearName(it))}</strong><p>Lv.${it.level} · ${D.SLOTS[it.slot]}</p></div>`).join(''):'<p class="note">장비는 안 나왔어요.</p>'}</div>`+btn('확인','ack','','gold',true));continue;}
    if(e.type==='investBuy'){toast('투자 완료 · '+fmt(e.amount)+' G');continue;}
    if(e.type==='fishCatch'&&!e.won){sounds.play('ui-error');toast((e.reason==='snap'||e.reason==='weak'?'💥 ':'🐟 ')+fishFailText(e));continue;}
    if(e.type==='fishCatch'&&e.won&&e.records?.length){const r=e.records.at(-1);if(fishingUI.auto)toast('🏆 '+RARITIES_V3[r.rarity]+' 최고 기록 갱신! '+(r.weight>=1000?(r.weight/1000).toFixed(2)+' kg':r.weight+' g'));if(fishingUI.sheet==='records'||Date.now()-(fishingUI.recordsLoadedAt||0)>15000)command('fishRecordList',{},true).catch(()=>{});}
    if(e.type==='fishCatch'){sounds.play(e.won?'loot-rare':'ui-error');if(e.won&&e.reward!=='fish')toast(resourceName(e.reward)+(e.diamonds?' · 다이아 '+e.diamonds+'개':' 획득'));continue;}
    if(e.type==='fishAquariumAuto'){toast('수족관 최적 배치 · '+e.moved+'마리 교체 · 시간당 '+fmt(e.before)+' → '+fmt(e.after)+' G');continue;}
    if(e.type==='fishSell'){toast('낚시 토큰 '+fmt(e.tokens)+'개 받았어요.');continue;}
    if(e.type==='fishAquariumClaim'){toast(fmt(e.gold)+' G 받았어요.');continue;}
    if(e.type==='fishEnhance'){sounds.play(e.success?'loot-rare':'ui-error');toast(e.success?'🔨 강화 성공! 낚싯대 +'+e.level:'강화 실패… 단계는 그대로예요 (+'+e.level+')');continue;}
    if(e.type==='fishEnchant'){toast('✨ 새 인챈트를 뽑았어요. 이전과 새 인챈트 중 골라 주세요.');continue;}
    if(e.type==='fishEnchantChoose'){toast(e.pick==='new'?'✨ 새 인챈트를 적용했어요.':'이전 인챈트를 유지했어요.');continue;}
    if(e.type==='fishAutoBuy'){toast('🤖 자동 낚시 '+e.casts.toLocaleString('ko-KR')+'회 추가 · 남은 오토 '+e.total.toLocaleString('ko-KR')+'회');continue;}
    if(e.type==='fishFuse'){sounds.play(e.success?'loot-rare':'ui-error');toast(e.success?'🧬 합성 성공!':'합성 실패… 1마리만 남았어요.');continue;}
    if(e.type==='fishGoldFuse'){sounds.play(e.success?'loot-rare':'ui-error');toast(e.success?'🌈 무지개 개체 탄생!':'황금 합성 실패… 황금 1마리가 남았어요.');continue;}
    if(e.type==='fishAwaken'){toast('★ 각성! ★'+e.star+' (같은 종 '+e.used+'마리 사용)');continue;}
    if(e.type==='fishAquariumExpand'){toast('수족관이 '+e.slots+'칸이 됐어요.');continue;}
    if(e.type==='fishQuestClaim'){toast('일일퀘스트 · 다이아 '+e.diamonds+'개 받았어요.');continue;}
    if(e.type==='fishExchange'){toast(e.name+' '+e.count+'개 교환 완료 · 다이아 '+e.diamonds+'개 사용');continue;}
    if(e.type==='fishBossClaim'){toast('🐋 '+e.name+' 처치 보상 · 토큰 '+Math.floor(e.tokens).toLocaleString('ko-KR')+' · 다이아 '+e.diamonds+' · 트로피 물고기!');continue;}
    if(e.type==='fishContestClaim'){toast('대어 대회 '+e.rank+'위 보상 · 다이아 '+e.diamonds+'개, 에디셔널 큐브 '+e.addCube+'개');continue;}
    if(e.type==='fishUpgrade'){toast('낚싯대 Lv.'+e.level+' 달성!');continue;}
    if(e.type==='fishRodSelect'){toast('🎣 '+e.name+' 사용');continue;}
    if(e.type==='fishRodBuy'){sounds.play('loot-rare');toast('🎣 '+e.name+' 구매!'+(e.tier%2?' 새 낚시터가 열렸어요.':' 힘과 보너스가 올랐어요.')+(e.enchantReset?' 인챈트는 초기화됐어요.':''));continue;}
    if(e.type==='investSell'){toast('판매 완료 · '+fmt(e.amount)+' G 수령 / 수수료 '+fmt(e.fee)+' G');continue;}
    if(e.type==='lottoBuy'){toast(`번호 ${e.numbers.join(' · ')} · 복권 구매 완료`);continue;}
    if(e.type==='lottoGold'){toast(`로또 당첨금 ${fmt(e.amount)}골드를 받았습니다.`);continue;}
    if(e.type==='goldTransfer'){modal.close();toast(`${e.recipientName}님에게 ${fmt(e.amount)} G를 우편으로 보냈습니다.`);continue;}
    if(e.type==='arenaSeasonReward'){sounds.play('loot-rare');toast(`${e.tier} 시즌 보상 · ${fmt(e.rewards.gold)} G · 블랙 ${fmt(e.rewards.highCube)}개 · 프라임 ${fmt(e.rewards.primeCube)}개를 받았습니다.`);continue;}
    if(e.type==='goldTransferClaim'){toast(`우편에서 ${fmt(e.amount)} G를 받았습니다.`);continue;}
    if(e.type==="bossChest"){modal.close();sounds.play("loot-rare");playBossChestReveal(()=>{open("보스 장비 획득",`${gearMarkup(e.item,"big-item")}<h3>${esc(D.gearName(e.item))}</h3><p>Lv.${e.item.level} · ${e.stored?"장비 보관함":"가방"}에 지급됐어요.</p>${btn("확인","close","","gold")}`);});continue;}
    if(e.type==="petSummon"){const show=()=>{open("달빛 소환 결과",petResult(e)+btn("보유 펫 보기","petBag","","gold")+btn("확인","close"));modal.classList.add("summon-result-dialog");};if(e.rewards.some(r=>r.key==="pet")){sounds.play("loot-rare");playLumiReveal(show);}else playSummonReveal(e,show);continue;}
    if(e.type==="adminTransfer"){modal.close();toast(`${e.recipientName}님에게 ${ADMIN_TRANSFER_NAMES()[e.resource]||e.resource} ${fmt(e.amount)} 송금 완료`);continue;}
    sounds.event(e);
    if(e.type==="systemMail"){
      const MAIL_NAMES={essence:"마력 정수",mapPiece:"고대 지도 조각",pearl:"심해 진주",ore:"원석",gold:"골드",tokens:"토큰",tribeTicket:"종족 주사위",companionTicket:"동료 소환권",pickupTicket:"픽업 소환권",fishDiamond:"낚시 다이아"};
      const text=Object.entries(e.rewards||{}).filter(([k])=>k!=="bossChest200").map(([k,n])=>(MAIL_NAMES[k]||D.MATERIALS[k]||k)+" "+fmt(n)+(k==="gold"?" G":["companionTicket","pickupTicket"].includes(k)?"장":"개")).join(" · ");
      if(e.items?.length){const it=e.items[0];modal.close();sounds.play("loot-rare");playBossChestReveal(()=>{open("우편 보상 수령",`<p>${esc(text)}</p>${gearMarkup(it.item,"big-item")}<h3>${esc(D.gearName(it.item))}</h3><p>Lv.${it.item.level} 보스 장비 · ${it.stored?"장비 보관함":"가방"}에 지급됐어요.</p>${btn("확인","close","","gold")}`);});}
      else toast(text+" 받았습니다.");
      continue;
    }
    if (e.type === "attendance") {
      open(`${e.day}일차 출석 완료`, `<p class="attendance-claimed">${attendanceReward(e.reward)}</p><p class="note">보상이 가방과 재화에 지급됐어요.${e.day===7?" 내일부터 다시 1일차 보상을 받을 수 있어요.":""}</p><div class="actions">${btn("확인","close","","gold")}</div>`);
      modal.classList.add("attendance-dialog");
      continue;
    }
    if(e.type==="classChange") {rankingRows=[];rankingUpdated=0;toast(D.CLASSES.find(c=>c.id===e.to).name+"으로 직업을 변경했어요. 새 장비를 장착하고 사냥을 시작하세요.");}
    if(e.type==="gearPreset")toast("장비 슬롯 "+(e.slot+1)+"번으로 전환했어요.");
    if(e.type==="autoEquip") {
      open("최적 장착 완료",`<div class="auto-equip-result"><span>${e.changed.length?e.changed.length+"개 부위 교체":"현재 장비 유지"}</span><div><b>${fmt(e.before)}</b><i>→</i><strong>${fmt(e.after)}</strong></div><p>전투력 +${fmt(e.after-e.before)}</p></div><p class="note">${e.changed.length?e.changed.map(slot=>D.SLOTS[slot]).join(" · ")+" 장비를 교체했습니다.":"이번 비교에서 더 높은 전투력 조합을 찾지 못해 현재 장비를 유지했습니다."}</p>`);
    }
    if(e.type==="daily"){
      const task=Object.values(D.DAILY_TASKS).find(t=>t.name===e.name);
      open("일일 과제 보상",'<h3>'+esc(e.name)+'</h3>'+(task?'<p>'+dailyRewardLines(task).join('<br>')+'<br>경험치 5%</p>':'<p>보상을 받았습니다.</p>')+btn("확인","close","","gold"));
    }
    if(e.type==="coop"){tab="boss";bossTab=e.mode==="citadel"?"citadel":e.mode==="raid"?(e.final?"final":"raid"):"exploration";view="game";render();reward();continue;}
    if(e.type==="exchangeGear")open(e.boss?"보스 장비 획득!":"장비 교환 완료",`${e.boss?'<p class="exchange-boss-hit">1% 확률 당첨 · 보스 장비</p>':''}${gearMarkup(e.item,"big-item")}<h3>${esc(D.gearName(e.item))}</h3><p>Lv.${e.item.level} · ${D.CLASSES.find(c=>c.id===e.item.classId).name} · ${D.SLOTS[e.item.slot]}</p><p>장비 파편 ${e.cost}개 사용 · ${e.stored?'보관함':'가방'}에 지급됐습니다.</p>${btn("확인","close","","gold")}`);
    if(e.type==="exchange")toast(D.MATERIALS[e.key]+" "+e.count+"개 교환 완료");
    if(e.type==="costumeBuy")toast("코스튬 구매 완료! 보유 효과로 공격력 +1%가 적용됐어요.");
    if(e.type==='skillLookBuy')toast('스킬 외형을 구매했어요. 장착하면 적용됩니다.');
    if(e.type==='skillLookEquip')toast('스킬 외형을 장착했어요.');
    if(e.type==='skillLookUnequip')toast('기본 스킬 외형으로 변경했어요.');
    if(e.type==="costumeEquip")toast("코스튬을 장착했어요.");
    if(e.type==="costumeUnequip")toast("기본 의상으로 변경했어요.");
    if(e.type==="shopSell")toast(`셀리아: 고마워! ${fmt(e.gold)} G를 지급했어.${e.mileage?` · 마일리지 +${fmt(e.mileage)}`:""}`);
    if(e.type==="mileageBuy")toast(`${e.name} ${fmt(e.quantity)}개 구매 · 남은 마일리지 ${fmt(e.mileage)}`);
    if(e.type=="salvage")open("장비 분해 완료",`<p>장비 ${e.count}개를 분해했습니다.</p><p class="salvage-reward"><strong>장비 파편 ${fmt(e.fragments)}개 획득</strong></p><p class="note">현재 보유 ${fmt(state.materials.fragment)}개</p>${btn("확인","close","","gold")}`);

    if(e.type==='advancementTrial'){tab='boss';bossTab='advancement';view='game';render();advancementResult(e);continue;}
    if(e.type==='tokenBoss'){tab='boss';bossTab='token';tokenPage='dungeon';view='game';render();tokenBossReward(e);continue;}
    if(e.type==='keyBoss'){tab='boss';bossTab='key';view='game';render();keyBossReward(e);continue;}
    if(e.type==='tribeRoll'||e.type==='tribeChoose')continue;
    if(e.type==='tokenShopBuy'&&e.id==='tribeTicket'){continue;}
    if(e.type==='tokenShopBuy'){toast(e.name+' '+e.quantity+'개 교환 완료 · 남은 토큰 '+fmt(e.tokens));continue;}
    if(e.type==='tower'){tab='boss';bossTab='tower';view='game';render();towerReward(e);continue;}
    if (e.type === "combat") continue;
    if (e.type === "skill") {
      const arena = $(".arena");
      const look=equippedSkillLook(state);
      if(arena&&!settings.low)fadeSkillOverlay(arena,e.slot);
      if(look&&arena&&!settings.low){playSkillLookOverlay(arena,look,e.slot);continue;}
      if(state.classId==='priest'&&arena&&!settings.low){playHolyOverlay(arena,e.slot);continue;}
      if(e.slot===5&&arena&&!settings.low){void playFifthOverlay(arena,state.classId);continue;}
      if(e.slot===2&&arena&&!settings.low){playSecondOverlay(arena,state.classId);continue;}
      if (arena && !settings.low) {
        const flash = document.createElement("div");
        flash.className = "skill-burst " + state.classId+(e.slot===4?" fourth-burst":e.slot===3?" third-burst":e.slot===1?" second-burst":"");if(e.slot===1)flash.style.setProperty("--third-col",D.THIRD_SKILLS[state.classId].art);if(e.slot===3)flash.style.setProperty("--third-col",D.THIRD_SKILLS[state.classId].art);
        flash.textContent = (e.slot===5?D.FIFTH_SKILLS:e.slot===4?D.FOURTH_SKILLS:e.slot===3?D.THIRD_SKILLS:e.slot===2?D.SECOND_SKILLS:D.CLASS_SKILLS)[state.classId].name;
        arena.append(flash);
        setTimeout(()=>flash.remove(), e.slot===4?6000:e.slot===1?1200:900);
      }
    }
    if (e.type === "transcend") {
      lastStarResult=null;itemDetail(e.id,"star");if(e.success===false)toast(`초월 실패 · 초월석 ${e.cost}개 소모${e.fails>=D.TRANSCEND_PITY?" · 다음 초월은 확정 성공!":` (연속 ${e.fails}회)`}`);else transcendCelebrate(e);
    } else if (e.type === "star") {
      lastStarResult=e;
      itemDetail(e.id,"star");
    } else if(e.type === "advancement") {open("전직 완료",`<div class="advancement-reveal"><h2>${D.ADVANCEMENTS[state.classId]}</h2><p>공격력 +10% · 최대 HP +10%</p></div>`);
    } else if (["boss", "dungeon", "party", "offline"].includes(e.type)) {
      if (e.type !== "offline" || e.seconds >= 300) reward();
    } else if (e.type === "refine") {
      if (state.pendingRefine) refineChoice();
      else itemDetail(e.id,"baseStats");
    } else if (e.type === "addCube") {
      lastUnlockResult=null;
      if (state.pendingAddCube) addCubeChoice();
      else itemDetail(e.id,"potential");
    } else if (e.type === "additionalUnlock") {
      lastUnlockResult={id:e.id,kind:"additional",success:e.success,chance:e.chance};
      itemDetail(e.id,"potential");
    } else if (e.type === "cube") {
      lastCubeResult=e;lastUnlockResult=null;
      if (state.pendingCube) cubeChoice();
      else itemDetail(e.id);
    } else if (["craft", "potential", "restore"].includes(e.type)) {
      if(e.type==="restore")lastStarResult=null;
      if(e.type==="potential"){lastCubeResult=null;lastUnlockResult={id:e.id,kind:"main",success:e.success!==false,chance:e.chance??1};itemDetail(e.id,"potential");continue;}
      itemDetail(e.id);
    }
  }
}
function advancementResult(r){const t=D.ADVANCEMENT_BOSSES.find(t=>t.stage===r.stage);open(r.practice?(r.won?'전직 보스 연습 성공':'전직 보스 연습 종료'):r.won?(r.stage+1)+'차 전직 완료':'전직 도전 종료','<div class="advancement-reveal"><h2>'+t.name+'</h2><p>'+(r.practice?'연습 전투입니다. 전직·능력치·보상은 추가로 지급되지 않습니다.':r.won&&r.stage>=5?advancementBonusText(r.stage)+' 획득':r.won?'공격력 +10% · 최대 HP +10% · '+(r.stage===4?D.FIFTH_SKILLS[state.classId].name:r.stage===3?D.FOURTH_SKILLS[state.classId].name:r.stage===2?D.THIRD_SKILLS[state.classId].name:r.stage===1?D.SECOND_SKILLS[state.classId].name:D.CLASS_SKILLS[state.classId].name)+' 해금':'아직 시련을 넘지 못했습니다. 장비를 강화하고 다시 도전하세요.')+'</p></div>'+btn('확인','towerAck','','gold',true));}
// 6·7차 전직 보너스 문구 (advancement.mjs ADVANCEMENT_STAT_BONUS 기준).
function advancementBonusText(stage){const b=D.ADVANCEMENT_STAT_BONUS[stage]||{},names={attack:'공격력',boss:'보스 피해',crit:'치명타 확률',hp:'최대 HP'};return Object.entries(b).map(([k,v])=>names[k]+' +'+v+(k==='crit'?'%p':'%')).join(' · ');}
function keyBossReward(r){if(r.won)sounds.play('loot-rare');open(r.won?`${r.stage}단계 처치! · 던전 열쇠 ${r.keys}개 획득`:'열쇠 던전 종료',keyBossResult(r)+'<div class="actions">'+btn('확인','ack','','gold',true)+'</div>',false);}
function tokenBossReward(r){open(r.won?r.stage+'단계 처치!':'토큰 던전 종료',tokenBossResult(r)+'<div class="actions">'+btn('확인','ack','','gold',true)+'</div>',false);}
function towerReward(r){const f=TOWER_FLOORS[r.floor-1];open(r.won?`${r.floor}층 돌파!`:'탑 도전 종료',`<div class="tower-result"><div class="tower-portrait${f.artFrames===1?' single-boss-art':''}" style="background-image:url('tower/boss-${f.art}.webp')"></div><h3>${f.name}</h3><p>${r.won?'클리어 '+r.seconds.toFixed(1)+'초':r.reason==='timeout'?'제한 시간이 끝났습니다.':r.reason==='leave'?'도전을 종료했습니다.':'쓰러졌습니다. 다시 도전할 수 있어요.'}</p><p>${r.gold?fmt(r.gold)+' G'+['fragment','cube','highCube','primeCube','scroll'].filter(k=>r[k]>0).map(k=>'<br>'+D.MATERIALS[k]+' '+fmt(r[k])+'개').join(''):r.won?'최초 보상을 이미 받은 층입니다. 반복 보상은 없습니다.':'입장 횟수 제한 없이 재도전할 수 있습니다.'}</p><p class="note">일반 사냥이 다시 시작됐습니다.</p><div class="actions">${btn('확인','towerAck','','gold',true)}${r.won&&r.floor<TOWER_FLOORS.length?btn('다음 층 도전','towerStart',r.floor+1,'',true):btn('다시 도전','towerStart',r.floor,'',true)}</div></div>`);}
function reward() {
  const r = state.lastReward;
  if(r?.type==='coop'&&r.mode==='exploration')return open(r.won?'링구의 탐험 완료':'탐험 종료','<p>'+esc(r.name||'링구의 탐험')+' · '+(r.cleared||0)+'층 완료</p><p>'+fmt(r.gold||0)+' G'+['scroll','highCube','potentialLock','addCube','bonusFlame'].filter(k=>r[k]>0).map(k=>'<br>'+D.MATERIALS[k]+' '+r[k]+'개').join('')+(r.companionTicket?'<br>동료 소환권 '+r.companionTicket+'장':'')+'</p>'+(r.items||[]).map(it=>'<div class="panel pad">'+gearMarkup(it)+'<strong>'+esc(D.gearName(it))+'</strong><p>Lv.'+it.level+' · '+D.SLOTS[it.slot]+'</p></div>').join('')+(r.stored?'<p class="note">가방이 가득 차 장비를 보관함으로 보냈습니다.</p>':'')+btn('확인','ack','','gold',true),false);
  if(r?.type==='coop'&&r.mode==='raid'&&r.final)return open('최종 보스 클리어!','<h3>'+esc(r.name)+'</h3><p>클리어 기록이 남았어요. 보상은 준비 중입니다.</p>'+btn('확인','ack','','gold',true));
  if(r?.type==='coop'&&r.mode==='raid'){
    const loot=r.practice?'이번 주 레이드 보상 3회를 모두 받았습니다. 이번 클리어는 연습으로 처리됩니다.':fmt(r.gold)+' G'+['cube','highCube','primeCube','fragment','scroll'].filter(k=>r[k]>0).map(k=>' · '+D.MATERIALS[k]+' '+r[k]+'개').join('');
    const remaining=Number.isInteger(r.weeklyUsed)?`이번 주 개인 보상 ${r.weeklyUsed}/${r.weeklyLimit}회 · 남은 보상 ${r.weeklyRemaining}회<br>`:'';
    return open(r.practice?'레이드 연습 완료':'레이드 보상 획득','<h3>'+esc(r.name)+'</h3><p>'+loot+'</p><p class="note">'+remaining+'모든 레이드 보스 합산 · 월요일 00시(한국 시간) 초기화</p>'+(r.items||[]).map(it=>'<p>'+esc(D.gearName(it))+' · Lv.'+it.level+'</p>').join('')+btn('확인','ack','','gold',true));
  }
  if(r?.type==='coop'&&r.mode==='wave')return open(r.ending?'200웨이브 엔딩 · 보상 지급 완료':'웨이브 종료 · 보상 지급 완료',waveRewardBody(r)+btn('확인','ack','','gold',true),false);
  if(r?.type==='coop')return open(r.won?'개인 상자 획득':'균열 도전 종료','<p>'+(r.won?fmt(r.gold)+' G'+['cube','highCube','primeCube','fragment','scroll'].filter(k=>r[k]>0).map(k=>' · '+D.MATERIALS[k]+' '+r[k]+'개').join(''):'장비를 정비하고 다시 도전해 보세요.')+'</p>'+(r.items||[]).map(it=>'<p>'+esc(D.gearName(it))+' · Lv.'+it.level+' · 잠재 3줄 잠금 (가방이 가득 차면 보관함)</p>').join('')+btn('확인','ack','','gold',true));
  if(r?.type==='advancementTrial')return advancementResult(r);
  if(r?.type==='tokenBoss')return tokenBossReward(r);
  if(r?.type==='keyBoss')return keyBossReward(r);
  if(r?.type==='tower')return towerReward(r);
  const enemy = r && (r.type === "dungeon" ? D.DUNGEONS[r.dungeon] : r.type === "boss" ? D.BOSSES[r.bossId] : null);
  if (!r) return toast("새로 정산된 보상이 없습니다.");
  if(r.type==="party") {const b=D.raidBoss(r.bossId)||D.BOSSES[r.bossId],total=(r.members||[]).reduce((n,m)=>n+Number(m.damage),0);return open(r.won?"협동 토벌 완료":"협동전 종료",`${bossMarkup(b,"big-item")}<h3>${b.name}</h3><p>${r.practice?"연습 · 보상 없음":r.rewarded?(r.raid?fmt(r.gold)+" G · 파편 "+r.fragment+" · 큐브 "+r.cube+" · 블랙 큐브 "+r.highCube:"지역 재료 "+r.materials+" · 큐브 3 · 블랙 큐브 1")+" · 장비 "+r.items.length:"보상 횟수 차감 없음"}</p>${r.stored?'<p>장비는 보관함에 지급됐습니다.</p>':""}<div class="stack">${(r.members||[]).map(m=>`<div class="row spread"><span>${esc(m.name)}</span><b>기여 ${total?(m.damage/total*100).toFixed(1):"0.0"}%</b></div>`).join("")}</div><p class="note">자동사냥이 다시 시작됐습니다.</p>${btn("확인","ack","","gold",true)}`);}

  open(
    enemy ? (r.won ? "토벌 완료" : "도전 종료") : r.adminSkip ? r.hours+"시간 사냥 보상" : "사냥 보상",
    enemy
      ? `${bossMarkup(enemy,"big-item")}<h3>${enemy.name}</h3><p class="note">${r.practice ? "연습 도전 · 보상 없음" : r.won ? r.type === "dungeon" ? enemy.reward : "장비 " + r.items.length + "개 · "+fmt(r.gold||0)+" G · 큐브 "+(r.cube||0)+["highCube","addCube","potentialLock"].filter(k=>r[k]>0).map(k=>" · "+D.MATERIALS[k]+" "+r[k]).join("") : "보상 횟수는 차감되지 않았습니다."}</p><p class="note">자동사냥이 다시 시작됐습니다.</p><div class="actions">${btn("확인", "ack", "", "gold", true)}</div>`
      : `<p>정산 시간 ${fmt(r.seconds / 60)}분 · ${fmt(r.kills)}마리</p><div class="metrics" style="margin-top:12px"><div><small>경험치</small><b>${fmt(r.xp)}</b></div><div><small>골드</small><b>${fmt(r.gold)}</b></div><div><small>장비</small><b>${r.drops.length}개</b></div></div><p class="note">파편 ${r.fragment} · 큐브 ${r.cube}<br>${r.stored ? "가방 초과 장비 " + r.stored + "개는 장비 탭 보관함에 보관되었습니다." : ""}${r.defeats ? " 패배 " + r.defeats + "회 · 하위 사냥터에서 성장하세요." : ""}</p><div class="actions">${btn("보상 확인", "ack", "", "gold", true)}</div>`,
  );
}
function clearAccountView() {
  activeCoopInput?.abort();
  if(coopController){coopController.dispose();coopController=null;}
  coopRoom=null;coopRooms=[];
  resetNewsNotifications();newsPollAt=0;
  closeWarriorLab();
  lottoData=null;lottoLoadedAt=0;clearLotto();investmentData=null;investmentLoadedAt=0;resetInvestment();
  clearDisclosureState();
  if(towerController){towerController.dispose();towerController=null;}document.body.classList.remove('tower-mode');
  state=null;stateRevision=null;partyRoom=null;partyRooms=[];rankingRows=[];rankingUpdated=0;rankingRequest++;rankingLoading=false;rankingError="";
  marketKind="all";marketRows=[];marketRequest++;marketPage=0;mine=false;buyOrderMode=false;buyOrders=null;buyOrderRequest++;selected=null;view="game";tab="hunt";sub="bag";
  chosenClass="warrior";characterName="";combatFrames.length=0;connectionLost=false;retryAt=0;retryFailures=0;lastHuntSettlement=0;
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
  stopFishing();
  closeWarriorLab();
  document.body.classList.remove("pet-event-mode","tower-mode","fishing-mode");
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
  app.innerHTML = `<div class="login panel" style="max-width:650px"><p class="eyebrow">CHOOSE YOUR PATH</p><p class="note">접속 계정: ${esc(session?.user?.email?.split("@")[0]||session?.user?.user_metadata?.username||"현재 계정")}</p><h2>어떤 모험가가 될까요?</h2><p class="note">직업에 맞는 주스탯과 장비를 성장시키세요.</p><div class="class-choice">${D.CLASSES.map((c, i) => btn(`<div class="portrait ${c.id==='priest'?'priest-portrait':''}" style="background-position:${portraitPosition(c.id)}% 0"></div>${c.name}<br><small>${c.stat}</small>`, "chooseClass", c.id, c.id === chosenClass ? "selected" : "")).join("")}</div><p class="note">선택: ${D.CLASSES.find((c) => c.id === chosenClass).name} · 첫 무기와 잠재 주문서를 지급합니다.</p><label>캐릭터 이름<input id="char-name" maxlength="12" placeholder="한글·영문·숫자 2~12자"></label><div class="actions">${btn("모험 시작", "create", "", "gold", true)}${btn("다른 계정 만들기 · 로그인", "switchAccount")}</div></div>`;
}
let betaResource="gold",betaAmount=1000;
function betaTools(){
  if(!state?.isAdmin)return;
  const blocked=!!state.battle||!!state.partyRoom||!!state.coopRoom;
  open("관리자 · 도현1",`<p class="note">랭킹 제외 · 던전 무한 입장 · 골드와 모든 재화·소비템 각각 999,999,999,999</p><section class="panel pad"><h3>레벨 조정 · Lv.${state.level}</h3><input id="beta-level" aria-label="원하는 레벨" type="number" inputmode="numeric" min="1" max="400" step="1" value="${state.level}"><p class="note">1~250레벨. 스탯 포인트를 다시 분배하고, 착용 레벨에 맞지 않는 장비는 해제합니다. 낮춘 레벨에 맞춰 전직도 해제됩니다.</p>${disabledBtn("레벨 적용","betaLevel","",blocked||!!state.pendingCube,"gold")}</section><section class="panel pad"><h3>사냥 시간 건너뛰기</h3><p class="note">현재 사냥터·장비로 선택한 시간만큼 사냥합니다. 경험치와 무작위 드롭을 실제로 지급합니다. 너무 강한 사냥터에서는 처치하지 못할 수 있습니다.</p><div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">${Array.from({length:12},(_,i)=>disabledBtn((i+1)+"시간","adminSkip",i+1,blocked)).join("")}</div></section>${blocked?'<p class="note">전투·파티 종료 후 사용할 수 있습니다.</p>':""}`);
}
function settingsDialog() {
  open(
    "설정",
    `<div class="stack"><label>효과음 <input id="sound" type="range" min="0" max="1" step=".05" value="${settings.sound}"></label><label>배경음 <input id="music" type="range" min="0" max="1" step=".05" value="${settings.music}"></label><fieldset class="skill-alpha-settings"><legend>스킬 투명도 <small>(낮을수록 투명 · 내 캐릭터가 잘 보여요)</small></legend>${getSkillAlpha().map((v,i)=>`<label>${i+1}차 스킬 <input id="skillAlpha${i+1}" type="range" min=".1" max="1" step=".05" value="${v}"><b>${Math.round(v*100)}%</b></label>`).join('')}</fieldset><label><input id="low" type="checkbox" ${settings.low ? "checked" : ""} style="width:auto;min-height:0"> 저사양 · 모션 감소</label><p class="note">자동사냥·오프라인은 서버에서 정산합니다. 소리와 모션은 이 기기에 저장됩니다.</p>${btn("저장", "saveSettings", "", "gold")}${btn("로그아웃", "logout", "", "danger")}</div>`,
  );
}
let marketSellId=null,marketSellSlot="",marketSellClass="",marketSellPrice="10000";
function marketItemBlock(it) {
  if(!it)return "판매할 장비를 선택해 주세요.";
  if(it.bound)return "거래 불가";
  if(it.broken)return "파괴된 장비";
  if(it.locked)return "잠금 중";
  if(Object.values(state.equipped).includes(it.id))return "장착 중";
  if(state.pendingCube?.id===it.id||state.pendingAddCube?.id===it.id||state.pendingRefine?.id===it.id)return "큐브 선택 중";
  return "";
}
function marketSellBlock(it) {
  return marketItemBlock(it)||(state.level<5?"거래소는 Lv.5부터 이용할 수 있습니다.":state.battle||state.partyRoom?"전투·파티를 종료한 뒤 등록할 수 있습니다.":"");
}
function updateSellPrice() {
  const input=$("#sell-price");if(!input)return;
  marketSellPrice=input.value;
  const price=Number(marketSellPrice),valid=Number.isSafeInteger(price)&&price>=100&&price<=1e10;
  $("#sell-net").textContent=valid?fmt(price)+" G":"—";
  const it=state.items.find(it=>it.id===marketSellId),reason=marketSellBlock(it)||(!valid?"100~10,000,000,000 G 범위의 정수를 입력해 주세요.":"");
  $("#sell-reason").innerHTML=esc(reason||"선택한 장비 1개를 등록합니다. 판매 수수료는 5%입니다.").replace("Lv.20",requiredLevel(20));
  const button=modal.querySelector('[data-action="sellConfirm"]');button.disabled=!!reason;button.toggleAttribute("data-unavailable",!!reason);
}
// Market materials: regular materials plus 다이아 (fishing record), 동료 소환권 (companions), 보물찾기 티켓 (treasure).
const MARKET_EXTRA={fishToken:'낚시 토큰',luckPotion:'행운 물약',tribeTicket:'종족 주사위',diamond:'다이아',companionTicket:'동료 소환권',pickupTicket:'픽업 소환권',treasureTicket:'보물찾기 티켓'};
// 2026-11-04 전문 직업: 거래 가능 소모품 확장
const MARKET_KEYS=['fishToken','primeCube','cube','highCube','fragment','scroll','potentialLock','dungeonKey','diamond','companionTicket','treasureTicket','addCube','transcendStone','bonusFlame','pickupTicket','essence','mapPiece','pearl','ore','rerollStone','ringuHair','luckPotion','tribeTicket'];
const MARKET_MATERIALS=()=>Object.fromEntries(MARKET_KEYS.map(k=>[k,MARKET_EXTRA[k]||D.MATERIALS[k]||k]));
const marketHave=k=>cpKey(k)?cpSellable().filter(c=>c.c===cpKey(k)).length:k==='fishToken'?(state.fishing?.tokens||0):k==='luckPotion'?(state.consumables?.luckPotion||0):k==='tribeTicket'?(state.tribeGacha?.tickets||0):k==='diamond'?(state.fishing?.diamonds||0):k==='companionTicket'?(state.companions?.tickets||0):k==='pickupTicket'?(state.companions?.pickupTickets||0):k==='treasureTicket'?(state.treasure?.tickets||0):(state.materials?.[k]||0);
const cpKey=k=>typeof k==='string'&&k.startsWith('companion:')?k.slice(10):null;
const materialName=k=>{const c=cpKey(k);if(c){const d=CP_BY_ID[c];return d?`${d.grade}급 ${d.name} 카드`:k;}return MARKET_EXTRA[k]||D.MATERIALS[k]||k;};
const cpPlaced=id=>(state.companions?.slots||[]).some(x=>x&&x.card===id);
const cpSellable=()=>(state.companions?.cards||[]).filter(c=>!cpPlaced(c.i)&&CP_BY_ID[c.c]);
function cpCardInfo(card){const d=CP_BY_ID[card.c];if(!d)return '';const p=cpPassive(card);return `${d.grade}급 ${esc(d.name)} ★${card.s} · 분당 ${fmt(cpMaxRate(card))} G · ${p.name} ${card.t==='jackpot'?card.v+'%':'+'+card.v+'%'}`;}
function cpCardMarkup(card){const d=CP_BY_ID[card.c];if(!d)return '';return `<div class="consumable-market-icon"><img src="companions/${d.id}-human-v1.webp" alt="" style="width:90%;height:90%;object-fit:contain"></div><div class="item-info"><strong>${d.grade}급 ${esc(d.name)} ★${card.s}</strong><p>${cpCardInfo(card)}</p></div>`;}
const marketMaterialIcon=(k,cls='')=>`<img${cls?` class="${cls}"`:''} src="${currencyIconURL(k)}" alt="">`;
function consumableSellDialog(key=null){
 if(!key){
  open("판매할 소모품 선택",`<p class="note">가방에서 판매할 소모품을 누르세요.</p><div class="market-compact-grid material-sell-grid" data-currency-label>${Object.entries(MARKET_MATERIALS()).map(([k,name])=>`<button class="market-compact-card" data-action="materialSellPick" data-arg="${k}" ${marketHave(k)>0?"":"disabled"}>${marketMaterialIcon(k,'material-tile-image')}<strong class="market-card-name">${name}</strong><small>보유 ${fmt(marketHave(k))}개</small><span class="market-card-status">${marketHave(k)>0?"선택":"보유 없음"}</span></button>`).join("")}</div>`);
  return;
 }
 if(!Object.hasOwn(MARKET_MATERIALS(),key)||!(marketHave(key)>0))return;
 open("소모품 판매 등록",`${btn("← 소모품 목록","marketSellConsumables")}<div class="material-picked" data-currency-label>${marketMaterialIcon(key)}<div><strong>${materialName(key)}</strong><p>보유 ${fmt(marketHave(key))}개</p></div></div><input id="material-sell-key" type="hidden" value="${key}"><label>등록 수량<input id="material-sell-count" type="number" inputmode="numeric" min="1" max="${Math.min(1e6,marketHave(key))}" step="1" value="1"></label><label>개당 가격 (G)<input id="material-sell-price" type="number" inputmode="numeric" min="1" max="10000000000" step="1" value="100"></label><p id="material-sale-total" class="note"></p><p class="note">필요한 수량만 판매합니다. 등록 7일 · 수수료 없음. 취소 시 남은 수량을 돌려받습니다.</p>${btn("소모품 등록","sellConsumableConfirm","","gold")}`);
 updateMaterialSale();
}
function updateMaterialSale(){const key=$('#material-sell-key')?.value;if(!key)return;const count=Number($('#material-sell-count').value),price=Number($('#material-sell-price').value),total=count*price,valid=Number.isSafeInteger(count)&&count>=1&&count<=Math.min(1e6,marketHave(key))&&Number.isSafeInteger(price)&&price>=1&&total<=1e10;$('#material-sale-total').textContent=valid?'전량 판매 시 총 '+fmt(total)+' G · 예상 수령 '+fmt(total)+' G':'보유 수량 안에서 정수로 입력하세요. 총 등록 금액은 100억 G 이하입니다.';modal.querySelector('[data-action=sellConsumableConfirm]').disabled=!valid;}
function updateMaterialBuy(){const input=$('#material-buy-count');if(!input)return;const listing=marketRows.find(l=>l.id===input.dataset.listing),count=Number(input.value),valid=listing&&Number.isSafeInteger(count)&&count>=1&&count<=listing.item.quantity;$('#material-buy-total').textContent=valid?'결제 금액 '+fmt(count*listing.price)+' G':'남은 수량 안에서 정수로 입력하세요.';modal.querySelector('[data-action=buyListing]').disabled=!valid||count*listing.price>state.gold;}
// 2026-11-06 도현: 동료 카드 거래소 판매 — 배치 중이 아닌 카드만.
function companionSellDialog(pick=null){
  const cards=cpSellable().sort((a,b)=>'SS,S,A,B,C,D,F'.split(',').indexOf(CP_BY_ID[a.c].grade)-'SS,S,A,B,C,D,F'.split(',').indexOf(CP_BY_ID[b.c].grade)||b.s-a.s||cpMaxRate(b)-cpMaxRate(a));
  const card=cards.find(c=>c.i===pick);
  if(!card)return open("판매할 동료 카드",`<p class="note">배치 중이 아닌 카드만 올릴 수 있어요. 팔리면 골드는 우편으로 와요.</p><div class="market-compact-grid material-sell-grid">${cards.map(c=>{const d=CP_BY_ID[c.c];return `<button class="market-compact-card" data-action="marketSellCompanionPick" data-arg="${c.i}"><span class="market-card-meta">${d.grade}급<b>★${c.s}</b></span><img class="material-tile-image" src="companions/${d.id}-human-v1.webp" alt=""><strong>${esc(d.name)}</strong><small>분당 ${fmt(cpMaxRate(c))} G</small></button>`;}).join('')||'<div class="empty">팔 수 있는 동료 카드가 없어요.</div>'}</div>`);
  open("동료 카드 판매 등록",`${btn("← 카드 목록","marketSellCompanion")}<div class="item">${cpCardMarkup(card)}</div><label>판매 가격 (G)<input id="cp-sell-price" type="number" inputmode="numeric" min="100" max="10000000000" step="1" value="${Math.max(100,COMPANION_SELL_HINT[CP_BY_ID[card.c].grade]||10000)}"></label><p class="note">등록하면 카드가 가방에서 빠지고, 회수하면 돌아와요.</p>${btn("거래소에 올리기","sellCompanionConfirm",card.i,"primary")}`);
}
const COMPANION_SELL_HINT={SS:30000000,S:10000000,A:3000000,B:1000000,C:300000,D:100000,F:30000};
function marketSellPicker() {
  const scroll=modal.querySelector('.market-inventory-grid')?.scrollTop||0;
  const items=state.items.filter(it=>(marketSellSlot===""||it.slot===Number(marketSellSlot))&&(marketSellClass===""||D.canEquipClass(it,marketSellClass))).sort((a,b)=>Number(!!marketItemBlock(a))-Number(!!marketItemBlock(b))||b.stars-a.stars||b.level-a.level);
  const it=state.items.find(it=>it.id===marketSellId),cl=it&&D.CLASSES.find(c=>c.id===(D.isCommonBossGear(it)?state.classId:it.classId)),growth=it?1+it.stars*.055+Math.max(0,it.stars-15)**1.4*.025:0;
  const stats=it?[["기본 공격력",D.gearAttributes(it,0).attack.toFixed(1)],["장비 공격력",D.gearAttributes(it).attack.toFixed(1)],[cl.stat,fmt(D.gearAttributes(it).stat)],["최대 HP",fmt(D.gearAttributes(it).hp)],["방어력",(D.gearAttributes(it).defense).toLocaleString("ko-KR")]]:[];
  const canCompare=it&&!it.broken&&D.canEquipClass(it,state.classId)&&it.level<=state.level;
  const before=power(state).combatPower,after=canCompare?power({...state,equipped:{...state.equipped,[it.slot]:it.id}}).combatPower:0;
  open("판매할 장비 선택",`<p class="market-picker-intro">가방에서 장비를 고르고, 능력치와 잠재 옵션을 확인하세요.</p><div class="market-picker-layout ${it?"show-detail":""}"><section class="market-picker-bag"><div class="market-picker-filters"><label>부위<select id="market-sell-slot"><option value="">모든 부위</option>${D.SLOTS.map((name,i)=>`<option value="${i}" ${String(i)===marketSellSlot?"selected":""}>${name}</option>`).join("")}</select></label><label>직업<select id="market-sell-class"><option value="">모든 직업</option>${D.CLASSES.map(c=>`<option value="${c.id}" ${c.id===marketSellClass?"selected":""}>${c.name}</option>`).join("")}</select></label></div><p class="market-bag-count">가방 ${state.items.length}/1000 · 표시 ${items.length}개 · 판매 가능 ${items.filter(it=>!marketItemBlock(it)).length}개</p><div class="market-inventory-grid" role="group" aria-label="판매 장비 인벤토리">${items.length?items.map(item=>{const reason=marketItemBlock(item);return `<button data-action="marketSellPick" data-arg="${item.id}" aria-pressed="${marketSellId===item.id}" class="market-inventory-item ${item.boss?"boss-gear":""} ${marketSellId===item.id?"picked":""} ${reason?"unavailable":""}"><span class="market-tile-meta">${requiredLevel(item.level)}<b>${item.stars}★</b></span>${gearMarkup(item)}<strong>${esc(D.gearName(item))}</strong><small>${reason||D.CLASSES.find(c=>c.id===item.classId).name+" · "+D.SLOTS[item.slot]}</small></button>`;}).join(""):'<div class="empty">조건에 맞는 장비가 없습니다.</div>'}</div><p class="note">장착·잠금·파괴·거래 불가·큐브 선택 중인 장비는 상세 확인만 가능합니다.</p></section><section class="market-sell-detail" aria-live="polite">${btn("← 장비 목록","marketSellBack")}${it?`<div class="market-picked-head">${gearMarkup(it,"big-item")}<div><small>선택한 장비</small><h3>${esc(D.gearName(it))}</h3><p>${requiredLevel(it.level)} · ${cl.name} · ${D.equipmentType(it)}</p><b>${it.stars}성 · ${it.boss?"보스 장비":"일반 장비"}</b></div></div><div class="market-picked-stats">${stats.map(([k,v])=>`<div><span>${k}</span><b>+${v}</b></div>`).join("")}</div><p class="note">스타포스가 반영된 장비 능력치입니다. 잠재 효과는 아래에 별도로 표시합니다.${it.broken?" 파괴된 장비는 현재 능력치가 적용되지 않습니다.":""}</p><div class="market-picked-options"><h4>잠재능력</h4>${it.lines.length?it.lines.map((line,i)=>`<div class="grade-color-${line.grade}"><small>${i+1}줄 · ${D.RARITIES[line.grade]}</small><span>${D.OPTIONS[line.key]}</span><b>+${line.value}${D.optionUnit(line.key)}</b></div>`).join(""):'<p class="note">잠재 미개방</p>'}</div>${additionalPanel(it)}${canCompare?`<p class="market-equip-compare">장착 시 내 전투력 <strong>${fmt(after)}</strong> <span>(${after-before>=0?"+":""}${fmt(after-before)})</span></p>`:""}`:'<div class="market-pick-empty"><span>◇</span><h3>판매할 장비를 선택하세요</h3><p>장비 이미지를 누르면 강화 수치와<br>줄별 잠재 옵션이 여기에 표시됩니다.</p></div>'}<div class="market-price-box"><label for="sell-price">판매 가격 <small>G</small></label><input id="sell-price" type="number" inputmode="numeric" min="100" max="10000000000" step="1" value="${esc(marketSellPrice)}"><div class="market-net"><span>판매 완료 시 수령액</span><strong id="sell-net">—</strong></div><p id="sell-reason" class="note"></p>${disabledBtn("선택 장비 등록","sellConfirm","",true,"gold market-register")}<p class="note">등록 기간 7일 · 판매 완료 시 수수료 없음</p></div></section></div>`);
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
  if(e.message==='INVALID_INVESTMENT_PRICE_CHANGED'){investmentData=null;investmentLoadedAt=0;}
    if (e.status === 400) localStorage.removeItem(key);
    throw e;
  } finally {
    busy = false;
  }
  await command("sync", {}, true);
  await marketLoad();
  modal.close();
  sounds.play("purchase-complete");
  toast(action==="buy"?"구매 완료 · 우편함에서 받아 주세요.":"거래가 완료되었습니다.");
}
// Percent buttons size the order by margin (gold × leverage); re-applied when leverage changes afterwards.
let investPercentPick=0;
function applyInvestPercent(){const price=investmentData?.coins[selectedCoin]?.price||10000;let q=Math.floor(state.gold*investPercentPick/100*investmentLeverage/price);while(q>0&&investmentMargin(q,price)>state.gold)q--;setInvestmentAmount(q);}
document.addEventListener('input',e=>{if(e.target.id==='invest-percent'){investPercentPick=Number(e.target.value)||0;setInvestmentPercent(investPercentPick);applyInvestPercent();const out=document.querySelector('#invest-percent-value');if(out)out.textContent=investPercentPick+'%';const amt=document.querySelector('#invest-amount');if(amt)amt.value=investmentAmount;const help=document.querySelector('.invest-help');if(help&&investmentData)help.textContent=investmentOrderHelp(investmentData.coins[selectedCoin].price);return;}if(e.target.id==='invest-amount'){investPercentPick=0;setInvestmentPercent(0);const out=document.querySelector('#invest-percent-value'),rng=document.querySelector('#invest-percent');if(out)out.textContent='0%';if(rng)rng.value=0;setInvestmentAmount(e.target.value);const help=document.querySelector('.invest-help');if(help&&investmentData)help.textContent=investmentOrderHelp(investmentData.coins[selectedCoin].price);}});
document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-action]");
  if (!b || b.disabled) return;
  const action = b.dataset.action,
    arg = b.dataset.arg;
  if(action==='rankingProfile')return showRankingProfile(arg);
  sounds.start();sounds.music();
  sounds.play(['close','back'].includes(action)?'ui-back':['tab','bossTab','bagPage','shopCategory'].includes(action)?'ui-tab':'ui-click');
  if(action.startsWith('companion')){try{await companionAction(action,arg,{state:()=>state,command:(c,a)=>companionCommandRequest(c,a),open:(t,h,c=true,cls)=>{open(t,h,c);if(cls)modal.classList.add(cls);},close:()=>modal.close(),toast,render});}catch(error){toast(message(error));}return;}
  if(action==='star')sounds.play('enhance-charge');
  try {
    if(action==='arenaOpen'){modal.close();view='arena';arenaPage='home';if(arenaPlayback){arenaPlayback.stop();arenaPlayback=null;}render();await loadArena();return;}
    if(action==='arenaRetry'){await loadArena();return;}
    if(action==='arenaPage'){if(arenaPlayback){arenaPlayback.stop();arenaPlayback=null;}arenaPage=['home','opponents','ranking','rewards','history'].includes(arg)?arg:'home';view='arena';render();if(!arenaData||Date.now()>=new Date(arenaData.nextRefreshAt).getTime())await loadArena();return;}
    if(action==='arenaChallenge'){if(busy||!arenaData?.offers?.some(o=>o.id===arg&&!o.used))return;b.disabled=true;b.textContent='전투 준비 중…';try{await command('arenaFight',{opponentId:arg});}catch(e){b.disabled=false;b.textContent='도전';if(['ARENA_OFFERS_EXPIRED','ARENA_OPPONENT_UNAVAILABLE'].includes(e.message))await loadArena();}return;}
    if(action==='arenaSkip'){arenaPlayback?.skip();return;}
    if(action==='arenaSpeed'){const speed=arenaPlayback?.speed();b.textContent=speed===2?'1배속':'2배속';return;}
    if(dungeonExitActions.has(action)){b.disabled=true;modal.close();return await exitDungeon(action);}
    if(action==="bagPage"){bagPage=Math.max(0,Number(arg)||0);render();return;}
    if(action==='adminCoinDirection'){if(!state.isAdmin||b.disabled)return;const [coin,side]=arg.split(':');b.disabled=true;try{await ensureToken();const result=await request('/rest/v1/rpc/rebirth_admin_coin_direction',{p_coin:Number(coin),p_side:side});toast(`${result.name} · ${new Date(result.scheduledAt).toLocaleTimeString('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit'})} 봉 ${side==='long'?'상승':'하락'} 1회 지정`);}finally{b.disabled=false;}return;}
    if(action==='adminInventory'){if(!state?.isAdmin)return;return showAdminInventory({open,modal,allowed:()=>!!session&&state?.isAdmin===true,art:gearMarkup,fetchData:async id=>{await ensureToken();return request('/rest/v1/rpc/rebirth_admin_inventory',{p_user:id});}});}
    if(action==='adminPositions'){if(!state.isAdmin&&!state.isTester)return;return await showAdminPositions({open,modal,allowed:()=>!!session&&(state?.isAdmin===true||state?.isTester===true),fetchData:async()=>{await ensureToken();return request('/rest/v1/rpc/rebirth_admin_positions',{});}});}
    if(action==='investCopy'){b.disabled=true;try{await openCopyTrading();}finally{b.disabled=false;}return;}
    if(action==='investCopyClaim'){if(busy)return;b.disabled=true;try{await copyTradingClaim();}finally{if(b.isConnected)b.disabled=false;}return;}
    if(action==='investCopyDisband'){copyTradingDisbandAsk();return;}
    if(action==='investCopyDisbandConfirm'){
      if(copyDisbandPending)return;
      const account=session?.user?.id;
      copyDisbandPending=true;b.disabled=true;b.textContent='처리 중…';
      try{
        // Background settlement must not silently discard a confirmed action.
        while(busy)await new Promise(resolve=>commandIdleWaiters.push(resolve));
        if(!account||session?.user?.id!==account||!b.isConnected)return;
        await copyTradingDisband();
      }finally{
        copyDisbandPending=false;
        if(b.isConnected){b.disabled=false;b.textContent='확인';}
      }
      return;
    }
    if(action==='investCopyWalletMax'){const input=modal.querySelector('#copy-wallet-amount'),w=modal.querySelector('.invest-copy-wallet-head b');if(input)input.value=fmt(arg==='deposit'?Math.floor(state?.gold||0):Number(String(w?.textContent||'').replace(/[^0-9]/g,'')));return;}
    if(action==='investCopyWalletForce'){if(busy)return;b.disabled=true;try{await copyTradingWallet('withdraw',Number(arg));}finally{if(b.isConnected)b.disabled=false;}return;}
    if(action==='investCopyWallet'){if(busy)return;b.disabled=true;try{await copyTradingWallet(arg);}finally{if(b.isConnected)b.disabled=false;}return;}
    if(action==='investCopyIntro'){if(busy)return;b.disabled=true;try{await copyTradingIntro();}finally{if(b.isConnected)b.disabled=false;}return;}
    if(action==='investCopyMin'){if(busy)return;b.disabled=true;try{await copyTradingMin();}finally{if(b.isConnected)b.disabled=false;}return;}
    // 2026-11-06 도현: 카피 종료는 확인/취소 창을 먼저 띄운다.
    if(action==='investCopyStop'){open('카피 종료',`<div class="stack"><p>카피 트레이딩을 <b>종료</b>하시겠습니까?</p><p class="note">카피 계좌에 남은 잔액은 보유 골드로 돌아가요.</p><div class="actions">${btn('확인','investCopyStopConfirm','','gold',true)}${btn('취소','investCopyStopCancel')}</div></div>`);return;}
    if(action==='investCopyStopCancel'){b.disabled=true;try{await openCopyTrading();}catch{modal.close();}finally{if(b.isConnected)b.disabled=false;}return;}
    if(action==='investCopyStart'||action==='investCopyStopConfirm'){if(busy)return;b.disabled=true;try{await copyTradingAction(action==='investCopyStart'?'start':'stop',arg);if(action==='investCopyStopConfirm'&&modal.open&&!modal.querySelector('.invest-copy-feed'))await openCopyTrading();}finally{if(b.isConnected)b.disabled=false;}return;}
    if(action==='investRankings'){b.disabled=true;try{await openCoinRankings();}finally{b.disabled=false;}return;}
    if(action==='investNews'||action==='investHistory'){b.disabled=true;try{await openCoinActivity(action==='investNews'?'news':'trades');}finally{b.disabled=false;}return;}
    if(action==='investCoin'){selectCoin(arg);if(investPercentPick)applyInvestPercent();return render();}
    if(action==='investLeverage'){setInvestmentAmount(document.querySelector('#invest-amount')?.value||investmentAmount);setInvestmentLeverage(arg);if(investPercentPick)applyInvestPercent();return render();}
    if(action==='investPercent'){investPercentPick=Number(arg);setInvestmentPercent(arg);applyInvestPercent();return render();}
    if(action==='investBuy'){if(busy||!investmentData)return;setInvestmentAmount(document.querySelector('#invest-amount')?.value||'');const quantity=Number(investmentAmount);if(!Number.isSafeInteger(quantity)||quantity<1||investmentMargin(quantity,investmentData.coins[selectedCoin].price)>state.gold)return toast('증거금이 보유 골드를 넘어요. 수량을 줄여 주세요.');return await command('investBuy',{coin:selectedCoin,side:arg==='short'?'short':'long',quantity,leverage:investmentLeverage,price:investmentData.coins[selectedCoin].price,tickAt:investmentData.coins[selectedCoin].tickAt});}
    if(action==='investSell'){if(busy||!investmentData)return;const pos=investmentData.positions.find(p=>p.id===arg);if(!pos)return;return await command('investSell',{position:arg,price:investmentData.coins[pos.coin].price,tickAt:investmentData.coins[pos.coin].tickAt});}
    if(action==='investSellHalf'){if(busy||!investmentData)return;const pos=investmentData.positions.find(p=>p.id===arg);if(!pos)return;if(Number(pos.quantity)<2)return toast('수량이 2개 이상이어야 절반 판매할 수 있어요.');return await command('investSell',{position:arg,portion:'half',price:investmentData.coins[pos.coin].price,tickAt:investmentData.coins[pos.coin].tickAt});}
    if(action==='treasureStart'||action==='treasureCash'){if(busy)return;const result=await command(action,{});const e=result?.result?.events?.find(x=>x.type==='treasureCash');if(e){const gear=e.got?.bossGear;toast((e.cleared?'전부 찾았어요! ':'')+'보상 획득'+(gear?' · 보스장비 상자 '+gear+'개':''));}return;}
    if(action==='treasureDig'){if(busy)return;const result=await command('treasureDig',{cell:Number(arg)});const e=result?.result?.events?.[0];if(e?.type==='treasureBoom')toast('💥 지뢰! 모은 보상을 잃었어요.');else if(e?.type==='treasureCash')toast('🎉 안전한 칸을 전부 찾아서 보상을 받았어요!');return;}
    if(action==='eventPage'){eventPage=arg==='lotto'?'lotto':arg==='treasure'?'treasure':'fishing';tab='event';view='game';render();if(arg==='lotto')await command('lottoList',{},true);return;}
    if(action==='fishSheetClose'){fishingUI.sheet=null;render();return;}
    if(action==='fishCatchClose'){fishingUI.seenCatch=state.fishing?.lastCatch?.at;render();return;}
    if(action==='fishCatchTank'){fishingUI.seenCatch=state.fishing?.lastCatch?.at;return await fishingCommandRequest('fishAquariumAdd',{id:arg});}
    if(action==='fishPanel'){if(fishingUI.sheet===arg&&!b.closest('.fishing-sheet')){fishingUI.sheet=null;render();return;}fishingUI.sheet=arg;if(arg!=='map')fishingUI.panel=arg;render();if(arg==='contest')await command('fishContestList',{},true);if(arg==='records')await command('fishRecordList',{},true);if(arg==='boss')await command('fishBossStatus',{},true);return;}
    if(action==='fishSkinEquip')return await fishingCommandRequest('fishSkinEquip',{skin:arg});
    if(action==='fishRecordTab'){fishingUI.recordTab=arg;render();return;}
    if(action==='fishBossClaim'){const done=await fishingCommandRequest('fishBossClaim',{id:arg});await command('fishBossStatus',{},true);return done;}
    if(action==='fishExchange'){const [item,count]=String(arg).split(':');return await fishingCommandRequest('fishExchange',{item,count:Number(count)});}
    if(action==='fishContestClaim'){const done=await fishingCommandRequest('fishContestClaim',{week:arg});await command('fishContestList',{},true);return done;}
    if(action==='fishCollectionSpot'){fishingUI.collectionSpot=arg;render();return;}
    if(action==='fishSpot'){const spot=SPOTS.find(x=>x.id===arg);if(!spot)return;if((state.fishing?.rod||1)<spot.level)return toast(spot.level+'단계 낚싯대부터 입장할 수 있어요. 낚싯대 메뉴에서 구매해 주세요.');fishingUI.spot=arg;fishingUI.sheet=null;render();return;}
    if(action==='fishAuto'){if(fishingUI.auto){stopAutoFishing();return;}if(!((state.fishing?.autoCasts||0)>0)){fishingUI.panel='shop';fishingUI.sheet='shop';render();return toast('🤖 자동 낚시권이 있어야 오토 낚시를 할 수 있어요. 상점에서 구매해 주세요.');}fishingUI.notify=toast;fishingUI.auto=true;render();if(!state.fishing?.cast)scheduleAutoFishing(0);return;}
    if(action==='fishCancel'&&fishingUI.auto)stopAutoFishing();
    if(action==='fishCast'){fishingUI.sheet=null;fishingUI.seenCatch=state.fishing?.lastCatch?.at;fishingUI.bait=document.querySelector('#fishing-bait')?.value||fishingUI.bait;return await fishingCommandRequest('fishCast',{spot:fishingUI.spot,bait:fishingUI.bait,protocol:FISH_PROTOCOL});}
    // v3 낚시: 강화·인챈트·합성·각성
    if(action==='fishRodBuy')return await fishingCommandRequest('fishRodBuy',{tier:Number(arg)});
    if(action==='fishRodSelect'){if(!state?.isAdmin&&!state?.isTester)return;return await fishingCommandRequest('fishRodSelect',{tier:Number(arg)});}
    if(action==='fishAutoBuy')return await fishingCommandRequest('fishAutoBuy',{plan:arg});
    if(action==='fishEnchantLock'){const i=Number(arg),l=new Set(fishingUI.locks||[]);l.has(i)?l.delete(i):l.add(i);fishingUI.locks=[...l];return render();}
    if(action==='fishEnchantChoose')return await fishingCommandRequest('fishEnchantChoose',{pick:arg==='new'?'new':'old'});
    if(action==='fishEnchant'){const rod=state.fishing?.rod||1,slots=rod>=12?3:rod>=6?2:1;return await fishingCommandRequest('fishEnchant',{locks:(fishingUI.locks||[]).filter(i=>i<slots&&state.fishing?.enchants?.[i])});}
    if(action==='fishFuse'){const [sp,size]=String(arg).split(':'),sizeOf=x=>x.size||'normal';const list=(state.fishing?.fish||[]).filter(x=>x.species===sp&&sizeOf(x)===size).sort((a,b)=>(a.mut?1:0)-(b.mut?1:0)||a.weight-b.weight).slice(0,3);if(list.length<3)return;return await fishingCommandRequest('fishFuse',{ids:list.map(x=>x.id)});}
    if(action==='fishGoldFuse'){const golds=(state.fishing?.fish||[]).filter(x=>x.mut==='gold');const rank=x=>D_FISH_RARITY(x.species);const best=golds.slice().sort((a,b)=>rank(b)-rank(a))[0];const rest=golds.filter(x=>x!==best).sort((a,b)=>rank(a)-rank(b)).slice(0,4);if(!best||rest.length<4)return;return await fishingCommandRequest('fishGoldFuse',{ids:[best.id,...rest.map(x=>x.id)]});}
    if(action==='fishAwaken')return await fishingCommandRequest('fishAwaken',{id:arg});
    if(action==='fishBaitBuy'){const [id,mul]=String(arg).split(':'),b=BAITS.find(x=>x.id===id);return await fishingCommandRequest(action,{bait:id,count:(b?.pack||10)*(Number(mul)||1),currency:b?.gold?'gold':'tokens'});}
    if(action==='fishTrain')return await fishingCommandRequest(action,{gold:Number(arg)});
    if(action==='fishSell')return await fishingCommandRequest(action,{ids:[arg]});
    if(action==='fishSellAll'){if(!state.fishing?.fish.length)return;open('물고기 전부 판매',`<p>가방의 물고기 ${state.fishing.fish.length}마리를 모두 판매할까요?</p><p class="note">수족관에 있는 물고기는 포함되지 않아요.</p>${btn('전부 판매','fishSellAllConfirm','','gold')}`);return;}
    if(action==='fishSellAllConfirm'){modal.close();return await fishingCommandRequest('fishSell',{ids:state.fishing.fish.map(x=>x.id)});}
    if(['fishCancel','fishUpgrade','fishAquariumAdd','fishAquariumRemove','fishAquariumClaim','fishAquariumExpand','fishQuestClaim','fishAquariumAuto'].includes(action))return await fishingCommandRequest(action,{id:arg});
    if(action==='lottoNumber'){const n=Number(arg);if(!lottoSelection.includes(n)&&lottoSelection.length===2)toast('번호는 2개만 선택할 수 있어요.');selectLottoNumber(n);return render();}
    if(action==='lottoAuto'){autoLotto(lottoData);return render();}
    if(action==='lottoPanel'){setLottoPanel(arg);render();if(Date.now()-lottoLoadedAt>10000)await command('lottoList',{},true);return;}
    if(action==='shopCategory'){shopCategory=['boss','costume','skilllook','consumable','mileage','blackmarket'].includes(arg)?arg:'boss';return render();}
    if(action==='mileageBuy'){if(busy)return;const [id,q]=String(arg).split(':');await command('mileageBuy',{id,quantity:Number(q)||1});return;}
    if(action==='skillLookClass'){skillLookClass=arg;return render();}
    if(action==='skillLookTier'){
      const [id,tier]=arg.split(':'),c=skillLookById(id),canvas=modal.querySelector('[data-skill-look-preview]');if(!c||!canvas)return;
      stopSkillLookPreview?.();stopSkillLookPreview=playSkillLookPreview(canvas,c,{slot:Number(tier),cycle:false});
      modal.querySelectorAll('[data-action="skillLookTier"]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.arg===arg)));return;
    }
    if(action==='skillLookPreview'){
      const c=skillLookById(arg);if(!c)return;
      open('스킬 외형 미리보기',skillLookPreviewView(c));
      stopSkillLookPreview=playSkillLookPreview(modal.querySelector('[data-skill-look-preview]'),c);return;
    }
    if(action==='skillLookBuyPick'){
      const c=skillLookById(arg);if(!c)return;
      open('스킬 외형 구매',skillLookPreviewView(c)+`<div class="shop-confirm-price">${goldPurchaseIcon()}20,000,000 G</div><p class="note">구매 후 해당 직업으로 장착할 수 있습니다. 데미지·범위·능력치는 바뀌지 않습니다.</p><div class="actions">${btn('취소','close')}<button data-action="skillLookBuyConfirm" data-arg="${c.id}" data-write ${state.gold<c.price?'disabled data-unavailable':''}>${state.gold<c.price?'골드 부족':'구매 확정'}</button></div>`);
      stopSkillLookPreview=playSkillLookPreview(modal.querySelector('[data-skill-look-preview]'),c);return;
    }
    if(action==='skillLookBuyConfirm'){if(busy)return;const result=await command('skillLookBuy',{id:arg});if(result?.result?.events?.some(e=>e.type==='skillLookBuy'&&e.id===arg)){stopSkillLookPreview?.();modal.close();}return;}
    if(action==='skillLookEquip'||action==='skillLookUnequip'){if(busy)return;return await command(action,{id:arg});}
    if(action==='blackMarketBuyPick'){
      const index=Number(arg),offer=blackMarketOffersFor(state,blackMarketRotation().id)[index];if(!offer)return render();
      open('암시장 · 구매 확인',blackMarketPurchaseView(state,D,gearMarkup,index));updateBlackMarketPurchase(state,modal);return;
    }
    if(action==='blackMarketBuyMax'){const input=modal.querySelector('#bm-buy-quantity');if(input){input.value=String(blackMarketLimit(state,blackMarketRotation().id,Number(arg)));updateBlackMarketPurchase(state,modal);}return;}
    if(action==='blackMarketBuyConfirm'){
      if(busy)return;const index=Number(arg),rotation=blackMarketRotation(),input=modal.querySelector('#bm-buy-quantity'),quantity=input?Number(input.value):1;
      if(!Number.isSafeInteger(quantity)||quantity<1||quantity>blackMarketLimit(state,rotation.id,index)){updateBlackMarketPurchase(state,modal);return;}
      const result=await command('blackMarketBuy',{rotation:rotation.id,index,quantity});
      const bought=result?.result?.events?.find(e=>e.type==='blackMarketBuy'&&e.index===index);
      if(bought){modal.close();toast('벨록: 거래 끝. '+(bought.item?D.gearName(bought.item):bought.name+' '+fmt(bought.quantity)+'개')+' 챙겨가.');}else render();return;
    }
    if(action==='consumableBuyPick'){
      const item=shopConsumable(arg);if(!item)return;
      open(item.name+' 구매',consumablePurchaseView(state,arg));updateConsumablePurchase(state,modal);return;
    }
    if(action==='consumableBuyMax'){const input=modal.querySelector('#shop-buy-quantity');if(input){input.value=String(shopPurchaseLimit(state,arg));updateConsumablePurchase(state,modal);}return;}
    if(action==='consumableBuyConfirm'){
      if(busy)return;const item=shopConsumable(arg);if(!item)return;
      const quantity=item.id===LUCK_POTION.id?1:Number(modal.querySelector('#shop-buy-quantity')?.value);
      if(!Number.isSafeInteger(quantity)||quantity<1||quantity>shopPurchaseLimit(state,arg)){updateConsumablePurchase(state,modal);return;}
      const result=await command('consumableBuy',{id:arg,quantity});
      const bought=result?.result?.events?.find(e=>e.type==='consumableBuy'&&e.id===arg);
      if(bought){modal.close();toast(item.name+' '+fmt(bought.quantity)+'개를 구매했어요.'+(bought.mileage?' · 마일리지 +'+fmt(bought.mileage):''));}return;
    }
    if(action==='consumableSellPick'){const item=shopConsumable(arg);if(!item||!SELL_PRICES[arg])return;open(item.name+' 판매',consumableSellView(state,arg));updateConsumableSale(state,modal);return;}
    if(action==='consumableSellMax'){const input=modal.querySelector('#shop-sell-quantity');if(input){input.value=String(shopSellLimit(state,arg));updateConsumableSale(state,modal);}return;}
    if(action==='consumableSellConfirm'){
      if(busy)return;const item=shopConsumable(arg);if(!item)return;
      const quantity=Number(modal.querySelector('#shop-sell-quantity')?.value);
      if(!Number.isSafeInteger(quantity)||quantity<1||quantity>shopSellLimit(state,arg)){updateConsumableSale(state,modal);return;}
      const result=await command('consumableSell',{id:arg,quantity});
      const sold=result?.result?.events?.find(e=>e.type==='consumableSell'&&e.id===arg);
      if(sold){modal.close();toast(item.name+' '+fmt(sold.quantity)+'개를 '+fmt(sold.gold)+' G에 판매했어요.'+(sold.mileage?' · 마일리지 +'+fmt(sold.mileage):''));}return;
    }
    if(action==='consumableUse'){if(busy)return;const result=await command('consumableUse',{id:arg});if(result)toast('행운 물약 시간 +5분 · 행운 +50% 효과가 유지됩니다.');return;}
    if(action==='costumeWardrobe'){open("내 코스튬",costumeWardrobe(state));return;}
    if(action==='costumeBuyPick'){
      const c=costumeById(arg);if(!c)return;
      open("코스튬 구매",`<div class="costume-card" data-no-currency-art><img src="${c.portrait}" alt="${c.name}"><strong>${c.name}</strong><span>${goldPurchaseIcon()}${fmt(c.price)} G</span></div><p class="note">보유 효과: 공격력 +1%. 구매 즉시 적용되며, 장착하지 않아도 효과가 유지돼요. 외형은 해당 직업으로 장착할 수 있어요.</p><div class="actions">${btn("취소","close")}${btn("구매 확정","costumeBuyConfirm",c.id,"gold",true)}</div>`);return;
    }
    if(action==='costumeBuyConfirm'){modal.close();return await command('costumeBuy',{id:arg});}
    if(action==='costumeEquip'||action==='costumeUnequip'){modal.close();return await command(action,{id:arg});}
    if(action==='shopSellPick'){
      const it=state.items.find(x=>x.id===arg),reason=bossSaleBlock(state,it);if(reason)return toast(reason);
      open("보스장비 판매 확인",`<div class="shop-confirm-item">${gearMarkup(it,"big-item")}<div><strong>${esc(D.gearName(it))}</strong><p>Lv.${it.level} · ${D.SLOTS[it.slot]} · ${it.stars||0}성</p></div></div><div class="shop-confirm-price">${fmt(bossSalePrice(it))} G</div><p class="note">판매하면 이 장비는 가방에서 사라집니다. 판매할까요?</p><div class="actions">${btn("취소","close")}${btn("판매 확정","shopSellConfirm",it.id,"gold",true)}</div>`);return;
    }
    if(action==='shopSellConfirm'){
      const it=state.items.find(x=>x.id===arg),reason=bossSaleBlock(state,it);if(reason)return toast(reason);modal.close();return await command('shopSell',{id:arg});
    }
    if(action==='lottoBuy'){if(busy||lottoSelection.length!==2||!lottoData)return;const r=await command('lottoBuy',{numbers:[...lottoSelection],drawAt:lottoData.drawAt});if(r?.result?.events?.some(e=>e.type==='lottoBuy')){clearLotto();render();}return;}
    if(action==="dailyClaim")return await command("dailyClaim",{key:arg});
    if(action==="battlePotion")return await command("battlePotion");
    if(action==='autoSkills'){regularAutoSkills=!regularAutoSkills;render();return;}
    if(action==='waveRewardHistory'){const r=state.waveRewardHistory?.[Number(arg)];if(r)return open('웨이브 보상 수령 내역',waveRewardBody(r)+btn('닫기','close','','gold'));return;}
    if(action==="waveCreate")return;
    if(action==="coopCreate")return toast("협동 균열은 종료된 콘텐츠입니다.");
    if(action==='citadelCreate')return await command('coopCreate',{mode:'citadel',tier:0,...(/^[1-6]$/.test(String(arg))?{boss:Number(arg)}:{})});
    if(action==="explorationCreate")return await command("coopCreate",{mode:"exploration",tier:Number(arg)});
    if(action==="explorationSweep"){const [t,c]=String(arg).split(':'),tier=Number(t),need=D_EXPL_KEYS(tier),keys=Number(state.materials?.dungeonKey)||0,count=c==='max'?Math.min(100,Math.floor(keys/need)):Number(c);if(keys<need||count<1)return toast(`던전 열쇠가 없어요. (${need}개 필요 · 보유 ${fmt(keys)}개)`);if(!confirm(`링탐 소탕 ${count}회 할까요?\n열쇠를 쓰고 판마다 실제 상자 확률로 보상을 받아요.`))return;return await command("explorationSweep",{tier,count});}
    if(action==="explorationBusCreate"){if(!confirm("버스 방을 만들까요?\n방장만 열쇠를 쓰고 클리어 보상도 방장만 받아요. 파티원은 열쇠를 쓰지 않고 보상도 없어요."))return;return await command("coopCreate",{mode:"exploration",tier:Number(arg),bus:true});}
    if(action==="raidCreate")return await command("coopCreate",{mode:"raid",tier:Number(arg)});
    if(action==="coopJoin")return await command("coopJoin",{room:arg});
    if(action==="coopList")return await refreshCoopRooms();
    if(["coopStart","coopSync","coopLeave"].includes(action)){modal.close();return await command(action);}
    if(action==="coopLeaveConfirm")return open(coopRoom?.mode==="citadel"?"암흑성채에서 나가기":coopRoom?.mode==="wave"?"웨이브에서 나가기":coopRoom?.mode==="advancement"?"전직 보스에서 나가기":"균열에서 나가기",'<p>'+(coopRoom?.mode==="citadel"?"현재 보상은 없습니다. 나가면 이번 원정이 종료됩니다.":coopRoom?.mode==="wave"?"완료한 마지막 10단위 구간에서 한 번 추첨하고, 미수령 최초 보상을 함께 받습니다. 진행 중인 웨이브는 제외되며 재도전은 1웨이브부터 시작합니다.":"진행 중인 도전에서 나가면 보상을 받을 수 없습니다.")+'</p>'+btn("나가기","coopLeave","","danger",true));
    if(action==='itemGroup')return itemGroup(arg);
    if(action==='towerOpen')return await command('towerOpen',{runId:state.battle?.runId});
    if(action==='tokenPage'){tokenPage=['shop','race'].includes(arg)?arg:'dungeon';render();if(tokenPage==='race'&&!state.race?.card)await command('raceCard',{},true);return;}
    if(action==='tokenBossStart'){modal.close();tab='boss';bossTab='token';view='game';return await command('tokenBossStart',{stage:Number(arg)});}
    if(action==='sweep'){const [kind,v]=String(arg).split(':');modal.close();return await command('sweep',kind==='all'?{kind}:kind==='boss'?{kind,id:Number(v)}:{kind,stage:Number(v)});}
    if(action==='keyBossStart'){modal.close();tab='boss';bossTab='key';view='game';return await command('keyBossStart',{stage:Number(arg)});}
    if(action==='tokenShopBuy'){if(busy)return;const [id,q]=String(arg).split(':');await command('tokenShopBuy',{id,quantity:Number(q)||1});return;}
    if(action==='raceCard'){await command('raceCard',{},true);return;}
    if(action==='raceLane'){if(raceUI.anim)return;raceUI.lane=Number(arg)||1;render();return;}
    if(action==='raceType'){raceUI.type=arg==='place'?'place':'win';render();return;}
    if(action==='raceAmount'){raceUI.bet=Math.max(1,Math.min(100,Number(arg)||1));render();return;}
    if(action==='raceNext'){clearTimeout(raceTimer);raceUI.anim=null;render();return;}
    if(action==='raceBet'){
      if(busy||raceUI.anim)return;const card=state.race?.card;if(!card)return;
      const bet=Math.min(raceUI.bet,Math.floor(state.tokens||0));
      let result;try{result=await command('raceBet',{cardId:card.id,lane:raceUI.lane,type:raceUI.type,bet},true);}catch{return;}
      const ev=result?.result?.events?.find(e=>e.type==='raceResult');if(!ev)return;
      raceUI.anim={...ev,done:false,go:false};render();requestAnimationFrame(()=>requestAnimationFrame(()=>{if(!raceUI.anim)return;raceUI.anim.go=true;document.querySelector('.token-track')?.classList.add('go');}));
      clearTimeout(raceTimer);raceTimer=setTimeout(()=>{if(!raceUI.anim)return;raceUI.anim.done=true;if(tab==='boss'&&bossTab==='token')render();toast(ev.hit?'🎉 적중! 토큰 '+fmt(ev.payout)+'개':'아쉽게도 '+ev.rank+'등');},4150);
      return;
    }
    if(action==='towerStart'){modal.close();tab='boss';bossTab='tower';view='game';return await command('towerStart',{floor:Number(arg)});}
    if(action==='dummyStart'||action==='dummyRestart'){
      if(state.battle||state.coopRoom||state.partyRoom)return toast('진행 중인 전투를 먼저 종료해 주세요.');
      const mode=action==='dummyRestart'?dummyBattle?.dummyMode:arg;
      if(mode!=='normal'&&mode!=='boss')return;
      dummyBattle=newTrainingBattle(mode,state.classId,power(state),Date.now(),crypto.randomUUID(),state.advancement>=1);
      tab='boss';bossTab='training';view='game';render();return;
    }
    if(action==='dummyLeave'){dummyBattle=null;render();return;}
    if(action==='towerAck'){modal.close();return await command('ack');}
    if(action==='towerLeaveConfirm')return open('전투에서 나가기',`<p>현재 층의 도전을 종료합니다. 획득한 이전 층 보상과 기록은 유지됩니다.</p>${btn('나가기','towerLeave','','danger',true)}`);
    if(action==='towerLeave'){modal.close();return await command('towerLeave');}
    if (action === "cubeKind") {cubeKind=Object.hasOwn(D.CUBES,arg)?arg:"cube";return itemDetail(selected,"potential");}
    if (action === "reconnect") return await command("sync",{},false,true);
    if (action === "recoverLogin"){location.href="recover.html?v=request-recovery-2";return;}
    if (action === "attendance") return attendance();
    if(action==="hairConfirm"){const it=state.items.find(x=>x.id===arg);if(!it)return;return open("링구의 머리카락",`<div class="shop-confirm-item">${gearMarkup(it,"big-item")}<div><strong>${esc(D.gearName(it))}</strong><p class="note">링구의 머리카락 1개를 발라 이 장비를 <b>거래 가능</b>으로 바꿔요.<br>거래소에서 <b>한 번 팔리면</b> 산 사람에게는 다시 거래 불가로 바뀌어요.<br>220제 이상은 다시 강화하면 거래 불가로 돌아가요.<br>다시 거래 불가가 되면 또 바를 수 있어요.</p></div></div><div class="actions">${btn("바르기","hairApply",it.id,"gold",true)}${btn("취소","close")}</div>`);}
    if(action==="hairApply"){modal.close();await command("hairApply",{id:arg});toast("링구의 머리카락을 발랐어요 · 이제 거래소에 1번 올릴 수 있어요");return itemDetail(arg,"info");}
    if (action === "systemInbox") {if(!busy)await command("sync",{},true);return systemInbox();}
    if (action === "claimTradeMailAll") {const r=await command("claimTradeMailAll",{});const e=r?.result?.events?.find(x=>x.type==="tradeMailAll");if(e)toast(`거래소 우편 ${e.count}통 받기 완료${e.left?` · 가방이 가득 차서 ${e.left}통 남음`:""}`);systemInbox();return;}
    if (action === "claimSystemMail") {
      const chest=state.systemMailbox?.some(m=>m.id===arg&&["lumiBossChest","wheelBossChest"].includes(m.kind));
      const playerGold=state.systemMailbox?.some(m=>m.id===arg&&m.kind==="playerGold");
      const arenaReward=state.systemMailbox?.some(m=>m.id===arg&&m.kind==="arenaSeason");
      const result=await command(arenaReward?"arenaRewardClaim":playerGold?"goldTransferClaim":"claimSystemMail",{id:arg});
      if(result&&!chest)systemInbox();
      return;
    }
    if(action==="professionOpen"){await command('sync',{},true);openProfession();return;}
    if(action==="professionTab"){profTab=arg;const top=modal.scrollTop;openProfession();modal.scrollTop=top;return;}
    if(action==="professionChoose"){if(busy)return;const cur=state.profession?.id,pname=D_PROFESSIONS.find(p=>p.id===arg)?.name||arg;if(cur&&!confirm(`${pname}(으)로 변경할까요?\n1억 G가 소모되고 숙련도가 Lv.1로 초기화되며, 7일 동안 다시 바꿀 수 없어요.`))return;if(!cur&&!confirm(`${pname}을(를) 선택할까요?\n첫 선택은 무료지만, 바꾸려면 7일 쿨타임 + 1억 G가 필요해요.`))return;const r=await command('professionChoose',{id:arg});await command('professionCounts',{},true).catch(()=>{});open('전문 직업',professionView(state,Date.now(),professionCounts));modal.classList.add('prof-dialog');const e=r?.result?.events?.find(x=>x.type==='professionChoose');if(e)toast(e.changed?`${e.name}(으)로 변경했어요`:`${e.name} 선택 완료`);return;}
    // 2026-11-05 도현: 제작 전 "제작하시겠습니까?" 확인 → 제작 후 "N개 제작 완료" 창.
    if(action==="professionCraft"||action==="professionCraftMax"){if(busy)return;const input=modal.querySelector(`[data-recipe-count="${arg}"]`);let count=action==="professionCraftMax"?'max':Number(input?.value);if(count!=='max'&&(!Number.isInteger(count)||count<1||count>1000))return toast('제작 수량은 1~1,000 사이로 입력해 주세요.');
      const def=profOfRecipe(arg),recipe=def?.recipes.find(r=>r.id===arg);if(!def||!recipe)return;profTab=def.id;const n=count==='max'?profMax(state,def,recipe):count;if(!n||n<1)return toast('재료가 부족해요.');
      const lv=profSkill(def.id).level,cost=profCost(recipe,lv,n,def.id),parts=[...Object.entries(cost.materials).map(([k,v])=>`${esc(PROF_NAMES[k]||k)} ${v.toLocaleString('ko-KR')}개`),...(cost.gold?[`${cost.gold.toLocaleString('ko-KR')} G`]:[])];
      open('제작 확인',`<div class="stack"><p><b>${esc(recipe.name)}</b> <b>${n.toLocaleString('ko-KR')}개</b>를 제작하시겠습니까?</p><p class="note">소모: ${parts.join(' · ')||'없음'}</p><div class="actions">${btn('제작하기','professionCraftConfirm',arg+'|'+n,'gold')}${btn('취소','professionCraftBack')}</div></div>`);modal.classList.add('prof-dialog');return;}
    if(action==="professionCraftBack"){openProfession();return;}
    if(action==="professionCraftConfirm"){if(busy)return;const [recipe,c]=String(arg).split('|');const r=await command('professionCraft',{recipe,count:Number(c)});const e=r?.result?.events?.find(x=>x.type==='professionCraft');
      if(!e){openProfession();return;}
      sounds.play('purchase-complete');const made=Object.entries(e.made).map(([k,v])=>`${esc(PROF_NAMES[k]||k)} ${v.toLocaleString('ko-KR')}개`).join(' · ');
      open('제작 완료',`<div class="stack"><p>✅ <b>${esc(e.name)}</b> <b>${e.count.toLocaleString('ko-KR')}개</b> 제작 완료!</p><p class="note">획득: ${made}${e.levelUps?` · 🎉 ${esc(e.professionName||'')} 숙련도 Lv.${e.level} 달성!`:''}</p><div class="actions">${btn('확인','professionCraftBack','','gold')}</div></div>`);modal.classList.add('prof-dialog');return;}
    if(action==="tribeOpen"){await command('sync',{},true);openTribe();return;}
    if(action==="tribeBuy"){if(busy||tribeSpinning)return;try{await command('tokenShopBuy',{id:'tribeTicket',quantity:1},true);toast('종족 주사위 1개 구매');}catch{}openTribe();return;}
    if(action==="tribeRoll"){
      if(busy||tribeSpinning)return;
      let result;try{result=await command('tribeRoll',{},true);}catch{openTribe();return;}
      const ev=result?.result?.events?.find(e=>e.type==='tribeRoll');if(!ev){openTribe();return;}
      tribeSpinning=true;openTribe();
      try{await spinTribeReel(modal.querySelector('[data-tribe-screen]'),ev.id);await new Promise(r=>setTimeout(r,ev.grade==='myth'||ev.grade==='legend'?1400:700));}finally{tribeSpinning=false;}
      if(modal.open&&modal.querySelector('[data-tribe-screen]'))openTribe();
      return;
    }
    if(action==="tribeChoose"){if(busy||tribeSpinning)return;let r;try{r=await command('tribeChoose',{take:arg==='take'},true);}catch{openTribe();return;}const e=r?.result?.events?.find(x=>x.type==='tribeChoose');if(e)toast(e.took?'종족이 바뀌었어요.':'지금 종족을 유지했어요.');openTribe();return;}
    if(action==="bankOpen"){await command('sync',{},true);open('황금 은행',bankView(state));modal.classList.add('bank-dialog');return;}
    if(action==="bankTermOpen"){if(busy)return;const [product,all]=String(arg).split(':');const raw=document.querySelector('#bank-term-amount')?.value?.trim().replace(/,/g,'')||'';if(all!=='all'&&!/^\d+$/.test(raw))return toast('가입 금액을 숫자로 입력해 주세요.');const result=await command(action,{product,amount:all==='all'?'all':Number(raw)});bankCancelArm=null;open('황금 은행',bankView(state,Date.now(),bankCancelArm));modal.classList.add('bank-dialog');const e=result?.result?.events?.find(x=>x.type==="bankTermOpen");if(e)toast(`정기예금 가입 완료 · 만기 ${e.payout.toLocaleString('ko-KR')} G`);return;}
    if(action==="bankTermCancel"){if(busy)return;if(bankCancelArm!==arg){bankCancelArm=arg;open('황금 은행',bankView(state,Date.now(),bankCancelArm));modal.classList.add('bank-dialog');return;}const result=await command(action,{id:arg});bankCancelArm=null;open('황금 은행',bankView(state,Date.now(),bankCancelArm));modal.classList.add('bank-dialog');const e=result?.result?.events?.find(x=>x.type==="bankTermCancel");if(e)toast(`정기예금 해지 · ${e.refund.toLocaleString('ko-KR')} G 지급`);return;}
    if(action==="bankDeposit"||action==="bankWithdraw"){if(busy)return;const raw=document.querySelector('#bank-amount')?.value?.trim()||'';if(arg!=='all'&&!/^\d+$/.test(raw))return toast('골드 금액을 숫자로 입력해 주세요.');const amount=arg==='all'?'all':Number(raw);await command(action,{amount});open('황금 은행',bankView(state));modal.classList.add('bank-dialog');return;}
    if(action==="titleOpen"){setTitleFilter('all');open("칭호",titlePanelView(state));modal.classList.add("title-dialog");await command('titleSync',{},true).catch(()=>{});if(modal.open&&modal.classList.contains('title-dialog'))open("칭호",titlePanelView(state)),modal.classList.add("title-dialog");return;}
    if(action==="titleDetail"){setTitleDetail(arg);open("칭호",titlePanelView(state));modal.classList.add("title-dialog");return;}
    if(action==="titleFilter"){setTitleFilter(arg);open("칭호",titlePanelView(state));modal.classList.add("title-dialog");return;}
    if(action==="titleEquip"){if(busy)return;const r=await command('titleEquip',{id:arg||null});if(r){toast(arg?'칭호 장착 완료':'칭호를 해제했어요');open("칭호",titlePanelView(state));modal.classList.add("title-dialog");}return;}
    if(action==="luckyWheelOpen"){open("행운의 돌림판",luckyWheelView(state));modal.classList.add("lucky-wheel-dialog");return;}
    if(action==="luckyWheelSpin"){
      if(luckyWheelSpinning())return;
      const root=modal.querySelector("[data-lucky-wheel]"),button=root?.querySelector(".lucky-wheel-spin");if(button)button.disabled=true;
      let result;try{result=await command("luckyWheelSpin",{},true);}catch{if(button)button.disabled=false;return;}
      const ev=result?.result?.events?.find(e=>e.type==="luckyWheel");if(!ev){if(button)button.disabled=false;return;}
      sounds.play("ui-click");await spinLuckyWheel(root,ev.index);
      const jackpot=ev.id==="jackpot",text=jackpot?"🎉 잭팟! 보스 장비 상자가 우편으로 도착했어요!":ev.label+" 획득!";
      sounds.play(jackpot?"loot-rare":"loot-common");
      if(modal.open&&modal.querySelector("[data-lucky-wheel]")){const body=modal.querySelector("[data-lucky-wheel]");body.outerHTML=luckyWheelView(state,text);const r=modal.querySelector(".lucky-wheel-result");if(jackpot)r?.classList.add("jackpot");}
      if(jackpot)toast("행운의 돌림판 잭팟! 우편함에서 Lv.150~190 보스 장비 상자를 받으세요.");
      return;
    }
    if (action === "gameMenu") {open("모험 메뉴",fantasyMenu(state)+(state.isAdmin?btn("유저 장비 · 재화 조회","adminInventory","","gold"):""));modal.classList.add("fantasy-menu-dialog");return;}
    if (action === "petPreview") {if(!state.isAdmin)return; sounds.play("loot-rare"); return playLumiReveal(()=>{});}
    if (action === "petOdds") return open("소환 확률 · 남은 수량",petOdds(state));
    if (action === "petBag") {modal.close();tab="gear";sub="pets";view="game";return render();}
    if (action === "petSummon") return await command("petSummon",{count:Number(arg)});
    if (action === "petEquip") return await command("petEquip",{id:arg||null});
    if (action === "attendanceClaim") return await command("attendanceClaim");
    if (action === "testerFullSet") {if(state?.name!=="테스터"&&!state?.isAdmin)return;const [cid,lv]=String(arg).split(":");if(cid!==state.classId){await command("changeClass",{classId:cid});filterClass="";salvageSelection.clear();}await command("testerFullSet",{level:Number(lv)});return render();}
    if (action === "testerSet") {if(state?.name!=="테스터"&&!state?.isAdmin)return;const [cid,ps]=String(arg).split(":"),preset=Number(ps)||0;if(cid!==state.classId){await command("changeClass",{classId:cid});filterClass="";salvageSelection.clear();}if((state.gearPresets?.[cid]?.active??0)!==preset)await command("gearPreset",{slot:preset});return render();}
    if (action === "changeClass") return changeClassDialog();
    if (action === "changeClassPick") return confirmClassChange(arg);
    if (action === "changeClassConfirm") {await command("changeClass",{classId:arg});modal.close();filterClass="";salvageSelection.clear();tab="character";view="game";return render();}
    if (action === "close") {
      modal.close();
      return;
    }
    if(action==="tab"&&arg==="citadel"){tab="boss";bossTab="citadel";view="game";render();return await refreshCoopRooms();}
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
      window.scrollTo({top:0,behavior:"instant"});
      if(enteringHunt)requestAutoHunt();
      if(tab==='boss'&&['citadel','exploration','raid','final','advancement'].includes(bossTab))await refreshCoopRooms();
      if (tab === "market") {if(buyOrderMode)await buyOrdersLoad();else await marketLoad();}
      if(tab==='investment')await command('investList',{},true);
      if(tab==='event'&&eventPage==='lotto')await command('lottoList',{},true);
      return;
    }
    if(action==="warriorLab"){if(!state?.isAdmin)return;await command("sync",{},true,true);if(!state?.isAdmin||state.classId!=="warrior")return toast("관리자 전사만 입장할 수 있습니다.");modal.close();try{await openWarriorLab({getState:()=>state,onClose:()=>{sounds.setCombat(false);render();},sound:id=>sounds.play(id)});sounds.setCombat(true);}catch(e){toast(e.message||"3D 전투에 입장하지 못했습니다.");}return;}
    if (action === "bossSub") {bossTab=["wave","coop"].includes(arg)?"exploration":arg;render();if(["citadel","advancement","raid","final","exploration"].includes(bossTab))await refreshCoopRooms();return;}
    if (action === "partyLeaveConfirm") return open("파티에서 나가기",`<p>진행 중인 전투에서 나가면 해당 파티 보상을 받을 수 없습니다. 자동사냥은 다시 시작됩니다.</p>${btn("나가기","partyLeave","","danger",true)}`);
    if (action === "itemMode") {const [id,mode]=arg.split(":");return itemDetail(id,mode);}
    if (action === "advance") {tab="boss";bossTab="advancement";view="game";render();return await refreshCoopRooms();}
    if(action==="advancementStart"){modal.close();tab="boss";bossTab="advancement";view="game";return await command("coopCreate",{mode:"advancement",tier:Number(arg)});}
    if (action === "journal") {modal.close();view="journal";return render();}
    if (action === "ranking") {modal.close();view="ranking";return await loadRankings();}
    if(action==="adminTransferOpen")return adminTransferDialog(arg);
    if(action==="goldTransferOpen")return goldTransferDialog(arg);
    if(action==="goldTransferConfirm"){
      if(busy||!state||state.isAdmin)return;
      const amount=Number($("#gold-transfer-amount")?.value),target=rankingRows.find(r=>r.id===arg&&!r.isMe);
      if(!target)return toast("랭킹을 새로고침한 뒤 선택해 주세요.");
      if(!Number.isSafeInteger(amount)||amount<1||amount>999999999999)return toast("송금액은 1~999,999,999,999 G 사이의 정수로 입력해 주세요.");
      if(amount>state.gold)return toast("골드가 부족합니다.");
      return open("골드 송금 확인",`<p><strong>${esc(target.name)}</strong>님에게 <strong>${fmt(amount)} G</strong>를 우편으로 보냅니다.</p><p class="note">내 골드에서 즉시 차감됩니다. 송금 후 취소할 수 없습니다.</p>${btn("송금하기","goldTransferSend",arg+":"+amount,"gold",true)}`);
    }
    if(action==="goldTransferSend"){
      if(busy||!state||state.isAdmin)return;
      const [id,amountText]=arg.split(":"),amount=Number(amountText);
      if(!rankingRows.some(r=>r.id===id&&!r.isMe)||!Number.isSafeInteger(amount)||amount<1||amount>999999999999)return toast("랭킹을 새로고침한 뒤 선택해 주세요.");
      return await command("goldTransfer",{recipient:id,amount});
    }
    if(action==="adminTransferSend"){
      if(busy||!state?.isAdmin)return;
      const amount=Number($("#transfer-amount")?.value),resource=$("#transfer-resource")?.value;
      if(!Number.isSafeInteger(amount)||amount<1||amount>999999999999)return toast("수량은 1~999,999,999,999 사이 정수로 입력해 주세요.");
      return await command("adminTransfer",{recipient:arg,resource,amount});
    }
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
      if(!Number.isSafeInteger(level)||level<1||level>400)return toast("레벨은 1~400 사이 정수로 입력해 주세요.");
      const result=await command("betaLevel",{level});
      if(result){betaTools();toast("레벨이 조정됐어요. 스탯 포인트를 분배해 주세요.");}return;
    }
    if (action === "settings") return settingsDialog();
    if (action === "saveSettings") {
      settings.sound = Number($("#sound").value);
      settings.music = Number($("#music").value);
      settings.low = $("#low").checked;
      settings.skillAlpha = setSkillAlpha([1,2,3,4,5].map(i=>Number($("#skillAlpha"+i)?.value)));
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
      render();
      // 2026-11-03 도현: 사냥터 선택을 열면 지금 사냥 중인 사냥터로 바로 이동.
      requestAnimationFrame(()=>document.querySelector('.stage-row.current-stage')?.scrollIntoView({block:"center"}));
      return;
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
    if (action === "gearPreset") return await command("gearPreset", { slot: Number(arg) });
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
    if (action === "additionalUnlock") return await command("additionalUnlock", {id:arg});
    if (action === "addCubeUse") return await command("addCube", {id:arg});
    if (action === "bonusRoll" || action === "statReroll") return await command(action, {id:arg});
    if (action === "refineChooseRepeat") {
      if(busy||!state.pendingRefine)return;
      const {id,kind}=state.pendingRefine;
      const result=await command("refineChoose",{apply:arg==="yes"});
      if(!result||state.pendingRefine)return;
      itemDetail(id,"baseStats");
      return await command(kind==="bonus"?"bonusRoll":"statReroll",{id});
    }
    if (action === "refineChoose") {
      const id=state.pendingRefine?.id;
      await command("refineChoose", { apply: arg === "yes" });
      modal.close();
      return itemDetail(id||selected,"baseStats");
    }
    if (action === "addCubeChooseRepeat") {
      if(busy||!state.pendingAddCube)return;
      const id=state.pendingAddCube.id;
      const result=await command("addCubeChoose",{apply:arg==="yes"});
      if(!result||state.pendingAddCube)return;
      itemDetail(id,"potential");
      return await command("addCube",{id});
    }
    if (action === "addCubeChoose") {
      const id=state.pendingAddCube?.id;
      await command("addCubeChoose", { apply: arg === "yes" });
      modal.close();
      return itemDetail(id||selected,"potential");
    }
    if (action === "cubeUse") return await command("cube", {id:arg,kind:cubeKind,lock:Number(document.querySelector('#cube-lock')?.value??-1)});
    if(action==="transcend"){return await command("transcend",{id:arg});}
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
      return await command("cube",{id,kind,lock:pending.lock??-1});
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
      const visibleGroups=inventoryGroups(state.items,D.CLASSES,state.classId,Object.values(state.equipped),filterClass,filterSlot,state.gearPresets);
      for(const group of visibleGroups)for(const slot of group.slots)for(const it of slot.items)if(salvageSelection.size<50&&canSalvage(it)&&!it.boss)salvageSelection.add(it.id); // 2026-11-07 도현: 자동 선택은 일반 장비만 (보스 장비 제외)
      render();return;
    }
    if(action==="salvageBatchConfirm"){
      const items=state.items.filter(it=>salvageSelection.has(it.id)&&canSalvage(it));
      if(!items.length)return;
      open("선택 장비 분해",`<p>선택한 장비 ${items.length}개를 분해하고 장비 파편 ${fmt(Math.round(items.reduce((n,it)=>n+D.salvageYield(it),0)*fragBoost(state)))}개를 받습니다.</p><p class="note">분해한 장비는 복구할 수 없습니다.</p>${items.map(it=>`<p>${esc(D.gearName(it))} · Lv.${it.level} · ${it.stars}성</p>`).join("")}${btn("선택 장비 분해하기","salvageBatch","","danger",true)}`);return;
    }
    if(action==="salvageBatch"){
      await command("salvage",{ids:[...salvageSelection]});salvageSelection.clear();render();return;
    }
    if (action === "salvageConfirm")
      return open(
        "장비 분해",
        `<p>분해 보상: 장비 파편 ${Math.round(D.salvageYield(state.items.find(it=>it.id===arg))*fragBoost(state))}개.<br>선택한 장비가 사라집니다. 강화·잠재은 복구할 수 없습니다.</p><div class="actions">${btn("분해하기", "salvage", arg, "danger", true)}</div>`,
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
      if(!state.battle)return;
      tab = "hunt";
      view = "game";
      render();
      window.scrollTo({top:0,behavior:"instant"});
      requestAnimationFrame(()=>window.scrollTo({top:0,behavior:"instant"}));
      return;
    }
    if (action === "claimMail") return await command("claimMail", {key:arg});
    if (action === "abandonConfirm") return open("전투 포기", `<p class="note">보상과 도전 횟수는 차감되지 않습니다.</p>${btn("포기하기","abandon","","danger",true)}`);
    if (action === "abandon") { await command("abandon"); modal.close(); return render(); }
    if (action === "marketMode") {
      buyOrderMode = arg === "orders";
      mine = arg === "mine";
      marketPage = 0;
      if(buyOrderMode){render();return await buyOrdersLoad();}
      return await marketLoad();
    }
    if(action==="buyOrderRefresh")return await buyOrdersLoad();
    if(action==="buyOrderNew")return buyOrderNewDialog();
    if(action==="buyOrderNewPick")return buyOrderNewDialog(arg);
    if(action==="buyOrderPick")return buyOrderPickDialog(arg);
    if(action==="buyOrderCreate"){const key=$('#bo-key').value,quantity=Number($('#bo-count').value),price=Number($('#bo-price').value);if(!BUY_ORDER_KEYS.includes(key)||!Number.isSafeInteger(quantity)||quantity<1||quantity>1e6||!Number.isSafeInteger(price)||price<1||price>1e9||quantity*price>1e12)return toast('수량과 개당 가격을 확인해 주세요.');if(quantity*price>state.gold)return toast('보유 골드가 부족해요.');const r=await buyOrderWrite('create',{key,quantity:String(quantity),price:String(price)});if(r){modal.close();toast(`구매 요청 등록 · ${fmt(r.escrow)} G 묶음`);}return;}
    if(action==="buyOrderCancel"){const r=await buyOrderWrite('cancel',{id:arg});if(r){modal.close();toast(`구매 요청 취소 · ${fmt(r.refund)} G 환불`);}return;}
    if(action==="buyOrderFillCard"){const pick=modal.querySelector('input[name="bo-card"]:checked');if(!pick)return toast('팔 카드를 골라 주세요.');const r=await buyOrderWrite('fill',{id:arg,quantity:'1',card:pick.value});if(r){modal.close();toast(`동료 카드 판매 · ${fmt(r.total)} G는 우편함으로 보냈어요`);}return;}
    if(action==="buyOrderFill"){const count=Number($('#bo-fill-count').value);if(!Number.isSafeInteger(count)||count<1)return toast('판매 수량을 확인해 주세요.');const r=await buyOrderWrite('fill',{id:arg,quantity:String(count)});if(r){modal.close();toast(`${fmt(r.quantity)}개 판매 · ${fmt(r.total)} G는 우편함으로 보냈어요`);}return;}
    if (action === "page") {
      marketPage = Number(arg);
      return await marketLoad();
    }
    if (action === "marketRefresh") return await marketLoad();
    if(action==='marketKind'){marketKind=arg;filterSlot='';filterClass='';marketPage=0;return await marketLoad();}
    if(action==='marketSellConsumables')return consumableSellDialog();
    if(action==='marketSellCompanion')return companionSellDialog();
    if(action==='marketSellCompanionPick')return companionSellDialog(Number(arg));
    if(action==='sellCompanionConfirm'){const i=Number(arg),price=Number($('#cp-sell-price')?.value);if(!cpSellable().some(c=>c.i===i))return toast('배치 중이 아닌 동료 카드만 팔 수 있어요.');if(!Number.isSafeInteger(price)||price<100||price>1e10)return toast('판매 가격은 100~10,000,000,000 G의 정수로 입력해 주세요.');return await marketWrite('sell',{companionCard:i,price});}
    if(action==='materialSellPick')return consumableSellDialog(arg);
    if(action==='sellConsumableConfirm'){const material=$('#material-sell-key').value,quantity=Number($('#material-sell-count').value),price=Number($('#material-sell-price').value);if(!Number.isSafeInteger(quantity)||quantity<1||quantity>Math.min(1e6,marketHave(material))||!Number.isSafeInteger(price)||price<1||price*quantity>1e9)return toast('수량과 개당 가격을 확인해 주세요.');return await marketWrite('sell',{material,quantity,price});}
    if (action === "marketSell") {marketSellId=null;marketSellSlot="";marketSellClass="";marketSellPrice="10000";return marketSellPicker();}
    if (action === "marketSellPick") {marketSellPrice=$("#sell-price")?.value??marketSellPrice;marketSellId=arg;return marketSellPicker();}
    if (action === "marketSellBack") {marketSellPrice=$("#sell-price")?.value??marketSellPrice;marketSellId=null;return marketSellPicker();}
    if (action === "sellConfirm") {
      const it=state.items.find(it=>it.id===marketSellId),reason=marketSellBlock(it),price=Number($("#sell-price")?.value);
      if(reason)return toast(reason);
      if(!Number.isSafeInteger(price)||price<100||price>1e10)return toast("판매 가격은 100~10,000,000,000 G의 정수로 입력해 주세요.");
      return await marketWrite("sell", {itemId:it.id,price});
    }
    if (action === "marketConfirm") {
      const l = marketRows.find((l) => l.id === arg);
      if(!l)return toast("상품 목록을 새로고침해 주세요.");
      if(l.item.kind==="companion"){if(l.status!=="open")return open("판매 내역",`<div class="item">${itemMarkup(l.item)}</div><p>${l.status==="sold"?"판매 완료":"회수 완료"}</p>`);return open(l.own?"동료 카드 판매 취소":"동료 카드 구매",`<div class="item">${itemMarkup(l.item)}</div><p>${l.own?"회수하면 동료 가방으로 돌아와요.":goldPurchaseIcon()+fmt(l.price)+" G · 산 카드는 우편으로 와요."}</p>${btn(l.own?"카드 회수":"구매 확정",l.own?"cancelListing":"buyListing",arg,"gold")}`);}
      if(l.status!=="open")return open("판매 내역",`${l.item.kind==="consumable"?itemMarkup(l.item):marketGearDetails(l.item)}<p>${l.status==="sold"?"판매 완료":"회수 완료"}</p>`);
      if(l.item.kind==="consumable"){open(l.own?"소모품 판매 취소":"소모품 구매",`<div class="item">${itemMarkup(l.item)}</div><p>${l.own?"":goldPurchaseIcon()}개당 ${fmt(l.price)} G</p>${l.own?`<p>남은 ${fmt(l.item.quantity)}개를 돌려받습니다.</p>`:`<label>구매 수량<input id="material-buy-count" data-listing="${l.id}" type="number" min="1" max="${l.item.quantity}" step="1" value="1"></label><p>${goldPurchaseIcon()}<span id="material-buy-total"></span></p>`}${btn(l.own?"남은 수량 회수":"구매 확정",l.own?"cancelListing":"buyListing",arg,"gold")}`);if(!l.own)updateMaterialBuy();return;}
      return open(
        l.own ? "판매 취소" : "구매 확인",
        `${marketGearDetails(l.item)}<p class="note">${l.own?"":goldPurchaseIcon()}${fmt(l.price)} 골드</p><div class="actions">${btn(l.own ? "장비 회수" : "구매 확정", l.own ? "cancelListing" : "buyListing", arg, "gold")}</div>`,
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
document.addEventListener("input", e=>{if(/^skillAlpha[1-5]$/.test(e.target.id||'')&&e.target.nextElementSibling)e.target.nextElementSibling.textContent=Math.round(e.target.value*100)+'%';if(e.target.id==="shop-buy-quantity")updateConsumablePurchase(state,modal);if(e.target.id==="shop-sell-quantity")updateConsumableSale(state,modal);if(e.target.id==="bm-buy-quantity")updateBlackMarketPurchase(state,modal);if(e.target.id?.startsWith("material-sell"))updateMaterialSale();if(e.target.id==="material-buy-count")updateMaterialBuy();if(e.target.id==="sell-price")updateSellPrice();});
document.addEventListener("change", async (e) => {
  if(e.target.id==='cube-lock'){cubeLockChoice=Number(e.target.value);return;}
  if(e.target.id==='fishing-bait'){fishingUI.bait=e.target.value;render();return;}
  if(e.target.id==="exchange-class"){exchangeClass=e.target.value;render();return;}
  if(e.target.id==="exchange-level"){exchangeLevel=Number(e.target.value);render();return;}
  if(e.target.id==="material-sell-key"){updateMaterialSale();return;}
  if(/^bo-/.test(e.target.id||"")){updateBuyOrderForm();return;}
  if(e.target.dataset?.recipeCount){const id=e.target.dataset.recipeCount,def=profOfRecipe(id),p=def&&profSkill(def.id),r=def?.recipes.find(x=>x.id===id),out=modal.querySelector(`[data-recipe-sum="${id}"]`);if(r&&out)out.textContent=craftSummary(state,p,r,Number(e.target.value));return;}
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
  if(view==='game'&&tab==='event'&&eventPage==='fishing'&&(fishingUI.pending||state.fishing?.cast))return;
  // Keep reward settlement independent from successful market/lotto refreshes.
  if(state.hunting&&!state.battle&&!state.coopRoom&&!state.partyRoom&&Date.now()-lastHuntSettlement>=30000){command('sync',{},true).catch(()=>{});return;}
  if(coopLobbyVisible()&&!modal.open&&Date.now()-coopListAttempt>=5000){refreshCoopRooms().catch(()=>{});return;}
  if(regularAutoSkills&&state.battle&&state.battle.started===regularAutoBattle&&!modal.open){const slot=nextAutoSkill(state,Date.now());if(slot!==null){command('skill',{slot}).catch(()=>{});return;}}
  if(view==="ranking"&&!modal.open&&Date.now()-rankingAttempt>=10000)loadRankings(true);
  if(view==='game'&&tab==='event'&&eventPage==='fishing'&&!modal.open&&!fishingRequest&&Date.now()-(fishingUI.bossLoadedAt||0)>=(liveBoss()?20000:180000)){fishingUI.bossLoadedAt=Date.now();command('fishBossStatus',{},true).catch(()=>{});return;}
  if(view==='game'&&tab==='event'&&eventPage==='fishing'&&fishingUI.sheet==='records'&&!modal.open&&Date.now()-(fishingUI.recordsLoadedAt||0)>=20000){fishingUI.recordsLoadedAt=Date.now();command('fishRecordList',{},true).catch(()=>{});return;}
  // Measure from dispatch so response latency does not lengthen each combat second.
  if(state.battle?.kind==='boss'){
    if(Date.now()-lastBattleRequestAt>=1000)command("sync",{},true).catch(()=>{});
    return;
  }
  const partyLobbyOpen = false;
  const due = state.coopRoom&&coopRoom?.status==='waiting'?2000:state.partyRoom || state.battle ? 3000 : partyLobbyOpen ? 8000 : tab === "hunt" ? 10000 : 30000;
  if(view==='game'&&tab==='investment'){updateInvestmentClock(investmentData,investmentLoadedAt);const due=!investmentData||Date.parse(investmentData.serverNow)+(Date.now()-investmentLoadedAt)>=Date.parse(investmentData.nextAt);if(due||Date.now()-investmentLoadedAt>30000){command('investList',{},true).catch(()=>{});return;}}
  if(view==='game'&&tab==='event'&&eventPage==='lotto'&&Date.now()-lottoLoadedAt>30000){command('lottoList',{},true).catch(()=>{});return;}
  if (Date.now() - lastSync > due) command("sync", {}, true).catch(() => {});
}, 250);
function strike(arena, frame = null, silent = false) {
  if(!silent)sounds.play(state.classId+"-attack");
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
    const hp=recovering?0:p.pet?fieldPetHP(p.hp,incoming,fightTime):Math.max(0,p.hp-Math.floor(fightTime/rate.enemyInterval)*incoming);
    const enemyHp=defeated?0:Math.max(1,st.hp-rate.damagePerHit*Math.floor(fightTime/rate.attackInterval));
    const bar=$("#enemy-hp");
    if(bar)bar.style.width=(100*enemyHp/st.hp)+"%";
    const ownBar=$("#field-player-bar");
    if(ownBar)ownBar.style.width=(100*hp/p.hp)+"%";
    const ownLabel=$("#field-player-hp");
    if(ownLabel)ownLabel.textContent="내 HP "+fmt(hp)+" / "+fmt(p.hp);
    let petStatus=arena.querySelector('.field-pet-status');
    if(p.pet){
      if(!petStatus){petStatus=document.createElement('small');petStatus.className='field-pet-status';arena.querySelector('.combat-status')?.append(petStatus);}
      const heal=fieldPetVisual(p.hp,incoming,fightTime,defeated);
      const recent=!recovering&&heal.healAt!==null&&fightTime-heal.healAt<1.5&&heal.amount>0;
      petStatus.textContent=recovering?'루미 · 부활 대기':defeated?'루미 · 처치 완료! 쿨타임 초기화 · 회복 준비 완료':recent?'루미 +'+fmt(heal.amount)+' HP 회복':heal.healAt===null?'루미 · 체력 8% 감소 시 회복':'루미 · 회복 +'+fmt(heal.amount)+' HP · 쿨타임 '+Math.ceil(heal.readyIn)+'초';
      if(defeated||progress<Number(arena.dataset.petProgress||0))delete arena.dataset.petHealAt;
      arena.dataset.petProgress=String(progress);
      if(recent&&arena.dataset.petHealAt!==String(heal.healAt)){
        arena.dataset.petHealAt=String(heal.healAt);
        const number=document.createElement('span');number.className='field-pet-heal-number';number.textContent='루미 +'+fmt(heal.amount)+' HP';arena.append(number);
        arena.classList.remove('field-pet-healing');void arena.offsetWidth;arena.classList.add('field-pet-healing');
        // Briefly show the damage before the simultaneous heal, then fill the bar.
        if(ownBar)ownBar.style.width=(100*heal.before/p.hp)+'%';
        if(ownLabel)ownLabel.textContent='내 HP '+fmt(heal.before)+' / '+fmt(p.hp);
        setTimeout(()=>{if(ownBar?.isConnected)ownBar.style.width=(100*hp/p.hp)+'%';if(ownLabel?.isConnected)ownLabel.textContent='내 HP '+fmt(hp)+' / '+fmt(p.hp);},180);
        setTimeout(()=>{number.remove();arena.classList.remove('field-pet-healing');},1400);
      }
    }else if(petStatus)petStatus.textContent='루미 미장착 · 가방 → 펫에서 장착';
    const status=$("#hunt-status");
    if(status)status.textContent=recovering?"부활 대기":defeated?"다음 몬스터 등장 대기":"자동 전투 중";
    const result=$("#field-combat-result");
    if(result)result.textContent=recovering?"패배 · "+Math.ceil(rate.seconds-progress)+"초 후 자동 재도전 · 처치 보상 없음":defeated?"처치 완료 · 다음 전투 준비":"공격 1초 · 피격 1.5초 · HP가 0이면 패배";
    const label=$("#battle-info");
    if(label)label.textContent="몬스터 HP "+fmt(enemyHp)+" / "+fmt(st.hp);
    if (!recovering && !defeated && Date.now()-lastVisualHit>=rate.attackInterval*1000) { lastVisualHit=Date.now(); strike(arena,null,true); } // 2026-11-05 도현: 사냥터 타격음 없음

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
 document.querySelectorAll('.regular-combat-skills [data-skill-slot]').forEach(button=>{
  const {disabled,status}=combatSkillState(Number(button.dataset.skillSlot),party,tick);
  button.disabled=disabled;
  const label=button.querySelector('[data-skill-status]');
  if(label&&label.textContent!==status)label.textContent=status;
 });
}
function unavailable() {
  app.innerHTML='<div class="login panel"><p class="eyebrow">링구 RPG</p><h2>잠시 연결을 기다리고 있어요</h2><p class="note">연결이 복구되면 저장된 모험을 이어갈 수 있어요.</p><div class="actions">'+btn("다시 연결","reconnect","","gold")+btn("로그인 복구","recoverLogin")+'</div></div>';
}
window.addEventListener("online",()=>{ if(session&&!coopController) command("sync",{},true).catch(()=>{}); });
window.addEventListener("offline",()=>{connectionLost=true;const banner=$("#connection-status");if(banner)banner.hidden=false;});
setInterval(()=>{const el=document.querySelector('[data-arena-countdown]');if(el){const remaining=Math.max(0,new Date(el.dataset.arenaCountdown).getTime()-Date.now());el.textContent=`${Math.floor(remaining/3600000)}시간 ${String(Math.floor(remaining%3600000/60000)).padStart(2,'0')}분`;}if(view==='arena'&&!['battle','result'].includes(arenaPage)&&arenaData&&Date.now()>=new Date(arenaData.nextRefreshAt).getTime()&&!busy)loadArena();},10000);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) sounds.pause();
  else {
    sounds.start();
    sounds.music();
    if (session&&!coopController) command("sync", {}, true).then(()=>{if(view==="game"&&tab==="hunt")requestAutoHunt();}).catch(() => {});
  }
});
installCurrencyIcons();
if (session) command("sync").catch(() => {});
else login();

installMenuIcons();





setInterval(()=>{if(!document.hidden)updatePetCountdown();},1000);
setInterval(()=>{if(state&&!document.hidden){updateLuckTimers(state);const bm=document.querySelector('[data-bm-end]');if(bm&&Date.now()>=Number(bm.dataset.bmEnd)&&!modal.open)render();}},1000);

document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-action=rankingProfile]')){e.preventDefault();e.target.click();}});
