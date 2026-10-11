-- 2026-10-11: citadel boss chests. Each member opens their own chest per boss in the simulation;
-- the edge rolls the reward and this branch persists it, once per boss per player per room.
DO $migration$
DECLARE source text;
BEGIN
 source:=pg_get_functiondef('public.rebirth_coop_action(jsonb)'::regprocedure);
 IF position('   if w->>''mode''=''citadel'' or (w->>''mode''=''exploration'' and (w->>''tier'')::int=3) then raise exception ''CITADEL_REWARDS_DISABLED'';end if;' in source)=0 THEN RAISE EXCEPTION 'CHEST_SOURCE_DRIFT_1';END IF;
 IF (length(source)-length(replace(source,'  elsif action in (''start'',''input'',''sync'') then','')))/length('  elsif action in (''start'',''input'',''sync'') then')<>1 THEN RAISE EXCEPTION 'CHEST_SOURCE_DRIFT_2';END IF;
 source:=replace(source,'   if w->>''mode''=''citadel'' or (w->>''mode''=''exploration'' and (w->>''tier'')::int=3) then raise exception ''CITADEL_REWARDS_DISABLED'';end if;',
'   if w->>''mode''=''citadel'' or (w->>''mode''=''exploration'' and (w->>''tier'')::int=3) then
    select value into member from jsonb_array_elements(w->''members'') where value->>''id''=u::text;
    if member is null or coalesce((member->>''left'')::boolean,false) then raise exception ''COOP_CHEST_CLAIMED'';end if;
    reward:=p->''reward'';st:=p->''rewardState'';
    if reward is null or st is null or reward->>''type''<>''citadelChest'' or jsonb_typeof(reward->''bosses'')<>''array'' or jsonb_array_length(reward->''bosses'') not between 1 and 6 then raise exception ''COOP_INVALID_REWARD'';end if;
    if actor.revision<>(p->>''revision'')::bigint then raise exception ''SAVE_CONFLICT'';end if;
    if exists(select 1 from jsonb_array_elements(reward->''bosses'') b where not (coalesce(member->''citadelChests'',''[]''::jsonb) @> jsonb_build_array(b)) or (actor.state->''citadelClaims''->>''room''=rid::text and coalesce(actor.state->''citadelClaims''->''bosses'',''[]''::jsonb) @> jsonb_build_array(b))) then raise exception ''COOP_CHEST_CLAIMED'';end if;
    if st->''citadelClaims''->>''room'' is distinct from rid::text or not ((st->''citadelClaims''->''bosses'') @> (reward->''bosses'')) then raise exception ''COOP_INVALID_REWARD'';end if;
    st:=st||jsonb_build_object(''coopRoom'',rid::text,''lastReward'',reward);
    update rebirth_private.players set state=st,revision=revision+1,updated_at=now() where id=u;
    events:=jsonb_build_array(reward);
   else');
 source:=replace(source,'  elsif action in (''start'',''input'',''sync'') then','   end if;
  elsif action in (''start'',''input'',''sync'') then');
 EXECUTE source;
END;
$migration$;

-- 2026-10-11 hotfix (citadel_chest_precedence_fix): the unparenthesised `a @> reward->'bosses'` parsed as
-- `(a @> reward)->'bosses'` (boolean -> unknown) and failed every claim; applied live with the parentheses above.
