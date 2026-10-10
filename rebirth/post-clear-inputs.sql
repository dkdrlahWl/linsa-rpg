-- Extend the existing authenticated, service-only input queue to chest movement.
-- Replace only the four queue lifecycle guards and its clock origin.
do $migration$
declare definition text; previous text;
begin
 select pg_get_functiondef('public.rebirth_coop_action(jsonb)'::regprocedure) into definition;
 previous:=definition;
 definition:=replace(definition,
  $$and w->>'status'='fighting' and jsonb_array_length$$,
  $$and w->>'status' in ('fighting','won') and jsonb_array_length$$);
 definition:=replace(definition,
  $$if w->>'status'='fighting' then$$,
  $$if w->>'status' in ('fighting','won') then$$);
 definition:=replace(definition,
  $$if r.id is not null and r.world->>'status'='fighting' then$$,
  $$if r.id is not null and r.world->>'status' in ('fighting','won') then$$);
 definition:=replace(definition,
  $$(w->>'started')::bigint)/100.0$$,
  $$(case when w->>'status'='won' then coalesce((w->>'lootStarted')::numeric,coalesce((w->>'lootAt')::numeric,ms)-round((w->>'tick')::numeric)*100) else (w->>'started')::numeric end))/100.0$$);
 if definition=previous or position($$coalesce((w->>'lootStarted')::numeric$$ in definition)=0 then
  raise exception 'POST_CLEAR_QUEUE_SOURCE_MISMATCH';
 end if;
 execute definition;
end $migration$;
