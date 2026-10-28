-- 2026-10-29: 주간 로또 배율 20~30배 → 60~90배.
-- 8명이 매일 3장(주 168장, 판매금 168만)이면 상금이 최소 1억 80만부터 시작한다.
-- 화면의 예상 상금(min/max)도 실제 추첨 배율과 같게 맞춘다(기존 화면은 8~11배로 잘못 표시됨).
-- 당첨 번호 추첨 방식(1~18 랜덤, 1등만)과 이월 규칙은 그대로다.
do $m$
declare def text;
begin
 def:=pg_get_functiondef('rebirth_private.lotto_settle()'::regprocedure);
 if position('m:=20+floor(random()*11)::integer;' in def)=0 then raise exception 'LOTTO_SETTLE_DRIFT'; end if;
 execute replace(def,'m:=20+floor(random()*11)::integer;','m:=60+floor(random()*31)::integer;');
 def:=pg_get_functiondef('rebirth_private.lotto(text,jsonb,uuid)'::regprocedure);
 if position('r.sales*8+r.carry_in' in def)=0 or position('r.sales*11+r.carry_in' in def)=0 then raise exception 'LOTTO_DISPLAY_DRIFT'; end if;
 execute replace(replace(def,'r.sales*8+r.carry_in','r.sales*60+r.carry_in'),'r.sales*11+r.carry_in','r.sales*90+r.carry_in');
end $m$;
