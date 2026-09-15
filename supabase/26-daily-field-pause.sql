-- Preserve weekly-boss exclusion and also exclude the daily boss time window.
create or replace function public.ringu_economy_snapshot(p_request_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;blocked_until timestamptz;daily_until timestamptz;previous_clock numeric;t timestamptz:=clock_timestamp();
begin
 result:=public.ringu_economy_snapshot_before_world_boss(p_request_id);
 previous_clock:=coalesce((result#>>'{state,serverClock}')::numeric,(result#>>'{state,lastSeen}')::numeric,extract(epoch from t)*1000);
 select max(coalesce(m.left_at,r.ended_at)) into blocked_until from ringu_private.wb_members m
  join ringu_private.wb_rooms r on r.id=m.room_id where m.account_id=auth.uid()
  and coalesce(m.left_at,r.ended_at)>to_timestamp(previous_clock/1000);
 select max(least(ends_at,t)) into daily_until from ringu_private.daily_boss_runs
  where account_id=auth.uid() and ends_at>to_timestamp(previous_clock/1000) and started_at<=t;
 blocked_until:=greatest(blocked_until,daily_until);
 if blocked_until is not null then
  result:=jsonb_set(result,'{state,serverClock}',to_jsonb(floor(extract(epoch from blocked_until)*1000)));
  result:=jsonb_set(result,'{state,serverCombat}','null'::jsonb);
 end if;
 return result||jsonb_build_object('partyBusy',coalesce((result->>'partyBusy')::boolean,false)
  or exists(select 1 from ringu_private.wb_members where account_id=auth.uid() and active)
  or exists(select 1 from ringu_private.daily_boss_runs where account_id=auth.uid() and ends_at>t));
end $$;
revoke all on function public.ringu_economy_snapshot(uuid) from public,anon;
grant execute on function public.ringu_economy_snapshot(uuid) to authenticated,service_role;
