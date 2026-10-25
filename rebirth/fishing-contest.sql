-- 2026-10-25 주간 대어 대회 순위. 기록은 players.state->fishing->contest->'YYYY-MM-DD'(월요일 KST)에 서버 엔진이 남긴다.
-- p_week: 이번 주 시작일(엣지 함수가 서버 시각으로 계산). 이번 주 순위(10위 + 나), 지난주 1~3위, 최근 4주 내 내 입상 기록을 돌려준다.
create or replace function rebirth_private.fishing_contest(p_week date) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=rebirth_private.session_user();
begin
 return (with weeks as (
  select (p_week-7*k)::date as w,k from generate_series(0,4) k
 ), entries as materialized (
  select w.w,w.k,p.id,p.state->>'name' as name,p.state->>'classId' as cls,
   (p.state->'fishing'->'contest'->(w.w::text)->>'weight')::bigint as weight,
   (p.state->'fishing'->'contest'->(w.w::text)->>'at')::bigint as at,
   p.state->'fishing'->'contest'->(w.w::text)->>'species' as species
  from weeks w join rebirth_private.players p on (p.state->'fishing'->'contest') ? (w.w::text)
  where p.state->>'version'='rebirth-1'
   and not exists(select 1 from auth.users u where u.id=p.id and (u.raw_app_meta_data->>'ringu_admin'='true' or u.raw_app_meta_data->>'ringu_tester'='true'))
 ), ranked as materialized (
  select *,row_number() over(partition by w order by weight desc,at,id)::int as rank,count(*) over(partition by w)::int as total from entries
 ) select jsonb_build_object(
  'week',p_week::text,
  'total',coalesce((select max(total) from ranked where k=0),0),
  'top',coalesce((select jsonb_agg(jsonb_build_object('rank',rank,'name',name,'classId',cls,'weight',weight,'species',species,'isMe',id=actor) order by rank) from ranked where k=0 and (rank<=10 or id=actor)),'[]'::jsonb),
  'last',coalesce((select jsonb_agg(jsonb_build_object('rank',rank,'name',name,'weight',weight,'species',species,'isMe',id=actor) order by rank) from ranked where k=1 and rank<=3),'[]'::jsonb),
  'rewards',coalesce((select jsonb_agg(jsonb_build_object('week',w::text,'rank',rank) order by w) from ranked where k>0 and id=actor and rank<=3),'[]'::jsonb)));
end $$;
revoke all on function rebirth_private.fishing_contest(date) from public;
grant execute on function rebirth_private.fishing_contest(date) to authenticated;

create or replace function public.rebirth_fishing_contest(p_week date) returns jsonb
language sql set search_path='' as $$select rebirth_private.fishing_contest(p_week)$$;
revoke all on function public.rebirth_fishing_contest(date) from public,anon;
grant execute on function public.rebirth_fishing_contest(date) to authenticated,service_role;
