import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {initialState,execute,grantCoopChest} from './engine.mjs';
import {normalizePotentialState} from './data.mjs';
import {COOP_TIERS,startCoop,advanceCoop} from './coop-model.mjs';
import {renderCubePanel} from './cube-ui.mjs';
const ctx={now:Date.now(),random:()=>.5,uuid:randomUUID};
let state=initialState('warrior','균열시험',ctx);state.hunting=false;
assert.equal(state.items[0].lines.length,0);assert.equal(state.items[0].potentialUnlocked,false);
assert.equal(execute(state,'sync',{},ctx).state.items[0].lines.length,0);
assert.throws(()=>execute(state,'cube',{id:state.items[0].id},ctx),/POTENTIAL_REQUIRED/);
assert.throws(()=>execute(state,'potential',{id:state.items[0].id},ctx),/INSUFFICIENT_SCROLL/);
state.materials.scroll=2;state=execute(state,'potential',{id:state.items[0].id},ctx).state;
assert.equal(state.materials.scroll,1);assert.equal(state.items[0].lines.length,3);assert.equal(state.items[0].grade,2);
assert.throws(()=>execute(state,'potential',{id:state.items[0].id},ctx),/POTENTIAL_ALREADY_OPEN/);
const legacy=structuredClone(state);legacy.items[0].potentialVersion=4;delete legacy.items[0].potentialUnlocked;
assert.deepEqual(normalizePotentialState(legacy).items[0].lines,state.items[0].lines);
assert.equal(legacy.materials.scroll,1);assert.deepEqual(normalizePotentialState(structuredClone(legacy)),legacy);
assert.doesNotMatch(renderCubePanel(initialState('warrior','검증이',ctx).items[0],state,'cube'),/undefined|NaN/);
for(let i=0;i<10;i++){
 const hit=grantCoopChest(state,i,{...ctx,random:()=>0}),miss=grantCoopChest(state,i,{...ctx,random:()=>.99999});
 assert.equal(hit.reward.items[0].level,(i+1)*20);assert.equal(hit.reward.items[0].lines.length,0);
 assert.equal(hit.reward.highCube,i>=3?1:0);assert.equal(hit.reward.primeCube,i>=6?1:0);
 assert.equal(miss.reward.items.length,0);assert.equal(miss.reward.scroll,0);assert.equal(miss.state.gold,state.gold+COOP_TIERS[i].gold);
}
const p={attack:100,hp:10000,defense:0,boss:1,crit:0,critDamage:1,cadence:1,advancement:0,firstJob:false};
const member=id=>({id,classId:'warrior',name:'검증이',power:p,advanced:false,left:false});
for(let tier=0;tier<10;tier++){const rooms=[1,3,4].map(n=>startCoop({tier,status:'waiting',members:Array.from({length:n},(_,i)=>member(String(i)))},0));assert.ok(rooms.every(r=>r.hp===COOP_TIERS[tier].hp));}
let world=startCoop({tier:0,status:'waiting',members:[member('me'),member('other')]},0);world.hp=1;world.members[0].x=1600;world.members[0].y=1500;
world=advanceCoop(world,'me',[0,0,1],0);world=advanceCoop(world,'me',[0,0,1],500);
assert.equal(world.status,'won');assert.ok(world.chest);assert.equal(world.effects.length,0);
world=advanceCoop(world,'me',[1,0,0],1100);const x=world.members[0].x;world=advanceCoop(world,'me',[1,0,0],1500);assert.ok(world.members[0].x>x);
assert.throws(()=>advanceCoop(world,'me',[100,0,0],1600),/INVALID_COOP_INPUT/);
const db=new PGlite();
try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);create table auth.sessions(id uuid primary key,user_id uuid,created_at timestamptz default now());create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('session_id',current_setting('test.sid',true))$$;`);
 await db.exec(await readFile(new URL('schema.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('coop-schema.sql',import.meta.url),'utf8'));
 await db.exec('update rebirth_private.release set enabled=true');
 const epoch=(await db.query('select epoch from rebirth_private.release')).rows[0].epoch;
 const users=Array.from({length:5},()=>({id:randomUUID(),sid:randomUUID()}));
 for(const u of users){await db.query('insert into auth.users values($1)',[u.id]);await db.query('insert into auth.sessions(id,user_id) values($1,$2)',[u.sid,u.id]);await db.query('insert into rebirth_private.players(id,state,active_session,session_started) values($1,$2,$3,now())',[u.id,JSON.stringify(state),u.sid]);}
 const get=async u=>(await db.query('select state,revision from rebirth_private.players where id=$1',[u.id])).rows[0];
 const call=async(u,action,args={},extra={})=>{const a=await get(u);return (await db.query('select public.rebirth_coop_action($1) r',[JSON.stringify({user:u.id,session:u.sid,epoch,revision:a.revision,request:randomUUID(),fingerprint:{action,args},state:a.state,power:p,action,args,...extra})])).rows[0].r;};
 let res=await call(users[0],'create',{tier:9});const rid=res.coop.id;
 for(const u of users.slice(1,4))res=await call(u,'join',{room:rid});
 await assert.rejects(()=>call(users[4],'join',{room:rid}),/PARTY_NOT_FOUND/);
 const win={...res.coop,status:'won',chest:{x:1600,y:1500},members:res.coop.members.map(m=>({...m,x:1600,y:1500,damage:1}))};
 // Emulate a server-authoritative victory after a real start; no player is paid or removed yet.
 res=await call(users[0],'start',{}, {world:startCoop(res.coop,ctx.now),roomRevision:res.coop.revision});
 res=await call(users[0],'input',{}, {world:win,roomRevision:res.coop.revision});
 assert.equal((await get(users[1])).state.coopRoom,rid);assert.equal(res.state.gold,state.gold);
 const claim=grantCoopChest(res.state,9,{...ctx,random:()=>0}),request=randomUUID();
 const opts={reward:claim.reward,rewardState:claim.state,roomRevision:res.coop.revision,request};
 const opened=await call(users[0],'open',{},opts);assert.equal(opened.state.coopRoom,undefined);assert.equal(opened.state.gold,state.gold+COOP_TIERS[9].gold);
 const replay=await call(users[0],'open',{},opts);assert.equal(replay.state.gold,opened.state.gold);
 const other=await call(users[1],'read');assert.equal(other.coop.members[0].claimed,true);assert.equal(other.state.coopRoom,rid);
 const far=structuredClone(other.coop);far.members[1].x=100;
 const moved=await call(users[1],'input',{}, {world:far,roomRevision:other.coop.revision});
 await assert.rejects(()=>call(users[1],'open',{}, {...opts,request:randomUUID(),roomRevision:moved.coop.revision}),/COOP_CHEST_TOO_FAR/);
 const near={...moved.coop,members:moved.coop.members.map(m=>({...m,x:1600,damage:0}))};
 const idle=await call(users[1],'input',{}, {world:near,roomRevision:moved.coop.revision});
 await assert.rejects(()=>call(users[1],'open',{}, {...opts,request:randomUUID(),roomRevision:idle.coop.revision}),/COOP_DAMAGE_REQUIRED/);
 await db.exec('set role authenticated');await assert.rejects(()=>db.query('select public.rebirth_coop_action($1)',['{}']),/permission denied/);await db.exec('reset role');
 console.log('PASS: ten fixed three-player tiers, max four, independent personal claim, replay safety, distance/contribution checks, victory movement, locked new gear, scroll unlock and legacy preservation.');
}finally{await db.close();}
