-- Weekly final-tier rewards, starting S1 (2026-10-05 Korea). No per-win rewards.
create index if not exists arena_matches_season_participation on rebirth_private.arena_matches(user_id,season_start);
create table if not exists rebirth_private.arena_season_rewards(
 user_id uuid not null references auth.users(id) on delete cascade,
 season_start timestamptz not null,
 score integer not null check(score>=0),
 final_rank integer not null check(final_rank>0),
 matches integer not null check(matches>=5),
 tier_label text not null,
 rewards jsonb not null,
 mailed_at timestamptz not null default now(),
 claimed_at timestamptz,
 primary key(user_id,season_start)
);
create index if not exists arena_season_rewards_pending on rebirth_private.arena_season_rewards(user_id,season_start) where claimed_at is null;
alter table rebirth_private.arena_season_rewards enable row level security;
revoke all on rebirth_private.arena_season_rewards from public,anon,authenticated;
drop policy if exists arena_reward_owner on rebirth_private.arena_season_rewards;
create policy arena_reward_owner on rebirth_private.arena_season_rewards for select to authenticated using(user_id=(select auth.uid()));

create or replace function rebirth_private.arena_reward_for(p_score integer,p_rank integer) returns jsonb
language sql immutable security invoker set search_path='' as $$
 with rewards(ord,label,min_score,gold,black,prime) as (values
 (0,'브론즈 IV',0,120000,3,0),
 (1,'브론즈 III',100,140000,4,0),
 (2,'브론즈 II',200,160000,5,0),
 (3,'브론즈 I',300,180000,6,0),
 (4,'실버 IV',400,240000,8,0),
 (5,'실버 III',500,280000,9,0),
 (6,'실버 II',600,320000,10,0),
 (7,'실버 I',700,360000,12,0),
 (8,'골드 IV',800,420000,16,0),
 (9,'골드 III',900,480000,18,0),
 (10,'골드 II',1000,540000,21,0),
 (11,'골드 I',1100,600000,24,0),
 (12,'플래티넘 IV',1200,630000,24,3),
 (13,'플래티넘 III',1300,720000,28,4),
 (14,'플래티넘 II',1400,810000,32,5),
 (15,'플래티넘 I',1500,900000,36,6),
 (16,'다이아 IV',1600,1050000,42,7),
 (17,'다이아 III',1700,1200000,48,8),
 (18,'다이아 II',1800,1350000,54,9),
 (19,'다이아 I',1900,1500000,60,10),
 (20,'마스터 IV',2200,1680000,63,11),
 (21,'마스터 III',2300,1920000,72,12),
 (22,'마스터 II',2400,2160000,81,13),
 (23,'마스터 I',2500,2400000,90,14),
 (24,'그랜드 마스터',2600,3600000,120,18),
 (25,'챌린저',2600,4800000,150,24),
 (26,'챔피언',2600,6000000,180,30)
 ) select jsonb_build_object('label',label,'gold',gold,'highCube',black,'primeCube',prime) from rewards
 where p_score is not null and ord=case
  when p_score>=2600 and p_rank between 1 and 10 then case when p_rank=1 then 26 when p_rank<=3 then 25 else 24 end
  when p_score>=2200 then 20+least(3,greatest(0,(p_score-2200)/100))
  when p_score>=1600 then 16+least(3,(p_score-1600)/100)
  when p_score>=1200 then 12+least(3,(p_score-1200)/100)
  when p_score>=800 then 8+least(3,(p_score-800)/100)
  when p_score>=400 then 4+least(3,(p_score-400)/100)
  else least(3,greatest(0,p_score)/100) end;
$$;
revoke all on function rebirth_private.arena_reward_for(integer,integer) from public,anon,authenticated;

