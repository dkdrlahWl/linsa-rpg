-- Hourly shared game market. No real-money assets or external prices.
create table if not exists rebirth_private.coin_market(id integer primary key check(id between 0 and 7), name text not null, price numeric not null check(price>0), day_base numeric not null, day_key date not null, tick_at timestamptz not null, trend numeric not null default 0);
create table if not exists rebirth_private.coin_candles(coin integer not null references rebirth_private.coin_market(id), at timestamptz not null, open numeric not null, close numeric not null, primary key(coin,at));
create table if not exists rebirth_private.coin_positions(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,coin integer not null references rebirth_private.coin_market(id),side text not null check(side in ('long','short')),amount numeric not null check(amount>0),entry numeric not null check(entry>0),opened_at timestamptz not null default now(),closed_at timestamptz,status text not null default 'open' check(status in ('open','sold','liquidated')),payout numeric,fee numeric);
create index if not exists coin_owner_open on rebirth_private.coin_positions(user_id,status);
create index if not exists coin_open on rebirth_private.coin_positions(coin) where status='open';
alter table rebirth_private.coin_market enable row level security;
alter table rebirth_private.coin_candles enable row level security;
alter table rebirth_private.coin_positions enable row level security;
revoke all on rebirth_private.coin_market,rebirth_private.coin_candles,rebirth_private.coin_positions from public,anon,authenticated;
insert into rebirth_private.coin_market(id,name,price,day_base,day_key,tick_at)
select i,n,1000,1000,(now() at time zone 'Asia/Seoul')::date,date_trunc('hour',now()) from unnest(array['도현코인','링구코인','원재코인','민정코인','지원코인','민지코인','성민코인','예찬코인']) with ordinality as a(n,k) cross join lateral (select (k-1)::integer i) q on conflict do nothing;
create or replace function rebirth_private.coin_tick() returns void language plpgsql security definer set search_path='' as $$
<<tick>>
declare c rebirth_private.coin_market%rowtype; t timestamptz; target timestamptz:=date_trunc('hour',clock_timestamp()); d date; change numeric; old numeric; base numeric; next_price numeric; trend numeric;
begin
 perform pg_advisory_xact_lock(71823081);
 for c in select * from rebirth_private.coin_market order by id for update loop
  t:=c.tick_at;old:=c.price;base:=c.day_base;d:=c.day_key;trend:=c.trend;
  while t<target loop
   t:=t+interval '1 hour';
   if d<>(t at time zone 'Asia/Seoul')::date then
    d:=(t at time zone 'Asia/Seoul')::date;base:=old;trend:=0;next_price:=old;
   elsif old>=floor(base*1.3) or old<=ceil(base*.7) then
    next_price:=old;
   else
   trend:=trend*.65+(random()-.5)*.008;
   change:=greatest(-.05,least(.05,trend+(random()+random()-1)*.03));
   next_price:=greatest(1,ceil(base*.7),ceil(old*.95),least(floor(base*1.3),floor(old*1.05),round(old*(1+change))));
   end if;
   insert into rebirth_private.coin_candles values(c.id,t,old,next_price) on conflict do nothing;
   update rebirth_private.coin_positions set status='liquidated',closed_at=t,payout=0,fee=0 where coin=c.id and status='open' and side='short' and next_price>=entry*2;
   old:=next_price;
  end loop;
  update rebirth_private.coin_market set price=old,day_base=base,day_key=d,tick_at=t,trend=tick.trend where id=c.id;
 end loop;
 delete from rebirth_private.coin_candles where at<target-interval '30 days';
