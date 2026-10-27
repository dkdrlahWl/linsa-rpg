-- 6차(250)·7차(300) 전직 보스: 협동 방 생성·시작·보상 판정 범위를 0~6으로 넓히고,
-- 랭킹 전투력(combat_power)에 6·7차 잠재형 보너스를 반영한다. 플레이어 데이터·권한은 건드리지 않는다.
do $migration$
declare d text; n text;
begin
 d:=pg_get_functiondef('public.rebirth_coop_action(jsonb)'::regprocedure);
 if strpos(d,'array[30,60,100,150,200]')=0 or strpos(d,'least(5,coalesce')=0 then raise exception 'Unexpected trial function: inspect before applying';end if;
 n:=replace(d,'array[30,60,100,150,200]','array[30,60,100,150,200,250,300]');
 n:=replace(n,'least(5,coalesce','least(7,coalesce');
 n:=replace(n,$old$tier not between 0 and 4 then raise exception 'INVALID_TRIAL'$old$,$new$tier not between 0 and 6 then raise exception 'INVALID_TRIAL'$new$);
 n:=replace(n,$old$tier not between 0 and 4 or jsonb_array_length(w->'members') not between 1 and 2$old$,$new$tier not between 0 and 6 or jsonb_array_length(w->'members') not between 1 and 2$new$);
 if n=d then raise exception 'Trial migration made no change';end if;execute n;
 -- 공격력·HP ×1.1 전직 배율은 5차(least(4,...)+1)까지 그대로, 6·7차는 잠재처럼 % 능력치에 더한다.
 d:=pg_get_functiondef('rebirth_private.combat_power(jsonb)'::regprocedure);
 if strpos(d,' gear_atk:=atk;')=0 or strpos(d,'advancement 6/7 bonus')>0 then raise exception 'Unexpected combat power function';end if;
 execute replace(d,' gear_atk:=atk;',$new$ -- advancement 6/7 bonus
 if coalesce((s->>'advancement')::int,0)>=5 then atk_pct:=atk_pct+12;boss_pct:=boss_pct+20;hp_pct:=hp_pct+12;end if;
 if coalesce((s->>'advancement')::int,0)>=6 then atk_pct:=atk_pct+15;boss_pct:=boss_pct+30;crit_pct:=crit_pct+10;hp_pct:=hp_pct+15;end if;
 gear_atk:=atk;$new$);
end $migration$;
