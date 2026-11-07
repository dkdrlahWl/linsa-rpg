-- 2026-11-07 도현: 로또 1등이 6명 매일 참여(주 126장 = 126만 G) 기준 평균 약 4억이 되게.
-- 배율 60~90배(평균 75 → 약 9,450만) → 254~381배(평균 약 317 → 약 4억, 범위 약 3.2억~4.8억). 이월금은 그대로 더해진다.
-- 이미 열려 있는 이번 주 회차(아직 추첨 전)도 새 범위로 다시 정한다.
alter table rebirth_private.lotto_rounds drop constraint if exists lotto_rounds_multiplier_check;
alter table rebirth_private.lotto_rounds add constraint lotto_rounds_multiplier_check check (multiplier between 8 and 400);
do $m$
declare fn text; def text; before text:='60+floor(random()*31)'; after text:='254+floor(random()*128)';
begin
 foreach fn in array array['rebirth_private.lotto','rebirth_private.lotto_settle'] loop
  def:=pg_get_functiondef(fn::regproc);
  if position(after in def)>0 then continue; end if;
  if position(before in def)=0 then raise exception '% multiplier pattern not found',fn; end if;
  execute replace(def,before,after);
 end loop;
end $m$;
update rebirth_private.lotto_rounds set multiplier=254+floor(random()*128)::integer where settled_at is null and multiplier<254;
