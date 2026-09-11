// Real independent PostgreSQL connections in a new loopback-only cluster.
import {spawn} from 'node:child_process';
import {mkdtemp,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {initialState,execute,balance} from '../supabase/functions/_shared/economy.mjs';
const bin=process.env.QA_POSTGRES_BIN;if(!bin)throw Error('QA_POSTGRES_BIN required');
const dir=await mkdtemp(join(tmpdir(),'daily-boss-qa-')),data=join(dir,'data'),port='55441';
function processRun(name,args,input=''){return new Promise((resolve,reject)=>{const p=spawn(join(bin,name+'.exe'),args,{cwd:dir,windowsHide:true,stdio:['pipe','pipe','pipe']});let out='',err='';p.stdout.on('data',s=>out+=s);p.stderr.on('data',s=>err+=s);p.on('error',reject);p.on('exit',code=>code===0?resolve(out):reject(Error(name+': '+err)));p.stdin.end(input);});}
const sql=text=>processRun('psql',['-X','-qAt','-h','127.0.0.1','-p',port,'-U','bossqa','-d','postgres','-v','ON_ERROR_STOP=1','-f','-'],text);
const lit=v=>"'"+String(v).replaceAll("'","''")+"'",json=v=>lit(JSON.stringify(v))+'::jsonb';
const parse=out=>JSON.parse(out.trim().split(/\r?\n/).at(-1));
const u=randomUUID(),sid=randomUUID(),identify=`set test.uid=${lit(u)};set test.sid=${lit(sid)};`;
const snapshot=async()=>parse(await sql(identify+'select public.ringu_economy_snapshot();'));
const hits=Array.from({length:10},(_,i)=>({at:(i+1)*1000,damage:100,crit:false}));
const start=async(revision,id=randomUUID())=>parse(await sql(`select public.ringu_daily_boss(${lit(u)},${lit(sid)},'start',${lit(id)},${revision},${json(hits)});`));
let started=false;
try{
 await processRun('initdb',['-D',data,'-U','bossqa','-A','trust','--encoding=UTF8','--locale=C']);
 await processRun('pg_ctl',['-D',data,'-l',join(dir,'postgres.log'),'-o','-h 127.0.0.1 -p '+port,'-w','start']);started=true;
 await sql(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),created_at timestamptz default now());create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('session_id',current_setting('test.sid',true))$$;create schema extensions;create extension pgcrypto with schema extensions;`);
 for(const f of ['01-account-storage.sql','02-ranking-party.sql'])await sql(await readFile(new URL('fixtures/'+f,import.meta.url),'utf8'));
 for(const f of ['06-costume-foundation.sql','07-costume-price-100.sql','08-costume-integration.sql','09-open-costume-shop.sql','10-auction-foundation.sql','11-economy-command-gateway.sql','16-economy-differential-commit.sql','migrations/20260911132759_daily_boss.sql'])await sql(await readFile(new URL('../supabase/'+f,import.meta.url),'utf8'));
 const seed=initialState(Date.now());seed.autoBattle=false;
 await sql(`insert into auth.users values(${lit(u)});insert into auth.sessions(id,user_id) values(${lit(sid)},${lit(u)});${identify}select public.ringu_account('activate');update ringu_private.auction_release set economy_ready=true;select public.ringu_economy_enroll(${lit(u)},${lit(sid)},${json(seed)});`);
 for(let attempt=1;attempt<=3;attempt++){
  const snap=await snapshot(),id=randomUUID();
  const replay=await Promise.all(Array.from({length:8},()=>start(snap.revision,id)));assert.ok(replay.every(r=>r.remaining===3-attempt));
  const races=await Promise.allSettled(Array.from({length:8},()=>start(snap.revision)));
  assert.ok(races.every(r=>r.status==='rejected'));
  await sql("update ringu_private.daily_boss_runs set started_at=started_at-interval '11 seconds',ends_at=ends_at-interval '11 seconds' where not settled;");
  await sql('select ringu_private.daily_boss_settle();');
 }
 const snap=await snapshot();const extra=await Promise.allSettled(Array.from({length:8},()=>start(snap.revision)));assert.ok(extra.every(r=>r.status==='rejected'&&/DAILY_BOSS_LIMIT/.test(r.reason.message)));
 // Midnight settlement is serialized with itself and creates one durable mail.
 await sql("update ringu_private.daily_boss_scores set day=day-1;insert into ringu_private.daily_boss_days(day) select day-1 from ringu_private.daily_boss_days limit 1;");
 await Promise.all(Array.from({length:8},()=>sql('select ringu_private.daily_boss_settle();')));
 assert.equal(Number((await sql('select count(*) from ringu_private.daily_boss_rewards;')).trim()),1);
 let s=await snapshot();assert.equal(s.state.mailbox.length,1);
 const mail=s.state.mailbox[0],computed=execute(s.state,'mail',{id:mail.id},{...s,random:()=>0,uuid:randomUUID});
 const commit=(id,fp,st,rev)=>sql(`select public.ringu_economy_commit(${lit(u)},${lit(sid)},${rev},${lit(id)},${json(fp)},${json(st)},'{}');`);
 const id=randomUUID();await Promise.all(Array.from({length:8},()=>commit(id,{command:'mail',args:{id:mail.id}},computed.state,s.revision)));
 assert.equal((await snapshot()).state.essence,mail.reward.essence);assert.equal((await snapshot()).state.mailbox.length,0);
 s=await snapshot();const equipment={...balance.gear[0],id:99999,auctionUid:randomUUID(),enhance:0,transcend:0};
 await commit(randomUUID(),{command:'sync',args:{}},{...s.state,inventory:[equipment]},s.revision);s=await snapshot();
 const out=execute(s.state,'dismantle',{ids:[99999]},{...s,random:()=>0,randomInt:()=>0,uuid:randomUUID});
 const removal=await Promise.allSettled(Array.from({length:8},()=>commit(randomUUID(),{command:'dismantle',args:{ids:[99999]}},out.state,s.revision)));
 assert.equal(removal.filter(r=>r.status==='fulfilled').length,1);assert.equal((await snapshot()).state.essence,s.state.essence+1);assert.equal((await snapshot()).state.inventory.length,0);
 // Real pgcrypto bytes, not the deterministic PGlite stand-in.
 const dist=parse(await sql("select json_build_object('min',min(n),'max',max(n),'buckets',count(distinct n)) from (select ringu_private.daily_boss_roll() n from generate_series(1,10000)) q;"));assert.deepEqual(dist,{min:0,max:99,buckets:100});
 console.log('PASS real PostgreSQL: 24 simultaneous replay starts, competing starts/3-attempt cap, 8 midnight settlements, 8 mail claims, 8 distinct dismantle requests, pgcrypto 100-bucket coverage.');
}finally{if(started)await processRun('pg_ctl',['-D',data,'-m','fast','-w','stop']);console.log('Stopped isolated cluster: '+dir);}
