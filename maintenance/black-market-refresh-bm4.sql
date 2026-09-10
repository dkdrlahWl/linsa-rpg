-- BM4: add only the noon rotation. KST refreshes at 00:00, 12:00, 18:00.
-- Prices, probabilities, offers, purchase receipts and player balances are preserved.
set local lock_timeout='5s';
set local statement_timeout='15s';
select pg_advisory_xact_lock(70909,10);
do $guard$
begin
 if to_regprocedure('ringu_private.black_market_period(timestamptz)') is null then
  raise exception 'BM4_MARKET_NOT_INSTALLED';
 end if;
end $guard$;
create or replace function ringu_private.black_market_period(p_at timestamptz)
returns table(id text,starts_at timestamptz,ends_at timestamptz)
language sql immutable set search_path='' as $period$
 select to_char(k,'YYYY-MM-DD')||
  case when extract(hour from k)>=18 then '/18'
       when extract(hour from k)>=12 then '/12' else '/00' end,
  (date_trunc('day',k)+
   case when extract(hour from k)>=18 then interval '18 hours'
        when extract(hour from k)>=12 then interval '12 hours'
        else interval '0 hours' end) at time zone 'Asia/Seoul',
  (date_trunc('day',k)+
   case when extract(hour from k)>=18 then interval '24 hours'
        when extract(hour from k)>=12 then interval '18 hours'
        else interval '12 hours' end) at time zone 'Asia/Seoul'
 from (select p_at at time zone 'Asia/Seoul' k) t
$period$;
revoke all on function ringu_private.black_market_period(timestamptz) from public,anon,authenticated;
-- Existing midnight offers remain the SAME offers and purchased slots. Only their
-- next-refresh time moves from 18:00 to 12:00. Expired historical cycles are untouched.
with shortened as (
 select c.id,p.ends_at from ringu_private.black_market_cycles c
 cross join lateral ringu_private.black_market_period(c.starts_at) p
 where c.ends_at>clock_timestamp() and c.id=p.id and c.ends_at>p.ends_at
)
update ringu_private.black_market_cycles c set ends_at=s.ends_at
from shortened s where c.id=s.id;
