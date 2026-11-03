// 2026-11-03 도현: 열쇠 던전 — 토큰 던전과 같은 방식(파밍 보스 10단계 · 하루 2회 · 60초).
// 단계별 체력·공격력·패턴은 토큰 던전과 동일하고, 보상만 토큰 대신 던전 열쇠.
// 도전 횟수는 토큰 던전과 따로 센다. 처치했을 때만 1회 차감(실패·나가기는 차감 없음).
import {TOKEN_BOSS_STAGES} from './token-content.mjs';

export const KEY_DAILY_TRIES=2;
export const KEY_BOSS_SECONDS=60;
// 열쇠 1개 ≈ 토큰 50개. 10단계 2회면 하루 30개.
export const KEY_BOSS_REWARDS=Object.freeze([1,2,3,4,5,6,8,10,12,15]);
export const KEY_BOSS_NAME='철쇄 열쇠지기 카르둠';
export const KEY_BOSS_ART='chain-judge';
export const KEY_BOSS_IMAGE='tower/boss-chain-judge.webp';
export const KEY_BOSS_STAGES=Object.freeze(TOKEN_BOSS_STAGES.map((t,i)=>Object.freeze({
 stage:t.stage,floor:t.floor,name:KEY_BOSS_NAME,art:KEY_BOSS_ART,level:t.level,hp:t.hp,attack:t.attack,seconds:KEY_BOSS_SECONDS,
 keys:KEY_BOSS_REWARDS[i],pattern:t.pattern,guide:t.guide,
})));

const dayKey=now=>new Date(now+9*3600e3).toISOString().slice(0,10);
const check=(ok,code)=>{if(!ok)throw new Error(code);};
export const keyCount=s=>Math.max(0,Number(s?.materials?.dungeonKey)||0);
export function keyDaily(s,now){
 const day=dayKey(now);
 if(s.keyBoss?.day!==day)s.keyBoss={...(s.keyBoss||{}),day,tries:0};
 s.keyBoss.best=Number.isInteger(s.keyBoss.best)?s.keyBoss.best:0;
 return s.keyBoss;
}
export const keyTriesLeft=(s,now)=>{const d=s.keyBoss?.day===dayKey(now)?s.keyBoss.tries||0:0;return s?.isAdmin?KEY_DAILY_TRIES:Math.max(0,KEY_DAILY_TRIES-d);};
export const keyStageOpen=(s,stage)=>s?.isAdmin===true||stage<=Math.min(10,(s?.keyBoss?.best||0)+1);

// 토큰 던전과 같은 탑 전투를 쓰므로 tokenStage도 함께 붙인다(탑 규칙이 보스 전투로 인식). keyStage가 있으면 열쇠 던전.
export function keyBossEnter(s,stage,now){
 check(Number.isInteger(stage)&&stage>=1&&stage<=KEY_BOSS_STAGES.length,'INVALID_KEY_STAGE');
 check(keyStageOpen(s,stage),'KEY_STAGE_LOCKED');
 const d=keyDaily(s,now);
 check(s.isAdmin||d.tries<KEY_DAILY_TRIES,'KEY_DAILY_LIMIT');
 const t=KEY_BOSS_STAGES[stage-1];
 return {keyStage:stage,tokenStage:stage,floor:t.floor,enemyHp:t.hp,encounter:{name:t.name+' · '+stage+'단계',art:t.art,level:t.level,hp:t.hp,attack:t.attack,seconds:t.seconds,pattern:t.pattern,guide:t.guide}};
}
export function keyBossFinish(s,b,now){
 const stage=b.keyStage,t=KEY_BOSS_STAGES[stage-1],won=!!b.won;
 const reward={type:'keyBoss',stage,won,keys:0,seconds:b.tick/10,reason:b.reason||''};
 if(won){
  reward.keys=t.keys;s.materials=s.materials||{};s.materials.dungeonKey=keyCount(s)+t.keys;
  const d=keyDaily(s,now);if(!s.isAdmin)d.tries=(d.tries||0)+1;d.best=Math.max(d.best||0,stage);reward.best=d.best;
 }
 reward.total=keyCount(s);
 return reward;
}
