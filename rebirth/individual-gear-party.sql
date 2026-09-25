-- Retired: only cooperative rifts remain.
create or replace function public.rebirth_party_action(p_user uuid,p_session uuid,p_epoch uuid,p_revision bigint,p_state jsonb,p_action text,p_args jsonb,p_power jsonb,p_request uuid,p_fingerprint jsonb) returns jsonb language plpgsql security definer set search_path='' as $disabled$
begin raise exception 'BOSS_CONTENT_REMOVED';end $disabled$;
revoke all on function public.rebirth_party_action(uuid,uuid,uuid,bigint,jsonb,text,jsonb,jsonb,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.rebirth_party_action(uuid,uuid,uuid,bigint,jsonb,text,jsonb,jsonb,uuid,jsonb) to service_role;