create or replace function rebirth_private.arena_settle_rewards() returns integer
language plpgsql security invoker set search_path='' as $$
declare r record; v_rank integer; v_reward jsonb; v_mail jsonb; v_id text; v_number integer; v_count integer:=0;
begin
 -- Match state and mailbox writers use the same player row lock. Gold mail claims
 -- also acquire this advisory lock before locking a player, keeping lock order.
 perform pg_advisory_xact_lock(71823001);
 perform pg_advisory_xact_lock(1042026,101);
 for r in
  select a.user_id,a.season_start,a.score,m.matches
  from rebirth_private.arena_players a
  join rebirth_private.players p on p.id=a.user_id
  join auth.users u on u.id=a.user_id
  cross join lateral(select count(*)::integer as matches from rebirth_private.arena_matches m where m.user_id=a.user_id and m.season_start=a.season_start) m
  where a.season_start>='2026-10-04T15:00:00Z'::timestamptz
   and a.season_start+interval '7 days'<=rebirth_private.arena_season_start()
   and a.score is not null and m.matches>=5 and p.state->>'version'='rebirth-1'
   and coalesce(u.raw_app_meta_data->>'ringu_admin','false')<>'true'
   and not exists(select 1 from rebirth_private.arena_season_rewards x where x.user_id=a.user_id and x.season_start=a.season_start)
  order by a.user_id,a.season_start
 loop
  -- Reconstruct the closing Sunday's bot board, never next Monday's reset board.
  with board as (
   select 'bot:'||b.id as id,b.score from rebirth_private.arena_halfhour_bot_order(floor(extract(epoch from (r.season_start+interval '7 days'-interval '1 second'))/1800)::bigint) b
   union all
   select 'player:'||a.user_id,a.score from rebirth_private.arena_players a join rebirth_private.players p on p.id=a.user_id
   where a.season_start=r.season_start and a.score is not null and p.state is not null
  ) select 1+count(*)::integer into v_rank from board where score>r.score or (score=r.score and id<'player:'||r.user_id::text);
  v_reward:=rebirth_private.arena_reward_for(r.score,v_rank);
  if v_reward is null then continue; end if;
  perform 1 from rebirth_private.players where id=r.user_id for update;
  insert into rebirth_private.arena_season_rewards(user_id,season_start,score,final_rank,matches,tier_label,rewards)
  values(r.user_id,r.season_start,r.score,v_rank,r.matches,v_reward->>'label',v_reward-'label') on conflict do nothing;
  if not found then continue; end if;
  v_number:=1+floor(extract(epoch from (r.season_start-'2026-10-04T15:00:00Z'::timestamptz))/604800)::integer;
  v_id:='arena-season-'||to_char(r.season_start at time zone 'Asia/Seoul','YYYYMMDD');
  v_mail:=jsonb_build_object('id',v_id,'kind','arenaSeason','title','S'||v_number||' 아레나 시즌 보상','sender','아레나 운영팀',
   'message',v_reward->>'label'||' · 최종 '||v_rank||'위 · '||r.matches||'경기 참여 보상입니다. 다음 시즌에도 도전해 보세요!',
   'sentAt',now(),'rewards',v_reward-'label');
  update rebirth_private.players set state=jsonb_set(jsonb_set(state,'{rewardMailbox}',coalesce(state->'rewardMailbox','[]'::jsonb)||jsonb_build_array(v_mail)),
   '{systemMailbox}',coalesce(state->'systemMailbox','[]'::jsonb)||jsonb_build_array(v_mail)),revision=revision+1,updated_at=now() where id=r.user_id;
  v_count:=v_count+1;
 end loop;
 return v_count;
end $$;
revoke all on function rebirth_private.arena_settle_rewards() from public,anon,authenticated;
grant execute on function rebirth_private.arena_settle_rewards() to service_role;

