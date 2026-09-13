// IEEE-754 option endpoints can serialize as 1.2000000000000002.
// Isolated PGlite PostgreSQL. No network, production credentials or user accounts.
import {readFile,readdir,mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {randomUUID} from 'node:crypto';import assert from 'node:assert/strict';
import {initialState,balance,execute} from '../supabase/functions/_shared/economy.mjs';
const {PGlite}=await import(process.env.QA_PGLITE_MODULE||'@electric-sql/pglite');
const migrationDir=new URL('../supabase/migrations/',import.meta.url);
const migrationNames=(await readdir(migrationDir)).filter(n=>n.endsWith('_black_market_prices_bp1.sql'));assert.equal(migrationNames.length,1);
const priceMigration=await readFile(new URL(migrationNames[0],migrationDir),'utf8');
const bp2Names=(await readdir(migrationDir)).filter(n=>n.endsWith('_black_market_prices_bp2.sql'));assert.equal(bp2Names.length,1);
const bp2Migration=await readFile(new URL(bp2Names[0],migrationDir),'utf8');
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

 await db.exec('begin;'+await readFile(new URL('../supabase/migrations/20260910161717_black_market_consumables_bm3.sql',import.meta.url),'utf8')+'commit;');
 const source=await readFile(new URL('../supabase/migrations/20260913061439_cube_options_cq1.sql',import.meta.url),'utf8');
 const it={...balance.gear[0],id:70001,auctionUid:randomUUID(),optionRolls:[1.2,1.2],enhance:15,transcend:0};
 await db.query("update ringu_private.accounts set state=jsonb_set(state,'{inventory}',$1::jsonb) where id=$2",[JSON.stringify([it]),A.id]);
 await db.query('insert into ringu_private.auction_items(id,uid,owner_id,item) values($1,$2,$3,$4)',[it.id,it.auctionUid,A.id,JSON.stringify(it)]);
 await db.exec('begin;'+source+'commit;');
 let migrated=(await state(A)).inventory[0];assert.deepEqual(migrated.optionRolls,[.8,.8]);assert.equal(migrated.enhance,15);
 const backups=(await db.query("select payload from ringu_private.cube_cq1_backups where scope='inventory' and id=$1",[A.id])).rows[0].payload;assert.equal(backups[0].optionRolls[0],1.2);
 migrated.optionRolls=[1.2,.8];migrated.cubeTier=3;await db.query("update ringu_private.accounts set state=jsonb_set(state,'{inventory}',$1::jsonb) where id=$2",[JSON.stringify([migrated]),A.id]);
 await db.exec('begin;'+source+'commit;');assert.equal((await state(A)).inventory[0].optionRolls[0],1.2);
 const bm=(await db.query('select (ringu_private.black_market_current()).offers offers')).rows[0].offers;for(const offer of bm)if(offer.item.rarity!==undefined)assert.deepEqual(offer.item.optionRolls,[.8,.8]);
 await db.exec('set role authenticated');await assert.rejects(()=>db.query('select * from ringu_private.cube_cq1_backups'),/permission denied/);await db.exec('reset role');
 console.log('PASS CQ1 SQL migration: min options, enhancement retained, private backup, repeated rollout preserves cube results, market defaults.');
}finally{await db.close();await rm(dir,{recursive:true,force:true});}
