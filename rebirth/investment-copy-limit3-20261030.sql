-- 2026-10-30: 한 유저를 카피할 수 있는 인원 최대 2명 → 3명.
do $m$
declare def text;
begin
 def:=pg_get_functiondef('rebirth_private.coin_copy(text,uuid)'::regprocedure);
 if position('where leader=p_leader)>=2 then raise exception ''COPY_LEADER_FULL''' in def)=0 then raise exception 'COPY_LIMIT3_DRIFT'; end if;
 execute replace(def,'where leader=p_leader)>=2 then raise exception ''COPY_LEADER_FULL''','where leader=p_leader)>=3 then raise exception ''COPY_LEADER_FULL''');
 def:=pg_get_functiondef('rebirth_private.coin_copy_status(uuid)'::regprocedure);
 if position('''maxCopiers'',2' in def)=0 then raise exception 'COPY_LIMIT3_STATUS_DRIFT'; end if;
 execute replace(def,'''maxCopiers'',2','''maxCopiers'',3');
end $m$;
