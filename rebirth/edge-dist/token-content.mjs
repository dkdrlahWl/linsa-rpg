// 2026-11-01 토큰 콘텐츠: 토큰 던전(파밍 보스 10단계, 하루 2회, 60초) · 토큰 교환소 · 토큰 경마.
// 아직 공개 전: TOKEN_CONTENT_OPEN=false 동안 일반 유저는 입장·교환·경마 모두 막히고 관리자만 시험할 수 있다.
export const TOKEN_CONTENT_OPEN=true; // 2026-11-02 도현: 전체 유저 공개
export const TOKEN_MAX=9_999_999;
export const TOKEN_DAILY_TRIES=2;
export const TOKEN_BOSS_SECONDS=60;

// 단계 기준 (2026-11-01 도현): 1단계 = 시련의 탑 25층급, 2단계 = 27층급, 3단계 = 30층급, 그 뒤로 10단계까지 계속 상승.
// 각 단계는 해당 탑 층의 패턴·공격력을 그대로 쓰고, 제한이 90초→60초라 체력은 2/3 (같은 초당 딜이면 잡힘).
// 4~10단계: 왕좌의 탑 33·36·39·42·45·48·50층급. 토큰 보상은 TOKEN_BOSS_REWARDS.
import {TOWER_FLOORS} from './tower-model.mjs';
// 토큰 보상 (2026-11-02 도현): 1·2단계 20·40개 그대로, 3단계 80개부터 단계마다 약 1.5배(10단계 1,200개).
export const TOKEN_BOSS_REWARDS=Object.freeze([20,40,80,120,180,270,400,600,900,1200]);
export const TOKEN_BOSS_FLOORS=Object.freeze([25,27,30,33,36,39,42,45,48,50]);
export const TOKEN_BOSS_NAME='황금 금고지기 마몬';
export const TOKEN_BOSS_STAGES=Object.freeze(TOKEN_BOSS_FLOORS.map((floor,i)=>{const f=TOWER_FLOORS[floor-1];return Object.freeze({
 stage:i+1,floor,name:TOKEN_BOSS_NAME,art:'hourglass-colossus',level:f.level,
 hp:Math.round(f.hp*TOKEN_BOSS_SECONDS/f.seconds),attack:f.attack,seconds:TOKEN_BOSS_SECONDS,tokens:TOKEN_BOSS_REWARDS[i],pattern:f.pattern,
 guide:f.guide||'바닥 경고 문양과 돌진 경로를 피하면서 60초 안에 쓰러뜨리세요.',
 target:'시련의 탑 '+floor+'층급 (패턴·공격력 동일, 60초 기준 체력)',
});}));

const dayKey=now=>new Date(now+9*3600e3).toISOString().slice(0,10);
const fail=code=>{throw new Error(code);};
const check=(ok,code)=>{if(!ok)fail(code);};
export const tokenCount=s=>Number.isSafeInteger(s?.tokens)&&s.tokens>=0?s.tokens:0;
export const tokenOpenFor=s=>TOKEN_CONTENT_OPEN||s?.isAdmin===true;
export function tokenDaily(s,now){
 const day=dayKey(now);
 if(s.tokenBoss?.day!==day)s.tokenBoss={...(s.tokenBoss||{}),day,tries:0};
 s.tokenBoss.best=Number.isInteger(s.tokenBoss.best)?s.tokenBoss.best:0;
 return s.tokenBoss;
}
export const tokenTriesLeft=(s,now)=>{const d=s.tokenBoss?.day===dayKey(now)?s.tokenBoss.tries||0:0;return s?.isAdmin?TOKEN_DAILY_TRIES:Math.max(0,TOKEN_DAILY_TRIES-d);};
// 한 단계씩 깨야 다음 단계가 열린다. (관리자는 전부 열림)
export const tokenStageOpen=(s,stage)=>s?.isAdmin===true||stage<=Math.min(10,(s?.tokenBoss?.best||0)+1);

