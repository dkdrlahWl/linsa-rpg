const {PGlite}=await import(process.env.PGLITE_MODULE||'@electric-sql/pglite');
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {investmentView,positionValue,positionFee,positionPayout,positionLiquidation,setInvestmentLeverage,investmentMargin,resetInvestment} from './investment-ui.mjs';
const db=new PGlite();
const u='11111111-1111-4111-8111-111111111111';
await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,raw_app_meta_data jsonb);insert into auth.users values('${u}','{}');create schema rebirth_private;create table rebirth_private.players(id uuid primary key,state jsonb,revision bigint default 0,updated_at timestamptz);create table rebirth_private.receipts(user_id uuid,request_id uuid,fingerprint jsonb,result jsonb,primary key(user_id,request_id));create function rebirth_private.session_user() returns uuid language sql as $$select '${u}'::uuid$$;insert into rebirth_private.players values('${u}','{"gold":1000000,"battle":null}',0,now());`);
for(const file of ['investment.sql','investment-news.sql','investment-notifications.sql','investment-activity.sql'])await db.exec(fs.readFileSync(new URL(file,import.meta.url),'utf8').split('select cron.schedule')[0]);
await db.exec("update rebirth_private.coin_market set price=1000,day_base=1000; create or replace function rebirth_private.coin_news_schedule(p_day date,p_from integer default 0) returns void language plpgsql as $$begin return;end$$;");
async function trade(action,args={},request=crypto.randomUUID()){
 if(action!=='list'){
  const coin=action==='buy'?Number(args.coin):(await db.query('select coin from rebirth_private.coin_positions where id=$1',[args.position])).rows[0]?.coin;
  const c=(await db.query('select price,tick_at from rebirth_private.coin_market where id=$1',[coin])).rows[0];
  args={price:Number(c?.price),tickAt:c?.tick_at,...args};
 }
 return (await db.query('select rebirth_private.investment($1,$2::jsonb,$3::uuid) r',[action,JSON.stringify(args),request])).rows[0].r;
}
await trade('buy',{coin:0,side:'long',quantity:5});
const original=(await db.query('select * from rebirth_private.coin_positions')).rows[0];
await db.exec(fs.readFileSync(new URL('investment-leverage.sql',import.meta.url),'utf8'));
await db.exec(fs.readFileSync(new URL('investment-leverage-fees.sql',import.meta.url),'utf8'));
const preserved=(await db.query('select * from rebirth_private.coin_positions where id=$1',[original.id])).rows[0];
assert.equal(preserved.leverage,1);assert.equal(preserved.amount,original.amount);assert.equal(preserved.entry,original.entry);
const actualTick=(await db.query("select pg_get_functiondef('rebirth_private.coin_tick()'::regprocedure) d")).rows[0].d;
await db.exec('create or replace function rebirth_private.coin_tick() returns void language plpgsql as $$begin return;end$$;');
// Same collateral produces 1x/2x/3x exposure and both directional PnLs.
for(const side of ['long','short'])for(const leverage of [1,2,3]){
 const coin=1;await db.exec('update rebirth_private.coin_market set price=1000 where id=1');
 const before=Number((await db.query('select state->>\'gold\' gold from rebirth_private.players')).rows[0].gold);
 const request=crypto.randomUUID(),args={coin,side,quantity:10*leverage,leverage};
 const r=await trade('buy',args,request),p=r.investment.positions.find(p=>p.coin===coin&&p.side===side&&p.leverage===leverage);
 assert.equal(p.amount,10000);assert.equal(r.state.gold,before-10000);
 const repeated=await trade('buy',args,request);assert.equal(repeated.state.gold,r.state.gold);assert.equal(repeated.investment.positions.find(x=>x.id===p.id).quantity,10*leverage);
 await db.exec(`update rebirth_private.coin_market set price=${side==='long'?1100:900} where id=1`);
 const sold=await trade('sell',{position:p.id});const gross=10000+1000*leverage;
 assert.equal(sold.result.events[0].fee,Math.ceil(gross*.01*leverage));
 assert.equal(sold.result.events[0].amount,gross-Math.ceil(gross*.01*leverage));
 assert.equal(positionPayout(p,{price:side==='long'?1100:900}),sold.result.events[0].amount);
}
// Same leverage averages; another leverage stays independent.
await db.exec('update rebirth_private.coin_market set price=1000 where id=2');
await trade('buy',{coin:2,side:'long',quantity:20,leverage:2});
await db.exec('update rebirth_private.coin_market set price=1200 where id=2');
let r=await trade('buy',{coin:2,side:'long',quantity:10,leverage:2});
let p=r.investment.positions.find(p=>p.coin===2&&p.leverage===2);assert.equal(p.quantity,30);assert.equal(p.amount,16000);assert.ok(Math.abs(p.entry-32000/30)<1e-9);
r=await trade('buy',{coin:2,side:'long',quantity:30,leverage:3});assert.equal(r.investment.positions.filter(p=>p.coin===2).length,2);
for(const leverage of [0,4,2.5,null,'bogus'])await assert.rejects(()=>trade('buy',{coin:2,side:'long',quantity:1,leverage}),/INVALID_INVESTMENT_LEVERAGE/);
// Restore real liquidation loop with fixed current prices and no pending news.
await db.exec(actualTick);await db.exec("update rebirth_private.coin_market set tick_at=date_bin(interval '30 minutes',now(),timestamptz '2000-01-01');delete from rebirth_private.coin_news;");
for(const side of ['long','short'])for(const leverage of [2,3]){
 const coin=side==='long'?3:4;await db.exec(`update rebirth_private.coin_market set price=1000,day_base=1000 where id=${coin}`);
 r=await trade('buy',{coin,side,quantity:3*leverage,leverage});p=r.investment.positions.find(p=>p.coin===coin&&p.side===side&&p.leverage===leverage);
 const threshold=side==='long'?1000-1000/leverage:1000+1000/leverage;
 await db.exec(`update rebirth_private.coin_market set price=${side==='long'?Math.ceil(threshold)+1:Math.floor(threshold)-1} where id=${coin}`);r=await trade('list');assert.ok(r.investment.positions.some(x=>x.id===p.id));
 await db.exec(`update rebirth_private.coin_market set price=${side==='long'?Math.floor(threshold):Math.ceil(threshold)} where id=${coin}`);r=await trade('list');assert.ok(!r.investment.positions.some(x=>x.id===p.id));
 const row=(await db.query('select status,payout,fee from rebirth_private.coin_positions where id=$1',[p.id])).rows[0];assert.equal(row.status,'liquidated');assert.equal(Number(row.payout),0);assert.equal(Number(row.fee),0);
}
for(const side of ['long','short'])for(const leverage of [1,2,3]){
 const p={amount:10000,entry:1000,quantity:10*leverage,side,leverage};assert.equal(positionValue(p,{price:side==='long'?1100:900}),10000+1000*leverage);assert.ok(positionLiquidation(p)>=0);
}
// Integer fee rounding, loss settlements, and legacy holdings without leverage.
for(const leverage of [1,2,3]){
 const p={amount:10000,entry:1000,quantity:10*leverage,side:'long',leverage},c={price:999.97};
 const gross=positionValue(p,c);
 assert.equal(positionFee(p,c),Math.ceil(gross*.01*leverage));
 assert.equal(positionPayout(p,c),Math.max(0,Math.floor(gross-Math.ceil(gross*.01*leverage))));
 assert.equal(positionFee(p,{price:0}),0);assert.equal(positionPayout(p,{price:0}),0);
}
assert.equal(positionFee({amount:10000,entry:1000,quantity:10,side:'long'},{price:1100}),110);
setInvestmentLeverage(3);assert.equal(investmentMargin(30,1000),10000);
const html=investmentView({gold:10000},null);assert.ok(html.includes('data-action="investLeverage" data-arg="2"'));assert.ok(html.includes('data-action="investLeverage" data-arg="3"'));assert.ok(html.includes('aria-pressed="true" class="selected">3배'));
assert.ok(html.includes('판매 수수료: 1배 1% · 2배 2% · 3배 3%'));assert.ok(html.includes('판매 수수료 3%'));
resetInvestment();assert.equal(investmentMargin(10,1000),10000);
await db.close();console.log('PASS: preserved 1x holdings, six directional settlements, request replay, leverage-specific averaging, four liquidation boundaries, invalid multipliers and UI buttons.');
