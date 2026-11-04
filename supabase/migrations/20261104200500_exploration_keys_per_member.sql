-- 2026-11-04 도현: 링구의 탐험 열쇠 — 방장만 내던 것을 파티원 각자 보유·소모로.
-- ① 시작 시 모든 파티원이 열쇠를 갖고 있어야 함 ② 각자 상자 받을 때 본인 열쇠 차감 ③ 방장 일괄 차감 중지
do $m$
declare def text; a text; b text;
begin
 select pg_get_functiondef('public.rebirth_coop_action(jsonb)'::regprocedure) into def;
 -- ② 상자 수령 시 본인 열쇠 차감 (3단계는 열쇠 없음)
 a:=$x$if w->>'mode'='exploration' then st:=jsonb_set(st,'{materials,dungeonKey}',coalesce(actor.state->'materials'->'dungeonKey','0'::jsonb),true);end if;$x$;
 b:=$x$if w->>'mode'='exploration' then st:=jsonb_set(st,'{materials,dungeonKey}',to_jsonb(greatest(0,coalesce((actor.state->'materials'->>'dungeonKey')::bigint,0)-case when (w->>'tier')::int<>3 then rebirth_private.exploration_key_cost((w->>'tier')::int) else 0 end)),true);end if;$x$;
 if position(a in def)=0 then raise exception 'PATCH_CLAIM_NOT_FOUND';end if; def:=replace(def,a,b);
 -- ③ 방장 일괄 차감 중지
 a:=$x$w->>'keyOwner' is not null and not coalesce((w->>'keyConsumed')::boolean,false) then$x$;
 b:=$x$w->>'keyOwner' is not null and not coalesce((w->>'keyConsumed')::boolean,false) and false then$x$;
 if position(a in def)=0 then raise exception 'PATCH_OWNER_NOT_FOUND';end if; def:=replace(def,a,b);
 -- ① 시작 시 파티원 전원 열쇠 확인
 a:=$x$   if action='start' and (w->>'owner'<>u::text or w->>'status'<>'waiting') then raise exception 'INVALID_COOP_START';end if;$x$;
 b:=a||E'\n'||$x$   if action='start' and w->>'mode'='exploration' and (w->>'tier')::int<>3 and exists(select 1 from jsonb_array_elements(w->'members') mm join rebirth_private.players pl on pl.id=(mm->>'id')::uuid where not coalesce((mm->>'left')::boolean,false) and coalesce((pl.state->'materials'->>'dungeonKey')::bigint,0)<rebirth_private.exploration_key_cost((w->>'tier')::int)) then raise exception 'EXPLORATION_MEMBER_KEY_REQUIRED:%',(select string_agg(coalesce(pl.state->>'name','?')||'('||coalesce((pl.state->'materials'->>'dungeonKey')::bigint,0)||'/'||rebirth_private.exploration_key_cost((w->>'tier')::int)||')',', ') from jsonb_array_elements(w->'members') mm join rebirth_private.players pl on pl.id=(mm->>'id')::uuid where not coalesce((mm->>'left')::boolean,false) and coalesce((pl.state->'materials'->>'dungeonKey')::bigint,0)<rebirth_private.exploration_key_cost((w->>'tier')::int));end if;$x$;
 if position(a in def)=0 then raise exception 'PATCH_START_NOT_FOUND';end if; def:=replace(def,a,b);
 execute def;
end $m$;
