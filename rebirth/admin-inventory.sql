create or replace function public.rebirth_admin_inventory(p_user uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid; result jsonb;
begin
 actor:=rebirth_private.session_user();
 if not exists(select 1 from auth.users where id=actor and raw_app_meta_data->>'ringu_admin'='true') then raise exception 'ADMIN_ONLY'; end if;
 if p_user is null then
  select jsonb_build_object('serverNow',now(),'users',coalesce(jsonb_agg(jsonb_build_object('id',id,'name',state->>'name','level',state->'level','gold',state->'gold') order by state->>'name'),'[]'::jsonb)) into result
  from rebirth_private.players where state is not null and state->>'name' is not null;
 else
  select jsonb_build_object('serverNow',now(),'user',jsonb_build_object('id',id,'name',state->>'name','level',state->'level','classId',state->>'classId','revision',revision,'updatedAt',updated_at,'gold',state->'gold','diamonds',state->'fishing'->'diamonds','materials',state->'materials','bossMaterials',state->'bossMaterials','items',state->'items','equipped',state->'equipped','mailbox',state->'mailbox')) into result from rebirth_private.players where id=p_user and state is not null;
  if result is null then raise exception 'PLAYER_NOT_FOUND'; end if;
 end if;
 return result;
end $$;
revoke all on function public.rebirth_admin_inventory(uuid) from public,anon;
grant execute on function public.rebirth_admin_inventory(uuid) to authenticated;
