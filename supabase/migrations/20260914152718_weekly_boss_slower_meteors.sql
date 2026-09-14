begin;
set local lock_timeout='5s';
-- Newly generated meteor waves: 900ms warning, 1100ms between drops.
-- Existing announced waves retain their timestamps to keep all clients in sync.
do $$
declare definition text:=pg_get_functiondef('ringu_private.wb_pattern(uuid,integer,integer,timestamptz)'::regprocedure);
begin
 if strpos(definition,'when 9 then 500 when 10 then 600')=0 or strpos(definition,'when 9 then 550 when 10 then 700')=0 then
  raise exception 'Expected meteor timing not found';
 end if;
 definition:=replace(definition,'when 9 then 500 when 10 then 600','when 9 then 900 when 10 then 600');
 definition:=replace(definition,'when 9 then 550 when 10 then 700','when 9 then 1100 when 10 then 700');
 execute definition;
end $$;
commit;
