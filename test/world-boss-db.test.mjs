// No production accounts: exact migration exercised in an isolated PostgreSQL.
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite();
const users=Array.from({length:12},(_,i)=>({id:randomUUID(),sid:randomUUID(),name:'WB fixture '+i}));
let time=Date.parse('2026-09-14T01:00:00Z');
const clock=async delta=>{time+=delta;await db.query("select set_config('test.now',$1,false)",[new Date(time).toISOString()]);};
const identity=async u=>db.query("select set_config('test.uid',$1,false),set_config('test.sid',$2,false)",[u.id,u.sid]);
async function call(u,action='list',room=null,args={}){await identity(u);await db.exec('set role authenticated');try{return (await db.query('select public.ringu_world_boss($1,$2,$3) r',[action,room,JSON.stringify(args)])).rows[0].r;}finally{await db.exec('reset role');}}
try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
 create table auth.users(id uuid primary key);create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),created_at timestamptz default now());
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
 create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('session_id',current_setting('test.sid',true))$$;
 create schema realtime;create table realtime.messages(extension text);alter table realtime.messages enable row level security;
 create function realtime.topic() returns text language sql as $$select current_setting('test.topic',true)$$;
 create function realtime.send(jsonb,text,text,boolean) returns void language sql as $$select null::void$$;
 create schema cron;create function cron.schedule(text,text,text) returns bigint language sql as $$select 1::bigint$$;`);
 for(const name of ['01-account-storage.sql','02-ranking-party.sql'])await db.exec(await readFile(new URL('fixtures/'+name,import.meta.url),'utf8'));
 for(const name of ['06-costume-foundation.sql','07-costume-price-100.sql','08-costume-integration.sql','09-open-costume-shop.sql','10-auction-foundation.sql','11-economy-command-gateway.sql'])await db.exec(await readFile(new URL('../supabase/'+name,import.meta.url),'utf8'));
 await clock(0);
 await db.exec((await readFile(new URL('../supabase/migrations/20260914092650_world_boss_stage_one.sql',import.meta.url),'utf8')).replaceAll('clock_timestamp()',"current_setting('test.now')::timestamptz"));
 await db.exec((await readFile(new URL('../supabase/migrations/20260914122035_world_boss_combat_v3.sql',import.meta.url),'utf8')).replaceAll('clock_timestamp()',"current_setting('test.now')::timestamptz"));
 await db.exec((await readFile(new URL('../supabase/migrations/20260914123914_world_boss_attack_cadence.sql',import.meta.url),'utf8')).replaceAll('clock_timestamp()',"current_setting('test.now')::timestamptz"));
 await db.exec((await readFile(new URL('../supabase/migrations/20260914124948_world_boss_mobile_attacks.sql',import.meta.url),'utf8')).replaceAll('clock_timestamp()',"current_setting('test.now')::timestamptz"));
 for(const u of users){await db.query('insert into auth.users values($1)',[u.id]);await db.query('insert into auth.sessions(id,user_id) values($1,$2)',[u.sid,u.id]);await identity(u);await db.query("select public.ringu_account('activate')");await db.query('update ringu_private.accounts set state=$2 where id=$1',[u.id,JSON.stringify({playerName:u.name,playerGender:'male',remodelProfile:{power:50}})]);}
 assert.equal((await call(users[0])).unlockedAt,null);
 await assert.rejects(()=>call(users[0],'create'),/WORLD_BOSS_LOCKED/);
 for(const u of users.slice(0,4))await db.query("update ringu_private.accounts set state=jsonb_set(state,'{remodelProfile,power}','2000') where id=$1",[u.id]);
 assert.ok((await call(users[0])).unlockedAt);
 await db.exec("update ringu_private.accounts set state=jsonb_set(state,'{remodelProfile,power}','50')");
 assert.ok((await call(users[0])).unlockedAt,'unlock persists after attack falls');
 let r=(await call(users[0],'create')).room;assert.equal(r.members.length,1);assert.equal(r.hp,4200000);
 await call(users[0],'start',r.id);r=(await call(users[0],'sync',r.id,{packet:1})).room;assert.equal(r.status,'running');assert.equal(r.members[0].maxHp,50);
 await assert.rejects(()=>call(users[11],'sync',r.id,{packet:1}),/ROOM_FORBIDDEN/);
 await call(users[0],'leave',r.id);assert.equal((await call(users[0])).remaining,3);
 r=(await call(users[0],'create')).room;
 for(const u of users.slice(1,10))await call(u,'join',r.id);
 await assert.rejects(()=>call(users[10],'join',r.id),/ROOM_FULL/);
 await assert.rejects(()=>call(users[1],'start',r.id),/HOST_ONLY/);
 await assert.rejects(()=>call(users[0],'start',r.id),/MEMBERS_NOT_READY/);
 for(const u of users.slice(1,10))await call(u,'ready',r.id,{ready:true});
 await db.exec("update ringu_private.accounts set state=jsonb_set(state,'{remodelProfile,power}','2000')");
 await call(users[0],'start',r.id);await clock(1500);await call(users[0],'sync',r.id,{packet:1});await clock(1500);
 let v=await call(users[0],'sync',r.id,{packet:2});assert.equal(v.room.members.length,10);assert.equal(v.room.members[0].maxHp,2000);assert.ok(v.room.hp<4200000);
 assert.deepEqual((await call(users[0],'sync',r.id,{packet:2})).room.members,v.room.members,'packet replay does not add damage');
 await assert.rejects(()=>call(users[0],'sync',r.id,{packet:3,moves:[{seq:1,x:7,y:0,at:time}]}),/INVALID_MOVE/);
 await call(users[0],'sync',r.id,{packet:3,moves:[{seq:1,x:1,y:6,at:time}]});
 await clock(200);v=await call(users[0],'sync',r.id,{packet:4,moves:[{seq:2,x:2,y:6,at:time}]});assert.equal(v.room.members.find(m=>m.id===users[0].id).x,2);
 // 11 distinct patterns, fixed damage, exact tile bounds and reachable safety.
 const damages=[360,400,400,560,600,500,600,640,840,960,1300];
 for(let p=1;p<=11;p++){
  const waves=(await db.query('select ringu_private.wb_pattern($1,$2,1,$3) v',[r.id,p,new Date(time).toISOString()])).rows[0].v;
  assert.ok(waves.length);for(const w of waves){assert.equal(w.damage,damages[p-1]);assert.ok(w.hitAt>w.showAt);assert.ok(w.tiles.every(t=>Number.isInteger(t)&&t>=0&&t<64));
   if(p>=9)assert.ok(64-w.tiles.length>=(p===9?12:8));
   for(const m of v.room.members)assert.ok(Array.from({length:64},(_,t)=>t).some(t=>!w.tiles.includes(t)&&Math.abs(t%8-m.x)+Math.abs(Math.floor(t/8)-m.y)<=1));
  }
 }
 // Reviver can attack and take damage; single helper standing time is not pooled.
 await db.query("update ringu_private.wb_members set hp=0,dead_at=$2 where room_id=$1 and account_id=$3",[r.id,new Date(time-3100).toISOString(),users[1].id]);
 await db.query("update ringu_private.wb_members set x=1,y=6,still_at=$2,seen_at=$3 where room_id=$1 and account_id=$4",[r.id,new Date(time-3100).toISOString(),new Date(time).toISOString(),users[0].id]);
 await db.query('select ringu_private.wb_advance($1)',[r.id]);
 v=(await db.query('select ringu_private.wb_view($1) v',[r.id])).rows[0].v;
 assert.equal(v.members.find(m=>m.id===users[1].id).hp,600);assert.equal(v.members.find(m=>m.id===users[1].id).revived,true);
 await db.query('update ringu_private.wb_members set hp=0 where room_id=$1 and account_id=$2',[r.id,users[1].id]);
 await db.query('select ringu_private.wb_advance($1)',[r.id]);assert.equal((await db.query('select hp from ringu_private.wb_members where room_id=$1 and account_id=$2',[r.id,users[1].id])).rows[0].hp,'0');
 // Death still qualifies; explicit leaver doesn't. Quota and entitlement atomic.
 await call(users[9],'leave',r.id);await db.query('update ringu_private.wb_rooms set hp=0 where id=$1',[r.id]);
 v=await call(users[0],'sync',r.id,{packet:5});assert.equal(v.room.status,'won');assert.equal(v.remaining,2);
 assert.equal((await db.query('select count(*)::int n from ringu_private.wb_rewards where room_id=$1',[r.id])).rows[0].n,9);
 await call(users[0],'sync',r.id,{packet:5});assert.equal((await call(users[1])).remaining,2);assert.equal((await call(users[9])).remaining,3);
 for(let i=0;i<2;i++){const rr=(await call(users[0],'create')).room;await call(users[0],'start',rr.id);await clock(2100);await db.query('update ringu_private.wb_rooms set hp=0 where id=$1',[rr.id]);await call(users[0],'sync',rr.id,{packet:1});}
 assert.equal((await call(users[0])).remaining,0);
 const helper=(await call(users[0],'create')).room;await call(users[0],'start',helper.id);await clock(2100);await db.query('update ringu_private.wb_rooms set hp=0 where id=$1',[helper.id]);v=await call(users[0],'sync',helper.id,{packet:1});assert.equal(v.remaining,0);assert.equal(v.room.members[0].reward,'none');
 await clock(7*86400000);assert.equal((await call(users[0])).remaining,3);
 // Returning from a raid excludes its duration, but preserves offline time
 // after the raid. Snapshot adjustment itself must not mutate account state.
 await db.exec('update ringu_private.auction_release set economy_ready=true');
 const beforeRaid=v.room.startedAt-1000;
 await db.query("update ringu_private.accounts set state=jsonb_set(state,'{serverClock}',$2::jsonb) where id=$1",[users[0].id,JSON.stringify(beforeRaid)]);
 await identity(users[0]);const snapshot=(await db.query('select public.ringu_economy_snapshot() s')).rows[0].s;
 assert.equal(snapshot.state.serverClock,v.room.endedAt);assert.equal(snapshot.state.serverCombat,null);assert.equal(snapshot.partyBusy,false);
 assert.equal((await db.query("select (state->>'serverClock')::numeric clock from ringu_private.accounts where id=$1",[users[0].id])).rows[0].clock,String(beforeRaid));
 await db.exec('set role authenticated');await assert.rejects(()=>db.query('select * from ringu_private.wb_rooms'),/permission denied/);await assert.rejects(()=>db.query('select ringu_private.wb_advance($1)',[r.id]),/permission denied/);await db.exec('reset role');
 // WB3 critical chances freeze from the existing server character stats.
 await db.query("update ringu_private.accounts set state=jsonb_set(state,'{remodelProfile,equipment}',$2::jsonb) where id=$1",[users[0].id,JSON.stringify([{o:[['critChance',75],['critDamage',50]]}])]);
 const cr=(await call(users[0],'create')).room;await call(users[0],'start',cr.id);
 const frozen=(await db.query('select crit_chance,crit_damage from ringu_private.wb_members where room_id=$1',[cr.id])).rows[0];assert.equal(Number(frozen.crit_chance),75);assert.equal(Number(frozen.crit_damage),150);
 await clock(2000);await call(users[0],'sync',cr.id,{packet:1});
 // Replace randomness in this isolated test only, to force an actual critical.
 const def=(await db.query("select pg_get_functiondef('ringu_private.wb_rpc(text,uuid,jsonb)'::regprocedure) body")).rows[0].body;
 await db.exec(def.replace('random()*100<m.crit_chance','0<m.crit_chance'));
 await clock(1000);const hit=(await call(users[0],'sync',cr.id,{packet:2})).room;
 assert.equal(hit.members[0].lastHit.crit,true);assert.equal(hit.members[0].lastHit.damage,5000);assert.equal(hit.members[0].damage,5000);assert.equal(hit.hp,4195000);
 assert.deepEqual((await call(users[0],'sync',cr.id,{packet:2})).room.members,hit.members,'retry cannot duplicate critical damage');
 await db.query("update ringu_private.wb_rooms set waves='[]',next_at=$2 where id=$1",[cr.id,new Date(time+60000).toISOString()]);
 let packet=2,latest=hit;
 for(let i=0;i<24;i++){await clock(40);latest=(await call(users[0],'sync',cr.id,{packet:++packet})).room;assert.equal(latest.members[0].damage,5000,'frequent sync cannot accelerate attacks');}
 await clock(40);latest=(await call(users[0],'sync',cr.id,{packet:++packet})).room;assert.equal(latest.members[0].damage,10000,'one attack after one full second');
 for(let i=0;i<10;i++){await clock(200);latest=(await call(users[0],'sync',cr.id,{packet:++packet,moves:[{seq:i+1,x:i%2?0:1,y:6,at:time}]})).room;assert.equal(latest.members[0].damage,10000+Math.floor((i+1)/5)*5000,'moving attacks retain one-second cadence');}
 await clock(1100);latest=(await call(users[0],'sync',cr.id,{packet:++packet})).room;assert.equal(latest.members[0].damage,25000,'stopping does not reset the attack timer');
 await clock(80);latest=(await call(users[0],'sync',cr.id,{packet:++packet})).room;assert.equal(latest.members[0].damage,25000,'no accumulated burst after stopping');
 console.log('PASS WB5 SQL: room/auth/reward rules, critical receipts, duplicate and 25Hz spam protection, attacks while moving, one-second shared cadence without catch-up.');
}catch(e){console.error(e.message,e.where||'',e.position||'',e.stack?.split('\n').slice(0,12).join('\n'));process.exitCode=1;}finally{await db.close();}
