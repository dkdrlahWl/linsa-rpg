-- 2026-10-19: 성채 상자 수령이 방(revision)을 건드리지 않도록.
-- 상자 수령(open, citadel/탐험 4단계)은 플레이어 행만 바꾸는데도 공통 블록을 타서
-- coop_rooms를 같은 world로 다시 쓰고 revision+1을 하고 있었다. 4명이 동시에 수령하면
-- 진행 중인 전투 시뮬레이션 커밋이 매번 낡은 revision이 되어 버려지고(입력은 lock timeout 500),
-- 보스 처치 직후 방이 멈췄다. 수령 분기에서 w를 비워 방 쓰기 블록을 건너뛴다.
DO $migration$
DECLARE source text; anchor text; patched text;
BEGIN
 source:=pg_get_functiondef('public.rebirth_coop_action(jsonb)'::regprocedure);
 anchor:=E'    update rebirth_private.players set state=st,revision=revision+1,updated_at=now() where id=u;\n    events:=jsonb_build_array(reward);\n   else\n';
 IF position('w:=null; -- citadel claim' in source)>0 THEN RETURN; END IF;
 IF (length(source)-length(replace(source,anchor,'')))/length(anchor)<>1 THEN RAISE EXCEPTION 'CLAIM_NO_ROOM_BUMP_DRIFT'; END IF;
 patched:=replace(source,anchor,
  E'    update rebirth_private.players set state=st,revision=revision+1,updated_at=now() where id=u;\n    events:=jsonb_build_array(reward);\n    w:=null; -- citadel claim touches only the player row; keep the room revision for the running simulation\n   else\n');
 EXECUTE patched;
END $migration$;
