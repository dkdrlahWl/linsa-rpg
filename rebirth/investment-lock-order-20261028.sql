-- 2026-10-28: 코인 전역 잠금(71823081) 때문에 저녁 피크에 로딩·저장이 줄줄이 시간 초과되던 문제 수정.
-- 1) 뉴스 알림·뉴스 목록·투자 목록 조회는 시세 갱신이 "필요할 때만" coin_tick을 부른다(대부분 잠금 없이 끝남).
-- 2) 투자 목록 조회(list)는 캐릭터 행을 for update로 잠그지 않는다.
-- 3) 매수·매도는 캐릭터 행 → 전역 잠금 순서로 잡는다(전역 잠금을 쥔 채 게임 저장을 기다리지 않음).
-- 시세·뉴스·청산 계산식은 바꾸지 않는다.

create or replace function rebirth_private.coin_tick_due() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from rebirth_private.coin_market where tick_at < date_bin(interval '30 minutes',clock_timestamp(),timestamptz '2000-01-01 00:00:00+00'))
     or exists(select 1 from rebirth_private.coin_news where applied_at is null and published_at<=clock_timestamp())
     or coalesce((select max(day) from rebirth_private.coin_news_days),date '2000-01-01') < (date_bin(interval '30 minutes',clock_timestamp(),timestamptz '2000-01-01 00:00:00+00') at time zone 'Asia/Seoul')::date
$$;
revoke all on function rebirth_private.coin_tick_due() from public,anon,authenticated;

create or replace function rebirth_private.coin_tick_if_due() returns void language plpgsql security definer set search_path='' as $$
begin
 if rebirth_private.coin_tick_due() then perform rebirth_private.coin_tick(); end if;
end $$;
revoke all on function rebirth_private.coin_tick_if_due() from public,anon,authenticated;

do $migrate$
declare def text; patched text;
begin
 -- 뉴스 알림·뉴스 목록: 필요할 때만 갱신
 foreach def in array array[
   pg_get_functiondef('rebirth_private.coin_news_notifications(uuid[])'::regprocedure),
   pg_get_functiondef('rebirth_private.coin_activity(text,timestamptz,uuid)'::regprocedure)] loop
  patched:=replace(def,'perform rebirth_private.coin_tick();','perform rebirth_private.coin_tick_if_due();');
  if patched=def then raise exception 'PATCH_NOT_APPLIED'; end if;
  execute patched;
 end loop;
 -- 투자: 조회는 무잠금, 매매는 캐릭터 행 → 전역 잠금
 def:=pg_get_functiondef('rebirth_private.investment(text,jsonb,uuid)'::regprocedure);
 patched:=replace(def,
' perform pg_advisory_xact_lock(71823081);
 u:=rebirth_private.session_user();
 perform rebirth_private.coin_tick();
 v_now:=clock_timestamp();
 select * into p from rebirth_private.players where id=u for update;
',
' u:=rebirth_private.session_user();
 if p_action=''list'' then
  perform rebirth_private.coin_tick_if_due();
  select * into p from rebirth_private.players where id=u;
 else
  select * into p from rebirth_private.players where id=u for update;
  perform pg_advisory_xact_lock(71823081);
  perform rebirth_private.coin_tick();
 end if;
 v_now:=clock_timestamp();
');
 if patched=def then raise exception 'PATCH_NOT_APPLIED'; end if;
 execute patched;
end $migrate$;
