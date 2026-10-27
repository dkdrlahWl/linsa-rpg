import assert from 'node:assert/strict';
import {initialState,execute} from './engine.mjs';
import {COMPANIONS,COMPANION_GRADE_RATES,rollCompanion,slotAccrued,companionRate,COMPANION_CAP_MS} from './companion-model.mjs';

let seed=7;const random=()=>((seed=(seed*1103515245+12345)%2147483648)/2147483648);
let now=Date.UTC(2026,9,27,3);
const ctx=()=>({now,random,uuid:()=>crypto.randomUUID()});
let s=initialState('warrior','테스터',ctx());
const run=(cmd,args={})=>{const r=execute(s,cmd,args,ctx());s=r.state;return r.events.find(e=>e.type?.startsWith('companion'));};

// 확률 합 1, 18종, 범위 정상
assert.equal(Math.round(Object.values(COMPANION_GRADE_RATES).reduce((a,b)=>a+b,0)*1e9),1e9);
assert.equal(COMPANIONS.length,18);
// 등급 분포 대략 확인
const tally={};for(let i=0;i<200000;i++){const c=rollCompanion(random,i);const g=COMPANIONS.find(x=>x.id===c.c).grade;tally[g]=(tally[g]||0)+1;const d=COMPANIONS.find(x=>x.id===c.c);assert(c.r>=d.min&&c.r<=d.max);}
for(const [g,p] of Object.entries(COMPANION_GRADE_RATES))assert(Math.abs(tally[g]/200000-p)<.01,g);

// 소환권 없으면 실패
assert.throws(()=>run('companionSummon',{count:1}),/COMPANION_NO_TICKET/);
s.companions={tickets:7};
assert.equal(run('companionSummon',{count:5}).cards.length,5);
assert.equal(s.companions.tickets,2);
assert.throws(()=>run('companionSummon',{count:5}),/COMPANION_NO_TICKET/);

// 배치 → 8시간 상한
const card=s.companions.cards[0];
run('companionPlace',{slot:0,id:card.i});
assert.throws(()=>run('companionPlace',{slot:1,id:card.i}),/ALREADY_PLACED/);
const gold0=s.gold;now+=10*3600e3;
const claim=run('companionClaim',{slot:0});
const base=Math.floor(companionRate(card,0)*480);
if(card.t==='gold')assert(claim.gold===base||claim.gold===base*2);
assert(claim.gold>0&&s.gold>=gold0+claim.gold);

// 최고 조합: S1 최상옵 골드형 40% 3장 → 8시간 약 1,000만
const top={i:1,c:'s1',r:5000,t:'gold',v:40,s:1};
assert.equal(slotAccrued(top,{placedAt:0,claimedAt:0},COMPANION_CAP_MS)*3,10080000);
assert.equal(slotAccrued({...top,s:5},{placedAt:0,claimedAt:0},COMPANION_CAP_MS)*3,16128000);
// 성장형: 첫 1시간 +0%, 2시간째 +10%
const g={i:2,c:'s1',r:5000,t:'growth',v:50,s:1};
assert.equal(slotAccrued(g,{placedAt:0,claimedAt:0},2*3600e3),5000*60+5500*60);

// 합성: 같은 캐릭터 카드 만들어서 ★1→★2(1장), ★2→★3(2장)
s.companions.cards.push({i:900,c:'f1',r:60,t:'gold',v:20,s:1},{i:901,c:'f1',r:70,t:'gold',v:20,s:1},{i:902,c:'f1',r:70,t:'gold',v:20,s:1},{i:903,c:'f1',r:70,t:'gold',v:20,s:1},{i:904,c:'f2',r:90,t:'gold',v:20,s:1});
assert.throws(()=>run('companionMerge',{id:900,materials:[904]}),/MISMATCH/);
assert.throws(()=>run('companionMerge',{id:900,materials:[901,902]}),/MERGE_COUNT/);
assert.equal(run('companionMerge',{id:900,materials:[901]}).star,2);
assert.equal(run('companionMerge',{id:900,materials:[902,903]}).star,3);
assert(!s.companions.cards.some(x=>[901,902,903].includes(x.i)));

// 판매: 배치 중 불가, 일반은 골드 지급
assert.throws(()=>run('companionSell',{ids:[card.i]}),/COMPANION_PLACED/);
const before=s.gold;const sold=run('companionSell',{ids:[904]});
assert.equal(sold.gold,3000);assert.equal(s.gold,before+3000);

// 빼면 자동 수령
now+=3600e3;const un=run('companionUnplace',{slot:0});
assert(un.claim.gold>0);assert.equal(s.companions.slots[0],null);
console.log('PASS companion: rates, tickets, 8h cap, top combo 1,008만, growth, merge, sell, unplace auto-claim');
