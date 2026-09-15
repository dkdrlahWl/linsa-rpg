import assert from 'node:assert/strict';
import {execute,initialState} from '../supabase/functions/_shared/economy.mjs';
const now=Date.UTC(2026,8,15),ctx=t=>({now:t,random:()=>.9,uuid:()=>crypto.randomUUID(),itemIds:[]});
for(const type of ['gold','tower','pet']){
 let s=initialState(now);s.serverClock=now;s.serverCombat={hp:1,elapsed:1,lastTick:now-60000};
 s.serverBattle={type,stage:1,hp:999999999,elapsed:0,lastTick:now};
 let r=execute(s,'sync',{},ctx(now+15000));assert.equal(r.state.serverBattle,null);assert.equal(r.state.serverCombat,null);assert.equal(r.events.some(e=>e.target==='field'),false);
 r=execute(r.state,'sync',{},ctx(now+16000));assert.ok(r.events.filter(e=>e.target==='field').length<=1);assert.equal(r.events.some(e=>e.type==='offline'),false);
}
let s=initialState(now);s.serverClock=now;s.serverCombat={hp:1,lastTick:now-60000,elapsed:0};const r=execute(s,'sync',{}, {...ctx(now+10000),partyBusy:true});assert.equal(r.state.serverCombat,null);assert.equal(r.events.some(e=>e.target==='field'),false);
console.log('PASS: gold/tower/pet/party pause field damage and prevent catch-up after encounter');
