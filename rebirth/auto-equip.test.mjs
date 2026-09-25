import {normalizePotentialItem} from './data.mjs';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {initialState,makeItem,power,bestEquipment,execute} from './engine.mjs';
const ctx={now:0,uuid:randomUUID,random:()=>.5};
const state=()=>{const s=initialState('warrior','장착검증',ctx);s.level=100;s.hunting=false;return s;};
let seed=11;const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
for(let n=0;n<20;n++){
 const s=state();s.items=[];s.equipped={};for(let slot=0;slot<5;slot++)for(let k=0;k<3;k++){const it=makeItem(k%2?80:100,'warrior',slot,k%2===1,ctx,0);it.stars=Math.floor(rng()*20);it.lines=[{key:['STR','attack','boss','hp','defense'][Math.floor(rng()*5)],value:Math.ceil(rng()*18),grade:5}];s.items.push(it);if(k===0)s.equipped[slot]=it.id;}
 let max=power(s).combatPower;const equipped={};function visit(slot){if(slot===5){max=Math.max(max,power({...s,equipped}).combatPower);return;}for(const it of s.items.filter(i=>i.slot===slot)){equipped[slot]=it.id;visit(slot+1);}}visit(0);
 const result=bestEquipment(s);assert.equal(result.after,max);assert.equal(power({...s,equipped:result.equipped}).combatPower,max);
}
let s=state();const better=makeItem(100,'warrior',0,true,ctx,0);better.locked=true;s.items.push(better);s.items.push({...makeItem(200,'warrior',0,true,ctx,0),stars:25},{...makeItem(100,'mage',1,true,ctx,0),stars:25},{...makeItem(100,'warrior',2,true,ctx,0),stars:25,broken:true});
const original=structuredClone(s);const result=execute(s,'autoEquip',{},ctx);assert.equal(result.state.equipped[0],better.id);assert.equal(result.state.equipped[1],undefined);assert.equal(result.state.equipped[2],undefined);assert.deepEqual(result.state.items,s.items.map(it=>normalizePotentialItem(structuredClone(it))));assert.equal(result.state.gold,s.gold);assert.deepEqual(s,original);assert.equal(result.events[0].type,'autoEquip');assert.deepEqual(bestEquipment(result.state).changed,[]);
s.pendingCube={id:better.id,potentialVersion:3,lines:[],previousGrades:[]};assert.throws(()=>execute(s,'autoEquip',{},ctx),/ITEM_CUBE_PENDING/);s.pendingCube=null;s.partyRoom='room';assert.throws(()=>execute(s,'autoEquip',{},ctx),/PARTY_IN_PROGRESS/);
s=state();s.items=Array.from({length:300},(_,i)=>({...makeItem([60,80,100][i%3],'warrior',i%9,i%2===0,ctx,0),stars:i%26,lines:[{key:['STR','attack','boss','crit','hp'][i%5],value:1+i%18,grade:5}]}));s.equipped=Object.fromEntries(s.items.slice(0,9).map(i=>[i.slot,i.id]));const start=performance.now();const big=bestEquipment(s);assert.ok(big.after>=power(s).combatPower);assert.equal(power({...s,equipped:big.equipped}).combatPower,big.after);console.log('PASS: exhaustive agreement on 20 inventories, eligibility, locked items, idempotence, pending/party guards, inventory and currency preservation.');console.log({bagSize:300,milliseconds:Math.round(performance.now()-start),before:big.before,after:big.after});

// Equipping must remain unavailable during an active battle.
s.battle={kind:'dungeon',dungeon:'cube',enemy:{hp:1e9,attack:1},started:0,tick:0,power:{},enemyHp:1e9,hp:1000};assert.throws(()=>execute(s,'autoEquip',{},ctx),/BATTLE_IN_PROGRESS/);
console.log('PASS: active battle guard.');
