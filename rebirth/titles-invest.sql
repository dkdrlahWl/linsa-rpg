-- 2026-10-26: 투자 칭호 확장. title_stats()에 투자 통계 추가 (기존 키는 그대로).
-- investProfit = 판매 수수료 반영 후 순수익(총 PnL). 초기화 환급(closed_reason='reset')은 손익 0이라 그대로 두고, 거래 횟수에서는 제외.
create or replace function rebirth_private.title_stats() returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=rebirth_private.session_user(); inv jsonb;
begin
 select jsonb_build_object(
   'investProfit',coalesce(sum(coalesce(payout,0)-amount),0),
   'investTrades',count(*) filter (where coalesce(closed_reason,'')<>'reset'),
   'investWins',count(*) filter (where coalesce(payout,0)>amount),
   'investShortWins',count(*) filter (where side='short' and coalesce(payout,0)>amount),
   'investLiquidations',count(*) filter (where status='liquidated'),
   'investBestRate',coalesce(max((coalesce(payout,0)-amount)/amount),0))
  into inv from rebirth_private.coin_positions where user_id=u and status<>'open';
 return jsonb_build_object(
  'arenaWins',(select coalesce(sum(wins),0) from rebirth_private.arena_players where user_id=u),
  'arenaStreak',(with m as (select (result->'battle'->>'won')::boolean w,row_number() over(order by created_at,request_id) rn,
      row_number() over(partition by (result->'battle'->>'won')::boolean order by created_at,request_id) rk
     from rebirth_private.arena_matches where user_id=u)
   select coalesce(max(c),0) from (select count(*) c from m where w group by rn-rk) x),
  'arenaChampion',exists(select 1 from rebirth_private.arena_season_rewards where user_id=u and final_rank=1),
  'lottoWin',exists(select 1 from rebirth_private.lotto_tickets t join rebirth_private.lotto_rounds r on r.draw_at=t.draw_at
     where t.user_id=u and r.settled_at is not null and t.number_a=r.number_a and t.number_b=r.number_b),
  'marketSales',(select count(*) from rebirth_private.listings where seller=u and (status='sold' or coalesce(gross_sold,0)>0)))||inv;
end $$;
revoke all on function rebirth_private.title_stats() from public,anon;
grant execute on function rebirth_private.title_stats() to authenticated;
