-- 2026-10-11: diamonds (state.fishing.diamonds) can be listed on the market for gold like other materials.
DO $migration$
DECLARE src text; pairs text[][]:=array[
 array['material_key text;','material_key text; mat_path text[]; fish_default jsonb;'],
 array['if material_key not in (''primeCube'',''cube'',''highCube'',''fragment'',''scroll'',''potentialLock'',''dungeonKey'') then raise exception ''INVALID_MATERIAL'';end if;',
       'if material_key not in (''primeCube'',''cube'',''highCube'',''fragment'',''scroll'',''potentialLock'',''dungeonKey'',''diamond'') then raise exception ''INVALID_MATERIAL'';end if;
   mat_path:=case when material_key=''diamond'' then array[''fishing'',''diamonds''] else array[''materials'',material_key] end;'],
 array['if coalesce((p.state->''materials''->>material_key)::bigint,0)<quantity then raise exception ''INSUFFICIENT_MATERIAL'';end if;',
       'if coalesce((p.state#>>mat_path)::bigint,0)<quantity then raise exception ''INSUFFICIENT_MATERIAL'';end if;'],
 array['update rebirth_private.players set state=jsonb_set(state,array[''materials'',material_key],to_jsonb((state->''materials''->>material_key)::bigint-quantity)),revision=revision+1,updated_at=now() where id=u;',
       'update rebirth_private.players set state=jsonb_set(state,mat_path,to_jsonb((state#>>mat_path)::bigint-quantity)),revision=revision+1,updated_at=now() where id=u;'],
 array['material_key:=l.item->>''key'';remaining:=(l.item->>''quantity'')::bigint;',
       'material_key:=l.item->>''key'';remaining:=(l.item->>''quantity'')::bigint;
   mat_path:=case when material_key=''diamond'' then array[''fishing'',''diamonds''] else array[''materials'',material_key] end;
   -- A player who never opened fishing gets the full default record (a partial one would break the fishing screen).
   fish_default:=jsonb_build_object(''version'',1,''rod'',1,''xp'',0,''diamonds'',0,''bait'',jsonb_build_object(''worm'',20),''fish'',''[]''::jsonb,''aquarium'',''[]''::jsonb,''slots'',3,''bank'',0,''bankAt'',floor(extract(epoch from now())*1000)::bigint,''collection'',''{}''::jsonb,''daily'',''{}''::jsonb,''cast'',null,''lastCatch'',null);'],
 array['update rebirth_private.players set state=jsonb_set(state,array[''materials'',material_key],to_jsonb(coalesce((state->''materials''->>material_key)::bigint,0)+remaining)),revision=revision+1,updated_at=now() where id=u;',
       'update rebirth_private.players set state=jsonb_set(case when state->mat_path[1] is null or jsonb_typeof(state->mat_path[1])<>''object'' then state||jsonb_build_object(mat_path[1],case when mat_path[1]=''fishing'' then fish_default else ''{}''::jsonb end) else state end,mat_path,to_jsonb(coalesce((state#>>mat_path)::bigint,0)+remaining)),revision=revision+1,updated_at=now() where id=u;'],
 array['update rebirth_private.players set state=jsonb_set(jsonb_set(state,array[''materials'',material_key],to_jsonb(coalesce((state->''materials''->>material_key)::bigint,0)+quantity)),''{gold}'',to_jsonb((state->>''gold'')::bigint-total_price)),revision=revision+1,updated_at=now() where id=u;',
       'update rebirth_private.players set state=jsonb_set(jsonb_set(case when state->mat_path[1] is null or jsonb_typeof(state->mat_path[1])<>''object'' then state||jsonb_build_object(mat_path[1],case when mat_path[1]=''fishing'' then fish_default else ''{}''::jsonb end) else state end,mat_path,to_jsonb(coalesce((state#>>mat_path)::bigint,0)+quantity)),''{gold}'',to_jsonb((state->>''gold'')::bigint-total_price)),revision=revision+1,updated_at=now() where id=u;']
]; i int;
BEGIN
 src:=pg_get_functiondef('rebirth_private.market(text,jsonb,uuid)'::regprocedure);
 FOR i IN 1..array_length(pairs,1) LOOP
  IF (length(src)-length(replace(src,pairs[i][1],'')))/length(pairs[i][1])<>1 THEN RAISE EXCEPTION 'MARKET_DRIFT_%',i; END IF;
  src:=replace(src,pairs[i][1],pairs[i][2]);
 END LOOP;
 EXECUTE src;
END;
$migration$;