// 입장: 남은 도전이 있어야 입장할 수 있다. 횟수는 처치했을 때만 1회 차감(실패·나가기는 차감 없음, 2026-11-02 도현). 반환값은 tower 전투에 붙일 필드.
export function tokenBossEnter(s,stage,now){
 check(tokenOpenFor(s),'TOKEN_LOCKED');
 check(Number.isInteger(stage)&&stage>=1&&stage<=TOKEN_BOSS_STAGES.length,'INVALID_TOKEN_STAGE');
 check(tokenStageOpen(s,stage),'TOKEN_STAGE_LOCKED');
 const d=tokenDaily(s,now);
 check(s.isAdmin||d.tries<TOKEN_DAILY_TRIES,'TOKEN_DAILY_LIMIT');
 const t=TOKEN_BOSS_STAGES[stage-1];
 return {tokenStage:stage,floor:t.floor,enemyHp:t.hp,encounter:{name:t.name+' · '+stage+'단계',art:t.art,level:t.level,hp:t.hp,attack:t.attack,seconds:t.seconds,pattern:t.pattern,guide:t.guide}};
}
export function tokenBossFinish(s,b,now){
 const stage=b.tokenStage,t=TOKEN_BOSS_STAGES[stage-1],won=!!b.won;
 const reward={type:'tokenBoss',stage,won,tokens:0,seconds:b.tick/10,reason:b.reason||''};
 if(won){reward.tokens=t.tokens;s.tokens=Math.min(TOKEN_MAX,tokenCount(s)+t.tokens);const d=tokenDaily(s,now);if(!s.isAdmin)d.tries=(d.tries||0)+1;d.best=Math.max(d.best||0,stage);reward.best=d.best;}
 reward.total=tokenCount(s);
 return reward;
}

