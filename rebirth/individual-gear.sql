create or replace function rebirth_private.roll_individual_gear(p_level int,p_class text,p_slot int,p_boss boolean)
returns jsonb language plpgsql volatile set search_path='' as $$
declare ci int:=array_position(array['warrior','mage','archer','rogue','pirate'],p_class)-1;
 tier int:=case when p_level=1 then 0 else p_level/10 end; cnt int; weights int[]; design int:=0; roll float8:=random()*100; variant int:=0; patterns int[][]:=array[[0,0,2,1,2,1],[1,1,0,2,0,2],[2,0,2,1,0,1]];
 low float8; high float8; base float8; lo int; hi int; u float8; f float8; value int; stat_key text; stats jsonb:='{}';
begin
 if ci is null or p_slot<0 or p_slot>8 or p_level not between 1 and 200 then raise exception 'INVALID_GEAR';end if;
 cnt:=4+mod(tier+ci*2+p_slot+p_boss::int,3);
 weights:=case cnt when 4 then array[60,28,11,1] when 5 then array[50,28,15,6,1] else array[44,26,16,9,4,1] end;
 for i in 1..cnt loop design:=i-1;roll:=roll-weights[i];exit when roll<0;end loop;
 if p_slot=0 then variant:=patterns[1+mod(tier+ci+p_boss::int,3)][design+1];end if;
 low:=case when p_boss then 2.8+design*.45 else .75+design*.3 end;high:=low+.16;
 foreach stat_key in array array['attack','stat','hp','defense'] loop
 base:=case stat_key when 'attack' then (5+power(p_level::float8,1.28))*case when p_slot=0 then .9 else .11 end when 'stat' then 2+p_level*.5 when 'hp' then p_level*4 else p_level*.2 end;
 lo:=greatest(1,floor(base*low)::int);hi:=greatest(1,ceil(base*high)::int);u:=random();
 f:=case when u<.75 then u/.75*.5 when u<.99 then .5+(u-.75)/.24*.4 else .9+(u-.99)/.01*.1 end;
 value:=lo+least(hi-lo,floor(f*(hi-lo+1))::int);stats:=stats||jsonb_build_object(stat_key,value);
 end loop;
 return jsonb_build_object('design',design,'weaponVariant',variant,'baseStats',stats);
end $$;
revoke all on function rebirth_private.roll_individual_gear(int,text,int,boolean) from public;
grant execute on function rebirth_private.roll_individual_gear(int,text,int,boolean) to service_role;
