-- 추가옵션 불꽃 (2026-10-25): item.bonusPct (1~30) raises the item's whole stat contribution
-- (attack, main stat, HP, defense) by that percent in ranking combat power, matching gearAttributes().
DO $patch$
DECLARE
 definition text := pg_get_functiondef('rebirth_private.combat_power(jsonb)'::regprocedure);
 anchor text := $o$  for ln in select value from jsonb_array_elements(coalesce(it->'lines','[]')||coalesce(it->'addLines','[]')) loop$o$;
 bonus text := $n$  if jsonb_typeof(it->'bonusPct')='number' and (it->>'bonusPct')::int between 1 and 30 then
   atk:=gear_before_atk+(atk-gear_before_atk)*(1+(it->>'bonusPct')::int/100.0);
   stat:=gear_before_stat+(stat-gear_before_stat)*(1+(it->>'bonusPct')::int/100.0);
   hp:=gear_before_hp+(hp-gear_before_hp)*(1+(it->>'bonusPct')::int/100.0);
   def:=gear_before_def+(def-gear_before_def)*(1+(it->>'bonusPct')::int/100.0);
  end if;
$n$;
BEGIN
 IF position('bonusPct' in definition)>0 THEN RETURN; END IF;
 IF position(anchor in definition)=0 THEN RAISE EXCEPTION 'Unexpected combat_power definition; refusing to replace'; END IF;
 EXECUTE replace(definition,anchor,bonus||anchor);
END $patch$;
