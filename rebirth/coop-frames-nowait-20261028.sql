-- 2026-10-28: 협동 방(레이드·탐험·성채·전직) 입력 큐 잠금 대기 줄이기. 게임 규칙·판정은 그대로.
-- 이미 큐에 있는 입력 프레임은 insert 전에 걸러낸다(재전송 프레임이 소비 중인 행을 ON CONFLICT로 기다리지 않음).
-- 주의: "world가 같으면 coop_rooms 쓰기/revision 증가 생략"도 시도했으나, 엣지가 revision 증가를 전제로 해서
-- SAVE_CONFLICT가 대량 발생해 약 2분 만에 되돌렸다(revert_coop_noop_write_skip_20261028). 다시 넣지 말 것.
do $m$
declare def text; patched text; a1 text:='   on conflict(room_id,user_id,tick) do nothing;';
begin
 def:=pg_get_functiondef('public.rebirth_coop_action(jsonb)'::regprocedure);
 if (length(def)-length(replace(def,a1,'')))/length(a1)<>1 then raise exception 'COOP_PATCH_DRIFT'; end if;
 patched:=replace(def,a1,'    and not exists(select 1 from rebirth_private.coop_input_frames q where q.room_id=rid and q.user_id=u and q.tick=(f->>''tick'')::int)
   on conflict(room_id,user_id,tick) do nothing;');
 execute patched;
end $m$;
