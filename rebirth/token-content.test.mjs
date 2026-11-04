// node rebirth/token-content.test.mjs
import assert from 'node:assert/strict';
import {initialState,execute} from './engine.mjs';
import {TOKEN_BOSS_STAGES,TOKEN_SHOP,tokenBossFinish,tokenTriesLeft,raceOdds,newRaceCard,RACE_RTP,TOKEN_CONTENT_OPEN} from './token-content.mjs';
let n=0;const ctx=(now,admin=false,random=Math.random)=>({now,random,uuid:()=>'u'+(++n),admin});
const t0=Date.UTC(2026,10,2,3);
const base=initialState('warrior','토큰',ctx(t0));
const run=(s,cmd,args,c)=>execute(s,cmd,args,c).state;

// 2026-11-02 전체 공개: 일반 유저 기준 전체 흐름
assert.equal(TOKEN_CONTENT_OPEN,true);
{
 let u=structuredClone(base);
 // 1단계만 열림, 2단계는 잠김
 assert.throws(()=>execute(u,'tokenBossStart',{stage:2},ctx(t0)),/TOKEN_STAGE_LOCKED/);
 assert.throws(()=>execute(u,'tokenBossStart',{stage:0},ctx(t0)),/INVALID_TOKEN_STAGE/);
 assert.throws(()=>execute(u,'tokenBossStart',{stage:11},ctx(t0)),/INVALID_TOKEN_STAGE/);
 // 시간 초과 실패: 토큰 0, 횟수 그대로
 u=run(u,'tokenBossStart',{stage:1},ctx(t0));assert.equal(u.battle.tokenStage,1);assert.equal(u.battle.enemyHp,TOKEN_BOSS_STAGES[0].hp);
 assert.throws(()=>execute(u,'tokenBossStart',{stage:1},ctx(t0)),/BATTLE_IN_PROGRESS/);
 assert.throws(()=>execute(u,'tokenShopBuy',{id:'luckPotion'},ctx(t0)),/BATTLE_IN_PROGRESS/);
 let r=execute(u,'sync',{},ctx(t0+61000));u=r.state;
 assert.equal(u.battle,null);assert.equal(r.events.find(e=>e.type==='tokenBoss').tokens,0);assert.equal(tokenTriesLeft(u,t0),2);
 // 나가기: 토큰 0, 횟수 그대로
 u=run(u,'tokenBossStart',{stage:1},ctx(t0+62000));r=execute(u,'towerLeave',{},ctx(t0+63000));u=r.state;
 assert.equal(u.battle,null);assert.equal(r.events.find(e=>e.type==='tokenBoss').reason,'leave');assert.equal(tokenTriesLeft(u,t0),2);assert.equal(u.tokens||0,0);
 // 처치: 토큰 지급, 1회 차감, 2단계 열림, 탑 보상·층 기록은 안 생김
 const towerBefore=JSON.stringify(u.tower||null),goldBefore=u.gold;
 u=run(u,'tokenBossStart',{stage:1},ctx(t0+64000));u.battle.enemyHp=1;u.battle.won=true;u.battle.ended=true;
 r=execute(u,'sync',{},ctx(t0+65000));u=r.state;
 assert.equal(u.tokens,TOKEN_BOSS_STAGES[0].tokens);assert.equal(tokenTriesLeft(u,t0),1);assert.equal(JSON.stringify(u.tower||null),towerBefore);assert.ok(u.gold>=goldBefore);
 assert.equal(r.events.filter(e=>e.type==='tokenBoss').length,1);
 // 같은 결과로 다시 sync해도 두 번 지급되지 않음
 const again=execute(u,'sync',{},ctx(t0+66000));assert.equal(again.state.tokens,u.tokens);
 // 2단계 처치 → 횟수 소진 → 입장 불가
 u=run(u,'tokenBossStart',{stage:2},ctx(t0+67000));u.battle.enemyHp=1;u.battle.won=true;u.battle.ended=true;u=run(u,'sync',{},ctx(t0+68000));
 assert.equal(u.tokens,TOKEN_BOSS_STAGES[0].tokens+TOKEN_BOSS_STAGES[1].tokens);assert.equal(tokenTriesLeft(u,t0),0);
 assert.throws(()=>execute(u,'tokenBossStart',{stage:1},ctx(t0+69000)),/TOKEN_DAILY_LIMIT/);
 // 다음 날 00시(한국) 지나면 2회 복구, 최고 기록은 유지
 const tomorrow=t0+24*3600e3;assert.equal(tokenTriesLeft(u,tomorrow),2);
 u=run(u,'tokenBossStart',{stage:3},ctx(tomorrow));assert.equal(u.battle.tokenStage,3);u=run(u,'towerLeave',{},ctx(tomorrow+1000));
 // 교환소·경마도 일반 유저 사용 가능, 토큰 부족 검사
 u=run(u,'tokenShopBuy',{id:'luckPotion',quantity:1},ctx(tomorrow));
 assert.throws(()=>execute(u,'tokenShopBuy',{id:'rerollStone'},ctx(tomorrow)),/NOT_ENOUGH_TOKENS/);
 assert.throws(()=>execute(u,'tokenShopBuy',{id:'luckPotion',quantity:0},ctx(tomorrow)),/INVALID_QUANTITY/);
 u=run(u,'raceCard',{},ctx(tomorrow));const card=u.race.card;
 assert.throws(()=>execute(u,'raceBet',{cardId:card.id,lane:1,type:'win',bet:101},ctx(tomorrow)),/INVALID_RACE_AMOUNT/);
 assert.throws(()=>execute(u,'raceBet',{cardId:card.id+1,lane:1,type:'win',bet:1},ctx(tomorrow)),/RACE_CARD_CHANGED/);
 const before=u.tokens;u=run(u,'raceBet',{cardId:card.id,lane:1,type:'place',bet:5},ctx(tomorrow));assert.ok(u.tokens===before-5||u.tokens>before-5);assert.equal(u.race.played,1);
 // 하루 30판 제한
 u.race.played=30;assert.throws(()=>execute(u,'raceBet',{cardId:u.race.card.id,lane:1,type:'win',bet:1},ctx(tomorrow)),/RACE_DAILY_LIMIT/);
 // 관리자 아님: 매 요청 isAdmin=false로 재계산
 assert.equal(u.isAdmin,false);
}

