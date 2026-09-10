-- BP1: rare 30 essence, epic 50 essence; common 5 and uncommon 15 unchanged.
-- Apply after the existing black-market foundation. No player balance,
-- receipt, purchase limit, item attribute, rarity chance or rotation is reset.
set local lock_timeout='5s';
set local statement_timeout='15s';
do $bp1$
declare f oid:=to_regprocedure('ringu_private.black_market_current()');
 definition text; old_price text:='price:=(array[5,15,50,100])[r+1];';
 new_price text:='price:=(array[5,15,30,50])[r+1];'; cutoff timestamptz;
begin
 perform pg_advisory_xact_lock(70909,10);
 cutoff:=clock_timestamp();
 if f is null then raise exception 'BP1_MARKET_NOT_INSTALLED';end if;
 definition:=pg_get_functiondef(f);
 if strpos(definition,old_price)>0 then
  if (length(definition)-length(replace(definition,old_price,'')))/length(old_price)<>1
   or strpos(definition,new_price)>0 then raise exception 'BP1_SOURCE_CHANGED';end if;
  execute replace(definition,old_price,new_price);
 elsif strpos(definition,new_price)=0 then raise exception 'BP1_SOURCE_CHANGED';end if;
 if strpos(pg_get_functiondef(f),new_price)=0 then raise exception 'BP1_VERIFY_FAILED';end if;
 -- Keep 100 valid for historical receipts; allow the new 30-essence debit.
 alter table ringu_private.black_market_purchases
  drop constraint black_market_purchases_price_check,
  add constraint black_market_purchases_price_check check(price in (5,15,30,50,100));
 -- Preserve each existing offer and its slot; never reroll or restore purchases.
 update ringu_private.black_market_cycles c
 set offers=(select jsonb_agg(case o.value#>>'{item,rarity}'
   when '2' then jsonb_set(o.value,'{price}','30'::jsonb)
   when '3' then jsonb_set(o.value,'{price}','50'::jsonb)
   else o.value end order by o.ordinality)
  from jsonb_array_elements(c.offers) with ordinality o(value,ordinality))
 where c.ends_at>cutoff and exists(select 1 from jsonb_array_elements(c.offers) o
  where (o#>>'{item,rarity}'='2' and o->'price' is distinct from '30'::jsonb)
     or (o#>>'{item,rarity}'='3' and o->'price' is distinct from '50'::jsonb));
end $bp1$;
