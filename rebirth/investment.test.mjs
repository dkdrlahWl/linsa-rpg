import {PGlite} from '@electric-sql/pglite';import fs from 'node:fs';import assert from 'node:assert/strict';
const db=new PGlite();const u='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);insert into auth.users values('${u}'),('${other}');create schema rebirth_private;create table rebirth_private.players(id uuid primary key,state jsonb,revision bigint default 0,updated_at timestamptz);create table rebirth_private.receipts(user_id uuid,request_id uuid,fingerprint jsonb,result jsonb,primary key(user_id,request_id));create function rebirth_private.session_user() returns uuid language sql as $$select '${u}'::uuid$$;insert into rebirth_private.players values('${u}','{"gold":100000,"battle":null}',0,now());`);
await db.exec(fs.readFileSync(new URL('./investment.sql',import.meta.url),'utf8').split("select cron.schedule")[0]);
await db.exec(fs.readFileSync(new URL('./investment-news.sql',import.meta.url),'utf8'));
await db.exec('update rebirth_private.coin_market set price=1000,day_base=1000');
async function trade(action,args={},request=crypto.randomUUID()){return (await db.query('select rebirth_private.investment($1,$2::jsonb,$3::uuid) r',[action,JSON.stringify(args),request])).rows[0].r;}
let r=await trade('list');assert.equal(r.investment.coins.length,8);const tick=r.investment.coins[0].tickAt;
const request=crypto.randomUUID(),args={coin:0,side:'long',quantity:10,tickAt:tick};r=await trade('buy',args,request);assert.equal(r.state.gold,90000);const id=r.investment.positions[0].id;r=await trade('buy',args,request);assert.equal(r.state.gold,90000);assert.equal(r.investment.positions.length,1);
await db.exec('update rebirth_private.coin_market set price=1100 where id=0');r=await trade('sell',{position:id,tickAt:tick});assert.equal(r.state.gold,100890);assert.equal(r.result.events[0].fee,110);await assert.rejects(()=>trade('sell',{position:id,tickAt:tick}));
await assert.rejects(()=>trade('buy',{coin:0,side:'short',quantity:10,tickAt:tick}));
await assert.rejects(()=>trade('buy',{coin:0,side:'long',quantity:-1,tickAt:tick}));await assert.rejects(()=>trade('buy',{coin:0,side:'long',quantity:999999999,tickAt:tick}));await assert.rejects(()=>trade('buy',{coin:0,side:'long',quantity:1,tickAt:'2020-01-01'}));
await db.exec(`insert into rebirth_private.coin_positions(user_id,coin,side,amount,entry) values('${other}',0,'long',10,1000)`);const foreign=(await db.query(`select id from rebirth_private.coin_positions where user_id='${other}'`)).rows[0].id;await assert.rejects(()=>trade('sell',{position:foreign,tickAt:tick}));
await db.exec(`update rebirth_private.coin_market set tick_at=date_trunc('hour',now())-interval '72 hours',day_key=(now()-interval '72 hours')::date,price=1000,day_base=1000;select rebirth_private.coin_tick();`);
await assert.rejects(()=>trade('buy',{coin:0,side:'long',quantity:1.5,tickAt:tick}));
const rows=(await db.query('select * from rebirth_private.coin_candles order by coin,at')).rows;assert.equal(rows.length,576);for(const x of rows)assert.ok(Math.abs(Number(x.close)/Number(x.open)-1)<=.050001);
const groups=new Map();for(const x of rows){const day=new Date(new Date(x.at).getTime()+9*3600000).toISOString().slice(0,10),key=x.coin+day;if(!groups.has(key))groups.set(key,Number(x.open));const base=groups.get(key);assert.ok(Number(x.close)>=base*.7-.00001&&Number(x.close)<=base*1.3+.00001);}
const source=fs.readFileSync(new URL('./investment.sql',import.meta.url),'utf8');
const tickSQL=source.slice(source.indexOf('create or replace function rebirth_private.coin_tick()'),source.indexOf('revoke all on function rebirth_private.coin_tick()')).replace("clock_timestamp()","current_setting('test.coin_now')::timestamptz");
await db.exec(tickSQL);
await db.exec("select set_config('test.coin_now','2026-10-01 14:00:00+00',false);update rebirth_private.coin_market set day_key='2026-10-01',day_base=1000,price=case when id%2=0 then 1300 else 700 end,tick_at='2026-10-01 10:00:00+00';select rebirth_private.coin_tick();");
for(const c of (await db.query('select * from rebirth_private.coin_market')).rows)assert.equal(Number(c.price),c.id%2===0?1300:700);
await db.exec("select set_config('test.coin_now','2026-10-01 15:00:00+00',false);select rebirth_private.coin_tick();");
for(const c of (await db.query('select * from rebirth_private.coin_market')).rows){assert.equal(Number(c.price),c.id%2===0?1300:700);assert.equal(Number(c.price),Number(c.day_base));assert.equal(new Date(c.day_key).toISOString().slice(0,10),'2026-10-02');}
await db.exec("select set_config('test.coin_now','2026-10-01 16:00:00+00',false);select rebirth_private.coin_tick();");
assert.equal((await db.query("select count(*) n from rebirth_private.coin_market where trend<>0")).rows[0].n,8);
// News probabilities change relatively; the unpublished schedule stays private.
await db.exec("delete from rebirth_private.coin_news;delete from rebirth_private.coin_news_days;");
await db.exec("select rebirth_private.coin_news_schedule(d::date) from generate_series('2027-01-01'::date,'2027-03-31'::date,interval '1 day') d;");
for(const row of (await db.query('select day,count(*) n,min(boost) lo,max(boost) hi from rebirth_private.coin_news group by day')).rows){assert.ok(row.n>=2&&row.n<=4);assert.ok(Number(row.lo)>=.1&&Number(row.hi)<=.3);}
const schedule=(await db.query('select id,published_at from rebirth_private.coin_news order by id')).rows;
await db.exec("select rebirth_private.coin_news_schedule('2027-01-01');");assert.deepEqual((await db.query('select id,published_at from rebirth_private.coin_news order by id')).rows,schedule);
await db.exec("insert into rebirth_private.coin_news_days values((now() at time zone 'Asia/Seoul')::date) on conflict do nothing;insert into rebirth_private.coin_news(day,coin,catalog,published_at,expires_at,boost) values((now() at time zone 'Asia/Seoul')::date,0,1,now()-interval '1 hour',now()+interval '23 hours',.10),((now() at time zone 'Asia/Seoul')::date,1,101,now()-interval '2 hours',now()+interval '22 hours',.30),((now() at time zone 'Asia/Seoul')::date,0,101,now()+interval '1 hour',now()+interval '25 hours',.10);");
const chance=async(id,at='now()')=>Number((await db.query(`select rebirth_private.coin_up_chance(${id},${at}) p`)).rows[0].p);
assert.equal(await chance(0),.55);assert.equal(await chance(1),.35);assert.equal(await chance(2),.5);assert.equal(await chance(0,"now()+interval '1 hour'"),.5);assert.equal(await chance(0,"now()+interval '25 hours'"),.5);
r=await trade('list');assert.equal(r.investment.news.length,2);assert.ok(r.investment.news.every(n=>!('boost' in n)&&!('catalog' in n)&&Date.parse(n.publishedAt)<=Date.parse(r.investment.serverNow)));
assert.equal((await db.query("select count(*) n from rebirth_private.coin_news_catalog where kind='good'")).rows[0].n,100);assert.equal((await db.query("select count(*) n from rebirth_private.coin_news_catalog where kind='bad'")).rows[0].n,100);
assert.equal((await db.query("select has_function_privilege('authenticated','rebirth_private.coin_up_chance(integer,timestamptz)','execute') p")).rows[0].p,false);
// The reset refunds each investor once, even when rerun.
await db.exec(`insert into rebirth_private.coin_positions(user_id,coin,side,amount,entry) values('${u}',0,'long',1000,1000),('${other}',1,'short',2000,1000);insert into rebirth_private.players values('${other}','{"gold":5000}',0,now());`);
const balances=(await db.query("select id,(state->>'gold')::numeric gold from rebirth_private.players order by id")).rows;
const refunds=(await db.query("select user_id,sum(amount) total from rebirth_private.coin_positions where status='open' group by user_id")).rows;
await db.exec(fs.readFileSync(new URL('./investment-reset.sql',import.meta.url),'utf8'));
for(const b of balances){const total=Number(refunds.find(x=>x.user_id===b.id)?.total||0);assert.equal(Number((await db.query("select (state->>'gold')::numeric gold from rebirth_private.players where id=$1",[b.id])).rows[0].gold),Number(b.gold)+total);}
assert.equal((await db.query("select count(*) n from rebirth_private.coin_positions where status='open'")).rows[0].n,0);
for(const c of (await db.query('select * from rebirth_private.coin_market')).rows){assert.equal(Number(c.price),10000);assert.equal(Number(c.day_base),10000);}
assert.equal((await db.query('select count(*) n from rebirth_private.coin_candles')).rows[0].n,0);
const after=(await db.query('select state from rebirth_private.players order by id')).rows;await db.exec(fs.readFileSync(new URL('./investment-reset.sql',import.meta.url),'utf8'));assert.deepEqual((await db.query('select state from rebirth_private.players order by id')).rows,after);
console.log('PASS: buy/sell settlement, short rejection, 1% fee, idempotency, ownership, insufficient gold, stale quote, 72-hour limits, daily 2–4 news, private schedules, relative probability weighting and exact 24-hour expiry');await db.close();
