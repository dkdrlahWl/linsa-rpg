begin;
set local lock_timeout='5s';
-- Retain all current combat, payout and lock-order behavior; remove only the cap.
do $$
declare definition text:=pg_get_functiondef('ringu_private.wb_advance(uuid)'::regprocedure);
begin
 if strpos(definition,'and d.hp=0 and not d.revived')=0 then
  raise exception 'Expected revival eligibility guard not found';
 end if;
 execute replace(definition,'and d.hp=0 and not d.revived','and d.hp=0');
end $$;
commit;
