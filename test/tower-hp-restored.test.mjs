import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {execute,initialState,balance} from '../supabase/functions/_shared/tower-hp-restored.mjs';
const original=JSON.parse(readFileSync(new URL('../supabase/functions/_shared/balance.json',import.meta.url),'utf8'));
const now=1800000000000;
const ctx=t=>({now:t,random:()=>.99,uuid:randomUUID,itemIds:[],adminFloor:0,costumePercent:0,partyBusy:false});
const state=()=>({...initialState(now),autoBattle:false});
test('S3 restores all 30 tower bosses exactly, without changing rewards or any other balance',()=>{
 assert.deepEqual(balance,original);
 assert.equal(balance.towerFloors.length,30);
 for(let i=0;i<30;i++){
  let s={...state(),towerCleared:i};
  s=execute(s,'startDungeon',{type:'tower',stage:i+1},ctx(now)).state;
  assert.equal(s.serverBattle.hp,original.towerFloors[i].hp);
  s=execute(s,'sync',{},ctx(now)).state;
  assert.equal(s.serverBattle.hp,original.towerFloors[i].hp);
  assert.equal(s.serverBattle.hpVersion,'ORIGINAL_S3');
 }
});
test('ongoing reduced tower fights revert once; untagged original fights stay intact',()=>{
 for(let i=0;i<30;i++){
  const hp=Math.floor(original.towerFloors[i].hp/6);
  const s={...state(),towerCleared:i,serverBattle:{type:'tower',stage:i+1,hp,elapsed:4,lastTick:now,hpVersion:'TH3'}};
  const before=structuredClone(s),result=execute(s,'sync',{},ctx(now));
  assert.equal(result.state.serverBattle.hp,hp*3);
  assert.equal(result.state.serverBattle.elapsed,4);assert.equal(result.state.serverBattle.lastTick,now);
  assert.deepEqual(s,before);assert.equal(result.state.towerCleared,i);assert.equal(result.state.gold,0);
  const again=execute(result.state,'sync',{},ctx(now));assert.equal(again.state.serverBattle.hp,hp*3);
  const untagged={...s,serverBattle:{...s.serverBattle,hpVersion:undefined,hp:hp*3}};
  assert.equal(execute(untagged,'sync',{},ctx(now)).state.serverBattle.hp,hp*3);
 }
});
test('gold and pet dungeon HP/tickets are unaffected; cancellation still works',()=>{
 for(const type of ['gold','pet']){
  let s=execute(state(),'startDungeon',{type,stage:1},ctx(now)).state;
  assert.equal(s.serverBattle.hp,type==='gold'?original.goldDungeons[0].hp:2000);
  const before=structuredClone(s.serverBattle);s=execute(s,'sync',{},ctx(now)).state;
  assert.deepEqual(s.serverBattle,before);assert.equal(execute(s,'cancelBattle',{},ctx(now)).state.serverBattle,null);
 }
});
test('tower rewards still pay once and sequential floor restrictions stay in effect',()=>{
 const s=state();s.inventory=[{...balance.gear[0],id:1,enhance:0,transcend:0,optionRolls:[1,1]}];s.equipped={무기:1};
 let current=s,t=now;
 for(const floor of original.towerFloors){
  current=execute(current,'startDungeon',{type:'tower',stage:floor.floor},ctx(t)).state;
  const before=structuredClone(current);
  current=execute(current,'sync',{}, {...ctx(t+=1000),costumePercent:100000000}).state;
  assert.equal(current.towerCleared,floor.floor);assert.equal(current.serverBattle,null);
  for(const [k,f] of [['gold','gold'],['essence','essence'],['transcendStone','stone'],['downgradeProtect','protect'],['petStone','petStone']])assert.equal(current[k]-before[k],floor[f]||0);
  const gold=current.gold;current=execute(current,'sync',{},ctx(t)).state;assert.equal(current.gold,gold);
 }
 assert.throws(()=>execute(state(),'startDungeon',{type:'tower',stage:2},ctx(now)),/DUNGEON_LOCKED/);
});
