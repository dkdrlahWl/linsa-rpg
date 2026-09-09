-- Execute ONLY after costume-live-1 frontend deployment succeeds.
begin;
do $$begin
 if to_regprocedure('public.ringu_save_costume(jsonb,bigint,bigint)') is null then raise exception 'COSTUME_INTEGRATION_REQUIRED'; end if;
 if (select count(*) from ringu_private.costume_catalog where id in ('kael','serin') and price=100)<>2 then raise exception 'COSTUME_PRICE_MISMATCH'; end if;
end $$;
update ringu_private.costume_release set purchases_enabled=true where singleton;
commit;
select purchases_enabled,essence_authoritative from ringu_private.costume_release;
