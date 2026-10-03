create or replace function rebirth_private.arena_status() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=rebirth_private.session_user(); v_season timestamptz:=rebirth_private.arena_season_start(); v_bucket bigint:=floor(extract(epoch from now())/7200)::bigint; v_player rebirth_private.arena_players%rowtype; v_rank integer; v_top jsonb; v_history jsonb; v_offers jsonb; v_target integer;
begin
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
 return jsonb_build_object('seasonStart',v_season,'seasonEndsAt',v_season+interval '7 days','nextRefreshAt',to_timestamp((v_bucket+1)*7200),'score',v_player.score,'wins',v_player.wins,'losses',v_player.losses,'rank',v_rank,'offers',v_player.offers,'top100',v_top,'history',v_history,'botCount',2000);
end $$;
revoke all on function rebirth_private.arena_status() from public,anon;
grant execute on function rebirth_private.arena_status() to authenticated;
