-- 2026-10-12: coop lobby members carry arena score/rank so the waiting room can show tier + title.
DO $migration$
DECLARE src text; n int; pat text:=$p$'title',actor\.state->>'title','power'$p$;
 rep text:=$p$'title',actor.state->>'title','arenaScore',(select zap.score from rebirth_private.arena_players zap where zap.user_id=u and zap.season_start=rebirth_private.arena_season_start()),'arenaRank',(select 1+(select count(*) from rebirth_private.arena_bots zbt where zbt.score>zap.score)+(select count(*) from rebirth_private.arena_players zop where zop.season_start=zap.season_start and zop.score>zap.score) from rebirth_private.arena_players zap where zap.user_id=u and zap.season_start=rebirth_private.arena_season_start() and zap.score is not null),'power'$p$;
BEGIN
 src:=pg_get_functiondef('public.rebirth_coop_action(jsonb)'::regprocedure);
 SELECT count(*) INTO n FROM regexp_matches(src,pat,'g');
 IF n<>1 THEN RAISE EXCEPTION 'COOP_ARENA_DRIFT (% matches)',n; END IF;
 EXECUTE regexp_replace(src,pat,rep);
END;
$migration$;
