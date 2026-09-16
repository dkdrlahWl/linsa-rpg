import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execute,initialState,balance,options} from '../supabase/functions/_shared/economy.mjs';
import {optionBands,CUBES,cubeType} from '../supabase/functions/_shared/cubes.mjs';
const now=Date.now();
const ctx=(random=()=>.5)=>({now,random,uuid:()=>crypto.randomUUID(),itemIds:[9001,9002,9003,9004,9005]});
const state=(rarity=4)=>({...initialState(now),autoBattle:false,essence:100,jadeCube:10,sunCube:10,inventory:[{...balance.gear.find(i=>i.rarity===rarity),id:1,enhance:15,transcend:3,optionRolls:[1.2,1.2]}]});
test('all gear ranges partition into four contiguous tenths without gaps or overlap',()=>{
 for(const it of balance.gear){const bands=optionBands(it),low=options({...it,optionRolls:[.8]})[0][1],high=options({...it,optionRolls:[1.2]})[0][1];assert.equal(bands[0].min,low);assert.equal(bands[3].max,high);bands.forEach((b,i)=>{assert.ok(b.min<=b.max);if(i)assert.equal(Math.round(b.min*10),Math.round(bands[i-1].max*10)+1);});}
});
test('existing gear initializes once; reroll survives sync and ownership transfer',()=>{
 let s=execute(state(),'sync',{},ctx()).state;assert.deepEqual(s.inventory[0].optionRolls,[.8,.8]);
 const before=options(s.inventory[0]);let draws=[.999,.999];s=execute(s,'cubeRoll',{id:1,type:'sun'},ctx(()=>draws.shift())).state;
 assert.equal(s.sunCube,9);assert.equal(s.inventory[0].cubeTier,3);const rolled=structuredClone(s.inventory[0]);
 assert.deepEqual(options(rolled).slice(1),before.slice(1));assert.deepEqual(execute(s,'sync',{},ctx()).state.inventory[0],rolled);
 const recipient=state();recipient.inventory=[rolled];assert.deepEqual(execute(recipient,'sync',{},ctx()).state.inventory[0],rolled);
});
test('each probability boundary selects the exact intended tier',()=>{
 for(const [r,tier]of [[0,0],[.59999,0],[.60,1],[.89999,1],[.90,2],[.97999,2],[.98,3],[.99999,3]]){let draws=[r,0];const r1=execute(state(),'cubeRoll',{id:1,type:'sun'},ctx(()=>draws.shift()));assert.equal(r1.events.find(e=>e.type==='cubeRoll').tier,tier);}
});
test('server validates targets, balances, spending and refuses client option values',()=>{
 for(let rarity=0;rarity<7;rarity++){const s=state(rarity),type=cubeType(s.inventory[0]);if(!type){assert.throws(()=>execute(s,'cubeRoll',{id:1,type:'sun'},ctx()),/INVALID_CUBE_TARGET/);continue;}const r=execute(s,'cubeRoll',{id:1,type},ctx());assert.equal(r.state[CUBES[type].key],9);assert.throws(()=>execute(s,'cubeRoll',{id:1,type:type==='jade'?'sun':'jade'},ctx()),/INVALID_CUBE_TARGET/);}
 for(const [type,c] of Object.entries(CUBES)){const s=state();const r=execute(s,'cubeBuy',{type},ctx()).state;assert.equal(r.essence,100-c.price);assert.equal(r[c.key],11);s.essence=0;assert.throws(()=>execute(s,'cubeBuy',{type},ctx()),/INSUFFICIENT_ESSENCE/);}
 const s=state();s.sunCube=0;assert.throws(()=>execute(s,'cubeRoll',{id:1,type:'sun'},ctx()),/INSUFFICIENT_SUNCUBE/);assert.throws(()=>execute(state(),'cubeRoll',{id:2,type:'sun'},ctx()),/ITEM_NOT_OWNED/);assert.throws(()=>execute(state(),'cubeRoll',{id:1,type:'sun',value:999},ctx()),/INVALID_ARGUMENTS/);
});
test('new summoned gear starts at minimum and dismantling awards at exactly 10 of 1000 outcomes for every rarity',()=>{
 const s=state();s.gold=100000;const r=execute(s,'summon',{group:'weapon',count:5},ctx());for(const it of r.state.inventory.slice(0,5))assert.deepEqual(it.optionRolls,[.8,.8]);
 for(let rarity=0;rarity<7;rarity++){let wins=0;for(let i=0;i<1000;i++){const r=execute(state(rarity),'dismantle',{ids:[1]},{...ctx(),randomInt:()=>i});if(r.events.find(e=>e.type==='dismantle').essence)wins++;}assert.equal(wins,10);}
});
