-- 2026-10-12: test accounts (auth app_metadata.ringu_tester=true).
-- Admin-like reserves, hidden from every ranking/arena board, and no market trades, gold transfers or lottery tickets.
-- Testers are NOT administrators: no admin tools, no coin-direction controls, no admin transfers.
create or replace function rebirth_private.is_tester(p_user uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users where id=p_user and raw_app_meta_data->>'ringu_tester'='true')
$$;
revoke all on function rebirth_private.is_tester(uuid) from public,anon,authenticated;

create or replace function rebirth_private.admin_reserves() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.state is not null and exists(select 1 from auth.users where id=new.id and raw_app_meta_data->>'ringu_admin'='true') then
  new.state:=jsonb_set(jsonb_set(new.state,'{gold}','999999999999'::jsonb),'{materials}',
   coalesce(new.state->'materials','{}'::jsonb)||'{"scroll":999999999999,"fragment":999999999999,"cube":999999999999,"highCube":999999999999,"primeCube":999999999999}'::jsonb);
 elsif new.state is not null and exists(select 1 from auth.users where id=new.id and raw_app_meta_data->>'ringu_tester'='true') then
  new.state:=jsonb_set(jsonb_set(new.state||'{"isTester":true}'::jsonb,'{gold}','999999999999'::jsonb),'{materials}',
   coalesce(new.state->'materials','{}'::jsonb)||'{"scroll":999999999999,"fragment":999999999999,"cube":999999999999,"highCube":999999999999,"primeCube":999999999999,"potentialLock":999999999,"dungeonKey":999999999}'::jsonb);
  if jsonb_typeof(new.state->'fishing')='object' then new.state:=jsonb_set(new.state,'{fishing,diamonds}','999999999'::jsonb); end if;
 end if;
 return new;
end $$;
revoke all on function rebirth_private.admin_reserves() from public,anon,authenticated;

DO $migration$
DECLARE src text; n int; r record;
BEGIN
 FOR r IN SELECT * FROM (VALUES
  ('public.rebirth_rankings()', $p$u\.raw_app_meta_data->>'ringu_admin'='true'\)$p$, $p$(u.raw_app_meta_data->>'ringu_admin'='true' or u.raw_app_meta_data->>'ringu_tester'='true'))$p$),
  ('rebirth_private.coin_rankings()', $p$coalesce\(u\.raw_app_meta_data->>'ringu_admin','false'\)<>'true'$p$, $p$coalesce(u.raw_app_meta_data->>'ringu_admin','false')<>'true' and coalesce(u.raw_app_meta_data->>'ringu_tester','false')<>'true'$p$),
  ('rebirth_private.arena_settle_rewards()', $p$coalesce\(u\.raw_app_meta_data->>'ringu_admin','false'\)<>'true'$p$, $p$coalesce(u.raw_app_meta_data->>'ringu_admin','false')<>'true' and coalesce(u.raw_app_meta_data->>'ringu_tester','false')<>'true'$p$),
  ('rebirth_private.gold_transfer(jsonb,uuid)', $p$'INVALID_TRANSFER_SENDER'; end if;$p$, $p$'INVALID_TRANSFER_SENDER'; end if;
 if rebirth_private.is_tester(actor) then raise exception 'TESTER_BLOCKED'; end if;$p$),
  ('rebirth_private.gold_transfer(jsonb,uuid)', $p$id=target_id and raw_app_meta_data->>'ringu_admin'='true'\) then raise exception 'INVALID_TRANSFER_RECIPIENT'; end if;$p$, $p$id=target_id and raw_app_meta_data->>'ringu_admin'='true') then raise exception 'INVALID_TRANSFER_RECIPIENT'; end if;
 if rebirth_private.is_tester(target_id) then raise exception 'INVALID_TRANSFER_RECIPIENT'; end if;$p$),
  ('rebirth_private.admin_transfer(jsonb,uuid)', $p$id=recipient and raw_app_meta_data->>'ringu_admin'='true'\) then raise exception 'INVALID_TRANSFER_RECIPIENT'; end if;$p$, $p$id=recipient and raw_app_meta_data->>'ringu_admin'='true') then raise exception 'INVALID_TRANSFER_RECIPIENT'; end if;
 if rebirth_private.is_tester(recipient) then raise exception 'INVALID_TRANSFER_RECIPIENT'; end if;$p$),
  ('rebirth_private.arena_status()', $p$p\.id=ap\.user_id\s+where\s+ap\.season_start=v_season$p$, $p$p.id=ap.user_id where not rebirth_private.is_tester(ap.user_id) and ap.season_start=v_season$p$),
  ('rebirth_private.arena_status()', $p$p\.id=a\.user_id\s+where\s+a\.season_start=v_season$p$, $p$p.id=a.user_id where not rebirth_private.is_tester(a.user_id) and a.season_start=v_season$p$),
  ('rebirth_private.market(text,jsonb,uuid)', $p$u:=rebirth_private\.session_user\(\);$p$, $p$u:=rebirth_private.session_user();
 if p_action<>'list' and rebirth_private.is_tester(u) then raise exception 'TESTER_BLOCKED'; end if;$p$),
  ('rebirth_private.lotto(text,jsonb,uuid)', $p$u:=rebirth_private\.session_user\(\);$p$, $p$u:=rebirth_private.session_user();
 if p_action='buy' and rebirth_private.is_tester(u) then raise exception 'TESTER_BLOCKED'; end if;$p$)
 ) AS t(fn,pat,rep) LOOP
  src:=pg_get_functiondef(r.fn::regprocedure);
  SELECT count(*) INTO n FROM regexp_matches(src,r.pat,'g');
  IF n<>1 THEN RAISE EXCEPTION 'TESTER_DRIFT % (% matches)',r.fn,n; END IF;
  EXECUTE regexp_replace(src,r.pat,r.rep);
 END LOOP;
END;
$migration$;
