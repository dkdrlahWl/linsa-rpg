do $upgrade$
declare definition text;
begin
 select pg_get_functiondef('public.ringu_economy_snapshot(uuid)'::regprocedure) into definition;
 if position('generate_series(1,10)' in definition)=0 then raise exception 'Unexpected snapshot definition'; end if;
 execute replace(definition,'generate_series(1,10)','generate_series(1,50)');
end $upgrade$;
