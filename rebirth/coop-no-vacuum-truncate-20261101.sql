-- 2026-11-01: 성채/협동 "연결 지연" 멈춤 수정
-- coop_rooms(월드 jsonb)·coop_input_frames는 매 프레임 갱신돼서 autovacuum이 계속 돈다.
-- vacuum이 끝에서 빈 페이지를 잘라낼 때(truncate) 테이블/TOAST에 AccessExclusiveLock을 잡아
-- 그동안 rebirth_coop_action·rebirth_coop_frame_snapshot이 1~8초씩 대기 → 연결 지연.
-- truncate만 끄면 잠금이 사라지고, 빈 공간은 다음 갱신에 그대로 재사용된다.
set local lock_timeout='5s';
alter table rebirth_private.coop_rooms set (vacuum_truncate=false, toast.vacuum_truncate=false);
alter table rebirth_private.coop_input_frames set (vacuum_truncate=false, toast.vacuum_truncate=false);
-- 같은 이유로 자주 갱신되는 세이브·코인 테이블도 끈다.
alter table rebirth_private.players set (vacuum_truncate=false, toast.vacuum_truncate=false);
alter table rebirth_private.coin_market set (vacuum_truncate=false, toast.vacuum_truncate=false);
-- 적용 완료: 2026-11-01 15:02 KST
