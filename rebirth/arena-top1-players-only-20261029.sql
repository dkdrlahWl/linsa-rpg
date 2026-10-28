-- 2026-10-29: 아레나 현재 1등은 봇과 매칭하지 않고 ±120점 안의 유저만 상대로 띄운다. 없으면 상대 없음.
do $m$
declare def text;
 a1 text:='v_offers jsonb; v_target integer;';
 a2 text:='  v_target:=coalesce(v_player.score,0);
  with nearest as (';
 a3 text:='   where abs(score-v_target)<=120 or proximity<=4';
begin
 def:=pg_get_functiondef('rebirth_private.arena_status()'::regprocedure);
 if position(a1 in def)=0 or position(a2 in def)=0 or position(a3 in def)=0 then raise exception 'ARENA_TOP1_DRIFT'; end if;
 def:=replace(def,a1,'v_offers jsonb; v_target integer; v_top1 boolean;');
 def:=replace(def,a2,'  v_target:=coalesce(v_player.score,0);
  -- 현재 1등이면 봇과는 매칭하지 않고 ±120점 안의 유저만 상대로 띄운다(없으면 상대 없음).
  v_top1:=v_target>0 and not exists(select 1 from rebirth_private.arena_bots b where b.score>v_target)
   and not exists(select 1 from rebirth_private.arena_players ap2 join rebirth_private.players p2 on p2.id=ap2.user_id where ap2.season_start=v_season and ap2.user_id<>u and ap2.score>v_target and p2.state is not null and not rebirth_private.is_tester(ap2.user_id));
  with nearest as (');
 def:=replace(def,a3,'   where not v_top1 and (abs(score-v_target)<=120 or proximity<=4)');
 execute def;
end $m$;
