-- Ranking combat power: count every owned costume (+1% attack each), like engine power().
-- The SQL copy had a hardcoded list of the first 12 costumes, so the 6 newer
-- costumes were missing from the ranking. Costumes are catalog-only (server
-- validated), so counting distinct owned ids matches costumeAttackBonus().
do $$
declare d text:=pg_get_functiondef('rebirth_private.combat_power(jsonb)'::regprocedure); n text;
begin
 n:=regexp_replace(d,' where value=any\(array\[[^]]*\]\)','');
 if n=d then raise exception 'combat_power costume list not found'; end if;
 execute n;
end $$;
