import {readFile} from 'node:fs/promises';import {randomUUID} from 'node:crypto';import assert from 'node:assert/strict';
const {PGlite}=await import(process.env.QA_PGLITE_MODULE||'@electric-sql/pglite');const db=new PGlite();
const users=Array.from({length:3},()=>({id:randomUUID(),sid:randomUUID()}));const [a,b,c]=users;
const identify=async u=>db.query("select set_config('test.uid',$1,false),set_config('test.sid',$2,false)",[u?.id||'',u?.sid||'']);
const call=async(action='status',recipient=null,amount=null,id=null)=>(await db.query('select public.ringu_gold_transfer($1,$2,$3,$4) r',[action,recipient,amount,id])).rows[0].r;
const balances=async()=>(await db.query("select id,(state->>'gold')::bigint gold,revision from ringu_private.accounts order by id")).rows;
try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),created_at timestamptz default now());create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('session_id',current_setting('test.sid',true))$$;`);
 for(const f of ['01-account-storage.sql','02-ranking-party.sql'])await db.exec(await readFile(new URL('fixtures/'+f,import.meta.url),'utf8'));
 await db.exec('create table ringu_private.auction_release(singleton boolean,economy_ready boolean);insert into ringu_private.auction_release values(true,true)');
 for(const u of users){await db.query('insert into auth.users values($1)',[u.id]);await db.query('insert into auth.sessions(id,user_id) values($1,$2)',[u.sid,u.id]);await identify(u);await db.query("select public.ringu_account('activate')");await db.query('update ringu_private.accounts set state=$1 where id=$2',[{gold:1000,essence:22,playerName:u.id,rankingHidden:u===c,mailbox:[],inventory:[]},u.id]);}
 await db.exec(await readFile(new URL('../supabase/20-gold-transfer.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../supabase/21-gold-transfer-fee.sql',import.meta.url),'utf8'));
 await identify(a);assert.deepEqual((await call()).rows.map(x=>x.id),[b.id]);
 const request=randomUUID();await call('send',b.id,400,request);const after=await balances();assert.equal(after.find(x=>x.id===a.id).gold,580);assert.equal(after.find(x=>x.id===b.id).gold,1400);
 await call('send',b.id,400,request);assert.deepEqual(await balances(),after);
 await assert.rejects(()=>call('send',b.id,401,request),/REQUEST_ID_REUSED/);
 for(const amount of [0,-1,1.5,9000000000001,null,'NaN'])await assert.rejects(()=>call('send',b.id,amount,randomUUID()),/INVALID_ARGUMENTS/);
 await assert.rejects(()=>call('send',a.id,1,randomUUID()),/TRANSFER_SELF/);
 await assert.rejects(()=>call('send',c.id,1,randomUUID()),/TRANSFER_RECIPIENT_UNAVAILABLE/);
 await assert.rejects(()=>call('send',b.id,601,randomUUID()),/INSUFFICIENT_GOLD/);assert.deepEqual(await balances(),after);
 const attempts=await Promise.allSettled([call('send',b.id,400,randomUUID()),call('send',b.id,400,randomUUID())]);assert.equal(attempts.filter(x=>x.status==='fulfilled').length,1);
 assert.equal((await balances()).reduce((n,x)=>n+x.gold,0),2960);
 await db.query("update ringu_private.accounts set state=jsonb_set(state,'{gold}','9000000000000') where id=$1",[b.id]);await assert.rejects(()=>call('send',b.id,1,randomUUID()),/TRANSFER_RECIPIENT_LIMIT/);
 const beforeTiny=await balances();await db.query("update ringu_private.accounts set state=jsonb_set(state,'{gold}','1000') where id=$1",[b.id]);const tiny=randomUUID();const tinyResult=await call('send',b.id,1,tiny);assert.equal(tinyResult.fee,1);assert.equal(tinyResult.total,2);const afterTiny=await balances();await call('send',b.id,1,tiny);assert.deepEqual(await balances(),afterTiny);
 await identify(null);await assert.rejects(()=>call(),/LOGIN_REQUIRED/);
 await identify(a);await db.exec('set role authenticated');await assert.rejects(()=>db.query('select * from ringu_private.gold_transfers'),/permission denied/);await db.exec('reset role');
 await db.exec('set role anon');await assert.rejects(()=>call(),/permission denied/);await db.exec('reset role');
 assert.equal((await db.query("select state->>'essence' essence from ringu_private.accounts where id=$1",[a.id])).rows[0].essence,'22');
 console.log('PASS gold transfer SQL: atomic balances, gold conservation, idempotency, competing spending, ranking eligibility, amount limits, session and table permissions');
}finally{await db.close();}
