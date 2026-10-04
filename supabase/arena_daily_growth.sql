-- Growth and automated ranking changes happen once per Korea day.
create or replace function rebirth_private.arena_halfhour_bot_order(p_bucket bigint)
returns table(id integer,score integer,bot_rank integer)
language sql immutable set search_path='' as $$
 with season as (
  select floor(extract(epoch from (date_trunc('week',to_timestamp(p_bucket*1800) at time zone 'Asia/Seoul') at time zone 'Asia/Seoul'))/1800)::bigint as start_bucket
 ), daily as (
  select start_bucket,start_bucket+((p_bucket-start_bucket)/48)*48 as daily_bucket,((p_bucket-start_bucket)/48)::integer as season_day from season
 ), scored as (
  select i as id,case when i<=120 then
   2000+(rebirth_private.arena_random(s.start_bucket,i,1)%1001)::integer
   +floor(s.season_day*700.0/6)::integer
   +(rebirth_private.arena_random(s.daily_bucket,i,2)%161)::integer-80
  else greatest(0,least(1949+floor(s.season_day*700.0/6)::integer,floor((2000-i)*(1949+floor(s.season_day*700.0/6))/1879)::integer+(rebirth_private.arena_random(s.daily_bucket,i,3)%41)::integer-20)) end as score
  from generate_series(1,2000) i cross join daily s
 )
 select id,score,row_number() over(order by score desc,'bot:'||id)::integer from scored
$$;
revoke all on function rebirth_private.arena_halfhour_bot_order(bigint) from public,anon,authenticated;

-- Daily ladder refresh at Korea midnight (15:00 UTC); opponent offers still refresh every 30 minutes.
select cron.unschedule(jobid) from cron.job where jobname in ('ringu-arena-halfhour-ai','ringu-arena-daily-ai','ringu-arena-daily-ladder');
select cron.schedule('ringu-arena-daily-ladder','0 15 * * *','select rebirth_private.arena_refresh_daily_bots();');
select rebirth_private.arena_refresh_daily_bots();

