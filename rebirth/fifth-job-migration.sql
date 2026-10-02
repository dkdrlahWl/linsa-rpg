-- Extend existing trial gates without modifying player rows or function grants.
do $migration$
declare d text; n text;
begin
 d:=pg_get_functiondef('public.rebirth_coop_action(jsonb)'::regprocedure);
 if strpos(d,'array[30,60,100,150]')=0 or strpos(d,'least(4,coalesce')=0 then raise exception 'Unexpected trial function: inspect before applying';end if;
 n:=replace(d,'array[30,60,100,150]','array[30,60,100,150,200]');
 n:=replace(n,'least(4,coalesce','least(5,coalesce');
 n:=replace(n,$old$tier not between 0 and 3 then raise exception 'INVALID_TRIAL'$old$,$new$tier not between 0 and 4 then raise exception 'INVALID_TRIAL'$new$);
 n:=replace(n,$old$tier not between 0 and 3 or jsonb_array_length(w->'members') not between 1 and 2$old$,$new$tier not between 0 and 4 or jsonb_array_length(w->'members') not between 1 and 2$new$);
 if n=d then raise exception 'Trial migration made no change';end if;execute n;
 d:=pg_get_functiondef('rebirth_private.combat_power(jsonb)'::regprocedure);
 if strpos(d,'least(3,coalesce')=0 then raise exception 'Unexpected combat power function';end if;
 execute replace(d,'least(3,coalesce','least(4,coalesce');
end $migration$;
