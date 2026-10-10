-- Cap requested integer coin count by full market cost, independent of margin leverage.
do $$ declare definition text; begin
select pg_get_functiondef('rebirth_private.investment(text,jsonb,uuid)'::regprocedure) into definition;
if position('if v_quantity*c.price>coalesce' in definition)>0 then return; end if;
if position('amount:=ceil(v_quantity*c.price/v_leverage);' in definition)=0 then raise exception 'Unexpected investment implementation'; end if;
definition:=replace(definition,'amount:=ceil(v_quantity*c.price/v_leverage);','if v_quantity*c.price>coalesce((p.state->>''gold'')::numeric,0) then raise exception ''INSUFFICIENT_GOLD'';end if; amount:=ceil(v_quantity*c.price/v_leverage);');
execute definition;end $$;