// ── 토큰 교환소 ──
// 기준: 토큰 1개 ≈ 20만 골드 가치. 하루 최대 400개(10단계 2회) · 1단계만 해도 하루 40개.
// 상점·암시장 골드 가격을 토큰으로 환산하고, 희귀한 것(재련석·소환권·티켓)은 일일 한도로 묶는다(매일 00시 초기화).
// 2026-11-02 도현: 동료·픽업 소환권 빼고 전부 가격 2배.
export const TOKEN_SHOP=Object.freeze([
 {id:'gold',name:'골드 100만',kind:'gold',amount:1000000,cost:10},
 {id:'cube',name:'레드 큐브',kind:'material',key:'cube',amount:1,cost:2},
 {id:'highCube',name:'블랙 큐브',kind:'material',key:'highCube',amount:1,cost:4},
 {id:'primeCube',name:'프라임 큐브',kind:'material',key:'primeCube',amount:1,cost:6},
 {id:'addCube',name:'에디셔널 큐브',kind:'material',key:'addCube',amount:1,cost:10},
 {id:'scroll',name:'잠재 해금 주문서',kind:'material',key:'scroll',amount:1,cost:10},
 {id:'potentialLock',name:'잠재 잠금석',kind:'material',key:'potentialLock',amount:1,cost:20},
 {id:'luckPotion',name:'행운 물약',kind:'potion',amount:1,cost:40},
 {id:'bonusFlame',name:'추가옵션 불꽃',kind:'material',key:'bonusFlame',amount:1,cost:50},
 {id:'dungeonKey',name:'던전 열쇠',kind:'material',key:'dungeonKey',amount:1,cost:50},
 {id:'treasureTicket',name:'보물찾기 티켓',kind:'treasureTicket',amount:1,cost:20,daily:30},
 {id:'companionTicket',name:'동료 소환권',kind:'companionTicket',amount:1,cost:40,daily:10},
 {id:'pickupTicket',name:'픽업 소환권',kind:'pickupTicket',amount:1,cost:60,daily:5},
 {id:'tribeTicket',name:'종족 주사위',kind:'tribeTicket',amount:1,cost:100,daily:5},
 {id:'rerollStone',name:'기본수치 재련석',kind:'material',key:'rerollStone',amount:1,cost:800,weekly:3},
].map(Object.freeze));
// 주간 한도는 월요일 00시(한국) 초기화. 일일 한도와 따로 센다.
const weekKey=now=>{const d=new Date(now+9*3600e3);d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d.toISOString().slice(0,10);};
export const tokenShopLimit=o=>o.weekly||o.daily||0;
export function tokenShopBought(s,id,now){const o=TOKEN_SHOP.find(x=>x.id===id);if(o?.weekly){const w=weekKey(now);return s.tokenShopWeek?.week===w?(s.tokenShopWeek.bought?.[id]||0):0;}const d=dayKey(now);return s.tokenShop?.day===d?(s.tokenShop.bought?.[id]||0):0;}
export function tokenShopBuy(s,args,now,deps){const {normalizeFishing,normalizeCompanions,normalizeTreasure}=deps;
 check(tokenOpenFor(s),'TOKEN_LOCKED');
 const offer=TOKEN_SHOP.find(o=>o.id===args?.id);check(offer,'INVALID_TOKEN_ITEM');
 const quantity=args.quantity===undefined?1:args.quantity;check(Number.isInteger(quantity)&&quantity>=1&&quantity<=999,'INVALID_QUANTITY');
 const d=dayKey(now);if(s.tokenShop?.day!==d)s.tokenShop={day:d,bought:{}};
 if(offer.daily)check((s.tokenShop.bought[offer.id]||0)+quantity<=offer.daily,'TOKEN_DAILY_LIMIT');
 const w=weekKey(now);if(offer.weekly){if(s.tokenShopWeek?.week!==w)s.tokenShopWeek={week:w,bought:{}};check((s.tokenShopWeek.bought[offer.id]||0)+quantity<=offer.weekly,'TOKEN_WEEKLY_LIMIT');}
 const cost=offer.cost*quantity;check(tokenCount(s)>=cost,'NOT_ENOUGH_TOKENS');
 const amount=offer.amount*quantity;
 if(offer.kind==='gold')s.gold=Math.min(9e12,s.gold+amount);
 else if(offer.kind==='material'){s.materials??={};s.materials[offer.key]=(s.materials[offer.key]||0)+amount;}
 else if(offer.kind==='potion')s.consumables={...s.consumables,luckPotion:Math.max(0,s.consumables?.luckPotion||0)+amount};
 else if(offer.kind==='diamond'){const f=normalizeFishing(s,now);f.diamonds=(f.diamonds||0)+amount;}
 else if(offer.kind==='companionTicket')normalizeCompanions(s).tickets+=amount;
 else if(offer.kind==='pickupTicket')normalizeCompanions(s).pickupTickets+=amount;
 else if(offer.kind==='tribeTicket'){const t=deps.normalizeTribe(s);t.tickets+=amount;}
 else if(offer.kind==='treasureTicket'){const t=normalizeTreasure(s,now);t.tickets=(t.tickets||0)+amount;}
 s.tokens=tokenCount(s)-cost;if(offer.weekly)s.tokenShopWeek.bought[offer.id]=(s.tokenShopWeek.bought[offer.id]||0)+quantity;else s.tokenShop.bought[offer.id]=(s.tokenShop.bought[offer.id]||0)+quantity;
 return {type:'tokenShopBuy',id:offer.id,name:offer.name,quantity,amount,cost,tokens:s.tokens};
}

