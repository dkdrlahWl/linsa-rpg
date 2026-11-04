-- 2026-11-04 도현: 전문 직업 직업당 최대 3명 — 직업별 인원(관리자·테스터 제외)
create or replace function rebirth_private.profession_counts() returns jsonb
language sql stable security definer set search_path to '' as $f$
 select coalesce(jsonb_object_agg(id,n),'{}'::jsonb) from (
  select state->'profession'->>'id' id, count(*) n from rebirth_private.players
  where state->'profession'->>'id' is not null and coalesce((state->>'isAdmin')::boolean,false)=false and coalesce((state->>'isTester')::boolean,false)=false
  group by 1) t
$f$;
revoke all on function rebirth_private.profession_counts() from public,anon,authenticated;
grant execute on function rebirth_private.profession_counts() to service_role;
create or replace function public.rebirth_profession_counts() returns jsonb language sql security invoker set search_path to '' as $f$select rebirth_private.profession_counts()$f$;
revoke all on function public.rebirth_profession_counts() from public,anon,authenticated;
grant execute on function public.rebirth_profession_counts() to service_role;
