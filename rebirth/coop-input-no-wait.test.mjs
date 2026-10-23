import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

const db=new PGlite();
const read=file=>readFile(new URL(file,import.meta.url),'utf8');
try {
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email text);create table auth.sessions(id uuid primary key,user_id uuid,created_at timestamptz default now());create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('session_id',current_setting('test.sid',true))$$;`);
 for(const file of ['schema.sql','coop-schema.sql','trial-coop.sql','wave-rewards-200.sql','../supabase/migrations/20261003130059_coop_input_queue.sql','coop-nonblocking-read.sql'])await db.exec(await read(file));
 const acl=(await db.query(`select proacl::text acl from pg_proc where oid='public.rebirth_coop_action(jsonb)'::regprocedure`)).rows[0].acl;
 const patch=await read('coop-input-no-wait-20261024.sql');
 await db.exec(patch);await db.exec(patch);
 assert.equal((await db.query(`select proacl::text acl from pg_proc where oid='public.rebirth_coop_action(jsonb)'::regprocedure`)).rows[0].acl,acl);
 // PGlite has one connection. Inject only the lock-result boundary so the
 // actual function's contention branch runs, including auth and durable queue.
 await db.exec(`create function pg_temp.test_try_lock(k bigint) returns boolean language sql as $$select case when current_setting('test.lock_busy',true)='on' then false else pg_try_advisory_xact_lock(k) end$$;`);
 const definition=(await db.query(`select pg_get_functiondef('public.rebirth_coop_action(jsonb)'::regprocedure) definition`)).rows[0].definition;
 await db.exec(definition.replace('pg_try_advisory_xact_lock(', 'pg_temp.test_try_lock('));
 let fixture=await read('../test/coop-input-queue.sql');
 const anchor=" select count(*) into before_locks from pg_locks";
 assert.ok(fixture.includes(anchor));
 fixture=fixture.replace(anchor,` perform set_config('test.lock_busy','on',true);
 r1:=public.rebirth_coop_action(p1||jsonb_build_object('action','input','roomRevision',0,'world',w||'{"tick":999}'::jsonb));
 assert (r1->'coop'->>'revision')::int=0,'busy input returns current revision';
 assert (r1->'coop'->>'tick')::int=10,'busy input must not overwrite the world';
 assert (r1->>'stateUnchanged')::boolean,'busy input retains compact response';
 assert (select world=original_world from rebirth_private.coop_rooms where id=rid),'busy input preserves authoritative world';
 assert (select count(*)=1 from rebirth_private.coop_input_frames where room_id=rid),'busy input remains durably queued';
 begin
  perform public.rebirth_coop_action(p1||jsonb_build_object('action','input','session',gen_random_uuid()));
  raise exception 'invalid session accepted';
 exception when raise_exception then
  if sqlerrm<>'SESSION_ENDED' then raise;end if;
 end;
 perform set_config('test.lock_busy','off',true);
`+anchor);
 const results=await db.exec(fixture);
 assert.equal(results.find(r=>r.rows?.[0]?.result)?.rows[0].result.passed,true);
 await db.exec('set role authenticated');
 await assert.rejects(()=>db.query('select public.rebirth_coop_action($1)',['{}']),/permission denied/);
 console.log('PASS busy input returns snapshot, retains input queue, validates session, preserves ACL; normal updates, peer input and exactly-once chest claims pass');
} finally {await db.close();}
