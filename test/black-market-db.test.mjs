// Isolated PGlite PostgreSQL. No network, production credentials or user accounts.
import {readFile,mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {randomUUID} from 'node:crypto';import assert from 'node:assert/strict';
import {initialState,balance,execute} from '../supabase/functions/_shared/economy.mjs';
const {PGlite}=await import(process.env.QA_PGLITE_MODULE||'@electric-sql/pglite');
const dir=await mkdtemp(join(tmpdir(),'linsa-bm1-'));let db=new PGlite(dir),checks=0;
const check=(ok,label)=>{assert.ok(ok,label);checks++;};
const same=(a,b,label)=>{assert.deepEqual(a,b,label);checks++;};
async function reject(p,pattern){await assert.rejects(p,pattern);checks++;}
const players=Array.from({length:3},()=>({id:randomUUID(),sid:randomUUID()}));
async function identify(u){await db.query("select set_config('test.uid',$1,false),set_config('test.sid',$2,false)",[u?.id||'',u?.sid||'']);}
const call=async(action='status',rotation=null,slot=null,request=null)=>(await db.query('select public.ringu_black_market($1,$2,$3,$4) r',[action,rotation,slot,request])).rows[0].r;
const state=async u=>(await db.query('select state from ringu_private.accounts where id=$1',[u.id])).rows[0].state;
const revision=async u=>(await db.query('select revision from ringu_private.accounts where id=$1',[u.id])).rows[0].revision;
try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),created_at timestamptz default now());create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('session_id',current_setting('test.sid',true))$$;`);
 for(const file of ['01-account-storage.sql','02-ranking-party.sql'])await db.exec(await readFile(new URL('fixtures/'+file,import.meta.url),'utf8'));
 for(const file of ['06-costume-foundation.sql','07-costume-price-100.sql','08-costume-integration.sql','09-open-costume-shop.sql','10-auction-foundation.sql','11-economy-command-gateway.sql','16-economy-differential-commit.sql','17-black-market.sql'])await db.exec(await readFile(new URL('../supabase/'+file,import.meta.url),'utf8'));
 for(const u of players){
  await db.query('insert into auth.users values($1)',[u.id]);await db.query('insert into auth.sessions(id,user_id) values($1,$2)',[u.sid,u.id]);await identify(u);await db.query("select public.ringu_account('activate')");
  const s=initialState(Date.now());s.essence=u===players[2]?0:500;s.autoBattle=false;
  await db.query('update ringu_private.accounts set state=$1 where id=$2',[JSON.stringify(s),u.id]);await db.query('select ringu_private.auction_import($1)',[u.id]);
 }
 const [A,B,C]=players;await identify(A);
 same((await call()).ready,false,'Before economy gate no sales');await db.exec('update ringu_private.auction_release set economy_ready=true,enabled=true');
 for(const [instant,id,hours] of [
  ['2026-09-10T08:59:59.999Z','2026-09-10/00',18],['2026-09-10T09:00:00Z','2026-09-10/18',6],
  ['2026-09-10T14:59:59.999Z','2026-09-10/18',6],['2026-09-10T15:00:00Z','2026-09-11/00',18],
  ['2028-02-28T15:00:00Z','2028-02-29/00',18],['2026-12-31T15:00:00Z','2027-01-01/00',18]
 ]){
  const row=(await db.query('select * from ringu_private.black_market_period($1)',[instant])).rows[0];same(row.id,id,'KST window');same((new Date(row.ends_at)-new Date(row.starts_at))/3600000,hours,'Window duration');
 }
 await identify(null);await reject(call(),/LOGIN_REQUIRED/);await identify(A);
 for(let r=0;r<4;r++){
  await db.exec('begin');const forced=[0,0,0,0];forced[r]=100;
  await db.query('update ringu_private.black_market_config set rates=$1',[JSON.stringify(forced)]);
  await db.exec('delete from ringu_private.black_market_cycles');const x=await call();
  same(x.items.length,5);check(x.items.every(o=>o.item.rarity===r&&o.price===[5,15,50,100][r]),'rarity-price map');
  check(x.items.every(o=>o.item.optionRolls.every(n=>n>=.8&&n<=1.2)),'fixed options');
  same(new Set(x.items.map(o=>o.item.slot+'|'+o.item.name)).size,5,'distinct display templates');
  const prior=await state(A);
  await call('buy',x.rotation,0,randomUUID());
  same((await state(A)).essence,prior.essence-[5,15,50,100][r],'actual rarity debit');
  await reject(call('buy',x.rotation,0,randomUUID()),/BLACK_MARKET_PURCHASED/);
  await db.exec('rollback');
 }
 const x=await call();same(x.rates,balance.rates[8].slice(0,4));same(x.items.length,5);
 await identify(B);same((await call()).items,x.items,'all users receive exact same offers/options');await identify(A);
 const original=await state(A),rev=await revision(A),nonce=randomUUID();
 const a=await call('buy',x.rotation,0,nonce),sa=await state(A);
 same(sa.essence,original.essence-x.items[0].price,'exact debit');same(sa.inventory.length,1);same(sa.gold,original.gold);
 same(Object.fromEntries(Object.keys(x.items[0].item).map(k=>[k,a.item[k]])),x.items[0].item,'exact advertised item');
 check(sa.discovered[a.item.slot+'|'+a.item.rarity+'|'+a.item.name]===true,'discovery retained');check((await revision(A))>rev,'CAS revision advanced');
 await reject(call('buy',x.rotation,0,randomUUID()),/BLACK_MARKET_PURCHASED/);
 same(await call('buy',x.rotation,0,nonce),a,'receipt replay same result');same(await state(A),sa,'replay does not grant twice');
 await reject(call('buy',x.rotation,1,nonce),/REQUEST_ID_REUSED/);
 check((await call()).items[0].purchased,'A purchased marker');
 await identify(B);check(!(await call()).items[0].purchased,'B still can buy');
 const b=await call('buy',x.rotation,0,randomUUID());same(b.item.optionRolls,a.item.optionRolls);same(b.item.name,a.item.name);check(b.item.id!==a.item.id&&b.item.auctionUid!==a.item.auctionUid,'globally unique identities');
 await identify(C);const before=await state(C);await reject(call('buy',x.rotation,1,randomUUID()),/INSUFFICIENT_ESSENCE/);same(await state(C),before);
 await identify(A);
 for(const slot of [-1,5,null])await reject(call('buy',x.rotation,slot,randomUUID()),/INVALID_ARGUMENTS/);
 await reject(call('buy','2020-01-01/00',1,randomUUID()),/BLACK_MARKET_REFRESHED/);
 await reject(call('buy',x.rotation,1,null),/INVALID_ARGUMENTS/);
 // Full transaction rollback when the receipt cannot be recorded.
 await db.exec("create function ringu_private.bm_qa_fail() returns trigger language plpgsql as $$begin raise exception 'QA_ABORT';end$$;create trigger bm_qa_fail before insert on ringu_private.black_market_purchases for each row execute function ringu_private.bm_qa_fail();");
 const previous=await state(A),count=(await db.query('select count(*) n from ringu_private.auction_items')).rows[0].n;
 await reject(call('buy',x.rotation,1,randomUUID()),/QA_ABORT/);same(await state(A),previous);same((await db.query('select count(*) n from ringu_private.auction_items')).rows[0].n,count);
 await db.exec('drop trigger bm_qa_fail on ringu_private.black_market_purchases;drop function ringu_private.bm_qa_fail()');
 for(let slot=1;slot<5;slot++)await call('buy',x.rotation,slot,randomUUID());
 check((await call()).items.every(row=>row.purchased),'one purchase allowed for EACH of five offers');
 // A stale economy computation may not overwrite the new market item or currency.
 const computed=execute(original,'sync',{}, {now:Date.now(),random:()=>.5,itemIds:[],uuid:randomUUID});
 await reject(db.query('select public.ringu_economy_commit($1,$2,$3,$4,$5,$6,$7)',[A.id,A.sid,rev,randomUUID(),JSON.stringify({command:'sync',args:{}}),JSON.stringify(computed.state),JSON.stringify({events:[]})]),/SAVE_CONFLICT/);
 const sellState=await state(A);sellState.inventory=sellState.inventory.filter(it=>it.id!==a.item.id);
 await db.query('update ringu_private.accounts set state=$1 where id=$2',[JSON.stringify(sellState),A.id]);await db.query('update ringu_private.auction_items set owner_id=null where id=$1',[a.item.id]);
 await reject(call('buy',x.rotation,0,randomUUID()),/BLACK_MARKET_PURCHASED/);same(await call('buy',x.rotation,0,nonce),a);same((await state(A)).inventory.length,4,'replay after item disposal cannot recreate it');
 // Permissions and newest-session checks.
 for(const role of ['anon','authenticated']){
  check(!(await db.query("select has_table_privilege($1,'ringu_private.black_market_cycles','SELECT') p",[role])).rows[0].p,'no raw catalogue table reads');
  check(!(await db.query("select has_function_privilege($1,'ringu_private.black_market_current()','EXECUTE') p",[role])).rows[0].p,'no private generator access');
 }
 check(!(await db.query("select has_function_privilege('anon','public.ringu_black_market(text,text,integer,uuid)','EXECUTE') p")).rows[0].p,'anonymous calls denied');
 await db.exec('set role authenticated');await call();checks++;await db.exec('reset role');
 const newSid=randomUUID();await db.query('insert into auth.sessions(id,user_id,created_at) values($1,$2,clock_timestamp()+interval \'1 second\')',[newSid,A.id]);await reject(call(),/SESSION_/);
 await identify(B);const persisted=await call();await db.close();db=new PGlite(dir);await identify(B);same((await call()).items,persisted.items,'DB restart retains inventory and personal purchases');
 console.log(`PASS BM2 PostgreSQL: ${checks} assertions (shared display, prices, options, KST boundaries, replay, rollback, limits, CAS, authorization, restart).`);
} finally {await db.close();await rm(dir,{recursive:true,force:true});}
