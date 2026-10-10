DO $migration$
DECLARE source text;
BEGIN
source:=pg_get_functiondef('public.rebirth_coop_action(jsonb)'::regprocedure);
IF position('room_mode not in (''rift'',''wave'',''advancement'',''raid'',''exploration'')' in source)=0 THEN RAISE EXCEPTION 'CITADEL_SOURCE_DRIFT';END IF;
source:=replace(source,'room_mode not in (''rift'',''wave'',''advancement'',''raid'',''exploration'')','room_mode not in (''rift'',''wave'',''advancement'',''raid'',''exploration'',''citadel'')');
IF position('if room_mode=''exploration'' and tier not between 0 and 3' in source)=0 THEN RAISE EXCEPTION 'CITADEL_SOURCE_DRIFT';END IF;
source:=replace(source,'if room_mode=''exploration'' and tier not between 0 and 3','if room_mode=''citadel'' and tier<>0 then raise exception ''INVALID_CITADEL'';end if;
   if room_mode=''exploration'' and tier not between 0 and 2');
IF position('elsif action=''open'' then' in source)=0 THEN RAISE EXCEPTION 'CITADEL_SOURCE_DRIFT';END IF;
source:=replace(source,'elsif action=''open'' then','elsif action=''open'' then
   if w->>''mode''=''citadel'' or (w->>''mode''=''exploration'' and (w->>''tier'')::int=3) then raise exception ''CITADEL_REWARDS_DISABLED'';end if;');
IF position('if action=''start'' and w->>''mode''=''exploration'' and ((w->>''tier'')::int not between 0 and 3' in source)=0 THEN RAISE EXCEPTION 'CITADEL_SOURCE_DRIFT';END IF;
source:=replace(source,'if action=''start'' and w->>''mode''=''exploration'' and ((w->>''tier'')::int not between 0 and 3','if action=''start'' and w->>''mode''=''citadel'' and ((w->>''tier'')::int<>0 or jsonb_array_length(w->''members'') not between 1 and 4) then raise exception ''INVALID_CITADEL'';end if;
   if action=''start'' and w->>''mode''=''exploration'' and ((w->>''tier'')::int not between 0 and 3');
IF position('if w->>''mode''=''exploration'' and w->>''status''=''won'' and w->>''keyOwner'' is not null' in source)=0 THEN RAISE EXCEPTION 'CITADEL_SOURCE_DRIFT';END IF;
source:=replace(source,'if w->>''mode''=''exploration'' and w->>''status''=''won'' and w->>''keyOwner'' is not null','if w->>''mode''=''exploration'' and (w->>''tier'')::int<3 and w->>''status''=''won'' and w->>''keyOwner'' is not null');
IF position('if w->>''status''=''lost'' or (w->>''mode'' in (''advancement'',''wave'') and w->>''status''=''won'') then' in source)=0 THEN RAISE EXCEPTION 'CITADEL_SOURCE_DRIFT';END IF;
source:=replace(source,'if w->>''status''=''lost'' or (w->>''mode'' in (''advancement'',''wave'') and w->>''status''=''won'') then','if (w->>''mode''=''citadel'' or (w->>''mode''=''exploration'' and (w->>''tier'')::int=3)) and w->>''status''=''lost'' then
    for member in select value from jsonb_array_elements(w->''members'') loop
     update rebirth_private.players set state=(state-''coopRoom'')||jsonb_build_object(''hunting'',true,''lastAt'',ms,''lastReward'',null),revision=revision+1 where id=(member->>''id'')::uuid and state->>''coopRoom''=rid::text;
    end loop;
   end if;
   if not (w->>''mode''=''citadel'' or (w->>''mode''=''exploration'' and (w->>''tier'')::int=3)) and (w->>''status''=''lost'' or (w->>''mode'' in (''advancement'',''wave'') and w->>''status''=''won'')) then');
EXECUTE source;
END;
$migration$;
