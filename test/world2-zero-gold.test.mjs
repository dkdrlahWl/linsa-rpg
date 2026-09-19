import {test} from 'node:test';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {initialState,execute,balance} from '../supabase/functions/_shared/tower-hp-restored.mjs';
test('only five World 2 regional final gold rewards changed; online/offline grant zero',()=>{
 const original=JSON.parse(execFileSync('git',['show','af201e8a4515aee90da2179812369d7bb253bc07:world2-data.js'],{encoding:'utf8'}).match(/globalThis.RinguWorld2Data=(.*);/)[1]);
 const current=globalThis.RinguWorld2Data;for(let r=0;r<5;r++){const old=structuredClone(original.regions[r]);old.bosses.at(-1).reward=0;assert.deepEqual(current.regions[r],old);
  for(const elapsed of [1000,60000]){const now=Date.now(),s={...initialState(now-elapsed),gold:123,autoBattle:true,world2Unlocked:true,monsterUnlockStep:65,regionIndex:6+r,bossIndex:5,serverClock:now-elapsed,serverCombat:{hp:1,elapsed:0,lastTick:now-elapsed},abyssBalanceVersion:1,world2FinalHpVersion:1};
   const result=execute(s,'sync',{}, {now,random:()=>.5,itemIds:[],uuid:()=>crypto.randomUUID()});assert.equal(result.state.gold,123);
  }
 }assert.equal(balance.bossRegions.filter(r=>r.world===2).length,5);
});
