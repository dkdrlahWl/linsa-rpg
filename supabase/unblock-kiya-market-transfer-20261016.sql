-- 2026-10-16: 키야 계정 거래소 판매 등록·골드 송금 제한 해제.
-- block-kiya-market-transfer-20261014.sql / block-kiya-gold-transfer.sql 에서 넣은 줄만 제거한다.
-- 여러 번 실행해도 안전함(이미 풀려 있으면 아무것도 안 함).
DO $patch$
DECLARE d text; fn regprocedure; marker text;
BEGIN
 FOR fn, marker IN
  SELECT x.fn::regprocedure, x.marker FROM (VALUES
   ('rebirth_private.market(text,jsonb,uuid)','MARKET_SELL_BLOCKED_KIYA'),
   ('rebirth_private.gold_transfer(jsonb,uuid)','GOLD_TRANSFER_BLOCKED_KIYA'),
   ('public.ringu_gold_transfer(text,uuid,numeric,uuid)','GOLD_TRANSFER_BLOCKED_KIYA')
  ) AS x(fn, marker)
  WHERE to_regprocedure(x.fn) IS NOT NULL
 LOOP
  d := pg_get_functiondef(fn);
  IF position(marker in d) > 0 THEN
   d := regexp_replace(d, E'\\n[^\\n]*' || marker || E'[^\\n]*', '', 'g');
   EXECUTE d;
   RAISE NOTICE '% 제한 해제', fn;
  END IF;
 END LOOP;
END $patch$;

-- 확인용: 아무 행도 안 나오면 해제 완료
SELECT p.oid::regprocedure AS fn
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname IN ('rebirth_private','public') AND p.prosrc LIKE '%BLOCKED_KIYA%';
