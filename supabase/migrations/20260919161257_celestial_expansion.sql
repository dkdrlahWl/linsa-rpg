begin;
set local lock_timeout='5s';
select pg_advisory_xact_lock(70909,10);
alter table ringu_private.wb_rooms add column stage integer not null default 1 check(stage in (1,2));
alter table ringu_private.wb_rooms drop constraint wb_rooms_hp_check;
alter table ringu_private.wb_rooms add constraint wb_rooms_hp_check check(hp between 0 and 4200000*stage);
alter table ringu_private.rooms drop constraint rooms_stage_check;
alter table ringu_private.rooms add constraint rooms_stage_check check(stage between 1 and 8);
-- Stage two has eleven different geometries. Every warning leaves an escape
-- within two moves (360ms), with 900ms or more to react and no overlapping hits.
create function ringu_private.wb_pattern_two(p_room uuid,p_pattern integer,p_round integer,p_start timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $fn$
#variable_conflict use_variable
declare result jsonb:='[]';tiles integer[];safe integer[];wave integer;waves integer;t integer;x integer;y integer;
 m record;candidate integer;axis integer:=floor(random()*8);damage integer;delay_ms integer:=1000;offset_ms integer:=0;
begin
 waves:=case p_pattern when 1 then 2 when 2 then 3 when 3 then 2 when 4 then 3 when 5 then 4 when 6 then 3 when 7 then 4 when 8 then 4 when 9 then 5 when 10 then 4 else 4 end;
 damage:=(array[720,800,800,1120,1200,1000,1200,1280,1680,1920,2600])[p_pattern];
 if damage is null then raise exception 'INVALID_PATTERN';end if;
 delay_ms:=case when p_pattern>=9 then 900 else 1100 end;
 for wave in 0..waves-1 loop
  tiles:='{}';safe:='{}';
  for m in select * from ringu_private.wb_members where room_id=p_room and present and hp>0 loop
   select n into candidate from generate_series(0,63) n where abs(n%8-m.x)+abs(n/8-m.y)=1 order by random() limit 1;
   safe:=array_append(safe,candidate);
  end loop;
  for t in 0..63 loop
   x:=t%8;y:=t/8;
   if (case p_pattern
    when 1 then (x-y+8+axis+wave*2)%8 in (0,1)
    when 2 then abs(x-3)+abs(y-3)=2+wave
    when 3 then (x/2+y/2+wave)%2=0
    when 4 then (x+2*y+axis+wave)%5 in (0,1)
    when 5 then case wave when 0 then x<3 and y<5 when 1 then x>4 and y<5 when 2 then x>4 and y>2 else x<3 and y>2 end
    when 6 then exists(select 1 from ringu_private.wb_members m where m.room_id=p_room and m.present and m.hp>0 and abs(m.x-x)+abs(m.y-y)=wave+1)
    when 7 then (x+y+wave*2)%8 in (0,1) or (x-y+8-wave*2)%8=0
    when 8 then (x+wave)%4=0 or (y+wave*2)%5=0
    when 9 then (x*2+y+axis+wave*3)%7 in (0,1,2)
    when 10 then abs(x-(case when wave%2=0 then 1 else 6 end))+abs(y-(case when wave<2 then 1 else 6 end)) in (2,3,4)
    when 11 then (x+2*y+wave)%4<>0 and (2*x+y+wave)%5<>0
    else false end) then tiles:=array_append(tiles,t);end if;
  end loop;
  select coalesce(array_agg(n),'{}'::integer[]) into tiles from unnest(tiles) n where not(n=any(safe));
  for t in 0..63 loop
   if not exists(select 1 from generate_series(0,63) n where not(n=any(tiles)) and abs(n%8-t%8)+abs(n/8-t/8)<=2) then tiles:=array_remove(tiles,t);end if;
  end loop;
  result:=result||jsonb_build_array(jsonb_build_object('id',p_round||':'||wave,'pattern',p_pattern,'damage',damage,'tiles',to_jsonb(tiles),
   'showAt',floor(extract(epoch from p_start)*1000)+offset_ms,'hitAt',floor(extract(epoch from p_start)*1000)+offset_ms+delay_ms));
  offset_ms:=offset_ms+delay_ms+300;
 end loop;return result;
end $fn$;
revoke all on function ringu_private.wb_pattern_two(uuid,integer,integer,timestamptz) from public,anon,authenticated;
CREATE OR REPLACE FUNCTION ringu_private.wb_pattern(p_room uuid, p_pattern integer, p_round integer, p_start timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_variable
declare result jsonb:='[]'; tiles integer[]; safe integer[]; wave integer; waves integer;
 x integer;y integer;t integer;damage integer;delay_ms integer;offset_ms integer:=0;
 m record; candidate integer; axis integer:=floor(random()*8); horizontal boolean:=random()<.5;
begin
 if (select stage from ringu_private.wb_rooms where id=p_room)=2 then return ringu_private.wb_pattern_two(p_room,p_pattern,p_round,p_start);end if;
 waves:=case p_pattern when 6 then 2 when 7 then 8 when 8 then 3 when 9 then 4 when 10 then 3 when 11 then 3 else 1 end;
 for wave in 0..waves-1 loop
  tiles:='{}';safe:='{}';
  for m in select * from ringu_private.wb_members where room_id=p_room and present and hp>0 loop
   select n into candidate from generate_series(0,63) n
    where abs(n%8-m.x)+abs(n/8-m.y)=1 order by random() limit 1;
   safe:=array_append(safe,candidate);
  end loop;
  if p_pattern in (9,11) then
   while cardinality(array(select distinct unnest(safe))) < (case when p_pattern=9 then 12 else 8 end) loop
    safe:=array_append(safe,floor(random()*64)::integer);
   end loop;
  end if;
  for t in 0..63 loop
   x:=t%8;y:=t/8;
   if (case p_pattern
    when 1 then false
    when 2 then (x<2 or x>5) and (y<2 or y>5) and (x+y+axis)%2=0
    when 3 then case when horizontal then y=axis else x=axis end
    when 4 then exists(select 1 from ringu_private.wb_members where room_id=p_room and present and hp>0 and wb_members.x=x and wb_members.y=y)
    when 5 then x in (3,4) or y in (3,4)
    when 6 then (x+y)%2=wave
    when 7 then x=(axis+wave)%8
    when 8 then least(x,y,7-x,7-y)=wave
    when 9 then random()<.48
    when 10 then exists(select 1 from (select * from ringu_private.wb_members where room_id=p_room and present and hp>0 order by joined_at limit 5) p where abs(p.x-x)+abs(p.y-y)<=1)
    when 11 then true else false end) then tiles:=array_append(tiles,t); end if;
  end loop;
  if p_pattern=1 then select array_agg(n) into tiles from (select n from generate_series(0,63) n where not(n=any(safe)) order by random() limit 3) q; end if;
  select coalesce(array_agg(distinct n),'{}'::integer[]) into tiles from unnest(tiles) n where not(n=any(safe));
  -- Also reserve an escape within two steps from EVERY tile, including players
  -- who changed location during an earlier wave. 2 * 180ms < shortest 500ms warning.
  for t in 0..63 loop
   if not exists(select 1 from generate_series(0,63) n where not(n=any(tiles)) and abs(n%8-t%8)+abs(n/8-t/8)<=2) then
    tiles:=array_remove(tiles,t);
   end if;
  end loop;
  damage:=case p_pattern when 1 then 360 when 2 then 400 when 3 then 400 when 4 then 560 when 5 then 600 when 6 then 500 when 7 then 600 when 8 then 640 when 9 then 840 when 10 then 960 else 1300 end;
  delay_ms:=case p_pattern when 1 then 1000 when 2 then 1200 when 3 then 1200 when 4 then 800 when 5 then 900 when 6 then 1000 when 7 then 1000 when 8 then 1000 when 9 then 900 when 10 then 600 else (array[1300,800,500])[wave+1] end;
  result:=result||jsonb_build_array(jsonb_build_object('id',p_round||':'||wave,'pattern',p_pattern,'damage',damage,'tiles',to_jsonb(tiles),
   'showAt',floor(extract(epoch from p_start)*1000)+offset_ms,'hitAt',floor(extract(epoch from p_start)*1000)+offset_ms+delay_ms));
  offset_ms:=offset_ms+case p_pattern when 6 then 1300 when 7 then 550 when 8 then 750 when 9 then 1100 when 10 then 700 else delay_ms+300 end;
 end loop;
 return result;
end $function$
;
CREATE OR REPLACE FUNCTION ringu_private.wb_view(p_room uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select jsonb_build_object('id',r.id,'host',r.host,'name',case when r.stage=2 then '성천의 심판자 아우리엘' else '멸겁룡 카르가론' end,'stage',r.stage,'hp',r.hp,'maxHp',4200000*r.stage,'status',r.status,
  'startedAt',extract(epoch from r.started_at)*1000,'endedAt',extract(epoch from r.ended_at)*1000,'reason',r.reason,
  'version',r.version,'pattern',r.pattern,'waves',r.waves,
  'members',coalesce((select jsonb_agg(jsonb_build_object('id',m.account_id,'name',m.name,'gender',m.gender,'costume',m.costume,
   'lastHit',m.last_hit,'hp',m.hp,'maxHp',m.attack,'damage',m.damage,'x',m.x,'y',m.y,'seq',m.seq,'packet',m.packet,'ready',m.ready,
   'rewardDetail',(select jsonb_build_object('rank',w.place,'essence',w.essence,'jadeCube',w.jade_cubes,'delivery','mail','mailId',w.mail_id) from ringu_private.wb_rewards w where w.room_id=m.room_id and w.account_id=m.account_id and w.status='paid'),
   'present',m.present,'revived',m.revived,'reward',m.reward,'seenAt',extract(epoch from m.seen_at)*1000,
   'stillAt',extract(epoch from m.still_at)*1000,'deadAt',extract(epoch from m.dead_at)*1000,'background',m.background)
   order by m.joined_at,m.account_id) from ringu_private.wb_members m where m.room_id=r.id),'[]'::jsonb))
 from ringu_private.wb_rooms r where r.id=p_room
$function$
;
CREATE OR REPLACE FUNCTION ringu_private.wb_rpc(p_action text, p_room uuid, p_args jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid; r ringu_private.wb_rooms%rowtype;m ringu_private.wb_members%rowtype;a ringu_private.accounts%rowtype;
 now_at timestamptz:=clock_timestamp();v jsonb;w jsonb;report jsonb;ms timestamptz;arrival timestamptz;last_arrival timestamptz;charge_start timestamptz;
 move_count integer:=0;nx integer;ny integer;ns bigint;counted integer;attack_value numeric;dt numeric;hit integer;tile integer;
 remaining integer;roomlist jsonb;result jsonb;v_packet bigint;was_background boolean;combat_stats jsonb;critical boolean;
begin
 if p_action not in ('list','create','join','ready','start','sync','leave','ack') or octet_length(p_args::text)>16384 then raise exception 'INVALID_ACTION';end if;
 perform pg_advisory_xact_lock(70909,10);
 u:=ringu_private.require_session(false);
 select * into a from ringu_private.accounts where id=u;
 if p_action='list' then
  perform ringu_private.wb_check_unlock();
  -- Clean only stale rooms on lobby reads; no unbounded historical scan.
  for r in select * from ringu_private.wb_rooms where status in ('waiting','running') order by created_at limit 100 loop perform ringu_private.wb_advance(r.id);end loop;
  select room_id into p_room from ringu_private.wb_members where account_id=u and active limit 1;
  if p_room is null then
   select b.room_id into p_room from ringu_private.wb_members b join ringu_private.wb_rooms r2 on r2.id=b.room_id
    where b.account_id=u and b.present and b.acknowledged_at is null and r2.status in ('won','lost') order by r2.ended_at desc limit 1;
  end if;
 elsif p_action in ('create','join') then
  if not exists(select 1 from ringu_private.wb_unlock where unlocked_at is not null) then raise exception 'WORLD_BOSS_LOCKED';end if;
  if exists(select 1 from ringu_private.wb_members where account_id=u and active) then
   select room_id into p_room from ringu_private.wb_members where account_id=u and active;
  else
   if a.state->'serverBattle' is not null and a.state->'serverBattle'<>'null'::jsonb then raise exception 'BATTLE_IN_PROGRESS';end if;
   if exists(select 1 from ringu_private.members m2 join ringu_private.rooms r2 on r2.id=m2.room_id where m2.account_id=u and m2.active and r2.status in ('waiting','running')) then raise exception 'BATTLE_IN_PROGRESS';end if;
   if p_action='create' then
 if coalesce(p_args->>'stage','1') not in ('1','2') then raise exception 'INVALID_STAGE';end if;
 insert into ringu_private.wb_rooms(host,stage,hp) values(u,coalesce((p_args->>'stage')::integer,1),4200000*coalesce((p_args->>'stage')::integer,1)) returning id into p_room;end if;
   select * into r from ringu_private.wb_rooms where id=p_room for update;
   if not found or r.status<>'waiting' then raise exception 'ROOM_NOT_WAITING';end if;
   if p_action='join' then perform ringu_private.wb_advance(p_room);end if;
   if not exists(select 1 from ringu_private.wb_rooms where id=p_room and status='waiting') then raise exception 'ROOM_NOT_WAITING';end if;
   select count(*) into counted from ringu_private.wb_members where room_id=p_room and present;
   if counted>=10 then raise exception 'ROOM_FULL';end if;
   attack_value:=greatest(1,floor(ringu_private.n(a.state#>'{remodelProfile,power}',100000000)));
   insert into ringu_private.wb_members(room_id,account_id,name,gender,costume,attack,hp,x,y,ready)
   values(p_room,u,left(coalesce(a.state->>'playerName','모험가'),24),case when a.state->>'playerGender'='female' then 'female' else 'male' end,
    (select costume_id from ringu_private.costume_selection where account_id=u),attack_value,attack_value,counted%8,6+counted/8,p_action='create')
   on conflict(room_id,account_id) do update set present=true,active=true,seen_at=now_at,ready=false,left_at=null;
  end if;
 elsif p_room is not null then
  select * into r from ringu_private.wb_rooms where id=p_room for update;
  perform ringu_private.wb_advance(p_room);
  select * into r from ringu_private.wb_rooms where id=p_room;
  select * into m from ringu_private.wb_members where room_id=p_room and account_id=u;
  if not found then raise exception 'ROOM_FORBIDDEN';end if;
  if p_action='ack' then
   if r.status in ('waiting','running') then raise exception 'BATTLE_IN_PROGRESS';end if;
   update ringu_private.wb_members set acknowledged_at=now_at where room_id=p_room and account_id=u;
   p_room:=null;
  elsif p_action='leave' then
   update ringu_private.wb_members set present=false,active=false,ready=false,left_at=now_at where room_id=p_room and account_id=u;
   perform ringu_private.wb_advance(p_room);
   p_room:=null;
  elsif not m.present then raise exception 'ROOM_LEFT';
  elsif p_action='ready' then
   if r.status<>'waiting' then raise exception 'ROOM_NOT_WAITING';end if;
   update ringu_private.wb_members set ready=coalesce((p_args->>'ready')::boolean,true),seen_at=now_at where room_id=p_room and account_id=u;
  elsif p_action='start' then
   if r.host<>u then raise exception 'HOST_ONLY';end if;
   if r.status='waiting' then
    perform ringu_private.wb_advance(p_room);
    if exists(select 1 from ringu_private.wb_members where room_id=p_room and present and account_id<>u and not ready) then raise exception 'MEMBERS_NOT_READY';end if;
    -- Server-maintained final attack is also maximum HP. Freeze it at start.
    update ringu_private.wb_members b set attack=greatest(1,floor(ringu_private.n(ac.state#>'{remodelProfile,power}',100000000))),
     costume=(select costume_id from ringu_private.costume_selection where account_id=b.account_id)
     from ringu_private.accounts ac where b.room_id=p_room and b.present and ac.id=b.account_id;
    update ringu_private.wb_members set crit_chance=least(95,coalesce((ringu_private.stats((select state from ringu_private.accounts ac where ac.id=account_id))->>'crit')::numeric,0)),crit_damage=coalesce((ringu_private.stats((select state from ringu_private.accounts ac where ac.id=account_id))->>'damage')::numeric,100),next_attack_at=now_at+interval '3 seconds',last_hit=null,hp=attack,still_at=now_at+interval '2 seconds',accrued_at=now_at+interval '2 seconds',seen_at=now_at where room_id=p_room and present;
    insert into ringu_private.wb_moves(room_id,account_id,seq,x,y,arrived_at) select room_id,account_id,0,x,y,now_at from ringu_private.wb_members where room_id=p_room and present on conflict do nothing;
    update ringu_private.wb_rooms set status='running',started_at=now_at+interval '2 seconds',next_at=now_at+interval '2 seconds' where id=p_room;
   end if;
  elsif p_action='sync' then
   v_packet:=coalesce((p_args->>'packet')::bigint,0);
   if v_packet>m.packet then
    was_background:=m.background;
    m.background:=coalesce((p_args->>'background')::boolean,false);
    if r.status='running' and now_at>=r.started_at and m.hp>0 then
     if jsonb_array_length(coalesce(p_args->'moves','[]'))>12 then raise exception 'TOO_MANY_MOVES';end if;
     last_arrival:=m.still_at;
     for v in select value from jsonb_array_elements(coalesce(p_args->'moves','[]')) loop
      ns:=(v->>'seq')::bigint;if ns<=m.seq then continue;end if;
      nx:=(v->>'x')::integer;ny:=(v->>'y')::integer;ms:=to_timestamp((v->>'at')::numeric/1000);
      if ns<>m.seq+1 or nx not between 0 and 7 or ny not between 0 and 7 or abs(nx-m.x)+abs(ny-m.y)<>1
       or ms<last_arrival-interval '20 milliseconds' or ms<now_at-interval '3 seconds' or ms>now_at+interval '250 milliseconds' then raise exception 'INVALID_MOVE';end if;
      arrival:=ms+interval '180 milliseconds';last_arrival:=arrival;
      m.x:=nx;m.y:=ny;m.seq:=ns;m.still_at:=arrival;move_count:=move_count+1;
      insert into ringu_private.wb_moves values(p_room,u,ns,nx,ny,arrival);
     end loop;
     if jsonb_array_length(coalesce(p_args->'events','[]'))>24 then raise exception 'TOO_MANY_EVENTS';end if;
     for report in select value from jsonb_array_elements(coalesce(p_args->'events','[]')) loop
      select value into w from jsonb_array_elements(r.waves) where value->>'id'=report->>'id';
      if w is null or exists(select 1 from ringu_private.wb_hits where room_id=p_room and account_id=u and event=report->>'id') then continue;end if;
      ms:=to_timestamp((w->>'hitAt')::numeric/1000);
      if ms>now_at+interval '100 milliseconds' then continue;end if;
      hit:=0;
      -- Late/hidden warnings are not retrospective damage. Such periods never earn offline DPS.
      if (report->>'seenAt')::numeric <= (w->>'hitAt')::numeric-100 and (report->>'seenAt')::numeric >= (w->>'showAt')::numeric-100
       and now_at-ms<interval '3 seconds' and not was_background then
       select x+8*y into tile from ringu_private.wb_moves where room_id=p_room and account_id=u and arrived_at<=ms order by seq desc limit 1;
       if (w->'tiles')@>jsonb_build_array(tile) then hit:=(w->>'damage')::integer;end if;
      end if;
      insert into ringu_private.wb_hits values(p_room,u,w->>'id',hit) on conflict do nothing;
      m.hp:=greatest(0,m.hp-hit);
      if m.hp=0 then m.dead_at:=ms;exit;end if;
     end loop;
     -- Movement does not change the server attack cooldown.
     if m.hp<=0 or m.background or was_background or m.seen_at<=now_at-interval '2 seconds' then
      m.next_attack_at:=now_at+interval '1 second';
     elsif now_at>=coalesce(m.next_attack_at,now_at+interval '1 second') and now_at<r.started_at+interval '7 minutes' then
      critical:=random()*100<m.crit_chance;
      attack_value:=least(r.hp,floor(m.attack*(case when critical then 1+m.crit_damage/100 else 1 end)));
      if attack_value>0 then m.last_hit:=jsonb_build_object('id',v_packet,'damage',attack_value,'crit',critical,'at',extract(epoch from now_at)*1000);end if;
      m.damage:=m.damage+attack_value;
      update ringu_private.wb_rooms set hp=greatest(0,hp-attack_value) where id=p_room;
      m.next_attack_at:=now_at+interval '1 second';
     elsif m.next_attack_at is null then
      m.next_attack_at:=now_at+interval '1 second';
     end if;
    end if;
    update ringu_private.wb_members set next_attack_at=m.next_attack_at,last_hit=m.last_hit,x=m.x,y=m.y,seq=m.seq,hp=m.hp,damage=m.damage,dead_at=m.dead_at,still_at=m.still_at,
     seen_at=now_at,accrued_at=greatest(now_at,coalesce(r.started_at,now_at)),background=m.background,packet=v_packet where room_id=p_room and account_id=u;
   end if;
  end if;
 end if;
 if p_room is not null then
  if not exists(select 1 from ringu_private.wb_members where room_id=p_room and account_id=u) then raise exception 'ROOM_FORBIDDEN';end if;
  perform ringu_private.wb_advance(p_room);
  update ringu_private.wb_rooms set version=version+1 where id=p_room;
  select ringu_private.wb_view(p_room) into result;
  -- Coalesced private broadcast. No client can publish authoritative snapshots.
  if exists(select 1 from ringu_private.wb_rooms where id=p_room and broadcast_at<now_at-interval '200 milliseconds') then
   perform realtime.send(jsonb_build_object('room',result,'serverNow',extract(epoch from now_at)*1000),'snapshot','world-boss:'||p_room,true);
   update ringu_private.wb_rooms set broadcast_at=now_at where id=p_room;
  end if;
 end if;
 select greatest(0,3-count(*))::integer into remaining from ringu_private.wb_rewards where account_id=u and week=ringu_private.wb_week();
 if p_room is null then
  select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'host',q.name,'count',q.n,'stage',q.stage) order by q.created_at),'[]') into roomlist from (
   select r2.id,r2.stage,r2.created_at,coalesce(h.name,'모험가') name,(select count(*) from ringu_private.wb_members where room_id=r2.id and present) n
   from ringu_private.wb_rooms r2 left join ringu_private.wb_members h on h.room_id=r2.id and h.account_id=r2.host where r2.status='waiting' limit 100
  ) q;
 end if;
 return jsonb_build_object('room',result,'rooms',coalesce(roomlist,'[]'),'remaining',remaining,'week',ringu_private.wb_week(),
  'unlockedAt',(select unlocked_at from ringu_private.wb_unlock),'userId',u,'serverNow',extract(epoch from clock_timestamp())*1000);
end $function$
;
CREATE OR REPLACE FUNCTION ringu_private.wb_advance(p_room uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r ringu_private.wb_rooms%rowtype;now_at timestamptz:=clock_timestamp();m record;kind integer;roll float;last_hit numeric;
begin
 perform pg_advisory_xact_lock(70909,10);
 select * into r from ringu_private.wb_rooms where id=p_room for update;
 if r.status not in ('waiting','running') then return; end if;
 update ringu_private.wb_members set present=false,active=false,ready=false,left_at=seen_at+interval '15 seconds' where room_id=p_room and present and seen_at<now_at-interval '15 seconds';
 if not exists(select 1 from ringu_private.wb_members where room_id=p_room and account_id=r.host and present) then
  select account_id into r.host from ringu_private.wb_members where room_id=p_room and present order by joined_at,account_id limit 1;
  if r.host is not null then update ringu_private.wb_rooms set host=r.host where id=p_room; end if;
 end if;
 if not exists(select 1 from ringu_private.wb_members where room_id=p_room and present) then
  update ringu_private.wb_rooms set status=case when status='waiting' then 'closed' else 'lost' end,reason='전원 퇴장',ended_at=now_at,version=version+1 where id=p_room;
  return;
 end if;
 if r.status='waiting' then return; end if;
 -- No extra revival speed for stacked helpers. Hits do not reset standing time.
 for m in select d.account_id,d.attack from ringu_private.wb_members d where d.room_id=p_room and d.present and d.hp=0
  and exists(select 1 from ringu_private.wb_members h where h.room_id=p_room and h.account_id<>d.account_id and h.present and h.hp>0
   and not h.background and h.seen_at>now_at-interval '2 seconds' and h.x=d.x and h.y=d.y
   and greatest(h.still_at,d.dead_at)<=now_at-interval '3 seconds') loop
  update ringu_private.wb_members set hp=greatest(1,floor(attack*.3)),revived=true,dead_at=null,still_at=now_at,accrued_at=now_at where room_id=p_room and account_id=m.account_id;
 end loop;
 if now_at>=r.started_at+interval '7 minutes' then r.status:='lost';r.reason:='제한시간 7분 초과';
 elsif r.hp<=0 then r.status:='won';r.reason:='클리어';
 elsif not exists(select 1 from ringu_private.wb_members where room_id=p_room and present and hp>0) then r.status:='lost';r.reason:='전원 사망';end if;
 if r.status in ('won','lost') then
  update ringu_private.wb_rooms set status=r.status,reason=r.reason,ended_at=now_at,version=version+1 where id=p_room;
  if r.status='won' then
   for m in select * from ringu_private.wb_members where room_id=p_room and present order by account_id loop
    if (select count(*) from ringu_private.wb_rewards where account_id=m.account_id and week=ringu_private.wb_week())<3 then
     insert into ringu_private.wb_rewards(room_id,account_id,week) values(p_room,m.account_id,ringu_private.wb_week()) on conflict do nothing;
     update ringu_private.wb_members set reward='pending' where room_id=p_room and account_id=m.account_id;
    end if;
   end loop;
  end if;
  if r.status='won' then perform ringu_private.wb_pay_rewards(p_room);end if;
  update ringu_private.wb_members set active=false where room_id=p_room;
  return;
 end if;
 if r.next_at is null or now_at>=r.next_at then
  if r.round=0 or now_at<r.started_at+interval '15 seconds' or r.pattern>=9 then kind:=1+floor(random()*3);
  else
   roll:=random();
   kind:=case when roll<case when r.hp<=1260000*r.stage then .25 else .35 end then 1+floor(random()*3)
    when roll<case when r.hp<=1260000*r.stage then .7 else .8 end then 4+floor(random()*5) else 9+floor(random()*3) end;
  end if;
  if kind=r.pattern then kind:=case when kind=3 then 1 when kind=8 then 4 when kind=11 then 9 else kind+1 end;end if;
  r.waves:=ringu_private.wb_pattern(p_room,kind,r.round+1,now_at+interval '1.2 seconds');
  select max((value->>'hitAt')::numeric) into last_hit from jsonb_array_elements(r.waves);
  update ringu_private.wb_rooms set pattern=kind,round=round+1,waves=r.waves,next_at=to_timestamp(last_hit/1000)+interval '3 seconds',version=version+1 where id=p_room;
 end if;
end $function$
;
CREATE OR REPLACE FUNCTION ringu_private.wb_pay_rewards(p_room uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare rec record; t timestamptz:=clock_timestamp();mid text;amount integer;
begin
 perform pg_advisory_xact_lock(70909,10);
 perform 1 from ringu_private.wb_rooms where id=p_room and status='won' for update;
 if not found then return;end if;
 for rec in
  select w.account_id,ranked.place from ringu_private.wb_rewards w
  join (
   select m.account_id,rank() over(order by m.damage desc)::integer place
   from ringu_private.wb_members m where m.room_id=p_room and
    (m.present or exists(select 1 from ringu_private.wb_rewards earned where earned.room_id=p_room and earned.account_id=m.account_id))
  ) ranked on ranked.account_id=w.account_id
  where w.room_id=p_room and w.status='pending' order by w.account_id
 loop
  amount:=50-3*(rec.place-1);
  mid:='weekly-boss:'||p_room::text||':'||rec.account_id::text;
  update ringu_private.accounts set
   state=jsonb_set(state,'{mailbox}',coalesce(state->'mailbox','[]'::jsonb)||jsonb_build_array(jsonb_build_object(
    'id',mid,'title','주간보스 '||(select stage from ringu_private.wb_rooms where id=p_room)||'단계 클리어 보상',
    'message',(case when (select stage from ringu_private.wb_rooms where id=p_room)=2 then '성천의 심판자 아우리엘' else '멸겁룡 카르가론' end)||' 토벌 · 기여도 '||rec.place::text||'등 · 정수 '||amount::text||'개 · 비취큐브 2개',
    'reward',jsonb_build_object('essence',amount,'jadeCube',2),
    'createdAt',floor(extract(epoch from t)*1000)))),
   revision=revision+1,updated_at=t
  where id=rec.account_id;
  if not found then raise exception 'REWARD_ACCOUNT_MISSING';end if;
  update ringu_private.wb_rewards set status='paid',place=rec.place,essence=amount,jade_cubes=2,mail_id=mid
   where room_id=p_room and account_id=rec.account_id and status='pending';
  update ringu_private.wb_members set reward='paid' where room_id=p_room and account_id=rec.account_id;
 end loop;
end $function$
;
CREATE OR REPLACE FUNCTION public.ringu_party_before_economy(p_action text, p_id uuid DEFAULT NULL::uuid, p_stage integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid; r ringu_private.rooms%rowtype; s jsonb; v_id uuid; v_rooms jsonb; left_count integer;
begin
  if p_action is null or p_action not in ('list','poll','create','join','start','leave') then raise exception 'INVALID_ACTION'; end if;
  u:=ringu_private.require_session(false);
  perform pg_advisory_xact_lock(736492021);
  perform ringu_private.advance_rooms();
  select state into s from ringu_private.accounts where id=u;
  if p_action='create' then
    if p_stage is null or p_stage not between 1 and 8 then raise exception 'INVALID_STAGE'; end if;
    if exists(select 1 from ringu_private.members where account_id=u and active) then raise exception 'ALREADY_IN_ROOM'; end if;
    if (select count(*) from ringu_private.rooms where status in ('waiting','running'))>=50 then raise exception 'ROOM_LIMIT'; end if;
    insert into ringu_private.rooms(host,stage,hp,max_hp)
      values(u,p_stage,floor(100000*power(1.5,p_stage-1)),floor(100000*power(1.5,p_stage-1))) returning * into r;
    insert into ringu_private.members(room_id,account_id,name,stats) values(r.id,u,left(coalesce(s->>'playerName','모험가'),32),ringu_private.stats(s));
    v_id:=r.id;
  elsif p_action='list' then
    select room_id into v_id from ringu_private.members where account_id=u and active;
  else
    select * into r from ringu_private.rooms where id=p_id for update;
    if not found then raise exception 'ROOM_NOT_FOUND'; end if;
    v_id:=r.id;
    if p_action='join' then
      if r.status<>'waiting' or (select count(*) from ringu_private.members where room_id=r.id and active)>=2 then raise exception 'ROOM_FULL_OR_STARTED'; end if;
      if exists(select 1 from ringu_private.members where account_id=u and active) then raise exception 'ALREADY_IN_ROOM'; end if;
      insert into ringu_private.members(room_id,account_id,name,stats) values(r.id,u,left(coalesce(s->>'playerName','모험가'),32),ringu_private.stats(s))
        on conflict(room_id,account_id) do update set active=true,seen_at=now(),damage=0,name=excluded.name,stats=excluded.stats;
    else
      if not exists(select 1 from ringu_private.members where room_id=r.id and account_id=u) then raise exception 'NOT_A_MEMBER'; end if;
      if p_action='start' then
        if r.host<>u or r.status<>'waiting' then raise exception 'HOST_ONLY'; end if;
        if exists(select 1 from ringu_private.members where room_id=r.id and active and seen_at<now()-interval '10 seconds') then raise exception 'MEMBER_DISCONNECTED'; end if;
        update ringu_private.members m set stats=ringu_private.stats(a.state),seen_at=now()
          from ringu_private.accounts a where m.room_id=r.id and m.active and a.id=m.account_id;
        update ringu_private.rooms set status='running',started_at=now() where id=r.id;
      elsif p_action='leave' then
        update ringu_private.members set active=false where room_id=r.id and account_id=u;
        if (r.status='waiting' and r.host=u) or not exists(select 1 from ringu_private.members where room_id=r.id and active) then
          update ringu_private.rooms set status='canceled' where id=r.id and status in ('waiting','running');
          update ringu_private.members set active=false where room_id=r.id;
        end if;
      end if;
    end if;
  end if;
  update ringu_private.members set seen_at=now() where room_id=v_id and account_id=u and active;
  select coalesce(jsonb_agg(ringu_private.room_view(x.id)),'[]'::jsonb) into v_rooms
    from (select id from ringu_private.rooms where status='waiting' order by created_at desc limit 50) x;
  select greatest(0,2-count(*))::integer into left_count from ringu_private.rewards
    where account_id=u and reward_day=(now() at time zone 'Asia/Seoul')::date;
  return jsonb_build_object('room',ringu_private.room_view(v_id),'rooms',v_rooms,'remaining',left_count,
    'pending',(select coalesce(sum(amount),0) from ringu_private.rewards where account_id=u and not claimed));
end $function$

;
do $angel$
declare definition text:=pg_get_functiondef('ringu_private.auction_import(uuid)'::regprocedure);
begin
 if strpos(definition,'auction_integer(it->''rarity'')>6')=0 then raise exception 'ANGEL_IMPORT_SOURCE_CHANGED';end if;
 execute replace(definition,'auction_integer(it->''rarity'')>6','auction_integer(it->''rarity'')>7');
end $angel$;
commit;
