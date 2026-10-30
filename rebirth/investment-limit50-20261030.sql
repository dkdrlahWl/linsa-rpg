-- 2026-10-30: 코인 일일 상·하한 ±30% → ±50%. 변동 주기·한 번 변동 폭·속보는 그대로.
do $m$
declare r record; def text;
begin
 select p.oid into r from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='rebirth_private' and p.proname='coin_tick';
 def:=pg_get_functiondef(r.oid);
 if position('floor(base*1.30)' in def)=0 or position('ceil(base*.70)' in def)=0 then raise exception 'COIN_LIMIT50_DRIFT'; end if;
 execute replace(replace(def,'floor(base*1.30)','floor(base*1.50)'),'ceil(base*.70)','ceil(base*.50)');
end $m$;
