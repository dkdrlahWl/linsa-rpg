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
     cleared:=greatest(0,coalesce((w->>'wave')::int,1)-1);
     select coalesce(sum(5+floor(n/10.0)),0)::bigint into earned_gold from generate_series(1,cleared) n;
     select count(*)::int into earned_cube from generate_series(1,cleared/10) n where random()<least(0.15,0.04+n*0.01);
     select count(*)::int into earned_scroll from generate_series(1,cleared/10) n where random()<0.20;
     reward:=jsonb_build_object('type','coop','mode','wave','wave',coalesce((w->>'wave')::int,1),'cleared',cleared,'kills',coalesce((w->>'kills')::int,0),'reason',coalesce(w->>'reason','leave'),'won',false,'gold',earned_gold,'cube',earned_cube,'scroll',earned_scroll);
     st:=jsonb_set(st,'{gold}',to_jsonb(coalesce((st->>'gold')::bigint,0)+earned_gold));
     st:=jsonb_set(st,'{materials,cube}',to_jsonb(coalesce((st->'materials'->>'cube')::int,0)+earned_cube));
     st:=jsonb_set(st,'{materials,scroll}',to_jsonb(coalesce((st->'materials'->>'scroll')::int,0)+earned_scroll));
     st:=jsonb_set(st,'{waveBest}',to_jsonb(greatest(coalesce((st->>'waveBest')::int,0),coalesce((w->>'wave')::int,1))));

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
   if w->>'status'='lost' or (w->>'mode'='advancement' and w->>'status'='won') then
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
     cleared:=greatest(0,coalesce((w->>'wave')::int,1)-1);
     select coalesce(sum(5+floor(n/10.0)),0)::bigint into earned_gold from generate_series(1,cleared) n;
     select count(*)::int into earned_cube from generate_series(1,cleared/10) n where random()<least(0.15,0.04+n*0.01);
     select count(*)::int into earned_scroll from generate_series(1,cleared/10) n where random()<0.20;
     reward:=jsonb_build_object('type','coop','mode','wave','wave',coalesce((w->>'wave')::int,1),'cleared',cleared,'kills',coalesce((w->>'kills')::int,0),'reason',coalesce(w->>'reason','leave'),'won',false,'gold',earned_gold,'cube',earned_cube,'scroll',earned_scroll);
     st:=jsonb_set(st,'{gold}',to_jsonb(coalesce((st->>'gold')::bigint,0)+earned_gold));
     st:=jsonb_set(st,'{materials,cube}',to_jsonb(coalesce((st->'materials'->>'cube')::int,0)+earned_cube));
     st:=jsonb_set(st,'{materials,scroll}',to_jsonb(coalesce((st->'materials'->>'scroll')::int,0)+earned_scroll));
     st:=jsonb_set(st,'{waveBest}',to_jsonb(greatest(coalesce((st->>'waveBest')::int,0),coalesce((w->>'wave')::int,1))));
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
;
CREATE OR REPLACE FUNCTION rebirth_private.combat_power(s jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare
 cl text:=s->>'classId'; main text; lv double precision:=(s->>'level')::double precision;
 atk double precision:=12+lv*2; stat double precision; hp double precision:=100+lv*22; def double precision:=lv*.5;
 stat_pct double precision:=0; atk_pct double precision:=0; hp_pct double precision:=0; def_pct double precision:=0; crit_pct double precision:=0; boss_pct double precision:=0;
 it jsonb; ln jsonb; eid text; k text; val double precision; growth double precision; base double precision; ilv double precision; stars double precision; quality double precision;
 crit double precision; crit_damage double precision; cadence double precision;
begin
 main:=case cl when 'warrior' then 'STR' when 'mage' then 'INT' when 'archer' then 'DEX' when 'priest' then 'LUK' when 'rogue' then 'LUK' when 'pirate' then 'DEX' end;
 if main is null then return 0; end if;
 stat:=coalesce((s->'stats'->>main)::double precision,4)+lv*2;
 for eid in select value from jsonb_each_text(coalesce(s->'equipped','{}')) loop
  select value into it from jsonb_array_elements(coalesce(s->'items','[]')) where value->>'id'=eid limit 1;
  if it is null or coalesce((it->>'broken')::boolean,false) then continue; end if;
  ilv:=(it->>'level')::double precision; stars:=coalesce((it->>'stars')::double precision,0);
  quality:=.9+coalesce((it->>'quality')::double precision,50)*.002;
  growth:=1+stars*.055+power(greatest(0,stars-15),1.4)*.025;
  if it ? 'baseStats' then
   atk:=atk+(it->'baseStats'->>'attack')::float8*growth+stars;
   stat:=stat+floor((it->'baseStats'->>'stat')::float8*growth)+stars;
   hp:=hp+(it->'baseStats'->>'hp')::float8;
   def:=def+(it->'baseStats'->>'defense')::float8;
  else
   base:=(5+power(ilv,1.28))*(case when (it->>'boss')::boolean then 1.9 else 1 end)*quality;
   atk:=atk+base*(case when (it->>'slot')::int=0 then .9 else .11 end)*growth+stars;
   stat:=stat+floor((2+ilv*.5)*growth*quality*(case when (it->>'boss')::boolean then 1.9 else 1 end))+stars;
   hp:=hp+floor(ilv*4*(case when (it->>'boss')::boolean then 1.9 else 1 end));
   def:=def+ilv*.2*(case when (it->>'boss')::boolean then 1.9 else 1 end);
  end if;
  hp:=hp+(case when (it->>'slot')::int between 1 and 5 then stars*greatest(2,ceil(ilv*.35)) else 0 end);
  for ln in select value from jsonb_array_elements(coalesce(it->'lines','[]')) loop
   k:=ln->>'key'; val:=(ln->>'value')::double precision;
   if k='flatHP' then hp:=hp+val;
   elsif k='flatAttack' then atk:=atk+val;
   elsif k='flatDefense' then def:=def+val;
   elsif k='flat'||main then stat:=stat+val;
   elsif k=main then stat_pct:=stat_pct+val;
   elsif k='attack' then atk_pct:=atk_pct+val;
   elsif k='hp' then hp_pct:=hp_pct+val;
   elsif k='defense' then def_pct:=def_pct+val;
   elsif k='crit' then crit_pct:=crit_pct+val;
   elsif k='boss' then boss_pct:=boss_pct+val; end if;
  end loop;
 end loop;
 stat:=stat*(1+stat_pct/100);atk:=(atk+stat*.65)*(1+atk_pct/100);
 hp:=floor(hp*(1+hp_pct/100));def:=def*(1+def_pct/100);
 crit:=least(.95,.05+crit_pct/100+(case when cl='archer' then .05 else 0 end));
 cadence:=case when cl='pirate' then 1.08 else 1 end;
 if cl='warrior' then hp:=floor(hp*1.30);def:=def*1.15;end if;
 if cl='mage' then atk:=atk*1.06;end if;
 crit_damage:=case when cl='rogue' then 1.9 else 1.6 end;
 if coalesce((s->>'firstAdvancement')::boolean,false) or coalesce((s->>'advancement')::int,0)>=1 then atk:=atk*power(1.1,1+least(3,coalesce((s->>'advancement')::int,0)));hp:=floor(hp*power(1.1,1+least(3,coalesce((s->>'advancement')::int,0))));end if;
 return floor(atk*(1+crit*(crit_damage-1))*cadence*(1+boss_pct/100)+hp*.1+floor(def)*5)::bigint;
end $function$
;

