import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {ARENA_REWARDS,arenaSeasonReward} from '../rebirth/arena-rewards.mjs';
import {arenaView,arenaTierIcon} from '../rebirth/arena-ui.mjs';
const db=new PGlite(),first='2026-10-04T15:00:00Z',next='2026-10-11T15:00:00Z';
const ids=Array.from({length:8},(_,i)=>`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`);
const query=async(sql,args=[])=>(await db.query(sql,args)).rows;
try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create schema rebirth_private;
 grant usage on schema rebirth_private to authenticated,service_role;
 create table auth.users(id uuid primary key,raw_app_meta_data jsonb default '{}');
 create table auth.sessions(id uuid primary key,user_id uuid,created_at timestamptz default now());
 create table rebirth_private.players(id uuid primary key,state jsonb,revision bigint default 0,active_session uuid,session_started timestamptz default now(),updated_at timestamptz default now());
 create table rebirth_private.receipts(user_id uuid,request_id uuid,fingerprint jsonb,result jsonb,primary key(user_id,request_id));
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
 create function rebirth_private.session_user() returns uuid language plpgsql stable as $$begin if auth.uid() is null then raise exception 'LOGIN_REQUIRED';end if;return auth.uid();end$$;
 create function rebirth_private.combat_power(jsonb) returns bigint language sql immutable as $$select 100::bigint$$;`);
 await db.exec(await readFile(new URL('../supabase/migrations/20261003180315_arena_season.sql',import.meta.url),'utf8'));
 await db.exec('alter table rebirth_private.arena_bots drop constraint arena_bots_score_check;alter table rebirth_private.arena_bots add check(score>=0)');
 await db.exec((await readFile(new URL('../supabase/arena_season_growth_balance.sql',import.meta.url),'utf8')).split('-- Daily ladder refresh')[0]);
 await db.exec(await readFile(new URL('../supabase/arena_five_minute_refresh.sql',import.meta.url),'utf8'));
 const source=await readFile(new URL('../supabase/arena_season_rewards.sql',import.meta.url),'utf8');
 await db.exec(source.split('-- Database job:')[0]);
 const reward=async(score,rank)=>(await query('select rebirth_private.arena_reward_for($1,$2) r',[score,rank]))[0].r;
 for(const score of [null,0,99,100,399,400,799,800,1199,1200,1299,1300,1599,1600,1899,1900,2199,2200,2299,2300,2500,2600,99999])for(const rank of [null,1,2,3,4,10,11,2000]){
  const js=arenaSeasonReward(score,rank),sql=await reward(score,rank);
  assert.deepEqual(sql,js?{label:js.label,gold:js.gold,highCube:js.highCube,primeCube:js.primeCube}:null,'SQL/client reward parity');
 }
 assert.equal(ARENA_REWARDS.length,27);
 ARENA_REWARDS.forEach((r,i)=>{if(i){const prev=ARENA_REWARDS[i-1];assert(r.gold>prev.gold);assert(r.highCube>=prev.highCube);assert(r.primeCube>=prev.primeCube);}});
 assert.equal((await reward(1900,100)).primeCube,10);assert.equal((await reward(2500,100)).primeCube,14);
 await db.exec(`create or replace function rebirth_private.arena_season_start() returns timestamptz language sql stable as $$select '${next}'::timestamptz$$`);
 const entries=[[5000,5],[4900,4],[4500,5],[4000,5],[450,5],[2000,5],[null,0],[0,5]];
 for(let i=0;i<ids.length;i++){
  await query('insert into auth.users(id,raw_app_meta_data) values($1,$2)',[ids[i],i===5?{ringu_admin:true}:{}]);
  await query('insert into rebirth_private.players(id,state) values($1,$2)',[ids[i],{version:'rebirth-1',name:'모험가'+i,classId:'mage',level:100,xp:10,gold:1000,materials:{highCube:2,primeCube:1},battle:null,items:[{id:'untouched'}],rewardMailbox:[{id:'other',rewards:{scroll:1}}],systemMailbox:[],claimedSystemMail:[]}]);
  await query('insert into rebirth_private.arena_players(user_id,season_start,score,wins) values($1,$2,$3,999)',[ids[i],first,entries[i][0]]);
  for(let m=0;m<entries[i][1];m++)await query('insert into rebirth_private.arena_matches(user_id,request_id,season_start,opponent_id,result) values($1,$2,$3,$4,$5)',[ids[i],crypto.randomUUID(),first,'bot:1',{battle:{won:true}}]);
 }
 // A current-season account, regardless of score or wins, must receive nothing early.
 await query('insert into rebirth_private.arena_players(user_id,season_start,score,wins) values($1,$2,10000,100)',[ids[0],next]);
 const before=await query('select id,state,revision from rebirth_private.players order by id');
 assert.equal((await query('select rebirth_private.arena_settle_rewards() n'))[0].n,5);
 const ledger=await query('select * from rebirth_private.arena_season_rewards order by final_rank');
 assert.equal(ledger.length,5);assert.equal(ledger[0].tier_label,'챔피언');assert.equal(ledger[1].tier_label,'챌린저');assert.equal(ledger[2].tier_label,'그랜드 마스터');
 assert(!ledger.some(r=>r.user_id===ids[1]||r.user_id===ids[5]||r.season_start===next));
 const after=await query('select id,state,revision from rebirth_private.players order by id');
 for(const row of after){const old=before.find(x=>x.id===row.id);assert.equal(row.state.gold,old.state.gold);assert.deepEqual(row.state.materials,old.state.materials);assert.deepEqual(row.state.items,old.state.items);}
 assert.equal((await query('select rebirth_private.arena_settle_rewards() n'))[0].n,0);assert.deepEqual(await query('select id,state,revision from rebirth_private.players order by id'),after);
 // Settlement is independent of bots already being reset for the new week.
 await db.exec('update rebirth_private.arena_bots set score=100000');
 assert.equal((await query('select final_rank from rebirth_private.arena_season_rewards where user_id=$1',[ids[0]]))[0].final_rank,1);
 const identify=async i=>query("select set_config('test.uid',$1,false)",[i==null?'':ids[i]]);
 const claim=async(season=first,request=crypto.randomUUID())=>(await query('select public.rebirth_arena_reward_claim($1,$2) r',[season,request]))[0].r;
 await identify(null);await assert.rejects(()=>claim(),/LOGIN_REQUIRED/);
 await identify(1);await assert.rejects(()=>claim(),/MAIL_NOT_FOUND/);
 await identify(0);await query("update rebirth_private.players set state=jsonb_set(state,'{battle}','{}') where id=$1",[ids[0]]);await assert.rejects(()=>claim(),/BATTLE_IN_PROGRESS/);
 // Client-visible mailbox values are not trusted for awarding currency.
 await query("update rebirth_private.players set state=jsonb_set(jsonb_set(state,'{battle}','null'),'{rewardMailbox}', $2) where id=$1",[ids[0],[{id:'arena-season-20261005',kind:'arenaSeason',rewards:{gold:999999999}}]]);
 const request=crypto.randomUUID(),result=await claim(first,request);
 assert.equal(result.state.gold,6001000);assert.equal(result.state.materials.highCube,182);assert.equal(result.state.materials.primeCube,31);
 assert(!result.state.systemMailbox.some(m=>m.id==='arena-season-20261005'));assert(!result.state.rewardMailbox.some(m=>m.id==='arena-season-20261005'));
 assert.deepEqual(await claim(first,request),result);await assert.rejects(()=>claim(),/MAIL_ALREADY_CLAIMED/);await assert.rejects(()=>claim(next,request),/REQUEST_ID_REUSED/);
 const s={score:1900,rank:100,seasonStart:first,seasonEndsAt:next,seasonMatches:4,wins:999,losses:0};
 const html=arenaView({data:s,page:'rewards'});assert(html.includes('보상까지 1경기'));assert(html.includes('다이아 I'));assert(!html.includes('추후 공개'));assert(!html.includes('gold.svg'));
 assert(arenaTierIcon(1900,100).includes('tier-diamond'));assert(arenaTierIcon(null,null).includes('tier-unranked'));
 await identify(4);
 const rankings=(await query('select public.rebirth_rankings() r'))[0].r;assert.equal(rankings.length,7);assert.equal(rankings.find(r=>r.id===ids[4]).arenaScore,null,'old season score must not appear');assert.equal(rankings.find(r=>r.id===ids[0]).arenaScore,10000);
 await db.exec('set role anon');await assert.rejects(()=>claim(),/permission denied/);await assert.rejects(()=>query('select rebirth_private.arena_settle_rewards()'),/permission denied/);await db.exec('reset role');
 await db.exec('set role authenticated');await assert.rejects(()=>query('select * from rebirth_private.arena_season_rewards'),/permission denied/);await assert.rejects(()=>query('select rebirth_private.arena_settle_rewards()'),/permission denied/);await db.exec('reset role');
 console.log('PASS 27 rewards and score/rank boundaries, monotonic tiers, 5 real matches, weekly close, final board, mail-only delivery, exactly-once claim, no early/admin rewards, ownership/privileges, ranking season and UI.');
}catch(error){console.error(error.message,error.where||'');process.exitCode=1;}finally{await db.close();}
