// node rebirth/key-dungeon.test.mjs — 2026-11-03 열쇠 던전 · Lv.300 이후 사냥터 · 교환소 프라임 큐브 제외
import assert from 'node:assert/strict';
import {initialState,execute,huntingRate} from './engine.mjs';
import {KEY_BOSS_STAGES,KEY_BOSS_REWARDS,keyTriesLeft} from './key-dungeon.mjs';
import {TOKEN_BOSS_STAGES,TOKEN_SHOP,tokenTriesLeft} from './token-content.mjs';
import {REGIONS,STAGES,BOSSES} from './data.mjs';
import {CHAPTERS_310} from './chapters-300.mjs';
let n=0;const ctx=now=>({now,random:Math.random,uuid:()=>'k'+(++n)});
const t0=Date.UTC(2026,10,3,3);
const run=(s,cmd,args,c)=>execute(s,cmd,args,c).state;

// 열쇠 던전: 토큰 던전과 같은 체력·공격력, 보상은 던전 열쇠
assert.equal(KEY_BOSS_STAGES.length,10);
KEY_BOSS_STAGES.forEach((k,i)=>{assert.equal(k.hp,TOKEN_BOSS_STAGES[i].hp);assert.equal(k.attack,TOKEN_BOSS_STAGES[i].attack);assert.equal(k.keys,KEY_BOSS_REWARDS[i]);});
{
 let u=initialState('warrior','열쇠',ctx(t0));u.materials.dungeonKey=0;
 assert.throws(()=>execute(u,'keyBossStart',{stage:2},ctx(t0)),/KEY_STAGE_LOCKED/);
 assert.throws(()=>execute(u,'keyBossStart',{stage:11},ctx(t0)),/INVALID_KEY_STAGE/);
 // 실패: 열쇠 0, 횟수 그대로, 토큰 던전 기록도 그대로
 u=run(u,'keyBossStart',{stage:1},ctx(t0));assert.equal(u.battle.keyStage,1);assert.equal(u.battle.enemyHp,KEY_BOSS_STAGES[0].hp);
 let r=execute(u,'sync',{},ctx(t0+61000));u=r.state;
 assert.equal(u.battle,null);assert.equal(r.events.find(e=>e.type==='keyBoss').keys,0);assert.equal(keyTriesLeft(u,t0),2);assert.equal(r.events.some(e=>e.type==='tokenBoss'),false);
 // 처치: 열쇠 지급, 1회 차감, 토큰·토큰 횟수는 그대로
 u=run(u,'keyBossStart',{stage:1},ctx(t0+62000));u.battle.enemyHp=1;u.battle.won=true;u.battle.ended=true;
 r=execute(u,'sync',{},ctx(t0+63000));u=r.state;
 assert.equal(u.materials.dungeonKey,KEY_BOSS_REWARDS[0]);assert.equal(keyTriesLeft(u,t0),1);assert.equal(u.tokens||0,0);assert.equal(tokenTriesLeft(u,t0),2);
 u=run(u,'keyBossStart',{stage:2},ctx(t0+64000));u.battle.enemyHp=1;u.battle.won=true;u.battle.ended=true;u=run(u,'sync',{},ctx(t0+65000));
 assert.equal(u.materials.dungeonKey,KEY_BOSS_REWARDS[0]+KEY_BOSS_REWARDS[1]);assert.equal(keyTriesLeft(u,t0),0);
 assert.throws(()=>execute(u,'keyBossStart',{stage:1},ctx(t0+66000)),/KEY_DAILY_LIMIT/);
 // 토큰 던전은 따로 도전 가능
 u=run(u,'tokenBossStart',{stage:1},ctx(t0+67000));assert.equal(u.battle.keyStage,undefined);
 assert.equal(keyTriesLeft(u,t0+24*3600e3),2);
}

// 교환소에서 프라임 큐브 제외
assert.equal(TOKEN_SHOP.some(o=>o.id==='primeCube'||o.key==='primeCube'),false);

// Lv.300 이후 사냥터 4지역 · 12필드, 챕터 보스는 추가되지 않음
assert.equal(CHAPTERS_310.length,4);
for(const c of CHAPTERS_310){const r=REGIONS.find(x=>x.id===c.id);assert.ok(r,c.name);const st=STAGES.filter(s=>s.region===c.id);assert.equal(st.length,3);for(const s of st)assert.ok(s.level>300&&s.hp>0&&s.gold>0);}
assert.equal(BOSSES.some(b=>b.level>300),false);
const after=STAGES.filter(s=>s.level>300);for(let i=1;i<after.length;i++)assert.ok(after[i].hp>after[i-1].hp&&after[i].gold>after[i-1].gold);
{const u=initialState('warrior','사냥',ctx(t0));u.level=300;u.stage=after.at(-1).id;const r=huntingRate(u);assert.ok(r.seconds>0);}
console.log('PASS key dungeon, post-300 fields, token shop without prime cube');
