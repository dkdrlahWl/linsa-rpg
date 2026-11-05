-- 2026-11-05 도현: 테스터 계정도 유저 포지션 보기 허용 (읽기 전용).
do $m$
declare def text; a text;
begin
 select pg_get_functiondef('rebirth_private.admin_positions()'::regprocedure) into def;
 a:=$x$raw_app_meta_data->>'ringu_admin'='true') then raise exception 'BETA_DISABLED';$x$;
 if position(a in def)=0 then raise exception 'AP1';end if;
 def:=replace(def,a,$x$(raw_app_meta_data->>'ringu_admin'='true' or raw_app_meta_data->>'ringu_tester'='true')) then raise exception 'BETA_DISABLED';$x$);
 execute def;
end $m$;
