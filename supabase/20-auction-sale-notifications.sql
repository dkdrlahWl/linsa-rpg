-- AN1: account-scoped acknowledgements of completed sales only.
-- Existing completed sales are unread until the seller opens transaction history.
set local lock_timeout='5s';
set local statement_timeout='15s';
create table if not exists ringu_private.auction_sale_reads (
 listing_id uuid primary key references ringu_private.auction_trades(listing_id),
 read_at timestamptz not null default now()
);
alter table ringu_private.auction_sale_reads enable row level security;
revoke all on ringu_private.auction_sale_reads from public,anon,authenticated;
do $patch$
declare f oid:=to_regprocedure('public.ringu_auction(text,jsonb,uuid)'); body text; definition text;
begin
 select replace(prosrc,E'\r\n',E'\n') into body from pg_proc where oid=f;
 if position('-- AN1 sale notifications' in body)>0 then return; end if;
 if md5(body) is distinct from '88a17b338d1b8c7c697a6834053a995a' then raise exception 'AN1_SOURCE_CHANGED'; end if;
 definition:=replace(pg_get_functiondef(f),E'\r\n',E'\n');
 definition:=replace(definition,$old$'activeListingCount',(select count(*)$old$,$new$'unreadSales',(select count(*) from ringu_private.auction_trades t where t.seller_id=u and not exists(select 1 from ringu_private.auction_sale_reads r where r.listing_id=t.listing_id)),'activeListingCount',(select count(*)$new$);
 definition:=replace(definition,$old$tab:=coalesce(p_args->>'side','buy');$old$,$new$tab:=coalesce(p_args->>'side','sell');$new$);
 definition:=replace(definition,$old$   select count(*) into total from ringu_private.auction_trades t$old$,$new$   -- AN1 sale notifications: acknowledge only this authenticated seller's committed sales.
   if p_args->'markSalesRead'='true'::jsonb then
    insert into ringu_private.auction_sale_reads(listing_id)
    select t.listing_id from ringu_private.auction_trades t where t.seller_id=u
    on conflict(listing_id) do nothing;
   end if;
   select count(*) into total from ringu_private.auction_trades t$new$);
 execute definition;
end
$patch$;
