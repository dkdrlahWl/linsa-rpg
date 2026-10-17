-- Priest remake (priest-remake-1): ranking combat power uses the same formula as other jobs.
-- * 160+ equipment gets the shared x1.2 bonus for priests too; the priest-only HP x0.7 is removed.
-- * HP→attack conversion for priests is removed; after the first job advancement priests get a x0.87 attack trait instead.
-- Mirrors rebirth/engine.mjs power() and rebirth/data.mjs gearStatMultiplier().
do $$
declare d text:=pg_get_functiondef('rebirth_private.combat_power(jsonb)'::regprocedure); n text:=d;
begin
 n:=replace(n,'if ilv>=160 and it->>''classId''<>''priest'' then','if ilv>=160 then');
 n:=regexp_replace(n,'\n\s*if ilv>=160 and it->>''classId''=''priest'' then\s*\n\s*hp:=gear_before_hp\+\(hp-gear_before_hp\)\*\.7;\s*\n\s*end if;','');
 n:=regexp_replace(n,'\n\s*if cl=''priest'' then\s*\n\s*luk_rate:=[^\n]*\n\s*atk:=[^\n]*\n\s*end if;','');
 n:=replace(n,'if cl=''mage'' then atk:=atk*1.06;end if;','if cl=''mage'' then atk:=atk*1.06;end if;
 if cl=''priest'' and (coalesce((s->>''firstAdvancement'')::boolean,false) or coalesce((s->>''advancement'')::int,0)>=1) then atk:=atk*.87;end if;');
 if n=d or position('it->>''classId''<>''priest''' in n)>0 or position('*.7;' in n)>0 or position('luk_rate:=' in n)>0 or position('atk*.87' in n)=0 then
  raise exception 'combat_power priest remake patch did not match the deployed function';
 end if;
 execute n;
end $$;
