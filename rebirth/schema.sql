-- Rebirth schema definition. Apply only after local verification.
create schema if not exists rebirth_private;
revoke all on schema rebirth_private from public,anon;
grant usage on schema rebirth_private to authenticated,service_role;
create table if not exists rebirth_private.release(id boolean primary key default true check(id),enabled boolean not null default false,epoch uuid not null default gen_random_uuid());
insert into rebirth_private.release(id) values(true) on conflict do nothing;
create table if not exists rebirth_private.players(id uuid primary key references auth.users(id) on delete cascade,state jsonb,revision bigint not null default 0,active_session uuid,session_started timestamptz,updated_at timestamptz not null default now());
alter table rebirth_private.players add column if not exists preview_access boolean not null default false;
create table if not exists rebirth_private.receipts(user_id uuid not null references auth.users(id) on delete cascade,request_id uuid not null,fingerprint jsonb not null,result jsonb not null,created_at timestamptz not null default now(),primary key(user_id,request_id));
create table if not exists rebirth_private.listings(id uuid primary key default gen_random_uuid(),seller uuid not null references auth.users(id) on delete cascade,item jsonb not null,price bigint not null check(price between 100 and 1000000000),created_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '7 days',buyer uuid,status text not null default 'open' check(status in ('open','sold','cancelled')));
create index if not exists rebirth_open_listings on rebirth_private.listings(created_at desc,id) where status='open';
create index if not exists rebirth_seller_listings on rebirth_private.listings(seller,status);
alter table rebirth_private.players enable row level security;
alter table rebirth_private.receipts enable row level security;
alter table rebirth_private.listings enable row level security;
alter table rebirth_private.release enable row level security;
revoke all on all tables in schema rebirth_private from public,anon,authenticated;

create or replace function rebirth_private.session_user() returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); s uuid:=nullif(auth.jwt()->>'session_id','')::uuid; st timestamptz;
begin
 if u is null or s is null then raise exception 'LOGIN_REQUIRED'; end if;
 select created_at into st from auth.sessions where id=s and user_id=u;
 if st is null then raise exception 'SESSION_ENDED'; end if;
 if exists(select 1 from auth.sessions where user_id=u and (created_at,id)>(st,s)) then raise exception 'SESSION_REPLACED'; end if;
 if not exists(select 1 from rebirth_private.release where enabled) and not exists(select 1 from rebirth_private.players where id=u and preview_access) then raise exception 'REBIRTH_MAINTENANCE'; end if;
 insert into rebirth_private.players(id,active_session,session_started) values(u,s,st) on conflict(id) do nothing;
 if exists(select 1 from rebirth_private.players where id=u and (session_started,active_session)>(st,s)) then raise exception 'SESSION_REPLACED'; end if;
 update rebirth_private.players set active_session=s,session_started=st where id=u and active_session is distinct from s;
 return u;
end $$;
revoke all on function rebirth_private.session_user() from public,anon,authenticated;

