-- PREPARATORY ONLY. No production accounts are enrolled; trading stays closed.
-- Requires 01/02 and 06/07/08/09. Read AUCTION-ROLLOUT.md before applying.
begin;
create table if not exists ringu_private.auction_release (
 singleton boolean primary key default true check(singleton),
 enabled boolean not null default false,
 economy_ready boolean not null default false
);
insert into ringu_private.auction_release values(true,false,false) on conflict do nothing;
create sequence if not exists ringu_private.auction_item_ids start 1000000000000000 maxvalue 9007199254740991;
create table if not exists ringu_private.auction_accounts (
 account_id uuid primary key references ringu_private.accounts(id),
 imported_at timestamptz not null default now()
);
create table if not exists ringu_private.auction_items (
 id bigint primary key check(id between 1 and 9007199254740991),
 uid uuid not null unique default gen_random_uuid(),
 owner_id uuid references ringu_private.accounts(id),
 item jsonb not null check(jsonb_typeof(item)='object'),
 check((item->>'id')::bigint=id)
);
create table if not exists ringu_private.auction_listings (
 id uuid primary key default gen_random_uuid(), item_id bigint not null references ringu_private.auction_items(id),
 seller_id uuid not null references ringu_private.accounts(id), buyer_id uuid references ringu_private.accounts(id),
 seller_name text not null, item jsonb not null,
 price bigint not null check(price between 1 and 9007199254740991),
 status text not null default 'active' check(status in ('active','sold','cancelled')),
 created_at timestamptz not null default now(), closed_at timestamptz,
 check(buyer_id is null or buyer_id<>seller_id)
);
create unique index if not exists auction_one_active_item on ringu_private.auction_listings(item_id) where status='active';
create index if not exists auction_search on ringu_private.auction_listings(status,created_at desc,id);
create index if not exists auction_seller on ringu_private.auction_listings(seller_id,status);
create table if not exists ringu_private.auction_trades (
 listing_id uuid primary key references ringu_private.auction_listings(id),
 seller_id uuid not null references ringu_private.accounts(id), buyer_id uuid not null references ringu_private.accounts(id),
 item jsonb not null, price bigint not null, traded_at timestamptz not null default now()
);
create index if not exists auction_buyer_history on ringu_private.auction_trades(buyer_id,traded_at desc);
create index if not exists auction_seller_history on ringu_private.auction_trades(seller_id,traded_at desc);
create table if not exists ringu_private.auction_receipts (
 account_id uuid not null references ringu_private.accounts(id), request_id uuid not null,
 fingerprint jsonb not null, result jsonb not null, created_at timestamptz not null default now(),
 primary key(account_id,request_id)
);
alter table ringu_private.auction_release enable row level security;
alter table ringu_private.auction_accounts enable row level security;
alter table ringu_private.auction_items enable row level security;
alter table ringu_private.auction_listings enable row level security;
alter table ringu_private.auction_trades enable row level security;
alter table ringu_private.auction_receipts enable row level security;
revoke all on ringu_private.auction_release,ringu_private.auction_accounts,ringu_private.auction_items,ringu_private.auction_listings,ringu_private.auction_trades,ringu_private.auction_receipts from public,anon,authenticated;
revoke all on sequence ringu_private.auction_item_ids from public,anon,authenticated;

create or replace function ringu_private.auction_integer(v jsonb, minimum bigint default 0)
returns bigint language plpgsql immutable set search_path='' as $$
declare n numeric;
begin
 if v is null or jsonb_typeof(v)<>'number' then raise exception 'INVALID_NUMBER'; end if;
 n:=v::numeric;
 if n<>trunc(n) or n<minimum or n>9007199254740991 then raise exception 'INVALID_NUMBER'; end if;
 return n::bigint;
end $$;
revoke all on function ringu_private.auction_integer(jsonb,bigint) from public,anon,authenticated;

