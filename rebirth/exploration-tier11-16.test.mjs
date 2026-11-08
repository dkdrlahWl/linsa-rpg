// node rebirth/exploration-tier11-16.test.mjs — 2026-11-08 링구의 탐험 11~13(250제)·14~16(300제)
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {EXPLORATIONS,explorationStats,explorationKeys,explorationPrevious,initializeExploration,explorationArt} from './exploration-data.mjs';
import {EXPLORATION_REWARDS,explorationGearTable} from './exploration-reward-data.mjs';
import {grantExplorationChest} from './exploration-rewards.mjs';
const spec=[[11,55e8,8,250,.02],[12,79e8,9,250,.04],[13,110e8,10,250,.06],[14,160e8,11,300,.02],[15,230e8,12,300,.04],[16,320e8,13,300,.06]];
const artFiles=new Set();
for(const [tier,solo,keys,top,perRun] of spec){
 for(const n of [1,2,4]){const hp=explorationStats(tier,5,n,true).hp;assert.ok(Math.abs(hp-solo*n)/(solo*n)<.001,tier+' '+n+' '+hp);}
 assert.equal(explorationKeys(tier),keys);assert.equal(explorationPrevious(tier),tier-1);
 assert.ok(explorationStats(tier,5,1,true).attack>explorationStats(tier-1,5,1,true).attack);
 const bossArt=explorationArt(tier,3,true),{arena,map}=EXPLORATIONS[tier];
 assert.equal(map,arena);
 for(const path of [bossArt,arena]){
  const image=readFileSync(new URL(path,import.meta.url));
  assert.equal(image.toString('ascii',8,12),'WEBP',path);
  const bytes=image.toString('base64');
  assert.ok(!artFiles.has(bytes),'Duplicate exploration art: '+path);
  artFiles.add(bytes);
 }
 const r=EXPLORATION_REWARDS[tier],prev=EXPLORATION_REWARDS[tier-1];
 for(const k of ['gold','scroll','highCube','bossGear'])assert.ok(r[k]>prev[k],tier+' '+k);
 assert.ok(r.counts.highCube>=prev.counts.highCube);
 const table=explorationGearTable(r),p=table.find(([l])=>l===top)[2];assert.ok(Math.abs(p-perRun)<1e-3,tier+' top per run '+p);
 const weights=r.gear.map(([,w])=>w);assert.ok(weights.every((w,i)=>i===0||w<weights[i-1]),tier+' monotone');
 assert.ok(Math.abs(weights.reduce((a,b)=>a+b,0)-100)<1e-6);
 const out=grantExplorationChest({gold:0,materials:{},items:[],collection:[]},{tier,status:'won',cleared:5,tick:900},{random:()=>.999999,uuid:randomUUID,now:1});
 const w=initializeExploration({tier,started:12345,members:[{id:'a',power:{hp:1000,attack:10,defense:1},hp:1000}],tick:0});
 assert.equal(w.monsters.find(m=>m.boss).maxHp,explorationStats(tier,5,1,true).hp);
}
// 최고 레벨 장비가 실제로 나오는지
const top=grantExplorationChest({gold:0,materials:{},items:[],collection:[]},{tier:16,status:'won',cleared:5,tick:900},{random:(()=>{let n=0;return()=>[0,0,0,0,0,.0,.99999][n++%7]??0;})(),uuid:randomUUID,now:1});
console.log('items',top.reward.items.map(i=>i.level));
console.log('PASS exploration 11~16');
