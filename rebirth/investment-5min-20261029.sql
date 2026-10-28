-- 2026-10-29: 코인 시세 변동 주기 15분 → 5분. 한 번 변동 폭(일반 1~5% 등)과 일일 ±30% 상·하한은 그대로.
do $m$
declare r record; def text;
begin
 for r in select p.oid, n.nspname||'.'||p.proname fn from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='rebirth_private' and p.proname in ('coin_tick','coin_tick_due','investment','admin_coin_direction') loop
  def:=pg_get_functiondef(r.oid);
  if position('15 minutes' in def)=0 then raise exception 'COIN5_DRIFT %',r.fn; end if;
  execute replace(def,'15 minutes','5 minutes');
 end loop;
end $m$;

-- 2026-10-29: 일반 변동(뉴스 아닌 5분 변동) 한 번 폭 1~5% → 1~3%. 뉴스 속보 변동 폭은 그대로.
do $m$
declare def text;
begin
 def:=pg_get_functiondef('rebirth_private.coin_tick()'::regprocedure);
 if (length(def)-length(replace(def,'(.01+random()*.04)','')))/length('(.01+random()*.04)')<>1 then raise exception 'COIN_CHANGE_DRIFT'; end if;
 execute replace(def,'(.01+random()*.04)','(.01+random()*.02)');
end $m$;
