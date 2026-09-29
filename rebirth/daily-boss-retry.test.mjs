import assert from 'node:assert/strict';
import {initialState,execute} from './engine.mjs';
import {dayKey,BOSSES} from './data.mjs';
const ctx={now:Date.parse('2026-09-30T01:00:00+09:00'),random:()=>.8,uuid:()=>crypto.randomUUID(),admin:false};
const create=()=>{const s=initialState('warrior','재도전',ctx);s.hunting=false;return s;};
for(const ending of ['death','timeout','abandon']){
 let s=create();s.bossAttempts={0:dayKey(ctx.now)}; // Legacy failed entry must no longer lock a user out.
 s=execute(s,'boss',{id:0},ctx).state;
 if(ending==='abandon')s=execute(s,'abandon',{},ctx).state;
 else {if(ending==='death')s.battle.hp=0;else s.battle.tick=BOSSES[0].seconds;s=execute(s,'sync',{},ctx).state;}
 assert.equal(s.battle,null);assert.notEqual(s.bossClaims[0],dayKey(ctx.now));
 assert.ok(execute(s,'boss',{id:0},ctx).state.battle);
}
let s=execute(create(),'boss',{id:0},ctx).state;s.battle.enemyHp=0;s=execute(s,'sync',{},ctx).state;
assert.equal(s.bossClaims[0],dayKey(ctx.now));assert.throws(()=>execute(s,'boss',{id:0},ctx),/BOSS_LIMIT/);
assert.ok(execute(s,'boss',{id:0,practice:true},ctx).state.battle);
console.log('Daily boss: death, timeout, abandon and legacy failure allow retry; victory remains limited');
