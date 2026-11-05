-- 2026-11-05 도현: 성채 보스별 입장 오름차순 해금 — 2번 보스부터는 바로 앞 보스를 보스별 입장으로 처치해야 방을 만들 수 있다(관리자 제외).
do $m$
declare def text; a text;
begin
 select pg_get_functiondef('public.rebirth_coop_action(jsonb)'::regprocedure) into def;
 a:=$x$ if room_mode='citadel' and coalesce(p->'args'->>'boss','')~'^[1-6]$' then w:=w||jsonb_build_object('citadelBoss',(p->'args'->>'boss')::int);end if;$x$;
 if position(a in def)=0 then raise exception 'CBA1';end if;
 def:=replace(def,a,$x$ if room_mode='citadel' and coalesce(p->'args'->>'boss','')~'^[2-6]$' and not coalesce((actor.state->>'isAdmin')::boolean,false) and not (coalesce(actor.state->'citadelBossClear','[]'::jsonb) @> jsonb_build_array((p->'args'->>'boss')::int-1)) then raise exception 'CITADEL_PREVIOUS_REQUIRED';end if;$x$||a);
 execute def;
end $m$;
