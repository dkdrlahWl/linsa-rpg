-- 2026-11-03 도현: 링구의 탐험 9·10단계 허용 · 열쇠 9단계 6개 · 10단계 7개 · 이전 단계: 9←8, 10←9
CREATE OR REPLACE FUNCTION rebirth_private.exploration_key_cost(t integer)
 RETURNS integer LANGUAGE sql IMMUTABLE SET search_path TO ''
AS $function$select case when t=5 then 2 when t=6 then 3 when t=7 then 4 when t=8 then 5 when t=9 then 6 when t=10 then 7 else 1 end$function$;
DO $migration$
DECLARE src text;
BEGIN
 src:=pg_get_functiondef('public.rebirth_coop_action(jsonb)'::regprocedure);
 IF strpos(src,'tier is null or tier not between 0 and 9 then')=0 OR strpos(src,'tier not in (0,1,2,4,5,6,7,8)')=0 OR (length(src)-length(replace(src,'tier in (1,2,4,5,6,7,8) and not','')))/length('tier in (1,2,4,5,6,7,8) and not')<>2 OR strpos(src,'not in (0,1,2,3,4,5,6,7,8)')=0 THEN RAISE EXCEPTION 'DRIFT'; END IF;
 src:=replace(src,'tier is null or tier not between 0 and 9 then','tier is null or tier not between 0 and 10 then');
 src:=replace(src,'tier not in (0,1,2,4,5,6,7,8)','tier not in (0,1,2,4,5,6,7,8,9,10)');
 src:=replace(src,'tier in (1,2,4,5,6,7,8) and not','tier in (1,2,4,5,6,7,8,9,10) and not');
 src:=replace(src,'not in (0,1,2,3,4,5,6,7,8)','not in (0,1,2,3,4,5,6,7,8,9,10)');
 EXECUTE src;
END;
$migration$;
