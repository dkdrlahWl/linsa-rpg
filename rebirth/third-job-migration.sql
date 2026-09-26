do $migration$ declare d text; begin
 d:=pg_get_functiondef('rebirth_private.combat_power(jsonb)'::regprocedure);
 if strpos(d,$old$if coalesce((s->>'advancement')::int,0)=1 then atk:=atk*1.08;hp:=floor(hp*1.1);end if;$old$)=0 then raise exception 'unexpected combat power definition';end if;
 execute replace(d,$old$if coalesce((s->>'advancement')::int,0)=1 then atk:=atk*1.08;hp:=floor(hp*1.1);end if;$old$,$new$if coalesce((s->>'advancement')::int,0)>=1 then atk:=atk*power(1.1,least(2,(s->>'advancement')::int));hp:=floor(hp*power(1.1,least(2,(s->>'advancement')::int)));end if;$new$);
 d:=pg_get_functiondef('public.rebirth_coop_action(jsonb)'::regprocedure);
 if strpos(d,$old$coalesce((actor.state->>'advancement')::int,0)=1$old$)=0 then raise exception 'unexpected coop definition';end if;
 execute replace(d,$old$coalesce((actor.state->>'advancement')::int,0)=1$old$,$new$coalesce((actor.state->>'advancement')::int,0)>=1$new$);
end $migration$;