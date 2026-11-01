// node rebirth/token-content.test.mjs
import assert from 'node:assert/strict';
import {initialState,execute} from './engine.mjs';
import {TOKEN_BOSS_STAGES,TOKEN_SHOP,tokenBossFinish,tokenTriesLeft,raceOdds,newRaceCard,RACE_RTP,TOKEN_CONTENT_OPEN} from './token-content.mjs';
let n=0;const ctx=(now,admin=false,random=Math.random)=>({now,random,uuid:()=>'u'+(++n),admin});
const t0=Date.UTC(2026,10,2,3);
const base=initialState('warrior','토큰',ctx(t0));
const run=(s,cmd,args,c)=>execute(s,cmd,args,c).state;

// 잠금: 공개 전에는 일반 유저 입장·교환·경마 불가
assert.equal(TOKEN_CONTENT_OPEN,false);
for(const [cmd,args] of [['tokenBossStart',{stage:1}],['tokenShopBuy',{id:'cube'}],['raceCard',{}],['raceBet',{cardId:1,lane:1,type:'win',bet:1}]])
 assert.throws(()=>execute(base,cmd,args,ctx(t0)),/TOKEN_LOCKED/,cmd);

// 단계 표: 10단계, 토큰 20,40,...,200, 60초, 체력·공격 단조 증가
assert.equal(TOKEN_BOSS_STAGES.length,10);
assert.deepEqual(TOKEN_BOSS_STAGES.map(t=>t.tokens),[20,40,60,80,100,120,140,160,180,200]);
assert.ok(TOKEN_BOSS_STAGES.every((t,i)=>t.seconds===60&&(i===0||t.hp>TOKEN_BOSS_STAGES[i-1].hp&&t.attack>TOKEN_BOSS_STAGES[i-1].attack)));

// 관리자: 입장 → 60초 타임아웃 패배 → 토큰 0
let s=run(base,'tokenBossStart',{stage:3},ctx(t0,true));
assert.equal(s.battle.tokenStage,3);assert.equal(s.battle.enemyHp,TOKEN_BOSS_STAGES[2].hp);
let r=execute(s,'sync',{},ctx(t0+61000,true));
assert.equal(r.state.battle,null);const ev=r.events.find(e=>e.type==='tokenBoss');assert.equal(ev.won,false);assert.equal(ev.tokens,0);

// 승리 처리: 체력을 0으로 만든 뒤 한 틱 진행 → 토큰 지급
s=run(base,'tokenBossStart',{stage:10},ctx(t0,true));s.battle.enemyHp=1;s.battle.won=true;s.battle.ended=true;
r=execute(s,'sync',{},ctx(t0+1000,true));
const win=r.events.find(e=>e.type==='tokenBoss');assert.equal(win.won,true);assert.equal(win.tokens,200);assert.equal(r.state.tokens,200);
// 일반 유저: 실패·나가기는 도전 횟수 차감 없음, 처치했을 때만 1회 차감
{const u={isAdmin:false,tokens:0},b3={tokenStage:3,tick:600,won:false,reason:'timeout'};
 tokenBossFinish(u,b3,t0);tokenBossFinish(u,{...b3,reason:'leave'},t0);assert.equal(tokenTriesLeft(u,t0),2);
 tokenBossFinish(u,{...b3,won:true,tick:300},t0);assert.equal(tokenTriesLeft(u,t0),1);assert.equal(u.tokens,60);
 tokenBossFinish(u,{...b3,won:true,tick:300},t0);assert.equal(tokenTriesLeft(u,t0),0);}

// 교환소: 토큰 차감·지급·일일 한도
s=r.state;s.tokens=1000;
s=run(s,'tokenShopBuy',{id:'cube',quantity:5},ctx(t0,true));assert.equal(s.tokens,995);
s=run(s,'tokenShopBuy',{id:'companionTicket',quantity:10},ctx(t0,true));assert.equal(s.companions.tickets>=10,true);
assert.throws(()=>execute(s,'tokenShopBuy',{id:'companionTicket'},ctx(t0,true)),/TOKEN_DAILY_LIMIT/);
// 다음 날 00시(한국)가 지나면 한도가 초기화된다
s=run(s,'tokenShopBuy',{id:'companionTicket'},ctx(t0+24*3600e3,true));
s=run(s,'tokenShopBuy',{id:'treasureTicket',quantity:2},ctx(t0,true));assert.equal(s.treasure.tickets>=2,true);
s=run(s,'tokenShopBuy',{id:'luckPotion'},ctx(t0,true));assert.equal(s.consumables.luckPotion>=1,true);
s=run(s,'tokenShopBuy',{id:'diamond',quantity:3},ctx(t0,true));
assert.ok(TOKEN_SHOP.length>=15);

// 경마: 배당 = 0.9 / 실제확률(소수 첫째 자리 내림) → 환급률 ≤ 90%
for(let k=0;k<200;k++){const c=newRaceCard(Math.random);const pw=c.horses.map(h=>h.power),o=raceOdds(pw);
 assert.ok(Math.abs(o.reduce((a,x)=>a+x.winChance,0)-1)<1e-9);assert.ok(Math.abs(o.reduce((a,x)=>a+x.placeChance,0)-2)<1e-9);
 for(const x of o){if(x.win>1.1)assert.ok(x.win*x.winChance<=RACE_RTP+1e-9);if(x.place>1.1)assert.ok(x.place*x.placeChance<=RACE_RTP+1e-9);}}
// 몬테카를로: 실제 굴림이 표시 확률과 맞는지 (같은 카드 20만 번)
s=run(s,'raceCard',{},ctx(t0,true));const card=s.race.card;
let wins=0,places=0,N=20000;const fav=card.horses.reduce((a,h)=>h.power>a.power?h:a);
let st=s;for(let i=0;i<N;i++){const x=structuredClone(st);x.race.card=card;x.tokens=100;const e=execute(x,'raceBet',{cardId:card.id,lane:fav.lane,type:'win',bet:1},ctx(t0,true)).events.find(e=>e.type==='raceResult');if(e.rank===1)wins++;if(e.rank<=2)places++;}
assert.ok(Math.abs(wins/N-fav.winChance)<.015,`win ${wins/N} vs ${fav.winChance}`);
assert.ok(Math.abs(places/N-fav.placeChance)<.015,`place ${places/N} vs ${fav.placeChance}`);
assert.throws(()=>execute(st,'raceBet',{cardId:card.id+1,lane:1,type:'win',bet:1},ctx(t0,true)),/RACE_CARD_CHANGED/);
console.log('token content ok',{favWin:fav.winChance.toFixed(3),odds:fav.win});
