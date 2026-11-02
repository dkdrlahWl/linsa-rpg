-- 2026-11-02 도현: 코인 1배(현물)만 · 숏 신규 진입 금지 · 5분 변동 반토막(1~3% → 0.5~1.5%) · 상하한가 ±50% 유지
-- 판매 수수료 3%(판매 금액 기준, 일반·카피 공통) · 열려 있는 2배·3배 포지션은 현재가로 강제 정산(수수료 없음).
DO $migration$
DECLARE src text;
BEGIN
 -- 1) 5분 변동성 반토막
 src:=pg_get_functiondef('rebirth_private.coin_tick()'::regprocedure);
 IF (length(src)-length(replace(src,'(.01+random()*.02)','')))/length('(.01+random()*.02)')<>1 THEN RAISE EXCEPTION 'TICK_DRIFT'; END IF;
 EXECUTE replace(src,'(.01+random()*.02)','(.005+random()*.01)');

 -- 2) 매수: 1배·롱만, 판매 수수료 3%
 src:=pg_get_functiondef('rebirth_private.investment(text,jsonb,uuid)'::regprocedure);
 IF strpos(src,'if p_args ? ''leverage'' and coalesce(p_args->>''leverage'','''') not in (''1'',''2'',''3'') then raise exception ''INVALID_INVESTMENT_LEVERAGE'';end if;')=0
  OR strpos(src,'coalesce(p_args->>''side'','''') not in (''long'',''short'')')=0
  OR strpos(src,'fee:=ceil(gross*.005*pos.leverage);')=0 THEN RAISE EXCEPTION 'INVESTMENT_DRIFT'; END IF;
 src:=replace(src,'if p_args ? ''leverage'' and coalesce(p_args->>''leverage'','''') not in (''1'',''2'',''3'') then raise exception ''INVALID_INVESTMENT_LEVERAGE'';end if;',
                  'if coalesce(p_args->>''leverage'',''1'')<>''1'' then raise exception ''INVALID_INVESTMENT_LEVERAGE'';end if;');
 src:=replace(src,'coalesce(p_args->>''side'','''') not in (''long'',''short'')','coalesce(p_args->>''side'','''')<>''long''');
 src:=replace(src,'fee:=ceil(gross*.005*pos.leverage);','fee:=ceil(gross*.03);');
 EXECUTE src;

 -- 3) 카피 매도 수수료도 3%
 src:=pg_get_functiondef('rebirth_private.coin_copy_sell(uuid,integer,text,smallint,boolean)'::regprocedure);
 IF strpos(src,'v_fee:=ceil(gross*.005*f.leverage);')=0 THEN RAISE EXCEPTION 'COPY_SELL_DRIFT'; END IF;
 EXECUTE replace(src,'v_fee:=ceil(gross*.005*f.leverage);','v_fee:=ceil(gross*.03);');
 src:=pg_get_functiondef('rebirth_private.coin_copy_sell(uuid,integer,text,smallint)'::regprocedure);
 IF strpos(src,'ceil(gross*.005*f.leverage)')>0 THEN EXECUTE replace(src,'ceil(gross*.005*f.leverage)','ceil(gross*.03)'); END IF;
END;
$migration$;

-- 4) 2배·3배 강제 정산: 최신 시세로 맞춘 뒤 현재가 기준 평가금액을 수수료 없이 돌려준다.
--    카피 중인 유저의 포지션은 카피 계좌로, 나머지는 보유 골드로.
select pg_advisory_xact_lock(71823081);
select rebirth_private.coin_tick();
with closing as (
 update rebirth_private.coin_positions h
 set status='sold',closed_at=clock_timestamp(),fee=0,closed_reason='leverage_removed',
     payout=greatest(0,floor(h.amount+h.quantity*(m.price-h.entry)*case when h.side='short' then -1 else 1 end))
 from rebirth_private.coin_market m
 where m.id=h.coin and h.status='open' and h.leverage>1
 returning h.user_id,h.payout
), per_user as (
 select user_id,sum(payout) total from closing group by user_id
), to_wallet as (
 insert into rebirth_private.coin_copy_wallet as w(user_id,balance,updated_at)
 select user_id,total,now() from per_user where user_id in (select follower from rebirth_private.coin_copy)
 on conflict(user_id) do update set balance=w.balance+excluded.balance,updated_at=now()
 returning user_id
)
update rebirth_private.players pl
set state=case when pl.id in (select follower from rebirth_private.coin_copy) then pl.state
               else jsonb_set(pl.state,'{gold}',to_jsonb(least(9007199254740991,coalesce((pl.state->>'gold')::numeric,0)+u.total))) end,
    revision=revision+1,updated_at=now()
from per_user u where pl.id=u.user_id;
