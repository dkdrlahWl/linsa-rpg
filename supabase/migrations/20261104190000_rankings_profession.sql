-- 2026-11-04 도현: 랭킹에 전문 직업 표시
do $m$
declare def text;
begin
 select pg_get_functiondef('public.rebirth_rankings()'::regprocedure) into def;
 if position($a$coalesce(state->>'tribe','human') as tribe,$a$ in def)=0 or position($a$title,tribe,level,xp,$a$ in def)=0 then raise exception 'RANKINGS_PATCH_NOT_FOUND';end if;
 def:=replace(def,$a$coalesce(state->>'tribe','human') as tribe,$a$,$a$coalesce(state->>'tribe','human') as tribe,state->'profession'->>'id' as profession,$a$);
 def:=replace(def,$a$title,tribe,level,xp,$a$,$a$title,tribe,profession,level,xp,$a$);
 execute def;
end $m$;