create or replace function rebirth_private.arena_claim_reward(p_season timestamptz,p_request uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid; receiver rebirth_private.players%rowtype; mail rebirth_private.arena_season_rewards%rowtype;
 receipt rebirth_private.receipts%rowtype; v_id text; v_state jsonb; v_gold bigint; v_black bigint; v_prime bigint; result jsonb;
 fingerprint jsonb:=jsonb_build_object('command','arenaRewardClaim','args',jsonb_build_object('id','arena-season-'||to_char(p_season at time zone 'Asia/Seoul','YYYYMMDD')));
begin
 perform pg_advisory_xact_lock(71823001);
 actor:=rebirth_private.session_user();
 if p_request is null or p_season is null then raise exception 'MAIL_NOT_FOUND'; end if;
 select * into receiver from rebirth_private.players where id=actor for update;
 if receiver.state is null then raise exception 'CHARACTER_REQUIRED'; end if;
 select * into receipt from rebirth_private.receipts where user_id=actor and request_id=p_request;
 if found then
  if receipt.fingerprint<>fingerprint then raise exception 'REQUEST_ID_REUSED'; end if;
  return jsonb_build_object('state',receiver.state,'revision',receiver.revision,'result',receipt.result);
 end if;
 if coalesce(receiver.state->'battle','null'::jsonb)<>'null'::jsonb or nullif(receiver.state->>'partyRoom','') is not null or nullif(receiver.state->>'coopRoom','') is not null then raise exception 'BATTLE_IN_PROGRESS'; end if;
 select * into mail from rebirth_private.arena_season_rewards where user_id=actor and season_start=p_season for update;
 if not found then raise exception 'MAIL_NOT_FOUND'; end if;
 if mail.claimed_at is not null then raise exception 'MAIL_ALREADY_CLAIMED'; end if;
 -- The immutable settlement receipt supplies amounts, not the client or mailbox.
 v_gold:=coalesce((receiver.state->>'gold')::bigint,0)+(mail.rewards->>'gold')::bigint;
 v_black:=coalesce((receiver.state->'materials'->>'highCube')::bigint,0)+(mail.rewards->>'highCube')::bigint;
 v_prime:=coalesce((receiver.state->'materials'->>'primeCube')::bigint,0)+(mail.rewards->>'primeCube')::bigint;
 if v_gold<0 or v_gold>9000000000000 or v_black<0 or v_prime<0 or v_black>9000000000000 or v_prime>9000000000000 then raise exception 'INVALID_MAIL_REWARD'; end if;
 v_id:='arena-season-'||to_char(p_season at time zone 'Asia/Seoul','YYYYMMDD');
 v_state:=jsonb_set(receiver.state,'{gold}',to_jsonb(v_gold));
 v_state:=jsonb_set(v_state,'{materials}',coalesce(v_state->'materials','{}'::jsonb)||jsonb_build_object('highCube',v_black,'primeCube',v_prime));
 v_state:=jsonb_set(v_state,'{rewardMailbox}',coalesce((select jsonb_agg(e) from jsonb_array_elements(coalesce(v_state->'rewardMailbox','[]'::jsonb)) e where e->>'id'<>v_id),'[]'::jsonb));
 v_state:=jsonb_set(v_state,'{systemMailbox}',coalesce((select jsonb_agg(e) from jsonb_array_elements(coalesce(v_state->'systemMailbox','[]'::jsonb)) e where e->>'id'<>v_id),'[]'::jsonb));
 v_state:=jsonb_set(v_state,'{claimedSystemMail}',coalesce(v_state->'claimedSystemMail','[]'::jsonb)||to_jsonb(v_id));
 update rebirth_private.players set state=v_state,revision=revision+1,updated_at=now() where id=actor returning * into receiver;
 update rebirth_private.arena_season_rewards set claimed_at=now() where user_id=actor and season_start=p_season;
 result:=jsonb_build_object('events',jsonb_build_array(jsonb_build_object('type','arenaSeasonReward','tier',mail.tier_label,'rewards',mail.rewards)));
 insert into rebirth_private.receipts(user_id,request_id,fingerprint,result) values(actor,p_request,fingerprint,result);
 return jsonb_build_object('state',receiver.state,'revision',receiver.revision,'result',result);
end $$;
revoke all on function rebirth_private.arena_claim_reward(timestamptz,uuid) from public,anon;
grant execute on function rebirth_private.arena_claim_reward(timestamptz,uuid) to authenticated;
create or replace function public.rebirth_arena_reward_claim(p_season timestamptz,p_request uuid) returns jsonb
language sql security invoker set search_path='' as $$select rebirth_private.arena_claim_reward(p_season,p_request)$$;
revoke all on function public.rebirth_arena_reward_claim(timestamptz,uuid) from public,anon;
grant execute on function public.rebirth_arena_reward_claim(timestamptz,uuid) to authenticated;

CREATE OR REPLACE FUNCTION rebirth_private.arena_status()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=rebirth_private.session_user(); v_season timestamptz:=rebirth_private.arena_season_start(); v_bucket bigint:=floor(extract(epoch from now())/300)::bigint;
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
 return jsonb_build_object('seasonStart',v_season,'seasonEndsAt',v_season+interval '7 days','nextRefreshAt',to_timestamp((v_bucket+1)*300),
  'score',v_player.score,'wins',v_player.wins,'losses',v_player.losses,'rank',v_rank,'offers',v_offers,'top100',v_top,'history',v_history,'botCount',2000,'seasonMatches',(select count(*)::integer from rebirth_private.arena_matches where user_id=u and season_start=v_season),
  'rewardMinMatches',5,'seasonReward',rebirth_private.arena_reward_for(v_player.score,v_rank));
end $function$
;

CREATE OR REPLACE FUNCTION public.rebirth_rankings()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare actor uuid;
begin
 actor:=rebirth_private.session_user();
 return (with arena_board as materialized (
  select 'bot:'||id as id,score from rebirth_private.arena_bots
  union all
  select 'player:'||a.user_id,a.score from rebirth_private.arena_players a join rebirth_private.players p on p.id=a.user_id
  where a.season_start=rebirth_private.arena_season_start() and a.score is not null and p.state is not null
 ), arena_ranked as materialized (
  select id,score,row_number() over(order by score desc,id)::integer as rank from arena_board
 ), scores as materialized (
  select p.id,state->>'name' as name,state->>'classId' as "classId",state->>'equippedCostume' as "costumeId",(state->>'level')::int as level,
   (state->>'xp')::bigint as xp,coalesce((state->>'advancement')::int,0) as advancement,
   rebirth_private.combat_power(state) as "combatPower",ar.score as "arenaScore",ar.rank as "arenaRank"
  from rebirth_private.players p left join arena_ranked ar on ar.id='player:'||p.id where state->>'version'='rebirth-1'
   and not exists(select 1 from auth.users u where u.id=p.id and u.raw_app_meta_data->>'ringu_admin'='true')
 ), ranked as (
  select *,row_number() over(order by level desc,xp desc,id) as "levelRank",
   row_number() over(order by "combatPower" desc,level desc,xp desc,id) as "combatRank",count(*) over() as total from scores
 ) select coalesce(jsonb_agg(q order by q."levelRank"),'[]') from (
  select id,"levelRank" as rank,"levelRank","combatRank",name,"classId","costumeId",level,xp,advancement,"combatPower","arenaScore","arenaRank",id=actor as "isMe",total
  from ranked where "levelRank"<=100 or "combatRank"<=100 or id=actor
 ) q);
end $function$
;

CREATE OR REPLACE FUNCTION rebirth_private.arena_commit(p_user uuid, p_session uuid, p_request uuid, p_target text, p_result jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_player rebirth_private.players%rowtype; v_arena rebirth_private.arena_players%rowtype;v_season timestamptz:=rebirth_private.arena_season_start();v_bucket bigint:=floor(extract(epoch from now())/300)::bigint;v_saved jsonb;v_score integer;v_delta integer;
begin
 perform pg_advisory_xact_lock(1042026,101);
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
 if clock_timestamp()>=v_season+interval '7 days' then raise exception 'ARENA_OFFERS_EXPIRED'; end if;
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

-- Database job: Monday 00:00 Korea. Safe to repeat after a transient failure.
select cron.schedule('ringu-arena-season-rewards','0 15 * * 0','select rebirth_private.arena_settle_rewards();');
