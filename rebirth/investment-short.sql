begin;
create or replace function rebirth_private.coin_tick() returns void language plpgsql security definer set search_path='' as $$
<<tick>>
declare c rebirth_private.coin_market%rowtype; ev record; t timestamptz; v_now timestamptz:=clock_timestamp(); target timestamptz:=date_bin(interval '30 minutes',v_now,timestamptz '2000-01-01 00:00:00+00'); d date; old numeric; base numeric; next_price numeric; trend numeric; change numeric; schedule_day date;
begin
 perform pg_advisory_xact_lock(71823081);
 for schedule_day in select generate_series(greatest((select min(tick_at)::date from rebirth_private.coin_market),(select min(day) from rebirth_private.coin_news_days)),(target at time zone 'Asia/Seoul')::date,interval '1 day')::date loop
  perform rebirth_private.coin_news_schedule(schedule_day);
 end loop;
 for c in select * from rebirth_private.coin_market order by id for update loop
  t:=c.tick_at;old:=c.price;base:=c.day_base;d:=c.day_key;trend:=c.trend;
  for ev in select * from (
   select h as at,0 as kind_order,null::uuid as news_id,null::text as news_kind from generate_series(c.tick_at+interval '30 minutes',target,interval '30 minutes') h
   union all
   select n.published_at,1,n.id,cat.kind from rebirth_private.coin_news n join rebirth_private.coin_news_catalog cat on cat.id=n.catalog where n.coin=c.id and n.applied_at is null and n.published_at<=v_now
  ) events order by at,kind_order,news_id loop
   if d<>(ev.at at time zone 'Asia/Seoul')::date then d:=(ev.at at time zone 'Asia/Seoul')::date;base:=old;trend:=0;end if;
   next_price:=old;
    if ev.kind_order=1 then
     change:=(.05+random()*.15)*case when ev.news_kind='good' then 1 else -1 end;
     next_price:=greatest(1,round(old*(1+change)));
    elsif (ev.at at time zone 'Asia/Seoul')::time<>time '00:00' then
     trend:=trend*.65+(random()-.5)*.016;
     change:=abs(greatest(-.10,least(.10,trend+(random()+random()-1)*.09)))*case when random()<rebirth_private.coin_up_chance(c.id,ev.at) then 1 else -1 end;
     next_price:=greatest(1,ceil(old*.90),least(floor(old*1.10),round(old*(1+change))));
    end if;
   insert into rebirth_private.coin_candles(coin,at,open,close) values(c.id,date_bin(interval '30 minutes',ev.at,timestamptz '2000-01-01 00:00:00+00'),old,next_price) on conflict(coin,at) do update set close=excluded.close;
   if ev.kind_order=1 then update rebirth_private.coin_news set applied_at=v_now,instant_change=case when old>0 then next_price/old-1 else 0 end where id=ev.news_id;else t:=ev.at;end if;
   update rebirth_private.coin_positions set status='liquidated',closed_at=v_now,payout=0,fee=0,closed_reason='short_liquidation' where coin=c.id and side='short' and status='open' and next_price>=entry*2;
   old:=next_price;
  end loop;
  update rebirth_private.coin_positions set status='liquidated',closed_at=v_now,payout=0,fee=0,closed_reason='short_liquidation' where coin=c.id and side='short' and status='open' and old>=entry*2;
  update rebirth_private.coin_market set price=old,day_base=base,day_key=d,tick_at=t,trend=tick.trend where id=c.id;
 end loop;
 delete from rebirth_private.coin_candles where at<target-interval '30 days';
