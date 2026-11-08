-- 2026-11-09 도현: 성채·링탐 연결 지연 — 자주 갱신되는 표의 자동 정리 강화 (이미 적용됨, 기록용).
alter table rebirth_private.coop_rooms set (fillfactor=50, autovacuum_vacuum_scale_factor=0, autovacuum_vacuum_threshold=20, autovacuum_analyze_scale_factor=0, autovacuum_analyze_threshold=50, autovacuum_vacuum_cost_delay=0, toast.autovacuum_vacuum_scale_factor=0, toast.autovacuum_vacuum_threshold=200, toast.autovacuum_vacuum_cost_delay=0);
alter table rebirth_private.coop_input_frames set (fillfactor=70, autovacuum_vacuum_scale_factor=0, autovacuum_vacuum_threshold=200, autovacuum_analyze_scale_factor=0, autovacuum_analyze_threshold=500, autovacuum_vacuum_cost_delay=0);
alter table rebirth_private.players set (fillfactor=50, autovacuum_vacuum_scale_factor=0, autovacuum_vacuum_threshold=20, autovacuum_analyze_scale_factor=0, autovacuum_analyze_threshold=50, autovacuum_vacuum_cost_delay=0, toast.autovacuum_vacuum_scale_factor=0, toast.autovacuum_vacuum_threshold=200, toast.autovacuum_vacuum_cost_delay=0);
-- 끝난 방(complete·lost)은 10분 뒤 삭제, won은 1시간 유지. cron job 12는 5분마다.
create or replace function rebirth_private.cleanup_finished_coop_rooms() returns integer language sql security definer set search_path to '' as $function$
 with refs as (select state->>'coopRoom' id from rebirth_private.players where state->>'coopRoom' is not null),
 del as (
  delete from rebirth_private.coop_rooms r
  where ((r.world->>'status' in ('complete','lost') and r.created_at<now()-interval '10 minutes')
      or (r.world->>'status'='won' and r.created_at<now()-interval '1 hour'))
    and r.id::text not in (select id from refs where id is not null)
  returning 1)
 select count(*)::int from del;
$function$;
select cron.alter_job(job_id:=12, schedule:='*/5 * * * *');
