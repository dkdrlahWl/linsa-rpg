-- 2026-10-30: 한국 00시에도 시세가 변동한다. 00시 틱에서 오늘 기준가를 직전 가격으로 바꿔 등락률을 0%로
-- 초기화한 뒤(기존 동작), 같은 틱에서 일반 변동을 그대로 적용한다. 기존에는 00시 틱만 가격이 멈춰 있었다.
do $m$
declare def text; a text:='elsif forced_side is not null or (ev.at at time zone ''Asia/Seoul'')::time<>time ''00:00'' then';
begin
 def:=pg_get_functiondef('rebirth_private.coin_tick()'::regprocedure);
 if position(a in def)=0 then raise exception 'COIN_MIDNIGHT_DRIFT'; end if;
 execute replace(def,a,'elsif true then');
end $m$;
