-- 2026-10-12: administrators can send diamonds (state.fishing.diamonds). The admin's diamonds are an unlimited reserve.
DO $migration$
DECLARE src text; pairs text[][]:=array[
 array['''highCube'',''primeCube'') then raise exception ''INVALID_TRANSFER_RESOURCE'';',
       '''highCube'',''primeCube'',''diamond'') then raise exception ''INVALID_TRANSFER_RESOURCE'';'],
 array['path:=case when resource=''gold'' then array[''gold''] else array[''materials'',resource] end;',
       'path:=case when resource=''gold'' then array[''gold''] when resource=''diamond'' then array[''fishing'',''diamonds''] else array[''materials'',resource] end;'],
 array['if coalesce((sender.state#>>path)::bigint,0)<amount then raise exception ''INSUFFICIENT_MATERIAL'';',
       'if resource<>''diamond'' and coalesce((sender.state#>>path)::bigint,0)<amount then raise exception ''INSUFFICIENT_MATERIAL'';'],
 array['update rebirth_private.players set state=jsonb_set(state,path,to_jsonb((state#>>path)::bigint-amount)),revision=revision+1,updated_at=now() where id=actor returning * into sender;',
       'update rebirth_private.players set state=case when resource=''diamond'' then state else jsonb_set(state,path,to_jsonb((state#>>path)::bigint-amount)) end,revision=revision+1,updated_at=now() where id=actor returning * into sender;'],
 array['jsonb_set(case when resource=''gold'' then state else jsonb_set(state,''{materials}'',coalesce(state->''materials'',''{}''::jsonb)) end,path,to_jsonb(balance+amount))',
       -- A recipient who never opened fishing gets the full default record (a partial one would break the fishing screen).
       'jsonb_set(case when resource=''gold'' then state when resource=''diamond'' then (case when jsonb_typeof(state->''fishing'')=''object'' then state else state||jsonb_build_object(''fishing'',jsonb_build_object(''version'',1,''rod'',1,''xp'',0,''diamonds'',0,''bait'',jsonb_build_object(''worm'',20),''fish'',''[]''::jsonb,''aquarium'',''[]''::jsonb,''slots'',3,''bank'',0,''bankAt'',floor(extract(epoch from now())*1000)::bigint,''collection'',''{}''::jsonb,''daily'',''{}''::jsonb,''cast'',null,''lastCatch'',null)) end) else jsonb_set(state,''{materials}'',coalesce(state->''materials'',''{}''::jsonb)) end,path,to_jsonb(balance+amount))']
]; i int;
BEGIN
 src:=pg_get_functiondef('rebirth_private.admin_transfer(jsonb,uuid)'::regprocedure);
 FOR i IN 1..array_length(pairs,1) LOOP
  IF (length(src)-length(replace(src,pairs[i][1],'')))/length(pairs[i][1])<>1 THEN RAISE EXCEPTION 'ADMIN_TRANSFER_DRIFT_%',i; END IF;
  src:=replace(src,pairs[i][1],pairs[i][2]);
 END LOOP;
 EXECUTE src;
END;
$migration$;
