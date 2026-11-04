-- 2026-11-04 도현: 전문 직업 도입에 맞춰 거래소 판매·구매 요청 품목 확장
-- + 에디셔널 큐브, 초월석, 추가옵션 불꽃, 픽업 소환권
do $m$
declare def text; before text; after text;
begin
 select pg_get_functiondef('rebirth_private.market(text,jsonb,uuid)'::regprocedure) into def;
 before:=$b$if material_key not in ('primeCube','cube','highCube','fragment','scroll','potentialLock','dungeonKey','diamond','companionTicket','treasureTicket') then raise exception 'INVALID_MATERIAL';end if;
   mat_path:=case when material_key='diamond' then array['fishing','diamonds'] when material_key='companionTicket' then array['companions','tickets'] when material_key='treasureTicket' then array['treasure','tickets'] else array['materials',material_key] end;$b$;
 after:=$a$if material_key not in ('primeCube','cube','highCube','fragment','scroll','potentialLock','dungeonKey','diamond','companionTicket','treasureTicket','addCube','transcendStone','bonusFlame','pickupTicket') then raise exception 'INVALID_MATERIAL';end if;
   mat_path:=case when material_key='diamond' then array['fishing','diamonds'] when material_key='companionTicket' then array['companions','tickets'] when material_key='pickupTicket' then array['companions','pickupTickets'] when material_key='treasureTicket' then array['treasure','tickets'] else array['materials',material_key] end;$a$;
 if position(before in def)=0 then raise exception 'MARKET_SELL_KEYS_NOT_FOUND';end if;
 def:=replace(def,before,after);
 -- 구매·취소 시 소모품 지급 경로도 같은 규칙(픽업 소환권 추가)
 before:=$b$material_key:=l.item->>'key';remaining:=(l.item->>'quantity')::bigint;
   mat_path:=case when material_key='diamond' then array['fishing','diamonds'] when material_key='companionTicket' then array['companions','tickets'] when material_key='treasureTicket' then array['treasure','tickets'] else array['materials',material_key] end;$b$;
 after:=$a$material_key:=l.item->>'key';remaining:=(l.item->>'quantity')::bigint;
   mat_path:=case when material_key='diamond' then array['fishing','diamonds'] when material_key='companionTicket' then array['companions','tickets'] when material_key='pickupTicket' then array['companions','pickupTickets'] when material_key='treasureTicket' then array['treasure','tickets'] else array['materials',material_key] end;$a$;
 if position(before in def)=0 then raise exception 'MARKET_BUY_KEY_NOT_FOUND';end if;
 execute replace(def,before,after);
end $m$;

-- 구매 요청(buy_order): 품목·경로 확장
create or replace function rebirth_private.buy_order_path(p_key text) returns text[]
language sql immutable set search_path to '' as $f$
 select case when p_key='diamond' then array['fishing','diamonds'] when p_key='companionTicket' then array['companions','tickets'] when p_key='pickupTicket' then array['companions','pickupTickets'] when p_key='treasureTicket' then array['treasure','tickets'] else array['materials',p_key] end
$f$;
do $m$
declare def text; before text; after text;
begin
 select pg_get_functiondef('rebirth_private.buy_order(text,jsonb,uuid)'::regprocedure) into def;
 before:=$b$k not in ('primeCube','cube','highCube','fragment','scroll','potentialLock','dungeonKey','diamond','companionTicket','treasureTicket')$b$;
 after:=$a$k not in ('primeCube','cube','highCube','fragment','scroll','potentialLock','dungeonKey','diamond','companionTicket','treasureTicket','addCube','transcendStone','bonusFlame','pickupTicket')$a$;
 if position(before in def)=0 then raise exception 'BUY_ORDER_KEYS_NOT_FOUND';end if;
 execute replace(def,before,after);
end $m$;
