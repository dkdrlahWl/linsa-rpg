-- Priest combat power equals other jobs (no x0.87 trait); priest damage is reduced only through skill coefficients.
do $$
declare d text:=pg_get_functiondef('rebirth_private.combat_power(jsonb)'::regprocedure); n text;
begin
 n:=regexp_replace(d,'\n\s*if cl=''priest'' and \(coalesce\(\(s->>''firstAdvancement''\)::boolean,false\) or coalesce\(\(s->>''advancement''\)::int,0\)>=1\) then atk:=atk\*\.87;end if;','');
 if n=d or position('atk*.87' in n)>0 then raise exception 'combat_power priest x0.87 line not found'; end if;
 execute n;
end $$;
