-- Arena ladder: Korea Monday 00:00, daily score/rank variation and growth, real score/rank profiles.
-- Keep points uncapped and preserve authentication, receipt and single-use offer checks.
create or replace function rebirth_private.arena_random(p_seed bigint,p_id integer,p_salt integer)
returns bigint language sql immutable set search_path='' as $$
 with initial as (select mod(p_seed*1103515245::bigint+p_id::bigint*2654435761+p_salt::bigint*1013904223,2147483647::bigint) as n)
 select mod(mod(n*n,2147483647::bigint)*48271+n*31,2147483647::bigint) from initial
$$;
revoke all on function rebirth_private.arena_random(bigint,integer,integer) from public,anon,authenticated;

create or replace function rebirth_private.arena_halfhour_bot_order(p_bucket bigint)
returns table(id integer,score integer,bot_rank integer)
language sql immutable set search_path='' as $$
 with season as (
  select floor(extract(epoch from (date_trunc('week',to_timestamp(p_bucket*1800) at time zone 'Asia/Seoul') at time zone 'Asia/Seoul'))/1800)::bigint as start_bucket
 ), daily as (
  select start_bucket,start_bucket+((p_bucket-start_bucket)/48)*48 as daily_bucket,((p_bucket-start_bucket)/48)::integer as season_day from season
 ), scored as (
  select i as id,case when i<=120 then
   2000+(rebirth_private.arena_random(s.start_bucket,i,1)%1001)::integer
   +floor(s.season_day*700.0/6)::integer
   +(rebirth_private.arena_random(s.daily_bucket,i,2)%161)::integer-80
  else greatest(0,least(1949+floor(s.season_day*700.0/6)::integer,floor((2000-i)*(1949+floor(s.season_day*700.0/6))/1879)::integer+(rebirth_private.arena_random(s.daily_bucket,i,3)%41)::integer-20)) end as score
  from generate_series(1,2000) i cross join daily s
 )
 select id,score,row_number() over(order by score desc,'bot:'||id)::integer from scored
$$;
revoke all on function rebirth_private.arena_halfhour_bot_order(bigint) from public,anon,authenticated;

-- Retain the legacy helper signature, with the same variable ladder rules.
create or replace function rebirth_private.arena_daily_bot_order(p_day date)
returns table(id integer,score integer,bot_rank integer)
language sql immutable set search_path='' as $$
 select * from rebirth_private.arena_halfhour_bot_order(floor(extract(epoch from (p_day::timestamp at time zone 'Asia/Seoul'))/1800)::bigint)
$$;
revoke all on function rebirth_private.arena_daily_bot_order(date) from public,anon,authenticated;

create or replace function rebirth_private.arena_refresh_daily_bots()
returns integer language plpgsql security invoker set search_path='' as $$
declare changed integer;
begin
 perform pg_advisory_xact_lock(1042026,100);
 update rebirth_private.arena_bots b set score=d.score
 from rebirth_private.arena_halfhour_bot_order(floor(extract(epoch from now())/1800)::bigint) d
 where b.id=d.id and b.score is distinct from d.score;
 get diagnostics changed=row_count;
 -- Offer score/rank/name is resolved from the live board in arena_status.
 return changed;
end $$;
revoke all on function rebirth_private.arena_refresh_daily_bots() from public,anon,authenticated;

create or replace function rebirth_private.arena_match_delta(p_score integer,p_won boolean)
returns integer language sql immutable set search_path='' as $$
 select case when coalesce(p_score,0)>=2200 then case when p_won then 25 else -25 end
 else case when p_won then 30 else -20 end end
$$;
revoke all on function rebirth_private.arena_match_delta(integer,boolean) from public,anon,authenticated;

create or replace function rebirth_private.arena_status()
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=rebirth_private.session_user(); v_season timestamptz:=rebirth_private.arena_season_start(); v_bucket bigint:=floor(extract(epoch from now())/1800)::bigint;
 v_player rebirth_private.arena_players%rowtype; v_rank integer; v_top jsonb; v_history jsonb; v_offers jsonb; v_target integer;
