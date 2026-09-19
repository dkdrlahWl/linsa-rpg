// No production accounts: exact migration exercised in an isolated PostgreSQL.
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {execute,initialState} from '../supabase/functions/_shared/economy.mjs';
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
 await db.exec((await readFile(new URL('../supabase/migrations/20260914142815_weekly_boss_stage_one_rewards.sql',import.meta.url),'utf8')).replaceAll('clock_timestamp()',"current_setting('test.now')::timestamptz"));
 await db.exec(await readFile(new URL('../supabase/migrations/20260914151949_weekly_boss_unlimited_revives.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../supabase/migrations/20260914152718_weekly_boss_slower_meteors.sql',import.meta.url),'utf8'));
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
  if(p===9){assert.equal(waves.length,4);assert.ok(waves.every(w=>w.hitAt-w.showAt===900));assert.ok(waves.slice(1).every((w,i)=>w.hitAt-waves[i].hitAt===1100));}
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
 // Every later death needs a fresh three-second rescue, with no lifetime cap.
 for(let revival=2;revival<=4;revival++){
  await db.query('update ringu_private.wb_members set hp=0,dead_at=$3 where room_id=$1 and account_id=$2',[r.id,users[1].id,new Date(time).toISOString()]);
  await db.query('select ringu_private.wb_advance($1)',[r.id]);assert.equal((await db.query('select hp from ringu_private.wb_members where room_id=$1 and account_id=$2',[r.id,users[1].id])).rows[0].hp,'0');
  await clock(3000);await db.query('update ringu_private.wb_members set seen_at=$2 where room_id=$1',[r.id,new Date(time).toISOString()]);
  await db.query('select ringu_private.wb_advance($1)',[r.id]);assert.equal((await db.query('select hp from ringu_private.wb_members where room_id=$1 and account_id=$2',[r.id,users[1].id])).rows[0].hp,'600');
 }
 await db.query('update ringu_private.wb_members set hp=0,dead_at=$3 where room_id=$1 and account_id=$2',[r.id,users[1].id,new Date(time).toISOString()]);
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
 await call(users[0],'leave',cr.id);await clock(7*86400000);
 async function rewardRoom(tied=false){
  const room=(await call(users[0],'create')).room;for(const user of users.slice(1,10)){await call(user,'join',room.id);await call(user,'ready',room.id,{ready:true});}await call(users[0],'start',room.id);
  for(let i=0;i<10;i++)await db.query('update ringu_private.wb_members set damage=$3,hp=$4 where room_id=$1 and account_id=$2',[room.id,users[i].id,tied&&i===1?9000:(9-i)*1000,i===9?0:2000]);
  await db.query('update ringu_private.wb_rooms set hp=0 where id=$1',[room.id]);return (await call(users[0],'sync',room.id,{packet:1})).room;
 }
 const paidRoom=await rewardRoom();const expected=Array.from({length:10},(_,i)=>50-3*i);
 for(let i=0;i<10;i++){const m=paidRoom.members.find(m=>m.id===users[i].id);assert.equal(m.reward,'paid');assert.equal(m.rewardDetail.essence,expected[i]);assert.equal(m.rewardDetail.rank,i+1);assert.equal(m.rewardDetail.jadeCube,2);}
 const mails=(await db.query("select id,state->'mailbox' mails from ringu_private.accounts where id=any($1::uuid[])",[users.slice(0,10).map(u=>u.id)])).rows;
 for(const a of mails){const mail=a.mails.filter(m=>m.id.startsWith('weekly-boss:'+paidRoom.id+':'));assert.equal(mail.length,1);const idx=users.findIndex(u=>u.id===a.id);assert.deepEqual(mail[0].reward,{essence:expected[idx],jadeCube:2});}
 const received=mails[0].mails.find(m=>m.id.startsWith('weekly-boss:'+paidRoom.id+':'));const state=initialState(time);state.autoBattle=false;state.mailbox=[received];
 const context={now:time,random:()=>.5,itemIds:[],uuid:randomUUID,adminFloor:0,costumePercent:0};const claimed=execute(state,'mail',{id:received.id},context).state;assert.equal(claimed.essence,received.reward.essence);assert.equal(claimed.jadeCube,2);assert.throws(()=>execute(claimed,'mail',{id:received.id},context),/MAIL_NOT_FOUND/);
 await db.query('select ringu_private.wb_pay_rewards($1)',[paidRoom.id]);await call(users[0],'sync',paidRoom.id,{packet:1});
 const duplicate=(await db.query("select count(*)::int n from ringu_private.accounts a cross join lateral jsonb_array_elements(a.state->'mailbox') m where m->>'id' like $1",['weekly-boss:'+paidRoom.id+':%'])).rows[0].n;assert.equal(duplicate,10,'settlement and packet retries cannot duplicate mail');
 const tied=await rewardRoom(true);assert.equal(tied.members.find(m=>m.id===users[0].id).rewardDetail.rank,1);assert.equal(tied.members.find(m=>m.id===users[1].id).rewardDetail.essence,50);assert.equal(tied.members.find(m=>m.id===users[2].id).rewardDetail.essence,44);
 assert.equal((await db.query('select count(*)::int n from ringu_private.wb_rewards where room_id=$1',[helper.id])).rows[0].n,0,'quota-zero helper gets no extra reward');
 // Recreate a legacy pending receipt, then run the exact migration backfill twice.
 const legacyId='weekly-boss:'+paidRoom.id+':'+users[0].id;
 await db.query("update ringu_private.accounts set state=jsonb_set(state,'{mailbox}',(select coalesce(jsonb_agg(m),'[]') from jsonb_array_elements(state->'mailbox') m where m->>'id'<>$2)) where id=$1",[users[0].id,legacyId]);
 await db.query("update ringu_private.wb_rewards set status='pending',place=null,essence=null,jade_cubes=null,mail_id=null where room_id=$1 and account_id=$2",[paidRoom.id,users[0].id]);
 const rewardMigration=await readFile(new URL('../supabase/migrations/20260914142815_weekly_boss_stage_one_rewards.sql',import.meta.url),'utf8');const backfill=rewardMigration.slice(rewardMigration.indexOf('do $backfill$'));
 await db.exec(backfill);await db.exec(backfill);
 assert.equal((await db.query("select count(*)::int n from ringu_private.accounts a cross join lateral jsonb_array_elements(a.state->'mailbox') m where a.id=$1 and m->>'id'=$2",[users[0].id,legacyId])).rows[0].n,1,'legacy pending receipt paid exactly once');
 await db.exec('set role authenticated');await assert.rejects(()=>db.query('select ringu_private.wb_pay_rewards($1)',[paidRoom.id]),/permission denied/);await db.exec('reset role');
 console.log('PASS weekly rewards: all 10 ranks 50..23, 2 cubes including dead/zero damage, same-rank ties, trusted mail claim, no duplicate settle/claim, three-weekly quota, existing movement/cadence/auth rules.');

 await db.exec((await readFile(new URL('../supabase/migrations/20260919161257_celestial_expansion.sql',import.meta.url),'utf8')).replaceAll('clock_timestamp()',"current_setting('test.now')::timestamptz"));
 await db.exec("update ringu_private.wb_members set active=false,present=false;update ringu_private.wb_rooms set status='closed' where status in ('waiting','running')");
 await clock(7*86400000);
 await assert.rejects(()=>call(users[0],'create',null,{stage:3}),/INVALID_STAGE/);
 const celestial=(await call(users[0],'create',null,{stage:2})).room;
 assert.equal(celestial.stage,2);assert.equal(celestial.maxHp,8400000);assert.equal(celestial.hp,8400000);assert.match(celestial.name,/아우리엘/);
 assert.ok((await call(users[1])).rooms.some(x=>x.id===celestial.id&&x.stage===2));
 const signatures=new Set();
 for(let p=1;p<=11;p++)for(let sample=0;sample<12;sample++){
  const waves=(await db.query('select ringu_private.wb_pattern($1,$2,1,$3) v',[celestial.id,p,new Date(time).toISOString()])).rows[0].v;
  if(sample===0)signatures.add(JSON.stringify(waves.map(w=>w.tiles)));
  for(const [i,w] of waves.entries()){
   assert.equal(w.damage,damages[p-1]*2);assert.ok(w.tiles.length>0);assert.ok(w.tiles.every(t=>t>=0&&t<64));assert.ok(w.hitAt-w.showAt>=900);
   if(i)assert.ok(w.showAt>waves[i-1].hitAt,'waves allow movement between hits');
   for(let tile=0;tile<64;tile++)assert.ok(Array.from({length:64},(_,i)=>i).some(n=>!w.tiles.includes(n)&&Math.abs(n%8-tile%8)+Math.abs(Math.floor(n/8)-Math.floor(tile/8))<=2),'reachable escape');
  }
 }
 assert.equal(signatures.size,11);
 await call(users[0],'start',celestial.id);await clock(1000);await call(users[0],'sync',celestial.id,{packet:1});await clock(1000);await call(users[0],'sync',celestial.id,{packet:2});await clock(1100);const second=(await call(users[0],'sync',celestial.id,{packet:3})).room;assert.equal(second.stage,2);assert.ok(second.hp<8400000);
 await db.query('update ringu_private.wb_rooms set hp=0 where id=$1',[celestial.id]);await call(users[0],'sync',celestial.id,{packet:4});
 const mail=(await db.query("select state->'mailbox' box from ringu_private.accounts where id=$1",[users[0].id])).rows[0].box.find(x=>x.id.startsWith('weekly-boss:'+celestial.id));assert.match(mail.title,/2단계/);assert.match(mail.message,/아우리엘/);assert.equal((await call(users[0])).remaining,2);
 await call(users[0],'ack',celestial.id);
 for(const [stage,remaining] of [[1,1],[2,0],[1,0]]){
  const r=(await call(users[0],'create',null,{stage})).room;await call(users[0],'start',r.id);
  await db.query('update ringu_private.wb_rooms set hp=0 where id=$1',[r.id]);await call(users[0],'sync',r.id,{packet:1});
  assert.equal((await call(users[0])).remaining,remaining,'stage '+stage+' shares weekly quota');await call(users[0],'ack',r.id);
 }
 assert.equal((await db.query('select count(*)::int n from ringu_private.wb_rewards where account_id=$1 and room_id<>$2',[users[0].id,celestial.id])).rows[0].n>0,true);

 for(const stage of [7,8]){await identity(users[1]);const r=(await db.query("select public.ringu_party('create',null,$1) r",[stage])).rows[0].r.room;assert.equal(r.stage,stage);assert.equal(r.maxHp,Math.floor(100000*1.5**(stage-1)));assert.equal(r.reward,stage+1);await db.query("select public.ringu_party('leave',$1)",[r.id]);}
 await db.exec('set role authenticated');await assert.rejects(()=>db.query('select ringu_private.wb_pattern_two($1,1,1,now())',[celestial.id]),/permission denied/);await db.exec('reset role');
 console.log('PASS celestial DB: stage 1 regression, stage 2 HP, all 11 double-damage patterns and escape geometry, room lists, battle, mail, quota, stone 7/8, private permissions.');
}catch(e){console.error(e.message,e.where||'',e.position||'',e.stack?.split('\n').slice(0,12).join('\n'));process.exitCode=1;}finally{await db.close();}
