-- 2026-10-14: 키야 계정(fbe3f576-a21b-4815-9736-e92a4413bc5e) 거래소 판매 등록·골드 송금 차단.
-- 구매·조회·기존 등록 취소는 그대로 허용. 이미 올려둔 판매글은 유지됨.
DO $patch$
DECLARE d text;
 mk_anchor text := 'if p_action<>''list'' and rebirth_private.is_tester(u) then raise exception ''TESTER_BLOCKED''; end if;';
 gt_anchor text := 'actor:=rebirth_private.session_user();';
BEGIN
 d := pg_get_functiondef('rebirth_private.market(text,jsonb,uuid)'::regprocedure);
 IF position('MARKET_SELL_BLOCKED_KIYA' in d)=0 THEN
  IF position(mk_anchor in d)=0 THEN RAISE EXCEPTION 'market function changed; patch stopped'; END IF;
  d := replace(d, mk_anchor, mk_anchor || E'\n if p_action=''sell'' and u=''fbe3f576-a21b-4815-9736-e92a4413bc5e''::uuid then raise exception ''MARKET_SELL_BLOCKED_KIYA: 거래소 판매가 제한된 계정입니다.''; end if;');
  EXECUTE d;
 END IF;
 d := pg_get_functiondef('rebirth_private.gold_transfer(jsonb,uuid)'::regprocedure);
 IF position('GOLD_TRANSFER_BLOCKED_KIYA' in d)=0 THEN
  IF position(gt_anchor in d)=0 THEN RAISE EXCEPTION 'gold transfer function changed; patch stopped'; END IF;
  d := replace(d, gt_anchor, gt_anchor || E'\n if actor=''fbe3f576-a21b-4815-9736-e92a4413bc5e''::uuid then raise exception ''GOLD_TRANSFER_BLOCKED_KIYA: 골드 송금이 제한된 계정입니다.''; end if;');
  EXECUTE d;
 END IF;
END $patch$;
