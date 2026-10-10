-- Open the new 0-stage campaign (internal exploration tier 3).
-- Preserve existing tiers, auth, locks, rewards and key charging.
DO $migration$
DECLARE source text;
BEGIN
 source := pg_get_functiondef('public.rebirth_coop_action(jsonb)'::regprocedure);
 IF position('room_mode=''exploration'' and tier not between 0 and 2' in source)=0
 OR position('if tier>0 and not' in source)=0 THEN
  RAISE EXCEPTION 'CITADEL_SOURCE_DRIFT';
 END IF;
 source := replace(source,'not between 0 and 2','not between 0 and 3');
 source := replace(source,'room_mode=''exploration'' and tier>0 and not','room_mode=''exploration'' and tier between 1 and 2 and not');
 source := replace(source,'if tier>0 and not','if tier between 1 and 2 and not');
 EXECUTE source;
END;
$migration$;
