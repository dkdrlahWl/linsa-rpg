-- Apply after schema.sql and party.sql. Display-only combat rating mirrors engine.power().
create or replace function rebirth_private.combat_power(s jsonb) returns bigint
language plpgsql immutable security invoker set search_path='' as $$
declare
 cl text:=s->>'classId'; main text; lv double precision:=(s->>'level')::double precision;
 atk double precision:=12+lv*2; stat double precision; hp double precision:=100+lv*22; def double precision:=lv*.5;
 stat_pct double precision:=0; atk_pct double precision:=0; hp_pct double precision:=0; def_pct double precision:=0; crit_pct double precision:=0; boss_pct double precision:=0;
 it jsonb; ln jsonb; eid text; k text; val double precision; growth double precision; base double precision; ilv double precision; stars double precision; quality double precision;
 crit double precision; crit_damage double precision; cadence double precision;
begin
 main:=case cl when 'warrior' then 'STR' when 'mage' then 'INT' when 'archer' then 'DEX' when 'rogue' then 'LUK' when 'pirate' then 'DEX' end;
 if main is null then return 0; end if;
 stat:=coalesce((s->'stats'->>main)::double precision,4)+lv*2;
 for eid in select value from jsonb_each_text(coalesce(s->'equipped','{}')) loop
  select value into it from jsonb_array_elements(coalesce(s->'items','[]')) where value->>'id'=eid limit 1;
  if it is null or coalesce((it->>'broken')::boolean,false) then continue; end if;
  ilv:=(it->>'level')::double precision; stars:=coalesce((it->>'stars')::double precision,0);
  quality:=.9+coalesce((it->>'quality')::double precision,50)*.002;
  growth:=1+stars*.055+power(greatest(0,stars-15),1.4)*.025;
  if it ? 'baseStats' then
   atk:=atk+(it->'baseStats'->>'attack')::float8*growth+stars;
   stat:=stat+floor((it->'baseStats'->>'stat')::float8*growth)+stars;
   hp:=hp+(it->'baseStats'->>'hp')::float8;
   def:=def+(it->'baseStats'->>'defense')::float8;
  else
   base:=(5+power(ilv,1.28))*(case when (it->>'boss')::boolean then 1.9 else 1 end)*quality;
   atk:=atk+base*(case when (it->>'slot')::int=0 then .9 else .11 end)*growth+stars;
   stat:=stat+floor((2+ilv*.5)*growth*quality*(case when (it->>'boss')::boolean then 1.9 else 1 end))+stars;
   hp:=hp+floor(ilv*4*(case when (it->>'boss')::boolean then 1.9 else 1 end));
   def:=def+ilv*.2*(case when (it->>'boss')::boolean then 1.9 else 1 end);
  end if;
  hp:=hp+(case when (it->>'slot')::int between 1 and 5 then stars*greatest(2,ceil(ilv*.35)) else 0 end);
  for ln in select value from jsonb_array_elements(coalesce(it->'lines','[]')) loop
   k:=ln->>'key'; val:=(ln->>'value')::double precision;
   if k='flatHP' then hp:=hp+val;
   elsif k='flatAttack' then atk:=atk+val;
   elsif k='flatDefense' then def:=def+val;
   elsif k='flat'||main then stat:=stat+val;
   elsif k=main then stat_pct:=stat_pct+val;
   elsif k='attack' then atk_pct:=atk_pct+val;
   elsif k='hp' then hp_pct:=hp_pct+val;
   elsif k='defense' then def_pct:=def_pct+val;
   elsif k='crit' then crit_pct:=crit_pct+val;
   elsif k='boss' then boss_pct:=boss_pct+val; end if;
  end loop;
 end loop;
 stat:=stat*(1+stat_pct/100);atk:=(atk+stat*.65)*(1+atk_pct/100);
 hp:=floor(hp*(1+hp_pct/100));def:=def*(1+def_pct/100);
 crit:=least(.95,.05+crit_pct/100+(case when cl='archer' then .05 else 0 end));
 cadence:=case when cl='pirate' then 1.08 else 1 end;
 if cl='warrior' then hp:=floor(hp*1.15);def:=def*1.15;end if;
 if cl='mage' then atk:=atk*1.06;end if;
 crit_damage:=case when cl='rogue' then 1.9 else 1.6 end;
 if coalesce((s->>'advancement')::int,0)=1 then atk:=atk*1.08;hp:=floor(hp*1.1);end if;
 return floor(atk*(1+crit*(crit_damage-1))*cadence*(1+boss_pct/100)+hp*.1+floor(def)*5)::bigint;
end $$;
revoke all on function rebirth_private.combat_power(jsonb) from public,anon,authenticated;

-- Preserve the existing authenticated, session-validated public entrypoint.
create or replace function public.rebirth_rankings() returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid;
begin
 actor:=rebirth_private.session_user();
 return (with scores as materialized (
  select id,state->>'name' as name,state->>'classId' as "classId",(state->>'level')::int as level,
   (state->>'xp')::bigint as xp,coalesce((state->>'advancement')::int,0) as advancement,
   rebirth_private.combat_power(state) as "combatPower"
  from rebirth_private.players where state->>'version'='rebirth-1'
 ), ranked as (
  select *,row_number() over(order by level desc,xp desc,id) as "levelRank",
   row_number() over(order by "combatPower" desc,level desc,xp desc,id) as "combatRank",count(*) over() as total from scores
 ) select coalesce(jsonb_agg(q order by q."levelRank"),'[]') from (
  select "levelRank" as rank,"levelRank","combatRank",name,"classId",level,xp,advancement,"combatPower",id=actor as "isMe",total
  from ranked where "levelRank"<=100 or "combatRank"<=100 or id=actor
 ) q);
end $$;
revoke all on function public.rebirth_rankings() from public,anon;
grant execute on function public.rebirth_rankings() to authenticated;
