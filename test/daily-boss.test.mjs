import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {execute,initialState,balance} from '../supabase/functions/_shared/economy.mjs';
import {planBattle,PROBABILITIES,randomInt} from '../supabase/functions/_shared/daily-boss.mjs';
const now=Date.now(),ctx={now,itemIds:[],uuid:randomUUID,random:()=>.5,randomInt:()=>0};
const state=()=>({...initialState(now),autoBattle:false,gold:1234});
function items(n,rarity=0){return Array.from({length:n},(_,i)=>({...balance.gear.find(it=>it.rarity===rarity),id:i+1,auctionUid:randomUUID(),enhance:0,transcend:0,optionRolls:[1,1]}));}
assert.deepEqual(PROBABILITIES.map(r=>r.reduce((n,p)=>n+p,0)),Array(8).fill(100));
assert.deepEqual(PROBABILITIES.map(r=>r.reduce((n,p,j)=>n+p*(j+10),0)/100),[13.18,13.1,12.96,12.88,12.76,12.68,12.54,12.46]);
for(let rarity=0;rarity<7;rarity++){
 const s=state();s.inventory=items(1,rarity);
 const r=execute(s,'dismantle',{ids:[1]},ctx);
 assert.equal(r.state.gold,s.gold);assert.equal(r.state.essence,rarity+1);assert.equal(r.state.inventory.length,0);
 let successes=0;for(let bucket=0;bucket<1000;bucket++)successes+=execute(s,'dismantle',{ids:[1]},{...ctx,randomInt:()=>bucket}).state.essence>0?1:0;
 assert.equal(successes,1);
}
for(const successes of [0,1,2,4]){
 const s=state();s.inventory=items(1248,3);let calls=0;
 const r=execute(s,'dismantle',{ids:s.inventory.map(it=>it.id)},{...ctx,randomInt:()=>calls++<successes?0:999});
 assert.equal(calls,1248);assert.equal(r.state.essence,successes*4);assert.equal(r.state.gold,s.gold);assert.equal(r.events.at(-1).count,1248);
}
const mixed=state();mixed.inventory=[...items(500,0),...items(300,1),...items(200,2)].map((it,i)=>({...it,id:i+1}));let calls=0;
assert.equal(execute(mixed,'dismantle',{ids:mixed.inventory.map(it=>it.id)},{...ctx,randomInt:()=>[0,500,800].includes(calls++)?0:999}).state.essence,6);
const s=state();s.inventory=items(3);s.inventory[1].locked=true;s.equipped[s.inventory[2].slot]=3;
for(const args of [{ids:[999]},{ids:[1,1]},{ids:[2]},{ids:[3]},{ids:[1],rarity:6},{ids:[1],count:1000},{ids:[1],success:true}])assert.throws(()=>execute(s,'dismantle',args,ctx));
assert.equal(s.inventory.length,3);assert.equal(execute(s,'sell',{ids:[1]},ctx).state.gold,1234);
const removed=execute(s,'dismantle',{ids:[1]},ctx).state;assert.throws(()=>execute(removed,'dismantle',{ids:[1]},ctx),/ITEM_NOT_OWNED/);
const hunter=initialState(now);hunter.serverClock=now-1000;hunter.serverCombat={hp:1,elapsed:0,lastTick:now-1000};
const killed=execute(hunter,'sync',{}, {...ctx,random:()=>0});assert.equal(killed.state.essence,0);assert.ok(killed.events.some(e=>e.type==='kill'));assert.ok(killed.events.every(e=>!('essence' in e)));
const plan=planBattle(s,0,()=>0);assert.deepEqual(plan.map(h=>h.at),Array.from({length:10},(_,i)=>(i+1)*1000));assert.equal(plan.length,10);
let seq=[4294967295,4294967000,12345];assert.equal(randomInt(1000,()=>seq.shift()),345);assert.equal(seq.length,0);
// Independent empirical probability check with production CSPRNG (7 million draws).
for(let rarity=0;rarity<7;rarity++){let wins=0;for(let i=0;i<1_000_000;i++)if(randomInt(1000)===0)wins++;assert.ok(wins>800&&wins<1200,`rarity ${rarity}: ${wins}`);console.log(`rarity ${rarity}: ${wins}/1,000,000 wins; reward ${rarity+1}`);}
console.log('PASS: exact probability buckets, independent 1248-item/mixed draws, no gold, tamper rejection, field drop removal, ten-second plan and CSPRNG rejection sampling.');