create or replace function rebirth_private.snapshot(p_request uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=rebirth_private.session_user(); p rebirth_private.players%rowtype; r rebirth_private.receipts%rowtype;
begin
 select * into p from rebirth_private.players where id=u;
 select * into r from rebirth_private.receipts where user_id=u and request_id=p_request;
 return jsonb_build_object('user',u,'session',p.active_session,'state',p.state,'revision',p.revision,'now',floor(extract(epoch from clock_timestamp())*1000),'epoch',(select epoch from rebirth_private.release),'receipt',case when r.request_id is not null then jsonb_build_object('fingerprint',r.fingerprint,'result',r.result) else null end);
end $$;
revoke all on function rebirth_private.snapshot(uuid) from public,anon;
grant execute on function rebirth_private.snapshot(uuid) to authenticated;
create or replace function public.rebirth_snapshot(p_request uuid) returns jsonb language sql security invoker set search_path='' as $$select rebirth_private.snapshot(p_request)$$;
revoke all on function public.rebirth_snapshot(uuid) from public,anon;
grant execute on function public.rebirth_snapshot(uuid) to authenticated;

create or replace function rebirth_private.commit_state(p_user uuid,p_session uuid,p_epoch uuid,p_revision bigint,p_request uuid,p_fingerprint jsonb,p_state jsonb,p_result jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare p rebirth_private.players%rowtype; r rebirth_private.receipts%rowtype;
begin
 if not exists(select 1 from rebirth_private.release where epoch=p_epoch and (enabled or exists(select 1 from rebirth_private.players where id=p_user and preview_access))) then raise exception 'REBIRTH_MAINTENANCE'; end if;
 select * into p from rebirth_private.players where id=p_user for update;
 if not found or p.active_session is distinct from p_session or not exists(select 1 from auth.sessions where id=p_session and user_id=p_user) then raise exception 'SESSION_ENDED'; end if;
 if exists(select 1 from auth.sessions where user_id=p_user and (created_at,id)>(p.session_started,p_session)) then raise exception 'SESSION_REPLACED'; end if;
 select * into r from rebirth_private.receipts where user_id=p_user and request_id=p_request;
 if found then if r.fingerprint<>p_fingerprint then raise exception 'REQUEST_ID_REUSED'; end if; return r.result; end if;
 if p.revision<>p_revision then raise exception 'SAVE_CONFLICT'; end if;
 if p_state->>'version'<>'rebirth-1' or jsonb_typeof(p_state)<>'object' or octet_length(p_state::text)>524288 then raise exception 'INVALID_STATE'; end if;
 update rebirth_private.players set state=p_state,revision=revision+1,updated_at=now() where id=p_user;
 if p_fingerprint->>'command'<>'sync' then
  insert into rebirth_private.receipts(user_id,request_id,fingerprint,result) values(p_user,p_request,p_fingerprint,p_result);
 end if;
 return p_result;
end $$;
revoke all on function rebirth_private.commit_state(uuid,uuid,uuid,bigint,uuid,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function rebirth_private.commit_state(uuid,uuid,uuid,bigint,uuid,jsonb,jsonb,jsonb) to service_role;
create or replace function public.rebirth_commit(p_user uuid,p_session uuid,p_epoch uuid,p_revision bigint,p_request uuid,p_fingerprint jsonb,p_state jsonb,p_result jsonb) returns jsonb language sql security invoker set search_path='' as $$select rebirth_private.commit_state(p_user,p_session,p_epoch,p_revision,p_request,p_fingerprint,p_state,p_result)$$;
revoke all on function public.rebirth_commit(uuid,uuid,uuid,bigint,uuid,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.rebirth_commit(uuid,uuid,uuid,bigint,uuid,jsonb,jsonb,jsonb) to service_role;

create or replace function rebirth_private.market(p_action text,p_args jsonb,p_request uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid; p rebirth_private.players%rowtype; v_seller rebirth_private.players%rowtype; l rebirth_private.listings%rowtype; it jsonb; result jsonb; old rebirth_private.receipts%rowtype; fingerprint jsonb:=jsonb_build_object('market',p_action,'args',p_args); v_price bigint; item_id text; page integer; filter_slot integer; filter_class text; collection_key text;
begin
 -- Acquire the shared market lock before session_user can lock a player row.
 if p_action<>'list' then perform pg_advisory_xact_lock(71823001); end if;
 u:=rebirth_private.session_user();
 if p_action='list' then
  page:=least(1000,greatest(0,coalesce((p_args->>'page')::integer,0)));filter_slot:=nullif(p_args->>'slot','')::integer;filter_class:=nullif(p_args->>'classId','');
  select coalesce(jsonb_agg(q),'[]') into result from (select id,item,price,expires_at,seller=u as own,status from rebirth_private.listings where (case when coalesce((p_args->>'mine')::boolean,false) then seller=u else status='open' and expires_at>now() end) and (filter_slot is null or (item->>'slot')::integer=filter_slot) and (filter_class is null or item->>'classId'=filter_class) order by created_at desc,id limit 21 offset page*20) q;
  return result;
 end if;
 -- Serialize market mutations, lock buyers/sellers consistently; small game transaction.
 select * into old from rebirth_private.receipts where user_id=u and request_id=p_request;
 if found then if old.fingerprint<>fingerprint then raise exception 'REQUEST_ID_REUSED'; end if;return old.result;end if;
 select * into p from rebirth_private.players where id=u for update;
 if p.state is null then raise exception 'CHARACTER_REQUIRED'; end if;
 if (p.state->>'level')::integer<20 and p_action<>'cancel' then raise exception 'TRADE_LEVEL_REQUIRED'; end if;
 if p.state->'battle'<>'null'::jsonb or nullif(p.state->>'partyRoom','') is not null then raise exception 'BATTLE_IN_PROGRESS'; end if;
 if p_action='sell' then
  v_price:=(p_args->>'price')::bigint;item_id:=p_args->>'itemId';
  if v_price is null or v_price<100 or v_price>1000000000 then raise exception 'INVALID_PRICE'; end if;
  if (select count(*) from rebirth_private.listings where seller=u and status='open')>=20 then raise exception 'LISTING_LIMIT'; end if;
  select value into it from jsonb_array_elements(p.state->'items') where value->>'id'=item_id;
  if it is null then raise exception 'ITEM_NOT_FOUND'; end if;
  if coalesce((it->>'bound')::boolean,false) or (it->>'locked')::boolean or (it->>'broken')::boolean or p.state->'pendingCube'->>'id'=item_id or exists(select 1 from jsonb_each_text(p.state->'equipped') where value=item_id) then raise exception 'ITEM_PROTECTED'; end if;
  update rebirth_private.players set state=jsonb_set(state,'{items}',(select coalesce(jsonb_agg(value),'[]') from jsonb_array_elements(state->'items') where value->>'id'<>item_id)),revision=revision+1,updated_at=now() where id=u;
  insert into rebirth_private.listings(seller,item,price) values(u,it,v_price) returning * into l;result:=jsonb_build_object('listed',l.id);
 elsif p_action in ('buy','cancel') then
  select * into l from rebirth_private.listings where id=(p_args->>'id')::uuid for update;
  if not found or l.status<>'open' then raise exception 'LISTING_UNAVAILABLE'; end if;
  if jsonb_array_length(p.state->'items')>=300 then raise exception 'INVENTORY_FULL'; end if;
  if p_action='cancel' then
   if l.seller<>u then raise exception 'NOT_OWNER'; end if;
   update rebirth_private.players set state=jsonb_set(state,'{items}',(state->'items')||jsonb_build_array(l.item)),revision=revision+1,updated_at=now() where id=u;
   update rebirth_private.listings set status='cancelled' where id=l.id;result:=jsonb_build_object('cancelled',l.id);
  else
   if l.seller=u or l.expires_at<=now() then raise exception 'LISTING_UNAVAILABLE'; end if;
   if (p.state->>'gold')::bigint<l.price then raise exception 'INSUFFICIENT_GOLD'; end if;
   select * into v_seller from rebirth_private.players where id=l.seller for update;
   if not found then raise exception 'LISTING_UNAVAILABLE'; end if;
   update rebirth_private.players set state=jsonb_set(jsonb_set(state,'{items}',(state->'items')||jsonb_build_array(l.item)),'{gold}',to_jsonb((state->>'gold')::bigint-l.price)),revision=revision+1,updated_at=now() where id=u;
   collection_key:=concat_ws(':',l.item->>'level',l.item->>'classId',l.item->>'slot',l.item->>'boss');
   if l.item->>'slot'='0' and coalesce(l.item->>'weaponVariant','0') in ('1','2') then collection_key:=collection_key||':'||(l.item->>'weaponVariant'); end if;
   update rebirth_private.players set state=jsonb_set(state,'{collection}',coalesce(state->'collection','[]'::jsonb)||jsonb_build_array(collection_key)) where id=u and not coalesce(state->'collection','[]'::jsonb) ? collection_key;
   update rebirth_private.players set state=jsonb_set(state,'{gold}',to_jsonb((state->>'gold')::bigint+floor(l.price*.95)::bigint)),revision=revision+1,updated_at=now() where id=l.seller;
   update rebirth_private.listings set status='sold',buyer=u where id=l.id;result:=jsonb_build_object('bought',l.id,'fee',l.price-floor(l.price*.95));
  end if;
 else raise exception 'INVALID_ACTION';end if;
 insert into rebirth_private.receipts(user_id,request_id,fingerprint,result) values(u,p_request,fingerprint,result);return result;
end $$;
revoke all on function rebirth_private.market(text,jsonb,uuid) from public,anon;
grant execute on function rebirth_private.market(text,jsonb,uuid) to authenticated;
create or replace function public.rebirth_market(p_action text,p_args jsonb,p_request uuid) returns jsonb language sql security invoker set search_path='' as $$select rebirth_private.market(p_action,p_args,p_request)$$;
revoke all on function public.rebirth_market(text,jsonb,uuid) from public,anon;
grant execute on function public.rebirth_market(text,jsonb,uuid) to authenticated;
