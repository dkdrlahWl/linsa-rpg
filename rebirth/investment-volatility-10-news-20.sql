-- Increase future 30-minute moves to +/-10% and news jumps to 5-20%.
begin;
select pg_advisory_xact_lock(71823081);
CREATE OR REPLACE FUNCTION rebirth_private.coin_tick()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
<<tick>>
declare c rebirth_private.coin_market%rowtype; ev record; t timestamptz; v_now timestamptz:=clock_timestamp(); target timestamptz:=date_bin(interval '30 minutes',v_now,timestamptz '2000-01-01 00:00:00+00'); d date; old numeric; base numeric; next_price numeric; trend numeric; change numeric; schedule_day date; forced_side text;
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
   forced_side:=null;
   if ev.kind_order=0 then delete from rebirth_private.coin_next_direction where coin=c.id and scheduled_at<=ev.at returning side into forced_side;end if;
   next_price:=old;
    if ev.kind_order=1 then
     change:=(.05+random()*.15)*case when ev.news_kind='good' then 1 else -1 end;
     next_price:=greatest(1,round(old*(1+change)));
    elsif forced_side is not null or (ev.at at time zone 'Asia/Seoul')::time<>time '00:00' then
     trend:=trend*.65+(random()-.5)*.016;
     change:=case when forced_side is not null then (.01+random()*.09)*case when forced_side='long' then 1 else -1 end else abs(greatest(-.10,least(.10,trend+(random()+random()-1)*.09)))*case when random()<rebirth_private.coin_up_chance(c.id,ev.at) then 1 else -1 end end;
     next_price:=greatest(1,ceil(old*.90),least(floor(old*1.10),round(old*(1+change))));
    end if;
   insert into rebirth_private.coin_candles(coin,at,open,close) values(c.id,date_bin(interval '30 minutes',ev.at,timestamptz '2000-01-01 00:00:00+00'),old,next_price) on conflict(coin,at) do update set close=excluded.close;
   if ev.kind_order=1 then update rebirth_private.coin_news set applied_at=v_now,instant_change=case when old>0 then next_price/old-1 else 0 end where id=ev.news_id;else t:=ev.at;end if;
   update rebirth_private.coin_positions set status='liquidated',closed_at=v_now,payout=0,fee=0,closed_reason=case when side='short' then 'short_liquidation' else 'long_liquidation' end where coin=c.id and status='open' and amount+quantity*(next_price-entry)*case when side='short' then -1 else 1 end<=0;
   old:=next_price;
  end loop;
  update rebirth_private.coin_positions set status='liquidated',closed_at=v_now,payout=0,fee=0,closed_reason=case when side='short' then 'short_liquidation' else 'long_liquidation' end where coin=c.id and status='open' and amount+quantity*(old-entry)*case when side='short' then -1 else 1 end<=0;
  update rebirth_private.coin_market set price=old,day_base=base,day_key=d,tick_at=t,trend=tick.trend where id=c.id;
 end loop;
 delete from rebirth_private.coin_candles where at<target-interval '30 days';
end $function$
;
commit;
