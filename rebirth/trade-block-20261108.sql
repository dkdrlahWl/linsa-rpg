-- 2026-11-08 도현: 원자이 송금·거래소 이용 금지.
-- rebirth_private.trade_blocks에 있는 유저는 거래소(판매·구매·취소·구매요청·구매요청 판매)와
-- 골드 송금(보내기·받기·수령)을 못 한다. 그 유저가 올린 판매글·구매요청도 다른 사람이 거래할 수 없다.
-- 해제: delete from rebirth_private.trade_blocks where user_id='...';
create table if not exists rebirth_private.trade_blocks(user_id uuid primary key references rebirth_private.players(id), reason text, created_at timestamptz not null default now());
revoke all on rebirth_private.trade_blocks from public, anon, authenticated;
insert into rebirth_private.trade_blocks(user_id,reason) values ('16f8807f-77d4-41de-a4a1-07bde78b7e6f','원자이 — 도현 요청으로 송금·거래소 금지') on conflict do nothing;

DO $migration$
DECLARE src text; guard text;
BEGIN
 -- market: 본인 차단 + 차단된 판매자의 판매글 거래 금지
 src:=pg_get_functiondef('rebirth_private.market(text,jsonb,uuid)'::regprocedure);
 IF (length(src)-length(replace(src,' select * into p from rebirth_private.players where id=u for update;','')))/length(' select * into p from rebirth_private.players where id=u for update;')<>1
  OR (length(src)-length(replace(src,'  select * into l from rebirth_private.listings where id=(p_args->>''id'')::uuid for update;','')))/length('  select * into l from rebirth_private.listings where id=(p_args->>''id'')::uuid for update;')<>1
  OR strpos(src,'trade_blocks')>0 THEN RAISE EXCEPTION 'MARKET_SOURCE_DRIFT'; END IF;
 src:=replace(src,' select * into p from rebirth_private.players where id=u for update;',
  ' select * into p from rebirth_private.players where id=u for update;'||chr(10)||' if exists(select 1 from rebirth_private.trade_blocks b where b.user_id=u) then raise exception ''NO_TRADE_PERMISSION''; end if;');
 src:=replace(src,'  select * into l from rebirth_private.listings where id=(p_args->>''id'')::uuid for update;',
  '  select * into l from rebirth_private.listings where id=(p_args->>''id'')::uuid for update;'||chr(10)||'  if exists(select 1 from rebirth_private.trade_blocks b where b.user_id=l.seller) then raise exception ''NO_TRADE_PERMISSION''; end if;');
 EXECUTE src;

 -- buy_order: 본인 차단 + 차단된 구매자의 구매요청 거래 금지
 src:=pg_get_functiondef('rebirth_private.buy_order(text,jsonb,uuid)'::regprocedure);
 IF (length(src)-length(replace(src,' select * into p from rebirth_private.players where id=u for update;','')))/length(' select * into p from rebirth_private.players where id=u for update;')<>1
  OR strpos(src,'select * into s from rebirth_private.players where id=o.buyer for update;')=0
  OR strpos(src,'trade_blocks')>0 THEN RAISE EXCEPTION 'BUY_ORDER_SOURCE_DRIFT'; END IF;
 src:=replace(src,' select * into p from rebirth_private.players where id=u for update;',
  ' select * into p from rebirth_private.players where id=u for update;'||chr(10)||' if exists(select 1 from rebirth_private.trade_blocks b where b.user_id=u) then raise exception ''NO_TRADE_PERMISSION''; end if;');
 src:=replace(src,'select * into s from rebirth_private.players where id=o.buyer for update;',
  'select * into s from rebirth_private.players where id=o.buyer for update; if exists(select 1 from rebirth_private.trade_blocks b where b.user_id=o.buyer) then raise exception ''NO_TRADE_PERMISSION''; end if;');
 EXECUTE src;

 -- gold_transfer: 보내는 쪽·받는 쪽 둘 다
 src:=pg_get_functiondef('rebirth_private.gold_transfer(jsonb,uuid)'::regprocedure);
 IF (length(src)-length(replace(src,' target_id:=(p_args->>''recipient'')::uuid;','')))/length(' target_id:=(p_args->>''recipient'')::uuid;')<>1 OR strpos(src,'trade_blocks')>0 THEN RAISE EXCEPTION 'TRANSFER_SOURCE_DRIFT'; END IF;
 src:=replace(src,' target_id:=(p_args->>''recipient'')::uuid;',
  ' target_id:=(p_args->>''recipient'')::uuid;'||chr(10)||' if exists(select 1 from rebirth_private.trade_blocks b where b.user_id in (actor,target_id)) then raise exception ''NO_TRADE_PERMISSION''; end if;');
 EXECUTE src;

 -- 송금 우편 수령
 src:=pg_get_functiondef('rebirth_private.claim_gold_transfer_mail(uuid,uuid)'::regprocedure);
 IF (length(src)-length(replace(src,' actor:=rebirth_private.session_user();','')))/length(' actor:=rebirth_private.session_user();')<>1 OR strpos(src,'trade_blocks')>0 THEN RAISE EXCEPTION 'CLAIM_SOURCE_DRIFT'; END IF;
 src:=replace(src,' actor:=rebirth_private.session_user();',
  ' actor:=rebirth_private.session_user();'||chr(10)||' if exists(select 1 from rebirth_private.trade_blocks b where b.user_id=actor) then raise exception ''NO_TRADE_PERMISSION''; end if;');
 EXECUTE src;
END;
$migration$;
