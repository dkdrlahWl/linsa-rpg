import {readFile} from 'node:fs/promises';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import catalog from '../costume-catalog.js';
const {PGlite}=await import(process.env.QA_PGLITE_MODULE||'@electric-sql/pglite');const db=new PGlite();
try{
 await db.exec("create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create table auth.sessions(id uuid primary key,user_id uuid,created_at timestamptz default now());create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('session_id',current_setting('test.sid',true))$$;");
 await db.exec(await readFile(new URL('fixtures/01-account-storage.sql',import.meta.url),'utf8'));
 const migration=await readFile(new URL('../supabase/06-costume-foundation.sql',import.meta.url),'utf8');await db.exec(migration);await db.exec(migration);
 const priceMigration=await readFile(new URL('../supabase/07-costume-price-100.sql',import.meta.url),'utf8');await db.exec(priceMigration);await db.exec(priceMigration);
 // Fail the build when client products and authoritative prices/bonuses diverge.
 const products=(await db.query('select id,name,price,attack_percent from ringu_private.costume_catalog order by id')).rows;
 assert.deepEqual(products.map(p=>({...p,price:Number(p.price)})),Object.entries(catalog.products).map(([id,p])=>({id,name:p.name,price:p.price,attack_percent:p.attackPercent})).sort((a,b)=>a.id.localeCompare(b.id)));
 await db.exec('set role authenticated');
 await assert.rejects(db.query('select * from ringu_private.costume_ownership'),/permission denied/);
 await assert.rejects(db.query('update ringu_private.costume_release set essence_authoritative=true'),/permission denied/);
 await db.exec('reset role');
 const uid=randomUUID(),sid=randomUUID();await db.query('insert into auth.users values($1)',[uid]);await db.query('insert into auth.sessions(id,user_id) values($1,$2)',[sid,uid]);await db.query("select set_config('test.uid',$1,false),set_config('test.sid',$2,false)",[uid,sid]);
 await db.query("select public.ringu_account('activate')");await db.query("select public.ringu_account('save',$1::jsonb,0)",[JSON.stringify({essence:199,inventory:[{id:7}],equipped:{weapon:7}})]);
 const call=async(action='status',id=null,nonce=null,rev=null)=>(await db.query('select public.ringu_costume($1,$2,$3,$4) as value',[action,id,nonce,rev])).rows[0].value;
 assert.equal((await call()).ready,false);await assert.rejects(call('buy','kael',randomUUID(),1),/COSTUME_RELEASE_NOT_READY/);
 await assert.rejects(call(null),/INVALID_ACTION/);
 // TEST DATABASE ONLY. Production must not enable this flag before economy migration.
 await db.exec('update ringu_private.costume_release set essence_authoritative=true');
 // Force failure AFTER debit and ownership insert; the entire RPC must roll back.
 await db.exec("create function ringu_private.test_receipt_failure() returns trigger language plpgsql as $$begin raise exception 'INJECTED_RECEIPT_FAILURE'; end$$;create trigger test_receipt_failure before insert on ringu_private.costume_receipts for each row execute function ringu_private.test_receipt_failure();");
 await assert.rejects(call('buy','kael',randomUUID(),1),/INJECTED_RECEIPT_FAILURE/);
 const rolledBack=await call();assert.equal(rolledBack.essence,199);assert.equal(rolledBack.revision,1);assert.deepEqual(rolledBack.owned,[]);
 await db.exec('drop trigger test_receipt_failure on ringu_private.costume_receipts;drop function ringu_private.test_receipt_failure()');
 const request=randomUUID(),first=await call('buy','kael',request,1);assert.equal(first.essence,99);assert.equal(first.attackPercent,5);assert.equal(first.equipped,null);
 const replay=await call('buy','kael',request,1);assert.equal(replay.essence,99);assert.equal(replay.revision,first.revision);
 await assert.rejects(call('buy','serin',request,first.revision),/REQUEST_ID_REUSED/);
 await assert.rejects(call('buy','kael',randomUUID(),first.revision),/ALREADY_OWNED/);
 await assert.rejects(call('buy','serin',randomUUID(),first.revision),/INSUFFICIENT_ESSENCE/);
 await assert.rejects(call('equip','serin',randomUUID(),first.revision),/COSTUME_NOT_OWNED/);
 await assert.rejects(call('equip','kael',randomUUID(),0),/SAVE_CONFLICT/);
 let r=await call('equip','kael',randomUUID(),first.revision);assert.equal(r.equipped,'kael');r=await call('equip',null,randomUUID(),r.revision);assert.equal(r.attackPercent,5);
 // Seed a legitimate extra essence in the isolated database, never the live game.
 await db.exec("update ringu_private.accounts set state=jsonb_set(state,'{essence}','100')");r=await call('buy','serin',randomUUID(),r.revision);assert.equal(r.essence,0);assert.equal(r.attackPercent,10);assert.deepEqual(r.owned,['kael','serin']);
 const state=(await db.query('select state from ringu_private.accounts where id=$1',[uid])).rows[0].state;assert.deepEqual(state.inventory,[{id:7}]);assert.deepEqual(state.equipped,{weapon:7});
 // A withdrawn product must retain existing ownership, bonus and equip access.
 await db.exec("update ringu_private.costume_catalog set enabled=false where id='kael'");
 r=await call('equip','kael',randomUUID(),r.revision);assert.equal(r.equipped,'kael');assert.equal(r.attackPercent,10);assert.ok(!r.products.some(p=>p.id==='kael'));
 const other=randomUUID(),otherSession=randomUUID();await db.query('insert into auth.users values($1)',[other]);await db.query('insert into auth.sessions(id,user_id) values($1,$2)',[otherSession,other]);
 await db.query("select set_config('test.uid',$1,false),set_config('test.sid',$2,false)",[other,otherSession]);await db.query("select public.ringu_account('activate')");
 const separate=await call();assert.deepEqual(separate.owned,[]);assert.equal(separate.equipped,null);assert.equal(separate.attackPercent,0);
 await assert.rejects(call('equip','kael',randomUUID(),separate.revision),/COSTUME_NOT_OWNED/);
 await db.query("select set_config('test.uid',$1,false),set_config('test.sid',$2,false)",[uid,sid]);assert.deepEqual((await call()).owned,['kael','serin']);
 const newer=randomUUID();await db.query("insert into auth.sessions(id,user_id,created_at) values($1,$2,now()+interval '1 second')",[newer,uid]);await assert.rejects(call(),/SESSION_REPLACED/);
 console.log('PASS: client/server catalog parity; role restrictions; atomic rollback; account isolation; withdrawn ownership; repeatable migration; release gate; exact charge; replay; nonce misuse; duplicate; insufficient funds; unowned equip; revision conflict; additive ownership; equipment preservation; session takeover');
}finally{await db.close();}
