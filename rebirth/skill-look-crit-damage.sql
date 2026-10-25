-- 2026-10-25 스킬 외형 보유 효과: 1종당 치명타 피해 +1%p (랭킹 전투력 SQL을 엔진 power()와 맞춤).
do $patch$
declare src text; n int;
old text := $o$crit_damage:=(case when cl='rogue' then 1.9 else 1.6 end)+.005*(select count(*) from jsonb_object_keys(case when jsonb_typeof(s->'titles')='object' then s->'titles' else '{}'::jsonb end));$o$;
new text := $n$crit_damage:=(case when cl='rogue' then 1.9 else 1.6 end)+.005*(select count(*) from jsonb_object_keys(case when jsonb_typeof(s->'titles')='object' then s->'titles' else '{}'::jsonb end))+.01*(select count(distinct x) from jsonb_array_elements_text(case when jsonb_typeof(s->'skillLooks')='array' then s->'skillLooks' else '[]'::jsonb end) x);$n$;
begin
 select pg_get_functiondef('rebirth_private.combat_power(jsonb)'::regprocedure) into src;
 n := (length(src)-length(replace(src,old,'')))/length(old);
 if n<>1 then raise exception 'SKILL_LOOK_CRIT_PATCH matched % times',n; end if;
 execute replace(src,old,new);
end $patch$;
