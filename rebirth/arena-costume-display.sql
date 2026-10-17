-- Include the owned equipped costume in arena ranking/offer profiles.
DO $patch$
DECLARE source text; changed text;
BEGIN
 SELECT pg_get_functiondef('rebirth_private.arena_status()'::regprocedure) INTO source;
 changed := replace(source,
  'class_id as "classId",score from rebirth_private.arena_bots',
  'class_id as "classId",score,null::text as "costumeId" from rebirth_private.arena_bots');
 changed := replace(changed,
  'p.state->>''classId'',a.score' || chr(10),
  'p.state->>''classId'',a.score,case when coalesce(p.state->''costumes'',''[]''::jsonb) ? (p.state->>''equippedCostume'') then p.state->>''equippedCostume'' else null end' || chr(10));
 changed := replace(changed,
  '''classId'',n."classId"',
  '''classId'',n."classId",''costumeId'',n."costumeId"');
 IF changed=source OR position('null::text as "costumeId"' in changed)=0 OR position('else null end' in changed)=0 THEN
  RAISE EXCEPTION 'ARENA_COSTUME_SOURCE_MISMATCH';
 END IF;
 EXECUTE changed;
END $patch$;
