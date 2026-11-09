-- 2026-11-09 도현: 최종 보스(레이드 4~6단계) — 입장 레벨 300/350/400, 최대 7명.
-- rebirth_coop_action 본문에서 레이드 단계 상한(3 → 6)과 인원·레벨 조건만 바꾼다.
do $$
declare f text:=pg_get_functiondef('rebirth_coop_action(jsonb)'::regprocedure); g text;
begin
 g:=replace(f,$a$if room_mode='raid' and tier not between 0 and 3 then raise exception 'INVALID_RAID';end if;$a$,
  $a$if room_mode='raid' and tier not between 0 and 6 then raise exception 'INVALID_RAID';end if;
   if room_mode='raid' and tier between 4 and 6 and coalesce((actor.state->>'level')::int,0)<(array[300,350,400])[tier-3] then raise exception 'LEVEL_REQUIRED';end if;$a$);
 g:=replace(g,$a$when w->>'mode'='raid' then 8$a$,$a$when w->>'mode'='raid' and (w->>'tier')::int>=4 then 7 when w->>'mode'='raid' then 8$a$);
 g:=replace(g,$a$if (w->>'tier')::int not between 0 and 3 or jsonb_array_length(w->'members') not between 1 and 8 then raise exception 'INVALID_RAID'$a$,
  $a$if (w->>'tier')::int not between 0 and 6 or jsonb_array_length(w->'members') not between 1 and (case when (w->>'tier')::int>=4 then 7 else 8 end) then raise exception 'INVALID_RAID'$a$);
 if g=f or position('tier between 4 and 6' in g)=0 or position('then 7 when' in g)=0 or position('not between 0 and 6 or' in g)=0 then raise exception 'FINAL_BOSS_PATCH_MISMATCH'; end if;
 execute g;
end $$;
