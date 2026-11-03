-- 2026-11-03 도현: 링구의 머리카락. 거래소에서 장비를 산 사람에게 hairUnbound 장비가 가면 다시 거래 불가(bound)로 바꾼다.
-- 판매 취소로 판 사람에게 돌아오는 경우는 그대로(아직 거래 1회 가능).
-- 살아 있는 rebirth_private.market 정의에서 장비 구매 지급 식 하나만 바꾼다(다른 부분은 그대로).
do $$
declare d text; old_expr text := $o$jsonb_build_array(l.item)),'{gold}'$o$;
        new_expr text := $n$jsonb_build_array(case when coalesce((l.item->>'hairUnbound')::boolean,false) then (l.item-'hairUnbound')||'{"bound":true}'::jsonb else l.item end)),'{gold}'$n$;
begin
  select pg_get_functiondef(p.oid) into d from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='rebirth_private' and p.proname='market';
  if position(new_expr in d)>0 then return; end if;
  if (length(d)-length(replace(d,old_expr,'')))/length(old_expr)<>1 then raise exception 'market buy expression not found exactly once'; end if;
  execute replace(d,old_expr,new_expr);
end $$;
