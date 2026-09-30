import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {initialState} from './engine.mjs';
import {deliverSystemMail,claimSystemMail} from './system-mail.mjs';
const db=new PGlite();
try{
await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);create table auth.sessions(id uuid primary key,user_id uuid,created_at timestamptz default now());create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('session_id',current_setting('test.sid',true))$$;`);
await db.exec(await readFile(new URL('schema.sql',import.meta.url),'utf8'));await db.exec(await readFile(new URL('lotto.sql',import.meta.url),'utf8'));await db.exec('update rebirth_private.release set enabled=true');
const users=Array.from({length:2},()=>({id:randomUUID(),sid:randomUUID()}));
const auth=async u=>db.query("select set_config('test.uid',$1,false),set_config('test.sid',$2,false)",[u.id,u.sid]);
for(const [i,u] of users.entries()){await db.query('insert into auth.users values($1)',[u.id]);await db.query('insert into auth.sessions(id,user_id) values($1,$2)',[u.sid,u.id]);const s=initialState('rogue','테스터'+i,{now:Date.now(),uuid:randomUUID,accountCreatedAt:new Date().toISOString()});s.gold=20000;await db.query('insert into rebirth_private.players(id,state,active_session,session_started) values($1,$2,$3,(select created_at from auth.sessions where id=$3))',[u.id,JSON.stringify(s),u.sid]);}
const lotto=async(action,args={},rid=randomUUID())=>(await db.query('select public.rebirth_lotto($1,$2,$3) r',[action,JSON.stringify(args),rid])).rows[0].r;
await auth(users[0]);let view=await lotto('list');const draw=view.lotto.drawAt;
assert.equal(view.lotto.tickets.length,0);assert.equal(view.lotto.sales,0);
await assert.rejects(()=>lotto('buy',{numbers:[1,1],drawAt:draw}),/INVALID_LOTTO_NUMBERS/);
await assert.rejects(()=>lotto('buy',{numbers:[0,18],drawAt:draw}),/INVALID_LOTTO_NUMBERS/);
await assert.rejects(()=>lotto('buy',{numbers:[1.1,18],drawAt:draw}),/INVALID_LOTTO_NUMBERS/);
await assert.rejects(()=>lotto('buy',{numbers:[1,2],drawAt:'2020-01-01'}),/LOTTO_ROUND_CHANGED/);
const rid=randomUUID(),args={numbers:[2,1],drawAt:draw};view=await lotto('buy',args,rid);assert.equal(view.state.gold,19000);assert.equal(view.lotto.sales,1000);
view=await lotto('buy',args,rid);assert.equal(view.state.gold,19000);assert.equal(view.lotto.sales,1000);
await assert.rejects(()=>lotto('buy',{numbers:[1,3],drawAt:draw},rid),/REQUEST_ID_REUSED/);
await assert.rejects(()=>lotto('buy',{numbers:[1,2],drawAt:draw}),/LOTTO_DUPLICATE/);
await lotto('buy',{numbers:[1,3],drawAt:draw});await lotto('buy',{numbers:[1,4],drawAt:draw});await assert.rejects(()=>lotto('buy',{numbers:[1,5],drawAt:draw}),/LOTTO_DAILY_LIMIT/);
await auth(users[1]);await lotto('buy',{numbers:[1,2],drawAt:draw});
// Fixture only: force a known draw RNG and move the purchased round into the past.
await db.exec('create or replace function pg_catalog.random() returns double precision language sql as $$select 0.01::double precision$$');
await db.exec("alter table rebirth_private.lotto_tickets drop constraint lotto_tickets_draw_at_fkey");
await db.query("update rebirth_private.lotto_tickets set draw_at=$1::timestamptz-interval '7 days'",[draw]);await db.query("update rebirth_private.lotto_rounds set draw_at=$1::timestamptz-interval '7 days'",[draw]);
assert.equal((await db.query('select rebirth_private.lotto_settle() n')).rows[0].n,1);
let round=(await db.query('select * from rebirth_private.lotto_rounds where settled_at is not null')).rows[0];assert.equal(round.multiplier,8);assert.equal(round.prize,32000);assert.equal(round.winner_count,2);assert.equal(round.carry_out,0);
const states=(await db.query('select state from rebirth_private.players order by id')).rows.map(r=>r.state);assert.equal(states.reduce((n,s)=>n+s.rewardMailbox[0].rewards.gold,0),32000);
const s=states[0],mail=s.rewardMailbox[0],before=s.gold;deliverSystemMail(s,{accountCreatedAt:new Date().toISOString(),now:Date.now()});assert.equal(s.systemMailbox.length,1);claimSystemMail(s,mail.id);assert.equal(s.gold,before+16000);assert.equal(s.rewardMailbox.length,0);assert.throws(()=>claimSystemMail(s,mail.id),/MAIL_ALREADY_CLAIMED/);
assert.equal((await db.query('select rebirth_private.lotto_settle() n')).rows[0].n,0);
// No-winner carry; only fresh sales multiply, carried prize stays unchanged.
await db.query("insert into rebirth_private.lotto_rounds(draw_at,sales,carry_in) values($1::timestamptz-interval '14 days',1000,500)",[draw]);
await db.query('select rebirth_private.lotto_settle()');round=(await db.query("select * from rebirth_private.lotto_rounds where draw_at=$1::timestamptz-interval '14 days'",[draw])).rows[0];assert.equal(round.prize,8500);assert.equal(round.carry_out,8500);
// Korean Saturday boundary is exact; sales after 21:00 belong to the following round.
const next=async ts=>(await db.query('select rebirth_private.lotto_next_draw($1) d',[ts])).rows[0].d;
assert.equal(new Date(await next('2026-10-03T11:59:59Z')).toISOString(),'2026-10-03T12:00:00.000Z');assert.equal(new Date(await next('2026-10-03T12:00:00Z')).toISOString(),'2026-10-10T12:00:00.000Z');
await db.exec('set role authenticated');await assert.rejects(()=>db.query('select * from rebirth_private.lotto_tickets'),/permission denied/);await assert.rejects(()=>db.query('select rebirth_private.lotto_settle()'),/permission denied/);await db.exec('reset role');
await auth(users[0]);await db.query('delete from auth.sessions where id=$1',[users[0].sid]);await assert.rejects(()=>lotto('list'),/SESSION_ENDED/);
console.log('PASS lottery: atomic purchase, replay, daily limit, per-round duplicates, Korean cutoff, random draw, split, mail one-time, carry, access control.');
}finally{await db.close();}
