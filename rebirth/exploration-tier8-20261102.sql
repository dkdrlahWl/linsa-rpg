-- 2026-11-02 도현: 링구의 탐험 8단계(220제 보장) 허용 · 열쇠 5개(7단계는 추후 4개) · 이전 단계 = 6단계
create or replace function rebirth_private.exploration_key_cost(t integer) returns integer language sql immutable set search_path to ''
as $function$select case when t=5 then 2 when t=6 then 3 when t=7 then 4 when t=8 then 5 else 1 end$function$;
DO $migration$
DECLARE src text; n int;
BEGIN
 src:=pg_get_functiondef('public.rebirth_coop_action(jsonb)'::regprocedure);
 n:=(length(src)-length(replace(src,'tier not in (0,1,2,4,5,6)','')))/length('tier not in (0,1,2,4,5,6)'); IF n<>1 THEN RAISE EXCEPTION 'DRIFT_A %',n; END IF;
 n:=(length(src)-length(replace(src,'tier in (1,2,4,5,6) and not','')))/length('tier in (1,2,4,5,6) and not'); IF n<>2 THEN RAISE EXCEPTION 'DRIFT_B %',n; END IF;
 n:=(length(src)-length(replace(src,'case when tier=4 then 2 else tier-1 end','')))/length('case when tier=4 then 2 else tier-1 end'); IF n<>2 THEN RAISE EXCEPTION 'DRIFT_C %',n; END IF;
 n:=(length(src)-length(replace(src,'not in (0,1,2,3,4,5,6)','')))/length('not in (0,1,2,3,4,5,6)'); IF n<>1 THEN RAISE EXCEPTION 'DRIFT_D %',n; END IF;
 src:=replace(src,'tier not in (0,1,2,4,5,6)','tier not in (0,1,2,4,5,6,8)');
 src:=replace(src,'tier in (1,2,4,5,6) and not','tier in (1,2,4,5,6,8) and not');
 src:=replace(src,'case when tier=4 then 2 else tier-1 end','case when tier=4 then 2 when tier=8 then 6 else tier-1 end');
 src:=replace(src,'not in (0,1,2,3,4,5,6)','not in (0,1,2,3,4,5,6,8)');
 EXECUTE src;
END;
$migration$;
