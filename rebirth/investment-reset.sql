-- One-time authorized restart: full principal refunds, no selling fee.
-- Held under the same market lock as buying, selling and market ticks.
select pg_advisory_xact_lock(71823081);
do $$
begin
 if exists(select 1 from (select user_id,sum(amount) refund from rebirth_private.coin_positions where status='open' group by user_id) q left join rebirth_private.players p on p.id=q.user_id where p.state is null or coalesce((p.state->>'gold')::numeric,0)+refund>9007199254740991) then raise exception 'INVALID_RESET_REFUND';end if;
end $$;
with refunds as(select user_id,sum(amount) amount from rebirth_private.coin_positions where status='open' group by user_id)
update rebirth_private.players p set state=jsonb_set(p.state,'{gold}',to_jsonb(coalesce((p.state->>'gold')::numeric,0)+r.amount)),revision=p.revision+1,updated_at=now() from refunds r where p.id=r.user_id;
update rebirth_private.coin_positions set status='sold',closed_at=now(),payout=amount,fee=0,closed_reason='reset' where status='open';
delete from rebirth_private.coin_candles;
update rebirth_private.coin_market set price=10000,day_base=10000,trend=0,day_key=(now() at time zone 'Asia/Seoul')::date,tick_at=date_trunc('hour',now());
