-- 2026-11-04 도현: 직업 재료 4종(마력 정수·고대 지도 조각·심해 진주·원석) 거래소·구매 요청 거래 가능
do $m$
declare def text; before text; after text;
begin
 select pg_get_functiondef('rebirth_private.market(text,jsonb,uuid)'::regprocedure) into def;
 before:=$b$'addCube','transcendStone','bonusFlame','pickupTicket') then raise exception 'INVALID_MATERIAL';end if;$b$;
 after:=$a$'addCube','transcendStone','bonusFlame','pickupTicket','essence','mapPiece','pearl','ore') then raise exception 'INVALID_MATERIAL';end if;$a$;
 if position(before in def)=0 then raise exception 'MARKET_KEYS_NOT_FOUND';end if;
 execute replace(def,before,after);
 select pg_get_functiondef('rebirth_private.buy_order(text,jsonb,uuid)'::regprocedure) into def;
 before:=$b$'addCube','transcendStone','bonusFlame','pickupTicket')$b$;
 after:=$a$'addCube','transcendStone','bonusFlame','pickupTicket','essence','mapPiece','pearl','ore')$a$;
 if position(before in def)=0 then raise exception 'BUY_ORDER_KEYS_NOT_FOUND';end if;
 execute replace(def,before,after);
end $m$;
