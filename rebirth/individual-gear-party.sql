CREATE OR REPLACE FUNCTION public.rebirth_party_action(p_user uuid, p_session uuid, p_epoch uuid, p_revision bigint, p_state jsonb, p_action text, p_args jsonb, p_power jsonb, p_request uuid, p_fingerprint jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare p rebirth_private.players%rowtype; r rebirth_private.party_rooms%rowtype; m rebirth_private.party_members%rowtype;
 old rebirth_private.receipts%rowtype; room_id uuid; initial_room text; n integer; t integer; upto integer; dmg bigint; incoming bigint;
 crit numeric; burst numeric; guard numeric; st jsonb; reward jsonb; it jsonb; bag jsonb; mail jsonb; stack jsonb; ck text; cl text; sl int; variant int; event_list jsonb:='[]'; summary jsonb;
 result jsonb; b_id text; won boolean; eligible boolean; claim text; boss_data jsonb; region_id text; sk jsonb; second jsonb; chance numeric; critical_damage numeric; slot integer; hit integer; is_raid boolean; claimed_count integer; quality_roll numeric; quality_value integer; gear_base integer; gear_level integer;
begin
 perform pg_advisory_xact_lock(71823001);
 if not exists(select 1 from rebirth_private.release where epoch=p_epoch and (enabled or exists(select 1 from rebirth_private.players where id=p_user and preview_access))) then raise exception 'REBIRTH_MAINTENANCE'; end if;
 select * into p from rebirth_private.players where id=p_user for update;
 if not found or p.active_session is distinct from p_session or not exists(select 1 from auth.sessions where id=p_session and user_id=p_user) then raise exception 'SESSION_ENDED'; end if;
 if exists(select 1 from auth.sessions where user_id=p_user and (created_at,id)>(p.session_started,p_session)) then raise exception 'SESSION_REPLACED'; end if;
 select * into old from rebirth_private.receipts where user_id=p_user and request_id=p_request;
 if found then
  if old.fingerprint<>p_fingerprint then raise exception 'REQUEST_ID_REUSED'; end if;
  return rebirth_private.party_view(p_user)||jsonb_build_object('result',jsonb_build_object('events','[]'::jsonb));
 end if;
 if p.revision<>p_revision then raise exception 'SAVE_CONFLICT'; end if;
 if p_state->>'version'<>'rebirth-1' or octet_length(p_state::text)>524288 then raise exception 'INVALID_STATE'; end if;
 initial_room:=p.state->>'partyRoom';
 -- Edge computed settlement uses the ordinary server engine, never client power or RNG.
 update rebirth_private.players set state=p_state,revision=revision+1,updated_at=now() where id=p_user;
 p.state:=p_state;
 room_id:=nullif(p.state->>'partyRoom','')::uuid;
 if room_id is not null then
  select * into r from rebirth_private.party_rooms where id=room_id for update;
  if not found then raise exception 'PARTY_NOT_FOUND'; end if;
  if r.status='fighting' then
   upto:=least((r.boss->>'seconds')::int,greatest(0,floor(extract(epoch from now()-r.started_at))::int));
   if upto>r.tick then
    for t in r.tick+1..upto loop
     for m in select * from rebirth_private.party_members where room=room_id and not departed and hp>0 order by joined_at,player loop
      second:=case when t<=m.second_until then m.stats->'secondSkill' else null end;
      chance:=least(1,(m.stats->>'crit')::numeric+case when t<=m.burst_until then coalesce((m.stats->'skill'->>'critAdd')::numeric,0) else 0 end+coalesce((second->>'critAdd')::numeric,0));
      critical_damage:=(m.stats->>'critDamage')::numeric+coalesce((second->>'critDamageAdd')::numeric,0);
      crit:=case when random()<chance then critical_damage else 1 end;
      burst:=(case when t<=m.burst_until then (m.stats->'skill'->>'damage')::numeric else 1 end)*coalesce((second->>'damage')::numeric,1);
      dmg:=least(r.hp,greatest(1,floor((m.stats->>'attack')::numeric*(m.stats->>'boss')::numeric*(m.stats->>'cadence')::numeric*crit*burst)::bigint));
      r.hp:=r.hp-dmg;
      update rebirth_private.party_members set damage=damage+dmg where room=room_id and player=m.player;
      exit when r.hp<=0;
     end loop;
     r.tick:=t;
     exit when r.hp<=0;
     if t%3=0 or t%(r.boss->>'patternEvery')::int=0 then
      for m in select * from rebirth_private.party_members where room=room_id and not departed and hp>0 loop
       guard:=(case when t<=m.burst_until then (m.stats->'skill'->>'guard')::numeric else 1 end)*(case when t<=m.second_until then coalesce((m.stats->'secondSkill'->>'guard')::numeric,1) else 1 end);
       incoming:=greatest(1,floor(((r.boss->>'attack')::numeric*(case when t%(r.boss->>'patternEvery')::int=0 then (r.boss->>'patternMultiplier')::numeric else 1 end)-(m.stats->>'defense')::numeric*.4)*guard)::bigint);
       update rebirth_private.party_members set hp=greatest(0,hp-incoming) where room=room_id and player=m.player;
      end loop;
     end if;
     exit when not exists(select 1 from rebirth_private.party_members where room=room_id and not departed and hp>0);
    end loop;
   end if;
   update rebirth_private.party_rooms set hp=r.hp,tick=r.tick where id=room_id;
   if r.hp<=0 or r.tick>=(r.boss->>'seconds')::int or not exists(select 1 from rebirth_private.party_members where room=room_id and not departed and hp>0) then
    r.status:=case when r.hp<=0 then 'won' else 'lost' end;
   end if;
  elsif r.status='waiting' and r.expires_at<=now() then r.status:='closed'; end if;
  if r.status in ('won','lost','closed') then
   update rebirth_private.party_rooms set status=r.status,ended_at=coalesce(ended_at,now()) where id=room_id;
   won:=r.status='won'; b_id:=r.boss->>'id';region_id:=r.boss->>'region';is_raid:=coalesce((r.boss->>'raid')::boolean,false);claim:=to_char(now() at time zone 'Asia/Seoul','YYYY-MM-DD');
   select coalesce(jsonb_agg(jsonb_build_object('name',name,'damage',damage) order by damage desc),'[]') into summary from rebirth_private.party_members where room=room_id;
   for m in select * from rebirth_private.party_members where room=room_id and not departed order by player loop
    select state into st from rebirth_private.players where id=m.player for update;
    if st->>'partyRoom' is distinct from room_id::text then continue; end if;
    claimed_count:=case when st->'raidClaims'->b_id->>'day'=claim then coalesce((st->'raidClaims'->b_id->>'count')::int,0) else 0 end;
    eligible:=won and not r.practice and m.damage>0 and (case when is_raid then claimed_count<2 else st->'bossClaims'->>b_id is distinct from r.claim_key end);
    reward:=jsonb_build_object('type','party','bossId',b_id::int,'won',won,'practice',r.practice,'items','[]'::jsonb,'materials',0,'members',summary,'rewarded',eligible,'raid',is_raid,'name',r.boss->>'name');
    if eligible then
     if is_raid then
      st:=jsonb_set(st,'{raidClaims}',coalesce(st->'raidClaims','{}')||jsonb_build_object(b_id,jsonb_build_object('day',claim,'count',claimed_count+1)));
      st:=jsonb_set(st,'{gold}',to_jsonb((st->>'gold')::bigint+(r.boss->>'gold')::int));
      st:=jsonb_set(st,'{materials,fragment}',to_jsonb((st->'materials'->>'fragment')::int+(r.boss->>'fragment')::int));
      st:=jsonb_set(st,'{materials,cube}',to_jsonb((st->'materials'->>'cube')::int+(r.boss->>'cube')::int));
      hit:=case when random()<coalesce((r.boss->>'highCubeChance')::numeric,0) then 1 else 0 end;
      st:=jsonb_set(st,'{materials,highCube}',to_jsonb((st->'materials'->>'highCube')::int+hit));
      reward:=reward||jsonb_build_object('gold',(r.boss->>'gold')::int,'fragment',(r.boss->>'fragment')::int,'cube',(r.boss->>'cube')::int,'highCube',hit);
     else
     st:=jsonb_set(st,'{bossClaims}',coalesce(st->'bossClaims','{}')||jsonb_build_object(b_id,r.claim_key));
     if not st->'cleared' @> jsonb_build_array(b_id::int) then st:=jsonb_set(st,'{cleared}',st->'cleared'||jsonb_build_array(b_id::int)); end if;
     st:=jsonb_set(st,'{bossMaterials}',coalesce(st->'bossMaterials','{}')||jsonb_build_object(region_id,coalesce((st->'bossMaterials'->>region_id)::int,0)+(r.boss->>'material')::int));
     st:=jsonb_set(st,'{materials,cube}',to_jsonb((st->'materials'->>'cube')::int+3));
     st:=jsonb_set(st,'{materials,highCube}',to_jsonb((st->'materials'->>'highCube')::int+1));
     if random()<.2 then st:=jsonb_set(st,'{materials,expand}',to_jsonb((st->'materials'->>'expand')::int+1)); end if;
     reward:=reward||jsonb_build_object('materials',(r.boss->>'material')::int);
     end if;
     if random()<(r.boss->>'dropChance')::numeric then
      cl:=(array['warrior','mage','archer','rogue','pirate'])[1+floor(random()*5)::int];sl:=floor(random()*9)::int;variant:=case when sl=0 then floor(random()*3)::int else 0 end;
      gear_base:=(r.boss->>'gearLevel')::int;gear_level:=case when gear_base>=200 then 200 when random()<sqrt(.5) then gear_base else gear_base+10 end;
      quality_roll:=random();
      quality_value:=case when quality_roll<.70 then floor(quality_roll/.70*50)::int when quality_roll<.95 then 50+floor((quality_roll-.70)/.25*30)::int when quality_roll<.995 then 80+floor((quality_roll-.95)/.045*15)::int when quality_roll<.9999 then 95+floor((quality_roll-.995)/.0049*5)::int else 100 end;
      it:=jsonb_build_object('id',gen_random_uuid(),'level',gear_level,'classId',cl,'slot',sl,'boss',true,'weaponVariant',variant,'quality',quality_value,'stars',0,'grade',0,'lines','[]'::jsonb,'locked',false,'broken',false);
      it:=it||rebirth_private.roll_individual_gear(gear_level,cl,sl,true);
      ck:=concat_ws(':','v3',gear_level::text,cl,sl::text,'true',it->>'design');
      if not coalesce(st->'collection','[]') ? ck then st:=jsonb_set(st,'{collection}',coalesce(st->'collection','[]')||jsonb_build_array(ck)); end if;
      if jsonb_array_length(st->'items')<300 then st:=jsonb_set(st,'{items}',st->'items'||jsonb_build_array(it));
      else
       ck:=ck||'|lv'||(it->>'level')||'|s'||(it->'baseStats')::text;
       mail:=coalesce(st->'mailbox','[]');
       if exists(select 1 from jsonb_array_elements(mail) e where e->>'key'=ck) then
        select jsonb_agg(case when e->>'key'=ck then jsonb_set(e,'{quantity}',to_jsonb((e->>'quantity')::int+1)) else e end) into mail from jsonb_array_elements(mail) e;
       else mail:=mail||jsonb_build_array(jsonb_build_object('key',ck,'item',it-'id','quantity',1));end if;
       st:=jsonb_set(st,'{mailbox}',mail);reward:=reward||jsonb_build_object('stored',1);
      end if;
      reward:=reward||jsonb_build_object('items',jsonb_build_array(it->>'id'));
     end if;
    end if;
    st:=(st-'partyRoom')||jsonb_build_object('hunting',true,'lastAt',floor(extract(epoch from now())*1000)::bigint,'lastReward',reward);
    update rebirth_private.players set state=st,revision=revision+1,updated_at=now() where id=m.player;
    if m.player=p_user then event_list:=jsonb_build_array(reward);end if;
   end loop;
   room_id:=null;
  end if;
 end if;
 select * into p from rebirth_private.players where id=p_user;
 if p_action in ('create','join') then
  if nullif(p.state->>'partyRoom','') is not null or p.state->'battle'<>'null'::jsonb or p.state->'pendingCube'<>'null'::jsonb then raise exception 'BATTLE_IN_PROGRESS'; end if;
  if p_action='create' then
   boss_data:=p_args->'boss';
   if boss_data is null or (boss_data->>'raid')::boolean is not true then raise exception 'INVALID_BOSS'; end if;
   -- Expired history has no economic authority; claims stay on the player record.
   delete from rebirth_private.party_rooms where ended_at<now()-interval '2 days';
   insert into rebirth_private.party_rooms(host,boss,practice) values(p_user,boss_data,coalesce((p_args->>'practice')::boolean,false)) returning * into r;
  else
   select * into r from rebirth_private.party_rooms where id=(p_args->>'room')::uuid for update;
   if not found or r.status<>'waiting' or r.expires_at<=now() then raise exception 'PARTY_NOT_JOINABLE';end if;
  end if;
  if coalesce((r.boss->>'raid')::boolean,false) is not true then raise exception 'INVALID_BOSS';end if;
  claim:=to_char(now() at time zone 'Asia/Seoul','YYYY-MM-DD');
  if not r.practice and p.state->'raidClaims'->(r.boss->>'id')->>'day'=claim and coalesce((p.state->'raidClaims'->(r.boss->>'id')->>'count')::int,0)>=2 then raise exception 'RAID_LIMIT';end if;
  select count(*) into n from rebirth_private.party_members where room=r.id and not departed;
  if n>=4 then raise exception 'PARTY_FULL';end if;
  insert into rebirth_private.party_members(room,player,name,class_id,stats,hp,max_hp) values(r.id,p_user,p.state->>'name',p.state->>'classId',p_power,(p_power->>'hp')::bigint,(p_power->>'hp')::bigint);
  update rebirth_private.players set state=state||jsonb_build_object('partyRoom',r.id,'hunting',false,'lastAt',floor(extract(epoch from now())*1000)::bigint),revision=revision+1 where id=p_user;
 elsif p_action='start' and room_id is not null then
  if r.host<>p_user or r.status<>'waiting' then raise exception 'PARTY_HOST_REQUIRED';end if;
  select count(*) into n from rebirth_private.party_members where room=room_id and not departed;
  if n<1 then raise exception 'PARTY_MEMBERS_REQUIRED';end if;
  claim:=to_char(now() at time zone 'Asia/Seoul','YYYY-MM-DD');
  if not r.practice and exists(select 1 from rebirth_private.party_members pm join rebirth_private.players pp on pp.id=pm.player where pm.room=room_id and not pm.departed and pp.state->'raidClaims'->(r.boss->>'id')->>'day'=claim and coalesce((pp.state->'raidClaims'->(r.boss->>'id')->>'count')::int,0)>=2) then raise exception 'RAID_LIMIT';end if;
  update rebirth_private.party_rooms set status='fighting',started_at=now(),expires_at=now()+make_interval(secs=>(r.boss->>'seconds')::int),claim_key=claim,hp=(r.boss->>'hp')::bigint,max_hp=(r.boss->>'hp')::bigint where id=room_id;
 elsif p_action='skill' and room_id is not null then
  if r.status<>'fighting' then raise exception 'NO_BATTLE';end if;
  select * into m from rebirth_private.party_members where room=room_id and player=p_user;
  if m.hp<=0 or m.departed then raise exception 'PARTY_DEFEATED';end if;
  slot:=case when p_args->>'slot'='2' then 2 else 1 end;
  sk:=case when slot=2 then m.stats->'secondSkill' else m.stats->'skill' end;
  if sk is null or sk='null'::jsonb then raise exception 'ADVANCEMENT_REQUIRED';end if;
  if r.tick<(case when slot=2 then m.second_ready else m.skill_ready end) then raise exception 'SKILL_COOLDOWN';end if;
  if slot=2 then update rebirth_private.party_members set second_ready=r.tick+(sk->>'cooldown')::int,second_until=r.tick+(sk->>'seconds')::int where room=room_id and player=p_user;
  else update rebirth_private.party_members set skill_ready=r.tick+coalesce((sk->>'cooldown')::int,30),burst_until=r.tick+(sk->>'seconds')::int where room=room_id and player=p_user;end if;
  event_list:=jsonb_build_array(jsonb_build_object('type','skill','slot',slot));
  if sk->>'type'='attack' then
   for hit in 1..(sk->>'hits')::int loop
    crit:=case when random()<least(1,(m.stats->>'crit')::numeric+coalesce((sk->>'critAdd')::numeric,0)) then (m.stats->>'critDamage')::numeric else 1 end;
    dmg:=least(r.hp,greatest(1,round((m.stats->>'attack')::numeric*(sk->>'damage')::numeric*(m.stats->>'boss')::numeric*crit)::bigint));
    r.hp:=r.hp-dmg;update rebirth_private.party_members set damage=damage+dmg where room=room_id and player=p_user;
   end loop;
   update rebirth_private.party_rooms set hp=r.hp where id=room_id;
  end if;
 elsif p_action='revive' and room_id is not null then
  if r.status<>'fighting' then raise exception 'NO_BATTLE';end if;
  select * into m from rebirth_private.party_members where room=room_id and player=p_user;
  if m.hp>0 or m.revived or m.departed then raise exception 'PARTY_REVIVE_UNAVAILABLE';end if;
  update rebirth_private.party_members set hp=greatest(1,floor(max_hp*.3)),revived=true where room=room_id and player=p_user;
 elsif p_action='leave' and room_id is not null then
  if r.status='waiting' then delete from rebirth_private.party_members where room=room_id and player=p_user;
  else update rebirth_private.party_members set departed=true where room=room_id and player=p_user;end if;
  update rebirth_private.players set state=(state-'partyRoom')||jsonb_build_object('hunting',true,'lastAt',floor(extract(epoch from now())*1000)::bigint),revision=revision+1 where id=p_user;
  if not exists(select 1 from rebirth_private.party_members where room=room_id and not departed) then update rebirth_private.party_rooms set status='closed',ended_at=now() where id=room_id;
  elsif r.host=p_user then update rebirth_private.party_rooms set host=(select player from rebirth_private.party_members where room=room_id and not departed order by joined_at,player limit 1) where id=room_id;end if;
 elsif p_action not in ('list','sync','create','join','start','skill','revive','leave') then raise exception 'INVALID_PARTY_ACTION';
 end if;
 result:=rebirth_private.party_view(p_user)||jsonb_build_object('result',jsonb_build_object('events',event_list));
 if p_action not in ('sync','list') then insert into rebirth_private.receipts(user_id,request_id,fingerprint,result) values(p_user,p_request,p_fingerprint,jsonb_build_object('accepted',true));end if;
 return result;
end $function$;
