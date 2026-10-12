-- 2026-10-12: 칭호 보유 효과 — each owned title adds +0.5%p crit damage (mirror of engine power()).
DO $migration$
DECLARE src text; n int; pat text:=$p$crit_damage:=case when cl='rogue' then 1\.9 else 1\.6 end;$p$;
BEGIN
 src:=pg_get_functiondef('rebirth_private.combat_power(jsonb)'::regprocedure);
 SELECT count(*) INTO n FROM regexp_matches(src,pat,'g');
 IF n<>1 THEN RAISE EXCEPTION 'TITLE_CRIT_DRIFT (% matches)',n; END IF;
 EXECUTE regexp_replace(src,pat,$p$crit_damage:=(case when cl='rogue' then 1.9 else 1.6 end)+.005*(select count(*) from jsonb_object_keys(case when jsonb_typeof(s->'titles')='object' then s->'titles' else '{}'::jsonb end));$p$);
END;
$migration$;