// ── 토큰 경마 ──
// 6마리 · 말마다 컨디션(힘)이 다르고 배당은 그 힘으로 계산한 실제 확률 × 0.9 (환급률 90%, 10%는 토큰 소각).
// 경주 카드(말·배당)는 베팅 전에 서버가 미리 정해 보여주고, 순위는 베팅 순간 서버가 굴린다.
// 순서는 Plackett–Luce 방식: 남은 말 중에서 힘에 비례한 확률로 다음 순위를 하나씩 뽑는다.
export const RACE_HORSES=6;
export const RACE_RTP=.9;
export const RACE_MIN_BET=1,RACE_MAX_BET=100,RACE_DAILY=30;
export const HORSE_NAMES=['번개발굽','은빛갈기','붉은바람','달빛질주','폭풍심장','황금편자','흑요석','새벽별','천둥꼬리','들불','청람','구름발'];
export const RACE_BETS=Object.freeze({win:'단승 · 1등 맞추기',place:'연승 · 2등 안에 들기'});
function pickWeighted(weights,random){const total=weights.reduce((a,b)=>a+b,0);let r=random()*total;for(let i=0;i<weights.length;i++){r-=weights[i];if(r<0)return i;}return weights.length-1;}
// 정확한 확률: 1등 p_i, 2등 안 p_i + Σ_j p_j·w_i/(W-w_j)
export function raceOdds(power){
 const W=power.reduce((a,b)=>a+b,0),p=power.map(w=>w/W);
 const place=power.map((w,i)=>p[i]+power.reduce((sum,wj,j)=>j===i?sum:sum+p[j]*w/(W-wj),0));
 const pay=q=>Math.max(1.1,Math.floor(RACE_RTP/q*10)/10);
 return power.map((_,i)=>({win:pay(p[i]),place:pay(place[i]),winChance:p[i],placeChance:place[i]}));
}
export function newRaceCard(random,serial=0){
 const names=[...HORSE_NAMES];for(let i=names.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[names[i],names[j]]=[names[j],names[i]];}
 // 힘 1~10: 인기마 1~2마리, 중간, 다크호스가 섞이도록 분포를 넓게.
 const power=Array.from({length:RACE_HORSES},()=>Math.round((1+9*random()**1.6)*10)/10);
 const odds=raceOdds(power);
 return {id:serial+1,horses:power.map((p,i)=>({lane:i+1,name:names[i],power:p,...odds[i]}))};
}
export function raceState(s,now,random){
 const day=dayKey(now);
 s.race??={};if(s.race.day!==day){s.race.day=day;s.race.played=0;}
 if(!s.race.card)s.race.card=newRaceCard(random,s.race.serial||0);
 return s.race;
}
export function raceBet(s,args,now,random){
 check(tokenOpenFor(s),'TOKEN_LOCKED');
 const r=raceState(s,now,random);
 check(s.isAdmin||r.played<RACE_DAILY,'RACE_DAILY_LIMIT');
 check(args?.cardId===r.card.id,'RACE_CARD_CHANGED');
 const lane=args.lane,type=args.type,bet=args.bet;
 check(Number.isInteger(lane)&&lane>=1&&lane<=RACE_HORSES,'INVALID_RACE_LANE');
 check(type==='win'||type==='place','INVALID_RACE_BET');
 check(Number.isInteger(bet)&&bet>=RACE_MIN_BET&&bet<=RACE_MAX_BET,'INVALID_RACE_AMOUNT');
 check(tokenCount(s)>=bet,'NOT_ENOUGH_TOKENS');
 const card=r.card,left=card.horses.map((h,i)=>i),order=[];
 while(left.length){const k=pickWeighted(left.map(i=>card.horses[i].power),random);order.push(card.horses[left[k]].lane);left.splice(k,1);}
 const rank=order.indexOf(lane)+1,horse=card.horses[lane-1];
 const hit=type==='win'?rank===1:rank<=2,odds=horse[type],payout=hit?Math.floor(bet*odds):0;
 s.tokens=Math.min(TOKEN_MAX,tokenCount(s)-bet+payout);
 r.played++;r.serial=card.id;r.last={cardId:card.id,lane,type,bet,order,rank,hit,odds,payout};
 r.card=newRaceCard(random,card.id);
 return {type:'raceResult',card,lane,betType:type,bet,order,rank,hit,odds,payout,tokens:s.tokens,played:r.played};
}
