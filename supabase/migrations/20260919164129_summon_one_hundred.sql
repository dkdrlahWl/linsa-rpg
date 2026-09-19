begin;
set local lock_timeout='5s';
select pg_advisory_xact_lock(70909,10);
do $upgrade$
declare f regprocedure:=coalesce(to_regprocedure('public.ringu_economy_snapshot_before_world_boss(uuid)'),to_regprocedure('public.ringu_economy_snapshot(uuid)'));definition text;
begin
 definition:=pg_get_functiondef(f);
 if strpos(definition,'generate_series(1,100)')>0 then return;end if;
 if strpos(definition,'generate_series(1,50)')=0 then raise exception 'SUMMON100_SNAPSHOT_SOURCE_CHANGED';end if;
 execute replace(definition,'generate_series(1,50)','generate_series(1,100)');
end $upgrade$;
commit;
