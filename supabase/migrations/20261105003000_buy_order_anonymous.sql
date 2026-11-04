-- 2026-11-05 도현: 구매 요청 등록자 이름 비공개 (목록에서 buyer_name 제거, 판매자 우편 문구 익명)
do $m$
declare def text; a text; b text;
begin
 select pg_get_functiondef('rebirth_private.buy_order(text,jsonb,uuid)'::regprocedure) into def;
 a:=$x$,b.buyer=u own,coalesce(pl.state->>'name','?') buyer_name$x$; b:=$x$,b.buyer=u own$x$;
 if position(a in def)=0 then raise exception 'A1';end if; def:=replace(def,a,b);
 a:=$x$'구매 요청 판매 대금',coalesce((select pb.state->>'name' from rebirth_private.players pb where pb.id=o.buyer),'?')||'님의 구매 요청에 '||qty||'개를 팔았어요.'$x$;
 b:=$x$'구매 요청 판매 대금','구매 요청에 '||qty||'개를 팔았어요.'$x$;
 if position(a in def)=0 then raise exception 'A2';end if; def:=replace(def,a,b);
 execute def;
end $m$;
