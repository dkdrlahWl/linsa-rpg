// BM4: actual SQL schema and RPCs; fresh synthetic DB only, no production requests.
import {PGlite} from '@electric-sql/pglite';
import {readFile,readdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {initialState} from '../supabase/functions/_shared/economy.mjs';
const db=new PGlite(),A={id:randomUUID(),sid:randomUUID()},B={id:randomUUID(),sid:randomUUID()};
const file=p=>readFile(new URL(p,import.meta.url),'utf8');
const identify=u=>db.query("select set_config('test.uid',$1,false),set_config('test.sid',$2,false)",[u.id,u.sid]);
const clock=t=>db.query("select set_config('test.bm4_clock',$1,false)",[t]);
const call=async(action='status',rotation=null,slot=null,id=null)=>(await db.query('select public.ringu_black_market($1,$2,$3,$4) r',[action,rotation,slot,id])).rows[0].r;
const state=async()=>(await db.query('select id,state,revision from ringu_private.accounts order by id')).rows;
const receipts=async()=>(await db.query('select * from ringu_private.black_market_purchases order by account_id,rotation_id,slot')).rows;
const otherFunctions=async()=>(await db.query("select proname,md5(prosrc) hash from pg_proc where oid in ('ringu_private.black_market_current()'::regprocedure,'public.ringu_black_market(text,text,integer,uuid)'::regprocedure) order by proname")).rows;
// Only this isolated fixture controls the clock; the production SQL has no override.
async function clockedPeriod(){
 const def=(await db.query("select pg_get_functiondef('ringu_private.black_market_period(timestamptz)'::regprocedure) d")).rows[0].d;
 await db.exec(def.replace('ringu_private.black_market_period(', 'ringu_private.bm4_qa_period('));
 await db.exec(`create or replace function ringu_private.black_market_period(p_at timestamptz)
 returns table(id text,starts_at timestamptz,ends_at timestamptz) language sql volatile set search_path='' as $$
 select * from ringu_private.bm4_qa_period(coalesce(nullif(current_setting('test.bm4_clock',true),'')::timestamptz,p_at))$$;`);
}
try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),created_at timestamptz default now());create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('session_id',current_setting('test.sid',true))$$;`);
 for(const n of ['01-account-storage.sql','02-ranking-party.sql'])await db.exec(await file('fixtures/'+n));
 for(const n of ['06-costume-foundation.sql','07-costume-price-100.sql','08-costume-integration.sql','09-open-costume-shop.sql','10-auction-foundation.sql','11-economy-command-gateway.sql','16-economy-differential-commit.sql','17-black-market.sql'])await db.exec(await file('../supabase/'+n));
 const migrations=(await readdir(new URL('../supabase/migrations/',import.meta.url))).sort();
 for(const n of migrations.filter(n=>/_black_market_(prices_bp[12]|consumables_bm3)\.sql$/.test(n)))await db.exec('begin;'+await file('../supabase/migrations/'+n)+'commit;');
 const names=migrations.filter(n=>n.endsWith('_black_market_refresh_bm4.sql'));assert.equal(names.length,1);const migration=await file('../supabase/migrations/'+names[0]);
 for(const u of [A,B]){
  await db.query('insert into auth.users values($1)',[u.id]);await db.query('insert into auth.sessions(id,user_id) values($1,$2)',[u.sid,u.id]);await identify(u);await db.query("select public.ringu_account('activate')");
  const s=initialState(Date.now());s.essence=10000;s.autoBattle=false;
  await db.query('update ringu_private.accounts set state=$1 where id=$2',[JSON.stringify(s),u.id]);await db.query('select ringu_private.auction_import($1)',[u.id]);
 }
 await db.exec('update ringu_private.auction_release set economy_ready=true,enabled=true');await identify(A);
 const day=(await db.query("select to_char((clock_timestamp() at time zone 'Asia/Seoul')+interval '1 day','YYYY-MM-DD') d")).rows[0].d;
 await clockedPeriod();await clock(day+'T11:59:59+09:00');
 const old=await call();assert.equal(old.rotation,day+'/00');
 const oldId=randomUUID(),oldReceipt=await call('buy',old.rotation,0,oldId);
 await db.query("insert into ringu_private.black_market_cycles(id,starts_at,ends_at,offers,rates) values('2000-01-01/00','2000-01-01T00:00:00+09:00','2000-01-01T18:00:00+09:00',$1,$2)",[JSON.stringify(old.items.map(({purchased,...o})=>o)),JSON.stringify(old.rates)]);
 const beforeState=await state(),beforeReceipts=await receipts(),beforeFunctions=await otherFunctions();
 await db.exec('begin;'+migration+'commit;');
 assert.deepEqual(await state(),beforeState);assert.deepEqual(await receipts(),beforeReceipts);assert.deepEqual(await otherFunctions(),beforeFunctions);
 const adjusted=(await db.query('select * from ringu_private.black_market_cycles where id=$1',[old.rotation])).rows[0];
 assert.equal(new Date(adjusted.ends_at).toISOString(),new Date(day+'T12:00:00+09:00').toISOString());assert.deepEqual(adjusted.offers,old.items.map(({purchased,...o})=>o));
 assert.equal((await db.query("select to_char(ends_at at time zone 'Asia/Seoul','HH24:MI') h from ringu_private.black_market_cycles where id='2000-01-01/00'")).rows[0].h,'18:00');
 const allCycles=(await db.query('select * from ringu_private.black_market_cycles order by id')).rows;
 await db.exec('begin;'+migration+'commit;');assert.deepEqual((await db.query('select * from ringu_private.black_market_cycles order by id')).rows,allCycles);
 const cases=[
 ['2026-09-11T00:00:00+09:00','2026-09-11/00','2026-09-11 00:00','2026-09-11 12:00'],
 ['2026-09-11T11:59:59.999999+09:00','2026-09-11/00','2026-09-11 00:00','2026-09-11 12:00'],
 ['2026-09-11T12:00:00+09:00','2026-09-11/12','2026-09-11 12:00','2026-09-11 18:00'],
 ['2026-09-11T17:59:59.999999+09:00','2026-09-11/12','2026-09-11 12:00','2026-09-11 18:00'],
 ['2026-09-11T18:00:00+09:00','2026-09-11/18','2026-09-11 18:00','2026-09-12 00:00'],
 ['2026-09-11T23:59:59.999999+09:00','2026-09-11/18','2026-09-11 18:00','2026-09-12 00:00'],
 ['2026-09-12T00:00:00+09:00','2026-09-12/00','2026-09-12 00:00','2026-09-12 12:00'],
 ['2026-09-11T03:00:00Z','2026-09-11/12','2026-09-11 12:00','2026-09-11 18:00'],
 ['2026-12-31T23:59:59+09:00','2026-12-31/18','2026-12-31 18:00','2027-01-01 00:00'],
 ['2028-02-29T23:59:59+09:00','2028-02-29/18','2028-02-29 18:00','2028-03-01 00:00']];
 for(const tz of ['UTC','Asia/Seoul','America/Los_Angeles']){
  await db.query("select set_config('TimeZone',$1,false)",[tz]);
  for(const [at,id,start,end]of cases){const row=(await db.query("select id,to_char(starts_at at time zone 'Asia/Seoul','YYYY-MM-DD HH24:MI') s,to_char(ends_at at time zone 'Asia/Seoul','YYYY-MM-DD HH24:MI') e from ringu_private.black_market_period($1)",[at])).rows[0];assert.deepEqual(row,{id,s:start,e:end});}
 }
 assert.deepEqual((await db.query("select has_function_privilege('anon','ringu_private.black_market_period(timestamptz)','execute') anon,has_function_privilege('authenticated','ringu_private.black_market_period(timestamptz)','execute') auth")).rows[0],{anon:false,auth:false});
 // Exercise unchanged real purchase handler through all three boundaries.
 await clockedPeriod();await clock(day+'T11:59:59+09:00');const morning=await call();assert.equal(morning.items[0].purchased,true);assert.equal(morning.expiresAt,new Date(day+'T12:00:00+09:00').getTime());
 await clock(day+'T12:00:00+09:00');const noon=await call();assert.equal(noon.rotation,day+'/12');assert.equal(noon.items.length,5);assert.ok(noon.items.every(x=>!x.purchased));assert.deepEqual(noon.rates,[49.1,15,4.9,1,15,15]);
 const noonId=randomUUID(),noonReceipt=await call('buy',noon.rotation,0,noonId),paid=await state();assert.deepEqual(await call('buy',noon.rotation,0,noonId),noonReceipt);assert.deepEqual(await state(),paid);
 await assert.rejects(()=>call('buy',old.rotation,1,randomUUID()),/BLACK_MARKET_REFRESHED/);await assert.rejects(()=>call('buy',noon.rotation,0,randomUUID()),/BLACK_MARKET_PURCHASED/);
 assert.deepEqual(await call('buy',old.rotation,0,oldId),oldReceipt,'old receipt replays after noon without granting again');assert.deepEqual(await state(),paid);
 await identify(B);const secondUser=await call();assert.deepEqual(secondUser.items,noon.items,'same shared offers, separate purchase limit');await identify(A);
 await clock(day+'T18:00:00+09:00');const evening=await call();assert.equal(evening.rotation,day+'/18');assert.ok(evening.items.every(x=>!x.purchased));
 const nextDay=(await db.query("select to_char($1::date+1,'YYYY-MM-DD') d",[day])).rows[0].d;
 await clock(nextDay+'T00:00:00+09:00');const midnight=await call();assert.equal(midnight.rotation,nextDay+'/00');assert.equal(midnight.expiresAt,new Date(nextDay+'T12:00:00+09:00').getTime());
 await clock(nextDay+'T00:00:01+09:00');assert.deepEqual((await call()).items,midnight.items,'refreshing again cannot reroll');
 assert.deepEqual(await otherFunctions(),beforeFunctions,'generator and prices untouched');
 console.log('PASS BM4: 30 timezone/boundary cases, noon/end-of-day/year/leap-day transitions, preserved current offers and receipts, idempotent migration, shared five-slot rotations, purchased-slot reset only at boundaries, stale purchase rejection and exact receipt replay. Synthetic DB only.');
}finally{await db.close();}
