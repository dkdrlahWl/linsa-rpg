// node rebirth/exploration-tier8.test.mjs — 2026-11-02 링구의 탐험 8단계(220제)
import assert from 'node:assert/strict';
import {EXPLORATIONS,explorationStats,explorationPrevious,explorationKeys,explorationArt} from './exploration-data.mjs';
import {EXPLORATION_REWARDS,explorationGearLevelFor} from './exploration-reward-data.mjs';
import {grantExplorationChest} from './exploration-rewards.mjs';
import {initialState} from './engine.mjs';
import {bossTier} from './data.mjs';
import {existsSync} from 'node:fs';
const t=EXPLORATIONS[8],t7=EXPLORATIONS[7];assert.ok(t&&t.id===8&&t7&&t7.id===7);
assert.equal(explorationPrevious(8),7);assert.equal(explorationPrevious(7),6);assert.equal(explorationKeys(8),5);assert.equal(explorationKeys(7),4);
assert.ok(Math.abs(explorationStats(7,t7.floors,1,true).hp-7e8)<1e6,'7단계 1인 7억');
const solo=explorationStats(8,t.floors,1,true).hp;assert.ok(Math.abs(solo-1.75e9)<1e6,'1인 17.5억 '+solo);
assert.equal(explorationStats(8,t.floors,3,true).hp,solo*3,'인원수만큼');
for(const f of [t.map,'exploration/arena-8-196.webp','exploration/terrain-8-193.webp',explorationArt(8,0),explorationArt(8,1),explorationArt(8,2),explorationArt(8,3,true)])assert.ok(existsSync(new URL('./'+f,import.meta.url)),f);
const r=EXPLORATION_REWARDS[8];assert.equal(r.bossGear,.16);assert.equal(EXPLORATION_REWARDS[7].bossGear,.14);
// 판당 200제 확률이 단계마다 두 배(5단계 1.0% → 6 2.04% → 7 4.08% → 8 8.16%), 8단계 220제 판당 1%
const per=(tier,lv)=>{const R=EXPLORATION_REWARDS[tier],tot=R.gear.reduce((n,[,w])=>n+w,0);return R.bossGear*(R.gear.find(g=>g[0]===lv)?.[1]||0)/tot;};
// 2026-11-04: 각 단계 최고 레벨 2배 — 5·6·7단계 200제 판당 2% · 4.08% · 8.16%, 8단계 220제 2%
for(const [tier,lv,p] of [[5,200,.02],[6,200,.0408],[7,200,.0816],[8,220,.02]])assert.ok(Math.abs(per(tier,lv)-p)<2e-4,tier+'단계 '+lv+'제 '+per(tier,lv));
const counts={};let rnd=1;const R=()=>{rnd=(rnd*1103515245+12345)%2147483648;return rnd/2147483648;};
for(let i=0;i<100000;i++){const lv=explorationGearLevelFor(r,Math.random);counts[lv]=(counts[lv]||0)+1;}
assert.ok(Object.keys(counts).every(l=>Number(l)>=180),'180제 이상만');
assert.ok(Math.abs(counts[220]/1e5-.125)<.01&&Math.abs(counts[200]/1e5-.476)<.01,JSON.stringify(counts));
// 강제 드롭으로 220제 생성: 최하 등급
let n=0;const ctx={now:Date.UTC(2026,10,2),random:Math.random,uuid:()=>'e'+(++n)};
const s=initialState('warrior','팔단계',ctx);s.adminNextExplorationGear={level:220,classId:'warrior',slot:0};
const out=grantExplorationChest(s,{tier:8,status:'won',cleared:t.floors,tick:600},ctx);
const it=out.reward.items[0];assert.equal(it.level,220);assert.equal(bossTier(it),0);assert.ok(out.state.exploration.cleared.includes(8));
console.log('tier8 ok',{solo,levels:counts});
