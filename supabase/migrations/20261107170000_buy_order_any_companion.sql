-- 2026-11-07 도현: 새 동료(예: 픽업 아우렐)도 거래소 구매 요청에 올릴 수 있게.
-- 동료 id를 하나하나 적어 두던 목록 대신 형식만 검사한다 — 앞으로 새 동료가 나와도 수정 없이 올라간다.
-- 실제로 팔 때는 판매자가 그 동료 카드를 가지고 있어야 하므로(fill 단계에서 카드 c 일치 검사) 없는 id로는 체결되지 않는다.
do $m$
declare def text; before text:=$b$k !~ '^companion:(s[1-8]|pickup-astria|pickup-celestia|a[1-3]|b[1-3]|c[1-3]|d[1-3]|f[1-4])$'$b$; after text:=$a$k !~ '^companion:[a-z0-9][a-z0-9-]{0,39}$'$a$;
begin
 def:=pg_get_functiondef('rebirth_private.buy_order'::regproc);
 if position(after in def)>0 then return; end if;
 if position(before in def)=0 then raise exception 'buy_order companion pattern not found'; end if;
 execute replace(def,before,after);
end $m$;
