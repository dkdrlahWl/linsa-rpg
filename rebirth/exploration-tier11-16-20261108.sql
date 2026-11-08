-- 2026-11-08 도현: 링구의 탐험 11~13단계(250제)·14~16단계(300제) 허용 · 열쇠 11~16단계 8~13개 · 이전 단계: n←n-1
CREATE OR REPLACE FUNCTION rebirth_private.exploration_key_cost(t integer)
 RETURNS integer LANGUAGE sql IMMUTABLE SET search_path TO ''
AS $function$select case when t=5 then 2 when t=6 then 3 when t=7 then 4 when t=8 then 5 when t=9 then 6 when t=10 then 7 when t=11 then 8 when t=12 then 9 when t=13 then 10 when t=14 then 11 when t=15 then 12 when t=16 then 13 else 1 end$function$;
DO $migration$
DECLARE src text;
BEGIN
 src:=pg_get_functiondef('public.rebirth_coop_action(jsonb)'::regprocedure);
 IF strpos(src,'tier is null or tier not between 0 and 10 then')=0 OR strpos(src,'tier not in (0,1,2,4,5,6,7,8,9,10)')=0 OR (length(src)-length(replace(src,'tier in (1,2,4,5,6,7,8,9,10) and not','')))/length('tier in (1,2,4,5,6,7,8,9,10) and not')<>2 OR strpos(src,'not in (0,1,2,3,4,5,6,7,8,9,10)')=0 THEN RAISE EXCEPTION 'DRIFT'; END IF;
 src:=replace(src,'tier is null or tier not between 0 and 10 then','tier is null or tier not between 0 and 16 then');
 src:=replace(src,'tier not in (0,1,2,4,5,6,7,8,9,10)','tier not in (0,1,2,4,5,6,7,8,9,10,11,12,13,14,15,16)');
 src:=replace(src,'tier in (1,2,4,5,6,7,8,9,10) and not','tier in (1,2,4,5,6,7,8,9,10,11,12,13,14,15,16) and not');
 src:=replace(src,'not in (0,1,2,3,4,5,6,7,8,9,10)','not in (0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16)');
 EXECUTE src;
END;
$migration$;