end $$;
revoke all on function rebirth_private.coin_tick() from public,anon,authenticated;
grant execute on function rebirth_private.coin_tick() to service_role;
create or replace function rebirth_private.investment(p_action text,p_args jsonb,p_request uuid) returns jsonb language plpgsql security definer set search_path='' as $$
<<trade>>
declare u uuid; p rebirth_private.players%rowtype; receipt rebirth_private.receipts%rowtype; fp jsonb:=jsonb_build_object('investment',p_action,'args',p_args); c rebirth_private.coin_market%rowtype; pos rebirth_private.coin_positions%rowtype; amount numeric; gross numeric; fee numeric; payout numeric; result jsonb:='{"events":[]}'::jsonb; market jsonb; positions jsonb; history jsonb; v_now timestamptz;
begin
 if p_action not in ('list','buy','sell') or p_request is null then raise exception 'INVALID_INVESTMENT_ACTION';end if;
 perform pg_advisory_xact_lock(71823081);
 u:=rebirth_private.session_user();
 perform rebirth_private.coin_tick();
 v_now:=clock_timestamp();
 select * into p from rebirth_private.players where id=u for update;
 if p.state is null then raise exception 'CHARACTER_REQUIRED';end if;
 if p_action<>'list' then
  select * into receipt from rebirth_private.receipts where user_id=u and request_id=p_request;
  if found then
   if receipt.fingerprint<>fp then raise exception 'REQUEST_ID_REUSED';end if;result:=receipt.result;
  else
   if p.state->'battle' is not null and p.state->'battle'<>'null'::jsonb or nullif(p.state->>'coopRoom','') is not null or nullif(p.state->>'partyRoom','') is not null then raise exception 'BATTLE_IN_PROGRESS';end if;
   if p_action='buy' then
    if coalesce(p_args->>'coin','')!~'^[0-7]$' or coalesce(p_args->>'side','') not in ('long','short') or coalesce(p_args->>'quantity','')!~'^[0-9]+$' then raise exception 'INVALID_INVESTMENT_ORDER';end if;
    select * into c from rebirth_private.coin_market where id=(p_args->>'coin')::integer;
    if c.id is null or p_args->>'tickAt' is null or (p_args->>'tickAt')::timestamptz<>c.tick_at then raise exception 'INVALID_INVESTMENT_PRICE_CHANGED';end if;
    amount:=(p_args->>'quantity')::numeric*c.price;
    if (p_args->>'quantity')::numeric<1 or amount>9007199254740991 or amount>coalesce((p.state->>'gold')::numeric,0) then raise exception 'INSUFFICIENT_GOLD';end if;
    insert into rebirth_private.coin_positions(user_id,coin,side,amount,entry) values(u,c.id,p_args->>'side',amount,c.price) returning * into pos;
    update rebirth_private.players set state=jsonb_set(state,'{gold}',to_jsonb((state->>'gold')::numeric-amount)),revision=revision+1,updated_at=now() where id=u returning * into p;
    result:=jsonb_build_object('events',jsonb_build_array(jsonb_build_object('type','investBuy','amount',amount)));
   else
    select * into pos from rebirth_private.coin_positions where id=(p_args->>'position')::uuid and user_id=u for update;
    if not found or pos.status<>'open' then raise exception 'INVALID_INVESTMENT_POSITION';end if;
    select * into c from rebirth_private.coin_market where id=pos.coin;
    if p_args->>'tickAt' is null or (p_args->>'tickAt')::timestamptz<>c.tick_at then raise exception 'INVALID_INVESTMENT_PRICE_CHANGED';end if;
    gross:=greatest(0,pos.amount*(1+case when pos.side='long' then 1 else -1 end*(c.price/pos.entry-1)));
    fee:=ceil(gross*.01);payout:=greatest(0,floor(gross-fee));
    if coalesce((p.state->>'gold')::numeric,0)+payout>9007199254740991 then raise exception 'INVALID_INVESTMENT_GOLD_RANGE';end if;
    update rebirth_private.coin_positions set status='sold',closed_at=v_now,payout=trade.payout,fee=trade.fee where id=pos.id;
    update rebirth_private.players set state=jsonb_set(state,'{gold}',to_jsonb((state->>'gold')::numeric+payout)),revision=revision+1,updated_at=now() where id=u returning * into p;
    result:=jsonb_build_object('events',jsonb_build_array(jsonb_build_object('type','investSell','amount',payout,'fee',fee)));
   end if;
   insert into rebirth_private.receipts(user_id,request_id,fingerprint,result) values(u,p_request,fp,result);
  end if;
 end if;
 select jsonb_agg(jsonb_build_object('id',m.id,'name',m.name,'price',m.price,'dayBase',m.day_base,'tickAt',m.tick_at,'candles',coalesce((select jsonb_agg(q order by q.at) from (select at,open,close from rebirth_private.coin_candles where coin=m.id order by at desc limit 48) q),'[]'::jsonb)) order by m.id) into market from rebirth_private.coin_market m;
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'coin',coin,'side',side,'quantity',h.amount/h.entry,'amount',h.amount,'entry',h.entry,'openedAt',h.opened_at) order by h.opened_at desc),'[]'::jsonb) into positions from rebirth_private.coin_positions h where h.user_id=u and h.status='open';
 select coalesce(jsonb_agg(q order by q."closedAt" desc),'[]'::jsonb) into history from (select h.coin,h.side,h.amount,h.payout,h.fee,h.status,h.closed_at as "closedAt" from rebirth_private.coin_positions h where h.user_id=u and h.status<>'open' order by h.closed_at desc limit 20) q;
 return jsonb_build_object('state',p.state,'revision',p.revision,'investment',jsonb_build_object('coins',market,'positions',positions,'history',history,'serverNow',v_now,'nextAt',date_trunc('hour',v_now)+interval '1 hour'),'result',result);
end $$;
revoke all on function rebirth_private.investment(text,jsonb,uuid) from public,anon;
grant execute on function rebirth_private.investment(text,jsonb,uuid) to authenticated;
create or replace function public.rebirth_investment(p_action text,p_args jsonb,p_request uuid) returns jsonb language sql security invoker set search_path='' as $$select rebirth_private.investment(p_action,p_args,p_request)$$;
revoke all on function public.rebirth_investment(text,jsonb,uuid) from public,anon;
grant execute on function public.rebirth_investment(text,jsonb,uuid) to authenticated;

select cron.schedule('ringu-hourly-coins','0 * * * *','select rebirth_private.coin_tick();');
