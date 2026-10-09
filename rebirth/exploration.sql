CREATE OR REPLACE FUNCTION public.rebirth_coop_action(p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=(p->>'user')::uuid; sess uuid:=(p->>'session')::uuid; actor rebirth_private.players%rowtype; r rebirth_private.coop_rooms%rowtype; old rebirth_private.receipts%rowtype; action text:=p->>'action'; rid uuid; w jsonb; member jsonb; members jsonb; st jsonb; reward jsonb; claim text:=to_char(now() at time zone 'Asia/Seoul','YYYY-MM-DD'); count_claim int; tier int; list jsonb; events jsonb:='[]'; ms bigint:=floor(extract(epoch from clock_timestamp())*1000); member_user_id uuid; trial_stage int; trial_level int; current_stage int; practice boolean; room_mode text; cleared int; earned_gold bigint; earned_cube int; earned_scroll int;
begin
 -- Reads and input enqueueing use MVCC; only world/reward writes serialize.
 if action not in ('read','list') then
  if action='input' then perform set_config('lock_timeout','750ms',true);end if;
  perform pg_advisory_xact_lock(hashtextextended(coalesce((select state->>'coopRoom' from rebirth_private.players where id=u),p->'args'->>'room',u::text),71823001));
 end if;
 if not exists(select 1 from rebirth_private.release where epoch=(p->>'epoch')::uuid and (enabled or exists(select 1 from rebirth_private.players where id=u and preview_access))) then raise exception 'REBIRTH_MAINTENANCE';end if;
 if action in ('read','list') then select * into actor from rebirth_private.players where id=u;
 else select * into actor from rebirth_private.players where id=u for update;end if;
 if not found or actor.active_session is distinct from sess or not exists(select 1 from auth.sessions where id=sess and user_id=u) then raise exception 'SESSION_ENDED';end if;
 if exists(select 1 from auth.sessions where user_id=u and (created_at,id)>(actor.session_started,sess)) then raise exception 'SESSION_REPLACED';end if;
 select * into old from rebirth_private.receipts where user_id=u and request_id=(p->>'request')::uuid;
 if found then
  if old.fingerprint<>p->'fingerprint' then raise exception 'REQUEST_ID_REUSED';end if;
  action:='read';
 end if;
 rid:=nullif(actor.state->>'coopRoom','')::uuid;
 if action='join' then rid:=(p->'args'->>'room')::uuid;end if;
 if rid is not null then
  if action in ('read','list') then select * into r from rebirth_private.coop_rooms where id=rid;
  else select * into r from rebirth_private.coop_rooms where id=rid for update;end if;
  w:=r.world;
 end if;
 ms:=floor(extract(epoch from clock_timestamp())*1000);
 -- Queue each player's validated frames under the room lock before simulating.
 -- Queue writes do not invalidate the simulation revision.
 if action='read' and coalesce((p->>'queueInput')::boolean,false) and w->>'status'='fighting' and jsonb_array_length(coalesce(p->'args'->'frames','[]'))>0 then
  if not exists(select 1 from jsonb_array_elements(w->'members') m where m->>'id'=u::text and not coalesce((m->>'left')::boolean,false)) then raise exception 'PARTY_NOT_FOUND';end if;
  insert into rebirth_private.coop_input_frames(room_id,user_id,tick,input)
   select rid,u,(f->>'tick')::int,f->'input'
   from jsonb_array_elements(p->'args'->'frames') f
   where (f->>'tick')::int>=greatest(0,coalesce((w->>'tick')::int,0)-35)
    and (f->>'tick')::int<=least(coalesce((w->>'tick')::int,0)+102,greatest(coalesce((w->>'tick')::int,0),floor(((case when w->>'mode'='wave' and w->>'speedAt' is not null then (w->>'speedTime')::numeric+greatest(0,ms-(w->>'speedAt')::bigint)*(case when (w->>'waveSpeed')::numeric=1.5 then 1.5 else 1 end) else ms end)-(w->>'started')::bigint)/100.0)::int)+2)
   on conflict(room_id,user_id,tick) do nothing;
 end if;
 -- A concurrent winner already advanced the room. Keep our queued inputs and
 -- return that snapshot; the next update consumes every player's input queue.
 if action='input' and coalesce((p->>'queueInput')::boolean,false) and r.revision<>(p->>'roomRevision')::bigint then action:='read';end if;

 if action not in ('read','list') then
  if actor.revision<>(p->>'revision')::bigint then raise exception 'SAVE_CONFLICT';end if;
  if actor.state->'battle' is not null and actor.state->'battle'<>'null' or nullif(actor.state->>'partyRoom','') is not null then raise exception 'BATTLE_IN_PROGRESS';end if;
  if action in ('create','join') then
   if nullif(actor.state->>'coopRoom','') is not null or actor.state->'pendingCube' is not null and actor.state->'pendingCube'<>'null' then raise exception 'BATTLE_IN_PROGRESS';end if;
   tier:=case when action='create' then (p->'args'->>'tier')::int else (w->>'tier')::int end;
   if tier is null or tier not between 0 and 9 then raise exception 'INVALID_COOP_TIER';end if;
   room_mode:=case when action='create' then coalesce(p->'args'->>'mode','rift') else coalesce(w->>'mode','rift') end;
   if room_mode not in ('rift','wave','advancement','raid','exploration') then raise exception 'INVALID_COOP_MODE';end if;
   if room_mode='exploration' and tier not between 0 and 2 then raise exception 'INVALID_EXPLORATION';end if;
   if room_mode='exploration' and tier>0 and not (coalesce(actor.state->'exploration'->'cleared','[]'::jsonb) @> jsonb_build_array(tier-1)) then raise exception 'EXPLORATION_PREVIOUS_REQUIRED';end if;
   if room_mode='raid' and tier not between 0 and 3 then raise exception 'INVALID_RAID';end if;
   if room_mode='advancement' then
    if tier not between 0 and 4 then raise exception 'INVALID_TRIAL';end if;
    trial_level:=(array[30,60,100,150,200])[tier+1];
    current_stage:=case when coalesce((actor.state->>'firstAdvancement')::boolean,false) or coalesce((actor.state->>'advancement')::int,0)>=1 then least(5,coalesce((actor.state->>'advancement')::int,0)+1) else 0 end;
    if coalesce((actor.state->>'level')::int,0)<trial_level then raise exception 'LEVEL_REQUIRED';end if;
    if current_stage<tier then raise exception 'ADVANCEMENT_REQUIRED';end if;
   end if;
   member:=jsonb_build_object('id',u,'name',actor.state->>'name','classId',actor.state->>'classId','power',p->'power','advanced',coalesce((actor.state->>'advancement')::int,0)>=1,'left',false,'ready',false);
   if action='create' then
    w:=jsonb_build_object('mode',room_mode,'riftVersion',2,'status','waiting','owner',u,'tier',tier,'members',jsonb_build_array(member),'created',ms);
    insert into rebirth_private.coop_rooms(world) values(w) returning * into r;rid:=r.id;
   else
    if w is null or w->>'status'<>'waiting' or jsonb_array_length(w->'members')>=(case when w->>'mode'='advancement' then 2 when w->>'mode'='raid' then 8 else 4 end) or ms-(w->>'created')::bigint>900000 then raise exception 'PARTY_NOT_FOUND';end if;
    w:=jsonb_set(w,'{members}',(w->'members')||jsonb_build_array(member));
   end if;
   update rebirth_private.players set state=(p->'state')||jsonb_build_object('coopRoom',rid,'hunting',false,'lastAt',ms,'lastReward',null),revision=revision+1 where id=u;
  elsif action='leave' then
   if w->>'mode'='wave' and w->>'status'='fighting' then
    if r.revision<>(p->>'roomRevision')::bigint then raise exception 'SAVE_CONFLICT';end if;
    w:=p->'world';
    st:=actor.state;
     reward:=rebirth_private.settle_wave_reward(st,w,rid,ms);
     st:=reward->'state';reward:=reward->'reward';

    st:=st||jsonb_build_object('lastReward',reward);
    update rebirth_private.players set state=st where id=u;events:=jsonb_build_array(reward);
   end if;
   if w is not null then
    if w->>'status'='waiting' then select coalesce(jsonb_agg(value),'[]') into members from jsonb_array_elements(w->'members') where value->>'id'<>u::text;
    else select jsonb_agg(case when value->>'id'=u::text then value||'{"left":true,"hp":0}'::jsonb else value end) into members from jsonb_array_elements(w->'members');end if;
    w:=jsonb_set(w,'{members}',members);
    if w->>'owner'=u::text then w:=jsonb_set(w,'{owner}',coalesce(members->0->'id','null'));end if;
    if not exists(select 1 from jsonb_array_elements(members) where not coalesce((value->>'left')::boolean,false)) then w:=jsonb_set(w,'{status}','"lost"');end if;
   end if;
   update rebirth_private.players set state=(state-'coopRoom')||jsonb_build_object('hunting',true,'lastAt',ms),revision=revision+1 where id=u;
  elsif action='ready' then
   if w is null or w->>'status'<>'waiting' or r.revision<>(p->>'roomRevision')::bigint then raise exception 'PARTY_NOT_FOUND';end if;
   if not exists(select 1 from jsonb_array_elements(w->'members') where value->>'id'=u::text and not coalesce((value->>'left')::boolean,false)) then raise exception 'PARTY_NOT_FOUND';end if;
   select jsonb_agg(case when value->>'id'=u::text then value||'{"ready":true}'::jsonb else value end) into members from jsonb_array_elements(w->'members');
   w:=jsonb_set(w,'{members}',members);
  elsif action='open' then
   if w is null or w->>'status'<>'won' or w->>'mode'='advancement' then raise exception 'COOP_CHEST_NOT_READY';end if;
   -- Other participants walking to their chests can advance the room revision.
   -- Claim eligibility is checked against the current locked world below;
   -- actor revision and request receipts still protect personal rewards.
   select value into member from jsonb_array_elements(w->'members') where value->>'id'=u::text;
   if member is null or coalesce((member->>'left')::boolean,false) or coalesce((member->>'claimed')::boolean,false) then raise exception 'COOP_CHEST_CLAIMED';end if;
   if coalesce((member->>'damage')::numeric,0)<=0 and not (w->>'mode' in ('raid','exploration') and coalesce((member->>'healing')::numeric,0)+coalesce((member->>'shieldGiven')::numeric,0)>0) then raise exception 'COOP_DAMAGE_REQUIRED';end if;
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
   if action='start' and exists(select 1 from jsonb_array_elements(w->'members') where not coalesce((value->>'ready')::boolean,false)) then raise exception 'COOP_NOT_READY';end if;
   if action='start' and w->>'mode'='exploration' and ((w->>'tier')::int not between 0 and 2 or jsonb_array_length(w->'members') not between 1 and 4) then raise exception 'INVALID_EXPLORATION';end if;
   if action='start' and w->>'mode'='exploration' then
    tier:=(w->>'tier')::int;
    for member in select value from jsonb_array_elements(w->'members') loop
     select state into st from rebirth_private.players where id=(member->>'id')::uuid;
     if st->>'coopRoom' is distinct from rid::text then raise exception 'PARTY_NOT_FOUND';end if;
     if tier>0 and not (coalesce(st->'exploration'->'cleared','[]'::jsonb) @> jsonb_build_array(tier-1)) then raise exception 'EXPLORATION_PREVIOUS_REQUIRED';end if;
    end loop;
   end if;
   if action='start' and w->>'mode'='raid' then
    if (w->>'tier')::int not between 0 and 3 or jsonb_array_length(w->'members') not between 1 and 8 then raise exception 'INVALID_RAID';end if;

   end if;
   if action='start' and w->>'mode'='advancement' then
    tier:=(w->>'tier')::int;
    if tier not between 0 and 4 or jsonb_array_length(w->'members') not between 1 and 2 then raise exception 'INVALID_TRIAL';end if;
    for member in select value from jsonb_array_elements(w->'members') loop
     select state into st from rebirth_private.players where id=(member->>'id')::uuid;
     if st->>'coopRoom' is distinct from rid::text then raise exception 'PARTY_NOT_FOUND';end if;
     if coalesce((st->>'level')::int,0)<(array[30,60,100,150,200])[tier+1] then raise exception 'LEVEL_REQUIRED';end if;
     current_stage:=case when coalesce((st->>'firstAdvancement')::boolean,false) or coalesce((st->>'advancement')::int,0)>=1 then least(5,coalesce((st->>'advancement')::int,0)+1) else 0 end;
     if current_stage<tier then raise exception 'ADVANCEMENT_REQUIRED';end if;
    end loop;
   end if;
   if w->>'status' in ('fighting','won') or action='start' then w:=p->'world';end if;
  else raise exception 'INVALID_COOP_ACTION';end if;
  if rid is not null and w is not null then
   if w->>'status'='fighting' then
    select coalesce(jsonb_agg(q),'[]') into members from jsonb_array_elements(coalesce(r.world->'_queuedInputs','[]')) q
     where (q->>'tick')::int>=coalesce((w->>'tick')::int,0)-35
      and not exists(select 1 from jsonb_array_elements(coalesce(w->'_net'->'frames','[]')) f where f->>'user'=q->>'user' and f->>'tick'=q->>'tick');
    w:=jsonb_set(w,'{_queuedInputs}',members);
   else w:=w-'_queuedInputs';end if;
   -- Only the winning revision consumes input. Keep receipts in this small
   -- table until the replay window expires, so retries cannot requeue old input.
   if w->>'status'='fighting' then
    update rebirth_private.coop_input_frames q set consumed=true
     from jsonb_array_elements(coalesce(w->'_net'->'frames','[]')) f
     where q.room_id=rid and not q.consumed and q.user_id=(f->>'user')::uuid and q.tick=(f->>'tick')::int;
    delete from rebirth_private.coop_input_frames where room_id=rid and tick<coalesce((w->>'tick')::int,0)-35;
   else
    delete from rebirth_private.coop_input_frames where room_id=rid;
   end if;
   update rebirth_private.coop_rooms set world=w,revision=revision+1 where id=rid returning * into r;
   if w->>'status'='lost' or (w->>'mode' in ('advancement','wave') and w->>'status'='won') then
    for member in select value from jsonb_array_elements(w->'members') loop
     member_user_id:=(member->>'id')::uuid;select state into st from rebirth_private.players where id=member_user_id for update;
     if st->>'coopRoom' is distinct from rid::text then continue;end if;
     reward:=jsonb_build_object('type','coop','won',false,'gold',0);
     if w->>'mode'='advancement' then
      trial_stage:=(w->>'tier')::int;
      current_stage:=case when coalesce((st->>'firstAdvancement')::boolean,false) or coalesce((st->>'advancement')::int,0)>=1 then least(5,coalesce((st->>'advancement')::int,0)+1) else 0 end;
      practice:=current_stage>trial_stage;
      reward:=jsonb_build_object('type','advancementTrial','stage',trial_stage,'won',w->>'status'='won','practice',practice,'seconds',(w->>'tick')::numeric/10);
      if w->>'status'='won' and not practice and not coalesce((member->>'left')::boolean,false) then
       if current_stage<>trial_stage then raise exception 'ADVANCEMENT_REQUIRED';end if;
       if coalesce((st->>'level')::int,0)<(array[30,60,100,150,200])[trial_stage+1] then raise exception 'LEVEL_REQUIRED';end if;
       st:=st||jsonb_build_object('firstAdvancement',true,'advancement',trial_stage,'advancementVictories',coalesce(st->'advancementVictories','{}')||jsonb_build_object(trial_stage::text,ms));
      end if;
     end if;
     if w->>'mode'='wave' then
     reward:=rebirth_private.settle_wave_reward(st,w,rid,ms);
     st:=reward->'state';reward:=reward->'reward';
     end if;
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
 if not coalesce((p->>'compact')::boolean,false) or r.id is null then
 select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'tier',q.world->'tier','mode',coalesce(q.world->>'mode','rift'),'count',jsonb_array_length(q.world->'members'),'name',q.world->'members'->0->>'name')),'[]') into list from (select id,world from rebirth_private.coop_rooms where world->>'status'='waiting' and created_at>now()-interval '15 minutes' order by created_at desc limit 100) q;
 end if;
 -- Attach pending input only to the service response; never rewrite the large
 -- world/history just to enqueue a movement packet.
 if r.id is not null and r.world->>'status'='fighting' then
  select coalesce(jsonb_agg(jsonb_build_object('user',q.user_id,'tick',q.tick,'input',q.input) order by q.tick,q.user_id),'[]')
   into members from rebirth_private.coop_input_frames q where q.room_id=r.id and not q.consumed;
  r.world:=jsonb_set(r.world,'{_queuedInputs}',coalesce(r.world->'_queuedInputs','[]')||members);
 end if;
 return jsonb_build_object('revision',actor.revision,'coop',case when r.id is null then null else r.world||jsonb_build_object('id',r.id,'revision',r.revision,'me',u) end,'now',ms,'result',jsonb_build_object('events',events))
  ||case when coalesce((p->>'compact')::boolean,false) and r.id is not null and r.world->>'status' in ('fighting','won') and jsonb_array_length(events)=0
     then '{"stateUnchanged":true}'::jsonb else jsonb_build_object('state',actor.state) end
  ||case when list is null then '{}'::jsonb else jsonb_build_object('coopRooms',list) end;
end $function$

