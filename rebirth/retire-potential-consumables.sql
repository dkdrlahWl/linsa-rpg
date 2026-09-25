-- Retired consumables: refund only outstanding listing quantities and current stock.
-- The shared write lock and player revisions prevent concurrent saves losing refunds.
select pg_advisory_xact_lock(71823001);
do $retire$
declare listing record; refund bigint;
begin
 for listing in select id,seller,item from rebirth_private.listings
  where status='open' and item->>'kind'='consumable' and item->>'key' in ('expand','scroll')
  for update
 loop
  refund:=coalesce((listing.item->>'quantity')::bigint,0)*
    case when listing.item->>'key'='expand' then 20 else 3 end;
  update rebirth_private.players
   set state=jsonb_set(state,'{materials,fragment}',to_jsonb(coalesce((state->'materials'->>'fragment')::bigint,0)+refund)),
    revision=revision+1,updated_at=now() where id=listing.seller;
  update rebirth_private.listings set status='cancelled' where id=listing.id;
 end loop;
 update rebirth_private.players
 set state=jsonb_set(state,'{materials}',
   ((state->'materials')-'expand'-'scroll')||jsonb_build_object('fragment',
    coalesce((state->'materials'->>'fragment')::bigint,0)+
    coalesce((state->'materials'->>'expand')::bigint,0)*20+
    coalesce((state->'materials'->>'scroll')::bigint,0)*3)),
   revision=revision+1,updated_at=now()
 where state->'materials' ?| array['expand','scroll'];
end $retire$;
