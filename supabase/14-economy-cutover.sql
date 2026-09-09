-- Maintenance cutover. Apply only after 10/11, protected backup and Edge deployment.
-- Keeps marketplace CLOSED until authenticated hosted verification succeeds.
begin;
select pg_advisory_xact_lock(70909,10);
do $$declare a record; k text; begin
 if to_regclass('ringu_private.pre_auction_accounts_20260909') is null then raise exception 'BACKUP_REQUIRED'; end if;
 for a in select id,state,revision from ringu_private.accounts where state is not null for update loop
  foreach k in array array['gold','essence','transcendStone','downgradeProtect','dungeonTickets','petStone','petTicket'] loop
   perform ringu_private.auction_integer(coalesce(a.state->k,'0'::jsonb));
  end loop;
  insert into ringu_private.economy_baselines(account_id,state,revision) values(a.id,a.state,a.revision) on conflict do nothing;
  perform ringu_private.auction_import(a.id);
 end loop;
 update ringu_private.auction_release set economy_ready=true where singleton;
end $$;
commit;
select economy_ready,enabled,(select count(*) from ringu_private.auction_accounts) as enrolled_accounts,
 (select count(*) from ringu_private.auction_items) as registered_equipment
from ringu_private.auction_release;
