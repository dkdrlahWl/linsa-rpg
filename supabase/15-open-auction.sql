-- Approved production release: fixed price, essence only, zero fees.
-- No player state, items, prices or balances are modified here.
begin;
select pg_advisory_xact_lock(70909,10);
do $$begin
 if not exists(select 1 from ringu_private.auction_release where singleton and economy_ready) then raise exception 'ECONOMY_NOT_READY'; end if;
 if not exists(select 1 from ringu_private.accounts a join ringu_private.auction_accounts e on e.account_id=a.id where a.state?'serverClock') then raise exception 'HOSTED_LOGIN_VERIFICATION_REQUIRED'; end if;
 update ringu_private.auction_release set enabled=true where singleton;
end $$;
commit;
select enabled as auction_open,economy_ready from ringu_private.auction_release;
