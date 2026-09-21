import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {initialState,makeItem,power} from './engine.mjs';
import {CLASSES,OPTIONS} from './data.mjs';
const db=new PGlite();const ctx={now:0,uuid:randomUUID,random:()=>.5};
try {
await db.exec(`create role anon;create role authenticated;create schema rebirth_private;create table rebirth_private.players(id uuid primary key,state jsonb);create function rebirth_private.session_user() returns uuid language plpgsql as $$begin if nullif(current_setting('test.actor',true),'') is null then raise exception 'LOGIN_REQUIRED';end if;return current_setting('test.actor')::uuid;end $$;`);
await db.exec(await readFile(new URL('./rankings.sql',import.meta.url),'utf8'));
let seed=27;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
for(const cl of CLASSES)for(let n=0;n<40;n++) {
 const s=initialState(cl.id,'순위검증',ctx);s.level=1+Math.floor(random()*200);s.advancement=n%2;s.stats[cl.stat]=Math.floor(random()*900)+4;
 s.items=Array.from({length:9},(_,slot)=>({...makeItem(80,cl.id,slot,n%3!==0,ctx,0),stars:Math.floor(random()*26),broken:random()<.15,lines:Array.from({length:3},()=>({key:Object.keys(OPTIONS)[Math.floor(random()*Object.keys(OPTIONS).length)],value:Math.ceil(random()*18),grade:5}))}));s.equipped=Object.fromEntries(s.items.map((it,i)=>[i,it.id]));
 const actual=(await db.query('select rebirth_private.combat_power($1) as value',[JSON.stringify(s)])).rows[0].value;
 assert.equal(Number(actual),power(s).combatPower,cl.id+' sample '+n);
}
const ids=[];for(let i=0;i<125;i++){const s=initialState('mage','모험가'+i,ctx);s.level=125-i;s.xp=i;s.stats.INT=i*1000;const id=randomUUID();ids.push(id);await db.query('insert into rebirth_private.players values($1,$2)',[id,JSON.stringify(s)]);}
await assert.rejects(()=>db.query('select public.rebirth_rankings()'),/LOGIN_REQUIRED/);
await db.query("select set_config('test.actor',$1,false)",[ids[124]]);
const rows=(await db.query('select public.rebirth_rankings() as rows')).rows[0].rows;
assert.equal(rows.filter(r=>r.levelRank<=100).length,100);assert.equal(rows.filter(r=>r.combatRank<=100).length,100);assert.equal(rows.find(r=>r.isMe).levelRank,125);assert.equal(rows.find(r=>r.isMe).combatRank,1);assert.equal(rows[0].total,125);assert.ok(rows.every(r=>!('id' in r)&&!('state' in r)));
await db.exec('set role anon');await assert.rejects(()=>db.query('select public.rebirth_rankings()'),/permission denied/);await db.exec('reset role');
console.log('PASS: 200 server/character combat-power comparisons across five classes, independent top-100 ranks, own rank outside top-100, privacy and login guards.');
} finally {await db.close();}
