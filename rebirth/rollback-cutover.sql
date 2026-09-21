-- Operator recovery only. New-season users must be handled separately if any exist.
-- Also restore the previous GitHub main commit and legacy Edge Function source.
begin;
lock table auth.users in share row exclusive mode;
do $$ begin
 if exists(select 1 from auth.users) then raise exception 'NEW_SEASON_USERS_EXIST_REQUIRES_MANUAL_RECOVERY'; end if;
end $$;
update rebirth_private.release set enabled=false;
do $$ declare cols text; t text; begin
 foreach t in array array['users','identities'] loop
  select string_agg(quote_ident(attname),',' order by attnum) into cols from pg_attribute where attrelid=format('auth.%I',t)::regclass and attnum>0 and not attisdropped and attgenerated='';
  execute format('INSERT INTO auth.%I (%s) SELECT %s FROM ringu_archive_20260921.%I',t,cols,cols,'auth_'||t||'_recovery');
 end loop;
end $$;
alter table ringu_archive_20260921.rankings set schema public;
alter table ringu_archive_20260921.ringu_player_snapshot set schema public;
alter table ringu_archive_20260921.ringu_pending_grants set schema public;
alter schema ringu_archive_20260921 rename to ringu_private;
do $$ declare m jsonb; k jsonb; s text; begin
 select data into m from ringu_private.cutover_manifest where data ? 'foreign_keys' limit 1;
 for k in select value from jsonb_array_elements(m->'foreign_keys') loop
  execute format('ALTER TABLE ringu_private.%I ADD CONSTRAINT %I %s',k->>'table',k->>'name',k->>'definition');
 end loop;
 for s in select jsonb_array_elements_text(m->'function_grants') loop execute s; end loop;
 for s in select jsonb_array_elements_text(m->'schema_grants') loop execute s; end loop;
 for k in select value from jsonb_array_elements(m->'cron') loop update cron.job set active=(k->>'active')::boolean where jobid=(k->>'id')::bigint; end loop;
end $$;
-- Credentials and game state are restored; users must log in again.
commit;
