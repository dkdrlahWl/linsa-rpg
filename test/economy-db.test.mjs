import {readFile} from 'node:fs/promises';import {randomUUID} from 'node:crypto';import assert from 'node:assert/strict';
import {execute,initialState} from '../supabase/functions/_shared/economy.mjs';
const {PGlite}=await import(process.env.QA_PGLITE_MODULE||'@electric-sql/pglite');const db=new PGlite(),u=randomUUID(),sid=randomUUID();
try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),created_at timestamptz default now());create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('session_id',current_setting('test.sid',true))$$;`);
 for(const name of ['01-account-storage.sql','02-ranking-party.sql'])await db.exec(await readFile(new URL('fixtures/'+name,import.meta.url),'utf8'));
 for(const name of ['06-costume-foundation.sql','07-costume-price-100.sql','08-costume-integration.sql','09-open-costume-shop.sql','10-auction-foundation.sql','11-economy-command-gateway.sql'])await db.exec(await readFile(new URL('../supabase/'+name,import.meta.url),'utf8'));
 await db.query('insert into auth.users values($1)',[u]);await db.query('insert into auth.sessions(id,user_id) values($1,$2)',[sid,u]);await db.query("select set_config('test.uid',$1,false),set_config('test.sid',$2,false)",[u,sid]);await db.query("select public.ringu_account('activate')");
 const snapshot=async nonce=>(await db.query('select public.ringu_economy_snapshot($1) s',[nonce||null])).rows[0].s;
 assert.equal((await snapshot()).ready,false);await db.exec('update ringu_private.auction_release set economy_ready=true');
 let snap=await snapshot();await db.query('select public.ringu_economy_enroll($1,$2,$3)',[u,sid,JSON.stringify(initialState(snap.now))]);snap=await snapshot();assert.equal(snap.enrolled,true);
 const nonce=randomUUID(),fp={command:'daily',args:{}},result=execute(snap.state,'daily',{}, {...snap,random:()=>0,uuid:randomUUID});
 const commit=()=>db.query('select public.ringu_economy_commit($1,$2,$3,$4,$5,$6,$7) r',[u,sid,snap.revision,nonce,JSON.stringify(fp),JSON.stringify(result.state),JSON.stringify({events:result.events})]);
 await db.exec('set role authenticated');await assert.rejects(commit,/permission denied/);await db.exec('reset role');
 await commit();await commit();assert.equal((await snapshot()).state.essence,10);
 await assert.rejects(()=>db.query('select public.ringu_economy_commit($1,$2,$3,$4,$5,$6,$7)',[u,sid,snap.revision,nonce,JSON.stringify({command:'daily',args:{extra:1}}),JSON.stringify(result.state),'{}']),/REQUEST_ID_REUSED/);
 const latest=await snapshot();await assert.rejects(()=>db.query('select public.ringu_save_costume($1,$2,0)',[JSON.stringify({...latest.state,essence:999999}),latest.revision]),/CLIENT_UPDATE_REQUIRED/);
 await assert.rejects(()=>db.query('select public.ringu_economy_commit($1,$2,$3,$4,$5,$6,$7)',[u,sid,snap.revision,randomUUID(),JSON.stringify(fp),JSON.stringify(result.state),'{}']),/SAVE_CONFLICT/);
 await db.exec('update ringu_private.auction_release set economy_ready=false');await assert.rejects(()=>db.query('select public.ringu_save_costume($1,$2,0)',[JSON.stringify(latest.state),latest.revision]),/CLIENT_UPDATE_REQUIRED/);
 console.log('Economy gateway: private commit permissions, enrollment, receipt replay, fingerprint mismatch, stale CAS and disabled-release legacy-save rejection passed.');
}finally{await db.close();}