-- Operator-only compatibility import. NEVER callable by browsers.
-- Intended for the audited economy cutover, not enrollment of client-writable saves.
create or replace function ringu_private.auction_import(u uuid)
returns void language plpgsql security definer set search_path='' as $$
declare a ringu_private.accounts%rowtype; it jsonb; changed jsonb; inv jsonb:='[]'; eq jsonb; pair record; new_id bigint; item_uid uuid; old_id text;
begin
 perform pg_advisory_xact_lock(70909,10);
 select * into strict a from ringu_private.accounts where id=u for update;
 if exists(select 1 from ringu_private.auction_accounts where account_id=u) then return; end if;
 perform ringu_private.auction_integer(a.state->'essence');
 if jsonb_typeof(a.state->'inventory') is distinct from 'array' then raise exception 'INVALID_INVENTORY'; end if;
 if exists(select 1 from jsonb_array_elements(a.state->'inventory') x group by x->>'id' having count(*)>1) then raise exception 'DUPLICATE_LEGACY_ID'; end if;
 eq:=coalesce(a.state->'equipped','{}');
 for it in select value from jsonb_array_elements(a.state->'inventory') loop
  if not (it->>'slot'=any(array['무기','투구','갑옷','바지','신발','반지','귀걸이'])) or ringu_private.auction_integer(it->'rarity')>6 or coalesce(it->>'name','')='' then raise exception 'INVALID_EQUIPMENT'; end if;
  perform ringu_private.auction_integer(it->'id',1);
  old_id:=it->>'id';new_id:=nextval('ringu_private.auction_item_ids');item_uid:=gen_random_uuid();
  changed:=it||jsonb_build_object('id',new_id,'legacyId',it->'id','auctionUid',item_uid);
  insert into ringu_private.auction_items(id,uid,owner_id,item) values(new_id,item_uid,u,changed);
  inv:=inv||jsonb_build_array(changed);
  for pair in select * from jsonb_each(eq) loop
   if pair.value#>>'{}'=old_id then eq:=jsonb_set(eq,array[pair.key],to_jsonb(new_id)); end if;
  end loop;
 end loop;
 update ringu_private.accounts set state=a.state||jsonb_build_object('inventory',inv,'equipped',eq),revision=revision+1,updated_at=now() where id=u;
 insert into ringu_private.auction_accounts(account_id) values(u);
end $$;
revoke all on function ringu_private.auction_import(uuid) from public,anon,authenticated;

-- Defense in depth: once enrolled, old full-snapshot saves cannot mint essence,
-- resurrect escrow/sold items, edit their options, or discard acquired items.
-- This guard intentionally rejects existing CLIENT economy mutations. Server
-- reward/equipment commands must replace them BEFORE production enrollment.
do $$begin
 if to_regprocedure('public.ringu_account_before_auction(text,jsonb,bigint)') is null then
  alter function public.ringu_account_before_costumes(text,jsonb,bigint) rename to ringu_account_before_auction;
 end if;
