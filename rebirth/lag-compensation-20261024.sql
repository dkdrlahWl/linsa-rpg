-- One-time direct credit to all current player accounts, including offline users.
-- Keep the credit and its audit marker in the same revision-protected write.
BEGIN;
SET LOCAL lock_timeout='3s';
DO $grant$
BEGIN
 PERFORM id FROM rebirth_private.players ORDER BY id FOR UPDATE;
 IF EXISTS(SELECT 1 FROM rebirth_private.players
  WHERE NOT coalesce(state->'operatorGoldGrants','{}'::jsonb) ? 'lag-compensation-20261024'
   AND (jsonb_typeof(state->'gold') IS DISTINCT FROM 'number'
    OR (state->>'gold')::numeric<0 OR (state->>'gold')::numeric+5000000>9000000000000)) THEN
  RAISE EXCEPTION 'Invalid compensation balance';
 END IF;
 UPDATE rebirth_private.players
 SET state=jsonb_set(state,'{gold}',to_jsonb((state->>'gold')::bigint+5000000))
  ||jsonb_build_object('operatorGoldGrants',coalesce(state->'operatorGoldGrants','{}'::jsonb)
   ||jsonb_build_object('lag-compensation-20261024',jsonb_build_object(
    'amount',5000000,'balanceBefore',(state->>'gold')::bigint,'grantedAt',clock_timestamp()))),
  revision=revision+1,updated_at=now()
 WHERE NOT coalesce(state->'operatorGoldGrants','{}'::jsonb) ? 'lag-compensation-20261024';
END $grant$;
SELECT count(*) AS credited_accounts,
 sum((state->'operatorGoldGrants'->'lag-compensation-20261024'->>'amount')::bigint) AS total_gold
FROM rebirth_private.players
WHERE state->'operatorGoldGrants' ? 'lag-compensation-20261024';
COMMIT;
