-- AL8: maximum eight active listings per account, including existing listings.
-- No rows are deleted, expired, cancelled, repriced or recreated by this migration.
-- Uses the existing auction_seller(seller_id,status) index and write lock.
set local lock_timeout='5s';
set local statement_timeout='15s';
do $migration$
declare f oid := to_regprocedure('public.ringu_auction(text,jsonb,uuid)');
 body text; definition text;
begin
 if f is null then raise exception 'AL8_AUCTION_NOT_INSTALLED'; end if;
 select replace(prosrc,E'\r\n',E'\n') into body from pg_proc where oid=f;
 if md5(body)='88a17b338d1b8c7c697a6834053a995a' then return; end if;
 if md5(body)<>'269f259aad72e1808b1285b4e86d6a26' then
  raise exception 'AL8_SOURCE_CHANGED_REVIEW_REQUIRED';
 end if;
 definition:=replace(pg_get_functiondef(f),E'\r\n',E'\n');
 definition:=replace(definition,$old_status$'essence',a.state->'essence','revision',a.revision); end if;$old_status$,$new_status$'essence',a.state->'essence','revision',a.revision,'listingLimit',8,'activeListingCount',(select count(*) from ringu_private.auction_listings x where x.seller_id=u and x.status='active')); end if;$new_status$);
 definition:=replace(definition,$old_list$  iid:=ringu_private.auction_integer(p_args->'itemId',1);price:=ringu_private.auction_integer(p_args->'price',1);$old_list$,$new_list$  -- AL8: count ALL existing active listings for this account, before moving any item.
  -- The existing global transaction lock is already held; successful receipts
  -- are replayed above this guard, including when the account is at capacity.
  if exists(select 1 from ringu_private.auction_listings x
    where x.seller_id=u and x.status='active' offset 7 limit 1) then
   raise exception 'AUCTION_LISTING_LIMIT';
  end if;
  iid:=ringu_private.auction_integer(p_args->'itemId',1);price:=ringu_private.auction_integer(p_args->'price',1);$new_list$);
 execute definition;
 select replace(prosrc,E'\r\n',E'\n') into body from pg_proc where oid=f;
 if md5(body)<>'88a17b338d1b8c7c697a6834053a995a' then raise exception 'AL8_PATCH_VERIFICATION_FAILED'; end if;
end
$migration$;
