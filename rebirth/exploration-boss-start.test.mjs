// 2026-10-15: Ringu exploration starts in the final boss arena (2800-wide for every theme)
// and nothing fights until every living member has moved once.
import assert from 'node:assert/strict';
import {startCoop,advanceCoop} from './coop-model.mjs';
import {EXPLORATIONS} from './exploration-data.mjs';
const power={attack:5e4,hp:1e5,defense:2000,crit:.3,critDamage:1.6,boss:3,cadence:1,advancement:4,firstJob:true,level:200};
for(const theme of EXPLORATIONS){
 const ids=['a','b','c','d'];
 let w=startCoop({id:'r'+theme.id,owner:'a',mode:'exploration',tier:theme.id,status:'waiting',members:ids.map((id,i)=>({id,name:id,classId:['warrior','mage','archer','priest'][i],advanced:true,power:{...power}}))},1000);
 assert.equal(w.floor,theme.floors,'starts on the boss floor');
 assert.ok(w.monsters.some(e=>e.boss),'boss present');
 assert.equal(w.dungeon.arenaBounds.width,2800,'same arena size as theme 1');
 assert.equal(w.entryWaiting,true);
 const hp=w.monsters.map(e=>e.hp),memberHp=w.members.map(m=>m.hp);
 // Three of four move (for a long time): still waiting, no combat.
 let now=1000;for(let i=0;i<40;i++){now+=250;for(const id of ids.slice(0,3))w=advanceCoop(w,id,{frames:[{tick:0,input:[.4,-.6,1]}]},now);}
 assert.equal(w.entryWaiting,true,'waits for the last player');assert.equal(w.tick,0);
 assert.deepEqual(w.monsters.map(e=>e.hp),hp,'monsters untouched before start');assert.deepEqual(w.members.map(m=>m.hp),memberHp,'nobody hit before start');
 // The fourth player moves: combat starts.
 now+=250;w=advanceCoop(w,'d',{frames:[{tick:0,input:[.4,0,0]}]},now);
 assert.equal(w.entryWaiting,false,'everyone moved, fight begins');
 for(let t=1;t<=30;t++)w=advanceCoop({...w,_queuedInputs:ids.map(id=>({user:id,tick:t-1,input:[0,-1,1]}))},'a',{frames:[]},now+t*100);
 assert.ok(w.tick>0,'combat clock runs');
}
console.log('PASS exploration starts in a 2800 boss arena for all themes and waits until all four members move');
