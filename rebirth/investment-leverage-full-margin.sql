-- 2026-10-13: leverage lets the whole balance be used as margin (quantity up to gold*leverage/price).
-- Removes the full-market-cost cap from investment-purchase-cap.sql; the margin<=gold check stays.
do $$ declare definition text; cap text:='if v_quantity*c.price>coalesce((p.state->>''gold'')::numeric,0) then raise exception ''INSUFFICIENT_GOLD'';end if; ';
begin
select pg_get_functiondef('rebirth_private.investment(text,jsonb,uuid)'::regprocedure) into definition;
if position(cap in definition)=0 then raise exception 'Unexpected investment implementation'; end if;
execute replace(definition,cap,'');
end $$;
