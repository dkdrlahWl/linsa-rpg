-- One locked player state stores first-clear claims and the completed-run receipt.
CREATE OR REPLACE FUNCTION rebirth_private.settle_wave_reward(st jsonb, w jsonb, run_id uuid, settled_at bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $wave$
DECLARE
 tiers jsonb := '[{"wave":10,"gold":10000,"fragment":50,"cube":[[0,0.9],[1,0.1]],"scroll":[[0,0.9],[1,0.1]]},{"wave":20,"gold":20000,"fragment":60,"cube":[[0,0.7],[1,0.3]],"scroll":[[0,0.8],[1,0.2]]},{"wave":30,"gold":30000,"fragment":70,"cube":[[0,0.7],[2,0.3]],"scroll":[[0,0.7],[1,0.3]]},{"wave":40,"gold":40000,"fragment":80,"cube":[[0,0.6],[3,0.4]],"scroll":[[0,0.5],[1,0.5]]},{"wave":50,"gold":50000,"fragment":90,"cube":[[0,0.5],[3,0.5]],"scroll":[[0,0.3],[1,0.7]]},{"wave":60,"gold":60000,"fragment":100,"cube":[[0,0.3],[3,0.7]],"scroll":[[1,1]]},{"wave":70,"gold":60000,"fragment":100,"cube":[[3,1]],"scroll":[[1,0.7],[2,0.3]]},{"wave":80,"gold":70000,"fragment":100,"cube":[[3,0.7],[4,0.3]],"scroll":[[1,0.5],[2,0.5]]},{"wave":90,"gold":80000,"fragment":120,"cube":[[4,0.7],[5,0.3]],"scroll":[[1,0.3],[2,0.7]]},{"wave":100,"gold":100000,"fragment":150,"cube":[[5,0.7],[6,0.3]],"scroll":[[2,0.7],[3,0.3]]},{"wave":110,"gold":110000,"fragment":160,"cube":[[6,0.7],[7,0.3]],"scroll":[[2,0.6],[3,0.4]]},{"wave":120,"gold":120000,"fragment":170,"cube":[[7,0.7],[8,0.3]],"scroll":[[2,0.5],[3,0.5]]},{"wave":130,"gold":130000,"fragment":180,"cube":[[8,0.7],[9,0.3]],"scroll":[[2,0.4],[3,0.6]]},{"wave":140,"gold":140000,"fragment":190,"cube":[[9,0.7],[10,0.3]],"scroll":[[2,0.3],[3,0.7]]},{"wave":150,"gold":150000,"fragment":200,"cube":[[10,0.7],[11,0.3]],"scroll":[[3,1]]},{"wave":160,"gold":160000,"fragment":210,"cube":[[11,0.7],[12,0.3]],"scroll":[[3,0.7],[4,0.3]]},{"wave":170,"gold":170000,"fragment":220,"cube":[[12,0.7],[13,0.3]],"scroll":[[3,0.6],[4,0.4]]},{"wave":180,"gold":180000,"fragment":230,"cube":[[13,0.7],[14,0.3]],"scroll":[[3,0.5],[4,0.5]]},{"wave":190,"gold":190000,"fragment":240,"cube":[[14,0.7],[15,0.3]],"scroll":[[3,0.3],[4,0.7]]},{"wave":200,"gold":250000,"fragment":300,"cube":[[16,0.7],[18,0.3]],"scroll":[[4,0.7],[5,0.3]]}]'::jsonb;
 cleared int := least(200,greatest(0,case when w->>'status'='won' and w->>'reason'='ending' then 200 else coalesce((w->>'wave')::int,1)-1 end));
 bracket int; entry jsonb; option jsonb; reward jsonb; firsts jsonb := '[]';
 claims jsonb := coalesce(st->'waveFirstClaims','[]'); prior jsonb;
 earned_gold bigint := 0; earned_fragment int := 0; earned_cube int := 0; earned_scroll int := 0;
 roll_value double precision; cumulative double precision;
BEGIN
 -- A retry or a second settlement path must return the already committed award.
 SELECT value INTO prior FROM jsonb_array_elements(coalesce(st->'waveRewardHistory','[]')) WHERE value->>'runId'=run_id::text LIMIT 1;
 IF prior IS NOT NULL THEN RETURN jsonb_build_object('state',st,'reward',prior); END IF;
 bracket := (cleared/10)*10;
 FOR entry IN SELECT value FROM jsonb_array_elements(tiers) LOOP
  IF (entry->>'wave')::int<=bracket AND NOT claims @> jsonb_build_array((entry->>'wave')::int) THEN
   claims := claims || jsonb_build_array((entry->>'wave')::int);
   earned_gold := earned_gold + (entry->>'gold')::bigint;
   earned_fragment := earned_fragment + (entry->>'fragment')::int;
   firsts := firsts || jsonb_build_array(jsonb_build_object('wave',entry->'wave','gold',entry->'gold','fragment',entry->'fragment'));
  END IF;
 END LOOP;
 IF bracket>=10 THEN
  entry := tiers->(bracket/10-1);
  roll_value := random(); cumulative := 0;
  FOR option IN SELECT value FROM jsonb_array_elements(entry->'cube') LOOP
   cumulative := cumulative+(option->>1)::double precision;
   earned_cube := (option->>0)::int;
   EXIT WHEN roll_value<cumulative;
  END LOOP;
  roll_value := random(); cumulative := 0;
  FOR option IN SELECT value FROM jsonb_array_elements(entry->'scroll') LOOP
   cumulative := cumulative+(option->>1)::double precision;
   earned_scroll := (option->>0)::int;
   EXIT WHEN roll_value<cumulative;
  END LOOP;
 END IF;
 reward := jsonb_build_object('type','coop','mode','wave','version',2,'runId',run_id,'settledAt',settled_at,
  'wave',least(200,coalesce((w->>'wave')::int,1)),'cleared',cleared,'rewardTier',bracket,
  'kills',coalesce((w->>'kills')::int,0),'reason',coalesce(w->>'reason','leave'),
  'won',cleared=200,'ending',cleared=200,'gold',earned_gold,'fragment',earned_fragment,
  'cube',earned_cube,'scroll',earned_scroll,'firstRewards',firsts,'credited',true);
 st := st || jsonb_build_object('gold',coalesce((st->>'gold')::bigint,0)+earned_gold,
  'materials',coalesce(st->'materials','{}') || jsonb_build_object(
   'fragment',coalesce((st#>>'{materials,fragment}')::bigint,0)+earned_fragment,
   'cube',coalesce((st#>>'{materials,cube}')::bigint,0)+earned_cube,
   'scroll',coalesce((st#>>'{materials,scroll}')::bigint,0)+earned_scroll),
  'waveFirstClaims',claims,'waveBest',greatest(coalesce((st->>'waveBest')::int,0),least(200,coalesce((w->>'wave')::int,1))),
  'waveClearedBest',greatest(coalesce((st->>'waveClearedBest')::int,0),cleared),
  'waveEnding',coalesce((st->>'waveEnding')::boolean,false) or cleared=200);
 st := jsonb_set(st,'{waveRewardHistory}',(SELECT coalesce(jsonb_agg(value ORDER BY ord),'[]') FROM jsonb_array_elements(jsonb_build_array(reward)||coalesce(st->'waveRewardHistory','[]')) WITH ORDINALITY AS h(value,ord) WHERE ord<=10));
 RETURN jsonb_build_object('state',st,'reward',reward);
END $wave$;
REVOKE ALL ON FUNCTION rebirth_private.settle_wave_reward(jsonb,jsonb,uuid,bigint) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.rebirth_coop_action(p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=(p->>'user')::uuid; sess uuid:=(p->>'session')::uuid; actor rebirth_private.players%rowtype; r rebirth_private.coop_rooms%rowtype; old rebirth_private.receipts%rowtype; action text:=p->>'action'; rid uuid; w jsonb; member jsonb; members jsonb; st jsonb; reward jsonb; claim text:=to_char(now() at time zone 'Asia/Seoul','YYYY-MM-DD'); count_claim int; tier int; list jsonb; events jsonb:='[]'; ms bigint:=floor(extract(epoch from clock_timestamp())*1000); member_user_id uuid; trial_stage int; trial_level int; current_stage int; practice boolean; room_mode text; cleared int; earned_gold bigint; earned_cube int; earned_scroll int;
begin
 perform pg_advisory_xact_lock(hashtextextended(coalesce((select state->>'coopRoom' from rebirth_private.players where id=u),p->'args'->>'room',u::text),71823001));
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
 -- Queue each player's validated frames under the room lock before simulating.
 -- Queue writes do not invalidate the simulation revision.
 if action='read' and coalesce((p->>'queueInput')::boolean,false) and w->>'status'='fighting' then
  if not exists(select 1 from jsonb_array_elements(w->'members') m where m->>'id'=u::text and not coalesce((m->>'left')::boolean,false)) then raise exception 'PARTY_NOT_FOUND';end if;
  select coalesce(jsonb_agg(q.value),'[]') into members from (
   select distinct on (incoming.value->>'user',incoming.value->>'tick') incoming.value
   from jsonb_array_elements(coalesce(w->'_queuedInputs','[]') || coalesce((select jsonb_agg(f||jsonb_build_object('user',u)) from jsonb_array_elements(p->'args'->'frames') f),'[]')) as incoming(value)
   where (incoming.value->>'tick')::int>=greatest(0,coalesce((w->>'tick')::int,0)-35)
    and (incoming.value->>'tick')::int<=greatest(coalesce((w->>'tick')::int,0),floor((ms-(w->>'started')::bigint)/100.0)::int)+2
    and not exists(select 1 from jsonb_array_elements(coalesce(w->'_net'->'frames','[]')) f where f->>'user'=incoming.value->>'user' and f->>'tick'=incoming.value->>'tick')
   order by incoming.value->>'user',incoming.value->>'tick' limit 320
  ) q;
  w:=jsonb_set(w,'{_queuedInputs}',members);
  update rebirth_private.coop_rooms set world=w where id=rid returning * into r;
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
   if room_mode not in ('rift','wave','advancement','raid') then raise exception 'INVALID_COOP_MODE';end if;
   if room_mode='raid' and tier not between 0 and 3 then raise exception 'INVALID_RAID';end if;
   if room_mode='advancement' then
    if tier not between 0 and 3 then raise exception 'INVALID_TRIAL';end if;
    trial_level:=(array[30,60,100,150])[tier+1];
    current_stage:=case when coalesce((actor.state->>'firstAdvancement')::boolean,false) or coalesce((actor.state->>'advancement')::int,0)>=1 then least(4,coalesce((actor.state->>'advancement')::int,0)+1) else 0 end;
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
   if r.revision<>(p->>'roomRevision')::bigint then raise exception 'SAVE_CONFLICT';end if;
   select value into member from jsonb_array_elements(w->'members') where value->>'id'=u::text;
   if member is null or coalesce((member->>'left')::boolean,false) or coalesce((member->>'claimed')::boolean,false) then raise exception 'COOP_CHEST_CLAIMED';end if;
   if coalesce((member->>'damage')::numeric,0)<=0 and not (w->>'mode'='raid' and coalesce((member->>'healing')::numeric,0)+coalesce((member->>'shieldGiven')::numeric,0)>0) then raise exception 'COOP_DAMAGE_REQUIRED';end if;
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
   if action='start' and w->>'mode'='raid' then
    if (w->>'tier')::int not between 0 and 3 or jsonb_array_length(w->'members') not between 1 and 8 then raise exception 'INVALID_RAID';end if;

   end if;
   if action='start' and w->>'mode'='advancement' then
    tier:=(w->>'tier')::int;
    if tier not between 0 and 3 or jsonb_array_length(w->'members') not between 1 and 2 then raise exception 'INVALID_TRIAL';end if;
    for member in select value from jsonb_array_elements(w->'members') loop
     select state into st from rebirth_private.players where id=(member->>'id')::uuid;
     if st->>'coopRoom' is distinct from rid::text then raise exception 'PARTY_NOT_FOUND';end if;
     if coalesce((st->>'level')::int,0)<(array[30,60,100,150])[tier+1] then raise exception 'LEVEL_REQUIRED';end if;
     current_stage:=case when coalesce((st->>'firstAdvancement')::boolean,false) or coalesce((st->>'advancement')::int,0)>=1 then least(4,coalesce((st->>'advancement')::int,0)+1) else 0 end;
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
   update rebirth_private.coop_rooms set world=w,revision=revision+1 where id=rid returning * into r;
   if w->>'status'='lost' or (w->>'mode' in ('advancement','wave') and w->>'status'='won') then
    for member in select value from jsonb_array_elements(w->'members') loop
     member_user_id:=(member->>'id')::uuid;select state into st from rebirth_private.players where id=member_user_id for update;
     if st->>'coopRoom' is distinct from rid::text then continue;end if;
     reward:=jsonb_build_object('type','coop','won',false,'gold',0);
     if w->>'mode'='advancement' then
      trial_stage:=(w->>'tier')::int;
      current_stage:=case when coalesce((st->>'firstAdvancement')::boolean,false) or coalesce((st->>'advancement')::int,0)>=1 then least(4,coalesce((st->>'advancement')::int,0)+1) else 0 end;
      practice:=current_stage>trial_stage;
      reward:=jsonb_build_object('type','advancementTrial','stage',trial_stage,'won',w->>'status'='won','practice',practice,'seconds',(w->>'tick')::numeric/10);
      if w->>'status'='won' and not practice and not coalesce((member->>'left')::boolean,false) then
       if current_stage<>trial_stage then raise exception 'ADVANCEMENT_REQUIRED';end if;
       if coalesce((st->>'level')::int,0)<(array[30,60,100,150])[trial_stage+1] then raise exception 'LEVEL_REQUIRED';end if;
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
 select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'tier',q.world->'tier','mode',coalesce(q.world->>'mode','rift'),'count',jsonb_array_length(q.world->'members'),'name',q.world->'members'->0->>'name')),'[]') into list from (select id,world from rebirth_private.coop_rooms where world->>'status'='waiting' and created_at>now()-interval '15 minutes' order by created_at desc limit 100) q;
 return jsonb_build_object('state',actor.state,'revision',actor.revision,'coop',case when r.id is null then null else r.world||jsonb_build_object('id',r.id,'revision',r.revision,'me',u) end,'coopRooms',list,'now',ms,'result',jsonb_build_object('events',events));
end $function$

