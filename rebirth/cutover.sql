-- Authorized new-season cutover. One transaction; private recovery data retained.
-- Does not copy the large legacy inventory or logs: their schema is archived in place.
begin;
set local lock_timeout = '15s';
lock table auth.users in share row exclusive mode;
do $$ begin
 if to_regnamespace('ringu_archive_20260921') is not null then
  raise exception 'CUTOVER_ALREADY_STARTED';
 end if;
 if to_regnamespace('ringu_private') is null then
  raise exception 'LEGACY_SCHEMA_MISSING';
 end if;
 if exists(select 1 from storage.objects) then
  raise exception 'STORAGE_REQUIRES_SEPARATE_BACKUP';
 end if;
end $$;

create temporary table cutover_manifest on commit drop as
select jsonb_build_object(
 'created_at',clock_timestamp(),
 'user_count',(select count(*) from auth.users),
 'foreign_keys',(select jsonb_agg(jsonb_build_object('table',c.relname,'name',k.conname,'definition',pg_get_constraintdef(k.oid))) from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace where k.contype='f' and k.confrelid='auth.users'::regclass and n.nspname='ringu_private'),
 'cron',(select jsonb_agg(jsonb_build_object('id',jobid,'active',active)) from cron.job where jobname in ('ringu-daily-boss-midnight','ringu-world-boss-sweep')),
 'function_grants',(select jsonb_agg(format('GRANT %s ON FUNCTION %s TO %s%s',a.privilege_type,p.oid::regprocedure,case when a.grantee=0 then 'PUBLIC' else quote_ident(pg_get_userbyid(a.grantee)) end,case when a.is_grantable then ' WITH GRANT OPTION' else '' end)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where n.nspname='public' and p.proname like 'ringu_%'),
 'schema_grants',(select jsonb_agg(format('GRANT %s ON SCHEMA ringu_private TO %s%s',a.privilege_type,case when a.grantee=0 then 'PUBLIC' else quote_ident(pg_get_userbyid(a.grantee)) end,case when a.is_grantable then ' WITH GRANT OPTION' else '' end)) from pg_namespace n cross join lateral aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) a where n.nspname='ringu_private')
) as data;

do $$ declare p record; begin
 for p in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'ringu_%' loop
  execute format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated, service_role',p.signature);
 end loop;
end $$;
update cron.job set active=false where jobname in ('ringu-daily-boss-midnight','ringu-world-boss-sweep');
alter schema ringu_private rename to ringu_archive_20260921;
revoke all on schema ringu_archive_20260921 from public,anon,authenticated,service_role;
create table ringu_archive_20260921.cutover_manifest as select * from cutover_manifest;
create table ringu_archive_20260921.auth_users_recovery as table auth.users;
create table ringu_archive_20260921.auth_identities_recovery as table auth.identities;
create table ringu_archive_20260921.rebirth_players_recovery as table rebirth_private.players;
create table ringu_archive_20260921.rebirth_receipts_recovery as table rebirth_private.receipts;
create table ringu_archive_20260921.rebirth_listings_recovery as table rebirth_private.listings;
create table ringu_archive_20260921.rebirth_release_recovery as table rebirth_private.release;
alter table public.rankings set schema ringu_archive_20260921;
alter table public.ringu_player_snapshot set schema ringu_archive_20260921;
alter table public.ringu_pending_grants set schema ringu_archive_20260921;
do $$ declare k record; begin
 for k in select c.relname,k.conname from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace where k.contype='f' and k.confrelid='auth.users'::regclass and n.nspname='ringu_archive_20260921' loop
  execute format('ALTER TABLE ringu_archive_20260921.%I DROP CONSTRAINT %I',k.relname,k.conname);
 end loop;
end $$;

-- Revoked sessions are intentionally never restored.
delete from auth.refresh_tokens;
delete from auth.sessions;
delete from auth.users;
update rebirth_private.release set epoch=gen_random_uuid(),enabled=true where id=true;
insert into ringu_archive_20260921.cutover_manifest(data)
select jsonb_build_object('completed_at',clock_timestamp(),'active_users',(select count(*) from auth.users),'active_characters',(select count(*) from rebirth_private.players),'release_enabled',(select enabled from rebirth_private.release where id=true));
commit;
