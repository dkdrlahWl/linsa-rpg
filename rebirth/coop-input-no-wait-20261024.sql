-- Apply after the current coop action definition. Preserve its rewards and ACL.
-- Only simulation updates may fall back to an authenticated MVCC snapshot.
DO $patch$
DECLARE
 definition text := pg_get_functiondef('public.rebirth_coop_action(jsonb)'::regprocedure);
 old_block text := $old$  if action='input' then perform set_config('lock_timeout','750ms',true);end if;
  perform pg_advisory_xact_lock(hashtextextended(coalesce((select state->>'coopRoom' from rebirth_private.players where id=u),p->'args'->>'room',u::text),71823001));$old$;
 new_block text := $new$  if action='input' then
   perform set_config('lock_timeout','750ms',true);
   -- The frame snapshot already durably queued validated inputs. A competing
   -- writer must not occupy another database connection waiting on this room.
   if not pg_try_advisory_xact_lock(hashtextextended(coalesce((select state->>'coopRoom' from rebirth_private.players where id=u),p->'args'->>'room',u::text),71823001)) then
    action:='read';
   end if;
  else
   perform pg_advisory_xact_lock(hashtextextended(coalesce((select state->>'coopRoom' from rebirth_private.players where id=u),p->'args'->>'room',u::text),71823001));
  end if;$new$;
BEGIN
 IF position(new_block in definition)>0 THEN RETURN; END IF;
 IF position(old_block in definition)=0 THEN
  RAISE EXCEPTION 'Unexpected coop lock definition; refusing to replace';
 END IF;
 EXECUTE replace(definition,old_block,new_block);
END $patch$;
