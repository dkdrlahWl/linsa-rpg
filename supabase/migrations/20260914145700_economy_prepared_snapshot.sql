begin;
-- One round trip replaces status settlement plus two full-state snapshot reads.
-- Take the shared economy lock BEFORE account locks: settlement may pay other users.
create function public.ringu_economy_prepare(p_request_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid; daily jsonb;
begin
 perform pg_advisory_xact_lock(70909,10);
 u:=ringu_private.require_session(false);
 if exists(select 1 from ringu_private.auction_release where singleton and economy_ready)
    and exists(select 1 from ringu_private.auction_accounts where account_id=u) then
  daily:=public.ringu_daily_boss(u,(auth.jwt()->>'session_id')::uuid);
 end if;
 return public.ringu_economy_snapshot(p_request_id)||jsonb_build_object('dailyBoss',daily);
end $$;
revoke all on function public.ringu_economy_prepare(uuid) from public,anon;
grant execute on function public.ringu_economy_prepare(uuid) to authenticated;
commit;
