// BM3 SQL acceptance. Fresh synthetic database only; optional loopback PG for real races.
import {readFile,readdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {initialState,balance,execute} from '../supabase/functions/_shared/economy.mjs';
const pgURL=process.env.BM3_QA_PG_URL;let db,PgClient;
if(pgURL){const url=new URL(pgURL);assert.ok(['127.0.0.1','localhost'].includes(url.hostname),'QA database must be loopback');({Client:PgClient}=await import(process.env.QA_PG_MODULE||'pg'));db=new PgClient({connectionString:pgURL});await db.connect();db.exec=q=>db.query(q);db.close=()=>db.end();}
else {const {PGlite}=await import('@electric-sql/pglite');db=new PGlite();}
const sqlFile=async n=>readFile(new URL(n,import.meta.url),'utf8');
const migrationNames=(await readdir(new URL('../supabase/migrations/',import.meta.url))).sort();
const bm3Name=migrationNames.find(n=>n.endsWith('_black_market_consumables_bm3.sql'));assert.ok(bm3Name);
const migration=await sqlFile('../supabase/migrations/'+bm3Name);
const A={id:randomUUID(),sid:randomUUID()},B={id:randomUUID(),sid:randomUUID()};
const identify=async(u,client=db)=>client.query("select set_config('test.uid',$1,false),set_config('test.sid',$2,false)",[u?.id||'',u?.sid||'']);
const call=async(action='status',rotation=null,slot=null,nonce=null,client=db)=>(await client.query('select public.ringu_black_market($1,$2,$3,$4) r',[action,rotation,slot,nonce])).rows[0].r;
const account=async u=>(await db.query('select state,revision from ringu_private.accounts where id=$1',[u.id])).rows[0];
let checks=0;const same=(a,b,msg)=>{assert.deepEqual(a,b,msg);checks++;};
const reject=async fn=>{await db.exec('savepoint expected_error');let error;try{await fn();}catch(e){error=e;}await db.exec('rollback to savepoint expected_error');assert.ok(error,'expected rejection');checks++;return error.message;};
const force=async r=>{const rates=Array(6).fill(0);rates[r]=100;await db.query('update ringu_private.black_market_config set rates=$1',[JSON.stringify(rates)]);await db.exec('delete from ringu_private.black_market_purchases;delete from ringu_private.black_market_cycles;');return call();};
try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),created_at timestamptz default now());create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('session_id',current_setting('test.sid',true))$$;`);
 for(const file of ['01-account-storage.sql','02-ranking-party.sql'])await db.exec(await sqlFile('fixtures/'+file));
 for(const file of ['06-costume-foundation.sql','07-costume-price-100.sql','08-costume-integration.sql','09-open-costume-shop.sql','10-auction-foundation.sql','11-economy-command-gateway.sql','16-economy-differential-commit.sql','17-black-market.sql'])await db.exec(await sqlFile('../supabase/'+file));
 for(const name of migrationNames.filter(n=>/_black_market_prices_bp[12]\.sql$/.test(n)))await db.exec('begin;'+await sqlFile('../supabase/migrations/'+name)+'commit;');
 for(const u of [A,B]){
  await db.query('insert into auth.users values($1)',[u.id]);await db.query('insert into auth.sessions(id,user_id) values($1,$2)',[u.sid,u.id]);await identify(u);await db.query("select public.ringu_account('activate')");
  const s=initialState(Date.now());Object.assign(s,{essence:10000,autoBattle:false});await db.query('update ringu_private.accounts set state=$1 where id=$2',[JSON.stringify(s),u.id]);await db.query('select ringu_private.auction_import($1)',[u.id]);
 }
 await db.exec('update ringu_private.auction_release set economy_ready=true,enabled=true');await identify(A);
 const old=await call(),nonce=randomUUID(),receipt=await call('buy',old.rotation,0,nonce);
 const before=(await db.query('select * from ringu_private.black_market_cycles order by id')).rows;
 const purchased=(await db.query('select * from ringu_private.black_market_purchases order by slot')).rows;
 const beforeA=await account(A),beforeB=await account(B);
 await db.exec('begin;'+migration+'commit;');
 const upgraded=await call();same(upgraded.version,'BM3');same(upgraded.nextRates,[49.1,15,4.9,1,15,15]);same(upgraded.ratesApplyNextRotation,true);
 same((await db.query('select * from ringu_private.black_market_cycles order by id')).rows,before,'existing offers NOT rerolled');
 same((await db.query('select * from ringu_private.black_market_purchases order by slot')).rows,purchased,'receipt history unchanged');
 same(await account(A),beforeA);same(await account(B),beforeB);same(await call('buy',old.rotation,0,nonce),receipt,'pre-upgrade receipt replay');
 await db.exec('begin;'+migration+'commit;');same(await account(A),beforeA,'idempotent migration');same((await call()).items,upgraded.items);
 for(let r=0;r<6;r++){
  await db.exec('begin');await identify(A);const cycle=await force(r),prices=cycle.items.map(o=>o.price);
  same(cycle.items.length,5);same(cycle.rates[r],100);
  if(r<4){assert.ok(cycle.items.every(o=>o.kind==='equipment'&&o.item.rarity===r&&o.price===[3,5,10,15][r]));same(new Set(cycle.items.map(o=>o.item.name+'|'+o.item.slot)).size,5);}
  else assert.ok(prices.every(p=>Number.isInteger(p)&&p>=(r===4?13:4)&&p<=(r===4?18:8)));
  const pre=await account(A),id=randomUUID(),first=await call('buy',cycle.rotation,0,id),after=await account(A);
  same(after.state.essence,pre.state.essence-prices[0]);same(Number(after.revision),Number(pre.revision)+1);same(first.price,prices[0]);
  if(r>=4){
   const resource=r===4?'transcendStone':'downgradeProtect';same(first.resource,resource);same(first.quantity,1);same(after.state[resource],pre.state[resource]+1);
   same(after.state.inventory,pre.state.inventory);same(after.state.discovered,pre.state.discovered);same(after.state.uid,pre.state.uid);
   same((await db.query('select item_id from ringu_private.black_market_purchases where request_id=$1',[id])).rows[0].item_id,null);
   const other=r===4?'downgradeProtect':'transcendStone';same(after.state[other],pre.state[other]);
   const settled=execute(after.state,'sync',{}, {now:Date.now(),random:()=>.5,itemIds:[],uuid:randomUUID});same(settled.state[resource],after.state[resource],'later authoritative sync preserves resource');
  }else same(after.state.inventory.length,pre.state.inventory.length+1);
  same(await call('buy',cycle.rotation,0,id),first);same(await account(A),after,'lost response retry never doubles');
  assert.match(await reject(()=>call('buy',cycle.rotation,0,randomUUID())),/BLACK_MARKET_PURCHASED/);
  assert.match(await reject(()=>call('buy',cycle.rotation,1,id)),/REQUEST_ID_REUSED/);
  assert.match(await reject(()=>call('buy','old-cycle',1,randomUUID())),/BLACK_MARKET_REFRESHED/);
  await identify(B);same((await call()).items.map(({purchased,...o})=>o),cycle.items.map(({purchased,...o})=>o),'all users share fixed offers and price');
  const purchaseB=await call('buy',cycle.rotation,0,randomUUID());same(purchaseB.price,prices[0]);
  await db.query("update ringu_private.accounts set state=jsonb_set(state,'{essence}','0') where id=$1",[B.id]);const poor=await account(B);
  assert.match(await reject(()=>call('buy',cycle.rotation,1,randomUUID())),/INSUFFICIENT_ESSENCE/);same(await account(B),poor);
  await identify(A);
  await db.exec("create function ringu_private.bm3_fail() returns trigger language plpgsql as $$begin raise exception 'QA_POST_DEBIT_FAILURE';end$$;create trigger bm3_fail before insert on ringu_private.black_market_purchases for each row execute function ringu_private.bm3_fail();");
  const safe=await account(A);assert.match(await reject(()=>call('buy',cycle.rotation,1,randomUUID())),/QA_POST_DEBIT_FAILURE/);same(await account(A),safe);
  await db.exec('drop trigger bm3_fail on ringu_private.black_market_purchases;drop function ringu_private.bm3_fail();');
  if(r>=4){
   const resource=r===4?'transcendStone':'downgradeProtect';await db.query('update ringu_private.accounts set state=jsonb_set(state,$1,$2) where id=$3',[[resource],'9007199254740991',A.id]);const full=await account(A);
   assert.match(await reject(()=>call('buy',cycle.rotation,1,randomUUID())),/RESOURCE_BALANCE_LIMIT/);same(await account(A),full);
  }
  await identify(null);assert.match(await reject(()=>call()),/LOGIN_REQUIRED/);await identify(A);
  await db.exec('rollback');
 }
 await db.exec('begin;create temp table bm3_samples(kind integer,price integer);delete from ringu_private.black_market_purchases;delete from ringu_private.black_market_cycles;');
 await db.exec(`do $$declare c ringu_private.black_market_cycles;i integer;begin for i in 1..600 loop
 c:=ringu_private.black_market_current();
 insert into bm3_samples select case when o->>'kind'='consumable' then case when o#>>'{item,resource}'='transcendStone' then 4 else 5 end else (o#>>'{item,rarity}')::int end,(o->>'price')::int from jsonb_array_elements(c.offers) o;
 delete from ringu_private.black_market_cycles where id=c.id;end loop;end$$;`);
 const counts=(await db.query('select kind,count(*)::int n,min(price)::int lo,max(price)::int hi from bm3_samples group by kind order by kind')).rows;
 same(counts.length,6);const target=[49.1,15,4.9,1,15,15];for(const row of counts)assert.ok(Math.abs(row.n/30-target[row.kind])<4,JSON.stringify(counts));
 same([counts[4].lo,counts[4].hi],[13,18]);same([counts[5].lo,counts[5].hi],[4,8]);await db.exec('rollback');
 const perms=(await db.query("select has_function_privilege('anon','public.ringu_black_market(text,text,integer,uuid)','execute') anon,has_function_privilege('authenticated','public.ringu_black_market(text,text,integer,uuid)','execute') auth,has_function_privilege('authenticated','ringu_private.black_market_current()','execute') internal")).rows[0];same(perms,{anon:false,auth:true,internal:false});
 if(PgClient){
  await identify(A);const cycle=await force(4);const pre=await account(A);const clients=await Promise.all([0,1].map(async()=>{const c=new PgClient({connectionString:pgURL});await c.connect();await identify(A,c);return c;}));
  const results=await Promise.allSettled(clients.map(c=>call('buy',cycle.rotation,0,randomUUID(),c)));same(results.filter(x=>x.status==='fulfilled').length,1);same((await account(A)).state.transcendStone,pre.state.transcendStone+1);
  const id=randomUUID(),prev=await account(A);const replay=await Promise.all(clients.map(c=>call('buy',cycle.rotation,1,id,c)));same(replay[0],replay[1]);same((await account(A)).state.transcendStone,prev.state.transcendStone+1);await Promise.all(clients.map(c=>c.end()));
 }
 console.log(JSON.stringify({suite:'BM3',checks,distribution:counts,realIndependentConnections:!!PgClient,productionDataUsed:false}));
}finally{await db.close();}
