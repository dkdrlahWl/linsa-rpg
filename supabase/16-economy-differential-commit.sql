-- Only optimize unchanged inventory writes. Keep authentication, global lock,
-- CAS, receipts, ownership and escrow checks unchanged. No release flag changes.
begin;
create or replace function public.ringu_economy_commit(p_user uuid,p_session uuid,p_revision bigint,p_request_id uuid,p_fingerprint jsonb,p_state jsonb,p_result jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a ringu_private.accounts%rowtype; receipt ringu_private.economy_receipts%rowtype; it jsonb; reg ringu_private.auction_items%rowtype; k text;
begin
 perform pg_advisory_xact_lock(70909,10);perform ringu_private.economy_session(p_user,p_session);
 if p_request_id is null then raise exception 'REQUEST_ID_REQUIRED'; end if;
 if not exists(select 1 from ringu_private.auction_release where singleton and economy_ready) or not exists(select 1 from ringu_private.auction_accounts where account_id=p_user) then raise exception 'ECONOMY_NOT_READY'; end if;
 select * into receipt from ringu_private.economy_receipts where account_id=p_user and request_id=p_request_id;
 if found then
  if receipt.fingerprint<>p_fingerprint then raise exception 'REQUEST_ID_REUSED'; end if;
  return jsonb_build_object('result',receipt.result,'replayed',true);
 end if;
 select * into strict a from ringu_private.accounts where id=p_user for update;
 if a.revision is distinct from p_revision then raise exception using errcode='40001',message='SAVE_CONFLICT'; end if;
 if p_state is null or jsonb_typeof(p_state)<>'object' or jsonb_typeof(p_state->'inventory')<>'array' or octet_length(p_state::text)>8388608 then raise exception 'INVALID_STATE'; end if;
 foreach k in array array['gold','essence','transcendStone','downgradeProtect','petStone','petTicket','dungeonTickets'] loop perform ringu_private.auction_integer(p_state->k); end loop;
 if p_state->'inventory' is distinct from a.state->'inventory' then
 if exists(select 1 from jsonb_array_elements(p_state->'inventory') v group by v->>'id' having count(*)>1) then raise exception 'DUPLICATE_ITEM'; end if;
 for it in select fresh.value from jsonb_array_elements(p_state->'inventory') fresh
 left join jsonb_array_elements(a.state->'inventory') previous on previous.value->'id'=fresh.value->'id'
 where fresh.value is distinct from previous.value loop
  perform ringu_private.auction_integer(it->'id',1);
  select * into reg from ringu_private.auction_items where id=(it->>'id')::bigint for update;
  if found and reg.owner_id is distinct from p_user then raise exception 'ITEM_NOT_OWNED'; end if;
  if exists(select 1 from ringu_private.auction_listings where item_id=(it->>'id')::bigint and status='active') then raise exception 'ITEM_IN_ESCROW'; end if;
  insert into ringu_private.auction_items(id,uid,owner_id,item) values((it->>'id')::bigint,(it->>'auctionUid')::uuid,p_user,it)
  on conflict(id) do update set item=excluded.item;
 end loop;
 -- Tombstones stay allocated forever: removed equipment cannot be minted again.
 update ringu_private.auction_items i set owner_id=null where i.owner_id=p_user and i.id in
 (select (v->>'id')::bigint from jsonb_array_elements(a.state->'inventory') v
  except select (v->>'id')::bigint from jsonb_array_elements(p_state->'inventory') v);
 end if;
 update ringu_private.accounts set state=p_state,revision=revision+1,updated_at=now() where id=p_user;
 if p_fingerprint->>'command'<>'sync' then
  insert into ringu_private.economy_receipts(account_id,request_id,fingerprint,result) values(p_user,p_request_id,p_fingerprint,p_result);
 end if;
 return jsonb_build_object('result',p_result,'replayed',false);
end $$;
revoke all on function public.ringu_economy_commit(uuid,uuid,bigint,uuid,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.ringu_economy_commit(uuid,uuid,bigint,uuid,jsonb,jsonb,jsonb) to service_role;
commit;
select 'Differential inventory commit installed' as result;

