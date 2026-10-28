-- 2026-10-29: 코인 시세 변동 주기 30분 → 15분. 한 번 변동 폭(일반 1~5% 등)과 일일 ±30% 상·하한은 그대로.
do $m$
declare r record; def text;
begin
 for r in select p.oid, n.nspname||'.'||p.proname fn from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='rebirth_private' and p.proname in ('coin_tick','coin_tick_due','investment','admin_coin_direction') loop
  def:=pg_get_functiondef(r.oid);
  if position('30 minutes' in def)=0 then raise exception 'COIN15_DRIFT %',r.fn; end if;
  execute replace(def,'30 minutes','15 minutes');
 end loop;
end $m$;
