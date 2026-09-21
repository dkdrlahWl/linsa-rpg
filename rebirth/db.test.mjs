import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {initialState} from './engine.mjs';
const db=new PGlite();
try{
await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth; create table auth.users(id uuid primary key); create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),created_at timestamptz default now());create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('session_id',current_setting('test.sid',true))$$;`);
await db.exec(await readFile(new URL('schema.sql',import.meta.url),'utf8'));
await db.exec('update rebirth_private.release set enabled=true');
const users=[{id:randomUUID(),sid:randomUUID()},{id:randomUUID(),sid:randomUUID()}];
const auth=async u=>db.query("select set_config('test.uid',$1,false),set_config('test.sid',$2,false)",[u.id,u.sid]);
const snap=async rid=>(await db.query('select public.rebirth_snapshot($1) s',[rid||randomUUID()])).rows[0].s;
const commit=async(u,snap,state,id,fp={command:'create',args:{}})=>db.query('select public.rebirth_commit($1,$2,$3,$4,$5,$6,$7,$8)',[u.id,u.sid,snap.epoch,snap.revision,id,JSON.stringify(fp),JSON.stringify(state),'{}']);
for(const u of users){await db.query('insert into auth.users values($1)',[u.id]);await db.query('insert into auth.sessions(id,user_id) values($1,$2)',[u.sid,u.id]);await auth(u);const p=await snap();const s=initialState('rogue','도전자',{now:0,uuid:randomUUID});s.hunting=false;s.gold=10000;await commit(u,p,s,randomUUID());}
const u=users[0];await auth(u);let p=await snap();const rid=randomUUID();let s=p.state;s.gold+=100;await commit(u,p,s,rid);await commit(u,p,s,rid);assert.equal((await snap()).state.gold,10100);
await assert.rejects(()=>commit(u,p,s,rid,{command:'hack'}),/REQUEST_ID_REUSED/);
await assert.rejects(()=>commit(u,p,s,randomUUID()),/SAVE_CONFLICT/);
const market=async(action,args,id=randomUUID())=>(await db.query('select public.rebirth_market($1,$2,$3) r',[action,JSON.stringify(args),id])).rows[0].r;
const listed=await market('sell',{itemId:s.items[0].id,price:1000});assert.equal((await snap()).state.items.length,0);
await auth(users[1]);const buyId=randomUUID();await market('buy',{id:listed.listed},buyId);await market('buy',{id:listed.listed},buyId);assert.equal((await snap()).state.gold,9000);assert.equal((await snap()).state.items.length,2);
await assert.rejects(()=>market('buy',{id:listed.listed}),/LISTING_UNAVAILABLE/);
await auth(users[0]);assert.equal((await snap()).state.gold,11050);
await db.exec('set role authenticated');await assert.rejects(()=>db.query('select * from rebirth_private.players'),/permission denied/);await assert.rejects(()=>commit(u,p,s,randomUUID()),/permission denied/);await db.exec('reset role');
await db.query('delete from auth.sessions where id=$1',[u.sid]);await assert.rejects(()=>snap(),/SESSION_ENDED/);
console.log('PASS SQL: schema, session validation, CAS, exact receipt replay, market debit/credit/fee, sold item rejection, direct write denial.');
}finally{await db.close();}
