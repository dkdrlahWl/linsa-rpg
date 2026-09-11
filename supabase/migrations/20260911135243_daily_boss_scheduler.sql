-- Supabase-hosted scheduler. Asia/Seoul midnight is 15:00 UTC year-round.
-- Login/sync independently runs catch-up if the scheduler/server was unavailable.
begin;
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('ringu-daily-boss-midnight','0 15 * * *','select ringu_private.daily_boss_settle()');
commit;
