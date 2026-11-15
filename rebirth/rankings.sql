-- Apply after schema.sql and party.sql. Display-only combat rating mirrors engine.power().
CREATE OR REPLACE FUNCTION rebirth_private.combat_power(s jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare
 cl text:=s->>'classId'; main text; lv double precision:=(s->>'level')::double precision;
 atk double precision:=12+lv*2; stat double precision; hp double precision:=100+lv*22; def double precision:=lv*.5;
 stat_pct double precision:=0; atk_pct double precision:=0; hp_pct double precision:=0; def_pct double precision:=0; crit_pct double precision:=0; boss_pct double precision:=0;
 it jsonb; ln jsonb; eid text; k text; val double precision; growth double precision; base double precision; ilv double precision; stars double precision; quality double precision;
 gear_before_atk double precision; gear_before_stat double precision; gear_before_hp double precision; gear_before_def double precision;
 gear_atk double precision; job_bonus double precision:=1; luk_rate double precision; offense_rate double precision:=1;
 crit double precision; crit_damage double precision; cadence double precision;
 t_atk double precision; t_boss double precision; t_hp double precision; t_crit double precision; t_cd double precision;
begin
 main:=case cl when 'warrior' then 'STR' when 'mage' then 'INT' when 'archer' then 'DEX' when 'priest' then 'LUK' when 'rogue' then 'LUK' when 'pirate' then 'DEX' end;
 if main is null then return 0; end if;
 stat:=coalesce((s->'stats'->>main)::double precision,4)+lv*2;
 for eid in select value from jsonb_each_text(coalesce(s->'equipped','{}')) loop
  select value into it from jsonb_array_elements(coalesce(s->'items','[]')) where value->>'id'=eid limit 1;
  if it is null or coalesce((it->>'broken')::boolean,false) then continue; end if;
  ilv:=(it->>'level')::double precision; stars:=coalesce((it->>'stars')::double precision,0);
  quality:=.9+coalesce((it->>'quality')::double precision,50)*.002;
  growth:=case when ilv>=220 then 1+stars*.045+power(greatest(0,stars-20),1.5)*.0783
    else 1+stars*.055+power(greatest(0,stars-15),1.4)*.025 end;
  gear_before_atk:=atk;gear_before_stat:=stat;gear_before_hp:=hp;gear_before_def:=def;
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
  if ilv>=200 then
   atk:=gear_before_atk+(atk-gear_before_atk)*1.5;
   stat:=gear_before_stat+(stat-gear_before_stat)*1.5;
   hp:=gear_before_hp+(hp-gear_before_hp)*1.5;
   def:=gear_before_def+(def-gear_before_def)*1.5;
  end if;
  if ilv>=160 then
   atk:=gear_before_atk+(atk-gear_before_atk)*1.2;
   stat:=gear_before_stat+(stat-gear_before_stat)*1.2;
   hp:=gear_before_hp+(hp-gear_before_hp)*1.2;
   def:=gear_before_def+(def-gear_before_def)*1.2;
  end if;
  if jsonb_typeof(it->'bonusPct')='number' and (it->>'bonusPct')::int between 1 and 10 then
   atk:=gear_before_atk+(atk-gear_before_atk)*(1+(it->>'bonusPct')::int/100.0);
   stat:=gear_before_stat+(stat-gear_before_stat)*(1+(it->>'bonusPct')::int/100.0);
   hp:=gear_before_hp+(hp-gear_before_hp)*(1+(it->>'bonusPct')::int/100.0);
   def:=gear_before_def+(def-gear_before_def)*(1+(it->>'bonusPct')::int/100.0);
  end if;
  for ln in select value from jsonb_array_elements(coalesce(it->'lines','[]')||coalesce(it->'addLines','[]')) loop
   k:=ln->>'key'; val:=(ln->>'value')::double precision;
   if k='flatHP' then hp:=hp+val;
   elsif k='flatAttack' then atk:=atk+val;
   elsif k='flatDefense' then def:=def+(case when val=60 then 20 when val=120 then 40 else val end);
   elsif k='flat'||main then stat:=stat+val;
   elsif k=main then stat_pct:=stat_pct+val;
   elsif k='attack' then atk_pct:=atk_pct+val;
   elsif k='hp' then hp_pct:=hp_pct+val;
   elsif k='defense' then def_pct:=def_pct+val;
   elsif k='crit' then crit_pct:=crit_pct+(case when coalesce(ln->>'critBalanceVersion','0')='1' then val*2 else val end);
   elsif k='boss' then boss_pct:=boss_pct+(case when not coalesce((ln->>'additional')::boolean,false) and coalesce(ln->>'grade',it->>'grade')='4' then 25 else val end); end if;
  end loop;
 end loop;
 -- advancement 6/7 bonus
 if coalesce((s->>'advancement')::int,0)>=5 then atk_pct:=atk_pct+12;boss_pct:=boss_pct+20;hp_pct:=hp_pct+12;end if;
 if coalesce((s->>'advancement')::int,0)>=6 then atk_pct:=atk_pct+15;boss_pct:=boss_pct+30;crit_pct:=crit_pct+10;hp_pct:=hp_pct+15;end if;
 -- tribe bonus
 select v.a,v.b,v.h,v.c,v.d into t_atk,t_boss,t_hp,t_crit,t_cd from (values ('dwarf',2,0,8,0,0),('halfling',1,0,0,2,0),('orc',3,0,3,0,0),('gnome',0,3,0,0,2),('goblin',1,0,0,1,2),('elf',2,0,0,3,0),('beastkin',3,0,0,0,5),('merfolk',0,5,10,0,0),('lizardfolk',0,0,0,1,6),('harpy',0,3,0,2,0),('demon',4,10,-5,0,0),('darkelf',0,0,0,3,6),('giant',6,4,15,0,0),('vampire',6,6,-3,0,0),('golem',0,12,20,0,0),('dragonkin',6,8,0,0,5),('celestial',8,8,8,0,0),('spirit',4,0,0,5,8),('jujak',8,8,12,0,0),('ancientdragon',8,12,0,0,8),('divine',10,10,12,3,0),('starborn',6,2,0,5,12)) v(id,a,b,h,c,d) where v.id=s->>'tribe';
 atk_pct:=atk_pct+coalesce(t_atk,0);boss_pct:=boss_pct+coalesce(t_boss,0);hp_pct:=hp_pct+coalesce(t_hp,0);crit_pct:=crit_pct+coalesce(t_crit,0);
 gear_atk:=atk;
 if cl='priest' then offense_rate:=1;end if;
 stat:=stat*(1+stat_pct/100);atk:=(atk+stat*.65)*(1+atk_pct/100);
 hp:=floor(hp*(1+hp_pct/100));def:=def*(1+def_pct/100);
 crit:=least(.95,.05+crit_pct/100*offense_rate+(case when cl='archer' then .05 else 0 end));
 cadence:=case when cl='pirate' then 1.08 else 1 end;
 if cl='warrior' then hp:=floor(hp*1.30);def:=def*1.15;end if;
 if cl='mage' then atk:=atk*1.06;end if;
 if cl='priest' then hp:=floor(hp*1.30);end if;
 crit_damage:=(case when cl='rogue' then 1.9 else 1.6 end)+.005*(select count(*) from jsonb_object_keys(case when jsonb_typeof(s->'titles')='object' then s->'titles' else '{}'::jsonb end))+.01*(select count(distinct x) from jsonb_array_elements_text(case when jsonb_typeof(s->'skillLooks')='array' then s->'skillLooks' else '[]'::jsonb end) x)+coalesce(t_cd,0)/100;
 if coalesce((s->>'firstAdvancement')::boolean,false) or coalesce((s->>'advancement')::int,0)>=1 then job_bonus:=power(1.1,1+least(4,coalesce((s->>'advancement')::int,0)));atk:=atk*job_bonus;hp:=floor(hp*power(1.1,1+least(4,coalesce((s->>'advancement')::int,0))));end if;
 atk:=atk*(1+(select count(distinct value)*.01 from jsonb_array_elements_text(case when jsonb_typeof(s->'costumes')='array' then s->'costumes' else '[]'::jsonb end)));
 return floor(atk*(1+crit*(crit_damage-1))*cadence*(1+boss_pct/100*offense_rate)+hp*(1+floor(def)/2600)*.1)::bigint;
end $function$

;

create or replace function public.rebirth_rankings() returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid;
begin
 actor:=rebirth_private.session_user();
 return (with scores as materialized (
  select id,state->>'name' as name,state->>'classId' as "classId",(state->>'level')::int as level,
   (state->>'xp')::bigint as xp,coalesce((state->>'advancement')::int,0) as advancement,
   rebirth_private.combat_power(state) as "combatPower"
  from rebirth_private.players p where state->>'version'='rebirth-1'
   and not exists(select 1 from auth.users u where u.id=p.id and u.raw_app_meta_data->>'ringu_admin'='true')
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