end $$;
revoke all on function public.ringu_account_before_auction(text,jsonb,bigint) from public,anon,authenticated;
create or replace function public.ringu_account_before_costumes(p_action text,p_state jsonb default null,p_revision bigint default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid; s jsonb;
begin
 if p_action='save' then
  u:=ringu_private.require_session(false);
  if exists(select 1 from ringu_private.auction_accounts where account_id=u) then
   select state into s from ringu_private.accounts where id=u;
   if p_state->'essence' is distinct from s->'essence' or p_state->'inventory' is distinct from s->'inventory' then raise exception 'ECONOMY_COMMAND_REQUIRED'; end if;
   if exists(select 1 from jsonb_each(coalesce(p_state->'equipped','{}')) e where e.value<>'null'::jsonb and not exists(select 1 from jsonb_array_elements(s->'inventory') it where it->'id'=e.value)) then raise exception 'ITEM_NOT_OWNED'; end if;
  end if;
 end if;
 return public.ringu_account_before_auction(p_action,p_state,p_revision);
end $$;
revoke all on function public.ringu_account_before_costumes(text,jsonb,bigint) from public,anon,authenticated;

create or replace function public.ringu_auction(p_action text default 'status',p_args jsonb default '{}',p_request_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid; a ringu_private.accounts%rowtype; seller ringu_private.accounts%rowtype;
 l ringu_private.auction_listings%rowtype; reg ringu_private.auction_items%rowtype; receipt ringu_private.auction_receipts%rowtype;
 ready boolean; enrolled boolean; result jsonb; fp jsonb; inv jsonb; it jsonb; price bigint; balance bigint; seller_balance bigint; iid bigint;
 rows jsonb; page_no integer; order_by text; tab text; term text; slot_filter text; rarity_filter integer; total bigint;
begin
 if p_action is null or p_action not in ('status','search','mine','history','list','buy','cancel','receipt') then raise exception 'INVALID_ACTION'; end if;
 if p_args is null or jsonb_typeof(p_args)<>'object' then raise exception 'INVALID_ARGUMENTS'; end if;
 -- Tiny (~10 player) economy: serialize auction writes BEFORE session/account
 -- locks. This prevents crossed A-buys-B / B-buys-A and buy/cancel deadlocks.
 if p_action in ('list','buy','cancel') then perform pg_advisory_xact_lock(70909,10); end if;
 u:=ringu_private.require_session(false);
 select * into strict a from ringu_private.accounts where id=u for update;
 select enabled and economy_ready into ready from ringu_private.auction_release where singleton;
 enrolled:=exists(select 1 from ringu_private.auction_accounts where account_id=u);
 if p_action='status' then return jsonb_build_object('ready',coalesce(ready,false) and enrolled,'reason',case when not coalesce(ready,false) then 'ECONOMY_MIGRATION_REQUIRED' when not enrolled then 'ACCOUNT_MIGRATION_REQUIRED' else null end,'essence',a.state->'essence','revision',a.revision); end if;
 if p_action='receipt' then
  select * into receipt from ringu_private.auction_receipts where account_id=u and request_id=p_request_id;
  return jsonb_build_object('found',found,'result',receipt.result);
 end if;
 if not coalesce(ready,false) or not enrolled then raise exception 'AUCTION_NOT_READY'; end if;
 if p_action in ('search','mine','history') then
  page_no:=least(100000,ringu_private.auction_integer(coalesce(p_args->'page','0'))::integer);
  order_by:=coalesce(p_args->>'sort','newest');term:=left(coalesce(p_args->>'query',''),80);slot_filter:=nullif(p_args->>'slot','');
  rarity_filter:=case when nullif(p_args->>'rarity','') is null then null else ringu_private.auction_integer(p_args->'rarity')::integer end;
  if order_by not in ('newest','priceAsc','priceDesc') or (slot_filter is not null and not slot_filter=any(array['무기','투구','갑옷','바지','신발','반지','귀걸이'])) or rarity_filter>6 then raise exception 'INVALID_FILTER'; end if;
  if p_action='history' then
   tab:=coalesce(p_args->>'side','buy');if tab not in ('buy','sell') then raise exception 'INVALID_FILTER'; end if;
   select count(*) into total from ringu_private.auction_trades t where (tab='buy' and t.buyer_id=u) or (tab='sell' and t.seller_id=u);
   select coalesce(jsonb_agg(to_jsonb(x)),'[]') into rows from (select t.listing_id id,t.item,t.price,t.traded_at from ringu_private.auction_trades t where (tab='buy' and t.buyer_id=u) or (tab='sell' and t.seller_id=u) order by t.traded_at desc,t.listing_id limit 20 offset page_no*20) x;
  else
   select count(*) into total from ringu_private.auction_listings x where x.status='active' and (p_action='search' or x.seller_id=u) and position(lower(term) in lower(x.item->>'name'))>0 and (slot_filter is null or x.item->>'slot'=slot_filter) and (rarity_filter is null or (x.item->>'rarity')::integer=rarity_filter);
   select coalesce(jsonb_agg(to_jsonb(q)),'[]') into rows from (select x.id,x.item,x.price,x.seller_name,x.created_at,(x.seller_id=u) mine from ringu_private.auction_listings x where x.status='active' and (p_action='search' or x.seller_id=u) and position(lower(term) in lower(x.item->>'name'))>0 and (slot_filter is null or x.item->>'slot'=slot_filter) and (rarity_filter is null or (x.item->>'rarity')::integer=rarity_filter)
    order by case when order_by='priceAsc' then x.price end asc,case when order_by='priceDesc' then x.price end desc,x.created_at desc,x.id limit 20 offset page_no*20) q;
  end if;
  return jsonb_build_object('rows',rows,'page',page_no,'pageSize',20,'total',total);
 end if;
 if p_request_id is null then raise exception 'REQUEST_ID_REQUIRED'; end if;
 fp:=jsonb_build_object('action',p_action,'args',p_args);
 select * into receipt from ringu_private.auction_receipts where account_id=u and request_id=p_request_id;
 if found then
  if receipt.fingerprint<>fp then raise exception 'REQUEST_ID_REUSED'; end if;
  return receipt.result;
 end if;
 if p_action='list' then
  if p_args-array['itemId','price']<>'{}'::jsonb then raise exception 'INVALID_ARGUMENTS'; end if;
  iid:=ringu_private.auction_integer(p_args->'itemId',1);price:=ringu_private.auction_integer(p_args->'price',1);
  select * into reg from ringu_private.auction_items where id=iid for update;
  if not found or reg.owner_id is distinct from u then raise exception 'ITEM_NOT_OWNED'; end if;
  select value into it from jsonb_array_elements(a.state->'inventory') where value->'id'=to_jsonb(iid);
  if it is null or it<>reg.item then raise exception 'ITEM_STATE_CONFLICT'; end if;
  if exists(select 1 from jsonb_each(coalesce(a.state->'equipped','{}')) e where e.value=to_jsonb(iid)) then raise exception 'ITEM_EQUIPPED'; end if;
  if it->'locked'='true'::jsonb then raise exception 'ITEM_LOCKED'; end if;
  if it->'tradable'='false'::jsonb or it->'tradeable'='false'::jsonb or it->'bound'='true'::jsonb or it->'soulbound'='true'::jsonb or it ? 'boundTo' then raise exception 'ITEM_UNTRADABLE'; end if;
  select coalesce(jsonb_agg(value order by ordinality),'[]') into inv from jsonb_array_elements(a.state->'inventory') with ordinality where value->'id'<>to_jsonb(iid);
  insert into ringu_private.auction_listings(item_id,seller_id,seller_name,item,price) values(iid,u,left(coalesce(nullif(a.state->>'playerName',''),'모험가'),40),it,price) returning * into l;
  update ringu_private.auction_items set owner_id=null where id=iid;
  update ringu_private.accounts set state=jsonb_set(state,'{inventory}',inv),revision=revision+1,updated_at=now() where id=u;
 else
  if p_args-array['listingId']<>'{}'::jsonb then raise exception 'INVALID_ARGUMENTS'; end if;
  select * into l from ringu_private.auction_listings where id=(p_args->>'listingId')::uuid for update;
  if not found then raise exception 'LISTING_NOT_FOUND'; end if;
  if p_action='cancel' and l.seller_id<>u then raise exception 'NOT_SELLER'; end if;
  if l.status='sold' then raise exception 'ALREADY_SOLD'; elsif l.status<>'active' then raise exception 'LISTING_CLOSED'; end if;
  select * into strict reg from ringu_private.auction_items where id=l.item_id for update;
  if reg.owner_id is not null or reg.item<>l.item then raise exception 'ITEM_STATE_CONFLICT'; end if;
  if exists(select 1 from jsonb_array_elements(a.state->'inventory') v where v->'id'=to_jsonb(l.item_id)) then raise exception 'ITEM_STATE_CONFLICT'; end if;
  -- The current game has NO inventory capacity limit. Do not invent one.
  inv:=coalesce(a.state->'inventory','[]')||jsonb_build_array(l.item);
  if p_action='buy' then
   if l.seller_id=u then raise exception 'SELF_PURCHASE'; end if;
   balance:=ringu_private.auction_integer(a.state->'essence');
   if balance<l.price then raise exception 'INSUFFICIENT_ESSENCE'; end if;
   select * into strict seller from ringu_private.accounts where id=l.seller_id for update;
   seller_balance:=ringu_private.auction_integer(seller.state->'essence');
   if seller_balance>9007199254740991-l.price then raise exception 'SELLER_BALANCE_LIMIT'; end if;
   update ringu_private.accounts set state=state||jsonb_build_object('inventory',inv,'essence',balance-l.price),revision=revision+1,updated_at=now() where id=u;
   update ringu_private.accounts set state=jsonb_set(state,'{essence}',to_jsonb(seller_balance+l.price)),revision=revision+1,updated_at=now() where id=l.seller_id;
   update ringu_private.auction_listings set status='sold',buyer_id=u,closed_at=now() where id=l.id;
   insert into ringu_private.auction_trades(listing_id,seller_id,buyer_id,item,price) values(l.id,l.seller_id,u,l.item,l.price);
  else
   update ringu_private.accounts set state=jsonb_set(state,'{inventory}',inv),revision=revision+1,updated_at=now() where id=u;
   update ringu_private.auction_listings set status='cancelled',closed_at=now() where id=l.id;
  end if;
  update ringu_private.auction_items set owner_id=u where id=l.item_id;
 end if;
 result:=jsonb_build_object('ok',true,'listingId',l.id,'action',p_action,'requestId',p_request_id);
 insert into ringu_private.auction_receipts(account_id,request_id,fingerprint,result) values(u,p_request_id,fp,result);
 return result;
end $$;
revoke all on function public.ringu_auction(text,jsonb,uuid) from public,anon;
grant execute on function public.ringu_auction(text,jsonb,uuid) to authenticated;
commit;
select 'Auction foundation installed; trading CLOSED. Economy migration required.' as result;
