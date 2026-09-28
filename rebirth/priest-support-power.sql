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
 gear_atk double precision; job_bonus double precision:=1; luk_rate double precision; offense_rate double precision:=1;
 crit double precision; crit_damage double precision; cadence double precision;
begin
 main:=case cl when 'warrior' then 'STR' when 'mage' then 'INT' when 'archer' then 'DEX' when 'priest' then 'LUK' when 'rogue' then 'LUK' when 'pirate' then 'DEX' end;
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
   elsif k='flatDefense' then def:=def+(case when val=60 then 20 when val=120 then 40 else val end);
   elsif k='flat'||main then stat:=stat+val;
   elsif k=main then stat_pct:=stat_pct+val;
   elsif k='attack' then atk_pct:=atk_pct+val;
   elsif k='hp' then hp_pct:=hp_pct+val;
   elsif k='defense' then def_pct:=def_pct+val;
   elsif k='crit' then crit_pct:=crit_pct+(case when coalesce(ln->>'critBalanceVersion','0')='1' then val*2 else val end);
   elsif k='boss' then boss_pct:=boss_pct+val; end if;
  end loop;
 end loop;
 gear_atk:=atk;
 if cl='priest' then offense_rate:=.05;end if;
 stat:=stat*(1+stat_pct/100);atk:=(atk+stat*.65)*(1+atk_pct/100);
 hp:=floor(hp*(1+hp_pct/100));def:=def*(1+def_pct/100);
 crit:=least(.95,.05+crit_pct/100*offense_rate+(case when cl='archer' then .05 else 0 end));
 cadence:=case when cl='pirate' then 1.08 else 1 end;
 if cl='warrior' then hp:=floor(hp*1.30);def:=def*1.15;end if;
 if cl='mage' then atk:=atk*1.06;end if;
 crit_damage:=case when cl='rogue' then 1.9 else 1.6 end;
 if coalesce((s->>'firstAdvancement')::boolean,false) or coalesce((s->>'advancement')::int,0)>=1 then job_bonus:=power(1.1,1+least(3,coalesce((s->>'advancement')::int,0)));atk:=atk*job_bonus;hp:=floor(hp*power(1.1,1+least(3,coalesce((s->>'advancement')::int,0))));end if;
 if cl='priest' then
 luk_rate:=least(.6,(hp/(1+hp_pct/100))*.166*.8/greatest(1,stat/(1+stat_pct/100)));
 atk:=(hp*.166+stat*luk_rate+gear_atk*job_bonus*.2)*(1+atk_pct/100*.05);
 end if;
 return floor(atk*(1+crit*(crit_damage-1))*cadence*(1+boss_pct/100*offense_rate)+hp*(1+floor(def)/2600)*.1)::bigint;
end $function$
;
