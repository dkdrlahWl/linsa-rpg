do $patch$
declare definition text;
begin
 perform pg_advisory_xact_lock(71823001);
 definition:=pg_get_functiondef('rebirth_private.market(text,jsonb,uuid)'::regprocedure);
 if position('v_fee:=(l.gross_sold+total_price)/20-l.fee_paid;' in definition)=0
 or position('floor(l.price*.95)::bigint' in definition)=0
 or position('''fee'',l.price-floor(l.price*.95)' in definition)=0
 then raise exception 'MARKET_FEE_SOURCE_DRIFT'; end if;
 definition:=replace(definition,'v_fee:=(l.gross_sold+total_price)/20-l.fee_paid;','v_fee:=0;');
 definition:=replace(definition,'floor(l.price*.95)::bigint','l.price');
 definition:=replace(definition,'''fee'',l.price-floor(l.price*.95)','''fee'',0');
 execute definition;
end $patch$;
