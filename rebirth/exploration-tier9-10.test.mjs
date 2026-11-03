// node rebirth/exploration-tier9-10.test.mjs — 2026-11-03 링구의 탐험 9·10단계: 체력·열쇠·해금·보상 확률/개수·220제 구간
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {EXPLORATIONS,explorationStats,explorationKeys,explorationPrevious,initializeExploration,explorationArt} from './exploration-data.mjs';
import {EXPLORATION_REWARDS,explorationGearTable} from './exploration-reward-data.mjs';
import {grantExplorationChest} from './exploration-rewards.mjs';
for(const [tier,solo,keys] of [[9,25e8,6],[10,35e8,7]]){
 for(const n of [1,2,4]){const hp=explorationStats(tier,5,n,true).hp;assert.ok(Math.abs(hp-solo*n)/(solo*n)<.001,tier+' '+n+' '+hp);}
 assert.equal(explorationKeys(tier),keys);assert.equal(explorationPrevious(tier),tier-1);
 assert.ok(explorationStats(tier,5,1,true).attack>explorationStats(tier-1,5,1,true).attack);
 assert.equal(explorationArt(tier,3,true),'exploration/boss-'+tier+'-original-v1.webp');
 // 보상: 8단계보다 확률·개수 모두 같거나 높다
 const r=EXPLORATION_REWARDS[tier],prev=EXPLORATION_REWARDS[tier-1];
 for(const k of ['gold','scroll','highCube','potentialLock','addCube','bonusFlame','bossGear'])assert.ok(r[k]>prev[k],tier+' '+k);
 for(const k of ['highCube','addCube'])assert.ok(r.counts[k]>prev.counts[k],tier+' count '+k);
 const table=explorationGearTable(r),p220=table.find(([l])=>l===220)[2];assert.ok(Math.abs(p220-(tier===9?.02:.04))<1e-12,"220 per run "+p220);
 const out=grantExplorationChest({gold:0,materials:{},items:[],collection:[]},{tier,status:'won',cleared:5,tick:900},{random:()=>0,uuid:randomUUID,now:1});
 assert.equal(out.state.materials.highCube,r.counts.highCube);assert.equal(out.reward.items[0].level,190);
 const w=initializeExploration({tier,started:12345,members:[{id:'a',power:{hp:1000,attack:10,defense:1},hp:1000}],tick:0});
 assert.equal(w.monsters.find(m=>m.boss).maxHp,explorationStats(tier,5,1,true).hp);
}
console.log('PASS exploration 9·10: 25억/35억 · keys 6/7 · rewards up · 220 2%/4%');
