-- 2026-11-04 도현: 링탐 열쇠 9단계 5→6개, 10단계 5→7개
create or replace function rebirth_private.exploration_key_cost(t integer) returns integer
language sql immutable set search_path to '' as $function$select case when t=5 then 2 when t=6 then 3 when t=7 then 4 when t=8 then 5 when t=9 then 6 when t=10 then 7 else 1 end$function$;
