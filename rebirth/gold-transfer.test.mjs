import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {initialState} from './engine.mjs';

const db=new PGlite();
try {
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
 create table auth.users(id uuid primary key,raw_app_meta_data jsonb default '{}');
 create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),created_at timestamptz default now());
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
 create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('session_id',current_setting('test.sid',true))$$;`);
 for(const f of ['schema.sql','rankings.sql','admin-transfer.sql','gold-transfer.sql'])await db.exec(await readFile(new URL(f,import.meta.url),'utf8'));
 await db.exec('update rebirth_private.release set enabled=true');
 const sender={id:randomUUID(),sid:randomUUID()},receiver={id:randomUUID(),sid:randomUUID()},other={id:randomUUID(),sid:randomUUID()},admin={id:randomUUID(),sid:randomUUID()};
 const login=async u=>db.query("select set_config('test.uid',$1,false),set_config('test.sid',$2,false)",[u.id,u.sid]);
 const gold=async u=>(await db.query("select (state->>'gold')::bigint value from rebirth_private.players where id=$1",[u.id])).rows[0].value;
 const state=async u=>(await db.query('select state,revision from rebirth_private.players where id=$1',[u.id])).rows[0];
 const send=(args,id=randomUUID())=>db.query('select public.rebirth_gold_transfer($1,$2) r',[JSON.stringify(args),id]);
 const claim=(id,request=randomUUID())=>db.query('select public.rebirth_gold_transfer_claim($1,$2) r',[id,request]);
 for(const [index,u] of [sender,receiver,other,admin].entries()){
  await db.query('insert into auth.users values($1,$2)',[u.id,JSON.stringify({ringu_admin:u===admin})]);
  await db.query('insert into auth.sessions(id,user_id) values($1,$2)',[u.sid,u.id]);
  const s=initialState('warrior','모험가'+index,{now:0,uuid:randomUUID});s.hunting=false;s.gold=500;s.isAdmin=u===admin;
  await db.query('insert into rebirth_private.players(id,state) values($1,$2)',[u.id,JSON.stringify(s)]);
 }
 await login(sender);const firstRevision=(await state(sender)).revision;
 const args={recipient:receiver.id,amount:150},request=randomUUID();
 const sent=(await send(args,request)).rows[0].r;
 assert.equal(sent.result.events[0].type,'goldTransfer');
 assert.equal(await gold(sender),350);
 assert.equal(await gold(receiver),500);
 const pending=(await state(receiver)).state.rewardMailbox.filter(m=>m.kind==='playerGold');
 assert.equal(pending.length,1);assert.equal(pending[0].rewards.gold,150);
 assert.equal((await send(args,request)).rows[0].r.result.events[0].amount,150);
 assert.equal(await gold(sender),350);assert.equal((await state(receiver)).state.rewardMailbox.length,1);
 await assert.rejects(()=>send({...args,amount:1},request),/REQUEST_ID_REUSED/);
 for(const amount of [0,-1,1.5,'1',1000000000000,null])await assert.rejects(()=>send({recipient:receiver.id,amount}),/INVALID_TRANSFER_AMOUNT/);
 await assert.rejects(()=>send({recipient:sender.id,amount:1}),/INVALID_TRANSFER_SELF/);
 await assert.rejects(()=>send({recipient:randomUUID(),amount:1}),/INVALID_TRANSFER_RECIPIENT/);
 await assert.rejects(()=>send({recipient:receiver.id,amount:351}),/INSUFFICIENT_GOLD/);
 await db.exec('set role anon');await assert.rejects(()=>send(args),/permission denied/);await db.exec('reset role');
 await login(other);await assert.rejects(()=>claim(pending[0].id.slice(14)),/MAIL_NOT_FOUND/);
 await login(receiver);const claimId=randomUUID();
 const received=(await claim(pending[0].id.slice(14),claimId)).rows[0].r;
 assert.equal(received.result.events[0].amount,150);assert.equal(await gold(receiver),650);
 assert.equal((await state(receiver)).state.rewardMailbox.length,0);
 await claim(pending[0].id.slice(14),claimId);assert.equal(await gold(receiver),650);
 await assert.rejects(()=>claim(pending[0].id.slice(14)),/MAIL_ALREADY_CLAIMED/);
 await login(sender);
 const epoch=(await db.query('select epoch from rebirth_private.release')).rows[0].epoch;
 const latest=(await state(sender)).state;
 await assert.rejects(()=>db.query('select public.rebirth_commit($1,$2,$3,$4,$5,$6,$7,$8)',[sender.id,sender.sid,epoch,firstRevision,randomUUID(),'{}',JSON.stringify(latest),'{}']),/SAVE_CONFLICT/);
 await login(admin);await assert.rejects(()=>send({recipient:receiver.id,amount:1}),/INVALID_TRANSFER_SENDER/);
 await login(sender);await assert.rejects(()=>send({recipient:admin.id,amount:1}),/INVALID_TRANSFER_RECIPIENT/);
 console.log('PASS gold is debited once, delivered by mailbox, claimed once, and all recipient, amount, authorization, and stale-save guards hold.');
} finally {await db.close();}
