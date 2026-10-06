import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

const db=new PGlite();
try{
  await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email text);create table auth.sessions(id uuid primary key,user_id uuid,created_at timestamptz default now());create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('session_id',current_setting('test.sid',true))$$;`);
  for(const file of ['schema.sql','coop-schema.sql','trial-coop.sql','wave-rewards-200.sql'])await db.exec(await readFile(new URL(file,import.meta.url),'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/20261003130059_coop_input_queue.sql',import.meta.url),'utf8'));
  const acl=(await db.query(`select proacl::text as acl from pg_proc where oid='public.rebirth_coop_action(jsonb)'::regprocedure`)).rows[0].acl;
  await db.exec(await readFile(new URL('./coop-nonblocking-read.sql',import.meta.url),'utf8'));
  assert.equal((await db.query(`select proacl::text as acl from pg_proc where oid='public.rebirth_coop_action(jsonb)'::regprocedure`)).rows[0].acl,acl);
  const fixture=await readFile(new URL('../test/coop-input-queue.sql',import.meta.url),'utf8');
  const results=await db.exec(fixture);
  const report=results.find(r=>r.rows?.[0]?.result)?.rows[0].result;
  assert.equal(report.passed,true);
  await db.exec('set role authenticated');
  await assert.rejects(()=>db.query('select public.rebirth_coop_action($1)',['{}']),/permission denied/);
  await db.exec('reset role');
  console.log('PASS read/enqueue keeps room revision and history, conflict recovery retains peer frames, chest receipt stays atomic and privileged ACL unchanged',report);
}finally{await db.close();}
