-- 2026-10-29: 코인 판매 수수료 절반 (레버리지 × 1% → 레버리지 × 0.5%). 직접 판매·카피 판매 모두.
do $m$
declare r record; def text;
begin
 for r in select p.oid, p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='rebirth_private' and p.proname in ('investment','coin_copy_sell') loop
  def:=pg_get_functiondef(r.oid);
  if position('gross*.01*pos.leverage' in def)>0 then def:=replace(def,'gross*.01*pos.leverage','gross*.005*pos.leverage');
  elsif position('gross*.01*f.leverage' in def)>0 then def:=replace(def,'gross*.01*f.leverage','gross*.005*f.leverage');
  else raise exception 'FEE_DRIFT %',r.proname; end if;
  execute def;
 end loop;
end $m$;
