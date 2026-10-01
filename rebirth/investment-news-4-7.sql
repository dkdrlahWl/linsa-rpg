begin;
create or replace function rebirth_private.coin_news_schedule(p_day date,p_from integer default 0) returns void language plpgsql security definer set search_path='' as $$
declare n integer; minute integer; article integer; at_time timestamptz; first_minute integer; span integer; slot integer; lo integer; hi integer; margin integer;
begin
 perform pg_advisory_xact_lock(71823081);
 insert into rebirth_private.coin_news_days values(p_day) on conflict do nothing;
 if not found then return;end if;
 n:=4+floor(random()*4)::integer;first_minute:=greatest(0,least(1430,p_from));span:=1440-first_minute;
 for slot in 0..n-1 loop
  lo:=first_minute+floor(slot*span::numeric/n)::integer;hi:=first_minute+floor((slot+1)*span::numeric/n)::integer-1;
  margin:=least(60,greatest(0,(hi-lo)/2));lo:=lo+margin;hi:=hi-margin;
  minute:=lo+floor(random()*(hi-lo+1))::integer;
  at_time:=(p_day::timestamp at time zone 'Asia/Seoul')+minute*interval '1 minute';article:=1+floor(random()*200)::integer;
  insert into rebirth_private.coin_news(day,coin,catalog,published_at,expires_at,boost)
  values(p_day,floor(random()*8)::integer,article,at_time,at_time+interval '8 hours',(.10+floor(random()*21)*.01));
 end loop;
end $$;

do $$
declare d date:=(clock_timestamp() at time zone 'Asia/Seoul')::date; v_now timestamptz:=clock_timestamp(); done integer; target integer; remaining integer; start_min integer; minute integer; at_time timestamptz; article integer;
begin
 select count(*) into done from rebirth_private.coin_news where day=d and published_at<=v_now;
 target:=greatest(done,4+floor(random()*4)::integer);
 delete from rebirth_private.coin_news where day=d and published_at>v_now and applied_at is null;
 insert into rebirth_private.coin_news_days values(d) on conflict do nothing;
 remaining:=target-done;start_min:=extract(hour from v_now at time zone 'Asia/Seoul')::integer*60+extract(minute from v_now at time zone 'Asia/Seoul')::integer+1;
 if remaining>0 and start_min+remaining<1440 then
  for slot in 0..remaining-1 loop
   minute:=start_min+floor((slot+.25+random()*.5)*(1440-start_min)/remaining)::integer;
   at_time:=(d::timestamp at time zone 'Asia/Seoul')+minute*interval '1 minute';article:=1+floor(random()*200)::integer;
   insert into rebirth_private.coin_news(day,coin,catalog,published_at,expires_at,boost) values(d,floor(random()*8)::integer,article,at_time,at_time+interval '8 hours',(.10+floor(random()*21)*.01));
  end loop;
 end if;
end $$;
commit;