begin
 perform rebirth_private.arena_refresh_daily_bots();
 if not exists(select 1 from rebirth_private.players where id=u and state is not null) then raise exception 'CHARACTER_REQUIRED'; end if;
 insert into rebirth_private.arena_players(user_id,season_start) values(u,v_season) on conflict do nothing;
 select * into v_player from rebirth_private.arena_players where user_id=u and season_start=v_season for update;
 if v_player.offer_bucket is distinct from v_bucket then
  v_target:=coalesce(v_player.score,0);
  with nearest as (
   select 'bot:'||b.id as id,b.name,b.class_id,b.score,'bot'::text as kind,
    row_number() over(order by abs(b.score-v_target),b.id) as proximity
   from rebirth_private.arena_bots b
  ), candidates as (
   select id,name,class_id,score,kind from nearest
   where abs(score-v_target)<=120 or proximity<=4
   union all
   select 'player:'||ap.user_id,coalesce(p.state->>'name','모험가'),p.state->>'classId',ap.score,'player'
   from rebirth_private.arena_players ap join rebirth_private.players p on p.id=ap.user_id
   where ap.season_start=v_season and ap.user_id<>u and ap.score is not null and p.state is not null
    and abs(ap.score-v_target)<=120
  ), varied as (
   select *,row_number() over(partition by class_id order by abs(score-v_target),md5(id||u::text||v_bucket::text)) as class_order
   from candidates
  )
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'classId',class_id,'score',score,'kind',kind,'used',false) order by abs(score-v_target),id),'[]'::jsonb)
  into v_offers from (
   select * from varied order by class_order,abs(score-v_target),md5(id||u::text||v_bucket::text) limit 4
  ) q;
  v_player.offer_bucket:=v_bucket;v_player.offers:=v_offers;
 end if;
 with board as (
  select 'bot:'||id as id,name,class_id as "classId",score from rebirth_private.arena_bots
  union all
  select 'player:'||a.user_id,coalesce(p.state->>'name','모험가'),p.state->>'classId',a.score
  from rebirth_private.arena_players a join rebirth_private.players p on p.id=a.user_id
  where a.season_start=v_season and a.score is not null and p.state is not null
 ), numbered as (
  select *,row_number() over(order by score desc,id)::integer as rank from board
 )
 select
  (select coalesce(jsonb_agg(to_jsonb(q) order by rank),'[]'::jsonb) from (select * from numbered where rank<=100) q),
  (select rank from numbered where id='player:'||u),
  (select coalesce(jsonb_agg(o||jsonb_build_object('score',n.score,'rank',n.rank,'name',n.name,'classId',n."classId") order by ord),'[]'::jsonb)
   from jsonb_array_elements(v_player.offers) with ordinality x(o,ord) join numbered n on n.id=o->>'id')
 into v_top,v_rank,v_offers;
 update rebirth_private.arena_players set offer_bucket=v_player.offer_bucket,offers=v_offers where user_id=u and season_start=v_season;
 select coalesce(jsonb_agg(result order by created_at desc),'[]'::jsonb) into v_history
 from (select result,created_at from rebirth_private.arena_matches where user_id=u and season_start=v_season order by created_at desc limit 10) h;
 return jsonb_build_object('seasonStart',v_season,'seasonEndsAt',v_season+interval '7 days','nextRefreshAt',to_timestamp((v_bucket+1)*1800),
  'score',v_player.score,'wins',v_player.wins,'losses',v_player.losses,'rank',v_rank,'offers',v_offers,'top100',v_top,'history',v_history,'botCount',2000);
end $$;
revoke all on function rebirth_private.arena_status() from public,anon;
grant execute on function rebirth_private.arena_status() to authenticated;

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
 -- A second request can have finished while this transaction waited for the player lock.
 select result into v_saved from rebirth_private.arena_matches where user_id=p_user and request_id=p_request;
 if found then if v_saved->>'opponentId'<>p_target then raise exception 'REQUEST_ID_REUSED'; end if;return v_saved;end if;
 if v_player.id is null or v_player.active_session is distinct from p_session or not exists(select 1 from auth.sessions where id=p_session and user_id=p_user) then raise exception 'SESSION_ENDED'; end if;
 if exists(select 1 from auth.sessions where user_id=p_user and (created_at,id)>(v_player.session_started,p_session)) then raise exception 'SESSION_REPLACED'; end if;
 if v_player.state is null then raise exception 'CHARACTER_REQUIRED'; end if;
 if coalesce(v_player.state->'battle','null'::jsonb) is distinct from 'null'::jsonb or coalesce(v_player.state->'coopRoom','null'::jsonb) is distinct from 'null'::jsonb then raise exception 'BATTLE_IN_PROGRESS'; end if;
 select * into v_arena from rebirth_private.arena_players where user_id=p_user and season_start=v_season for update;
 if not found or v_arena.offer_bucket is distinct from v_bucket then raise exception 'ARENA_OFFERS_EXPIRED'; end if;
 if not exists(select 1 from jsonb_array_elements(v_arena.offers) offer where offer->>'id'=p_target and offer->>'used'='false') then raise exception 'ARENA_OPPONENT_UNAVAILABLE'; end if;
 if jsonb_typeof(p_result) is distinct from 'object' or jsonb_typeof(p_result->'battle') is distinct from 'object' or jsonb_typeof(p_result->'battle'->'won') is distinct from 'boolean' then raise exception 'INVALID_ARENA_RESULT'; end if;
 v_delta:=rebirth_private.arena_match_delta(v_arena.score,(p_result->'battle'->>'won')::boolean);
 v_score:=greatest(0,coalesce(v_arena.score,0)+v_delta);
 v_saved:=p_result||jsonb_build_object('opponentId',p_target,'scoreBefore',v_arena.score,'scoreAfter',v_score,'delta',v_score-coalesce(v_arena.score,0),'at',now());
 update rebirth_private.arena_players set score=v_score,wins=wins+case when v_delta>0 then 1 else 0 end,losses=losses+case when v_delta<0 then 1 else 0 end,
 offers=(select jsonb_agg(case when offer->>'id'=p_target then offer||'{"used":true}'::jsonb else offer end order by n) from jsonb_array_elements(v_arena.offers) with ordinality x(offer,n))
 where user_id=p_user and season_start=v_season;
 insert into rebirth_private.arena_matches(user_id,request_id,season_start,opponent_id,result) values(p_user,p_request,v_season,p_target,v_saved);
 return v_saved;
end $function$
;
-- Daily ladder refresh at Korea midnight (15:00 UTC); opponent offers still refresh every 30 minutes.
select cron.unschedule(jobid) from cron.job where jobname in ('ringu-arena-halfhour-ai','ringu-arena-daily-ai','ringu-arena-daily-ladder');
select cron.schedule('ringu-arena-daily-ladder','0 15 * * *','select rebirth_private.arena_refresh_daily_bots();');
select rebirth_private.arena_refresh_daily_bots();

