-- 2026-11-02 도현: 링구의 탐험 7단계(200제 보장) 허용 · 열쇠 4개(키 비용 함수에 이미 있음) · 이전 단계: 7←6, 8←7
DO $migration$
DECLARE src text;
BEGIN
 src:=pg_get_functiondef('public.rebirth_coop_action(jsonb)'::regprocedure);
 IF strpos(src,'tier not in (0,1,2,4,5,6,8)')=0 OR strpos(src,'tier in (1,2,4,5,6,8) and not')=0 OR strpos(src,'case when tier=4 then 2 when tier=8 then 6 else tier-1 end')=0 OR strpos(src,'not in (0,1,2,3,4,5,6,8)')=0 THEN RAISE EXCEPTION 'DRIFT'; END IF;
 src:=replace(src,'tier not in (0,1,2,4,5,6,8)','tier not in (0,1,2,4,5,6,7,8)');
 src:=replace(src,'tier in (1,2,4,5,6,8) and not','tier in (1,2,4,5,6,7,8) and not');
 src:=replace(src,'case when tier=4 then 2 when tier=8 then 6 else tier-1 end','case when tier=4 then 2 else tier-1 end');
 src:=replace(src,'not in (0,1,2,3,4,5,6,8)','not in (0,1,2,3,4,5,6,7,8)');
 EXECUTE src;
END;
$migration$;
