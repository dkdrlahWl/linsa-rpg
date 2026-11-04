-- 2026-11-04 도현: 모든 소모품 거래소 판매·구매 요청 가능 (+ 기본수치 재련석, 링구의 머리카락, 행운 물약, 종족 주사위)
do $m$
declare def text; k_old text:=$k$'essence','mapPiece','pearl','ore')$k$; k_new text:=$k$'essence','mapPiece','pearl','ore','rerollStone','ringuHair','luckPotion','tribeTicket')$k$;
 p_old text:=$p$when material_key='pickupTicket' then array['companions','pickupTickets']$p$;
 p_new text:=$p$when material_key='pickupTicket' then array['companions','pickupTickets'] when material_key='luckPotion' then array['consumables','luckPotion'] when material_key='tribeTicket' then array['tribeGacha','tickets']$p$;
begin
 select pg_get_functiondef('rebirth_private.market(text,jsonb,uuid)'::regprocedure) into def;
 if position(k_old in def)=0 or position(p_old in def)=0 then raise exception 'MARKET_PATCH_NOT_FOUND';end if;
 execute replace(replace(def,k_old,k_new),p_old,p_new);
 select pg_get_functiondef('rebirth_private.buy_order(text,jsonb,uuid)'::regprocedure) into def;
 if position(k_old in def)=0 then raise exception 'BUY_ORDER_PATCH_NOT_FOUND';end if;
 execute replace(def,k_old,k_new);
end $m$;
create or replace function rebirth_private.buy_order_path(p_key text) returns text[]
language sql immutable set search_path to '' as $f$
 select case when p_key='diamond' then array['fishing','diamonds'] when p_key='companionTicket' then array['companions','tickets'] when p_key='pickupTicket' then array['companions','pickupTickets'] when p_key='treasureTicket' then array['treasure','tickets'] when p_key='luckPotion' then array['consumables','luckPotion'] when p_key='tribeTicket' then array['tribeGacha','tickets'] else array['materials',p_key] end
$f$;
