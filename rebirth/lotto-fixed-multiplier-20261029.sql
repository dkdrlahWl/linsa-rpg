-- 2026-10-29: 로또 배율을 회차가 시작될 때(라운드 생성 시) 60~90배 중 하나로 미리 정한다.
-- 예상 당첨금 = 판매금 × 이번 주 배율 + 이월금 (살 때마다 늘어남). 추첨은 정해 둔 배율을 그대로 쓴다.
alter table rebirth_private.lotto_rounds drop constraint lotto_rounds_multiplier_check;
alter table rebirth_private.lotto_rounds add constraint lotto_rounds_multiplier_check check (multiplier >= 8 and multiplier <= 90);
do $m$
declare def text; p text;
begin
 def:=pg_get_functiondef('rebirth_private.lotto_settle()'::regprocedure);
 if position('m:=60+floor(random()*31)::integer;' in def)=0 or position('insert into rebirth_private.lotto_rounds(draw_at,carry_in) values(r.draw_at+interval ''7 days'',case when winners=0 then total else 0 end)' in def)=0 then raise exception 'SETTLE_DRIFT'; end if;
 p:=replace(def,'m:=60+floor(random()*31)::integer;','m:=coalesce(r.multiplier,60+floor(random()*31)::integer);');
 p:=replace(p,'insert into rebirth_private.lotto_rounds(draw_at,carry_in) values(r.draw_at+interval ''7 days'',case when winners=0 then total else 0 end)','insert into rebirth_private.lotto_rounds(draw_at,carry_in,multiplier) values(r.draw_at+interval ''7 days'',case when winners=0 then total else 0 end,60+floor(random()*31)::integer)');
 execute p;
 def:=pg_get_functiondef('rebirth_private.lotto(text,jsonb,uuid)'::regprocedure);
 if position('insert into rebirth_private.lotto_rounds(draw_at) values(draw) on conflict do nothing;' in def)=0 or position('''minPrize'',r.sales*60+r.carry_in,''maxPrize'',r.sales*90+r.carry_in,' in def)=0 then raise exception 'LOTTO_DRIFT'; end if;
 p:=replace(def,'insert into rebirth_private.lotto_rounds(draw_at) values(draw) on conflict do nothing;','insert into rebirth_private.lotto_rounds(draw_at,multiplier) values(draw,60+floor(random()*31)::integer) on conflict do nothing;
 update rebirth_private.lotto_rounds set multiplier=60+floor(random()*31)::integer where draw_at=draw and multiplier is null;');
 p:=replace(p,'''minPrize'',r.sales*60+r.carry_in,''maxPrize'',r.sales*90+r.carry_in,','''multiplier'',r.multiplier,''expectedPrize'',r.sales*r.multiplier+r.carry_in,''minPrize'',r.sales*r.multiplier+r.carry_in,''maxPrize'',r.sales*r.multiplier+r.carry_in,');
 execute p;
end $m$;
update rebirth_private.lotto_rounds set multiplier=60+floor(random()*31)::integer where settled_at is null and multiplier is null;
