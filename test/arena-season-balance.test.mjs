import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {botScore,arenaSeasonStart,arenaPointDelta,tier,arenaOfferProfiles} from '../rebirth/arena-model.mjs';
import {arenaView} from '../rebirth/arena-ui.mjs';
const db=new PGlite();
try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create schema rebirth_private;
 grant usage on schema rebirth_private to authenticated,service_role;
 create table auth.users(id uuid primary key);
 create table auth.sessions(id uuid primary key,user_id uuid,created_at timestamptz default now());
 create table rebirth_private.players(id uuid primary key,state jsonb,active_session uuid,session_started timestamptz default now());
 create function rebirth_private.session_user() returns uuid language sql stable as $$select current_setting('test.uid')::uuid$$;`);
 await db.exec(await readFile(new URL('../supabase/migrations/20261003180315_arena_season.sql',import.meta.url),'utf8'));
 await db.exec('alter table rebirth_private.arena_bots drop constraint arena_bots_score_check;alter table rebirth_private.arena_bots add check(score>=0)');
 const sql=(await readFile(new URL('../supabase/arena_season_growth_balance.sql',import.meta.url),'utf8')).split('-- Daily ladder refresh')[0];await db.exec(sql);
 await db.exec(await readFile(new URL('../supabase/arena_five_minute_refresh.sql',import.meta.url),'utf8'));
 const start=arenaSeasonStart(Date.parse('2026-10-05T00:00:00+09:00'))/1800000;
 assert.equal(arenaSeasonStart(Date.parse('2026-10-04T23:59:59+09:00')),Date.parse('2026-09-28T00:00:00+09:00'));
 assert.equal(arenaSeasonStart(Date.parse('2026-10-05T00:00:00+09:00')),Date.parse('2026-10-05T00:00:00+09:00'));
 let first,last,shifted,nextDay;
 for(const bucket of [start,start+1,start+47,start+48,start+200,start+335,start+336]){
  const rows=(await db.query('select * from rebirth_private.arena_halfhour_bot_order($1) order by bot_rank',[bucket])).rows;
  assert.equal(rows.length,2000);assert.equal(new Set(rows.map(r=>r.id)).size,2000);
  for(const r of rows)assert.equal(r.score,botScore(r.id,bucket),'SQL/client ladder parity');
  assert(rows.every((r,i)=>i===0||r.score<=rows[i-1].score));
  if(bucket===start)first=rows;if(bucket===start+1)shifted=rows;if(bucket===start+335)last=rows;if(bucket===start+48)nextDay=rows;if(bucket===start+47)assert.deepEqual(rows,first);
 }
 assert(first[99].score<2200);assert(last[99].score>=2500);
 assert.deepEqual(first,shifted,'Scores/ranks must stay fixed within the Korea day');
 assert.notDeepEqual(first,nextDay,'Scores/ranks must refresh at Korea midnight');
 assert.equal(last[0].score,botScore(last[0].id,start+288));
 for(const score of [null,0,2199,2200,2500,50000])for(const won of [true,false])assert.equal((await db.query('select rebirth_private.arena_match_delta($1,$2) d',[score,won])).rows[0].d,arenaPointDelta(score,won));
 const a={id:randomUUID(),sid:randomUUID()},b={id:randomUUID(),sid:randomUUID()};
 for(const [u,name] of [[a,'본인'],[b,'실제마스터']]){
  await db.query('insert into auth.users(id) values($1)',[u.id]);await db.query('insert into auth.sessions(id,user_id) values($1,$2)',[u.sid,u.id]);
  await db.query('insert into rebirth_private.players(id,state,active_session) values($1,$2,$3)',[u.id,JSON.stringify({name,classId:'mage',level:200,items:[],equipped:{}}),u.sid]);
  await db.query('insert into rebirth_private.arena_players(user_id,season_start,score) values($1,rebirth_private.arena_season_start(),$2)',[u.id,2300]);
 }
 await db.query("select set_config('test.uid',$1,false)",[a.id]);
 const status=async()=>(await db.query('select public.rebirth_arena_status() s')).rows[0].s;
 let s=await status();assert.equal(Date.parse(s.nextRefreshAt)%300000,0);assert(Date.parse(s.nextRefreshAt)>Date.now()&&Date.parse(s.nextRefreshAt)<=Date.now()+300000);assert.equal(s.top100.length,100);assert.equal(s.offers.length,4);assert(s.offers.every(o=>Math.abs(o.score-s.score)<=120));
 // Force an old, wrong Silver snapshot to prove player scores and ranks are refreshed within a bucket.
 await db.query('update rebirth_private.arena_players set offers=$2 where user_id=$1',[a.id,JSON.stringify([{id:'player:'+b.id,name:'이전이름',classId:'mage',score:450,rank:1900,kind:'player',used:false}])]);
 s=await status();assert.equal(s.offers[0].score,2300);assert.equal(s.offers[0].name,'실제마스터');
 const profiles=await arenaOfferProfiles(s,async()=>({name:'실제마스터',classId:'mage',level:200,advancement:4,stats:{INT:999,STR:4,DEX:4,LUK:4},items:[],equipped:{}}));assert.equal(profiles[0].tier.label,'마스터 III');
 const html=arenaView({data:{...s,offers:profiles},page:'opponents'});assert(html.includes('마스터'));assert(!html.includes('실버'));
 const target=s.offers[0].id;
 for(const [score,won,after,delta] of [[2199,true,2229,30],[2200,true,2225,25],[2200,false,2175,-25],[0,false,0,0],[50000,true,50025,25]]){
  const request=randomUUID();await db.query('update rebirth_private.arena_players set score=$2,offers=$3 where user_id=$1',[a.id,score,JSON.stringify([{id:target,used:false}])]);
  const args=[a.id,a.sid,request,target,JSON.stringify({battle:{won,frames:[]}})];
  const result=(await db.query('select public.rebirth_arena_commit($1,$2,$3,$4,$5) r',args)).rows[0].r;
  assert.equal(result.scoreAfter,after);assert.equal(result.delta,delta);
  assert.deepEqual((await db.query('select public.rebirth_arena_commit($1,$2,$3,$4,$5) r',args)).rows[0].r,result);
  await assert.rejects(()=>db.query('select public.rebirth_arena_commit($1,$2,$3,$4,$5)',[a.id,a.sid,randomUUID(),target,args[4]]),/ARENA_OPPONENT_UNAVAILABLE/);
 }
 // An offer from the preceding five-minute window cannot be reused, and refresh resets availability.
 await db.query('update rebirth_private.arena_players set offer_bucket=floor(extract(epoch from now())/300)::bigint-1 where user_id=$1',[a.id]);
 await assert.rejects(()=>db.query('select public.rebirth_arena_commit($1,$2,$3,$4,$5)',[a.id,a.sid,randomUUID(),target,JSON.stringify({battle:{won:true,frames:[]}})]),/ARENA_OFFERS_EXPIRED/);
 s=await status();assert.equal(s.offers.length,4);assert(s.offers.every(o=>o.used===false));
 const bucket=(await db.query('select offer_bucket from rebirth_private.arena_players where user_id=$1',[a.id])).rows[0].offer_bucket;
 assert.equal(Number(bucket),Math.floor(Date.parse(s.nextRefreshAt)/300000)-1);
 await db.exec('set role anon');await assert.rejects(()=>db.query('select public.rebirth_arena_status()'),/permission denied/);await assert.rejects(()=>db.query('select public.rebirth_arena_commit(null,null,null,null,null)'),/permission denied/);await db.exec('reset role');
 console.log('PASS season growth, 2,000 score parity, daily growth/ranks and 5-minute offers, Monday rollover, Master ±25, uncapped scoring, matching, actual user tiers, receipts and one-use offers.');
 console.log(JSON.stringify({mondayRank100:first[99].score,sundayRank100:last[99].score,mondayFirst:first[0].score,sundayFirst:last[0].score}));
}finally{await db.close();}
