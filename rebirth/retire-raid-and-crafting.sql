select pg_advisory_xact_lock(71823001);
-- Close retired raids without touching cooperative rifts.
update rebirth_private.party_rooms set status='closed' where status in ('waiting','fighting');
update rebirth_private.players set state=(state-'partyRoom')||jsonb_build_object('hunting',false,'lastAt',floor(extract(epoch from now())*1000)::bigint),revision=revision+1,updated_at=now() where nullif(state->>'partyRoom','') is not null;
update rebirth_private.players set state=jsonb_set(state,'{battle}','null'::jsonb),revision=revision+1,updated_at=now() where state->'battle'->>'kind'='dungeon';
update rebirth_private.players set state=state||jsonb_build_object('retiredBossMaterials',coalesce(state->'retiredBossMaterials','{}'::jsonb)||coalesce(state->'bossMaterials','{}'::jsonb),'bossMaterials','{}'::jsonb),revision=revision+1,updated_at=now() where coalesce(state->'bossMaterials','{}'::jsonb)<>'{}'::jsonb;
create or replace function public.rebirth_party_action(p_user uuid,p_session uuid,p_epoch uuid,p_revision bigint,p_state jsonb,p_action text,p_args jsonb,p_power jsonb,p_request uuid,p_fingerprint jsonb) returns jsonb language plpgsql security definer set search_path='' as $disabled$
begin raise exception 'BOSS_CONTENT_REMOVED';end $disabled$;
revoke all on function public.rebirth_party_action(uuid,uuid,uuid,bigint,jsonb,text,jsonb,jsonb,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.rebirth_party_action(uuid,uuid,uuid,bigint,jsonb,text,jsonb,jsonb,uuid,jsonb) to service_role;