// 단계 표: 10단계, 토큰 20,40,80부터 1.5배, 60초, 체력·공격 단조 증가
assert.equal(TOKEN_BOSS_STAGES.length,10);
assert.deepEqual(TOKEN_BOSS_STAGES.map(t=>t.tokens),[20,40,80,120,180,270,400,600,900,1200]);
assert.ok(TOKEN_BOSS_STAGES.every((t,i)=>t.seconds===60&&(i===0||t.hp>TOKEN_BOSS_STAGES[i-1].hp&&t.attack>TOKEN_BOSS_STAGES[i-1].attack)));

// 관리자: 입장 → 60초 타임아웃 패배 → 토큰 0
let s=run(base,'tokenBossStart',{stage:3},ctx(t0,true));
assert.equal(s.battle.tokenStage,3);assert.equal(s.battle.enemyHp,TOKEN_BOSS_STAGES[2].hp);
let r=execute(s,'sync',{},ctx(t0+61000,true));
assert.equal(r.state.battle,null);const ev=r.events.find(e=>e.type==='tokenBoss');assert.equal(ev.won,false);assert.equal(ev.tokens,0);

// 승리 처리: 체력을 0으로 만든 뒤 한 틱 진행 → 토큰 지급
s=run(base,'tokenBossStart',{stage:10},ctx(t0,true));s.battle.enemyHp=1;s.battle.won=true;s.battle.ended=true;
r=execute(s,'sync',{},ctx(t0+1000,true));
const win=r.events.find(e=>e.type==='tokenBoss');assert.equal(win.won,true);assert.equal(win.tokens,1200);assert.equal(r.state.tokens,1200);
// 일반 유저: 실패·나가기는 도전 횟수 차감 없음, 처치했을 때만 1회 차감
{const u={isAdmin:false,tokens:0},b3={tokenStage:3,tick:600,won:false,reason:'timeout'};
 tokenBossFinish(u,b3,t0);tokenBossFinish(u,{...b3,reason:'leave'},t0);assert.equal(tokenTriesLeft(u,t0),2);
 tokenBossFinish(u,{...b3,won:true,tick:300},t0);assert.equal(tokenTriesLeft(u,t0),1);assert.equal(u.tokens,80);
 tokenBossFinish(u,{...b3,won:true,tick:300},t0);assert.equal(tokenTriesLeft(u,t0),0);}

// 교환소: 토큰 차감·지급·일일 한도
s=r.state;s.tokens=3000;
s=run(s,'tokenShopBuy',{id:'luckPotion',quantity:5},ctx(t0,true));assert.equal(s.tokens,2800);
// 2026-11-05: 동료·픽업 소환권 교환소 제외
assert.throws(()=>execute(s,'tokenShopBuy',{id:'companionTicket'},ctx(t0,true)),/INVALID_TOKEN_ITEM/);assert.throws(()=>execute(s,'tokenShopBuy',{id:'pickupTicket'},ctx(t0,true)),/INVALID_TOKEN_ITEM/);
s=run(s,'tokenShopBuy',{id:'treasureTicket',quantity:2},ctx(t0,true));assert.equal(s.treasure.tickets>=2,true);
s=run(s,'tokenShopBuy',{id:'luckPotion'},ctx(t0,true));assert.equal(s.consumables.luckPotion>=1,true);
assert.throws(()=>execute(s,'tokenShopBuy',{id:'diamond'},ctx(t0,true)),/INVALID_TOKEN_ITEM/);
assert.ok(TOKEN_SHOP.length>=4);assert.ok(!TOKEN_SHOP.some(o=>o.id==='gold'));assert.ok(!TOKEN_SHOP.some(o=>['cube','highCube','addCube','scroll','potentialLock','bonusFlame'].includes(o.id)));assert.ok(!TOKEN_SHOP.some(o=>o.id==='fragment'));

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
// 재련석: 주 3개 (일일 한도 아님)
{const {TOKEN_SHOP:SHOP}=await import('./token-content.mjs');const st=SHOP.find(o=>o.id==='rerollStone');assert.equal(st.weekly,3);assert.equal(st.daily,undefined);
 const mon=Date.UTC(2026,10,1,15,30);// 11/2(월) 00:30 KST
 let w=structuredClone(base);w.tokens=5000;const C=(t)=>({now:t,random:Math.random,uuid:()=>'w'+(++n),admin:false});
 w=execute(w,'tokenShopBuy',{id:'rerollStone',quantity:2},C(mon)).state;
 w=execute(w,'tokenShopBuy',{id:'rerollStone'},C(mon+2*86400e3)).state;// 수요일
 assert.throws(()=>execute(w,'tokenShopBuy',{id:'rerollStone'},C(mon+5*86400e3)),/TOKEN_WEEKLY_LIMIT/);// 토요일
 w=execute(w,'tokenShopBuy',{id:'rerollStone',quantity:3},C(mon+7*86400e3)).state;// 다음 월요일
 assert.equal(w.tokens,5000-800*6);}
console.log('reroll weekly ok');
