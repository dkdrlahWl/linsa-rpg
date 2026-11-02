-- 2026-11-02 도현: 코인 판매 수수료 3% → 1% (일반·카피 공통, 판매 금액 기준)
DO $migration$
DECLARE src text; f regprocedure;
BEGIN
 FOREACH f IN ARRAY ARRAY['rebirth_private.investment(text,jsonb,uuid)'::regprocedure,
                          'rebirth_private.coin_copy_sell(uuid,integer,text,smallint)'::regprocedure,
                          'rebirth_private.coin_copy_sell(uuid,integer,text,smallint,boolean)'::regprocedure] LOOP
  src:=pg_get_functiondef(f);
  IF (length(src)-length(replace(src,'ceil(gross*.03)','')))/length('ceil(gross*.03)')<>1 THEN RAISE EXCEPTION 'FEE_DRIFT %',f; END IF;
  EXECUTE replace(src,'ceil(gross*.03)','ceil(gross*.01)');
 END LOOP;
END;
$migration$;
