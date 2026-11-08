-- 2026-11-08 민당·김민정 성채 접속 불가(INVALID_COOP_FUTURE) 재발 방지.
-- A paused citadel room resumes one tick at a time, but unconsumed queued
-- frames from before the pause can sit more than 30 ticks ahead. The edge
-- simulation rejected those on every sync, so nobody in the room could log in.
-- Only hand queued citadel frames to the simulation once they are inside the
-- 30-tick prediction window; later frames stay queued until their tick arrives.
DO $migration$
DECLARE source text;
BEGIN
 source := pg_get_functiondef('public.rebirth_coop_action(jsonb)'::regprocedure);
 IF position('where q.room_id=r.id and not q.consumed;' in source)=0 THEN
  RAISE EXCEPTION 'CITADEL_QUEUE_SOURCE_DRIFT';
 END IF;
 source := replace(source,
  'where q.room_id=r.id and not q.consumed;',
  'where q.room_id=r.id and not q.consumed and (coalesce(r.world->>''mode'','''')<>''citadel'' or q.tick<=coalesce((r.world->>''tick'')::int,0)+30);');
 EXECUTE source;
END;
$migration$;
