-- 2026-11-02 도현: 거래소에서 동료 소환권(state.companions.tickets)·보물찾기 티켓(state.treasure.tickets)도 판매.
-- 다이아처럼 경로(mat_path)만 바꿔 같은 소모품 거래 흐름(등록·구매·취소)을 탄다.
DO $migration$
DECLARE src text; old_allow text; new_allow text; old_path text; new_path text;
BEGIN
 src:=pg_get_functiondef('rebirth_private.market(text,jsonb,uuid)'::regprocedure);
 old_allow:='if material_key not in (''primeCube'',''cube'',''highCube'',''fragment'',''scroll'',''potentialLock'',''dungeonKey'',''diamond'') then raise exception ''INVALID_MATERIAL'';end if;';
 new_allow:='if material_key not in (''primeCube'',''cube'',''highCube'',''fragment'',''scroll'',''potentialLock'',''dungeonKey'',''diamond'',''companionTicket'',''treasureTicket'') then raise exception ''INVALID_MATERIAL'';end if;';
 old_path:='mat_path:=case when material_key=''diamond'' then array[''fishing'',''diamonds''] else array[''materials'',material_key] end;';
 new_path:='mat_path:=case when material_key=''diamond'' then array[''fishing'',''diamonds''] when material_key=''companionTicket'' then array[''companions'',''tickets''] when material_key=''treasureTicket'' then array[''treasure'',''tickets''] else array[''materials'',material_key] end;';
 IF (length(src)-length(replace(src,old_allow,'')))/length(old_allow)<>1 THEN RAISE EXCEPTION 'MARKET_DRIFT_ALLOW'; END IF;
 IF (length(src)-length(replace(src,old_path,'')))/length(old_path)<>2 THEN RAISE EXCEPTION 'MARKET_DRIFT_PATH'; END IF;
 src:=replace(replace(src,old_allow,new_allow),old_path,new_path);
 EXECUTE src;
END;
$migration$;
