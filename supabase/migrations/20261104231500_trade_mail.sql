-- 2026-11-04 도현: 거래 결과를 우편(rewardMailbox kind='trade')으로 지급.
-- 거래소 구매(구매자: 물건), 판매 대금(판매자: 골드), 구매 요청 체결(요청자: 물건, 판매자: 골드), 구매 요청 만료 환불(골드).
-- 본인 판매 취소·구매 요청 취소는 즉시 반환(그대로).
create or replace function rebirth_private.trade_mail(p_state jsonb,p_title text,p_msg text,p_rewards jsonb,p_items jsonb default '[]'::jsonb) returns jsonb
language sql volatile set search_path to '' as $f$
 select jsonb_set(jsonb_set(p_state,'{rewardMailbox}',coalesce(p_state->'rewardMailbox','[]'::jsonb)||jsonb_build_array(m)),'{systemMailbox}',coalesce(p_state->'systemMailbox','[]'::jsonb)||jsonb_build_array(m))
 from (select jsonb_build_object('id','trade-'||gen_random_uuid(),'kind','trade','sender','거래소','title',p_title,'message',p_msg,'rewards',coalesce(p_rewards,'{}'::jsonb),'items',coalesce(p_items,'[]'::jsonb),'sentAt',to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"')) m) x
$f$;
revoke all on function rebirth_private.trade_mail(jsonb,text,text,jsonb,jsonb) from public,anon,authenticated;

do $m$
declare def text; a text; b text;
procedure_ok boolean;
begin
 select pg_get_functiondef('rebirth_private.market(text,jsonb,uuid)'::regprocedure) into def;
 -- 소모품 구매: 구매자 골드 차감 + 물건은 우편
 a:=$x$update rebirth_private.players set state=jsonb_set(jsonb_set(case when state->mat_path[1] is null or jsonb_typeof(state->mat_path[1])<>'object' then state||jsonb_build_object(mat_path[1],case when mat_path[1]='fishing' then fish_default else '{}'::jsonb end) else state end,mat_path,to_jsonb(coalesce((state#>>mat_path)::bigint,0)+quantity)),'{gold}',to_jsonb((state->>'gold')::bigint-total_price)),revision=revision+1,updated_at=now() where id=u;$x$;
 b:=$x$update rebirth_private.players set state=rebirth_private.trade_mail(jsonb_set(state,'{gold}',to_jsonb((state->>'gold')::bigint-total_price)),'거래소 구매 완료',coalesce(v_seller.state->>'name','?')||'님에게서 구매했어요.',jsonb_build_object(material_key,quantity)),revision=revision+1,updated_at=now() where id=u;$x$;
 if position(a in def)=0 then raise exception 'P1';end if; def:=replace(def,a,b);
 -- 소모품 판매 대금
 a:=$x$update rebirth_private.players set state=jsonb_set(state,'{gold}',to_jsonb((state->>'gold')::bigint+total_price-v_fee)),revision=revision+1,updated_at=now() where id=l.seller;$x$;
 b:=$x$update rebirth_private.players set state=rebirth_private.trade_mail(state,'거래소 판매 대금',coalesce(p.state->>'name','?')||'님이 '||quantity||'개를 구매했어요.',jsonb_build_object('gold',total_price-v_fee)),revision=revision+1,updated_at=now() where id=l.seller;$x$;
 if position(a in def)=0 then raise exception 'P2';end if; def:=replace(def,a,b);
 -- 장비 구매: 가방 가득 검사는 취소에만
 a:=$x$if jsonb_array_length(p.state->'items')>=300 then raise exception 'INVENTORY_FULL'; end if;$x$;
 b:=$x$if p_action='cancel' and jsonb_array_length(p.state->'items')>=300 then raise exception 'INVENTORY_FULL'; end if;$x$;
 if position(a in def)=0 then raise exception 'P3';end if; def:=replace(def,a,b);
 a:=$x$update rebirth_private.players set state=jsonb_set(jsonb_set(state,'{items}',(state->'items')||jsonb_build_array(case when coalesce((l.item->>'hairUnbound')::boolean,false) then (l.item-'hairUnbound')||'{"bound":true}'::jsonb else l.item end)),'{gold}',to_jsonb((state->>'gold')::bigint-l.price)),revision=revision+1,updated_at=now() where id=u;$x$;
 b:=$x$update rebirth_private.players set state=rebirth_private.trade_mail(jsonb_set(state,'{gold}',to_jsonb((state->>'gold')::bigint-l.price)),'거래소 구매 완료',coalesce(v_seller.state->>'name','?')||'님에게서 구매한 장비예요.','{}'::jsonb,jsonb_build_array(case when coalesce((l.item->>'hairUnbound')::boolean,false) then (l.item-'hairUnbound')||'{"bound":true}'::jsonb else l.item end)),revision=revision+1,updated_at=now() where id=u;$x$;
 if position(a in def)=0 then raise exception 'P4';end if; def:=replace(def,a,b);
 a:=$x$update rebirth_private.players set state=jsonb_set(state,'{gold}',to_jsonb((state->>'gold')::bigint+l.price)),revision=revision+1,updated_at=now() where id=l.seller;$x$;
 b:=$x$update rebirth_private.players set state=rebirth_private.trade_mail(state,'거래소 판매 대금',coalesce(p.state->>'name','?')||'님이 장비를 구매했어요.',jsonb_build_object('gold',l.price)),revision=revision+1,updated_at=now() where id=l.seller;$x$;
 if position(a in def)=0 then raise exception 'P5';end if; def:=replace(def,a,b);
 execute def;

 select pg_get_functiondef('rebirth_private.buy_order(text,jsonb,uuid)'::regprocedure) into def;
 a:=$x$update rebirth_private.players set state=jsonb_set(jsonb_set(state,path,to_jsonb((state#>>path)::bigint-qty)),'{gold}',to_jsonb((state->>'gold')::bigint+total)),revision=revision+1,updated_at=now() where id=u;$x$;
 b:=$x$update rebirth_private.players set state=rebirth_private.trade_mail(jsonb_set(state,path,to_jsonb((state#>>path)::bigint-qty)),'구매 요청 판매 대금',coalesce((select pb.state->>'name' from rebirth_private.players pb where pb.id=o.buyer),'?')||'님의 구매 요청에 '||qty||'개를 팔았어요.',jsonb_build_object('gold',total)),revision=revision+1,updated_at=now() where id=u;$x$;
 if position(a in def)=0 then raise exception 'P6';end if; def:=replace(def,a,b);
 a:=$x$update rebirth_private.players set state=rebirth_private.buy_order_add(state,o.key,qty),revision=revision+1,updated_at=now() where id=o.buyer;$x$;
 b:=$x$update rebirth_private.players set state=rebirth_private.trade_mail(state,'구매 요청 체결',coalesce((select ps.state->>'name' from rebirth_private.players ps where ps.id=u),'?')||'님이 '||qty||'개를 팔았어요.',jsonb_build_object(o.key,qty)),revision=revision+1,updated_at=now() where id=o.buyer;$x$;
 if position(a in def)=0 then raise exception 'P7';end if; def:=replace(def,a,b);
 execute def;

 select pg_get_functiondef('rebirth_private.buy_order_expire()'::regprocedure) into def;
 a:=$x$update rebirth_private.players set state=jsonb_set(state,'{gold}',to_jsonb(least(9000000000000,(state->>'gold')::bigint+o.price*o.quantity))),revision=revision+1,updated_at=now() where id=o.buyer;$x$;
 b:=$x$update rebirth_private.players set state=rebirth_private.trade_mail(state,'구매 요청 만료 환불','기간이 끝난 구매 요청의 남은 금액이에요.',jsonb_build_object('gold',o.price*o.quantity)),revision=revision+1,updated_at=now() where id=o.buyer;$x$;
 if position(a in def)=0 then raise exception 'P8';end if; def:=replace(def,a,b);
 execute def;
end $m$;
