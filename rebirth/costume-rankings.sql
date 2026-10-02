create or replace function public.rebirth_rankings() returns jsonb
language plpgsql security definer set search_path='' as $function$
declare actor uuid;
begin
 actor:=rebirth_private.session_user();
 return (with scores as materialized (
  select id,state->>'name' as name,state->>'classId' as "classId",state->>'equippedCostume' as "costumeId",(state->>'level')::int as level,
   (state->>'xp')::bigint as xp,coalesce((state->>'advancement')::int,0) as advancement,
   rebirth_private.combat_power(state) as "combatPower"
  from rebirth_private.players p where state->>'version'='rebirth-1'
   and not exists(select 1 from auth.users u where u.id=p.id and u.raw_app_meta_data->>'ringu_admin'='true')
 ), ranked as (
  select *,row_number() over(order by level desc,xp desc,id) as "levelRank",
   row_number() over(order by "combatPower" desc,level desc,xp desc,id) as "combatRank",count(*) over() as total from scores
 ) select coalesce(jsonb_agg(q order by q."levelRank"),'[]') from (
  select id,"levelRank" as rank,"levelRank","combatRank",name,"classId","costumeId",level,xp,advancement,"combatPower",id=actor as "isMe",total
  from ranked where "levelRank"<=100 or "combatRank"<=100 or id=actor
 ) q);
end $function$;
