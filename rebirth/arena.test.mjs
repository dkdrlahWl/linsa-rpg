import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {initialState,power} from './engine.mjs';
import {buildBot,botScore,gearSpec,simulateArena,tier} from './arena-model.mjs';

assert.equal(botScore(1),3000);
assert.equal(botScore(10),2600);
assert.equal(botScore(100),2200);
assert.equal(botScore(2000),0);
assert.equal(tier(3000,1).label,'챌린저');
assert.equal(tier(2999,2).name,'그랜드 마스터');
assert.equal(tier(2200,100).name,'마스터');
assert.equal(gearSpec(1200).attackLines,10);
assert.deepEqual({...gearSpec(3000)},{level:190,stars:20,grade:5,attackLines:25});
for(const [score,spec] of [[1200,gearSpec(1200)],[3000,gearSpec(3000)]]){
 const b=buildBot({id:score,score});assert.equal(b.items.length,9);
 assert(b.items.every(i=>i.boss&&i.level===spec.level&&i.stars===spec.stars&&i.grade===spec.grade));
 assert.equal(b.items.flatMap(i=>i.lines).filter(l=>l.key==='attack').length,spec.attackLines);
 assert(power(b).combatPower>0);
}
const low=buildBot({id:2000}),high=buildBot({id:1});
assert.equal(low.level,high.level);
assert.equal(low.advancement,high.advancement);
assert(power(high).combatPower>power(low).combatPower);
assert.deepEqual(simulateArena(low,high,'same'),simulateArena(low,high,'same'));

const db=new PGlite();
try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
 create table auth.users(id uuid primary key,raw_app_meta_data jsonb default '{}');
 create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),created_at timestamptz default now());
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
 create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('session_id',current_setting('test.sid',true))$$;`);
 await db.exec(await readFile(new URL('./schema.sql',import.meta.url),'utf8'));
 const migration=await readFile(new URL('../supabase/migrations/20261003180315_arena_season.sql',import.meta.url),'utf8');
 await db.exec(migration);
 await db.exec(await readFile(new URL('../supabase/migrations/20261003182314_arena_rank_tie_fix.sql',import.meta.url),'utf8'));
 await db.exec('update rebirth_private.release set enabled=true');
 const a={id:randomUUID(),sid:randomUUID()},b={id:randomUUID(),sid:randomUUID()};
 for(const [u,name] of [[a,'검사'],[b,'마법사']]){
  const state=initialState(u===a?'warrior':'mage',name,{now:0,uuid:randomUUID});
  await db.query('insert into auth.users(id) values($1)',[u.id]);
  await db.query('insert into auth.sessions(id,user_id) values($1,$2)',[u.sid,u.id]);
  await db.query('insert into rebirth_private.players(id,state) values($1,$2)',[u.id,JSON.stringify(state)]);
 }
 const login=async u=>db.query("select set_config('test.uid',$1,false),set_config('test.sid',$2,false)",[u.id,u.sid]);
 await login(a);
 const status=async()=>(await db.query('select public.rebirth_arena_status() s')).rows[0].s;
 let s=await status();assert.equal(s.score,null);assert.equal(s.offers.length,4);assert.equal(s.top100.length,100);assert.equal(s.top100[0].score,3000);
 assert.equal((await db.query('select count(*) n from rebirth_private.arena_bots')).rows[0].n,2000);
 const target=s.offers[0].id,request=randomUUID(),battle={won:true,frames:[]};
 await db.exec('set role service_role');
 const commit=async(req=request,id=target)=>db.query('select public.rebirth_arena_commit($1,$2,$3,$4,$5) r',[a.id,a.sid,req,id,JSON.stringify({battle,opponent:{name:'상대'}})]);
 const first=(await commit()).rows[0].r;assert.equal(first.scoreAfter,120);assert.equal(first.delta,120);
 assert.deepEqual((await commit()).rows[0].r,first);
 await assert.rejects(()=>commit(randomUUID(),target),/ARENA_OPPONENT_UNAVAILABLE/);
 await db.exec('reset role');await login(a);
 s=await status();assert.equal(s.score,120);assert.equal(s.wins,1);assert.equal(s.history.length,1);
 await db.query('update rebirth_private.arena_players set score=3000 where user_id=$1',[a.id]);
 s=await status();assert.equal(s.rank,2);assert.equal(tier(s.score,s.rank).name,'그랜드 마스터');
 await db.exec('set role anon');await assert.rejects(()=>db.query('select public.rebirth_arena_status()'),/permission denied/);await db.exec('reset role');
 console.log('PASS arena: 2,000 bots, gear benchmarks, deterministic combat, four offers, top 100, trusted commit, retry, one-use offers, private access.');
}finally{await db.close();}
