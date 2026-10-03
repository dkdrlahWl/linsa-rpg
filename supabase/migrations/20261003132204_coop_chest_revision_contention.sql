do $migration$
declare definition text;
begin
 select pg_get_functiondef('public.rebirth_coop_action(jsonb)'::regprocedure) into definition;
 if position($before$   if w is null or w->>'status'<>'won' or w->>'mode'='advancement' then raise exception 'COOP_CHEST_NOT_READY';end if;
   if r.revision<>(p->>'roomRevision')::bigint then raise exception 'SAVE_CONFLICT';end if;$before$ in definition)=0 then raise exception 'COOP_CHEST_GUARD_NOT_FOUND';end if;
 execute replace(definition,$before$   if w is null or w->>'status'<>'won' or w->>'mode'='advancement' then raise exception 'COOP_CHEST_NOT_READY';end if;
   if r.revision<>(p->>'roomRevision')::bigint then raise exception 'SAVE_CONFLICT';end if;$before$,$after$   if w is null or w->>'status'<>'won' or w->>'mode'='advancement' then raise exception 'COOP_CHEST_NOT_READY';end if;
   -- Other participants walking to their chests can advance the room revision.
   -- Claim eligibility is checked against the current locked world below;
   -- actor revision and request receipts still protect personal rewards.$after$);
end $migration$;
