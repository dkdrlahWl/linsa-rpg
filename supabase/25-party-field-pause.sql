create or replace function public.ringu_party(p_action text,p_id uuid default null,p_stage integer default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; u uuid;
begin
 perform pg_advisory_xact_lock(70909,10);u:=ringu_private.require_session(false);
 if p_action in ('create','join','start') and (select state->'serverBattle' is not null and state->'serverBattle'<>'null'::jsonb from ringu_private.accounts where id=u) then raise exception 'BATTLE_IN_PROGRESS'; end if;
 result:=public.ringu_party_before_economy(p_action,p_id,p_stage);
 if p_action in ('create','join','start','leave','poll') and result->'room' is not null and result->'room'<>'null'::jsonb then
  update ringu_private.accounts set revision=revision+1,
   state=state||jsonb_build_object('serverClock',floor(extract(epoch from clock_timestamp())*1000),'serverCombat',null)
   where id=u;
 end if;
 return result;
end $$;
revoke all on function public.ringu_party(text,uuid,integer) from public,anon;
grant execute on function public.ringu_party(text,uuid,integer) to authenticated;
