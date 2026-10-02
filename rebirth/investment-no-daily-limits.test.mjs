import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {investmentView} from './investment-ui.mjs';
const db=new PGlite(),u='11111111-1111-4111-8111-111111111111';
await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,raw_app_meta_data jsonb);insert into auth.users values('${u}','{"ringu_admin":true}');create schema rebirth_private;create table rebirth_private.players(id uuid primary key,state jsonb,revision bigint default 0,updated_at timestamptz);create table rebirth_private.receipts(user_id uuid,request_id uuid,fingerprint jsonb,result jsonb,primary key(user_id,request_id));create function rebirth_private.session_user() returns uuid language sql as $$select '${u}'::uuid$$;`);
for(const file of ['investment.sql','investment-news.sql','admin-coin-direction.sql','investment-leverage.sql','investment-leverage-fees.sql'])await db.exec(fs.readFileSync(new URL(file,import.meta.url),'utf8').split('select cron.schedule')[0]);
await db.exec("select set_config('test.coin_now','2026-10-04 03:00:00+00',false);create or replace function rebirth_private.coin_news_schedule(p_day date,p_from integer default 0) returns void language plpgsql as $$begin return;end$$;delete from rebirth_private.coin_news;insert into rebirth_private.coin_news_days values('2026-10-04') on conflict do nothing;update rebirth_private.coin_market set price=case when id%2=0 then 1300 else 700 end,day_base=1000,day_key='2026-10-04',tick_at='2026-10-04 03:00:00+00';");
const before=(await db.query('select * from rebirth_private.coin_market order by id')).rows;
const patch=fs.readFileSync(new URL('investment-no-daily-limits.sql',import.meta.url),'utf8').replaceAll('clock_timestamp()',"current_setting('test.coin_now')::timestamptz");
await db.exec(patch);await db.exec(fs.readFileSync(new URL('investment-volatility-10-news-20.sql',import.meta.url),'utf8').replaceAll('clock_timestamp()',"current_setting('test.coin_now')::timestamptz"));assert.deepEqual((await db.query('select * from rebirth_private.coin_market order by id')).rows,before);
for(let coin=0;coin<8;coin++)await db.query('select rebirth_private.admin_coin_direction($1,$2)',[coin,coin%2===0?'long':'short']);
await db.exec("select set_config('test.coin_now','2026-10-04 03:30:00+00',false);select rebirth_private.coin_tick();");
const regular=(await db.query('select * from rebirth_private.coin_market order by id')).rows;
for(const c of regular){const initial=c.id%2===0?1300:700;assert.ok(c.id%2===0?Number(c.price)>1300:Number(c.price)<700);assert.ok(Math.abs(Number(c.price)/initial-1)<=.100001);assert.equal(Number(c.day_base),1000);}
assert.equal((await db.query('select count(*) n from rebirth_private.coin_next_direction')).rows[0].n,0);
// News must continue beyond both former limits and remain one-shot.
await db.exec("insert into rebirth_private.coin_news(day,coin,catalog,published_at,expires_at,boost) select '2026-10-04',id,case when id%2=0 then 1 else 101 end,timestamptz '2026-10-04 03:40:00+00'+id*interval '1 second',timestamptz '2026-10-04 11:40:00+00'+id*interval '1 second',.1 from rebirth_private.coin_market;select set_config('test.coin_now','2026-10-04 03:40:10+00',false);select rebirth_private.coin_tick();");
const news=(await db.query('select * from rebirth_private.coin_market order by id')).rows;
for(const c of news){const change=Number(c.price)/Number(regular[c.id].price)-1;assert.ok(c.id%2===0?change>0:change<0);assert.ok(Math.abs(change)>=.049&&Math.abs(change)<=.201);}
await db.exec('select rebirth_private.coin_tick();');assert.deepEqual((await db.query('select * from rebirth_private.coin_market order by id')).rows,news);
// The same no-cap tick must retain leveraged liquidation.
await db.exec(`insert into rebirth_private.coin_positions(user_id,coin,side,amount,entry,quantity,leverage) values('${u}',0,'short',1000,1000,3,3),('${u}',1,'long',1000,1100,3,3);select rebirth_private.coin_tick();`);
assert.equal((await db.query("select count(*) n from rebirth_private.coin_positions where status='liquidated' and payout=0 and fee=0")).rows[0].n,2);
await db.exec("update rebirth_private.coin_market set price=1 where id=1;insert into rebirth_private.coin_news(day,coin,catalog,published_at,expires_at,boost) values('2026-10-04',1,101,'2026-10-04 03:41:00+00','2026-10-04 11:41:00+00',.1);select set_config('test.coin_now','2026-10-04 03:41:00+00',false);select rebirth_private.coin_tick();");
assert.equal(Number((await db.query('select price from rebirth_private.coin_market where id=1')).rows[0].price),1);
const html=investmentView({}, {coins:news.map(c=>({id:c.id,name:c.name,price:Number(c.price),dayBase:1000,candles:[]})),positions:[]});assert.ok(html.includes('일일 등락 제한 없음'));assert.ok(!/상한가|하한가|±30%|00시 해제/.test(html));
await db.close();console.log('PASS: unchanged existing market, eight normal/news moves beyond old caps, one-shot events, preserved liquidation, 1G floor and uncapped UI.');
