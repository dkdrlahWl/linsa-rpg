// Isolated embedded Postgres. NOT a substitute for independent PostgreSQL
// connections when testing real lock contention; that remains a release gate.
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';import {join,resolve,dirname,basename} from 'node:path';
import {randomUUID} from 'node:crypto';import assert from 'node:assert/strict';
const {PGlite}=await import(process.env.QA_PGLITE_MODULE||'@electric-sql/pglite');
const directory=await mkdtemp(join(tmpdir(),'ringu-auction-test-'));let db=new PGlite(directory);const checks=[];
const users=Array.from({length:3},()=>({id:randomUUID(),sid:randomUUID()}));
async function identity(u){await db.query("select set_config('test.uid',$1,false),set_config('test.sid',$2,false)",[u.id,u.sid]);}
async function call(u,action,args={},requestId=randomUUID()) {await identity(u);return (await db.query('select public.ringu_auction($1,$2::jsonb,$3::uuid) r',[action,JSON.stringify(args),requestId])).rows[0].r;}
async function saved(u){return (await db.query('select state,revision from ringu_private.accounts where id=$1',[u.id])).rows[0];}
async function item(u){return (await saved(u)).state.inventory[0];}
async function reject(u,action,args,pattern,nonce){await assert.rejects(()=>call(u,action,args,nonce),pattern);}
try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),created_at timestamptz default now());create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('session_id',current_setting('test.sid',true))$$;`);
 for(const name of ['01-account-storage.sql','02-ranking-party.sql'])await db.exec(await readFile(new URL('fixtures/'+name,import.meta.url),'utf8'));
 for(const name of ['06-costume-foundation.sql','07-costume-price-100.sql','08-costume-integration.sql','09-open-costume-shop.sql','10-auction-foundation.sql'])await db.exec(await readFile(new URL('../supabase/'+name,import.meta.url),'utf8'));
 for(const [i,u] of users.entries()){
  await db.query('insert into auth.users values($1)',[u.id]);await db.query('insert into auth.sessions(id,user_id) values($1,$2)',[u.sid,u.id]);await identity(u);await db.query("select public.ringu_account('activate')");
  // Deliberately same numeric legacy ID across different accounts.
  const state={playerName:'같은 닉네임',essence:i===2?0:500,gold:1234,inventory:[{id:1,name:'시험 장비',slot:'무기',rarity:3,baseAtk:150,enhance:15,transcend:2,optionRolls:[.876,.942],locked:false,extra:{preserved:true}}],equipped:{}};
  await db.query('update ringu_private.accounts set state=$2::jsonb where id=$1',[u.id,JSON.stringify(state)]);
 }
 const [A,B,C]=users;
 assert.equal((await call(A,'status')).ready,false);await reject(A,'list',{itemId:1,price:20},/AUCTION_NOT_READY/);checks.push('default closed; no fake production listings');
 for(const u of users)await db.query('select ringu_private.auction_import($1)',[u.id]);
 const original=await item(A);assert.equal(original.legacyId,1);assert.notEqual(original.id,(await item(B)).id);
 await db.query('select ringu_private.auction_import($1)',[A.id]);assert.deepEqual(await item(A),original);checks.push('idempotent globally unique ID migration preserves legacy properties');
 // TEST DATABASE ONLY: enrolled fixtures stand in for the pending economy cutover.
 await db.exec('update ringu_private.auction_release set enabled=true,economy_ready=true');
 for(const price of [-1,0,1.5,'20','bad',null,9007199254740992])await reject(A,'list',{itemId:original.id,price},/INVALID_NUMBER/);
 await reject(B,'list',{itemId:original.id,price:20},/ITEM_NOT_OWNED/);
 const nonce=randomUUID(),listed=await call(A,'list',{itemId:original.id,price:37},nonce);
 assert.deepEqual(await call(A,'list',{itemId:original.id,price:37},nonce),listed);
 await reject(A,'list',{itemId:original.id,price:38},/REQUEST_ID_REUSED/,nonce);
 assert.equal((await saved(A)).state.inventory.length,0);await reject(A,'list',{itemId:original.id,price:37},/ITEM_NOT_OWNED/);
 await reject(A,'buy',{listingId:listed.listingId},/SELF_PURCHASE/);await reject(C,'cancel',{listingId:listed.listingId},/NOT_SELLER/);
 await reject(C,'buy',{listingId:listed.listingId},/INSUFFICIENT_ESSENCE/);assert.equal((await saved(C)).state.essence,0);
 await reject(B,'buy',{listingId:listed.listingId,price:1},/INVALID_ARGUMENTS/);
 const bnonce=randomUUID(),bought=await call(B,'buy',{listingId:listed.listingId},bnonce);
 assert.deepEqual(await call(B,'buy',{listingId:listed.listingId},bnonce),bought);
 assert.equal((await call(B,'receipt',{},bnonce)).found,true);
 assert.equal((await saved(A)).state.essence,537);assert.equal((await saved(B)).state.essence,463);
 assert.deepEqual((await saved(B)).state.inventory.find(x=>x.id===original.id),original);
 await reject(C,'buy',{listingId:listed.listingId},/ALREADY_SOLD/);await reject(A,'cancel',{listingId:listed.listingId},/ALREADY_SOLD/);
 assert.equal((await call(B,'search')).total,0);assert.equal((await call(A,'history',{side:'sell'})).total,1);assert.equal((await call(B,'history')).total,1);
 checks.push('A listing/B essence purchase; full seller proceeds; original enhancement/transcend/options; duplicate receipts and stale purchases rejected');
 checks.push('self purchase, invalid prices, client price override, insufficient essence and other-account actions rejected');
 // A was not actively polling/saving during sale. Test returning save snapshots.
 await identity(A);const snapshot=await saved(A),stale={...snapshot.state,essence:500,inventory:[original]};
 await assert.rejects(()=>db.query('select public.ringu_save_costume($1::jsonb,$2,0)',[JSON.stringify(stale),snapshot.revision]),/ECONOMY_COMMAND_REQUIRED/);
 await assert.rejects(()=>db.query('select public.ringu_account_before_auction($1,null,null)',['load']).then(()=>db.exec('set role authenticated; select public.ringu_account_before_auction(\'load\');')),/permission denied/);await db.exec('reset role');
 assert.equal((await saved(A)).state.essence,537);assert.equal((await saved(A)).state.inventory.length,0);
 await db.query('select public.ringu_save_costume($1::jsonb,$2,0)',[JSON.stringify({...snapshot.state,gold:1500}),snapshot.revision]);checks.push('old inventory/essence rejected even with current revision; unrelated save permitted; private legacy bypass denied');
 const bitem=await item(B),cancelled=await call(B,'list',{itemId:bitem.id,price:20});const cnonce=randomUUID();await call(B,'cancel',{listingId:cancelled.listingId},cnonce);await call(B,'cancel',{listingId:cancelled.listingId},cnonce);
 assert.equal((await saved(B)).state.inventory.filter(x=>x.id===bitem.id).length,1);assert.deepEqual((await saved(B)).state.inventory.find(x=>x.id===bitem.id),bitem);
 await reject(A,'buy',{listingId:cancelled.listingId},/LISTING_CLOSED/);checks.push('cancel original return once; purchase after cancellation rejected');
 const persisted=await call(B,'list',{itemId:bitem.id,price:70});await db.close();db=new PGlite(directory);
 assert.equal((await call(A,'search')).rows[0].id,persisted.listingId);assert.equal((await call(A,'history',{side:'sell'})).total,1);checks.push('database close/reopen retains active listings and completed history');
 // Force an error after debit/credit, verifying transaction rollback, not merely preconditions.
 await db.exec("create function ringu_private.qa_fail_trade() returns trigger language plpgsql as $$begin raise exception 'QA_ROLLBACK';end$$;create trigger qa_failure before insert on ringu_private.auction_trades for each row execute function ringu_private.qa_fail_trade();");
 const beforeA=await saved(A),beforeB=await saved(B);await reject(A,'buy',{listingId:persisted.listingId},/QA_ROLLBACK/);
 assert.deepEqual(await saved(A),beforeA);assert.deepEqual(await saved(B),beforeB);assert.equal((await call(A,'search')).total,1);checks.push('forced post-debit failure rolls back buyer/seller/item/listing atomically');
 console.log(JSON.stringify({passed:checks,notRun:['real multi-connection simultaneous buy/buy and buy/cancel','production DB migration','live two-browser integration with authoritative gameplay commands']},null,2));
}finally{await db.close();assert.equal(dirname(resolve(directory)),resolve(tmpdir()));assert.ok(basename(directory).startsWith('ringu-auction-test-'));await rm(directory,{recursive:true,force:true});}
