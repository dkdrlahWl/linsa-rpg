import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync,existsSync} from 'node:fs';
import {initialState,execute,makeItem,settle} from './engine.mjs';
import * as D from './data.mjs';
import * as S from './edge-dist/data.mjs';
const ctx={now:0,uuid:randomUUID,random:()=>.5};
function player(level,stage=38){const s=initialState('warrior','최종점검',ctx);Object.assign(s,{level,stage,balanceVersion:D.BALANCE_VERSION});const w=makeItem(190,'warrior',0,false,ctx);w.baseStats={attack:1e9,stat:1e6,hp:1e9,defense:1e6};s.items=[w];s.equipped={0:w.id};return s;}
for(let level=1;level<250;level++)assert.equal(D.xpNeeded(level),Math.round(120+level**2.1*12)*(level>=200?3:1));
for(const level of [100,199,200]){const s=player(level);s.hunting=false;s.xp=12345;s.xpRemainder=.25;const next=execute(s,'sync',{},ctx).state;assert.equal(next.xp,12345);assert.equal(next.xpRemainder,.25);}
for(const level of [199,200,249]){const s=player(level);s.xp=D.xpNeeded(level)-1;const points=s.points;settle(s,{...ctx,now:8000});assert.equal(s.level,level+1);assert.equal(s.points,points+5);if(level===249){assert.equal(s.xp,0);assert.equal(s.xpRemainder,0);}}
const capped=player(250);settle(capped,{...ctx,now:21600000});assert.equal(capped.level,250);assert.equal(capped.xp,0);assert.equal(capped.xpRemainder,0);
assert.equal(execute(player(200),'betaLevel',{level:250},{...ctx,admin:true}).state.level,250);
assert.throws(()=>execute(player(200),'betaLevel',{level:251},{...ctx,admin:true}),/INVALID_BETA_LEVEL/);
for(const stage of D.STAGES.slice(33)){assert.equal(execute(player(200),'stage',{id:stage.id},ctx).state.stage,stage.id);const a=player(200,stage.id),b=structuredClone(a);settle(a,{...ctx,now:21600000});for(let now=30000;now<=21600000;now+=30000)settle(b,{...ctx,now});for(const key of ['level','xp','gold','huntKills','points'])assert.equal(a[key],b[key]);assert.equal(stage.dropLevel,190);assert.ok(existsSync(new URL(D.fieldMonster(stage.id).art,import.meta.url)));}
assert.deepEqual(D.STAGES,S.STAGES);assert.deepEqual(D.REGIONS,S.REGIONS);assert.deepEqual(D.MONSTERS,S.MONSTERS);
console.log('PASS: XP boundary, saved XP preservation, 250 cap, admin bounds, all six field entries and online/offline parity, server data parity.');
