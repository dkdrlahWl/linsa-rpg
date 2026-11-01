import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite();
try {
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);create table auth.sessions(id uuid primary key,user_id uuid,created_at timestamptz default now());create function auth.uid() returns uuid language sql as $$select null::uuid$$;create function auth.jwt() returns jsonb language sql as $$select '{}'::jsonb$$;`);
 for(const file of ['schema.sql','coop-schema.sql','coop-sync-contention.sql'])await db.exec(await readFile(new URL(file,import.meta.url),'utf8'));
 await db.exec(`update rebirth_private.release set enabled=true;create table rebirth_private.coop_input_frames(room_id uuid,user_id uuid,tick int,input jsonb,consumed boolean default false,primary key(room_id,user_id,tick));`);
 const epoch=(await db.query('select epoch from rebirth_private.release')).rows[0].epoch;
 const room=randomUUID(),users=Array.from({length:4},()=>({id:randomUUID(),sid:randomUUID()}));
 for(const u of users){await db.query('insert into auth.users values($1)',[u.id]);await db.query('insert into auth.sessions(id,user_id) values($1,$2)',[u.sid,u.id]);await db.query('insert into rebirth_private.players(id,state,active_session,session_started) values($1,$2,$3,now())',[u.id,JSON.stringify({coopRoom:room,gold:123,items:[],materials:{}}),u.sid]);}
 const world={mode:'citadel',tier:0,status:'waiting',owner:users[0].id,members:users.map(u=>({id:u.id,ready:false})),tick:0};
 await db.query('insert into rebirth_private.coop_rooms(id,world) values($1,$2)',[room,JSON.stringify(world)]);
 const call=async(action,extra={},u=users[0])=>(await db.query('select public.rebirth_coop_action($1) r',[JSON.stringify({user:u.id,session:u.sid,epoch,revision:0,request:randomUUID(),fingerprint:{command:action,args:{}},action,args:{},roomRevision:0,...extra})])).rows[0].r;
 for(let i=0;i<20;i++){const r=await call('sync',{world},users[i%4]);assert.equal(r.coop.revision,0,'lobby polling never writes');assert.equal(r.state.gold,123);}
 for(const u of users)await call('ready',{},u);
 let r=await call('read');assert.ok(r.coop.members.every(m=>m.ready),'all simultaneous ready requests merge against current state');assert.equal(r.coop.revision,4);
 await db.query(`update rebirth_private.coop_rooms set world=world||'{"status":"fighting","tick":10}'::jsonb where id=$1`,[room]);
 r=await call('sync',{world:{...world,status:'fighting',tick:2}});assert.equal(r.coop.tick,10,'stale refresh cannot rewind');assert.equal(r.coop.revision,4);
 await assert.rejects(()=>call('sync',{args:{waveSpeed:1.5},world}),/SAVE_CONFLICT/);
 await assert.rejects(()=>call('open',{revision:-1,world}),/SAVE_CONFLICT/);
 await assert.rejects(()=>call('read',{session:randomUUID()}),/SESSION_ENDED/);
 await db.exec('set role authenticated');await assert.rejects(()=>call('read'),/permission denied/);await db.exec('reset role');
 console.log('PASS 20 no-write lobby polls, four stale-revision ready requests, stale battle sync, explicit-write CAS and authentication/access guards');
} finally {await db.close();}
