// All accounts/rooms below are synthetic and exist only in isolated in-memory PostgreSQL.
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {initialState} from '../supabase/functions/_shared/tower-hp-restored.mjs';
const {PGlite}=await import(process.env.QA_PGLITE_MODULE||'@electric-sql/pglite');
const db=new PGlite();const users=Array.from({length:6},()=>({id:randomUUID(),sid:randomUUID()}));
const expected=[100000,150000,225000,337500,506250,759375];
const migration=await readFile(new URL('../supabase/19-stone-hp-third.sql',import.meta.url),'utf8');
const rows=async sql=>(await db.query(sql)).rows;
async function identity(u){await db.query("select set_config('test.uid',$1,false),set_config('test.sid',$2,false)",[u.id,u.sid]);}
async function call(u,action,id=null,stage=null){await identity(u);await db.exec('set role authenticated');try{return (await db.query('select public.ringu_party($1,$2,$3) r',[action,id,stage])).rows[0].r;}finally{await db.exec('reset role');}}
async function apply(){await db.exec('begin;'+migration+'commit;');}
try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),created_at timestamptz default now());create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('session_id',current_setting('test.sid',true))$$;`);
 for(const file of ['01-account-storage.sql','02-ranking-party.sql'])await db.exec(await readFile(new URL('fixtures/'+file,import.meta.url),'utf8'));
 for(const file of ['06-costume-foundation.sql','07-costume-price-100.sql','08-costume-integration.sql','09-open-costume-shop.sql','10-auction-foundation.sql','11-economy-command-gateway.sql'])await db.exec(await readFile(new URL('../supabase/'+file,import.meta.url),'utf8'));
 for(const u of users){
  await db.query('insert into auth.users values($1)',[u.id]);await db.query('insert into auth.sessions(id,user_id) values($1,$2)',[u.sid,u.id]);await identity(u);await db.query("select public.ringu_account('activate')");
  const s={...initialState(Date.now()),autoBattle:false,playerName:'S3 fixture',remodelProfile:{power:50}};
  await db.query('update ringu_private.accounts set state=$2::jsonb where id=$1',[u.id,JSON.stringify(s)]);
 }
 const oldRooms=[];
 for(let i=0;i<6;i++){const r=(await call(users[i],'create',null,i+1)).room;assert.equal(r.maxHp,expected[i]*3);oldRooms.push(r.id);}
 await db.query("update ringu_private.rooms set status='running',hp=123457,tick=3,started_at=now() where id=$1",[oldRooms[0]]);
 const beforeRooms=await rows('select * from ringu_private.rooms order by stage'),beforeAccounts=await rows('select * from ringu_private.accounts order by id'),beforeMembers=await rows('select * from ringu_private.members order by account_id');
 const unchangedFunctions=await rows("select oid::regprocedure::text f,prosrc,proacl from pg_proc where oid in ('public.ringu_party(text,uuid,integer)'::regprocedure,'ringu_private.advance_rooms()'::regprocedure,'ringu_private.room_view(uuid)'::regprocedure)");
 await apply();const after=await rows('select * from ringu_private.rooms order by stage');
 for(let i=0;i<6;i++){assert.equal(Number(after[i].max_hp),expected[i]);assert.equal(Number(after[i].hp),i===0?41153:expected[i]);assert.deepEqual({...after[i],hp:beforeRooms[i].hp,max_hp:beforeRooms[i].max_hp},beforeRooms[i]);}
 assert.deepEqual(await rows('select * from ringu_private.accounts order by id'),beforeAccounts);assert.deepEqual(await rows('select * from ringu_private.members order by account_id'),beforeMembers);assert.equal((await rows('select count(*)::int n from ringu_private.rewards'))[0].n,0);
 await apply();assert.deepEqual(await rows('select * from ringu_private.rooms order by stage'),after);
 assert.deepEqual(await rows("select oid::regprocedure::text f,prosrc,proacl from pg_proc where oid in ('public.ringu_party(text,uuid,integer)'::regprocedure,'ringu_private.advance_rooms()'::regprocedure,'ringu_private.room_view(uuid)'::regprocedure)"),unchangedFunctions);
 await db.exec("update ringu_private.rooms set status='canceled';update ringu_private.members set active=false;");
 for(let i=0;i<6;i++){
  const u=users[i],room=(await call(u,'create',null,i+1)).room;
  assert.equal(room.hp,expected[i]);assert.equal(room.maxHp,expected[i]);assert.equal(room.reward,i+2);
  await call(u,'start',room.id);
  await db.query("update ringu_private.rooms set started_at=now()-interval '1.1 seconds' where id=$1",[room.id]);
  const running=(await call(u,'poll',room.id)).room;assert.equal(running.maxHp,expected[i]);assert.ok(running.hp<expected[i]&&running.hp>0);assert.equal(running.status,'running');
  await db.query("update ringu_private.members set stats='{\"attack\":9999999,\"crit\":0,\"damage\":100}'::jsonb,seen_at=now() where room_id=$1",[room.id]);
  await db.query("update ringu_private.rooms set started_at=now()-interval '2.1 seconds' where id=$1",[room.id]);
  const won=(await call(u,'poll',room.id)).room;assert.equal(won.status,'won');assert.equal(won.hp,0);
  const reward=(await db.query('select amount from ringu_private.rewards where room_id=$1',[room.id])).rows;assert.deepEqual(reward,[{amount:i+2}]);
  await call(u,'poll',room.id);assert.equal((await db.query('select count(*)::int n from ringu_private.rewards where room_id=$1',[room.id])).rows[0].n,1);
 }
 await assert.rejects(()=>call(users[0],'create',null,7),/INVALID_STAGE/);
 const perms=(await rows("select has_function_privilege('anon','public.ringu_party(text,uuid,integer)','execute') anon,has_function_privilege('authenticated','public.ringu_party(text,uuid,integer)','execute') auth,has_function_privilege('authenticated','public.ringu_party_before_economy(text,uuid,integer)','execute') internal"))[0];assert.deepEqual(perms,{anon:false,auth:true,internal:false});
 console.log('PASS S3: all six actual room creation/start/poll/kill/reward paths, existing-room migration, rerun idempotence, unchanged accounts/members/timers/permissions. Synthetic DB only.');
}finally{await db.close();}
