-- 2026-10-31: 카피 리더 보상 5% → 10% (이후 카피 수익 거래부터, 보상함에 적립)
do $m$
declare def text;
begin
 def:=pg_get_functiondef('rebirth_private.coin_copy_sell(uuid,integer,text,smallint,boolean)'::regprocedure);
 if position('floor((v_payout-v_a)*.05)' in def)=0 then raise exception 'COPY_REWARD10_DRIFT'; end if;
 execute replace(def,'floor((v_payout-v_a)*.05)','floor((v_payout-v_a)*.10)');
end $m$;
