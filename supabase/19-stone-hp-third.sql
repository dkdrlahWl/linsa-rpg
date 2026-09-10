-- S3: ONLY the six transcendence-stone dungeon bosses use one-third HP.
-- Preserve all accounts, rewards, cleared floors, room members and timers.
-- Run transactionally; the same lock order is used by the existing party gateway.
set local lock_timeout='5s';
set local statement_timeout='15s';
do $s3$
declare f oid := to_regprocedure('public.ringu_party_before_economy(text,uuid,integer)');
 body text; definition text;
begin
 perform pg_advisory_xact_lock(70909,10);
 perform pg_advisory_xact_lock(736492021);
 if f is null then raise exception 'S3_PARTY_NOT_INSTALLED'; end if;
 select replace(prosrc,E'\r\n',E'\n') into body from pg_proc where oid=f;
 if md5(body)='6a4104d2dba3c30fb1eb93dd2ef21b5c' then
  definition:=replace(pg_get_functiondef(f),E'\r\n',E'\n');
  definition:=replace(definition,'floor(300000*power(1.5,p_stage-1))','floor(100000*power(1.5,p_stage-1))');
  execute definition;
 elsif md5(body)<>'4c72d69a2c74a43e7e5dff2e0340fc39' then
  raise exception 'S3_SOURCE_CHANGED_REVIEW_REQUIRED';
 end if;
 select replace(prosrc,E'\r\n',E'\n') into body from pg_proc where oid=f;
 if md5(body)<>'4c72d69a2c74a43e7e5dff2e0340fc39' then raise exception 'S3_PATCH_VERIFICATION_FAILED'; end if;
 -- Existing waiting/running rooms also change once, including partially damaged bosses.
 -- The original max-HP predicate makes this safe to reapply without another division.
 update ringu_private.rooms
 set hp=case when hp<=0 then 0 else least(floor(100000*power(1.5,stage-1))::bigint,greatest(1,ceil(hp::numeric/3)::bigint)) end,
     max_hp=floor(100000*power(1.5,stage-1))::bigint
 where status in ('waiting','running') and stage between 1 and 6
   and max_hp=floor(300000*power(1.5,stage-1))::bigint;
end
$s3$;
