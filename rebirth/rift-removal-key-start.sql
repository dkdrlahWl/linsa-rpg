-- 2026-10-11: remove cooperative rifts; Ringu exploration host must hold a key at start.
-- Keys are still charged only on the final clear; failure or leaving never charges.
DO $migration$
DECLARE source text;
BEGIN
 source:=pg_get_functiondef('public.rebirth_coop_action(jsonb)'::regprocedure);
 IF position('if room_mode=''wave'' then raise exception ''BOSS_CONTENT_REMOVED'';end if;' in source)=0 THEN RAISE EXCEPTION 'RIFT_SOURCE_DRIFT_1';END IF;
 source:=replace(source,'if room_mode=''wave'' then raise exception ''BOSS_CONTENT_REMOVED'';end if;',
  'if room_mode=''wave'' then raise exception ''BOSS_CONTENT_REMOVED'';end if;
   if room_mode=''rift'' then raise exception ''RIFT_CONTENT_REMOVED'';end if;');
 IF position('if action=''start'' and w->>''mode''=''wave'' then raise exception ''BOSS_CONTENT_REMOVED'';end if;' in source)=0 THEN RAISE EXCEPTION 'RIFT_SOURCE_DRIFT_2';END IF;
 source:=replace(source,'if action=''start'' and w->>''mode''=''wave'' then raise exception ''BOSS_CONTENT_REMOVED'';end if;',
  'if action=''start'' and w->>''mode''=''wave'' then raise exception ''BOSS_CONTENT_REMOVED'';end if;
   if action=''start'' and coalesce(w->>''mode'',''rift'')=''rift'' then raise exception ''RIFT_CONTENT_REMOVED'';end if;
   if action=''start'' and w->>''mode''=''exploration'' and (w->>''tier'')::int between 0 and 2 and coalesce((actor.state->''materials''->>''dungeonKey'')::bigint,0)<1+(select count(*) from rebirth_private.coop_rooms q where q.id<>rid and q.world->>''keyOwner''=u::text and q.world->>''status'' in (''waiting'',''fighting'') and (q.world->>''status''=''fighting'' or q.created_at>now()-interval ''15 minutes'')) then raise exception ''EXPLORATION_KEY_REQUIRED'';end if;');
 -- A missing key at victory must never block the win transaction.
 IF position('if coalesce((st->''materials''->>''dungeonKey'')::bigint,0)<1 then raise exception ''EXPLORATION_KEY_REQUIRED'';end if;
    update rebirth_private.players set state=jsonb_set(state,''{materials,dungeonKey}'',to_jsonb((state->''materials''->>''dungeonKey'')::bigint-1)),revision=revision+1,updated_at=now() where id=key_payer;' in source)=0 THEN RAISE EXCEPTION 'RIFT_SOURCE_DRIFT_3';END IF;
 source:=replace(source,'if coalesce((st->''materials''->>''dungeonKey'')::bigint,0)<1 then raise exception ''EXPLORATION_KEY_REQUIRED'';end if;
    update rebirth_private.players set state=jsonb_set(state,''{materials,dungeonKey}'',to_jsonb((state->''materials''->>''dungeonKey'')::bigint-1)),revision=revision+1,updated_at=now() where id=key_payer;',
  'if coalesce((st->''materials''->>''dungeonKey'')::bigint,0)>=1 then
    update rebirth_private.players set state=jsonb_set(state,''{materials,dungeonKey}'',to_jsonb((state->''materials''->>''dungeonKey'')::bigint-1)),revision=revision+1,updated_at=now() where id=key_payer;
    end if;');
 IF position('coalesce(world->>''mode'',''rift'')<>''wave''' in source)=0 THEN RAISE EXCEPTION 'RIFT_SOURCE_DRIFT_4';END IF;
 source:=replace(source,'coalesce(world->>''mode'',''rift'')<>''wave''','coalesce(world->>''mode'',''rift'') not in (''wave'',''rift'')');
 EXECUTE source;
END;
$migration$;
