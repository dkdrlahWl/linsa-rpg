-- 에디셔널 잠재능력 (2026-10-25): ranking combat power also counts item.addLines.
-- Additional lines carry "additional": true; their boss values are taken literally
-- (the legacy unique-boss 25 normalization applies to main potential lines only).
DO $patch$
DECLARE
 definition text := pg_get_functiondef('rebirth_private.combat_power(jsonb)'::regprocedure);
 old_loop text := $o$for ln in select value from jsonb_array_elements(coalesce(it->'lines','[]')) loop$o$;
 new_loop text := $n$for ln in select value from jsonb_array_elements(coalesce(it->'lines','[]')||coalesce(it->'addLines','[]')) loop$n$;
 old_boss text := $o$elsif k='boss' then boss_pct:=boss_pct+(case when coalesce(ln->>'grade',it->>'grade')='4' then 25 else val end); end if;$o$;
 new_boss text := $n$elsif k='boss' then boss_pct:=boss_pct+(case when not coalesce((ln->>'additional')::boolean,false) and coalesce(ln->>'grade',it->>'grade')='4' then 25 else val end); end if;$n$;
BEGIN
 IF position(new_loop in definition)>0 THEN RETURN; END IF;
 IF position(old_loop in definition)=0 OR position(old_boss in definition)=0 THEN
  RAISE EXCEPTION 'Unexpected combat_power definition; refusing to replace';
 END IF;
 EXECUTE replace(replace(definition,old_loop,new_loop),old_boss,new_boss);
END $patch$;
