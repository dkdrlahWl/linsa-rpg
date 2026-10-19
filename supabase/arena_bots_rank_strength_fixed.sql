-- 2026-10-19: 봇 강함을 요일과 무관하게 순위 기준으로 고정(시즌 내내 일요일 수준 분포).
-- 월요일 상위 봇이 약해서 초반에 점수를 쌓고 방치하는 문제 방지. 플레이어 점수는 건드리지 않는다.
CREATE OR REPLACE FUNCTION rebirth_private.arena_halfhour_bot_order(p_bucket bigint)
 RETURNS TABLE(id integer, score integer, bot_rank integer)
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
 with season as (
  select floor(extract(epoch from (date_trunc('week',to_timestamp(p_bucket*1800) at time zone 'Asia/Seoul') at time zone 'Asia/Seoul'))/1800)::bigint as start_bucket
 ), daily as (
  select start_bucket,start_bucket+((p_bucket-start_bucket)/48)*48 as daily_bucket from season
 ), scored as (
  select i as id,case when i<=120 then
   2000+(rebirth_private.arena_random(s.start_bucket,i,1)%1001)::integer
   +700
   +(rebirth_private.arena_random(s.daily_bucket,i,2)%161)::integer-80
  else greatest(0,least(1949+700,floor((2000-i)*(1949+700)/1879)::integer+(rebirth_private.arena_random(s.daily_bucket,i,3)%41)::integer-20)) end as score
  from generate_series(1,2000) i cross join daily s
 )
 select id,score,row_number() over(order by score desc,'bot:'||id)::integer from scored
$function$;
select rebirth_private.arena_refresh_daily_bots();
