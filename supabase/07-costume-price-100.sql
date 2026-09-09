-- Forward-only price update. Preserve past receipts, ownership and release gate.
begin;
update ringu_private.costume_catalog set price=100 where id in ('kael','serin');
do $$begin
 if (select count(*) from ringu_private.costume_catalog where id in ('kael','serin') and price=100)<>2 then
  raise exception 'COSTUME_CATALOG_NOT_READY';
 end if;
end $$;
commit;
select id,name,price from ringu_private.costume_catalog where id in ('kael','serin') order by id;
