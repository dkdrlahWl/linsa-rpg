CREATE OR REPLACE FUNCTION rebirth_private.arena_commit(p_user uuid, p_session uuid, p_request uuid, p_target text, p_result jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_player rebirth_private.players%rowtype; v_arena rebirth_private.arena_players%rowtype;v_season timestamptz:=rebirth_private.arena_season_start();v_bucket bigint:=floor(extract(epoch from now())/1800)::bigint;v_saved jsonb;v_score integer;v_delta integer;
begin
 select result into v_saved from rebirth_private.arena_matches where user_id=p_user and request_id=p_request;
 if found then if v_saved->>'opponentId'<>p_target then raise exception 'REQUEST_ID_REUSED'; end if;return v_saved;end if;
 select * into v_player from rebirth_private.players where id=p_user for update;
 if not found or v_player.active_session is distinct from p_session or not exists(select 1 from auth.sessions where id=p_session and user_id=p_user) then raise exception 'SESSION_ENDED'; end if;
 if exists(select 1 from auth.sessions where user_id=p_user and (created_at,id)>(v_player.session_started,p_session)) then raise exception 'SESSION_REPLACED'; end if;
 if v_player.state is null then raise exception 'CHARACTER_REQUIRED'; end if;
 if coalesce(v_player.state->'battle','null'::jsonb) is distinct from 'null'::jsonb or coalesce(v_player.state->'coopRoom','null'::jsonb) is distinct from 'null'::jsonb then raise exception 'BATTLE_IN_PROGRESS'; end if;
 select * into v_arena from rebirth_private.arena_players where user_id=p_user and season_start=v_season for update;
 if not found or v_arena.offer_bucket is distinct from v_bucket then raise exception 'ARENA_OFFERS_EXPIRED'; end if;
 if not exists(select 1 from jsonb_array_elements(v_arena.offers) offer where offer->>'id'=p_target and offer->>'used'='false') then raise exception 'ARENA_OPPONENT_UNAVAILABLE'; end if;
 if jsonb_typeof(p_result)<>'object' or jsonb_typeof(p_result->'battle')<>'object' or jsonb_typeof(p_result->'battle'->'won')<>'boolean' then raise exception 'INVALID_ARENA_RESULT'; end if;
 v_delta:=case when (p_result->'battle'->>'won')::boolean then 30 else -20 end;
 v_score:=greatest(0,coalesce(v_arena.score,0)+v_delta);
 v_saved:=p_result||jsonb_build_object('opponentId',p_target,'scoreBefore',v_arena.score,'scoreAfter',v_score,'delta',v_score-coalesce(v_arena.score,0),'at',now());
 update rebirth_private.arena_players set score=v_score,wins=wins+case when v_delta>0 then 1 else 0 end,losses=losses+case when v_delta<0 then 1 else 0 end,
 offers=(select jsonb_agg(case when offer->>'id'=p_target then offer||'{"used":true}'::jsonb else offer end order by n) from jsonb_array_elements(v_arena.offers) with ordinality x(offer,n))
 where user_id=p_user and season_start=v_season;
 insert into rebirth_private.arena_matches(user_id,request_id,season_start,opponent_id,result) values(p_user,p_request,v_season,p_target,v_saved);
 return v_saved;
end $function$;
