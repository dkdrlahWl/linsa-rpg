-- 2026-10-12: 칭호. Server-side stats for SQL-backed title conditions, title in rankings and coop members.
create or replace function rebirth_private.title_stats() returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=rebirth_private.session_user();
begin
 return jsonb_build_object(
  'arenaWins',(select coalesce(sum(wins),0) from rebirth_private.arena_players where user_id=u),
  'arenaStreak',(with m as (select (result->'battle'->>'won')::boolean w,row_number() over(order by created_at,request_id) rn,
      row_number() over(partition by (result->'battle'->>'won')::boolean order by created_at,request_id) rk
     from rebirth_private.arena_matches where user_id=u)
   select coalesce(max(c),0) from (select count(*) c from m where w group by rn-rk) x),
  'arenaChampion',exists(select 1 from rebirth_private.arena_season_rewards where user_id=u and final_rank=1),
  'lottoWin',exists(select 1 from rebirth_private.lotto_tickets t join rebirth_private.lotto_rounds r on r.draw_at=t.draw_at
     where t.user_id=u and r.settled_at is not null and t.number_a=r.number_a and t.number_b=r.number_b),
  'marketSales',(select count(*) from rebirth_private.listings where seller=u and (status='sold' or coalesce(gross_sold,0)>0)),
  'investProfit',(select coalesce(sum(coalesce(payout,0)-amount),0) from rebirth_private.coin_positions where user_id=u and status<>'open'));
end $$;
revoke all on function rebirth_private.title_stats() from public,anon;
grant execute on function rebirth_private.title_stats() to authenticated;
create or replace function public.rebirth_title_stats() returns jsonb
language sql security invoker set search_path='' as $$select rebirth_private.title_stats()$$;
revoke all on function public.rebirth_title_stats() from public,anon;
grant execute on function public.rebirth_title_stats() to authenticated;

DO $migration$
DECLARE src text; n int; r record;
BEGIN
 FOR r IN SELECT * FROM (VALUES
  ('public.rebirth_rankings()', $p$state->>'equippedCostume' as "costumeId",$p$, $p$state->>'equippedCostume' as "costumeId",state->>'title' as title,$p$),
  ('public.rebirth_rankings()', $p$,"costumeId",level,xp,advancement,$p$, $p$,"costumeId",title,level,xp,advancement,$p$),
  ('public.rebirth_coop_action(jsonb)', $p$'classId',actor\.state->>'classId'$p$, $p$'classId',actor.state->>'classId','title',actor.state->>'title'$p$)
 ) AS t(fn,pat,rep) LOOP
  src:=pg_get_functiondef(r.fn::regprocedure);
  SELECT count(*) INTO n FROM regexp_matches(src,r.pat,'g');
  IF n<>1 THEN RAISE EXCEPTION 'TITLES_DRIFT % (% matches)',r.fn,n; END IF;
  EXECUTE regexp_replace(src,r.pat,r.rep);
 END LOOP;
END;
$migration$;
