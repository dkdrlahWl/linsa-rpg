-- Auction settlement currency; existing listings and history remain essence.
set local lock_timeout='5s';
set local statement_timeout='15s';
alter table ringu_private.auction_listings add column currency text not null default 'essence' check(currency in ('essence','gold'));
alter table ringu_private.auction_trades add column currency text not null default 'essence' check(currency in ('essence','gold'));
CREATE OR REPLACE FUNCTION public.ringu_auction(p_action text DEFAULT 'status'::text, p_args jsonb DEFAULT '{}'::jsonb, p_request_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid; a ringu_private.accounts%rowtype; seller ringu_private.accounts%rowtype;
 l ringu_private.auction_listings%rowtype; reg ringu_private.auction_items%rowtype; receipt ringu_private.auction_receipts%rowtype;
 ready boolean; enrolled boolean; result jsonb; fp jsonb; inv jsonb; it jsonb; price bigint; balance bigint; seller_balance bigint; iid bigint;
 currency text; currency_filter text;
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
 if p_action='status' then return jsonb_build_object('ready',coalesce(ready,false) and enrolled,'reason',case when not coalesce(ready,false) then 'ECONOMY_MIGRATION_REQUIRED' when not enrolled then 'ACCOUNT_MIGRATION_REQUIRED' else null end,'essence',a.state->'essence','gold',a.state->'gold','revision',a.revision,'listingLimit',8,'unreadSales',(select count(*) from ringu_private.auction_trades t where t.seller_id=u and not exists(select 1 from ringu_private.auction_sale_reads r where r.listing_id=t.listing_id)),'activeListingCount',(select count(*) from ringu_private.auction_listings x where x.seller_id=u and x.status='active')); end if;
 if p_action='receipt' then
  select * into receipt from ringu_private.auction_receipts where account_id=u and request_id=p_request_id;
  return jsonb_build_object('found',found,'result',receipt.result);
 end if;
 if not coalesce(ready,false) or not enrolled then raise exception 'AUCTION_NOT_READY'; end if;
 if p_action in ('search','mine','history') then
  page_no:=least(100000,ringu_private.auction_integer(coalesce(p_args->'page','0'))::integer);
  order_by:=coalesce(p_args->>'sort','newest');term:=left(coalesce(p_args->>'query',''),80);slot_filter:=nullif(p_args->>'slot','');
  currency_filter:=nullif(p_args->>'currency','');
  if currency_filter is not null and currency_filter not in ('essence','gold') then raise exception 'INVALID_FILTER'; end if;
  rarity_filter:=case when nullif(p_args->>'rarity','') is null then null else ringu_private.auction_integer(p_args->'rarity')::integer end;
  if order_by not in ('newest','priceAsc','priceDesc') or (slot_filter is not null and not slot_filter=any(array['무기','투구','갑옷','바지','신발','반지','귀걸이'])) or rarity_filter>6 then raise exception 'INVALID_FILTER'; end if;
  if p_action='history' then
   tab:=coalesce(p_args->>'side','sell');if tab not in ('buy','sell') then raise exception 'INVALID_FILTER'; end if;
   -- AN1 sale notifications: acknowledge only this authenticated seller's committed sales.
   if p_args->'markSalesRead'='true'::jsonb then
    insert into ringu_private.auction_sale_reads(listing_id)
    select t.listing_id from ringu_private.auction_trades t where t.seller_id=u
    on conflict(listing_id) do nothing;
   end if;
   select count(*) into total from ringu_private.auction_trades t where (tab='buy' and t.buyer_id=u) or (tab='sell' and t.seller_id=u);
   select coalesce(jsonb_agg(to_jsonb(x)),'[]') into rows from (select t.listing_id id,t.item,t.price,t.currency,t.traded_at from ringu_private.auction_trades t where (tab='buy' and t.buyer_id=u) or (tab='sell' and t.seller_id=u) order by t.traded_at desc,t.listing_id limit 20 offset page_no*20) x;
  else
   select count(*) into total from ringu_private.auction_listings x where x.status='active' and (currency_filter is null or x.currency=currency_filter) and (p_action='search' or x.seller_id=u) and position(lower(term) in lower(x.item->>'name'))>0 and (slot_filter is null or x.item->>'slot'=slot_filter) and (rarity_filter is null or (x.item->>'rarity')::integer=rarity_filter);
   select coalesce(jsonb_agg(to_jsonb(q)),'[]') into rows from (select x.id,x.item,x.price,x.currency,x.seller_name,x.created_at,(x.seller_id=u) mine from ringu_private.auction_listings x where x.status='active' and (currency_filter is null or x.currency=currency_filter) and (p_action='search' or x.seller_id=u) and position(lower(term) in lower(x.item->>'name'))>0 and (slot_filter is null or x.item->>'slot'=slot_filter) and (rarity_filter is null or (x.item->>'rarity')::integer=rarity_filter)
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
  if p_args-array['itemId','price','currency']<>'{}'::jsonb then raise exception 'INVALID_ARGUMENTS'; end if;
  -- AL8: count ALL existing active listings for this account, before moving any item.
  -- The existing global transaction lock is already held; successful receipts
  -- are replayed above this guard, including when the account is at capacity.
  if exists(select 1 from ringu_private.auction_listings x
    where x.seller_id=u and x.status='active' offset 7 limit 1) then
   raise exception 'AUCTION_LISTING_LIMIT';
  end if;
  currency:=coalesce(p_args->>'currency','essence');
  if currency not in ('essence','gold') then raise exception 'INVALID_CURRENCY'; end if;
  iid:=ringu_private.auction_integer(p_args->'itemId',1);price:=ringu_private.auction_integer(p_args->'price',1);
  select * into reg from ringu_private.auction_items where id=iid for update;
  if not found or reg.owner_id is distinct from u then raise exception 'ITEM_NOT_OWNED'; end if;
  select value into it from jsonb_array_elements(a.state->'inventory') where value->'id'=to_jsonb(iid);
  if it is null or it<>reg.item then raise exception 'ITEM_STATE_CONFLICT'; end if;
  if exists(select 1 from jsonb_each(coalesce(a.state->'equipped','{}')) e where e.value=to_jsonb(iid)) then raise exception 'ITEM_EQUIPPED'; end if;
  if it->'locked'='true'::jsonb then raise exception 'ITEM_LOCKED'; end if;
  if it->'tradable'='false'::jsonb or it->'tradeable'='false'::jsonb or it->'bound'='true'::jsonb or it->'soulbound'='true'::jsonb or it ? 'boundTo' then raise exception 'ITEM_UNTRADABLE'; end if;
  select coalesce(jsonb_agg(value order by ordinality),'[]') into inv from jsonb_array_elements(a.state->'inventory') with ordinality where value->'id'<>to_jsonb(iid);
  insert into ringu_private.auction_listings(item_id,seller_id,seller_name,item,price,currency) values(iid,u,left(coalesce(nullif(a.state->>'playerName',''),'모험가'),40),it,price,currency) returning * into l;
  update ringu_private.auction_items set owner_id=null where id=iid;
  update ringu_private.accounts set state=jsonb_set(state,'{inventory}',inv),revision=revision+1,updated_at=now() where id=u;
 else
  if p_args-array['listingId','currency']<>'{}'::jsonb then raise exception 'INVALID_ARGUMENTS'; end if;
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
   currency:=l.currency;
   if coalesce(p_args->>'currency','essence')<>currency then raise exception 'CURRENCY_CHANGED'; end if;
   balance:=ringu_private.auction_integer(a.state->currency);
   if balance<l.price then
    if currency='gold' then raise exception 'INSUFFICIENT_GOLD'; else raise exception 'INSUFFICIENT_ESSENCE'; end if;
   end if;
   select * into strict seller from ringu_private.accounts where id=l.seller_id for update;
   seller_balance:=ringu_private.auction_integer(seller.state->currency);
   if seller_balance>9007199254740991-l.price then raise exception 'SELLER_BALANCE_LIMIT'; end if;
   update ringu_private.accounts set state=state||jsonb_build_object('inventory',inv,currency,balance-l.price),revision=revision+1,updated_at=now() where id=u;
   update ringu_private.accounts set state=jsonb_set(state,array[currency],to_jsonb(seller_balance+l.price)),revision=revision+1,updated_at=now() where id=l.seller_id;
   update ringu_private.auction_listings set status='sold',buyer_id=u,closed_at=now() where id=l.id;
   insert into ringu_private.auction_trades(listing_id,seller_id,buyer_id,item,price,currency) values(l.id,l.seller_id,u,l.item,l.price,currency);
  else
   update ringu_private.accounts set state=jsonb_set(state,'{inventory}',inv),revision=revision+1,updated_at=now() where id=u;
   update ringu_private.auction_listings set status='cancelled',closed_at=now() where id=l.id;
  end if;
  update ringu_private.auction_items set owner_id=u where id=l.item_id;
 end if;
 result:=jsonb_build_object('ok',true,'listingId',l.id,'action',p_action,'requestId',p_request_id);
 insert into ringu_private.auction_receipts(account_id,request_id,fingerprint,result) values(u,p_request_id,fp,result);
 return result;
end $function$
;
