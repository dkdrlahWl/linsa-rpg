import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {initialState,power} from './engine.mjs?v=crit-odds-55';
import {startCoop} from './coop-model.mjs?v=crit-odds-55';
import {jobStage,ADVANCEMENT_BOSSES} from './advancement.mjs';
const db=new PGlite(),ctx={now:Date.now(),random:()=>.5,uuid:randomUUID};
try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);create table auth.sessions(id uuid primary key,user_id uuid,created_at timestamptz default now());create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('session_id',current_setting('test.sid',true))$$;`);
 for(const file of ['schema.sql','coop-schema.sql','trial-coop.sql'])await db.exec(await readFile(new URL(file,import.meta.url),'utf8'));
 await db.exec('update rebirth_private.release set enabled=true');
 const epoch=(await db.query('select epoch from rebirth_private.release')).rows[0].epoch;
 const create=async(level,stage)=>{const u={id:randomUUID(),sid:randomUUID()},s=initialState('warrior','시험모험가',ctx);Object.assign(s,{level,firstAdvancement:stage>0,advancement:Math.max(0,stage-1),hunting:false});await db.query('insert into auth.users values($1)',[u.id]);await db.query('insert into auth.sessions(id,user_id) values($1,$2)',[u.sid,u.id]);await db.query('insert into rebirth_private.players(id,state,active_session,session_started) values($1,$2,$3,now())',[u.id,JSON.stringify(s),u.sid]);return u;};
 const get=async u=>(await db.query('select state,revision from rebirth_private.players where id=$1',[u.id])).rows[0];
 const call=async(u,action,args={},extra={})=>{const a=await get(u);return (await db.query('select public.rebirth_coop_action($1) r',[JSON.stringify({user:u.id,session:u.sid,epoch,revision:a.revision,request:randomUUID(),fingerprint:{action,args},state:a.state,power:power(a.state),action,args,...extra})])).rows[0].r;};
 const snapshot=s=>JSON.stringify({gold:s.gold,materials:s.materials,items:s.items,advancement:s.advancement,first:s.firstAdvancement,victories:s.advancementVictories});
 for(const trial of ADVANCEMENT_BOSSES){
  const host=await create(trial.level,trial.stage),helper=await create(180,4),low=await create(trial.level-1,4),future=await create(180,0),third=await create(180,4);
  await assert.rejects(()=>call(low,'create',{mode:'advancement',tier:trial.stage}),/LEVEL_REQUIRED/);
  if(trial.stage)await assert.rejects(()=>call(future,'create',{mode:'advancement',tier:trial.stage}),/ADVANCEMENT_REQUIRED/);
  let r=await call(host,'create',{mode:'advancement',tier:trial.stage});const rid=r.coop.id;
  for(const viewer of [helper,low,future]){const listing=await call(viewer,'list');assert.ok(listing.coopRooms.some(room=>room.id===rid&&room.mode==='advancement'&&room.tier===trial.stage&&room.count===1));}
  await assert.rejects(()=>call(low,'join',{room:rid}),/LEVEL_REQUIRED/);
  r=await call(helper,'join',{room:rid});
  await assert.rejects(()=>call(third,'join',{room:rid}),/PARTY_NOT_FOUND/);
  r=await call(host,'ready',{}, {roomRevision:r.coop.revision});r=await call(helper,'ready',{}, {roomRevision:r.coop.revision});
  await assert.rejects(()=>call(helper,'start',{}, {roomRevision:r.coop.revision,world:startCoop(r.coop,ctx.now)}),/INVALID_COOP_START/);
  const before=snapshot((await get(helper)).state);
  r=await call(host,'start',{}, {roomRevision:r.coop.revision,world:startCoop(r.coop,ctx.now)});
  // Server settlement after shared victory; the learner may have died while the helper finished.
  const win={...r.coop,status:'won',hp:0,tick:300,members:r.coop.members.map((m,i)=>({...m,hp:i?100:0}))};
  const request=randomUUID();r=await call(helper,'input',{}, {world:win,roomRevision:r.coop.revision,request});
  const h=(await get(host)).state;
  assert.equal(jobStage(h),trial.stage+1);assert.equal(h.lastReward.won,true);assert.equal(h.coopRoom,undefined);
  assert.equal(r.state.lastReward.practice,true);assert.equal(snapshot(r.state),before);assert.equal(r.state.coopRoom,undefined);
  const after=snapshot(h);await assert.rejects(()=>call(host,'input',{}, {world:win,roomRevision:0}),/PARTY_NOT_FOUND/);assert.equal(snapshot((await get(host)).state),after);
 }
 // Solo room start, loss, and re-entry; leaving does not advance the leaver.
 const a=await create(30,0),b=await create(180,4);let r=await call(a,'create',{mode:'advancement',tier:0});r=await call(a,'ready',{}, {roomRevision:r.coop.revision});r=await call(a,'start',{}, {roomRevision:r.coop.revision,world:startCoop(r.coop,ctx.now)});r=await call(a,'input',{}, {roomRevision:r.coop.revision,world:{...r.coop,status:'lost',tick:1200}});assert.equal(jobStage(r.state),0);assert.equal(r.state.lastReward.won,false);
 r=await call(a,'create',{mode:'advancement',tier:0});r=await call(b,'join',{room:r.coop.id});r=await call(a,'ready',{}, {roomRevision:r.coop.revision});r=await call(b,'ready',{}, {roomRevision:r.coop.revision});r=await call(a,'start',{}, {roomRevision:r.coop.revision,world:startCoop(r.coop,ctx.now)});await call(a,'leave');r=await call(b,'read');r=await call(b,'input',{}, {roomRevision:r.coop.revision,world:{...r.coop,status:'won',hp:0,tick:100}});assert.equal(jobStage((await get(a)).state),0);assert.equal(r.state.lastReward.practice,true);
 await db.exec('set role authenticated');await assert.rejects(()=>db.query('select public.rebirth_coop_action($1)',['{}']),/permission denied/);await db.exec('reset role');
 console.log('PASS server level/previous-job gates for all four trials, two-player cap, solo start, host-only start, learner advancement, helper unchanged, loss/leave/replay safety and service-only access.');
}finally{await db.close();}
