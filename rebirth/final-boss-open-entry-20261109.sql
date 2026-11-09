-- Remove only the final-boss room creation level gate.
do $$
declare
  definition text := pg_get_functiondef('public.rebirth_coop_action(jsonb)'::regprocedure);
  level_gate text := $gate$if room_mode='raid' and tier between 4 and 6 and coalesce((actor.state->>'level')::int,0)<(array[300,350,400])[tier-3] then raise exception 'LEVEL_REQUIRED';end if;$gate$;
begin
  if strpos(definition, level_gate) = 0 then
    raise exception 'FINAL_BOSS_LEVEL_GATE_NOT_FOUND';
  end if;
  execute replace(definition, level_gate, '');
end $$;
