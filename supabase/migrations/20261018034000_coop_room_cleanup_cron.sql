-- 끝난 협동 방 자동 정리(매시 17분): 끝난 지 1시간 넘었고 아무 플레이어도 coopRoom으로 가리키지 않는 방만 삭제.
-- 진행 중(fighting/waiting) 방은 건드리지 않는다. 입력 프레임은 FK on delete cascade로 함께 정리된다.
create or replace function rebirth_private.cleanup_finished_coop_rooms() returns integer
language sql security definer set search_path to '' as $$
 with refs as (select state->>'coopRoom' id from rebirth_private.players where state->>'coopRoom' is not null),
 del as (
  delete from rebirth_private.coop_rooms r
  where r.world->>'status' in ('complete','lost','won')
    and r.created_at<now()-interval '1 hour'
    and r.id::text not in (select id from refs where id is not null)
  returning 1)
 select count(*)::int from del;
$$;
revoke all on function rebirth_private.cleanup_finished_coop_rooms() from public,anon,authenticated;
select cron.schedule('rebirth-coop-room-cleanup','17 * * * *',$$select rebirth_private.cleanup_finished_coop_rooms()$$);
