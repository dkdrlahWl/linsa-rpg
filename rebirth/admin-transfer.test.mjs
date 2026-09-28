import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {initialState} from './engine.mjs';
import {MATERIALS} from './data.mjs';
const db=new PGlite(),reserve=999999999999;
try {
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
 create table auth.users(id uuid primary key,raw_app_meta_data jsonb default '{}');
 create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),created_at timestamptz default now());
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
 create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('session_id',current_setting('test.sid',true))$$;`);
 for(const f of ['schema.sql','rankings.sql','admin-transfer.sql'])await db.exec(await readFile(new URL(f,import.meta.url),'utf8'));
 await db.exec('update rebirth_private.release set enabled=true');
 const admin={id:randomUUID(),sid:randomUUID()},normal={id:randomUUID(),sid:randomUUID()};
 const login=async u=>db.query("select set_config('test.uid',$1,false),set_config('test.sid',$2,false)",[u.id,u.sid]);
 const snapshot=async()=>(await db.query('select public.rebirth_snapshot($1) s',[randomUUID()])).rows[0].s;
 for(const u of [admin,normal]){
  await db.query('insert into auth.users values($1,$2)',[u.id,JSON.stringify({ringu_admin:u===admin})]);
  await db.query('insert into auth.sessions(id,user_id) values($1,$2)',[u.sid,u.id]);
  const s=initialState('warrior','동일이름',{now:0,uuid:randomUUID});s.hunting=false;s.isAdmin=true;
  await db.query('insert into rebirth_private.players(id,state) values($1,$2)',[u.id,JSON.stringify(s)]);
 }
 await login(normal);const untouched=(await snapshot()).state;
 const send=(args,id=randomUUID())=>db.query('select public.rebirth_admin_transfer($1,$2) r',[JSON.stringify(args),id]);
 await db.exec('set role authenticated');
 await assert.rejects(()=>send({recipient:admin.id,resource:'gold',amount:1}),/BETA_DISABLED/);
 await db.exec('reset role');await login(admin);
 const full=(await snapshot()).state;assert.equal(full.gold,reserve);
 for(const key of Object.keys(MATERIALS))assert.equal(full.materials[key],reserve);
 const rows=(await db.query('select public.rebirth_rankings() r')).rows[0].r;assert.equal(rows.length,1);assert.equal(rows[0].id,normal.id);
 for(const resource of ['gold',...Object.keys(MATERIALS)]){
  const args={recipient:normal.id,resource,amount:reserve},rid=randomUUID();
  const a=(await send(args,rid)).rows[0].r;await send(args,rid);
  assert.equal(a.result.events[0].amount,reserve);assert.equal(a.state.gold,reserve);
  await assert.rejects(()=>send({...args,amount:1},rid),/REQUEST_ID_REUSED/);
 }
 await login(normal);const delivered=await snapshot();
 assert.equal(delivered.state.gold,untouched.gold+reserve);
 for(const key of Object.keys(MATERIALS))assert.equal(delivered.state.materials[key],(untouched.materials[key]||0)+reserve);
 assert.equal(delivered.revision,6);
 await assert.rejects(()=>db.query('select public.rebirth_commit($1,$2,$3,$4,$5,$6,$7,$8)',[normal.id,normal.sid,delivered.epoch,0,randomUUID(),'{}',JSON.stringify(untouched),'{}']),/SAVE_CONFLICT/);
 await login(admin);
 for(const amount of [0,-1,1.5,'1',1000000000000,null])await assert.rejects(()=>send({recipient:normal.id,resource:'gold',amount}),/INVALID_TRANSFER_AMOUNT/);
 for(const resource of ['isAdmin','level','expand','boss:0',null])await assert.rejects(()=>send({recipient:normal.id,resource,amount:1}),/INVALID_TRANSFER_RESOURCE/);
 await assert.rejects(()=>send({recipient:admin.id,resource:'gold',amount:1}),/INVALID_TRANSFER_SELF/);
 await assert.rejects(()=>send({recipient:randomUUID(),resource:'gold',amount:1}),/INVALID_TRANSFER_RECIPIENT/);
 await db.query("update rebirth_private.players set state=jsonb_set(state,'{gold}','9000000000000') where id=$1",[normal.id]);
 await assert.rejects(()=>send({recipient:normal.id,resource:'gold',amount:1}),/INVALID_TRANSFER_LIMIT/);
 await db.exec('set role anon');await assert.rejects(()=>send({recipient:normal.id,resource:'gold',amount:1}),/permission denied/);await db.exec('reset role');
 console.log('PASS all six resources, trillion-size precision, trusted admin only, retry deduplication, target IDs, quantity validation, overflow rejection, and stale-save conflict.');
} finally {await db.close();}
