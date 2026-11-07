-- 2026-11-07 23:40 도현: 링구코인 양봉 60% — 지금부터 11/8(한국 날짜) 끝까지, 11/9 자동 해제 (그 전 11/7 57%).
-- 2026-11-08 00:06 도현: 도현코인 양봉 57% — 11/8(한국 날짜) 하루, 11/9 자동 해제.
-- 운영 DB에는 coin_up_chance 함수 본문을 같은 내용으로 바꿔 적용함 (migrations coin_ringu_up60_20261108, coin_dohyun_up57_20261108).
do $m$
declare def text;
begin
 def:=pg_get_functiondef('rebirth_private.coin_up_chance'::regproc);
 if position('then .60' in def)=0 then
  def:=replace(def,$b$when p_coin=1 and (p_at at time zone 'Asia/Seoul')::date=date '2026-11-07' then .57$b$,$a$when p_coin=1 and (p_at at time zone 'Asia/Seoul')::date=date '2026-11-07' and p_at<timestamptz '2026-11-07 23:40:00+09' then .57
  when p_coin=1 and p_at>=timestamptz '2026-11-07 23:40:00+09' and (p_at at time zone 'Asia/Seoul')::date<=date '2026-11-08' then .60$a$);
 end if;
 if position($x$p_coin=0 and (p_at at time zone 'Asia/Seoul')::date=date '2026-11-08'$x$ in def)=0 then
  def:=replace(def,$b$ select case when p_coin=7$b$,$a$ select case when p_coin=0 and (p_at at time zone 'Asia/Seoul')::date=date '2026-11-08' then .57
  when p_coin=7$a$);
 end if;
 execute def;
end $m$;
