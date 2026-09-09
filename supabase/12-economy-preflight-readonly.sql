-- Read-only inspection. This does not enable the release, migrate players,
-- expose player saves or change any currency/equipment.
begin read only;
select count(*) as accounts,
 count(*) filter(where state is null) as not_initialized,
 count(*) filter(where state is not null and jsonb_typeof(state->'inventory') is distinct from 'array') as invalid_inventory_shape,
 count(*) filter(where state is not null and jsonb_typeof(state->'summons') is distinct from 'object') as legacy_summons_shape
from ringu_private.accounts;
with items as (
 select a.id as account_id,it from ringu_private.accounts a
 cross join lateral jsonb_array_elements(case when jsonb_typeof(a.state->'inventory')='array' then a.state->'inventory' else '[]'::jsonb end) it
), duplicates as (select account_id,it->>'id' from items group by account_id,it->>'id' having count(*)>1)
select (select count(*) from duplicates) as duplicate_ids_requiring_review,
 count(*) filter(where jsonb_typeof(it->'id') is distinct from 'number') as invalid_id_types,
 count(*) filter(where it->>'slot' not in ('무기','투구','갑옷','바지','신발','반지','귀걸이') or not(it?'slot')) as unknown_slots,
 count(*) filter(where not(it?'optionRolls')) as missing_legacy_options,
 count(*) as equipment_count
from items;
select to_regprocedure('public.ringu_economy_snapshot(uuid)') is not null as economy_gateway_installed,
 to_regprocedure('public.ringu_auction(text,jsonb,uuid)') is not null as auction_rpc_installed;
commit;
