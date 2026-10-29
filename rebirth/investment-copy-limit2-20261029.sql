-- 2026-10-29: 카피 인원 제한 3명 → 2명. 이미 카피 중인 사람은 그대로 두고, 새 신청만 2명에서 막는다.
do $m$
declare def text; patched text;
begin
 def:=pg_get_functiondef('rebirth_private.coin_copy(text,uuid)'::regprocedure);
 patched:=replace(def,'where leader=p_leader)>=3 then raise exception ''COPY_LEADER_FULL''','where leader=p_leader)>=2 then raise exception ''COPY_LEADER_FULL''');
 if patched=def and position('where leader=p_leader)>=2 then raise exception ''COPY_LEADER_FULL''' in def)=0 then raise exception 'COPY_LIMIT2_DRIFT'; end if;
 if patched<>def then execute patched; end if;
 def:=pg_get_functiondef('rebirth_private.coin_copy_status(uuid)'::regprocedure);
 patched:=replace(def,'''maxCopiers'',3,','''maxCopiers'',2,');
 if patched=def and position('''maxCopiers'',2,' in def)=0 then raise exception 'COPY_LIMIT2_STATUS_DRIFT'; end if;
 if patched<>def then execute patched; end if;
end $m$;
