-- BP2: common 3, uncommon 5, rare 10, epic 15 essence.
-- Apply after BP1. Preserve items, rotations, rates, limits and all receipts.
set local lock_timeout='5s';
set local statement_timeout='15s';
do $bp2$
declare f oid:=to_regprocedure('ringu_private.black_market_current()');
 definition text; old_price text:='price:=(array[5,15,30,50])[r+1];';
 new_price text:='price:=(array[3,5,10,15])[r+1];'; cutoff timestamptz;
begin
 perform pg_advisory_xact_lock(70909,10);
 cutoff:=clock_timestamp();
 if f is null then raise exception 'BP2_MARKET_NOT_INSTALLED';end if;
 definition:=pg_get_functiondef(f);
 if strpos(definition,old_price)>0 then
  if (length(definition)-length(replace(definition,old_price,'')))/length(old_price)<>1
   or strpos(definition,new_price)>0 then raise exception 'BP2_SOURCE_CHANGED';end if;
  execute replace(definition,old_price,new_price);
 elsif strpos(definition,new_price)=0 then raise exception 'BP2_SOURCE_CHANGED';end if;
 if strpos(pg_get_functiondef(f),new_price)=0 then raise exception 'BP2_VERIFY_FAILED';end if;
 -- Include both new prices and all historical receipt prices. Never refund or replay a debit.
 alter table ringu_private.black_market_purchases
  drop constraint black_market_purchases_price_check,
  add constraint black_market_purchases_price_check check(price in (3,5,10,15,30,50,100));
 -- Update prices in the current/unexpired rotations, retaining slot and item identity.
 update ringu_private.black_market_cycles c
 set offers=(select jsonb_agg(case o.value#>>'{item,rarity}'
   when '0' then jsonb_set(o.value,'{price}','3'::jsonb)
   when '1' then jsonb_set(o.value,'{price}','5'::jsonb)
   when '2' then jsonb_set(o.value,'{price}','10'::jsonb)
   when '3' then jsonb_set(o.value,'{price}','15'::jsonb)
   else o.value end order by o.ordinality)
  from jsonb_array_elements(c.offers) with ordinality o(value,ordinality))
 where c.ends_at>cutoff and exists(select 1 from jsonb_array_elements(c.offers) o
  where (o#>>'{item,rarity}'='0' and o->'price' is distinct from '3'::jsonb)
     or (o#>>'{item,rarity}'='1' and o->'price' is distinct from '5'::jsonb)
     or (o#>>'{item,rarity}'='2' and o->'price' is distinct from '10'::jsonb)
     or (o#>>'{item,rarity}'='3' and o->'price' is distinct from '15'::jsonb));
end $bp2$;
