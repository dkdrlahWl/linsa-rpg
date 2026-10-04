CREATE OR REPLACE FUNCTION rebirth_private.arena_status()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=rebirth_private.session_user(); v_season timestamptz:=rebirth_private.arena_season_start(); v_bucket bigint:=floor(extract(epoch from now())/1800)::bigint; v_player rebirth_private.arena_players%rowtype; v_rank integer; v_top jsonb; v_history jsonb; v_offers jsonb; v_target integer;
begin
 perform rebirth_private.arena_refresh_daily_bots();
 if not exists(select 1 from rebirth_private.players where id=u and state is not null) then raise exception 'CHARACTER_REQUIRED'; end if;
 insert into rebirth_private.arena_players(user_id,season_start) values(u,v_season) on conflict do nothing;
 select * into v_player from rebirth_private.arena_players where user_id=u and season_start=v_season for update;
 if v_player.offer_bucket is distinct from v_bucket then
  v_target:=coalesce(v_player.score,0);
  with closest as (
   select 'bot:'||b.id as id,b.name,b.class_id,b.score,'bot' as kind,
          row_number() over(order by abs(b.score-v_target),md5(b.id::text||u::text||v_bucket::text)) as n
   from rebirth_private.arena_bots b
  ), candidates as (
   select id,name,class_id,score,kind from closest where n<=4
   union all
   select 'player:'||ap.user_id,coalesce(p.state->>'name','모험가'),p.state->>'classId',ap.score,'player'
   from rebirth_private.arena_players ap join rebirth_private.players p on p.id=ap.user_id
   where ap.season_start=v_season and ap.user_id<>u and ap.score is not null and p.state is not null
     and abs(ap.score-v_target)<=160
  )
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'classId',class_id,'score',score,'kind',kind,'used',false) order by abs(score-v_target),md5(id||v_bucket::text)),'[]'::jsonb)
  into v_offers from (select * from candidates order by abs(score-v_target),md5(id||v_bucket::text) limit 4) q;
  update rebirth_private.arena_players set offer_bucket=v_bucket,offers=v_offers where user_id=u and season_start=v_season;
  v_player.offer_bucket:=v_bucket;v_player.offers:=v_offers;
 end if;
 with board as (
  select 'bot:'||id as id,name,class_id as "classId",score from rebirth_private.arena_bots
  union all
  select 'player:'||a.user_id,coalesce(p.state->>'name','모험가'),p.state->>'classId',a.score
  from rebirth_private.arena_players a join rebirth_private.players p on p.id=a.user_id
  where a.season_start=v_season and a.score is not null and p.state is not null
 ), numbered as (
  select *,row_number() over(order by score desc,id) as rank from board
 )
 select coalesce(jsonb_agg(to_jsonb(q) order by rank),'[]'::jsonb) into v_top
 from (select * from numbered where rank<=100) q;
 if v_player.score is not null then
  select 1+count(*) into v_rank from (
   select 'bot:'||id as id,score from rebirth_private.arena_bots
   union all select 'player:'||user_id,score from rebirth_private.arena_players where season_start=v_season and score is not null and user_id<>u
  ) q where score>v_player.score or (score=v_player.score and id<'player:'||u::text);
 end if;
 select coalesce(jsonb_agg(result order by created_at desc),'[]'::jsonb) into v_history
 from (select result,created_at from rebirth_private.arena_matches where user_id=u and season_start=v_season order by created_at desc limit 10) h;
 return jsonb_build_object('seasonStart',v_season,'seasonEndsAt',v_season+interval '7 days','nextRefreshAt',to_timestamp((v_bucket+1)*1800),'score',v_player.score,'wins',v_player.wins,'losses',v_player.losses,'rank',v_rank,'offers',v_player.offers,'top100',v_top,'history',v_history,'botCount',2000);
end $function$;


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
 v_delta:=case when (p_result->'battle'->>'won')::boolean then 120 else -80 end;
 v_score:=greatest(0,coalesce(v_arena.score,0)+v_delta);
 v_saved:=p_result||jsonb_build_object('opponentId',p_target,'scoreBefore',v_arena.score,'scoreAfter',v_score,'delta',v_score-coalesce(v_arena.score,0),'at',now());
 update rebirth_private.arena_players set score=v_score,wins=wins+case when v_delta>0 then 1 else 0 end,losses=losses+case when v_delta<0 then 1 else 0 end,
 offers=(select jsonb_agg(case when offer->>'id'=p_target then offer||'{"used":true}'::jsonb else offer end order by n) from jsonb_array_elements(v_arena.offers) with ordinality x(offer,n))
 where user_id=p_user and season_start=v_season;
 insert into rebirth_private.arena_matches(user_id,request_id,season_start,opponent_id,result) values(p_user,p_request,v_season,p_target,v_saved);
 return v_saved;
end $function$;


create or replace function rebirth_private.arena_halfhour_bot_order(p_bucket bigint)
returns table(id integer,score integer,bot_rank integer)
language sql immutable set search_path='' as $$
 with ordered as (
  select i as id,row_number() over(order by md5(p_bucket::text||':arena:'||i::text),i)::integer as r
  from generate_series(1,100) i
 )
 select id,case when r=1 then 3000
  when r<=10 then 2600+floor((10-r)*390.0/8)::integer
  else 2200+floor((100-r)*399.0/89)::integer end,r from ordered
$$;
revoke all on function rebirth_private.arena_halfhour_bot_order(bigint) from public,anon,authenticated;
create or replace function rebirth_private.arena_refresh_daily_bots()
returns integer language plpgsql security invoker set search_path='' as $$
declare changed integer;
begin
 perform pg_advisory_xact_lock(1042026,100);
 update rebirth_private.arena_bots b set score=d.score
 from rebirth_private.arena_halfhour_bot_order(floor(extract(epoch from now())/1800)::bigint) d
 where b.id=d.id and b.score is distinct from d.score;
 get diagnostics changed=row_count;
 if changed>0 then
  -- Keep already-used opponents used; update pending snapshots to the day's strength.
  update rebirth_private.arena_players p set offers=(
   select coalesce(jsonb_agg(case when b.id is not null then o||jsonb_build_object('score',b.score,'name',b.name) else o end order by ord),'[]'::jsonb)
   from jsonb_array_elements(p.offers) with ordinality x(o,ord)
   left join rebirth_private.arena_bots b on o->>'id'='bot:'||b.id and b.id<=100
  ) where exists(select 1 from jsonb_array_elements(p.offers) o join rebirth_private.arena_bots b on o->>'id'='bot:'||b.id and b.id<=100);
 end if;
 return changed;
end $$;
revoke all on function rebirth_private.arena_refresh_daily_bots() from public,anon,authenticated;

select cron.unschedule(jobid) from cron.job where jobname='ringu-arena-daily-ai';
select cron.schedule('ringu-arena-halfhour-ai','*/30 * * * *','select rebirth_private.arena_refresh_daily_bots();');
select rebirth_private.arena_refresh_daily_bots();
-- Both player and bot scores have a floor only, without a gameplay upper cap.
alter table rebirth_private.arena_bots drop constraint arena_bots_score_check;
alter table rebirth_private.arena_bots add constraint arena_bots_score_check check(score>=0);
