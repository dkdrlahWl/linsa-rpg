-- 2026-11-05 도현: 암흑성채 보스별 입장 — 방 만들 때 args.boss(1~6)를 world.citadelBoss로 저장, 모집 목록에도 표시.
do $m$
declare def text; a text;
begin
 select pg_get_functiondef('public.rebirth_coop_action(jsonb)'::regprocedure) into def;
 a:=$x$w:=jsonb_build_object('mode',room_mode,'riftVersion',2,'status','waiting','owner',u,'tier',tier,'members',jsonb_build_array(member),'created',ms);$x$;
 if position(a in def)=0 then raise exception 'CB1';end if;
 def:=replace(def,a,a||$x$ if room_mode='citadel' and coalesce(p->'args'->>'boss','')~'^[1-6]$' then w:=w||jsonb_build_object('citadelBoss',(p->'args'->>'boss')::int);end if;$x$);
 a:=$x$'count',jsonb_array_length(q.world->'members'),'name',q.world->'members'->0->>'name')$x$;
 if position(a in def)=0 then raise exception 'CB2';end if;
 def:=replace(def,a,$x$'count',jsonb_array_length(q.world->'members'),'name',q.world->'members'->0->>'name','boss',q.world->'citadelBoss')$x$);
 execute def;
end $m$;
