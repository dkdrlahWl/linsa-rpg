-- Trusted Edge command gateway. Does NOT turn on the release gate.
begin;
create table if not exists ringu_private.economy_baselines (
 account_id uuid primary key references ringu_private.accounts(id), state jsonb, revision bigint, captured_at timestamptz not null default now()
);
create table if not exists ringu_private.economy_receipts (
 account_id uuid not null references ringu_private.accounts(id), request_id uuid not null,
 fingerprint jsonb not null, result jsonb not null, created_at timestamptz not null default now(),primary key(account_id,request_id)
);
alter table ringu_private.economy_baselines enable row level security;
alter table ringu_private.economy_receipts enable row level security;
revoke all on ringu_private.economy_baselines,ringu_private.economy_receipts from public,anon,authenticated;

create or replace function ringu_private.economy_session(u uuid,sid uuid)
returns void language plpgsql security definer set search_path='' as $$
declare started timestamptz; current_session uuid;
begin
 select created_at into started from auth.sessions where id=sid and user_id=u;
 if not found then raise exception 'SESSION_ENDED'; end if;
 if exists(select 1 from auth.sessions where user_id=u and (created_at,id)>(started,sid)) then raise exception 'SESSION_REPLACED'; end if;
 select active_session into current_session from ringu_private.accounts where id=u for update;
 if current_session is distinct from sid then raise exception 'SESSION_REPLACED'; end if;
end $$;
revoke all on function ringu_private.economy_session(uuid,uuid) from public,anon,authenticated;

