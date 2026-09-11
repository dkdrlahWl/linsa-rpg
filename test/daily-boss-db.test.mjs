import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {initialState,execute,balance} from '../supabase/functions/_shared/economy.mjs';
import {PROBABILITIES} from '../supabase/functions/_shared/daily-boss.mjs';
const db=new PGlite();
const migration=await readFile(new URL('../supabase/migrations/20260911132759_daily_boss.sql',import.meta.url),'utf8');
try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),created_at timestamptz default now());create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('session_id',current_setting('test.sid',true))$$;create schema extensions;create function extensions.gen_random_bytes(int) returns bytea language sql as $$select decode(lpad(to_hex(current_setting('test.roll')::int),2,'0'),'hex')$$;`);
 for(const n of ['01-account-storage.sql','02-ranking-party.sql'])await db.exec(await readFile(new URL('fixtures/'+n,import.meta.url),'utf8'));
 for(const n of ['06-costume-foundation.sql','07-costume-price-100.sql','08-costume-integration.sql','09-open-costume-shop.sql','10-auction-foundation.sql','11-economy-command-gateway.sql','16-economy-differential-commit.sql'])await db.exec(await readFile(new URL('../supabase/'+n,import.meta.url),'utf8'));
 // Only the clock and random byte source are injected, all business SQL is real.
 await db.exec(migration.replaceAll('clock_timestamp()',"current_setting('test.now')::timestamptz"));
 await db.exec("update ringu_private.auction_release set economy_ready=true;select set_config('test.roll','0',false)");
 const clock=async s=>db.query("select set_config('test.now',$1,false)",[s]);await clock('2026-09-11T12:00:00Z');
 const users=[];
 async function auth(u){await db.query("select set_config('test.uid',$1,false),set_config('test.sid',$2,false)",[u.id,u.sid]);}
 const snap=async()=> (await db.query('select public.ringu_economy_snapshot() s')).rows[0].s;
 for(let i=0;i<8;i++){
  const u={id:randomUUID(),sid:randomUUID()};users.push(u);
  await db.query('insert into auth.users values($1)',[u.id]);await db.query('insert into auth.sessions(id,user_id) values($1,$2)',[u.sid,u.id]);await auth(u);await db.query("select public.ringu_account('activate')");
  const s=initialState(Date.now());s.autoBattle=false;s.playerName='도전자 '+i;
  await db.query('select public.ringu_economy_enroll($1,$2,$3)',[u.id,u.sid,JSON.stringify(s)]);
 }
 const boss=async(u,action='status',id=null,revision=null,hits=null)=>(await db.query('select public.ringu_daily_boss($1,$2,$3,$4,$5,$6) r',[u.id,u.sid,action,id,revision,JSON.stringify(hits)])).rows[0].r;
 const plan=damage=>Array.from({length:10},(_,i)=>({at:(i+1)*1000,damage,crit:false}));
 const start=async(u,damage=100,id=randomUUID())=>{await auth(u);const s=await snap();return boss(u,'start',id,s.revision,plan(damage));};
 const u=users[0],nonce=randomUUID();let r=await start(u,100,nonce);
 assert.equal(r.remaining,2);assert.equal(r.total,0);assert.equal(r.active.endsAt-r.active.startedAt,10000);
 assert.equal((await start(u,999,nonce)).remaining,2);await assert.rejects(()=>start(u),/BATTLE_IN_PROGRESS/);
 await clock('2026-09-11T12:00:09.999Z');assert.equal((await boss(u)).total,0);
 await clock('2026-09-11T12:00:10Z');r=await boss(u);assert.equal(r.total,1000);assert.equal(r.result.damage,1000);
 await boss(u,'ack',nonce);assert.equal((await boss(u)).result,null);
 await start(u,200);await clock('2026-09-11T12:00:20Z');await boss(u);await start(u,300);await clock('2026-09-11T12:00:30Z');r=await boss(u);assert.equal(r.total,6000);assert.equal(r.remaining,0);await assert.rejects(()=>start(u),/DAILY_BOSS_LIMIT/);
 for(let i=1;i<8;i++){await start(users[i],i===1?600:100+i);await clock('2026-09-11T12:01:'+String(i*5).padStart(2,'0')+'Z');await boss(users[i]);}
 await clock('2026-09-11T14:59:59Z');r=await boss(u);assert.equal(r.ranking.length,8);assert.equal(r.ranking[0].accountId,u.id);assert.equal(r.ranking[1].accountId,users[1].id);assert.equal(r.total,6000);
 // Crossing midnight keeps a sealed ten-hit plan in its start date.
 await start(users[7],900);await clock('2026-09-11T15:00:00Z');r=await boss(u);assert.equal(r.day,'2026-09-12');assert.equal(r.remaining,3);assert.equal(r.total,0);assert.equal(r.ranking.length,0);
 assert.equal((await db.query('select count(*)::int n from ringu_private.daily_boss_rewards')).rows[0].n,8);
 await boss(u);await db.exec('select ringu_private.daily_boss_settle()');assert.equal((await db.query('select count(*)::int n from ringu_private.daily_boss_rewards')).rows[0].n,8);
 const crossing=await boss(users[7]);assert.ok(crossing.active);assert.equal(crossing.active.endsAt-crossing.active.startedAt,10000);await clock('2026-09-11T15:00:09Z');assert.ok((await boss(users[7])).result);
 // Mail claim is atomic with the existing CAS/receipt transaction.
 await auth(u);let s=await snap();assert.equal(s.state.mailbox.length,1);assert.equal(s.state.essence,0);
 const mail=s.state.mailbox[0],rid=randomUUID(),computed=execute(s.state,'mail',{id:mail.id},{...s,random:()=>0,uuid:randomUUID});
 const commit=()=>db.query('select public.ringu_economy_commit($1,$2,$3,$4,$5,$6,$7)',[u.id,u.sid,s.revision,rid,JSON.stringify({command:'mail',args:{id:mail.id}}),JSON.stringify(computed.state),JSON.stringify({events:computed.events})]);
 await commit();await commit();assert.equal((await snap()).state.essence,10);assert.equal((await snap()).state.mailbox.length,0);
 assert.throws(()=>execute((computed.state),'mail',{id:mail.id},{...s,random:()=>0,uuid:randomUUID}),/MAIL_NOT_FOUND/);
 await db.exec('select ringu_private.daily_boss_settle()');assert.equal((await snap()).state.mailbox.length,0);
 // All 100 random buckets for every rank are checked against the actual SQL.
 for(let roll=0;roll<100;roll++){
  await db.exec('begin');await db.exec('delete from ringu_private.daily_boss_rewards;update ringu_private.daily_boss_days set closed_at=null');
  await db.query("select set_config('test.roll',$1,false)",[String(roll)]);await db.exec('select ringu_private.daily_boss_settle()');
  const rows=(await db.query('select rank,amount from ringu_private.daily_boss_rewards order by rank')).rows;
  for(const row of rows){let sum=0;const expected=PROBABILITIES[row.rank-1].findIndex(p=>(sum+=p)>roll)+10;assert.equal(row.amount,expected);}
  await db.exec('rollback');
 }
 // Offline catch-up covers multiple missed days and does not regenerate mail.
 await start(u,100);await clock('2026-09-14T00:00:00Z');await boss(u);assert.equal((await db.query('select count(*)::int n from ringu_private.daily_boss_rewards where account_id=$1',[u.id])).rows[0].n,2);
 await db.exec('set role authenticated');await assert.rejects(()=>boss(u),/permission denied/);await assert.rejects(()=>db.query('select * from ringu_private.daily_boss_runs'),/permission denied/);await db.exec('reset role');
 // 1,248 equipment IDs are removed and credited once with durable tombstones.
 await auth(u);s=await snap();const seed=structuredClone(s.state);seed.inventory=Array.from({length:1248},(_,i)=>({...balance.gear[0],id:50000+i,auctionUid:randomUUID(),enhance:0,transcend:0}));
 const apply=async(st,id,fp,rev)=>(await db.query('select public.ringu_economy_commit($1,$2,$3,$4,$5,$6,$7)',[u.id,u.sid,rev,id,JSON.stringify(fp),JSON.stringify(st),'{}']));
 await apply(seed,randomUUID(),{command:'sync',args:{}},s.revision);s=await snap();let draws=0;
 const args={ids:s.state.inventory.map(it=>it.id)},out=execute(s.state,'dismantle',args,{...s,uuid:randomUUID,random:()=>.5,randomInt:()=>draws++<2?0:999}),request=randomUUID();
 await apply(out.state,request,{command:'dismantle',args},s.revision);await apply(out.state,request,{command:'dismantle',args},s.revision);
 const paid=await snap();assert.equal(paid.state.gold,s.state.gold);assert.equal(paid.state.essence,s.state.essence+2);assert.equal(paid.state.inventory.length,0);assert.equal(draws,1248);
 assert.equal((await db.query('select count(*)::int n from ringu_private.auction_items where id between 50000 and 51247 and owner_id is null')).rows[0].n,1248);
 console.log('PASS SQL: 3 attempts, immediate debit, exact 10s, sealed midnight crossover, sums, 8 ranks/tie, 800 probability outcomes, catch-up, unique mail/replay/deletion, denied client writes, 1248-item atomic dismantling.');
}finally{await db.close();}
