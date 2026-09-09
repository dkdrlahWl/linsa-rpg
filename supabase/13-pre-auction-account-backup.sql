-- Run before enabling the new economy. Preserve server saves, not browser data.
begin;
create table if not exists ringu_private.pre_auction_accounts_20260909 as
 select id,state,revision,active_session,session_started,updated_at,clock_timestamp() as backed_up_at
 from ringu_private.accounts;
alter table ringu_private.pre_auction_accounts_20260909 enable row level security;
revoke all on ringu_private.pre_auction_accounts_20260909 from public,anon,authenticated;
commit;
select count(*) as backed_up_accounts,
 sum(case when jsonb_typeof(state->'inventory')='array' then jsonb_array_length(state->'inventory') else 0 end) as backed_up_equipment
from ringu_private.pre_auction_accounts_20260909;
