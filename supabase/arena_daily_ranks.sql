-- Daily AI standings: Seoul midnight (15:00 UTC), independent of human scores.
create or replace function rebirth_private.arena_daily_bot_order(p_day date)
returns table(id integer,score integer,bot_rank integer)
language sql immutable set search_path='' as $$
 with ordered as (
  select i as id,row_number() over(order by md5(p_day::text||':arena:'||i::text),i)::integer as r
  from generate_series(1,100) i
 )
 select id,case when r=1 then 3000
  when r<=10 then 2600+floor((10-r)*390.0/8)::integer
  else 2200+floor((100-r)*399.0/89)::integer end,r
 from ordered
$$;
revoke all on function rebirth_private.arena_daily_bot_order(date) from public,anon,authenticated;

create or replace function rebirth_private.arena_refresh_daily_bots()
returns integer language plpgsql security invoker set search_path='' as $$
declare changed integer;
begin
 perform pg_advisory_xact_lock(1042026,100);
 update rebirth_private.arena_bots b set score=d.score
 from rebirth_private.arena_daily_bot_order((now() at time zone 'Asia/Seoul')::date) d
 where b.id=d.id and b.score is distinct from d.score;
 get diagnostics changed=row_count;
 if changed>0 then
  -- Keep already-used opponents used; update pending snapshots to the day's strength.
  update rebirth_private.arena_players p set offers=(
   select coalesce(jsonb_agg(case when b.id is not null then o||jsonb_build_object('score',b.score,'name',b.name) else o end order by ord),'[]'::jsonb)
   from jsonb_array_elements(p.offers) with ordinality x(o,ord)
   left join rebirth_private.arena_bots b on o->>'id'='bot:'||b.id and b.id<=100
  ) where exists(select 1 from jsonb_array_elements(p.offers) o join rebirth_private.arena_bots b on o->>'id'='bot:'||b.id and b.id<=100);
 end if;
 return changed;
end $$;
revoke all on function rebirth_private.arena_refresh_daily_bots() from public,anon,authenticated;
select cron.schedule('ringu-arena-daily-ai','0 15 * * *','select rebirth_private.arena_refresh_daily_bots();');
select rebirth_private.arena_refresh_daily_bots();
