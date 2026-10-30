-- 2026-10-30: 카피 리더 보상 1% → 5%. 지금까지의 카피 수익 거래도 5% 기준으로 맞춘다
-- (이미 지급한 1% 소급분·이후 지급분을 빼고 차액만 추가 지급).
do $m$
declare def text;
begin
 def:=pg_get_functiondef('rebirth_private.coin_copy_sell(uuid,integer,text,smallint,boolean)'::regprocedure);
 if position('floor((v_payout-v_a)*.01)' in def)=0 then raise exception 'COPY_REWARD5_DRIFT'; end if;
 execute replace(def,'floor((v_payout-v_a)*.01)','floor((v_payout-v_a)*.05)');
end $m$;
with target as (
 select copy_leader leader, sum(floor((payout-amount)*.05)) amount
 from rebirth_private.coin_positions where copy_leader is not null and status='sold' and payout>amount group by copy_leader
), paid as (
 select t.leader, coalesce((select amount from rebirth_private.coin_copy_reward_backfill b where b.leader=t.leader),0)
  +coalesce((select sum(leader_reward) from rebirth_private.coin_copy_trades x where x.leader=t.leader),0) amount
 from target t
), extra as (
 select t.leader, t.amount-p.amount amount from target t join paid p using(leader) where t.amount>p.amount
), upd as (
 insert into rebirth_private.coin_copy_reward_backfill as b(leader,amount,positions)
 select leader,amount,0 from extra on conflict(leader) do update set amount=b.amount+excluded.amount,granted_at=now()
 returning leader
)
update rebirth_private.players p set state=jsonb_set(p.state,'{gold}',to_jsonb(least(9007199254740991,coalesce((p.state->>'gold')::numeric,0)+e.amount))),revision=revision+1,updated_at=now()
from extra e where p.id=e.leader;
