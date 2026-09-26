-- Canonical service-only persistence for the shared movement arena.
create table if not exists rebirth_private.coop_rooms(id uuid primary key default gen_random_uuid(),world jsonb not null,revision bigint not null default 0,created_at timestamptz not null default now());
alter table rebirth_private.coop_rooms enable row level security;
revoke all on rebirth_private.coop_rooms from public,anon,authenticated;
create or replace function public.rebirth_coop_action(p jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=(p->>'user')::uuid; sess uuid:=(p->>'session')::uuid; actor rebirth_private.players%rowtype; r rebirth_private.coop_rooms%rowtype; old rebirth_private.receipts%rowtype; action text:=p->>'action'; rid uuid; w jsonb; member jsonb; members jsonb; st jsonb; reward jsonb; claim text:=to_char(now() at time zone 'Asia/Seoul','YYYY-MM-DD'); count_claim int; tier int; list jsonb; events jsonb:='[]'; ms bigint:=floor(extract(epoch from clock_timestamp())*1000); member_user_id uuid;
begin
 perform pg_advisory_xact_lock(71823001);
 if not exists(select 1 from rebirth_private.release where epoch=(p->>'epoch')::uuid and (enabled or exists(select 1 from rebirth_private.players where id=u and preview_access))) then raise exception 'REBIRTH_MAINTENANCE';end if;
 select * into actor from rebirth_private.players where id=u for update;
 if not found or actor.active_session is distinct from sess or not exists(select 1 from auth.sessions where id=sess and user_id=u) then raise exception 'SESSION_ENDED';end if;
 if exists(select 1 from auth.sessions where user_id=u and (created_at,id)>(actor.session_started,sess)) then raise exception 'SESSION_REPLACED';end if;
 select * into old from rebirth_private.receipts where user_id=u and request_id=(p->>'request')::uuid;
 if found then
  if old.fingerprint<>p->'fingerprint' then raise exception 'REQUEST_ID_REUSED';end if;
  action:='read';
 end if;
 rid:=nullif(actor.state->>'coopRoom','')::uuid;
 if action='join' then rid:=(p->'args'->>'room')::uuid;end if;
 if rid is not null then select * into r from rebirth_private.coop_rooms where id=rid for update;w:=r.world;end if;
 if action not in ('read','list') then
  if actor.revision<>(p->>'revision')::bigint then raise exception 'SAVE_CONFLICT';end if;
  if actor.state->'battle' is not null and actor.state->'battle'<>'null' or nullif(actor.state->>'partyRoom','') is not null then raise exception 'BATTLE_IN_PROGRESS';end if;
  if action in ('create','join') then
   if nullif(actor.state->>'coopRoom','') is not null or actor.state->'pendingCube' is not null and actor.state->'pendingCube'<>'null' then raise exception 'BATTLE_IN_PROGRESS';end if;
   tier:=case when action='create' then (p->'args'->>'tier')::int else (w->>'tier')::int end;
   if tier is null or tier not between 0 and 9 then raise exception 'INVALID_COOP_TIER';end if;
   member:=jsonb_build_object('id',u,'name',actor.state->>'name','classId',actor.state->>'classId','power',p->'power','advanced',coalesce((actor.state->>'advancement')::int,0)>=1,'left',false);
   if action='create' then
    w:=jsonb_build_object('riftVersion',2,'status','waiting','owner',u,'tier',tier,'members',jsonb_build_array(member),'created',ms);
    insert into rebirth_private.coop_rooms(world) values(w) returning * into r;rid:=r.id;
   else
    if w is null or w->>'status'<>'waiting' or jsonb_array_length(w->'members')>=4 or ms-(w->>'created')::bigint>900000 then raise exception 'PARTY_NOT_FOUND';end if;
    w:=jsonb_set(w,'{members}',(w->'members')||jsonb_build_array(member));
   end if;
   update rebirth_private.players set state=(p->'state')||jsonb_build_object('coopRoom',rid,'hunting',false,'lastAt',ms),revision=revision+1 where id=u;
  elsif action='leave' then
   if w is not null then
    if w->>'status'='waiting' then select coalesce(jsonb_agg(value),'[]') into members from jsonb_array_elements(w->'members') where value->>'id'<>u::text;
    else select jsonb_agg(case when value->>'id'=u::text then value||'{"left":true,"hp":0}'::jsonb else value end) into members from jsonb_array_elements(w->'members');end if;
    w:=jsonb_set(w,'{members}',members);
    if w->>'owner'=u::text then w:=jsonb_set(w,'{owner}',coalesce(members->0->'id','null'));end if;
    if not exists(select 1 from jsonb_array_elements(members) where not coalesce((value->>'left')::boolean,false)) then w:=jsonb_set(w,'{status}','"lost"');end if;
   end if;
   update rebirth_private.players set state=(state-'coopRoom')||jsonb_build_object('hunting',true,'lastAt',ms),revision=revision+1 where id=u;
  elsif action='open' then
   if w is null or w->>'status'<>'won' then raise exception 'COOP_CHEST_NOT_READY';end if;
   if r.revision<>(p->>'roomRevision')::bigint then raise exception 'SAVE_CONFLICT';end if;
   select value into member from jsonb_array_elements(w->'members') where value->>'id'=u::text;
   if member is null or coalesce((member->>'left')::boolean,false) or coalesce((member->>'claimed')::boolean,false) then raise exception 'COOP_CHEST_CLAIMED';end if;
   if coalesce((member->>'damage')::numeric,0)<=0 then raise exception 'COOP_DAMAGE_REQUIRED';end if;
   if w->'chest' is null or sqrt(power((member->>'x')::numeric-(w->'chest'->>'x')::numeric,2)+power((member->>'y')::numeric-(w->'chest'->>'y')::numeric,2))>180 then raise exception 'COOP_CHEST_TOO_FAR';end if;
   reward:=p->'reward';st:=p->'rewardState';
   if reward is null or st is null or reward->>'type'<>'coop' then raise exception 'COOP_INVALID_REWARD';end if;
   st:=(st-'coopRoom')||jsonb_build_object('hunting',true,'lastAt',ms,'lastReward',reward);
   update rebirth_private.players set state=st,revision=revision+1 where id=u;
   select jsonb_agg(case when value->>'id'=u::text then value||'{"left":true,"claimed":true}'::jsonb else value end) into members from jsonb_array_elements(w->'members');
   w:=jsonb_set(w,'{members}',members);events:=jsonb_build_array(reward);
   if not exists(select 1 from jsonb_array_elements(members) where not coalesce((value->>'left')::boolean,false)) then w:=jsonb_set(w,'{status}','"complete"');end if;
  elsif action in ('start','input','sync') then
   if w is null or not exists(select 1 from jsonb_array_elements(w->'members') where value->>'id'=u::text and not coalesce((value->>'left')::boolean,false)) then raise exception 'PARTY_NOT_FOUND';end if;
   if r.revision<>(p->>'roomRevision')::bigint then raise exception 'SAVE_CONFLICT';end if;
   if action='start' and (w->>'owner'<>u::text or w->>'status'<>'waiting') then raise exception 'INVALID_COOP_START';end if;
   if w->>'status' in ('fighting','won') or action='start' then w:=p->'world';end if;
  else raise exception 'INVALID_COOP_ACTION';end if;
  if rid is not null and w is not null then
   update rebirth_private.coop_rooms set world=w,revision=revision+1 where id=rid returning * into r;
   if w->>'status'='lost' then
    for member in select value from jsonb_array_elements(w->'members') loop
     member_user_id:=(member->>'id')::uuid;select state into st from rebirth_private.players where id=member_user_id for update;
     if st->>'coopRoom' is distinct from rid::text then continue;end if;
     reward:=jsonb_build_object('type','coop','won',false,'gold',0);
     st:=(st-'coopRoom')||jsonb_build_object('hunting',true,'lastAt',ms,'lastReward',reward);
     update rebirth_private.players set state=st,revision=revision+1 where id=member_user_id;
     if member_user_id=u then events:=jsonb_build_array(reward);end if;
    end loop;
   end if;
  end if;
  if action in ('create','join','start','leave','open') then insert into rebirth_private.receipts(user_id,request_id,fingerprint,result) values(u,(p->>'request')::uuid,p->'fingerprint',jsonb_build_object('events',events));end if;
 end if;
 select * into actor from rebirth_private.players where id=u;
 rid:=nullif(actor.state->>'coopRoom','')::uuid;
 if rid is not null then select * into r from rebirth_private.coop_rooms where id=rid;else r:=null;end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'tier',q.world->'tier','count',jsonb_array_length(q.world->'members'),'name',q.world->'members'->0->>'name')),'[]') into list from (select id,world from rebirth_private.coop_rooms where world->>'status'='waiting' and created_at>now()-interval '15 minutes' order by created_at desc limit 20) q;
 return jsonb_build_object('state',actor.state,'revision',actor.revision,'coop',case when r.id is null then null else r.world||jsonb_build_object('id',r.id,'revision',r.revision,'me',u) end,'coopRooms',list,'now',ms,'result',jsonb_build_object('events',events));
end $$;
revoke all on function public.rebirth_coop_action(jsonb) from public,anon,authenticated;
grant execute on function public.rebirth_coop_action(jsonb) to service_role;

-- Preserve the level of existing rooms when expanding the old three-entry tier list.
update rebirth_private.coop_rooms set world=world||jsonb_build_object('riftVersion',2,'tier',case (world->>'tier')::int when 0 then 2 when 1 then 6 when 2 then 9 else (world->>'tier')::int end),revision=revision+1 where not world ? 'riftVersion';

-- Restore trading only for the new potential scroll; retain all market safeguards.
do $$ declare definition text; f record; begin
 for f in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='rebirth_private' and p.proname='market' and p.prokind='f' loop
  definition:=pg_get_functiondef(f.oid);
  if position('material_key not in (''primeCube'',''cube'',''highCube'',''fragment'')' in definition)>0 then
   execute replace(definition,'material_key not in (''primeCube'',''cube'',''highCube'',''fragment'')','material_key not in (''primeCube'',''cube'',''highCube'',''fragment'',''scroll'')');
  end if;
 end loop;
end $$;