end $$;
create or replace function rebirth_private.investment(p_action text,p_args jsonb,p_request uuid) returns jsonb language plpgsql security definer set search_path='' as $$
<<trade>>
declare u uuid; p rebirth_private.players%rowtype; receipt rebirth_private.receipts%rowtype; fp jsonb:=jsonb_build_object('investment',p_action,'args',p_args); c rebirth_private.coin_market%rowtype; pos rebirth_private.coin_positions%rowtype; amount numeric; gross numeric; fee numeric; payout numeric; result jsonb:='{"events":[]}'::jsonb; market jsonb; positions jsonb; history jsonb; news jsonb; v_now timestamptz;
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
    if c.id is null or p_args->>'tickAt' is null or (p_args->>'tickAt')::timestamptz<>c.tick_at or p_args->>'price' is null or (p_args->>'price')::numeric<>c.price then raise exception 'INVALID_INVESTMENT_PRICE_CHANGED';end if;
    amount:=(p_args->>'quantity')::numeric*c.price;
    if (p_args->>'quantity')::numeric<1 or amount>9007199254740991 or amount>coalesce((p.state->>'gold')::numeric,0) then raise exception 'INSUFFICIENT_GOLD';end if;
    insert into rebirth_private.coin_positions as holding(user_id,coin,side,amount,entry,quantity)
    values(u,c.id,p_args->>'side',amount,c.price,(p_args->>'quantity')::numeric)
    on conflict(user_id,coin,side) where status='open' do update
    set amount=holding.amount+excluded.amount,quantity=holding.quantity+excluded.quantity,
        entry=(holding.amount+excluded.amount)/(holding.quantity+excluded.quantity)
    returning * into pos;
    update rebirth_private.players set state=jsonb_set(state,'{gold}',to_jsonb((state->>'gold')::numeric-amount)),revision=revision+1,updated_at=now() where id=u returning * into p;
    result:=jsonb_build_object('events',jsonb_build_array(jsonb_build_object('type','investBuy','amount',amount)));
   else
    select * into pos from rebirth_private.coin_positions where id=(p_args->>'position')::uuid and user_id=u for update;
    if not found or pos.status<>'open' then raise exception 'INVALID_INVESTMENT_POSITION';end if;
    select * into c from rebirth_private.coin_market where id=pos.coin;
    if p_args->>'tickAt' is null or (p_args->>'tickAt')::timestamptz<>c.tick_at or p_args->>'price' is null or (p_args->>'price')::numeric<>c.price then raise exception 'INVALID_INVESTMENT_PRICE_CHANGED';end if;
    gross:=greatest(0,case when pos.side='short' then 2*pos.amount-pos.quantity*c.price else pos.quantity*c.price end);
    fee:=ceil(gross*.01);payout:=greatest(0,floor(gross-fee));
    if coalesce((p.state->>'gold')::numeric,0)+payout>9007199254740991 then raise exception 'INVALID_INVESTMENT_GOLD_RANGE';end if;
    update rebirth_private.coin_positions set status='sold',closed_at=v_now,payout=trade.payout,fee=trade.fee where id=pos.id;
    update rebirth_private.players set state=jsonb_set(state,'{gold}',to_jsonb((state->>'gold')::numeric+payout)),revision=revision+1,updated_at=now() where id=u returning * into p;
    result:=jsonb_build_object('events',jsonb_build_array(jsonb_build_object('type','investSell','amount',payout,'fee',fee)));
   end if;
   insert into rebirth_private.receipts(user_id,request_id,fingerprint,result) values(u,p_request,fp,result);
  end if;
 end if;
 select jsonb_agg(jsonb_build_object('id',m.id,'name',m.name,'price',m.price,'dayBase',m.day_base,'tickAt',m.tick_at,'candles',coalesce((select jsonb_agg(q order by q.at) from (select at,open,close from rebirth_private.coin_candles where coin=m.id order by at desc limit 1440) q),'[]'::jsonb)) order by m.id) into market from rebirth_private.coin_market m;
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'coin',coin,'side',side,'quantity',h.quantity,'amount',h.amount,'entry',h.entry,'openedAt',h.opened_at) order by h.opened_at desc),'[]'::jsonb) into positions from rebirth_private.coin_positions h where h.user_id=u and h.status='open';
 select coalesce(jsonb_agg(q order by q."closedAt" desc),'[]'::jsonb) into history from (select h.coin,h.side,h.amount,h.payout,h.fee,h.status,h.closed_reason as reason,h.closed_at as "closedAt" from rebirth_private.coin_positions h where h.user_id=u and h.status<>'open' order by h.closed_at desc limit 20) q;
 select coalesce(jsonb_agg(q order by q."publishedAt" desc),'[]'::jsonb) into news from (
  select n.id,n.coin,nc.kind,nc.headline,n.published_at as "publishedAt",n.expires_at as "expiresAt"
  from rebirth_private.coin_news n join rebirth_private.coin_news_catalog nc on nc.id=n.catalog
  where n.published_at<=v_now and n.published_at>=v_now-interval '7 days' order by n.published_at desc limit 28
 ) q;
 return jsonb_build_object('state',p.state,'revision',p.revision,'investment',jsonb_build_object('coins',market,'positions',positions,'history',history,'news',news,'serverNow',v_now,'nextAt',date_bin(interval '30 minutes',v_now,timestamptz '2000-01-01 00:00:00+00')+interval '30 minutes'),'result',result);
end $$;
-- Cursor paging preserves older news and private realized trade history.
create or replace function rebirth_private.coin_activity(p_kind text,p_before timestamptz default null,p_before_id uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid; v_now timestamptz:=clock_timestamp(); items jsonb; totals jsonb;
begin
 u:=rebirth_private.session_user();
 if p_kind='news' then
  perform rebirth_private.coin_tick();
  select coalesce(jsonb_agg(q order by q."publishedAt" desc,q.id desc),'[]'::jsonb) into items from (
   select n.id,n.coin,c.kind,c.headline,n.published_at as "publishedAt",n.expires_at as "expiresAt"
   from rebirth_private.coin_news n join rebirth_private.coin_news_catalog c on c.id=n.catalog
   where n.published_at<=v_now and (p_before is null or (n.published_at,n.id)<(p_before,coalesce(p_before_id,'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)))
   order by n.published_at desc,n.id desc limit 15
  ) q;
 elsif p_kind='trades' then
  select jsonb_build_object('profit',coalesce(sum(greatest(coalesce(h.payout,0)-h.amount,0)),0),'loss',coalesce(sum(greatest(h.amount-coalesce(h.payout,0),0)),0),'pnl',coalesce(sum(coalesce(h.payout,0)-h.amount),0)) into totals from rebirth_private.coin_positions h where h.user_id=u and h.status<>'open';
  select coalesce(jsonb_agg(q order by q."closedAt" desc,q.id desc),'[]'::jsonb) into items from (
   select h.id,h.coin,h.side,h.amount,h.entry,h.payout,h.fee,h.status,h.closed_reason as reason,h.closed_at as "closedAt"
   from rebirth_private.coin_positions h where h.user_id=u and h.status<>'open' and (p_before is null or (h.closed_at,h.id)<(p_before,coalesce(p_before_id,'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)))
   order by h.closed_at desc,h.id desc limit 15
  ) q;
 else raise exception 'INVALID_COIN_ACTIVITY';end if;
 return jsonb_build_object('items',items,'serverNow',v_now,'totals',totals);
end $$;

commit;