create or replace function public.ringu_economy_snapshot(p_request_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid; a ringu_private.accounts%rowtype; ready boolean; award jsonb; ids jsonb; receipt jsonb; floor bigint:=0; busy boolean:=false;
begin
 u:=ringu_private.require_session(false);
 select economy_ready into ready from ringu_private.auction_release where singleton;
 select * into strict a from ringu_private.accounts where id=u;
 if not coalesce(ready,false) then return jsonb_build_object('ready',false); end if;
 if to_regclass('ringu_private.admin_accounts') is not null then execute 'select currency_floor from ringu_private.admin_accounts where account_id=$1' into floor using u; end if;
 select result into receipt from ringu_private.economy_receipts where account_id=u and request_id=p_request_id;
 select jsonb_agg(nextval('ringu_private.auction_item_ids')) into ids from generate_series(1,10);
 select exists(select 1 from ringu_private.members m join ringu_private.rooms r on r.id=m.room_id where m.account_id=u and m.active and r.status in ('waiting','running')) into busy;
 return jsonb_build_object('ready',true,'accountId',u,'sessionId',auth.jwt()->>'session_id','state',a.state,'revision',a.revision,'receipt',receipt,
  'enrolled',exists(select 1 from ringu_private.auction_accounts where account_id=u),'itemIds',ids,
  'now',floor(extract(epoch from clock_timestamp())*1000),'adminFloor',coalesce(floor,0),
  'costumePercent',(select coalesce(sum(c.attack_percent),0) from ringu_private.costume_ownership o join ringu_private.costume_catalog c on c.id=o.costume_id where o.account_id=u),'partyBusy',busy);
end $$;
revoke all on function public.ringu_economy_snapshot(uuid) from public,anon;
grant execute on function public.ringu_economy_snapshot(uuid) to authenticated;

create or replace function public.ringu_economy_enroll(p_user uuid,p_session uuid,p_initial jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare a ringu_private.accounts%rowtype;
begin
 perform pg_advisory_xact_lock(70909,10);perform ringu_private.economy_session(p_user,p_session);
 if not exists(select 1 from ringu_private.auction_release where singleton and economy_ready) then raise exception 'ECONOMY_NOT_READY'; end if;
 select * into strict a from ringu_private.accounts where id=p_user for update;
 if exists(select 1 from ringu_private.auction_accounts where account_id=p_user) then return; end if;
 insert into ringu_private.economy_baselines(account_id,state,revision) values(p_user,a.state,a.revision) on conflict do nothing;
 if a.state is null then
  if jsonb_typeof(p_initial)<>'object' or p_initial->'inventory'<>'[]'::jsonb or p_initial->'essence'<>'0'::jsonb or p_initial->'gold'<>'0'::jsonb then raise exception 'INVALID_INITIAL_STATE'; end if;
  update ringu_private.accounts set state=p_initial where id=p_user;
 end if;
 perform ringu_private.auction_import(p_user);
end $$;
revoke all on function public.ringu_economy_enroll(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.ringu_economy_enroll(uuid,uuid,jsonb) to service_role;

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
 if exists(select 1 from jsonb_array_elements(p_state->'inventory') v group by v->>'id' having count(*)>1) then raise exception 'DUPLICATE_ITEM'; end if;
 for it in select value from jsonb_array_elements(p_state->'inventory') loop
  perform ringu_private.auction_integer(it->'id',1);
  select * into reg from ringu_private.auction_items where id=(it->>'id')::bigint for update;
  if found and reg.owner_id is distinct from p_user then raise exception 'ITEM_NOT_OWNED'; end if;
  if exists(select 1 from ringu_private.auction_listings where item_id=(it->>'id')::bigint and status='active') then raise exception 'ITEM_IN_ESCROW'; end if;
  insert into ringu_private.auction_items(id,uid,owner_id,item) values((it->>'id')::bigint,(it->>'auctionUid')::uuid,p_user,it)
  on conflict(id) do update set item=excluded.item;
 end loop;
 -- Tombstones stay allocated forever: removed equipment cannot be minted again.
 update ringu_private.auction_items i set owner_id=null where i.owner_id=p_user and not exists(select 1 from jsonb_array_elements(p_state->'inventory') entry where (entry->>'id')::bigint=i.id);
 update ringu_private.accounts set state=p_state,revision=revision+1,updated_at=now() where id=p_user;
 if p_fingerprint->>'command'<>'sync' then
  insert into ringu_private.economy_receipts(account_id,request_id,fingerprint,result) values(p_user,p_request_id,p_fingerprint,p_result);
 end if;
 return jsonb_build_object('result',p_result,'replayed',false);
end $$;
revoke all on function public.ringu_economy_commit(uuid,uuid,bigint,uuid,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.ringu_economy_commit(uuid,uuid,bigint,uuid,jsonb,jsonb,jsonb) to service_role;

-- The global cutoff rejects even unenrolled legacy clients: no last-minute
-- client-generated currency/equipment can enter the migration baseline.
create or replace function public.ringu_account_before_costumes(p_action text,p_state jsonb default null,p_revision bigint default null)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if p_action='save' and (exists(select 1 from ringu_private.auction_release where singleton and economy_ready) or exists(select 1 from ringu_private.auction_accounts where account_id=auth.uid())) then raise exception 'CLIENT_UPDATE_REQUIRED'; end if;
 return public.ringu_account_before_auction(p_action,p_state,p_revision);
end $$;
revoke all on function public.ringu_account_before_costumes(text,jsonb,bigint) from public,anon,authenticated;

create or replace function public.ringu_save_preferences(p_preferences jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid; a ringu_private.accounts%rowtype; k text;
begin
 u:=ringu_private.require_session(false);
 if not exists(select 1 from ringu_private.auction_release where singleton and economy_ready) then raise exception 'ECONOMY_NOT_READY'; end if;
 if p_preferences is null or jsonb_typeof(p_preferences)<>'object' or p_preferences-array['playerName','playerGender','sfxOn','bgmOn','useProtect','sfxVolume','bgmVolume']<>'{}'::jsonb then raise exception 'INVALID_PREFERENCES'; end if;
 if p_preferences?'playerName' and (jsonb_typeof(p_preferences->'playerName')<>'string' or length(p_preferences->>'playerName') not between 1 and 12) then raise exception 'INVALID_NAME'; end if;
 if p_preferences?'playerGender' and (jsonb_typeof(p_preferences->'playerGender')<>'string' or p_preferences->>'playerGender' not in ('male','female')) then raise exception 'INVALID_GENDER'; end if;
 foreach k in array array['sfxOn','bgmOn','useProtect'] loop if p_preferences?k and jsonb_typeof(p_preferences->k)<>'boolean' then raise exception 'INVALID_PREFERENCES'; end if; end loop;
 foreach k in array array['sfxVolume','bgmVolume'] loop if p_preferences?k then
  if jsonb_typeof(p_preferences->k)<>'number' then raise exception 'INVALID_PREFERENCES'; end if;
  if (p_preferences->>k)::numeric not between 0 and 1 then raise exception 'INVALID_PREFERENCES'; end if;
 end if;end loop;
 update ringu_private.accounts set state=coalesce(state,'{}')||p_preferences,revision=revision+1,updated_at=now() where id=u returning * into a;
 return jsonb_build_object('state',a.state,'revision',a.revision);
end $$;
revoke all on function public.ringu_save_preferences(jsonb) from public,anon;
grant execute on function public.ringu_save_preferences(jsonb) to authenticated;

do $$begin
 if to_regprocedure('public.ringu_account_before_economy(text,jsonb,bigint)') is null then alter function public.ringu_account(text,jsonb,bigint) rename to ringu_account_before_economy; end if;
 if to_regprocedure('public.ringu_party_before_economy(text,uuid,integer)') is null then alter function public.ringu_party(text,uuid,integer) rename to ringu_party_before_economy; end if;
 if to_regprocedure('public.ringu_claim_party_before_economy(bigint)') is null then alter function public.ringu_claim_party(bigint) rename to ringu_claim_party_before_economy; end if;
end $$;
revoke all on function public.ringu_account_before_economy(text,jsonb,bigint) from public,anon,authenticated;
revoke all on function public.ringu_party_before_economy(text,uuid,integer) from public,anon,authenticated;
revoke all on function public.ringu_claim_party_before_economy(bigint) from public,anon,authenticated;
create or replace function public.ringu_account(p_action text,p_state jsonb default null,p_revision bigint default null)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 return public.ringu_account_before_economy(p_action,p_state,p_revision)||jsonb_build_object('economyReady',coalesce((select economy_ready from ringu_private.auction_release where singleton),false));
end $$;
revoke all on function public.ringu_account(text,jsonb,bigint) from public,anon;
grant execute on function public.ringu_account(text,jsonb,bigint) to authenticated;
create or replace function public.ringu_party(p_action text,p_id uuid default null,p_stage integer default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; u uuid;
begin
 perform pg_advisory_xact_lock(70909,10);u:=ringu_private.require_session(false);
 if p_action in ('create','join','start') and (select state->'serverBattle' is not null and state->'serverBattle'<>'null'::jsonb from ringu_private.accounts where id=u) then raise exception 'BATTLE_IN_PROGRESS'; end if;
 result:=public.ringu_party_before_economy(p_action,p_id,p_stage);
 if p_action in ('create','join','start','leave') then update ringu_private.accounts set revision=revision+1 where id=u; end if;
 return result;
end $$;
revoke all on function public.ringu_party(text,uuid,integer) from public,anon;
grant execute on function public.ringu_party(text,uuid,integer) to authenticated;
create or replace function public.ringu_claim_party(p_revision bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(70909,10);
 return public.ringu_claim_party_before_economy(p_revision);
end $$;
revoke all on function public.ringu_claim_party(bigint) from public,anon;
grant execute on function public.ringu_claim_party(bigint) to authenticated;
commit;
select 'Economy command gateway installed; release remains closed' as result;
