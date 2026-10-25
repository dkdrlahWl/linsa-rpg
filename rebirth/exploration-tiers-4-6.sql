-- 2026-10-25 링구의 탐험 4~6단계 (id 4,5,6; id 3은 암흑성채).
-- 입장 열쇠: 4단계 1개 · 5단계 2개 · 6단계 3개 (방장, 최종 클리어 시 차감). 이전 단계: 4→2, 5→4, 6→5.
create or replace function rebirth_private.exploration_key_cost(t int) returns int
language sql immutable set search_path='' as $$select case when t=5 then 2 when t=6 then 3 else 1 end$$;

do $patch$
declare src text; n int;
procedure_name constant text := 'public.rebirth_coop_action(jsonb)';
begin
 select pg_get_functiondef(procedure_name::regprocedure) into src;
 -- [old, new] pairs; each old must appear exactly once.
 declare pairs text[][] := array[
  array[$o$if room_mode='exploration' and tier not between 0 and 2 then raise exception 'INVALID_EXPLORATION';end if;$o$,
        $n$if room_mode='exploration' and tier not in (0,1,2,4,5,6) then raise exception 'INVALID_EXPLORATION';end if;$n$],
  array[$o$if room_mode='exploration' and tier between 1 and 2 and not (coalesce(actor.state->'exploration'->'cleared','[]'::jsonb) @> jsonb_build_array(tier-1)) then raise exception 'EXPLORATION_PREVIOUS_REQUIRED';end if;$o$,
        $n$if room_mode='exploration' and tier in (1,2,4,5,6) and not (coalesce(actor.state->'exploration'->'cleared','[]'::jsonb) @> jsonb_build_array(case when tier=4 then 2 else tier-1 end)) then raise exception 'EXPLORATION_PREVIOUS_REQUIRED';end if;$n$],
  array[$o$<1+(select count(*) from rebirth_private.coop_rooms q where q.world->>'keyOwner'=u::text and q.world->>'status' in ('waiting','fighting') and (q.world->>'status'='fighting' or q.created_at>now()-interval '15 minutes') and (rid is null or q.id<>rid))$o$,
        $n$<rebirth_private.exploration_key_cost(tier)+(select coalesce(sum(rebirth_private.exploration_key_cost((q.world->>'tier')::int)),0) from rebirth_private.coop_rooms q where q.world->>'keyOwner'=u::text and q.world->>'status' in ('waiting','fighting') and (q.world->>'status'='fighting' or q.created_at>now()-interval '15 minutes') and (rid is null or q.id<>rid))$n$],
  array[$o$if action='start' and w->>'mode'='exploration' and (w->>'tier')::int between 0 and 2 and coalesce((actor.state->'materials'->>'dungeonKey')::bigint,0)<1+(select count(*) from rebirth_private.coop_rooms q where q.id<>rid$o$,
        $n$if action='start' and w->>'mode'='exploration' and (w->>'tier')::int<>3 and coalesce((actor.state->'materials'->>'dungeonKey')::bigint,0)<rebirth_private.exploration_key_cost((w->>'tier')::int)+(select coalesce(sum(rebirth_private.exploration_key_cost((q.world->>'tier')::int)),0) from rebirth_private.coop_rooms q where q.id<>rid$n$],
  array[$o$if action='start' and w->>'mode'='exploration' and ((w->>'tier')::int not between 0 and 3 or$o$,
        $n$if action='start' and w->>'mode'='exploration' and ((w->>'tier')::int not in (0,1,2,3,4,5,6) or$n$],
  array[$o$if tier between 1 and 2 and not (coalesce(st->'exploration'->'cleared','[]'::jsonb) @> jsonb_build_array(tier-1)) then raise exception 'EXPLORATION_PREVIOUS_REQUIRED';end if;$o$,
        $n$if tier in (1,2,4,5,6) and not (coalesce(st->'exploration'->'cleared','[]'::jsonb) @> jsonb_build_array(case when tier=4 then 2 else tier-1 end)) then raise exception 'EXPLORATION_PREVIOUS_REQUIRED';end if;$n$],
  array[$o$if action='open' and w->>'mode'='exploration' and (w->>'tier')::int<3 and$o$,
        $n$if action='open' and w->>'mode'='exploration' and (w->>'tier')::int<>3 and$n$],
  array[$o$if coalesce((st->'materials'->>'dungeonKey')::bigint,0)>=1 then
    update rebirth_private.players set state=jsonb_set(state,'{materials,dungeonKey}',to_jsonb((state->'materials'->>'dungeonKey')::bigint-1)),revision=revision+1,updated_at=now() where id=key_payer;$o$,
        $n$if coalesce((st->'materials'->>'dungeonKey')::bigint,0)>=1 then
    update rebirth_private.players set state=jsonb_set(state,'{materials,dungeonKey}',to_jsonb(greatest(0,(state->'materials'->>'dungeonKey')::bigint-rebirth_private.exploration_key_cost((w->>'tier')::int)))),revision=revision+1,updated_at=now() where id=key_payer;$n$]
 ];
 i int;
 begin
  for i in 1..array_length(pairs,1) loop
   n := (length(src)-length(replace(src,pairs[i][1],'')))/length(pairs[i][1]);
   if n<>1 then raise exception 'EXPLORATION_TIER_PATCH % matched % times',i,n; end if;
   src := replace(src,pairs[i][1],pairs[i][2]);
  end loop;
 end;
 execute src;
end $patch$;
