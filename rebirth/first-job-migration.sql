do $migration$ declare d text; begin
 d:=pg_get_functiondef('rebirth_private.combat_power(jsonb)'::regprocedure);
 if strpos(d,$old$if coalesce((s->>'advancement')::int,0)>=1 then atk:=atk*power(1.1,least(2,(s->>'advancement')::int));hp:=floor(hp*power(1.1,least(2,(s->>'advancement')::int)));end if;$old$)=0 then raise exception 'unexpected combat power definition';end if;
 execute replace(d,$old$if coalesce((s->>'advancement')::int,0)>=1 then atk:=atk*power(1.1,least(2,(s->>'advancement')::int));hp:=floor(hp*power(1.1,least(2,(s->>'advancement')::int)));end if;$old$,$new$if coalesce((s->>'firstAdvancement')::boolean,false) or coalesce((s->>'advancement')::int,0)>=1 then atk:=atk*power(1.1,1+least(2,coalesce((s->>'advancement')::int,0)));hp:=floor(hp*power(1.1,1+least(2,coalesce((s->>'advancement')::int,0))));end if;$new$);
end $migration$;
