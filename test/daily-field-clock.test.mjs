import {readFile} from 'node:fs/promises';import assert from 'node:assert/strict';
const {PGlite}=await import(process.env.QA_PGLITE_MODULE||'@electric-sql/pglite');const db=new PGlite();
try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create schema ringu_private;create function auth.uid() returns uuid language sql as $$select '00000000-0000-0000-0000-000000000001'::uuid$$;create table ringu_private.wb_members(account_id uuid,room_id int,active boolean,left_at timestamptz);create table ringu_private.wb_rooms(id int,ended_at timestamptz);create table ringu_private.daily_boss_runs(account_id uuid,started_at timestamptz,ends_at timestamptz);create function public.ringu_economy_snapshot_before_world_boss(uuid) returns jsonb language sql as $$select jsonb_build_object('state',jsonb_build_object('serverClock',extract(epoch from clock_timestamp()-interval '1 minute')*1000,'serverCombat',jsonb_build_object('hp',1)),'partyBusy',false)$$;`);
 await db.exec(await readFile(new URL('../supabase/26-daily-field-pause.sql',import.meta.url),'utf8'));
 const call=async()=>(await db.query('select public.ringu_economy_snapshot() r')).rows[0].r;
 await db.exec("insert into ringu_private.daily_boss_runs values(auth.uid(),now()-interval '2 seconds',now()+interval '8 seconds')");
 let r=await call();assert.equal(r.partyBusy,true);assert.equal(r.state.serverCombat,null);assert.ok(Math.abs(r.state.serverClock-Date.now())<5000);
 await db.exec("update ringu_private.daily_boss_runs set started_at=now()-interval '20 seconds',ends_at=now()-interval '10 seconds'");
 r=await call();assert.equal(r.partyBusy,false);assert.equal(r.state.serverCombat,null);assert.ok(Math.abs(r.state.serverClock-(Date.now()-10000))<5000);
 await db.exec('insert into ringu_private.wb_members values(auth.uid(),1,true,null)');r=await call();assert.equal(r.partyBusy,true);
 console.log('PASS daily fight active/ended clocks and weekly pause preserved');
}finally{await db.close();}
