-- 2026-11-09 도현: 코인 잠금 + 열린 포지션 정산(이미 적용됨, 기록용).
-- 매수·매도(INVALID_INVESTMENT_LOCKED), 카피 신청·카피 지갑 입금(INVALID_COPY_LOCKED) 금지. 조회·카피 종료는 허용.
-- 열린 포지션: 손실이면 원금 환불, 수익이면 현재가 익절(수익금의 3% 수수료) → 골드. closed_reason='admin_refund_20261109'.
-- 카피 지갑 잔액 → 골드, 카피 관계 전부 종료. 백업: rebirth_private.admin_backup_coin_close_20261109
-- 잠금 해제: 세 함수에서 '_LOCKED' 줄을 지우면 된다.
DO $migration$
DECLARE src text; a text; r record; v numeric; v_pay numeric;
BEGIN
 src:=pg_get_functiondef('rebirth_private.investment(text,jsonb,uuid)'::regprocedure);
 a:=' if p_action not in (''list'',''buy'',''sell'') or p_request is null then raise exception ''INVALID_INVESTMENT_ACTION'';end if;';
 IF strpos(src,a)=0 OR strpos(src,'INVALID_INVESTMENT_LOCKED')>0 THEN RAISE EXCEPTION 'INVESTMENT_DRIFT'; END IF;
 EXECUTE replace(src,a,a||chr(10)||' -- 2026-11-09 도현: 코인 잠금'||chr(10)||' if p_action in (''buy'',''sell'') then raise exception ''INVALID_INVESTMENT_LOCKED'';end if;');
 src:=pg_get_functiondef('rebirth_private.coin_copy(text,uuid)'::regprocedure);
 a:=' if p_action not in (''status'',''start'',''stop'',''disband'') then raise exception ''INVALID_COPY_ACTION''; end if;';
 IF strpos(src,a)=0 OR strpos(src,'INVALID_COPY_LOCKED')>0 THEN RAISE EXCEPTION 'COPY_DRIFT'; END IF;
 EXECUTE replace(src,a,a||chr(10)||' if p_action=''start'' then raise exception ''INVALID_COPY_LOCKED''; end if;');
 src:=pg_get_functiondef('rebirth_private.coin_copy_wallet_move(text,numeric)'::regprocedure);
 a:=' if p_action not in (''deposit'',''withdraw'') then raise exception ''INVALID_COPY_WALLET_ACTION''; end if;';
 IF strpos(src,a)=0 OR strpos(src,'INVALID_COPY_LOCKED')>0 THEN RAISE EXCEPTION 'WALLET_DRIFT'; END IF;
 EXECUTE replace(src,a,a||chr(10)||' if p_action=''deposit'' then raise exception ''INVALID_COPY_LOCKED''; end if;');
 PERFORM pg_advisory_xact_lock(71823001);
 PERFORM pg_advisory_xact_lock(71823081);
 PERFORM 1 FROM rebirth_private.players WHERE id IN (SELECT user_id FROM rebirth_private.coin_positions WHERE status='open' UNION SELECT user_id FROM rebirth_private.coin_copy_wallet WHERE balance>0) ORDER BY id FOR UPDATE;
 FOR r IN SELECT c.id, c.user_id, c.amount, c.quantity, c.side, c.leverage, m.price FROM rebirth_private.coin_positions c JOIN rebirth_private.coin_market m ON m.id=c.coin WHERE c.status='open' FOR UPDATE OF c LOOP
  v:=floor(r.quantity*r.price);
  v_pay:=CASE WHEN r.side='long' AND r.leverage=1 AND v>r.amount THEN v-floor((v-r.amount)*0.03) ELSE r.amount END;
  UPDATE rebirth_private.coin_positions cp SET status='sold', closed_at=now(), payout=v_pay, fee=CASE WHEN v_pay>r.amount THEN v-v_pay ELSE 0 END, closed_reason='admin_refund_20261109' WHERE cp.id=r.id;
  UPDATE rebirth_private.players pl SET state=jsonb_set(pl.state,'{gold}',to_jsonb(coalesce((pl.state->>'gold')::numeric,0)+v_pay)), revision=pl.revision+1, updated_at=now() WHERE pl.id=r.user_id;
 END LOOP;
 FOR r IN SELECT w.user_id, w.balance FROM rebirth_private.coin_copy_wallet w WHERE w.balance>0 FOR UPDATE LOOP
  UPDATE rebirth_private.players pl SET state=jsonb_set(pl.state,'{gold}',to_jsonb(coalesce((pl.state->>'gold')::numeric,0)+r.balance)), revision=pl.revision+1, updated_at=now() WHERE pl.id=r.user_id;
  UPDATE rebirth_private.coin_copy_wallet w SET balance=0, updated_at=now() WHERE w.user_id=r.user_id;
 END LOOP;
 DELETE FROM rebirth_private.coin_copy WHERE true;
END;
$migration$;
